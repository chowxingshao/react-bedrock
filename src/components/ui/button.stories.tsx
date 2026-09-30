import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlusIcon } from 'lucide-react';

import { Button } from './button';
import { Spinner } from './spinner';

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
const TEXT_SIZES = ['sm', 'md', 'lg'] as const;

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Button' },
  argTypes: {
    variant: { control: 'select', options: VARIANTS },
    size: { control: 'select', options: [...TEXT_SIZES, 'icon'] },
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
            <PlusIcon />
          </Button>
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
