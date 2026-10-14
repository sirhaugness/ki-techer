import { expect, test, type Page } from '@playwright/test';
import type { LearningView } from '../../lib/learning/types';

test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Deterministic scene fixture.',
  ),
);
test.use({
  viewport: { width: 1280, height: 960 },
  video: { mode: 'on', size: { width: 1280, height: 960 } },
});
async function action(
  page: Page,
  click: () => Promise<void>,
): Promise<LearningView> {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/leo') &&
      r.request().postDataJSON()?.command === 'turn',
  );
  await click();
  return (await response).json();
}
async function start(page: Page, label: string) {
  await page.goto('/leo?fixture=story');
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
  return action(page, () =>
    page.getByRole('button', { name: '🙂 Rolig' }).click(),
  );
}
async function solve(page: Page, view: LearningView) {
  const task = view.task!,
    m = task.interaction!.math;
  const answer =
    m.kind === 'missing'
      ? m.total - m.known
      : m.kind === 'double'
        ? m.mode === 'doble'
          ? m.total
          : m.each
        : m.kind === 'share'
          ? m.each
          : m.total;
  if (task.interaction!.kind === 'grouping') {
    for (let i = 0; i < m.groups; i++)
      await page
        .getByLabel(`Antall i ${task.scene!.container} ${i + 1}`, {
          exact: true,
        })
        .fill(String(m.each));
  } else if (task.scene!.action === 'route')
    await page
      .locator('.story-answer-options button')
      .filter({ hasText: String(answer) })
      .first()
      .click();
  else
    await page.getByLabel('Svaret ditt', { exact: true }).fill(String(answer));
  if (task.expressionRequired)
    await page
      .getByLabel('Regnestykket ditt', { exact: true })
      .fill(`${m.groups}x${m.each}`);
  return action(page, () =>
    page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click(),
  );
}

test('two universes: live scene manipulation, error support, animations, choice payoff, reload and continuing saga', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const label of ['Star Wars', 'Dinosaurer']) {
    let view = await start(page, label);
    const prefix = label === 'Star Wars' ? 'story-space' : 'story-dinosaur';
    await expect(page.locator('.story-world')).toHaveAttribute(
      'data-state',
      'waiting',
    );
    await page
      .locator('.story-player')
      .screenshot({ path: `test-results/${prefix}-opening.png` });
    for (let i = 0; i < 6; i++) {
      if (i === 0 && label === 'Star Wars') {
        await page.getByLabel('Svaret ditt', { exact: true }).fill('999');
        await page.getByLabel('Regnestykket ditt', { exact: true }).fill('2x3');
        view = await action(page, () =>
          page
            .getByRole('button', { name: 'Sjekk svaret', exact: true })
            .click(),
        );
        await expect(page.locator('.story-world')).toHaveAttribute(
          'data-state',
          'retry',
        );
        await expect(page.locator('.story-world-retry')).toContainText(
          'prøver',
        );
        await page
          .locator('.story-player')
          .screenshot({ path: 'test-results/story-space-retry.png' });
      }
      view = await solve(page, view);
      expect(view.correct).toBe(true);
      await expect(page.locator('.story-world')).toHaveAttribute(
        'data-state',
        'solved',
      );
      if (i === 0) {
        const animation = await page.locator('.story-world').evaluate((world) =>
          world.getAnimations({ subtree: true }).map((a) => ({
            name: (a as CSSAnimation).animationName,
            duration: a.effect?.getTiming().duration,
          })),
        );
        expect(animation.length).toBeGreaterThan(0);
        await page
          .locator('.story-player')
          .screenshot({ path: `test-results/${prefix}-solved.png` });
      }
      if (view.adventure?.choice) {
        const choice = view.adventure.choice;
        await page.locator('.story-routes button').first().click();
        await page
          .getByLabel('Forsyninger igjen')
          .fill(String(choice.budget - choice.options[0].cost));
        view = await action(page, () =>
          page.getByRole('button', { name: 'Velg denne veien' }).click(),
        );
        await page.reload();
        await expect(page.locator('.story-world')).toHaveAttribute(
          'data-state',
          'solved',
        );
      }
      if (i === 4) {
        await expect(page.locator('.story-branch')).toContainText(
          label === 'Star Wars' ? 'adgangsbrikke' : 'fossil',
        );
        await page
          .locator('.story-player')
          .screenshot({ path: `test-results/${prefix}-payoff.png` });
      }
      view = await action(page, () =>
        page.getByRole('button', { name: 'Fortsett eventyret →' }).click(),
      );
    }
    expect(view.adventure?.number).toBe(2);
    expect(view.adventure?.journey?.chapters).toHaveLength(2);
    expect(view.adventure?.journey?.chapters[0].events).toHaveLength(6);
    await expect(page.locator('.story-recap')).toContainText(
      label === 'Star Wars' ? 'signal' : 'spor',
    );
    await page
      .locator('.story-player')
      .screenshot({ path: `test-results/${prefix}-continuation.png` });
    await page.setViewportSize({ width: 768, height: 1024 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('.story-player')
      .screenshot({ path: `test-results/${prefix}-tablet.png` });
    await page.setViewportSize({ width: 1280, height: 960 });
  }
  expect(errors).toEqual([]);
});

test('reduced motion retains the world change and keyboard input updates the scene', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await start(page, 'Star Wars');
  await page.getByLabel('Svaret ditt', { exact: true }).fill('3');
  await expect(page.locator('.story-world')).toHaveAttribute(
    'data-state',
    'working',
  );
  await expect(page.locator('.story-world-counter')).toContainText('3');
  await solve(page, initial);
  expect(
    await page
      .locator('.story-world')
      .evaluate((world) => world.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await expect(page.locator('.story-world-success')).toContainText('reparert');
});
