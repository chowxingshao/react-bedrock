/**
 * Storage namespace derived from the app name: "React Bedrock" → "react-bedrock:".
 * The theme bootstrap script in index.html repeats this logic (guarded by theme-bootstrap.test.ts).
 */
export function toStoragePrefix(appName: string): string {
  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'app'}:`;
}
