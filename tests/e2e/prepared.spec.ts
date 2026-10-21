import { test, expect } from '@playwright/test';
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Uses synthetic in-memory sessions; hosted Auth is checked separately.',
  ),
);
test('three authored missions: error, teaching, consequence, pause/reload and semantic roles', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/leo?fixture=quiet');
  await page
    .getByRole('link', { name: /Star Wars: Darth Vaders felle/ })
    .click();
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  const saved = await page.request.get('/api/prepared');
  expect(saved.ok()).toBe(true);
  const initial = await saved.json();
  expect(initial.view).not.toHaveProperty('checkedSolution');
  await page
    .getByRole('button', { name: 'Legg én på skjold 1', exact: true })
    .click();
  await expect(page.getByLabel('Brikker på skjold 1')).toHaveText('1');
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Se på brikkene som er igjen/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Gi meg et hint' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Finn de fire skjoldene som skal dele likt.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Fortsett eventyret' }).click();
  await expect(page.getByLabel('Brikker på skjold 1')).toHaveText('1');
  for (let i = 1; i <= 4; i++)
    for (let j = i === 1 ? 1 : 0; j < 6; j++) {
      await page
        .getByRole('button', { name: `Legg én på skjold ${i}`, exact: true })
        .click();
      await expect(page.getByLabel(`Brikker på skjold ${i}`)).toHaveText(
        String(j + 1),
      );
    }
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Fire skjoldbuer/ }),
  ).toBeVisible();
  await expect(page.locator('[data-solved=true] svg')).toBeVisible();
  await page.screenshot({
    path: '/tmp/leo-prepared-shields.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Neste utdrag' }).click();
  await expect(
    page.getByRole('heading', { name: 'Den riktige luken' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Skrått parallellogram Plate C' })
    .click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await page.getByRole('button', { name: 'Vis et enklere eksempel' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Trekantens tre sider/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rektangel Plate B' }).click();
  for (let i = 1; i <= 4; i++)
    await page
      .getByRole('button', { name: `Hjørne ${i}`, exact: true })
      .click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Luken åpner/ }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('[data-solved=true] g[class*=doorLeft]')
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .toContain('-125');
  await page.screenshot({
    path: '/tmp/leo-prepared-geometry.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Neste utdrag' }).click();
  await page.getByText('Vil du heller svare med egne ord?').click();
  await page
    .getByLabel('Svar læreren: Hva betyr 3 på A og på B?')
    .fill('Begge blir seks');
  await page.getByRole('button', { name: 'Send forklaringen' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /Jeg kunne ikke vurdere ordene/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Fortsett eventyret' }).click();
  const panels = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: 'Panel A', exact: true }),
    })
    .last();
  await panels
    .getByRole('button', { name: 'Antall sendere / grupper', exact: true })
    .click();
  const panelB = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: 'Panel B', exact: true }),
    })
    .last();
  await panelB
    .getByRole('button', { name: 'Brikker i hver pakke / gruppe', exact: true })
    .click();
  await page.getByRole('button', { name: /Én pakke med tre brikker/ }).click();
  await page.getByRole('button', { name: 'Sjekk det jeg viste' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Luke rekker rampen/ }),
  ).toBeVisible();
  const final = await (await page.request.get('/api/prepared')).json();
  expect(final.view.evidence).toBe('relevant');
  expect(final.view.assisted).toBe(false);
  await page.getByRole('button', { name: 'Avslutt prøven' }).click();
  await expect(
    page.getByRole('heading', { name: 'Alle er om bord!' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('reduced motion, narrow screen and parent voice-off keep usable controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/leo?fixture=quiet');
  await page.goto('/leo/stjerneoppdrag');
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  await expect(
    page.getByRole('button', { name: 'Les høyt', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Vis og forklar løsningen' }).click();
  await page.getByRole('button', { name: 'Fullfør sammen' }).click();
  await expect(
    page.getByRole('button', { name: 'Neste utdrag' }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
