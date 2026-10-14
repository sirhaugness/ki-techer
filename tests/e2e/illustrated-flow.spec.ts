import { test, expect, type Page } from '@playwright/test';
test.use({
  viewport: { width: 1280, height: 960 },
  video: { mode: 'on', size: { width: 1280, height: 960 } },
});
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Isolated fixture browser verification.',
  ),
);

async function start(page: Page, label: string) {
  await page.goto('/leo?fixture=quiet');
  await page.getByRole('link', { name: 'Mine interesser' }).click();
  await page
    .locator('.interest-presets')
    .getByRole('button', { name: label, exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.');
  await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
  await page
    .getByRole('button', { name: 'Start eventyret', exact: true })
    .click();
  await page.getByRole('button', { name: '🙂 Rolig' }).click();
  await expect(page.locator('.world-frame')).toHaveAttribute(
    'data-state',
    'waiting',
  );
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
  const answer = q.includes('like mange til')
    ? n[0] * 2
    : q.includes('halvparten')
      ? n[0] / 2
      : q.includes('blir igjen')
        ? n[0] - n[1]
        : n[0] * n[1];
  if (await page.locator('.group-tray').count()) {
    const text = await page
      .locator('.grouping-controls > p')
      .first()
      .innerText();
    const counts = text.match(/\d+/g)!.map(Number);
    const each = text.includes('Fordel') ? counts[0] / counts[1] : counts[1];
    for (
      let group = 0;
      group < (await page.locator('.group-tray').count());
      group++
    )
      for (let i = 0; i < each; i++)
        await page
          .getByRole('button', {
            name: `Legg én i gruppe ${group + 1}`,
            exact: true,
          })
          .click();
  } else if (await page.locator('.route-answer-grid').count()) {
    await page
      .locator('.route-answer-grid button')
      .filter({
        has: page.locator('strong', { hasText: new RegExp(`^${answer} `) }),
      })
      .click();
  } else
    await page.getByLabel('Svaret ditt', { exact: true }).fill(String(answer));
  const expression = page.getByLabel('b) Regnestykket ditt');
  if (await expression.count()) await expression.fill(`${n[0]}x${n[1]}`);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/leo') &&
      r.request().postDataJSON().event?.type === 'answer',
  );
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  const result = await (await response).json();
  expect(result.correct).toBe(true);
  await expect(page.locator('.world-frame')).toHaveAttribute(
    'data-state',
    'solved',
  );
  return result;
}
async function observeAnimation(page: Page, name: string) {
  // Capture a running animation, then let the browser play it and observe elapsed time.
  const first = await page.locator('.world-frame').evaluate((e, name) => {
    const a = e
      .getAnimations({ subtree: true })
      .find((a) => (a as CSSAnimation).animationName === name);
    return a ? { time: Number(a.currentTime), state: a.playState } : null;
  }, name);
  expect(first, `running ${name}`).not.toBeNull();
  expect(first?.state).toBe('running');
  await page.waitForTimeout(180);
  const next = await page.locator('.world-frame').evaluate((e, name) => {
    const a = e
      .getAnimations({ subtree: true })
      .find((a) => (a as CSSAnimation).animationName === name);
    return a ? Number(a.currentTime) : null;
  }, name);
  expect(next).toBeGreaterThan(first!.time);
}

test('complete illustrated chapters: quantities, grouping, routes, real animation playback and persisted consequences', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const label of ['Star Wars', 'Dinosaurer']) {
    const prefix = label === 'Star Wars' ? 'space' : 'dinosaur';
    await start(page, label);
    await expect(page.locator('.world-frame')).toHaveAttribute(
      'data-stage',
      label === 'Star Wars' ? 'hangar' : 'forest',
    );
    await page
      .locator('.illustrated-chapter')
      .screenshot({ path: `test-results/${prefix}-opening.png` });
    const kinds = new Set<string>();
    for (let i = 0; i < 6; i++) {
      if (i)
        await page
          .getByRole('button', { name: 'Fortsett eventyret', exact: true })
          .click();
      const result = await solve(page);
      kinds.add(result.task.interaction.kind);
      if (i === 0) {
        await observeAnimation(
          page,
          label === 'Star Wars' ? 'world-light' : 'world-load',
        );
        await page.waitForTimeout(1700);
        await page
          .locator('.illustrated-chapter')
          .screenshot({ path: `test-results/${prefix}-solved.png` });
      }
      if (i === 2) {
        await page.locator('.story-routes button').nth(1).click();
        await page.getByLabel('Forsyninger igjen').fill('999');
        await page.getByRole('button', { name: 'Velg denne veien' }).click();
        await expect(page.locator('.route-error')).toContainText(
          'Du beholder alt',
        );
        await expect(
          page.getByRole('button', { name: 'Fortsett eventyret', exact: true }),
        ).toBeDisabled();
        await page.getByLabel('Forsyninger igjen').fill('2');
        await page.getByRole('button', { name: 'Velg denne veien' }).click();
        await expect(page.locator('.world-frame')).toHaveAttribute(
          'data-asset',
          label === 'Star Wars' ? 'key' : 'companion',
        );
        await page.reload();
        await expect(page.locator('.world-frame')).toHaveAttribute(
          'data-asset',
          label === 'Star Wars' ? 'key' : 'companion',
        );
      }
      if (i === 3)
        await observeAnimation(
          page,
          label === 'Star Wars' ? 'world-gate-open' : 'world-build',
        );
      if (i === 4) {
        await expect(page.locator('.branch-consequence')).toContainText(
          label === 'Star Wars' ? 'Adgangsbrikken' : 'Følgesvennen',
        );
        await page.waitForTimeout(1500);
        await page
          .locator('.illustrated-chapter')
          .screenshot({ path: `test-results/${prefix}-later-consequence.png` });
      }
      if (i === 5 && label === 'Star Wars')
        await observeAnimation(page, 'world-launch');
    }
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    await page.reload();
    await page
      .getByRole('button', { name: 'Fortsett eventyret', exact: true })
      .click();
    await expect(page.locator('.adventure-label')).toContainText('Kapittel 2');
    await expect(page.locator('.adventure-scene')).toContainText(
      label === 'Star Wars' ? 'adgangsbrikke' : 'Dinosaurungen',
    );
    await page
      .locator('.illustrated-chapter')
      .screenshot({ path: `test-results/${prefix}-chapter-two.png` });
  }
  expect(errors).toEqual([]);
});

test('reduced motion keeps the solved gate open without animation and retains the changed scene on refresh', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, 'Star Wars');
  for (let i = 0; i < 4; i++) {
    if (i)
      await page
        .getByRole('button', { name: 'Fortsett eventyret', exact: true })
        .click();
    await solve(page);
    if (i === 2) {
      await page.locator('.story-routes button').nth(1).click();
      await page.getByLabel('Forsyninger igjen').fill('2');
      await page.getByRole('button', { name: 'Velg denne veien' }).click();
    }
  }
  await expect(page.locator('.world-gate')).toHaveCSS('animation-name', 'none');
  const transform = await page
    .locator('.world-gate')
    .evaluate((e) => getComputedStyle(e).transform);
  expect(transform).toContain('-117');
  await page.reload();
  await expect(page.locator('.world-frame')).toHaveAttribute(
    'data-state',
    'solved',
  );
  await expect(page.locator('.world-gate')).toHaveCSS('transform', transform);
  await page
    .locator('.illustrated-chapter')
    .screenshot({ path: 'test-results/reduced-motion-open-gate.png' });
});
