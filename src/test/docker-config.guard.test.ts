import { describe, expect, it } from 'vitest';

import entrypoint from '/docker/docker-entrypoint.sh?raw';

import { ENV_KEYS } from '@/config/env';

describe('Docker configuration (spec §10.4)', () => {
  it('keeps Unix line endings in the entrypoint', () => {
    // A script with CRLF line endings cannot start in the container: the error is "no such file or directory".
    // .gitattributes keeps Git's copy LF; this catches a file written with CRLF straight into the working tree.
    expect(entrypoint).not.toContain('\r');
  });

  it('writes every supported variable, and only those, into config.js', () => {
    const keys = /^CONFIG_KEYS="([^"]*)"$/m.exec(entrypoint)?.[1]?.split(/\s+/) ?? [];
    expect([...keys].sort()).toEqual([...ENV_KEYS].sort());
  });
});
