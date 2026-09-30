import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchXIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { EmptyState } from './empty-state';

const meta = { title: 'Feedback/EmptyState', component: EmptyState } satisfies Meta<
  typeof EmptyState
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    title: 'No items yet',
    description: 'Create your first item to get started.',
    action: <Button>Create item</Button>,
  },
};

export const NoSearchResults: Story = {
  args: {
    icon: SearchXIcon,
    title: 'No results',
    description: 'Try a different search term or clear the filters.',
  },
};
