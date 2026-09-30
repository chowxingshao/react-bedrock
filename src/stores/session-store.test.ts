import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePermissions, useSessionStore } from './session-store';

const user = {
  id: 'u1',
  name: 'Demo User',
  email: 'demo@example.com',
  permissions: ['items.read'] as const,
};

describe('session store', () => {
  it('starts unknown, becomes authenticated, then anonymous', () => {
    expect(useSessionStore.getState().status).toBe('unknown');

    act(() => {
      useSessionStore.getState().setUser(user);
    });
    expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', user });

    act(() => {
      useSessionStore.getState().clear();
    });
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', user: null });
  });

  it('never writes the user to browser storage', () => {
    act(() => {
      useSessionStore.getState().setUser(user);
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('exposes permissions through a stable selector', () => {
    const { result, rerender } = renderHook(() => usePermissions());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(result.current).toEqual([]);
  });

  it('returns the very same permissions array the signed-in user carries', () => {
    act(() => {
      useSessionStore.getState().setUser(user);
    });

    const { result, rerender } = renderHook(() => usePermissions());
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
    expect(result.current).toBe(user.permissions);
  });

  it('exposes no permissions again once the session is cleared', () => {
    act(() => {
      useSessionStore.getState().setUser(user);
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current).toEqual(['items.read']);

    act(() => {
      useSessionStore.getState().clear();
    });

    expect(result.current).toEqual([]);
  });
});
