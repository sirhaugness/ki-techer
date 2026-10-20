import { test, expect, type Page } from '@playwright/test';
import { planMath } from '../../lib/free-story/planner';
import type { Answer } from '../../lib/engine/skills/generators';

test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Uses handwritten chapter fixtures without external services.',
  ),
);
async function answer(page: Page, value: Answer) {
  if (typeof value === 'string')
    await page.getByRole('button', { name: value, exact: true }).click();
  else if (typeof value === 'number')
    await page.getByLabel('Svaret ditt', { exact: true }).fill(String(value));
  else if (Array.isArray(value))
    await page
      .getByLabel('Svaret ditt', { exact: true })
      .fill(value.join(', '));
  else if ('quotient' in value) {
    await page
      .getByLabel('Hele grupper', { exact: true })
      .fill(String(value.quotient));
    await page
      .getByLabel('Rest', { exact: true })
      .fill(String(value.remainder));
  } else if ('x' in value) {
    await page
      .getByLabel('x (bortover)', { exact: true })
      .fill(String(value.x));
    await page.getByLabel('y (oppover)', { exact: true }).fill(String(value.y));
  }
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
}
test('whole stored chapter: wrong/help/right, pause/reload, one next identity at 70 percent and ending', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const slots = planMath(null, new Date().toISOString(), 741);
  const nextIds = new Set<string>();
  page.on('response', async (response) => {
    if (response.url().includes('/api/free-chapters') && response.ok()) {
      const data = await response.json().catch(() => null);
      if (!data) return;
      const { view } = data;
      if (view?.task) {
        expect(view.task).not.toHaveProperty('answer');
        expect(view.task).not.toHaveProperty('expression');
        expect(view.task).not.toHaveProperty('params');
        if (!view.task.showVisual) expect(view.task.visual.count).toBe(0);
      }
      if (view?.nextChapterId) nextIds.add(view.nextChapterId);
    }
  });
  await page.goto('/leo?fixture=practice');
  await page.getByRole('link', { name: /Utforsk et nytt kapittel/ }).click();
  await page
    .getByRole('button', { name: 'Verdensrommet', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Lag mitt eventyr', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Signaler fra den glemte stasjonen' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Start eller fortsett eventyret' })
    .click();
  const initialQuestion = await page.locator('h2[tabindex]').innerText();
  await answer(page, 999999);
  await expect(
    page
      .locator('[role=status]')
      .filter({ hasText: /Undersøk regningen|Ved stopp/ })
      .first(),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Hjelp med regningen', exact: true })
    .click();
  await expect(
    page.locator('#free-story-teacher [role=status]'),
  ).not.toHaveText('');
  await page
    .getByRole('button', { name: 'Pause og hjem', exact: true })
    .click();
  await expect(page).toHaveURL(/\/leo$/);
  await page.getByRole('link', { name: /Utforsk et nytt kapittel/ }).click();
  await page
    .getByRole('button', { name: 'Start eller fortsett eventyret' })
    .click();
  await expect(page.locator('h2[tabindex]')).toHaveText(initialQuestion);
  await page.reload();
  await expect(page.locator('h2[tabindex]')).toHaveText(initialQuestion);
  for (let i = 0; i < slots.length; i++) {
    await expect(
      page.getByText(`Oppdrag ${i + 1} av 20`, { exact: true }),
    ).toBeVisible();
    await answer(page, slots[i].item.answer);
    await expect(
      page.getByRole('button', { name: 'Fortsett eventyret', exact: true }),
    ).toBeVisible();
    if (i === 0) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: 'test-results/free-chapters/free-story-tablet.png',
        fullPage: true,
      });
    }
    await page
      .getByRole('button', { name: 'Fortsett eventyret', exact: true })
      .click();
    if (i === 13) await expect.poll(() => nextIds.size).toBe(1);
  }
  await expect(
    page.getByRole('heading', { name: 'Et kapittel er fullført', exact: true }),
  ).toBeVisible();
  expect(nextIds.size).toBe(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/free-chapters/free-story-ending.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Fortsett til neste kapittel', exact: true })
    .click();
  await expect(
    page.getByText('Oppdrag 1 av 20', { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Sjekk svaret', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
