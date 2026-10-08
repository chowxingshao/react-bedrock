import { describe, expect, it } from 'vitest';

import compose from '/docker-compose.yml?raw';
import entrypoint from '/docker/docker-entrypoint.sh?raw';

import { ENV_KEYS, parseEnv } from '@/config/env';

const PROD = { dev: false, prod: true, test: false };
const sorted = (values: readonly (string | undefined)[]) => [...values].sort();

describe('Docker configuration (spec §10.4)', () => {
  it('keeps Unix line endings in the entrypoint', () => {
    // A script with CRLF line endings cannot start in the container: the error is "no such file or directory".
    // .gitattributes keeps Git's copy LF; this catches a file written with CRLF straight into the working tree.
    expect(entrypoint).not.toContain('\r');
  });

  it('writes every supported variable, and only those, into config.js', () => {
    const keys = /^CONFIG_KEYS="([^"]*)"$/m.exec(entrypoint)?.[1]?.split(/\s+/) ?? [];
    expect(sorted(keys)).toEqual(sorted(ENV_KEYS));
  });

  it('gives the web service a default for every variable, equal to the app defaults', () => {
    const defaults = Object.fromEntries(
      [...compose.matchAll(/^\s+(VITE_[A-Z_]+): \$\{\1:-([^}]*)\}$/gm)].map(
        (match) => [match[1] ?? '', match[2] ?? ''] as const,
      ),
    );

    expect(sorted(Object.keys(defaults))).toEqual(sorted(ENV_KEYS));

    // parseEnv never throws: for an invalid value it returns the app's own defaults, which would make the
    // comparison below pass. The container would write that value into config.js, and the production bundle
    // would refuse to start. So the defaults must be valid first.
    const result = parseEnv({ buildTime: defaults, mode: PROD });
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.env).toEqual(parseEnv({ buildTime: {}, mode: PROD }).env);
  });

  it('passes every variable through to the dev container', () => {
    const passed = [...compose.matchAll(/^\s+- (VITE_[A-Z_]+)$/gm)].map((match) => match[1]);
    expect(sorted(passed)).toEqual(sorted(ENV_KEYS));
  });
});
