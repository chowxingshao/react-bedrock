import { describe, expect, it } from 'vitest';

import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it.each([
    ['/items?page=2', '/items?page=2'],
    ['//evil.example', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['https://evil.example', '/dashboard'],
    [null, '/dashboard'],
    [undefined, '/dashboard'],
    ['', '/dashboard'],
    // Browsers drop tabs and line breaks inside a URL, so these become "//evil.example".
    ['/\t/evil.example', '/dashboard'],
    ['/\n/evil.example', '/dashboard'],
    ['/\r/evil.example', '/dashboard'],
    ['/\t\t/evil.example', '/dashboard'],
    ['/\t\\evil.example', '/dashboard'],
    // Encoded, they are only a path on this origin.
    ['/%09/evil.example', '/%09/evil.example'],
    ['/items?next=%2F%2Fevil.example', '/items?next=%2F%2Fevil.example'],
  ])('%j → %j', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
