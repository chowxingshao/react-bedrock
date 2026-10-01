import { safeString } from './safe-string';
import { summariseCause } from './summarise-cause';

const UNDESCRIBABLE = '[undescribable error]';

/**
 * Developer-facing description of any thrown value: the stack for Errors plus their extra own
 * properties. Total: it never throws, whatever was thrown, because it runs while an error is shown.
 */
export function describeError(error: unknown): string {
  try {
    return describe(error);
  } catch {
    // A value that cannot be inspected (a revoked proxy, a throwing getter or `toString`).
    return safeString(error, UNDESCRIBABLE);
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    // `cause` is described by `describeCause` below, never dumped whole.
    const extra = Object.fromEntries(Object.entries(error).filter(([key]) => key !== 'cause'));
    const header = `${error.name}: ${error.message}`;
    // V8 puts the header in `stack`; Firefox and Safari list frames only.
    const head = !error.stack
      ? header
      : error.stack.includes(error.message)
        ? error.stack
        : `${header}\n${error.stack}`;
    const withExtras = Object.keys(extra).length > 0 ? `${head}\n\n${toJson(extra)}` : head;
    return error.cause === undefined
      ? withExtras
      : `${withExtras}\n\nCaused by: ${describeCause(error.cause)}`;
  }
  return typeof error === 'string' ? error : toJson(error);
}

/**
 * One line for the `cause` of an error: name, message, code and status only (`summariseCause`). A
 * cause such as an Axios error carries the request (headers, body, credentials), which must never be
 * printed.
 */
function describeCause(cause: unknown): string {
  if (typeof cause !== 'object' || cause === null) return safeString(cause);
  const { name, message, code, status } = summariseCause(cause);
  const text = (value: string | number | undefined) =>
    value === undefined ? undefined : String(value);
  const label = [text(name), text(message)].filter(Boolean).join(': ') || 'unknown error';
  const details = [
    text(code) && `code ${text(code)}`,
    text(status) && `status ${text(status)}`,
  ].filter(Boolean);
  return details.length > 0 ? `${label} (${details.join(', ')})` : label;
}

function toJson(value: unknown): string {
  try {
    const json = JSON.stringify(value, null, 2) as string | undefined;
    return json ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
