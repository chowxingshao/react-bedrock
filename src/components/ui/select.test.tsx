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

function classTokens(el: HTMLElement) {
  return (el.getAttribute('class') ?? '').split(/\s+/);
}

describe('SelectTrigger', () => {
  it('defaults to md size', () => {
    expect(renderTrigger()).toHaveAttribute('data-size', 'md');
  });

  it.each(['sm', 'md', 'lg'] as const)('reflects the %s size', (size) => {
    expect(renderTrigger({ size })).toHaveAttribute('data-size', size);
  });

  it.each(['sm', 'md', 'lg'] as const)(
    'carries the %s control-height token as its own class',
    (size) => {
      expect(classTokens(renderTrigger({ size }))).toContain(
        `data-[size=${size}]:h-(--control-h-${size})`,
      );
    },
  );

  it('keeps the select-value truncation class as a separate token', () => {
    expect(classTokens(renderTrigger())).toContain('*:data-[slot=select-value]:line-clamp-1');
  });
});
