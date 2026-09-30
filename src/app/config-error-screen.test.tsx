import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConfigErrorScreen } from './config-error-screen';

describe('ConfigErrorScreen', () => {
  it('lists every configuration problem', () => {
    render(
      <ConfigErrorScreen
        issues={['VITE_DEFAULT_CURRENCY: Must be a 3-letter ISO 4217 code, e.g. USD']}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Invalid configuration' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_DEFAULT_CURRENCY');
  });
});
