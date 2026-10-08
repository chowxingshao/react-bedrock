import { describe, expect, it } from 'vitest';

import fixtures from '/e2e/fixtures.ts?raw';

import { DEMO_EMAILS, DEMO_PASSWORD } from '@/mocks/fixtures/users';

describe('E2E fixtures (spec §10.2)', () => {
  it('mirrors the demo accounts of the mock API', () => {
    // e2e/ cannot import from src/ (it has its own tsconfig and runs in Node), so the accounts are copied there.
    for (const email of Object.values(DEMO_EMAILS)) {
      expect(fixtures).toContain(`email: '${email}'`);
    }
    expect(fixtures).toContain(`password: '${DEMO_PASSWORD}'`);
  });
});
