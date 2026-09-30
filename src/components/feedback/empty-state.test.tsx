import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows translated defaults', () => {
    render(<EmptyState />);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('shows a custom title, description and action', () => {
    render(
      <EmptyState
        title="No items"
        description="Create your first item."
        action={<button type="button">Create item</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No items' })).toBeInTheDocument();
    expect(screen.getByText('Create your first item.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create item' })).toBeInTheDocument();
  });
});
