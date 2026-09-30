import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { Switch } from './switch';

const SIZES = ['default', 'sm'] as const;

const meta = {
  title: 'UI/Switch',
  component: Switch,
  argTypes: { size: { control: 'select', options: SIZES } },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Switch id="sw-off" />
        <Label htmlFor="sw-off">Off</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-on" defaultChecked />
        <Label htmlFor="sw-on">On</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="sw-disabled" disabled />
        <Label htmlFor="sw-disabled">Disabled</Label>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {SIZES.map((size) => (
        <div key={size} className="flex items-center gap-2">
          <Switch id={`sw-size-${size}`} {...args} size={size} defaultChecked />
          <Label htmlFor={`sw-size-${size}`}>{size}</Label>
        </div>
      ))}
    </div>
  ),
};
