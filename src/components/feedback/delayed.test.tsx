import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Delayed } from './delayed';

describe('Delayed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing until the delay has passed', () => {
    render(
      <Delayed delayMs={200}>
        <p>Loading</p>
      </Delayed>,
    );
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders immediately when the delay is zero', () => {
    render(
      <Delayed delayMs={0}>
        <p>Now</p>
      </Delayed>,
    );
    expect(screen.getByText('Now')).toBeInTheDocument();
  });
});
