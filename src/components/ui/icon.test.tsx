import { render, screen } from '@testing-library/react';
import { type SVGProps } from 'react';
import { describe, expect, it } from 'vitest';

import { Icon } from './icon';

// A minimal custom SVG component: proves the wrapper accepts any SVG component, not just lucide.
function Star(props: SVGProps<SVGSVGElement>) {
  return <svg data-testid="star" {...props} />;
}

describe('Icon', () => {
  it('defaults to md size (size-4) and is decorative', () => {
    render(<Icon icon={Star} />);
    const svg = screen.getByTestId('star');
    expect(svg).toHaveClass('size-4');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it.each([
    ['sm', 'size-3'],
    ['md', 'size-4'],
    ['lg', 'size-5'],
    ['xl', 'size-6'],
  ] as const)('applies the %s size', (size, cls) => {
    render(<Icon icon={Star} size={size} />);
    expect(screen.getByTestId('star')).toHaveClass(cls);
  });

  it('exposes a label to assistive tech when provided', () => {
    render(<Icon icon={Star} label="Favourite" />);
    const svg = screen.getByRole('img', { name: 'Favourite' });
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('merges a custom className with the size class', () => {
    render(<Icon icon={Star} className="text-primary" />);
    expect(screen.getByTestId('star')).toHaveClass('size-4', 'text-primary');
  });
});
