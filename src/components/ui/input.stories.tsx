import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'you@example.com' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="grid w-72 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="input-default">Email</Label>
        <Input id="input-default" type="email" {...args} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="input-disabled">Disabled</Label>
        <Input id="input-disabled" disabled {...args} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="input-invalid">Invalid</Label>
        <Input id="input-invalid" aria-invalid {...args} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="input-file">File</Label>
        <Input id="input-file" type="file" />
      </div>
    </div>
  ),
};
