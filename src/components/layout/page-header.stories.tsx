import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button';

import { PageHeader } from './page-header';

const meta = {
  title: 'Layout/PageHeader',
  component: PageHeader,
  parameters: { layout: 'padded' },
  args: {
    title: 'Item details',
    description: 'Everything about this item in one place.',
    breadcrumbs: [{ label: 'Items', to: '/items' }, { label: 'Desk lamp' }],
    actions: <Button>Edit</Button>,
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TitleOnly: Story = {
  args: { description: undefined, breadcrumbs: undefined, actions: undefined },
};
