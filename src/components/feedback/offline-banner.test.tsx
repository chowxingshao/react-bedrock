import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  it('appears only while offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      onLine.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
  });
});
