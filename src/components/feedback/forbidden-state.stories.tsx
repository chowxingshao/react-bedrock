import type { Meta, StoryObj } from '@storybook/react-vite';

import { ForbiddenState } from './forbidden-state';

const meta = { title: 'Feedback/ForbiddenState', component: ForbiddenState } satisfies Meta<
  typeof ForbiddenState
>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What <RequirePermission> renders when the signed-in user lacks the permission. */
export const Default: Story = {};
