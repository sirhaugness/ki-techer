import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { ChapterView } from '../../lib/chapters/production-contracts';
test.use({ video: { mode: 'on', size: { width: 1024, height: 768 } } });
test.skip(
  process.env.E2E_LOCAL_SUPABASE === '1',
  'Separate controlled UI fixture; real Auth is checked independently.',
);
test('R3 controlled UI: interest, whole preparation, help, three missions and persisted responses', async ({
  page,
}) => {
  test.setTimeout(90000);
  execFileSync(process.execPath, [
    '--conditions',
    'react-server',
    '--import',
    'tsx',
    'scripts/r3-browser-fixture.ts',
    '/tmp/r3-browser-fixture.json',
  ]);
  const fixture = JSON.parse(
    readFileSync('/tmp/r3-browser-fixture.json', 'utf8'),
  ) as {
    ready: ChapterView;
    queued: ChapterView;
    steps: { command: string; turn?: unknown; view: ChapterView }[];
  };
  let current: ChapterView | null = null,
    polls = 0,
    prepared = false;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/chapters*', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      if (prepared && current?.state === 'running' && ++polls >= 2)
        current = fixture.ready;
      await route.fulfill({
        json: { view: current, suggestedInterest: 'Dyr' },
      });
      return;
    }
    const body = req.postDataJSON();
    if (body.command === 'prepare') {
      prepared = true;
      current = fixture.queued;
      await route.fulfill({ json: { view: current } });
      return;
    }
    const next = fixture.steps.shift()!;
    expect(body.command).toBe(next.command);
    if (next.turn) expect(body.turn).toEqual(next.turn);
    current = next.view;
    await route.fulfill({ json: { view: current } });
  });
  await page.goto('/leo/kapittel');
  await page.getByLabel('Din interesse').fill('Dyr');
  await page.getByRole('button', { name: 'Gjør kapittelet klart' }).click();
  await expect(
    page.getByRole('heading', { name: 'Eventyret tar form' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Start eller fortsett kapittelet' }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole('button', { name: 'Start eller fortsett kapittelet' })
    .click();
  await expect(
    page.getByText('Hver lykt må få lyssteiner før postbåten kan finne leia.', {
      exact: true,
    }),
  ).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Svaret ditt' }),
    scene = page.getByTestId('prepared-scene');
  async function viewportEvidence(name: string) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const check = await page
      .getByRole('button', { name: 'Sjekk svaret' })
      .boundingBox();
    expect(check).not.toBeNull();
    expect(check!.y + check!.height).toBeLessThanOrEqual(768);
    await expect(
      page.getByRole('button', { name: 'Hjelp med regningen' }),
    ).toBeInViewport();
    await page.screenshot({ path: `test-results/r3-${name}-viewport.png` });
  }
  await viewportEvidence('grouping');
  await input.fill('11');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'retry');
  await page.getByRole('button', { name: 'Hva skjer i historien?' }).click();
  await page.getByRole('button', { name: 'Hjelp med regningen' }).click();
  await expect(page.getByRole('complementary')).toContainText(
    'Se på én gruppe først',
  );
  await page.reload();
  await expect(input).toHaveValue('11');
  await input.fill('12');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  await scene.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  await page.screenshot({
    path: 'test-results/r3-grouping.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Fortsett historien' }).click();
  await expect(
    page.getByRole('heading', { name: 'Gjør landgangen klar' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause og hjem' }).click();
  await page.goto('/leo/kapittel');
  await page
    .getByRole('button', { name: 'Start eller fortsett kapittelet' })
    .click();
  await viewportEvidence('quantity');
  await input.fill('6');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  await scene.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  await page.screenshot({
    path: 'test-results/r3-quantity.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Fortsett historien' }).click();
  await viewportEvidence('distribution');
  for (let i = 1; i <= 3; i++)
    for (let n = 0; n < 4; n++)
      await page
        .getByRole('button', { name: `Gi til gruppe ${i}`, exact: true })
        .click();
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  await scene.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  await expect(scene.getByText('4 levert', { exact: true })).toHaveCount(3);
  await page.screenshot({
    path: 'test-results/r3-distribution.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Fortsett historien' }).click();
  await expect(
    page.getByRole('heading', { name: 'Dette fikk du til!' }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/r3-ending.png' });
  // Recording evidence: allow the last painted ending to reach the video encoder.
  await page.waitForTimeout(350);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Dette fikk du til!' }),
  ).toBeVisible();
  expect(fixture.steps).toHaveLength(0);
  expect(errors).toEqual([]);
});
