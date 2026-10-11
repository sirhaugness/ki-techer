import { test, expect } from '@playwright/test';
test('startsiden fungerer på nettbrett uten eksterne kall', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const externalRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:3000') {
      await route.continue();
    } else {
      externalRequests.push(url.origin);
      await route.abort();
    }
  });
  await page.goto('/');
  await expect(page).toHaveTitle('Leo-læreren');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
  await expect(
    page.getByRole('heading', { name: 'Leo-læreren' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Kom i gang som forelder' }),
  ).toBeVisible();
  expect(externalRequests).toEqual([]);
});
