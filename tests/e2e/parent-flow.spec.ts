import { test, expect } from '@playwright/test';
test('magic link → profile → persistent Leo lock → PIN unlock', async ({
  page,
  request,
}) => {
  test.skip(
    process.env.E2E_LOCAL_SUPABASE !== '1',
    'Requires a local Supabase stack with Mailpit.',
  );
  const email = `parent-${Date.now()}@example.test`;
  await page.goto('/login');
  await page.getByLabel('E-postadressen din').fill(email);
  await page.getByRole('button', { name: 'Send innloggingslenke' }).click();
  await expect(page.getByRole('status')).toContainText('Sjekk e-posten');
  let messageId = '';
  await expect
    .poll(async () => {
      const res = await request.get('http://127.0.0.1:54324/api/v1/messages');
      const inbox = await res.json();
      const msg = inbox.messages.find(
        (m: { ID: string; To: { Address: string }[] }) =>
          m.To.some((t) => t.Address === email),
      );
      messageId = msg?.ID ?? '';
      return messageId;
    })
    .not.toBe('');
  const detail = await (
    await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`)
  ).json();
  const link = /href="([^"]*\/auth\/v1\/verify[^"]*)"/
    .exec(detail.HTML)?.[1]
    ?.replaceAll('&amp;', '&');
  expect(link).toBeTruthy();
  await page.goto(link!);
  await expect(
    page.getByRole('heading', { name: 'Foreldresiden', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Opprett elevprofil' }).click();
  await expect(
    page.getByRole('heading', { name: 'Leo · 4. trinn' }),
  ).toBeVisible();
  await page.getByLabel('Forelderens PIN (fire sifre)').fill('0123');
  await page.getByRole('button', { name: 'Lagre PIN' }).click();
  await expect(page.getByText('PIN er lagret.')).toBeVisible();
  await page.getByRole('button', { name: 'Start Leo-modus for Leo' }).click();
  await expect(page.getByRole('heading', { name: 'Hei, Leo!' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hei, Leo!' })).toBeVisible();
  await page.goto('/forelder');
  await expect(page).toHaveURL(/\/leo$/);
  await page.getByText('For forelder', { exact: true }).click();
  await page.getByLabel('Forelderens PIN', { exact: true }).fill('9999');
  await page.getByRole('button', { name: 'Lås opp foreldresiden' }).click();
  await expect(page.getByRole('status')).toContainText('Feil PIN');
  await page.getByLabel('Forelderens PIN', { exact: true }).fill('0123');
  await page.getByRole('button', { name: 'Lås opp foreldresiden' }).click();
  await expect(
    page.getByRole('heading', { name: 'Foreldresiden', exact: true }),
  ).toBeVisible();
});
