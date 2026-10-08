import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * Mirrors the demo accounts in src/mocks/fixtures/users.ts (mock API only). e2e/ cannot import from src/, so
 * `src/test/e2e-fixtures.guard.test.ts` fails when the two drift apart.
 */
export const ACCOUNTS = {
  admin: { email: 'admin@example.com', password: 'demo1234' },
  viewer: { email: 'viewer@example.com', password: 'demo1234' },
} as const;

export async function signIn(page: Page, account: keyof typeof ACCOUNTS = 'admin'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS[account].email);
  await page.getByLabel('Password').fill(ACCOUNTS[account].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

/** `makeAxeBuilder()` runs axe with the WCAG 2.1 A and AA rules (spec §10.2). */
export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, provide) => {
    await provide(() =>
      new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']),
    );
  },
});

export { expect };
