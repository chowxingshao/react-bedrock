/** Keys whose values are never logged (spec §7.4). Matching ignores case, `-` and `_`, and substrings count. */
export const DEFAULT_REDACT_KEYS = [
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
] as const;

const MAX_DEPTH = 8;
const REDACTED = '[REDACTED]';

const normalise = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The `cause` of an error, reduced to name, message, code and status. A cause such as an Axios error
 * carries the request (headers, body, URL query), and a body is a string that key-based redaction
 * cannot look into, so nothing else is ever copied.
 */
function summariseCause(cause: unknown): unknown {
  if (typeof cause !== 'object' || cause === null) return cause;
  const { name, message, code, status } = cause as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries({ name, message, code, status }).filter(
      ([, value]) => typeof value === 'string' || typeof value === 'number',
    ),
  );
}

/** Returns a function that deep-copies a value with sensitive keys replaced by "[REDACTED]". */
export function createRedactor(keys: readonly string[] = DEFAULT_REDACT_KEYS) {
  const needles = keys.map(normalise);
  const isSensitive = (key: string) => {
    const normalised = normalise(key);
    return needles.some((needle) => normalised.includes(needle));
  };

  function redactEntries(source: object, depth: number, ancestors: WeakSet<object>) {
    return Object.fromEntries(
      Object.entries(source).map(([key, child]) => [
        key,
        isSensitive(key) ? REDACTED : redact(child, depth + 1, ancestors),
      ]),
    );
  }

  function redact(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
    if (typeof value !== 'object' || value === null) return value;
    if (value instanceof Date) return value.toISOString();
    if (ancestors.has(value)) return '[Circular]';
    if (depth >= MAX_DEPTH) return '[Truncated]';

    ancestors.add(value);
    try {
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...redactEntries(value, depth, ancestors),
          ...(value.cause === undefined ? {} : { cause: summariseCause(value.cause) }),
        };
      }
      if (Array.isArray(value))
        return value.map((item: unknown) => redact(item, depth + 1, ancestors));
      return redactEntries(value, depth, ancestors);
    } finally {
      ancestors.delete(value);
    }
  }

  return (value: unknown) => redact(value);
}
