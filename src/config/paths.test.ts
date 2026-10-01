import { matchPath, matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { paths } from './paths';

describe('paths', () => {
  it('builds links', () => {
    expect(paths.dashboard()).toBe('/dashboard');
    expect(paths.items.detail('a b')).toBe('/items/a%20b');
    expect(paths.items.edit('42')).toBe('/items/42/edit');
    expect(paths.login('/items?page=2')).toBe('/login?returnTo=%2Fitems%3Fpage%3D2');
    expect(paths.login()).toBe('/login');
  });

  it('keeps every builder in sync with its route pattern', () => {
    const cases = [
      [paths.home, paths.home()],
      [paths.login, paths.login()],
      [paths.dashboard, paths.dashboard()],
      [paths.forbidden, paths.forbidden()],
      [paths.items.list, paths.items.list()],
      [paths.items.create, paths.items.create()],
      [paths.items.detail, paths.items.detail('42')],
      [paths.items.edit, paths.items.edit('42')],
    ] as const;
    for (const [builder, built] of cases) {
      expect(
        matchPath(builder.pattern, built.split('?')[0] ?? built),
        builder.pattern,
      ).not.toBeNull();
    }
  });

  describe('with hostile values', () => {
    // [id, its encoded path segment]. A segment must never escape its place in the path.
    const hostileIds = [
      ['a/b', 'a%2Fb'],
      ['a?b#c', 'a%3Fb%23c'],
      ['//evil.com', '%2F%2Fevil.com'],
      ['x/../login', 'x%2F..%2Flogin'],
      ['%', '%25'],
      ['%2F', '%252F'],
    ] as const;

    it.each(hostileIds)('encodes the item id %j as a single path segment', (id, encoded) => {
      expect(paths.items.detail(id)).toBe(`/items/${encoded}`);
      expect(paths.items.edit(id)).toBe(`/items/${encoded}/edit`);
    });

    it('keeps a return URL inside the query string', () => {
      expect(paths.login('//evil.com')).toBe('/login?returnTo=%2F%2Fevil.com');
    });

    it('always builds a same-origin path (leading slash, never protocol-relative)', () => {
      const built = [
        paths.home(),
        paths.login(),
        paths.login('//evil.com'),
        paths.login('https://evil.com'),
        paths.dashboard(),
        paths.forbidden(),
        paths.items.list(),
        paths.items.create(),
        ...hostileIds.flatMap(([id]) => [paths.items.detail(id), paths.items.edit(id)]),
      ];
      for (const url of built) {
        expect(url.startsWith('/'), url).toBe(true);
        expect(url.startsWith('//'), url).toBe(false);
      }
    });

    // Not asserted for ids that already contain a percent-escape (e.g. '%2F'): React Router decodes
    // those twice, so only the builder output is pinned for them above.
    it.each(['a b', 'a/b', 'a?b#c'])('round-trips the item id %j through the router', (id) => {
      const detail = matchRoutes([{ path: paths.items.detail.pattern }], paths.items.detail(id));
      expect(detail?.[0]?.params).toEqual({ itemId: id });

      const edit = matchRoutes([{ path: paths.items.edit.pattern }], paths.items.edit(id));
      expect(edit?.[0]?.params).toEqual({ itemId: id });
    });
  });
});
