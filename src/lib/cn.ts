import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge, taught the token utilities defined in src/styles/globals.css. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      z: [{ z: ['sticky', 'dropdown', 'modal', 'toast'] }],
      duration: [{ duration: ['fast', 'normal', 'slow'] }],
    },
  },
});

/** Merges class names. Later Tailwind utilities override conflicting earlier ones (spec §5.3). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
