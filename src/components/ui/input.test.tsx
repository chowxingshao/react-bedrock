import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './input';

describe('Input', () => {
  it('defaults to md size and default shape (today’s look)', () => {
    render(<Input aria-label="field" />);
    const input = screen.getByLabelText('field');
    expect(input).toHaveAttribute('data-size', 'md');
    expect(input).toHaveAttribute('data-shape', 'default');
    expect(input).toHaveClass('h-(--control-h-md)', 'rounded-md');
  });

  it.each([
    ['sm', 'h-(--control-h-sm)'],
    ['md', 'h-(--control-h-md)'],
    ['lg', 'h-(--control-h-lg)'],
  ] as const)('applies the %s size height', (size, heightClass) => {
    render(<Input aria-label="field" size={size} />);
    expect(screen.getByLabelText('field')).toHaveClass(heightClass);
  });

  it.each([
    ['default', 'rounded-md'],
    ['rounded', 'rounded-lg'],
    ['pill', 'rounded-full'],
    ['square', 'rounded-none'],
  ] as const)('applies the %s shape', (shape, radiusClass) => {
    render(<Input aria-label="field" shape={shape} />);
    expect(screen.getByLabelText('field')).toHaveClass(radiusClass);
  });
});
