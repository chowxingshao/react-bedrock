/** Developer-facing description of any thrown value: the stack for Errors plus their extra own properties. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const extra = Object.fromEntries(Object.entries(error));
    const header = `${error.name}: ${error.message}`;
    // V8 puts the header in `stack`; Firefox and Safari list frames only.
    const head = !error.stack
      ? header
      : error.stack.includes(error.message)
        ? error.stack
        : `${header}\n${error.stack}`;
    return Object.keys(extra).length > 0 ? `${head}\n\n${toJson(extra)}` : head;
  }
  return typeof error === 'string' ? error : toJson(error);
}

function toJson(value: unknown): string {
  try {
    const json = JSON.stringify(value, null, 2) as string | undefined;
    return json ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
