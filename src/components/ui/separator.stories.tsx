import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './separator';

const meta = { title: 'UI/Separator', component: Separator } satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Orientations: Story = {
  render: () => (
    <div className="w-72">
      <p className="text-sm font-medium">Section title</p>
      <p className="text-sm text-muted-foreground">Supporting text.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Guides</span>
        <Separator orientation="vertical" />
        <span>Source</span>
      </div>
    </div>
  ),
};
