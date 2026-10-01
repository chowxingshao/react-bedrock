import { delay, http as mock, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { type LogEntry, logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { apiUrl } from '@/mocks/api-url';
import { server } from '@/mocks/server';

import { registerHttpAuth } from './auth-bridge';
import { http } from './http';

const UUID = /^[0-9a-f-]{36}$/;

describe('http', () => {
  it('sends Accept-Language and a request id', async () => {
    let seen: Headers | undefined;
    server.use(
      mock.get(apiUrl('/echo'), ({ request }) => {
        seen = request.headers;
        return HttpResponse.json({ ok: true });
      }),
    );

    await http.get('/echo');

    expect(seen?.get('accept-language')).toBe('en');
    expect(seen?.get('x-request-id')).toMatch(UUID);
  });

  it('rejects with a normalised AppError', async () => {
    server.use(
      mock.get(apiUrl('/missing'), () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'No such item' }, { status: 404 }),
      ),
    );

    await expect(http.get('/missing')).rejects.toMatchObject({
      name: 'AppError',
      code: 'NOT_FOUND',
      status: 404,
      userMessage: 'No such item',
      requestId: expect.stringMatching(UUID) as unknown,
    });
  });

  it('toasts connectivity problems once, unless the request is silent', async () => {
    const toast = vi.spyOn(notify, 'error');
    server.use(mock.get(apiUrl('/offline'), () => HttpResponse.error()));

    await expect(http.get('/offline')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    await expect(http.get('/offline', { silent: true })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      'You appear to be offline. Check your connection and try again.',
    );
  });

  it('toasts a permission error on 403', async () => {
    const toast = vi.spyOn(notify, 'error');
    server.use(mock.get(apiUrl('/admin'), () => new HttpResponse(null, { status: 403 })));

    await expect(http.get('/admin')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(toast).toHaveBeenCalledWith("You don't have permission to do that.");
  });

  it('reports a response slower than the timeout as TIMEOUT', async () => {
    const toast = vi.spyOn(notify, 'error');
    server.use(
      mock.get(apiUrl('/sluggish'), async () => {
        await delay(400);
        return HttpResponse.json({});
      }),
    );

    await expect(http.get('/sluggish', { timeout: 50 })).rejects.toMatchObject({
      name: 'AppError',
      code: 'TIMEOUT',
      status: 0,
    });
    expect(toast).toHaveBeenCalledWith('The server took too long to respond. Please try again.');
  });

  it('refreshes once for concurrent 401s, then retries every request', async () => {
    let authorised = false;
    server.use(
      mock.get(apiUrl('/secure'), () =>
        authorised ? HttpResponse.json({ ok: true }) : new HttpResponse(null, { status: 401 }),
      ),
    );
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            authorised = true;
            resolve();
          }, 20);
        }),
    );
    const unregister = registerHttpAuth({
      prepareRequest: (config) => config,
      refresh,
      onSessionExpired: vi.fn(),
    });

    try {
      const responses = await Promise.all([
        http.get('/secure'),
        http.get('/secure'),
        http.get('/secure'),
      ]);
      expect(responses.map((response) => response.data as unknown)).toEqual([
        { ok: true },
        { ok: true },
        { ok: true },
      ]);
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
    }
  });

  it('expires the session when the refresh fails', async () => {
    const onSessionExpired = vi.fn();
    server.use(mock.get(apiUrl('/secure'), () => new HttpResponse(null, { status: 401 })));
    const unregister = registerHttpAuth({
      prepareRequest: (config) => config,
      refresh: () => Promise.reject(new Error('refresh token expired')),
      onSessionExpired,
    });

    try {
      await expect(http.get('/secure')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    } finally {
      unregister();
    }
  });

  it('never refreshes for requests marked skipAuthRefresh', async () => {
    const refresh = vi.fn(() => Promise.resolve());
    server.use(mock.post(apiUrl('/auth/login'), () => new HttpResponse(null, { status: 401 })));
    const unregister = registerHttpAuth({
      prepareRequest: (config) => config,
      refresh,
      onSessionExpired: vi.fn(),
    });

    try {
      await expect(http.post('/auth/login', {}, { skipAuthRefresh: true })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      unregister();
    }
  });

  it('retries an unauthorised request only once, even when the refresh succeeds', async () => {
    let hits = 0;
    server.use(
      mock.get(apiUrl('/forbidden-forever'), () => {
        hits += 1;
        // Always 401. The 500 is only a safety net, so a missing guard fails fast instead of looping.
        return new HttpResponse(null, { status: hits > 4 ? 500 : 401 });
      }),
    );
    const refresh = vi.fn(() => Promise.resolve());
    const onSessionExpired = vi.fn();
    const unregister = registerHttpAuth({
      prepareRequest: (config) => config,
      refresh,
      onSessionExpired,
    });

    try {
      await expect(http.get('/forbidden-forever')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
      expect(hits).toBe(2); // the original request and its single retry
    } finally {
      unregister();
    }
  });

  it('lets the auth adapter prepare every request', async () => {
    let seen: string | null = null;
    server.use(
      mock.get(apiUrl('/whoami'), ({ request }) => {
        seen = request.headers.get('x-demo-auth');
        return HttpResponse.json({});
      }),
    );
    const unregister = registerHttpAuth({
      prepareRequest: (config) => {
        config.headers.set('X-Demo-Auth', 'yes');
        return config;
      },
      refresh: () => Promise.resolve(),
      onSessionExpired: vi.fn(),
    });

    try {
      await http.get('/whoami');
      expect(seen).toBe('yes');
    } finally {
      unregister();
    }
  });

  it('supports cancellation through AbortSignal', async () => {
    server.use(
      mock.get(apiUrl('/slow'), async () => {
        await delay(1_000);
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();

    const request = http.get('/slow', { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  // Axios ignores `baseURL` for an absolute or protocol-relative URL, so the headers (and, once the
  // auth layer registers its adapter, the credentials) would go to that other origin.
  it.each(['https://other.example/leak', '//other.example/leak'])(
    'never calls another origin: %s stays under the API base',
    async (url) => {
      // `all`, so a CORS preflight to the other origin counts as contact too.
      const foreign = vi.fn(() => HttpResponse.json({ leaked: true }));
      const reached: string[] = [];
      server.use(
        mock.all('https://other.example/leak', foreign),
        mock.all('http://other.example/leak', foreign),
        mock.get(apiUrl('/*'), ({ request }) => {
          reached.push(new URL(request.url).origin);
          return new HttpResponse(null, { status: 404 });
        }),
      );

      const outcome = await http.get(url).then(
        () => 'resolved',
        (error: unknown) => error,
      );

      expect(foreign).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({ code: 'NOT_FOUND', status: 404 });
      expect(reached).toEqual([new URL(apiUrl('/')).origin]);
    },
  );

  describe('logging', () => {
    // A query built from unencoded text (a textarea, say) can hold line breaks, which `.` does not match.
    const QUERIES = [
      ['a plain query', '?token=s3cret&email=a@b.c'],
      ['a query with a line feed', '?token=s3cret\nemail=a@b.c'],
      ['a query with a carriage return and line feed', '?token=s3cret\r\nemail=a@b.c'],
    ] as const;

    it.each(QUERIES)(
      'never logs the query string of a failed request: %s',
      async (_name, query) => {
        const entries: LogEntry[] = [];
        const removeTransport = logger.addTransport({
          name: 'memory',
          log: (entry) => entries.push(entry),
        });
        server.use(mock.get(apiUrl('/lookup'), () => new HttpResponse(null, { status: 500 })));

        try {
          await expect(http.get(`/lookup${query}`)).rejects.toMatchObject({
            code: 'SERVER_ERROR',
            status: 500,
          });
        } finally {
          removeTransport();
        }

        // A transport may serialise the message, the context and the meta (`entry.error` is the raw value).
        const logged = JSON.stringify(
          entries.map(({ message, context, meta }) => ({ message, context, meta })),
        );
        expect(logged).not.toContain('s3cret');
        expect(logged).not.toContain('a@b.c');
        expect(
          entries.find((entry) => entry.message === 'HTTP request failed')?.context,
        ).toMatchObject({ url: '/lookup', status: 500, code: 'SERVER_ERROR' });
      },
    );

    it.each(QUERIES)(
      'never puts the query string or fragment in the debug line: %s',
      async (_name, query) => {
        const debug = vi.spyOn(logger, 'debug'); // called whatever VITE_LOG_LEVEL is
        server.use(mock.get(apiUrl('/lookup'), () => HttpResponse.json({})));

        await http.get(`/lookup${query}#access_token=frag`);

        expect(debug).toHaveBeenCalledWith('HTTP GET /lookup', {
          requestId: expect.stringMatching(UUID) as unknown,
        });
        expect(JSON.stringify(debug.mock.calls)).not.toMatch(/s3cret|a@b\.c|frag/);
      },
    );

    it('logs a silent failure too: silent only skips the toast', async () => {
      const error = vi.spyOn(logger, 'error');
      const toast = vi.spyOn(notify, 'error');
      server.use(mock.get(apiUrl('/quiet'), () => HttpResponse.error()));

      await expect(http.get('/quiet', { silent: true })).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      });

      expect(toast).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith(
        'HTTP request failed',
        expect.objectContaining({ code: 'NETWORK_ERROR', url: '/quiet' }) as unknown,
      );
    });
  });
});
