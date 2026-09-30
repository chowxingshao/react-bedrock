import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { Switch } from './switch';

const meta = { title: 'UI/Switch', component: Switch } satisfies Meta<typeof Switch>;

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
