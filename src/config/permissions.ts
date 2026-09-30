/**
 * Every permission the frontend checks (spec §7.9). The server is the real authority: these only
 * decide what the UI shows. Name them `<resource>.<action>`; features add theirs here.
 */
export const PERMISSIONS = [
  'items.read',
  'items.create',
  'items.update',
  'items.delete',
  // plop:permissions
] as const;

export type Permission = (typeof PERMISSIONS)[number];
