import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = { title: 'UI/Label', component: Label } satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithControl: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms" {...args}>
        Accept terms and conditions
      </Label>
    </div>
  ),
};
