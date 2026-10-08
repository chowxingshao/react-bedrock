import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows translated defaults', () => {
    render(<EmptyState />);
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
  });

  it('is a level 2 heading, or the level 1 heading of a page it stands in for', () => {
    const { rerender } = render(<EmptyState title="No items" />);
    expect(screen.getByRole('heading', { level: 2, name: 'No items' })).toBeInTheDocument();

    rerender(<EmptyState title="No items" headingLevel={1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'No items' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
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
