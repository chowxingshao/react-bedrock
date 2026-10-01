import type { Meta, StoryObj } from '@storybook/react-vite';

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { AuthLayout } from './auth-layout';

const meta = {
  title: 'Layout/AuthLayout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>
            <h1>Sign in</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>Page content renders here.</CardContent>
      </>
    ),
  },
} satisfies Meta<typeof AuthLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
