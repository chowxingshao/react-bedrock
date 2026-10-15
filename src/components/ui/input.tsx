import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/cn';

/** Size consumes the Phase-1 density tokens: md = today's h-9. */
const inputVariants = cva(
  'w-full min-w-0 border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive md:text-sm dark:bg-input/30',
  {
    variants: {
      size: {
        sm: 'h-(--control-h-sm)',
        md: 'h-(--control-h-md)',
        lg: 'h-(--control-h-lg)',
      },
      shape: {
        default: 'rounded-md',
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      },
    },
    defaultVariants: { size: 'md', shape: 'default' },
  },
);

function Input({
  className,
  type,
  size = 'md',
  shape = 'default',
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      data-shape={shape}
      className={cn(inputVariants({ size, shape }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
