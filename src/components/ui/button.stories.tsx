import type { Meta, StoryObj } from '@storybook/react-vite';

import { Add } from '@/components/ui/icons';

import { Button } from './button';
import { Spinner } from './spinner';

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
const TEXT_SIZES = ['sm', 'md', 'lg'] as const;
const SHAPES = ['default', 'rounded', 'pill', 'square'] as const;
const TONES = ['solid', 'soft', 'outline'] as const;

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Button' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: [...TEXT_SIZES, 'icon'] },
    shape: { control: 'select', options: SHAPES },
    tone: { control: 'select', options: TONES },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="grid gap-3">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex items-center gap-2">
          {TEXT_SIZES.map((size) => (
            <Button key={size} {...args} variant={variant} size={size}>
              {variant} · {size}
            </Button>
          ))}
          <Button {...args} variant={variant} size="icon" aria-label={`${variant} icon button`}>
            <Add />
          </Button>
        </div>
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {SHAPES.map((shape) => (
        <Button key={shape} {...args} shape={shape}>
          {shape}
        </Button>
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
            <Button key={tone} {...args} variant={variant} tone={tone}>
              {variant} · {tone}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <Spinner />
      Saving…
    </Button>
  ),
};

export const AsLink: Story = {
  render: (args) => (
    <Button {...args} asChild variant="link">
      <a href="/">Go home</a>
    </Button>
  ),
};
