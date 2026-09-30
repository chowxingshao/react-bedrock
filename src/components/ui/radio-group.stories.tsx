import type { Meta, StoryObj } from '@storybook/react-vite';

import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';

const OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
] as const;

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  args: { defaultValue: 'comfortable' },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      {OPTIONS.map((option) => (
        <div key={option.value} className="flex items-center gap-2">
          <RadioGroupItem value={option.value} id={`density-${option.value}`} />
          <Label htmlFor={`density-${option.value}`}>{option.label}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};

export const Disabled: Story = { args: { disabled: true }, render: Default.render };
