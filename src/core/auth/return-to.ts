import { paths } from '@/config/paths';

/**
 * Only same-origin, relative paths may be used as post-login destinations (prevents open redirects).
 * "//evil.example" and "/\evil.example" are protocol-relative tricks and are rejected. So is any
 * path that does not stay on this origin once parsed: browsers drop tabs and line breaks inside a
 * URL, which turns "/<TAB>/evil.example" into "//evil.example".
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return paths.dashboard();
  }
  try {
    if (new URL(value, window.location.origin).origin !== window.location.origin) {
      return paths.dashboard();
    }
  } catch {
    return paths.dashboard();
  }
  return value;
}
