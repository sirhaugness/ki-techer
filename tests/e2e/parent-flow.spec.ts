import { test, expect } from '@playwright/test';
test('magic link → profile → persistent Leo lock → PIN unlock', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  test.skip(
    process.env.E2E_LOCAL_SUPABASE !== '1',
    'Requires a local Supabase stack with Mailpit.',
  );
  const email = `parent-${Date.now()}@example.test`;
  page.on('response', (response) => {
    if (!response.request().isNavigationRequest()) return;
    const url = new URL(response.url());
    console.info('Auth navigation:', response.status(), url.pathname, [
      ...url.searchParams.keys(),
    ]);
  });
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
  // Do not log the email URL or query parameters: they contain credentials.
  console.info('After email verification:', new URL(page.url()).pathname);
  console.info(
    'Session cookie names:',
    (await page.context().cookies()).map((cookie) => cookie.name),
  );
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
  // R2 also runs with real local Auth/RLS in CI, never the dev shared database.
  await page.getByRole('link', { name: 'Prøv den nye spillflaten' }).click();
  await expect(page.getByRole('heading', { name: 'Tenn leia' })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('textbox', { name: 'Lyssteiner i alt' }).fill('11');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(page.getByTestId('chapter-scene')).toHaveAttribute(
    'data-phase',
    'retry',
  );
  await page.getByRole('button', { name: 'Hjelp med regningen' }).click();
  await expect(page.getByRole('complementary')).toContainText('én lykt først');
  await page.getByRole('textbox', { name: 'Lyssteiner i alt' }).fill('12');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await page.reload();
  await expect(page.getByTestId('chapter-scene')).toHaveAttribute(
    'data-phase',
    'solved',
  );
  await page.getByRole('link', { name: 'Pause og hjem' }).click();
  await page.getByRole('button', { name: 'Start Bli kjent' }).click();
  await page.getByRole('button', { name: '😊 Glad' }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByLabel('Svaret ditt', { exact: true }).fill('999');
    await page.getByRole('button', { name: 'Sjekk svaret' }).click();
    await page.getByRole('button', { name: 'Fortsett eventyret' }).click();
  }
  await page.getByRole('button', { name: 'Tilbake til kartet' }).click();
  await page.getByRole('button', { name: 'Start en matteøkt' }).click();
  await page.getByRole('button', { name: '🙂 Rolig' }).click();
  const hintSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/leo') &&
      response.request().method() === 'POST' &&
      response.request().postDataJSON()?.event?.type === 'hint',
  );
  await page.getByRole('button', { name: 'Jeg vil ha et hint' }).click();
  const hintResponse = await hintSaved;
  expect(hintResponse.status()).toBe(200);
  expect((await hintResponse.json()).hintLevel).toBeGreaterThan(0);
  await expect(
    page.getByRole('button', { name: 'Jeg vil ha et hint' }),
  ).toBeEnabled();
  const question = await page.locator('#task-question').innerText();
  await page.reload();
  await expect(page.locator('#task-question')).toHaveText(question);
  await page.getByRole('button', { name: 'Avslutt for i dag' }).click();
  const sessionEnded = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/leo') &&
      response.request().method() === 'POST' &&
      response.request().postDataJSON()?.event?.type === 'end',
  );
  await page.getByRole('button', { name: 'Lagre og avslutt' }).click();
  const endedResponse = await sessionEnded;
  expect(endedResponse.status()).toBe(200);
  expect((await endedResponse.json()).ended).toBe(true);
  await page.getByRole('button', { name: 'Tilbake til kartet' }).click();
  await page.goto('/forelder');
  await expect(page).toHaveURL(/\/leo$/);
  await page.getByText('For forelder', { exact: true }).click();
  await page.getByLabel('Forelderens PIN', { exact: true }).fill('9999');
  await page.getByRole('button', { name: 'Lås opp foreldresiden' }).click();
  await expect(page.getByRole('group').getByRole('status')).toContainText(
    'Feil PIN',
  );
  await page.getByLabel('Forelderens PIN', { exact: true }).fill('0123');
  await page.getByRole('button', { name: 'Lås opp foreldresiden' }).click();
  await expect(
    page.getByRole('heading', { name: 'Foreldresiden', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Se fremgang, økter og innstillinger for Leo' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Innsyn for Leo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Profilhukommelse' }),
  ).toBeVisible();
  const learnerId = new URL(page.url()).pathname.split('/').at(-1)!;
  const exported = await page.request.get(
    `/api/parent/export?learnerId=${learnerId}`,
  );
  expect(exported.status()).toBe(200);
  const data = await exported.json();
  expect(data.sessions.length).toBeGreaterThanOrEqual(2);
  expect(data.messages.length).toBeGreaterThan(0);
  expect(data.attempts.length).toBeGreaterThan(0);
  expect(data.login_account.email).toBe(email);
});
