import type { Meta, StoryObj } from '@storybook/react-vite';

import { PageLoader } from './page-loader';

const meta = {
  title: 'Feedback/PageLoader',
  component: PageLoader,
  args: { delayMs: 0 },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Section: Story = { args: { variant: 'section' } };
export const Page: Story = { args: { variant: 'page' } };
