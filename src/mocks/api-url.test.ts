import { describe, expect, it } from 'vitest';

import { apiUrl } from './api-url';

describe('apiUrl', () => {
  it('resolves API paths against VITE_API_BASE_URL and the page origin', () => {
    expect(apiUrl('/items')).toBe('http://localhost:3000/api/items');
    expect(apiUrl('items/:id')).toBe('http://localhost:3000/api/items/:id');
  });
});
