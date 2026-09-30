import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './checkbox';
import { Label } from './label';

const meta = { title: 'UI/Checkbox', component: Checkbox } satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="cb-unchecked" />
        <Label htmlFor="cb-unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-checked" defaultChecked />
        <Label htmlFor="cb-checked">Checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-disabled" disabled />
        <Label htmlFor="cb-disabled">Disabled</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-invalid" aria-invalid />
        <Label htmlFor="cb-invalid">Invalid</Label>
      </div>
    </div>
  ),
};
