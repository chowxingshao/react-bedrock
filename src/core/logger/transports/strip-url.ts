/** Removes the query string and fragment from a URL or path (`/a?token=1#b` becomes `/a`). */
export function stripUrl(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}
