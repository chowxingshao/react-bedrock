/** Developer-facing description of any thrown value: the stack for Errors plus their extra own properties. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    // `cause` is described by `summariseCause` below, never dumped whole.
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
      : `${withExtras}\n\nCaused by: ${summariseCause(error.cause)}`;
  }
  return typeof error === 'string' ? error : toJson(error);
}

/**
 * One line for the `cause` of an error: name, message, code and status only. A cause such as an
 * Axios error carries the request (headers, body, credentials), which must never be printed.
 */
function summariseCause(cause: unknown): string {
  if (typeof cause !== 'object' || cause === null) return String(cause);
  const { name, message, code, status } = cause as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
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
