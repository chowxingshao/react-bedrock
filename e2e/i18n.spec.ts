import { expect, signIn, test } from './fixtures';

test('switches to Spanish and remembers it', async ({ page }) => {
  await signIn(page);

  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('menuitemradio', { name: 'Español' }).click();

  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Panel' })).toBeVisible();
});
