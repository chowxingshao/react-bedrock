import type { Meta, StoryObj } from '@storybook/react-vite';

import { ForbiddenState } from './forbidden-state';

const meta = { title: 'Feedback/ForbiddenState', component: ForbiddenState } satisfies Meta<
  typeof ForbiddenState
>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under a page title, as on the /403 page. */
export const Default: Story = {};

/** What <RequirePermission> renders when the signed-in user lacks the permission: the whole page. */
export const AsWholePage: Story = { args: { headingLevel: 1 } };
