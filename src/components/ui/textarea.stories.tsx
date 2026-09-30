import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { Textarea } from './textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { placeholder: 'Type your message here.' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" {...args} />
    </div>
  ),
};

export const Invalid: Story = { args: { 'aria-invalid': true } };

export const Disabled: Story = { args: { disabled: true } };
