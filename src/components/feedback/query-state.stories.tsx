import type { Meta, StoryObj } from '@storybook/react-vite';

import { QueryState, type QueryLike } from './query-state';
import { ListSkeleton } from './skeleton-presets';

const refetch = () => Promise.resolve();
const pending: QueryLike<string[], Error> = {
  status: 'pending',
  data: undefined,
  error: null,
  refetch,
};
const success: QueryLike<string[], Error> = {
  status: 'success',
  data: ['Alpha', 'Beta', 'Gamma'],
  error: null,
  refetch,
};
const empty: QueryLike<string[], Error> = { status: 'success', data: [], error: null, refetch };
const failed: QueryLike<string[], Error> = {
  status: 'error',
  data: undefined,
  error: new Error('Request failed'),
  refetch,
};

const renderList = (data: string[]) => (
  <ul className="list-disc pl-6">
    {data.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const meta = { title: 'Feedback/QueryState', parameters: { layout: 'padded' } } satisfies Meta;

export default meta;
type Story = StoryObj;

export const Loading: Story = {
  render: () => (
    <QueryState query={pending} loading={<ListSkeleton items={3} />}>
      {renderList}
    </QueryState>
  ),
};
export const Success: Story = {
  render: () => <QueryState query={success}>{renderList}</QueryState>,
};
export const Empty: Story = { render: () => <QueryState query={empty}>{renderList}</QueryState> };
export const Failed: Story = { render: () => <QueryState query={failed}>{renderList}</QueryState> };
