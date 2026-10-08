import { expect, signIn, test } from './fixtures';

test('the login page has no WCAG A/AA violations, in light and dark', async ({
  page,
  makeAxeBuilder,
}) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);

  await page.getByRole('button', { name: 'Change theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  // Choosing an item closes the menu. Scan the page, not the page behind a closing menu.
  await expect(page.getByRole('menu')).toBeHidden();
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

for (const path of [
  '/dashboard',
  '/items',
  '/items/new',
  '/items/item-001',
  '/items/item-001/edit',
  '/does-not-exist',
]) {
  test(`${path} has no WCAG A/AA violations`, async ({ page, makeAxeBuilder }) => {
    await signIn(page);
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
  });
}

test('the items list has no violations in Spanish and in dark mode', async ({
  page,
  makeAxeBuilder,
}) => {
  await signIn(page);
  await page.goto('/items');
  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();

  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('menuitemradio', { name: 'Español' }).click();
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await page.getByRole('menuitemradio', { name: 'Oscuro' }).click();
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Desk lamp', exact: true })).toBeVisible();

  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test('open menus, selects and dialogs have no violations', async ({ page, makeAxeBuilder }) => {
  await signIn(page);
  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Desk lamp', exact: true })).toBeVisible();

  // While a Radix menu or select is open, Radix hides the rest of the page with aria-hidden and its focus
  // trap keeps focus inside. axe still reports the hidden controls as focusable (`aria-hidden-focus`), so that
  // one rule is switched off for these states. Every other rule still applies. The delete dialog is scanned
  // with every rule.
  const withoutRadixReport = () => makeAxeBuilder().disableRules(['aria-hidden-focus']);

  await page.getByRole('button', { name: 'Open user menu' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  expect((await withoutRadixReport().analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');

  await page.getByRole('combobox', { name: 'Rows per page' }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  expect((await withoutRadixReport().analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Delete Desk lamp' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});
