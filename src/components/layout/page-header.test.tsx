import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders the title, description, breadcrumbs and actions', () => {
    render(
      <PageHeader
        title="Item details"
        description="Everything about this item."
        breadcrumbs={[{ label: 'Items', to: '/items' }, { label: 'Lamp' }]}
        actions={<button type="button">Edit</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Item details' })).toBeInTheDocument();
    expect(screen.getByText('Everything about this item.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute('href', '/items');
    expect(screen.getByText('Lamp')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('hands out its title for focus by code, when asked, without adding it to the Tab order', () => {
    const titleRef = createRef<HTMLHeadingElement>();
    render(<PageHeader title="Items" titleRef={titleRef} />);

    const title = screen.getByRole('heading', { level: 1, name: 'Items' });
    expect(titleRef.current).toBe(title);
    expect(title).toHaveAttribute('tabindex', '-1');
  });

  it('leaves its title alone when nobody asks for it', () => {
    render(<PageHeader title="Items" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Items' })).not.toHaveAttribute(
      'tabindex',
    );
  });
});
