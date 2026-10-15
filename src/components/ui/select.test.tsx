import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Select, SelectTrigger, SelectValue } from './select';

function renderTrigger(props?: { size?: 'sm' | 'md' | 'lg' }) {
  render(
    <Select>
      <SelectTrigger aria-label="picker" {...props}>
        <SelectValue placeholder="Pick" />
      </SelectTrigger>
    </Select>,
  );
  return screen.getByLabelText('picker');
}

describe('SelectTrigger', () => {
  it('defaults to md size', () => {
    expect(renderTrigger()).toHaveAttribute('data-size', 'md');
  });

  it.each(['sm', 'md', 'lg'] as const)('reflects the %s size', (size) => {
    expect(renderTrigger({ size })).toHaveAttribute('data-size', size);
  });
});
