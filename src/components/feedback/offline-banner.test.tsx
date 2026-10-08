import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  it('shows its message only while offline, in a status region that is always present', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineBanner />);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();

    act(() => {
      onLine.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    // The same element, now with text: that is what makes a screen reader announce the change.
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('You are offline');

    act(() => {
      onLine.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(region).toBeEmptyDOMElement();
  });
});
