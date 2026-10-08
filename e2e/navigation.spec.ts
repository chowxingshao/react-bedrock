import { expect, signIn, test } from './fixtures';

test('navigates with the sidebar and titles every page', async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveTitle('Dashboard · React Bedrock');

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Items' })
    .click();

  await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible();
  await expect(page).toHaveTitle('Items · React Bedrock');
});

test('shows the 404 page inside the app shell', async ({ page }) => {
  await signIn(page);
  await page.goto('/does-not-exist');

  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
});

test('is keyboard navigable: the skip link comes first and moves focus to the content', async ({
  page,
}) => {
  await signIn(page);
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible(); // visible when focused (focus:not-sr-only)
  await page.keyboard.press('Enter');

  await expect(page.locator('#main-content')).toBeFocused();
});

test('keeps the sidebar in view while a long page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await signIn(page);
  await page.goto('/items');
  await expect(page.getByRole('link', { name: 'Desk lamp', exact: true })).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

  await expect(page.locator('aside')).toBeInViewport();
  // Still at the top of the window (the scroll offset may leave half a pixel of rounding).
  const top = (await page.locator('aside').boundingBox())?.y ?? Number.NaN;
  expect(Math.abs(top)).toBeLessThan(1);
});
