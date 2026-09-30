import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta = { title: 'UI/Popover', component: Popover } satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-2">
          <h4 className="leading-none font-medium">Dimensions</h4>
          <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
