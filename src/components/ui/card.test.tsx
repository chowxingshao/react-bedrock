import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, cardVariants } from './card';

describe('Card', () => {
  it('defaults to the default elevation (today’s border + shadow-sm)', () => {
    render(<Card>Body</Card>);
    const card = screen.getByText('Body');
    expect(card).toHaveAttribute('data-elevation', 'default');
    expect(card).toHaveClass('border', 'shadow-sm');
  });

  it.each([
    ['default', ['border', 'shadow-sm']],
    ['flat', ['shadow-none']],
    ['outline', ['border', 'shadow-none']],
    ['raised', ['border', 'shadow-md']],
  ] as const)('applies the %s elevation', (elevation, expectedClasses) => {
    const classes = cardVariants({ elevation }).split(/\s+/);
    for (const expected of expectedClasses) {
      expect(classes).toContain(expected);
    }
  });
});
