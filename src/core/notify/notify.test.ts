import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notify } from './notify';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(() => 'toast-id'),
    error: vi.fn(() => 'toast-id'),
    info: vi.fn(() => 'toast-id'),
    warning: vi.fn(() => 'toast-id'),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('notify', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows each kind of toast with a stable id derived from its content', () => {
    notify.success('Saved');
    notify.info('Heads up', { description: 'Details' });

    expect(toast.success).toHaveBeenCalledWith('Saved', { id: 'success:Saved' });
    expect(toast.info).toHaveBeenCalledWith('Heads up', {
      description: 'Details',
      id: 'info:Heads up',
    });
  });

  it('ignores an identical toast fired again within the dedupe window', () => {
    notify.error('Network down');
    notify.error('Network down');
    expect(toast.error).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_000);
    notify.error('Network down');
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('does not dedupe different messages or kinds', () => {
    notify.warning('A');
    notify.warning('B');
    notify.error('A');
    expect(toast.warning).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('wraps promises and returns the same promise', async () => {
    const work = Promise.resolve(42);
    const messages = { loading: 'Saving…', success: 'Saved', error: 'Failed' };

    await expect(notify.promise(work, messages)).resolves.toBe(42);
    expect(toast.promise).toHaveBeenCalledWith(work, messages);
  });

  it('dismisses toasts', () => {
    notify.dismiss('toast-id');
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
  });
});
