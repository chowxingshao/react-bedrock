import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Variants are defined once here; changing one changes it app-wide (spec §5.3). */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        md: 'h-9 px-4 py-2 has-[>svg]:px-3',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
      shape: {
        default: 'rounded-md',
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
      // Empty by design: the solid look is the base variant; soft/outline are
      // supplied per-intent in compoundVariants (primary + destructive only).
      tone: {
        solid: '',
        soft: '',
        outline: '',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        tone: 'soft',
        class: 'bg-primary/10 text-primary shadow-none hover:bg-primary/20',
      },
      {
        variant: 'default',
        tone: 'outline',
        class: 'border border-primary bg-background text-primary shadow-xs hover:bg-primary/10',
      },
      {
        variant: 'destructive',
        tone: 'soft',
        class: 'bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20',
      },
      {
        variant: 'destructive',
        tone: 'outline',
        class:
          'border border-destructive bg-background text-destructive shadow-xs hover:bg-destructive/10',
      },
    ],
    defaultVariants: { variant: 'default', size: 'md', shape: 'default', tone: 'solid' },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'md',
  shape = 'default',
  tone = 'solid',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      data-tone={tone}
      className={cn(buttonVariants({ variant, size, shape, tone, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
