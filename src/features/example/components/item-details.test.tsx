import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { formatCurrency } from '@/lib/format';
import { createItemFixtures } from '@/mocks/fixtures/items';
import { render, screen } from '@/test/render';

import { ItemDetails } from './item-details';

const item = createItemFixtures()[1]!;

describe('ItemDetails', () => {
  it('shows every field, formatted', () => {
    render(<ItemDetails item={item} />);
    expect(screen.getByText('Notebook A5 from the demo catalogue.')).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(16.75))).toBeInTheDocument();
    expect(screen.getByText('item-002')).toBeInTheDocument();
  });

  it('copies the id', async () => {
    // setup() installs its own clipboard stub, so the fake goes in after it.
    const user = userEvent.setup();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<ItemDetails item={item} />);

    await user.click(screen.getByRole('button', { name: 'Copy ID' }));

    expect(writeText).toHaveBeenCalledWith('item-002');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
