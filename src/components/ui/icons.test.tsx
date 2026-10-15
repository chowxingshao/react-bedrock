import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Add, ChevronDown, Dashboard, Delete, Error, Spinner } from './icons';

describe('icons barrel', () => {
  it.each([Add, ChevronDown, Dashboard, Delete, Error, Spinner])(
    'renders an svg for a representative alias',
    (Glyph) => {
      const { container } = render(<Glyph />);
      expect(container.querySelector('svg')).not.toBeNull();
    },
  );
});
