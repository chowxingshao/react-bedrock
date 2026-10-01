/**
 * Values that make naive error handling throw: `String(...)` of a prototype-less object, `instanceof`
 * and property reads on a revoked proxy, a throwing `toString` and throwing getters. Anything can be
 * thrown in JavaScript, and the code that handles errors must survive all of it. Factories, not
 * values, so each test gets a fresh one (and a test title never has to format a revoked proxy).
 */

export function revokedProxy(): object {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
}

/** Readable name, a `message` getter that throws. */
export function throwingGetterCause(): object {
  return Object.defineProperties(
    {},
    {
      name: { enumerable: true, value: 'FlakyError' },
      message: {
        enumerable: true,
        get(): string {
          throw new Error('message boom');
        },
      },
    },
  );
}

/** Things that can be thrown. */
export const HOSTILE_VALUES: readonly (readonly [string, () => unknown])[] = [
  ['an object without a prototype', () => Object.create(null) as unknown],
  ['a revoked proxy', revokedProxy],
  [
    'an object with a throwing toString',
    () => ({
      toString() {
        throw new Error('toString boom');
      },
    }),
  ],
  [
    'an Error with a throwing message getter',
    () =>
      Object.defineProperty(new Error('hidden'), 'message', {
        get(): string {
          throw new Error('message boom');
        },
      }),
  ],
  [
    'an Error with a throwing property getter',
    () =>
      Object.defineProperty(new Error('hidden'), 'detail', {
        enumerable: true,
        get(): string {
          throw new Error('detail boom');
        },
      }),
  ],
];

/** Things an error can carry as its `cause`. */
export const HOSTILE_CAUSES: readonly (readonly [string, () => object])[] = [
  ['a cause with a throwing getter', throwingGetterCause],
  ['a revoked proxy as the cause', revokedProxy],
];

/** A rejected promise carrying `value`, which is exactly what a `queryFn` that throws a non-Error does. */
export function rejectWith(value: unknown): Promise<never> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a non-Error rejection is the point
  return Promise.reject(value);
}
