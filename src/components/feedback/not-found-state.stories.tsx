import type { Meta, StoryObj } from '@storybook/react-vite';

import { NotFoundState } from './not-found-state';

const meta = { title: 'Feedback/NotFoundState', component: NotFoundState } satisfies Meta<
  typeof NotFoundState
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A detail page whose record does not exist overrides the copy. */
export const CustomCopy: Story = {
  args: { title: 'Item not found', description: 'It may have been deleted.' },
};
