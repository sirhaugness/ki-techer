import { expect, test } from '@playwright/test';

test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Separate controlled R2 rehearsal fixture.',
  ),
);
test.use({ video: { mode: 'on', size: { width: 1024, height: 768 } } });
test.setTimeout(90000);
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(15000);
});

test('R2: error, contextual help, three consequences, pause and browser resume', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/leo/oving');
  await page.getByRole('link', { name: 'Prøv den nye spillflaten' }).click();
  await expect(page.getByRole('heading', { name: 'Tenn leia' })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText('Prøvekapittel · håndskrevet')).toBeVisible();
  const scene = page.getByTestId('chapter-scene');
  const input = page.getByRole('textbox', { name: 'Lyssteiner i alt' });
  await page.screenshot({
    path: 'test-results/r2-opening.png',
    fullPage: true,
  });
  await input.fill('11');
  await expect(scene).toHaveAttribute('data-phase', 'working');
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'retry');
  await page.getByRole('button', { name: 'Hva skjer i historien?' }).click();
  await expect(input).toHaveValue('11');
  await page.getByRole('button', { name: 'Hjelp med regningen' }).click();
  await expect(
    page.getByRole('complementary', { name: 'Mattelæreren' }),
  ).toContainText('én lykt først');
  await expect(input).toHaveValue('11');
  await page.reload();
  await expect(input).toHaveValue('11');
  await expect(page.getByRole('complementary')).toContainText('én lykt først');
  await page.screenshot({ path: 'test-results/r2-help.png', fullPage: true });
  await input.fill('12');
  await page.getByRole('button', { name: 'Hjelp med regningen' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'working');
  await page.reload();
  await expect(scene).toHaveAttribute('data-phase', 'working');
  await expect(page.getByTestId('post-boat').getByTestId('mira')).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  await expect(scene.locator('svg[role="img"]')).toHaveAttribute(
    'aria-label',
    'Lyktene lyser. Postbåten ligger nå ved brygga.',
  );
  // Observe actual boat motion, not just an end-state screenshot.
  const boat = page.getByTestId('post-boat');
  const firstTransform = await boat.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await expect
    .poll(() => boat.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(firstTransform);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'test-results/r2-lights-solved.png',
    fullPage: true,
  });
  await page.reload();
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  await page.getByRole('button', { name: 'Fortsett historien' }).click();
  await expect(
    page.getByRole('heading', { name: 'Gjør landgangen klar' }),
  ).toBeFocused();
  await page.getByRole('textbox', { name: 'Nye planker' }).fill('6');
  await page.getByRole('link', { name: 'Pause og hjem' }).click();
  await page.goto('/leo/oving');
  await page.getByRole('link', { name: 'Prøv den nye spillflaten' }).click();
  await expect(page.getByRole('textbox', { name: 'Nye planker' })).toHaveValue(
    '6',
  );
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene.locator('svg[role="img"]')).toHaveAttribute(
    'aria-label',
    'Landgangen er hel. Mira står på land med postsekken.',
  );
  await expect(boat.getByTestId('mira')).toHaveCount(0);
  await page.screenshot({
    path: 'test-results/r2-gangway-solved.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Fortsett historien' }).click();
  await expect(
    page.getByRole('heading', { name: 'Invitasjoner til alle' }),
  ).toBeVisible();
  for (let i = 1; i <= 3; i++)
    for (let j = 0; j < (i === 1 ? 5 : i === 2 ? 3 : 4); j++)
      await page.getByRole('button', { name: `Gi til postkasse ${i}` }).click();
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'retry');
  await page.getByRole('button', { name: 'Ta fra postkasse 1' }).click();
  await page.getByRole('button', { name: 'Gi til postkasse 2' }).click();
  await page.reload();
  await expect(page.getByLabel('4 invitasjoner i postkasse 2')).toBeVisible();
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  await expect(boat.getByTestId('mira')).toHaveCount(1);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: 'test-results/r2-letters-solved.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Se avslutningen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Invitasjonene er framme!' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Invitasjonene er framme!' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('R2: reduced motion, keyboard, tablet layout, unreadable save and storage denial', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/leo/provekapittel');
  const input = page.getByRole('textbox', { name: 'Lyssteiner i alt' });
  await expect(input).toBeVisible();
  await input.focus();
  await page.keyboard.type('12');
  await page.keyboard.press('Enter');
  const scene = page.getByTestId('chapter-scene');
  await expect(scene).toHaveAttribute('data-phase', 'solved');
  expect(
    await scene.evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await expect(scene).toContainText('Lyktene lyser.');
  await page.screenshot({
    path: 'test-results/r2-reduced-tablet.png',
    fullPage: true,
  });
  for (const size of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const el of await page
      .getByTestId('chapter-player')
      .getByRole('button')
      .all()) {
      const box = await el.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.width).toBeGreaterThanOrEqual(48);
    }
  }
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith('leo-r2-v1:'),
    )!;
    localStorage.setItem(key, '{"version":999}');
  });
  await page.reload();
  await expect(
    page.getByTestId('chapter-player').getByRole('alert'),
  ).toContainText('kunne ikke åpnes');
  await page.getByRole('button', { name: 'Start prøven på nytt' }).click();
  await expect(input).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Blocked');
    };
  });
  await input.fill('3');
  await expect(page.getByText('Kan ikke lagre her.')).toBeVisible();
});
