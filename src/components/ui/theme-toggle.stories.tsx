import type { Meta, StoryObj } from '@storybook/react-vite';

import { ThemeToggle } from './theme-toggle';

const meta = { title: 'UI/ThemeToggle', component: ThemeToggle } satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Changes the real app theme store; the Storybook toolbar theme is independent. */
export const Default: Story = {};
