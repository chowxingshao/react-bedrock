import type { Meta, StoryObj } from '@storybook/react-vite';

import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  ListSkeleton,
  TableSkeleton,
} from './skeleton-presets';

const meta = {
  title: 'Feedback/SkeletonPresets',
  component: TableSkeleton,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TableSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Table: Story = { args: { rows: 5, columns: 4 } };
export const Card: Story = { render: () => <CardSkeleton /> };
export const List: Story = { render: () => <ListSkeleton items={4} /> };
export const Form: Story = { render: () => <FormSkeleton fields={3} /> };
export const Detail: Story = { render: () => <DetailSkeleton /> };
