import { test, expect } from '@playwright/test';
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Separate fixture-only browser checks.',
  ),
);
for (const viewport of [
  { name: 'mobil', width: 390, height: 844 },
  { name: 'nettbrett', width: 768, height: 1024 },
  { name: 'PC', width: 1440, height: 1000 },
]) {
  test(`${viewport.name}: chosen adventure, preserved answer, help, wrong/correct, next and reload`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/leo?fixture=quiet');
    await page.getByRole('link', { name: 'Mine interesser' }).click();
    await page
      .getByRole('button', { name: 'Star Wars', exact: false })
      .first()
      .click();
    await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.');
    await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
    await page
      .getByRole('button', { name: 'Start eventyret', exact: true })
      .click();
    await page.getByRole('button', { name: '🙂 Rolig' }).click();
    await expect(page.locator('#task-question')).toContainText('Luke');
    await expect(page.getByRole('button', { name: /Hold for/ })).toHaveCount(0);
    const question = await page.locator('#task-question').innerText();
    const quantities = /skyter (\d+) laserskudd.*av (\d+)/.exec(question)!;
    expect(quantities).toBeTruthy();
    const a = Number(quantities[1]),
      b = Number(quantities[2]);
    await page.getByLabel('Svaret ditt', { exact: true }).fill('999');
    await page.getByLabel('b) Regnestykket ditt').fill(`${a}*${b}`);
    await page.getByRole('button', { name: 'Sjekk svaret' }).click();
    await expect(page.locator('.teacher-message')).toContainText(
      /grupper|tegne/,
    );
    await expect(page.getByLabel('Svaret ditt', { exact: true })).toHaveValue(
      '999',
    );
    const action = page.locator('.answer-action');
    const before = await action.evaluate(
      (e) => e.getBoundingClientRect().top + window.scrollY,
    );
    await page.getByRole('button', { name: 'Spør læreren' }).click();
    await expect(page.getByLabel('Svaret ditt', { exact: true })).toHaveValue(
      '999',
    );
    await page
      .getByRole('button', { name: 'Jeg forstår ikke', exact: true })
      .click();
    await expect(page.locator('.help-exchange')).toHaveCount(1);
    await page
      .getByRole('button', { name: 'Vis meg med en tegning', exact: true })
      .click();
    await expect(page.locator('.task-drawing')).toBeVisible();
    await expect(page.getByLabel('Svaret ditt', { exact: true })).toHaveValue(
      '999',
    );
    await expect(page.locator('#task-question')).toHaveText(question);
    await page.getByRole('button', { name: 'Lukk lærerhjelpen' }).click();
    const after = await action.evaluate(
      (e) => e.getBoundingClientRect().top + window.scrollY,
    );
    expect(Math.abs(after - before)).toBeLessThan(30);
    await page.getByLabel('Svaret ditt', { exact: true }).fill(String(a * b));
    const checked = page.waitForResponse(
      (r) => r.url().endsWith('/api/leo') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Sjekk svaret' }).click();
    const data = await (await checked).json();
    expect(data.correct).toBe(true);
    expect(data.hintLevel).toBeGreaterThan(0);
    expect(data.adventure.completed).toBe(1);
    await expect(page.locator('.answer-feedback')).toContainText('Riktig!');
    await expect(page.getByLabel('Svaret ditt', { exact: true })).toHaveValue(
      String(a * b),
    );
    expect(
      Math.abs(
        (await action.evaluate(
          (e) => e.getBoundingClientRect().top + window.scrollY,
        )) - after,
      ),
    ).toBeLessThan(30);
    await page
      .getByRole('button', { name: 'Fortsett eventyret', exact: true })
      .click();
    await expect(page.locator('#task-question')).not.toHaveText(question);
    await expect(page.locator('#task-question')).toContainText('Luke');
    const next = await page.locator('#task-question').innerText();
    await page.reload();
    await expect(page.locator('#task-question')).toHaveText(next);
    await expect(page.locator('.adventure-label')).toContainText('Kapittel 1');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/adventure-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
test('one selected interest and retained story after switching back', async ({
  page,
}) => {
  await page.goto('/leo?fixture=practice');
  await page.getByRole('link', { name: 'Mine interesser' }).click();
  for (const name of ['Star Wars', 'Dinosaurer', 'Star Wars']) {
    await page
      .locator('.interest-presets')
      .getByRole('button', { name })
      .click();
    await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.');
    await expect(
      page.locator('.interest-chips button[aria-pressed="true"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('.interest-chips button[aria-pressed="true"]'),
    ).toContainText(name);
  }
});
test('reduced motion suppresses the celebration animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/leo?fixture=practice');
  await page.getByRole('button', { name: 'Start en matteøkt' }).click();
  await page.getByRole('button', { name: '🙂 Rolig' }).click();
  const q = await page.locator('#task-question').innerText();
  const numbers = q.match(/\d+/g)!.map(Number);
  await page
    .getByLabel('Svaret ditt', { exact: true })
    .fill(String(numbers[0] * numbers[1]));
  await page.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(page.locator('.answer-sparkles')).toHaveCSS(
    'animation-duration',
    '1e-05s',
  );
});
