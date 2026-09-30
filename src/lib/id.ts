/**
 * RFC 4122 version-4 id for request tracing.
 * `crypto.randomUUID` only exists in secure contexts (https or localhost); `getRandomValues` exists everywhere.
 */
export function createRequestId(): string {
  const randomUUID = (crypto as Partial<Crypto>).randomUUID;
  if (randomUUID) return randomUUID.call(crypto);

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
