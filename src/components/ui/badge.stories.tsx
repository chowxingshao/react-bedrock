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

const SHAPES = ['default', 'rounded', 'pill', 'square'] as const;
const TONES = ['solid', 'soft', 'outline'] as const;

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Badge' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    shape: { control: 'select', options: SHAPES },
    tone: { control: 'select', options: TONES },
  },
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

export const Shapes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {SHAPES.map((shape) => (
        <Badge key={shape} {...args} shape={shape}>
          {shape}
        </Badge>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {(['default', 'destructive'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          {TONES.map((tone) => (
            <Badge key={tone} {...args} variant={variant} tone={tone}>
              {variant} · {tone}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
};
