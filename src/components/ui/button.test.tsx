import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button, buttonVariants } from './button';

/** The class that only this size emits (the base classes carry no height or square size). */
const SIZE_CLASS = { sm: 'h-8', md: 'h-9', lg: 'h-10', icon: 'size-9' } as const;

describe('Button', () => {
  it('defaults to the default variant and md size', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toHaveAttribute('data-variant', 'default');
    expect(button).toHaveAttribute('data-size', 'md');
  });

  it.each(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const)(
    'supports the %s variant',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
    },
  );

  it.each(['sm', 'md', 'lg', 'icon'] as const)('defines the %s size', (size) => {
    const classes = buttonVariants({ size }).split(/\s+/);

    expect(classes).toContain(SIZE_CLASS[size]);
    const otherSizeClasses = Object.entries(SIZE_CLASS)
      .filter(([name]) => name !== size)
      .map(([, sizeClass]) => sizeClass);
    for (const otherSizeClass of otherSizeClasses) {
      expect(classes).not.toContain(otherSizeClass);
    }
  });

  it('applies the md size when none is given', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass(SIZE_CLASS.md);
  });

  it('renders its child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/somewhere">Go</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('data-slot', 'button');
  });

  it('uses token-backed colours for the destructive variant', () => {
    expect(buttonVariants({ variant: 'destructive' })).toContain('text-destructive-foreground');
  });
});
