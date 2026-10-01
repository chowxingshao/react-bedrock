/**
 * In-memory state of the mock backend. It resets on page reload (the browser keeps the session through
 * the mock cookie) and after every test (src/test/setup.ts calls resetMockDb).
 */
export const mockDb: { sessionUserId: string | null } = { sessionUserId: null };

export function resetMockDb(): void {
  mockDb.sessionUserId = null;
}
