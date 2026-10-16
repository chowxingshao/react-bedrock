import { describe, expect, it } from 'vitest';

import { previewState } from './preview-state';

describe('previewState', () => {
  it('forces the disabled prop for "disabled"', () => {
    expect(previewState('disabled')).toMatchObject({
      disabled: true,
      'data-preview-state': 'disabled',
    });
  });
  it('forces aria-invalid for "invalid"', () => {
    expect(previewState('invalid')).toMatchObject({
      'aria-invalid': true,
      'data-preview-state': 'invalid',
    });
  });
  it('passes no forcing props for "default"', () => {
    const attrs = previewState('default');
    expect(attrs.disabled).toBeUndefined();
    expect(attrs['aria-invalid']).toBeUndefined();
    expect(attrs['data-preview-state']).toBe('default');
  });
  it('tags hover/focus/active without forcing props', () => {
    for (const s of ['hover', 'focus', 'active'] as const) {
      const attrs = previewState(s);
      expect(attrs.disabled).toBeUndefined();
      expect(attrs['aria-invalid']).toBeUndefined();
      expect(attrs['data-preview-state']).toBe(s);
    }
  });
});
