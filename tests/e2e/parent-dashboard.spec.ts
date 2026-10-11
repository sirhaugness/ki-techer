import { test, expect } from '@playwright/test';
const learner = '00000000-0000-4000-8000-000000000099';
test('parent reads progress, changes profile, acknowledges notices, exports full JSON and prints an awarded diploma', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'The real parent gate is exercised by the auth flow.',
  );
  test.setTimeout(60000);
  await page.goto(`/forelder/${learner}?fixture=reset`);
  await expect(
    page.getByRole('heading', { name: 'Innsyn for Leo' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Ny medaljongdel/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Marker del 4 som sett' }).click();
  await expect(
    page.getByRole('heading', { name: /Ny medaljongdel/ }),
  ).toHaveCount(0);
  const editor = page.locator('.profile-editor').first();
  await editor
    .getByRole('textbox', { name: 'Observasjon', exact: true })
    .fill('Liker å tegne grupper');
  await editor
    .getByRole('combobox', { name: 'Status', exact: true })
    .selectOption('låst');
  await editor.getByRole('button', { name: 'Lagre observasjon' }).click();
  await expect(page.getByRole('status')).toContainText('lagret');
  await page.reload();
  await expect(
    page
      .locator('.profile-editor')
      .first()
      .getByRole('combobox', { name: 'Status', exact: true }),
  ).toHaveValue('låst');
  await page
    .getByRole('button', { name: 'Marker sikkerhetsflagg som sett' })
    .click();
  await expect(
    page.getByText('Sett av forelder', { exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Se økten' }).click();
  await expect(
    page.getByRole('heading', { name: 'Samtale', exact: true }),
  ).toBeVisible();
  await page.getByText('lag_oppgave · godkjent').click();
  await expect(page.getByRole('heading', { name: 'Argumenter' })).toBeVisible();
  await page.goto(`/forelder/${learner}`);
  const exported = await page.request.get(
    `/api/parent/export?learnerId=${learner}`,
  );
  expect(exported.headers()['cache-control']).toContain('no-store');
  const json = await exported.json();
  expect(json.messages).toHaveLength(2);
  expect(json.tools).toHaveLength(1);
  await page
    .getByRole('link', { name: 'Diplom: Former og algoritmer', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Leo', exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: '/tmp/leo-diploma.png', fullPage: true });
  await page.pdf({ path: '/tmp/leo-diploma.pdf', preferCSSPageSize: true });
  await expect(
    page.getByRole('button', { name: 'Skriv ut diplom' }),
  ).toBeHidden();
  const bounds = await page.locator('.diploma').boundingBox();
  expect(bounds!.width).toBeGreaterThan(600);
  await page.emulateMedia({ media: 'screen' });
  await page.goto(`/forelder/${learner}/diplom?part=1`);
  await expect(
    page.getByRole('heading', { name: 'Leo', exact: true }),
  ).toHaveCount(0);
});
test('settings and deletion require explicit parent choices', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Uses synthetic fixture only.',
  );
  await page.goto(`/forelder/${learner}?fixture=reset`);
  await page.getByLabel('Øktlengde i minutter', { exact: true }).fill('10');
  await page
    .getByLabel('KI-budsjett per måned i kroner', { exact: true })
    .fill('25');
  await page.getByRole('button', { name: 'Lagre innstillinger' }).click();
  await expect(page.getByRole('status')).toContainText('lagret');
  await page.reload();
  await expect(
    page.getByLabel('Øktlengde i minutter', { exact: true }),
  ).toHaveValue('10');
  await page.getByText('Slett alle appdata', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Slett alle appdata nå' }),
  ).toBeDisabled();
  await page.getByLabel('Skriv SLETT for å bekrefte').fill('SLETT');
  await expect(
    page.getByRole('button', { name: 'Slett alle appdata nå' }),
  ).toBeEnabled();
});
