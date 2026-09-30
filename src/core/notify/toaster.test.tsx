import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { notify } from './notify';
import { Toaster } from './toaster';

describe('Toaster', () => {
  it('renders toasts raised through notify', async () => {
    render(<Toaster />);
    notify.success('Item created');
    expect(await screen.findByText('Item created')).toBeInTheDocument();
  });
});
