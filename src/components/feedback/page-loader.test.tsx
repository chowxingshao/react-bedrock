import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLoader } from './page-loader';

describe('PageLoader', () => {
  it('announces loading with a translated label', () => {
    render(<PageLoader delayMs={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('fills the viewport in page mode', () => {
    render(<PageLoader variant="page" delayMs={0} />);
    expect(screen.getByRole('status')).toHaveClass('min-h-svh');
  });
});
