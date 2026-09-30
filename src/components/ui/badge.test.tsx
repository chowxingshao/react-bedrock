import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it.each(['success', 'warning', 'info'] as const)('has a token-backed %s variant', (variant) => {
    render(<Badge variant={variant}>Status</Badge>);
    expect(screen.getByText('Status')).toHaveClass(`bg-${variant}`, `text-${variant}-foreground`);
  });
});
