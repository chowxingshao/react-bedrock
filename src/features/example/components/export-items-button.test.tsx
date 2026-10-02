import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEnvFlagSource, getFeatureFlagSource, setFeatureFlagSource } from '@/config/features';
import { createItemFixtures } from '@/mocks/fixtures/items';
import { render, screen } from '@/test/render';

import { ExportItemsButton } from './export-items-button';

describe('ExportItemsButton', () => {
  const original = getFeatureFlagSource();
  afterEach(() => {
    setFeatureFlagSource(original);
  });

  it('is hidden while the itemsExport flag is off', () => {
    // Explicit source: the default one reads VITE_FEATURE_FLAGS, which a developer may have set.
    setFeatureFlagSource(createEnvFlagSource([]));
    render(<ExportItemsButton items={createItemFixtures()} />);
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('downloads the current rows as CSV when the flag is on', async () => {
    setFeatureFlagSource(createEnvFlagSource(['itemsExport']));
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:items');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(<ExportItemsButton items={createItemFixtures().slice(0, 2)} />);
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(click).toHaveBeenCalledTimes(1);
    const csv = await createObjectURL.mock.calls[0]?.[0].text();
    expect(csv?.split('\r\n')).toEqual([
      'Name,Status,Price,Quantity',
      'Desk lamp,Active,9.5,0',
      'Notebook A5,Active,16.75,13',
    ]);
  });
});
