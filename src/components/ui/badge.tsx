import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        success: 'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
        warning: 'border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90',
        info: 'border-transparent bg-info text-info-foreground [a&]:hover:bg-info/90',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
      shape: {
        default: 'rounded-md',
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
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
        class: 'border-transparent bg-primary/10 text-primary [a&]:hover:bg-primary/20',
      },
      {
        variant: 'default',
        tone: 'outline',
        class: 'border-primary bg-transparent text-primary [a&]:hover:bg-primary/10',
      },
      {
        variant: 'destructive',
        tone: 'soft',
        class: 'border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20',
      },
      {
        variant: 'destructive',
        tone: 'outline',
        class: 'border-destructive bg-transparent text-destructive [a&]:hover:bg-destructive/10',
      },
    ],
    defaultVariants: { variant: 'default', shape: 'default', tone: 'solid' },
  },
);

function Badge({
  className,
  variant = 'default',
  shape = 'default',
  tone = 'solid',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-shape={shape}
      data-tone={tone}
      className={cn(badgeVariants({ variant, shape, tone }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
