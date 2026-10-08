import { ACCOUNTS, expect, signIn, test } from './fixtures';

test('sends visitors to login and back to the page they asked for', async ({ page }) => {
  await page.goto('/items');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fitems$/);

  await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
  await page.getByLabel('Password').fill(ACCOUNTS.admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
});

test('explains wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ACCOUNTS.admin.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.');
});

test('keeps the session across reloads, then signs out', async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();

  await expect(page).toHaveURL(/\/login$/);
});
