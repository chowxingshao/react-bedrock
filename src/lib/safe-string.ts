/**
 * `String(value)` that cannot throw. Anything can be thrown in JavaScript, and `String(...)` throws for
 * an object without a prototype, a revoked proxy or a `toString` that throws or returns an object.
 */
export function safeString(value: unknown, fallback = '[unprintable value]'): string {
  try {
    return String(value);
  } catch {
    return fallback;
  }
}
