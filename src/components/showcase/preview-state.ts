export type PreviewState = 'default' | 'hover' | 'focus' | 'active' | 'disabled' | 'invalid';

export interface PreviewAttrs {
  disabled?: boolean;
  'aria-invalid'?: true;
  'data-preview-state': string;
}

/**
 * Map a visual state to the real props/attributes a component honours.
 * We force only what a prop/attribute can genuinely force (disabled, invalid);
 * hover/focus/active are tagged for labelling but render the default appearance
 * (we never fake pseudo-states).
 */
export function previewState(state: PreviewState): PreviewAttrs {
  switch (state) {
    case 'disabled':
      return { disabled: true, 'data-preview-state': 'disabled' };
    case 'invalid':
      return { 'aria-invalid': true, 'data-preview-state': 'invalid' };
    default:
      return { 'data-preview-state': state };
  }
}
