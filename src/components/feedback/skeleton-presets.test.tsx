import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  ListSkeleton,
  TableSkeleton,
} from './skeleton-presets';

const countSkeletons = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="skeleton"]').length;

describe('skeleton presets', () => {
  it('TableSkeleton renders a header row plus the requested rows and columns', () => {
    const { container } = render(<TableSkeleton rows={3} columns={2} />);
    expect(countSkeletons(container)).toBe((3 + 1) * 2);
  });

  it('ListSkeleton renders one avatar and two lines per item', () => {
    const { container } = render(<ListSkeleton items={2} />);
    expect(countSkeletons(container)).toBe(2 * 3);
  });

  it('FormSkeleton renders a label and control per field plus a submit button', () => {
    const { container } = render(<FormSkeleton fields={3} />);
    expect(countSkeletons(container)).toBe(3 * 2 + 1);
  });

  it.each([
    ['CardSkeleton', <CardSkeleton key="card" />],
    ['DetailSkeleton', <DetailSkeleton key="detail" />],
    ['TableSkeleton', <TableSkeleton key="table" />],
  ])('%s is announced as loading', (_name, element) => {
    render(element);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
