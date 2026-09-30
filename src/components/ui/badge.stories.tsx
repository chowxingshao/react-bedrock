import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';

const VARIANTS = [
  'default',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'outline',
] as const;

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Badge' },
  argTypes: { variant: { control: 'select', options: VARIANTS } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};
