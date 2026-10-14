import { test, expect, type Page } from '@playwright/test';
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Uses the isolated learner fixture.',
  ),
);
async function begin(page: Page) {
  await page.goto('/leo?fixture=quiet');
  await page.getByRole('link', { name: 'Mine interesser' }).click();
  await page
    .locator('.interest-presets')
    .getByRole('button', { name: 'Star Wars' })
    .click();
  await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.', {
    timeout: 15000,
  });
  await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
  await page
    .getByRole('button', { name: 'Start eventyret', exact: true })
    .click();
  await page.getByRole('button', { name: '🙂 Rolig' }).click();
  await expect(page.locator('#task-question')).toBeVisible();
}
async function solve(page: Page) {
  await expect(
    page.getByRole('button', { name: 'Sjekk svaret' }),
  ).toBeVisible();
  const q = (await page.locator('#task-question').innerText()).replaceAll(
    'BB-8',
    'BB',
  );
  const n = q.match(/\d+/g)!.map(Number);
  const result = q.includes('like mange til')
    ? n[0] * 2
    : q.includes('halvparten')
      ? n[0] / 2
      : q.includes('blir igjen')
        ? n[0] - n[1]
        : n[0] * n[1];
  await page.getByLabel('Svaret ditt', { exact: true }).fill(String(result));
  const expression = page.getByLabel('b) Regnestykket ditt');
  if (await expression.count()) await expression.fill(`${n[0]}x${n[1]}`);
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(page.locator('.answer-feedback')).toContainText('Riktig!');
}
test('six missions → resource choice → continuing chapter → pause, switch and restore', async ({
  page,
}) => {
  test.setTimeout(90000);
  await begin(page);
  await expect(page.locator('.chapter-image')).toBeVisible();
  expect(
    await page
      .locator('img.chapter-image')
      .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
  ).toBe(true);
  const opening = await page.locator('.adventure-scene').innerText();
  for (let i = 0; i < 6; i++) {
    if (i)
      await page
        .getByRole('button', { name: 'Fortsett eventyret', exact: true })
        .click();
    await solve(page);
    if (i === 2) {
      await expect(page.locator('.story-choice')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Fortsett eventyret', exact: true }),
      ).toBeDisabled();
      await page
        .locator('.story-choice')
        .getByRole('button', { name: /BB-8/ })
        .click();
      await expect(page.locator('.story-outcome')).toContainText(
        'adgangsbrikke',
      );
    }
  }
  await page.reload();
  await page
    .getByRole('button', { name: 'Fortsett eventyret', exact: true })
    .click();
  await expect(page.locator('.adventure-label')).toContainText('Kapittel 2');
  await expect(page.locator('.teacher-message')).toContainText('adgangsbrikke');
  await expect(page.locator('.adventure-scene')).not.toHaveText(opening);
  const question = await page.locator('#task-question').innerText();
  await page.getByRole('button', { name: 'Jeg vil ha et hint' }).click();
  await page.getByLabel('Svaret ditt', { exact: true }).fill('999');
  await page.getByLabel('b) Regnestykket ditt').fill('2X3');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(page.locator('.answer-feedback')).toContainText('Prøv igjen');
  await page.getByRole('link', { name: 'Mine interesser' }).click();
  await page
    .locator('.interest-presets')
    .getByRole('button', { name: 'Dinosaurer' })
    .click();
  await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.');
  await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
  await page
    .getByRole('button', { name: 'Fortsett eventyret om Dinosaurer' })
    .click();
  await expect(page.locator('#task-question')).toContainText('Dina');
  await expect(page.locator('.chapter-goal')).toContainText('dinosaurredet');
  await page.getByRole('link', { name: 'Mine interesser' }).click();
  await page
    .locator('.interest-presets')
    .getByRole('button', { name: 'Star Wars' })
    .click();
  await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.');
  await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
  await page
    .getByRole('button', { name: 'Fortsett eventyret om Star Wars' })
    .click();
  await expect(page.locator('#task-question')).toHaveText(question);
  await expect(page.getByLabel('Svaret ditt', { exact: true })).toHaveValue(
    '999',
  );
  await expect(page.getByLabel('b) Regnestykket ditt')).toHaveValue('2X3');
  await page.reload();
  await expect(page.getByLabel('Svaret ditt', { exact: true })).toHaveValue(
    '999',
  );
  await expect(page.locator('.adventure-label')).toContainText('Kapittel 2');
  await page.screenshot({
    path: 'test-results/chapter-continuation.png',
    fullPage: true,
  });
});
test('teacher composer stays visible while dialog scrolls; image failures leave a playable scene', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.route('**/adventure/*.jpg', (route) => route.abort());
  await begin(page);
  await expect(page.locator('.scene-fallback')).toBeVisible();
  await page.getByRole('button', { name: 'Spør læreren' }).click();
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole('button', { name: 'Jeg forstår ikke', exact: true })
      .click();
    await expect(page.locator('.help-exchange')).toHaveCount(i + 1);
  }
  const input = page.getByLabel('Spørsmål til læreren');
  const before = await input.boundingBox();
  await page.locator('.teacher-dialog').evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  const after = await input.boundingBox();
  expect(after?.y).toBe(before?.y);
  await expect(input).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send spørsmålet' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/teacher-composer.png',
    fullPage: true,
  });
});
test('immediate answer feedback, model waiting status, next mission and stale model reply isolation', async ({
  page,
}) => {
  await begin(page);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/leo', async (route) => {
    if (route.request().postDataJSON().command === 'feedback') {
      await pending;
      await route.fulfill({
        json: {
          itemId: 'old',
          speech: 'Dette er et sent svar fra forrige oppgave.',
          fallback: false,
        },
      });
    } else await route.continue();
  });
  await solve(page);
  await expect(page.locator('.teacher-message')).toContainText(
    'Lumi ser på regnestykket ditt',
  );
  const old = await page.locator('#task-question').innerText();
  await page
    .getByRole('button', { name: 'Fortsett eventyret', exact: true })
    .click();
  await expect(page.locator('#task-question')).not.toHaveText(old);
  release();
  await expect(page.locator('.teacher-message')).not.toContainText('sent svar');
});
