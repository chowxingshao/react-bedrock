import { expect, signIn, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto('/items');
  // `exact`: each row also has an icon link named "Edit <item name>".
  await expect(page.getByRole('link', { name: 'Desk lamp', exact: true })).toBeVisible();
});

test('search and filter live in the URL and survive a reload', async ({ page }) => {
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

test('keeps focus on the pager when it reaches the last page', async ({ page }) => {
  const last = page.getByRole('button', { name: 'Go to last page' });
  await last.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/page=\d+/);
  // Check the attribute first: it waits for the re-render, so the focus check cannot run before the browser
  // would have dropped focus from a disabled button.
  await expect(last).toHaveAttribute('aria-disabled', 'true');
  await expect(last).toBeFocused();
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

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Deleted E2E lamp XL')).toBeVisible();
  await expect(page).toHaveURL(/\/items$/);
});

test('moves focus to the next row after a row is deleted', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Desk lamp' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Deleted Desk lamp')).toBeVisible();
  // The delete button had focus and is gone with its row: focus must not fall back to the top of the page.
  await expect(page.getByRole('link', { name: 'Notebook A5', exact: true })).toBeFocused();
});

test('rolls back an optimistic delete the server refuses, and gives focus back to its button', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Go to last page' }).click();
  await page.getByRole('button', { name: 'Delete Locked sample' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText("This item is locked and can't be deleted.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Locked sample', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete Locked sample' })).toBeFocused();
});

test('gives focus back to the Delete button of a detail page when the server refuses', async ({
  page,
}) => {
  await page.goto('/items/item-locked');
  await expect(page.getByRole('heading', { level: 1, name: 'Locked sample' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText("This item is locked and can't be deleted.")).toBeVisible();
  // The button was disabled while the request ran, so the dialog could not give focus back to it.
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeFocused();
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
    // The denied page has no page title of its own, so this message is its h1.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "You don't have access to this page",
    );
  }
});
