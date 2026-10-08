import { expect, signIn, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto('/items');
  // `exact`: each row also has an icon link named "Edit <item name>".
  await expect(page.getByRole('link', { name: 'Desk lamp', exact: true })).toBeVisible();
});

test('search, filter, sort and paging live in the URL', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search items' }).fill('desk');
  await expect(page).toHaveURL(/\?q=desk$/);
  await expect(page.getByText('3 total')).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search items' }).fill('');
  await page.getByRole('combobox', { name: 'Filter by status' }).click();
  await page.getByRole('option', { name: 'Archived' }).click();
  await expect(page).toHaveURL(/status=archived/);

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Filter by status' })).toHaveText('Archived');
});

test('creates, edits and deletes an item', async ({ page }) => {
  await page.getByRole('link', { name: 'New item' }).click();
  await page.getByLabel('Name').fill('E2E lamp');
  await page.getByLabel('Price').fill('12.5');
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page.getByText('Created E2E lamp')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E lamp' })).toBeVisible();

  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Name').fill('E2E lamp XL');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'E2E lamp XL' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Deleted E2E lamp XL')).toBeVisible();
  await expect(page).toHaveURL(/\/items$/);
});

test('rolls back an optimistic delete the server refuses', async ({ page }) => {
  await page.getByRole('button', { name: 'Go to last page' }).click();
  await page.getByRole('button', { name: 'Delete Locked sample' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText("This item is locked and can't be deleted.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Locked sample', exact: true })).toBeVisible();
});

test('read-only users see no write actions and get 403 on write pages', async ({ page }) => {
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  // Wait for the sign-out to finish: a visit to /login before that would still find the old session.
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, 'viewer');

  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Desk lamp', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New item' })).toHaveCount(0);

  for (const path of ['/items/new', '/items/item-001/edit']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();
  }
});
