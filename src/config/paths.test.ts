import { matchPath } from 'react-router';
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
});
