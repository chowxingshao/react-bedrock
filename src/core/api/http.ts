import axios from 'axios';

import { HTTP_TIMEOUT_MS } from '@/config/constants';
import { env } from '@/config/env';
import { i18n } from '@/core/i18n';
import { logger } from '@/core/logger';
import { notify } from '@/core/notify';
import { createRequestId } from '@/lib/id';

import { getHttpAuth } from './auth-bridge';
import { getErrorMessage } from './errors';
import { installInterceptors } from './interceptors';

/** The single Axios instance (spec §6.1). Hand-written services and Orval-generated hooks both use it. */
export const http = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  // Axios ignores `baseURL` for an absolute (or `//host`) URL, which would send the request headers, and
  // the credentials the auth layer adds, to another origin. With this off, the base always applies.
  allowAbsoluteUrls: false,
  timeout: HTTP_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  transitional: { clarifyTimeoutError: true }, // timeouts report ETIMEDOUT instead of ECONNABORTED
});

installInterceptors(http, {
  getLocale: () => i18n.language,
  createRequestId,
  getHttpAuth,
  logger,
  notifyError: (error) => {
    notify.error(getErrorMessage(error));
  },
});
