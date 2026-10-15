import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Any renderable icon component: a lucide glyph from `@/components/ui/icons`, or a custom
 * inline-SVG / image-backed component. Set-agnostic so the project can swap icon sets.
 */
export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const ICON_SIZE = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
} as const;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  /** The icon to render — a component object (never a string key). */
  icon: IconComponent;
  /** Uniform size from the icon scale. Default `md` (size-4). */
  size?: keyof typeof ICON_SIZE;
  /**
   * Accessible label. When set, the icon is exposed to assistive tech (`role="img"`).
   * When omitted, the icon is decorative (`aria-hidden`).
   */
  label?: string;
}

/** Optional wrapper for standalone icons: uniform sizing + a11y defaults (spec §5 Phase 3). */
function Icon({ icon: Component, size = 'md', label, className, ...props }: IconProps) {
  return (
    <Component
      className={cn(ICON_SIZE[size], className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    />
  );
}

export { Icon };
