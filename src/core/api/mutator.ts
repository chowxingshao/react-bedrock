import type { AxiosRequestConfig } from 'axios';

import type { AppError } from './errors';
import { http } from './http';

/**
 * Orval's custom mutator (spec §6.3): every generated call goes through the shared `http` instance,
 * so auth refresh, request ids, Accept-Language, error normalisation, toasts and logging all apply.
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => http<T>({ ...config, ...options }).then(({ data }) => data);

/** Errors reaching generated hooks are already normalised to AppError by the interceptors. */
export type ErrorType<E = unknown> = E extends never ? never : AppError;

export type BodyType<BodyData> = BodyData;
