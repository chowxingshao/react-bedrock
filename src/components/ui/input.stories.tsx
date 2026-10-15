import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';
import { Label } from './label';

const SIZES = ['sm', 'md', 'lg'] as const;
const SHAPES = ['default', 'rounded', 'pill', 'square'] as const;

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'you@example.com' },
  argTypes: {
    size: { control: 'select', options: SIZES },
    shape: { control: 'select', options: SHAPES },
  },
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

export const Sizes: Story = {
  render: (args) => (
    <div className="grid w-72 gap-3">
      {SIZES.map((size) => (
        <Input key={size} {...args} size={size} placeholder={size} />
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: (args) => (
    <div className="grid w-72 gap-3">
      {SHAPES.map((shape) => (
        <Input key={shape} {...args} shape={shape} placeholder={shape} />
      ))}
    </div>
  ),
};
