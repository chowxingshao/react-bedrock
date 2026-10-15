import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it.each(['success', 'warning', 'info'] as const)('has a token-backed %s variant', (variant) => {
    render(<Badge variant={variant}>Status</Badge>);
    expect(screen.getByText('Status')).toHaveClass(`bg-${variant}`, `text-${variant}-foreground`);
  });

  const SHAPE_CLASS = {
    default: 'rounded-md',
    rounded: 'rounded-lg',
    pill: 'rounded-full',
    square: 'rounded-none',
  } as const;

  it.each(['default', 'rounded', 'pill', 'square'] as const)('applies the %s shape', (shape) => {
    render(<Badge shape={shape}>Shape</Badge>);
    expect(screen.getByText('Shape')).toHaveClass(SHAPE_CLASS[shape]);
  });

  it('defaults to the default shape and solid tone', () => {
    render(<Badge>Badge</Badge>);
    const badge = screen.getByText('Badge');
    expect(badge).toHaveAttribute('data-shape', 'default');
    expect(badge).toHaveAttribute('data-tone', 'solid');
    expect(badge).toHaveClass('rounded-md');
  });

  it('soft tone tints the primary intent', () => {
    render(<Badge tone="soft">Soft</Badge>);
    const badge = screen.getByText('Soft');
    expect(badge).toHaveClass('bg-primary/10', 'text-primary');
    expect(badge).not.toHaveClass('bg-primary');
  });

  it('outline tone borders the destructive intent', () => {
    render(
      <Badge variant="destructive" tone="outline">
        Out
      </Badge>,
    );
    const badge = screen.getByText('Out');
    expect(badge).toHaveClass('border-destructive', 'text-destructive');
    expect(badge).not.toHaveClass('bg-destructive');
  });
});
