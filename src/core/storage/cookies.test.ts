import Cookies from 'js-cookie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { cookies } from './cookies';

describe('cookies', () => {
  afterEach(() => {
    cookies.remove('consent');
  });

  it('sets, reads and removes a cookie', () => {
    cookies.set('consent', 'yes');
    expect(cookies.get('consent')).toBe('yes');

    cookies.remove('consent');
    expect(cookies.get('consent')).toBeUndefined();
  });

  it('applies secure defaults', () => {
    const set = vi.spyOn(Cookies, 'set');

    cookies.set('consent', 'yes', { expires: 7 });

    expect(set).toHaveBeenCalledWith('consent', 'yes', {
      path: '/',
      sameSite: 'Lax',
      secure: false, // jsdom serves http://localhost; Secure is on whenever the page is https
      expires: 7,
    });
  });
});
