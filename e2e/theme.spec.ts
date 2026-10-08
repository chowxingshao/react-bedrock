import { expect, test } from './fixtures';

test('switches to dark mode, persists it, and applies it before the app loads', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  // The inline bootstrap script ran during parsing, before React: no light flash.
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
});
