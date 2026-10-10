import { test, expect } from '@playwright/test';
test('auth callback keeps the same browser origin', async ({ page }) => {
  await page.goto('/auth/callback');
  await expect(page).toHaveURL('http://127.0.0.1:3000/login?error=link');
});
test('parent entry point has Norwegian, accessible login form', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Leo-læreren' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Kom i gang som forelder' }).click();
  await expect(
    page.getByRole('heading', { name: 'Innlogging for forelder' }),
  ).toBeVisible();
  await expect(page.getByLabel('E-postadressen din')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send innloggingslenke' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
});
