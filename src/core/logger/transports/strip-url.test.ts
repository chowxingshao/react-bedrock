import { describe, expect, it } from 'vitest';

import { stripUrl } from './strip-url';

describe('stripUrl', () => {
  it.each([
    ['https://app.example.com/reset?token=abc#frag', 'https://app.example.com/reset'],
    ['/reset-password?token=SECRET123#frag', '/reset-password'],
    ['/items?a=1&b=2', '/items'],
    ['/items#top', '/items'],
    ['/items#a?b=1', '/items'],
    ['/items?a=1?b=2', '/items'],
  ])('removes the query string and fragment from %s', (input, expected) => {
    expect(stripUrl(input)).toBe(expected);
  });

  it('leaves a URL without a query string or fragment as it is', () => {
    expect(stripUrl('https://app.example.com/items/42')).toBe('https://app.example.com/items/42');
    expect(stripUrl('/items')).toBe('/items');
    expect(stripUrl('')).toBe('');
  });
});
