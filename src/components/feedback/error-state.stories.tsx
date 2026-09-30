import type { Meta, StoryObj } from '@storybook/react-vite';

import { ErrorState } from './error-state';

const meta = {
  title: 'Feedback/ErrorState',
  component: ErrorState,
  args: { onRetry: () => undefined },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTechnicalDetails: Story = {
  args: { error: new Error('Request failed with status 500'), showDetails: true },
};

export const WithoutRetry: Story = { args: { onRetry: undefined } };
