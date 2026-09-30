// The only Sentry SDK functions the transport uses. The transport imports this module, never the
// package root, so the SDK chunk holds just these and what they need (about 88 kB against 446 kB
// for all of `@sentry/react`, with its replay, feedback and tracing code).
export { addBreadcrumb, captureException, captureMessage, init, withScope } from '@sentry/react';
