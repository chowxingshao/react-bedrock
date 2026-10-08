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

/** When the view is the whole page, as for a router-level 404, its title is the page's h1. */
export const AsWholePage: Story = { args: { headingLevel: 1 } };
