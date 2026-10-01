import type { SessionUser } from '@/stores/session-store';

export interface MockUser extends SessionUser {
  password: string;
}

/** Password of every demo account. Mock API only; the login page shows it when mocks are on. */
export const DEMO_PASSWORD = 'demo1234';

export const MOCK_USER_IDS = { admin: 'user-admin', viewer: 'user-viewer' } as const;
export type MockUserKey = keyof typeof MOCK_USER_IDS;

/** Demo sign-in emails (the login page shows them when mocks are on). */
export const DEMO_EMAILS = { admin: 'admin@example.com', viewer: 'viewer@example.com' } as const;

/** Demo accounts: one with every permission, one read-only (to show permission checks). */
export const MOCK_USERS: readonly MockUser[] = [
  {
    id: MOCK_USER_IDS.admin,
    name: 'Alex Admin',
    email: DEMO_EMAILS.admin,
    password: DEMO_PASSWORD,
    permissions: ['items.read', 'items.create', 'items.update', 'items.delete'],
  },
  {
    id: MOCK_USER_IDS.viewer,
    name: 'Vic Viewer',
    email: DEMO_EMAILS.viewer,
    password: DEMO_PASSWORD,
    permissions: ['items.read'],
  },
];
