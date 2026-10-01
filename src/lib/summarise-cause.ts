export interface CauseSummary {
  name?: string | number;
  message?: string | number;
  code?: string | number;
  status?: string | number;
}

const FIELDS = ['name', 'message', 'code', 'status'] as const;

/**
 * The `cause` of an error, reduced to its name, message, code and status (strings and numbers only).
 * A cause such as an Axios error carries the request (headers, body, URL query), and a body is a string
 * that key-based redaction cannot look into, so nothing else is ever copied. This is the one place the
 * policy lives: the logger's redactor and the technical details both use it.
 *
 * Total: a cause is arbitrary data, and this runs inside error handlers, so a getter or a revoked proxy
 * that throws costs that field only.
 */
export function summariseCause(cause: object): CauseSummary {
  const summary: CauseSummary = {};
  for (const field of FIELDS) {
    try {
      const value = (cause as Record<string, unknown>)[field];
      if (typeof value === 'string' || typeof value === 'number') summary[field] = value;
    } catch {
      // Unreadable: leave the field out.
    }
  }
  return summary;
}
