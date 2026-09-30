import { type ExternalToast, toast } from 'sonner';

import { TOAST_DEDUPE_WINDOW_MS } from '@/config/constants';

export type NotifyOptions = Pick<ExternalToast, 'action' | 'description' | 'duration' | 'id'>;
type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface NotifyPromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
}

const lastShownAt = new Map<string, number>();

function show(kind: ToastKind, message: string, options: NotifyOptions = {}): string | number {
  const key = `${kind}:${message}`;
  const id = options.id ?? key; // same content → same id → Sonner updates the visible toast instead of stacking
  const now = Date.now();
  const last = lastShownAt.get(key);
  if (last !== undefined && now - last < TOAST_DEDUPE_WINDOW_MS) return id;
  lastShownAt.set(key, now);
  return toast[kind](message, { ...options, id });
}

/** App notifications (spec §7.5). Use this instead of importing Sonner (ESLint enforces it). */
export const notify = {
  success: (message: string, options?: NotifyOptions) => show('success', message, options),
  error: (message: string, options?: NotifyOptions) => show('error', message, options),
  info: (message: string, options?: NotifyOptions) => show('info', message, options),
  warning: (message: string, options?: NotifyOptions) => show('warning', message, options),
  /** Shows loading → success/error for a promise and returns the same promise. */
  promise<T>(promise: Promise<T>, messages: NotifyPromiseMessages<T>): Promise<T> {
    toast.promise(promise, messages);
    return promise;
  },
  dismiss(id?: string | number): void {
    toast.dismiss(id);
  },
};
