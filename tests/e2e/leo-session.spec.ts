import { test, expect } from '@playwright/test';
test.describe.configure({ mode: 'serial' });
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Interactive fixture tests run in the separate mock job.',
  ),
);
test('tablet diagnostics → interests → practice, hints, manipulatives, reload and finish', async ({
  page,
}) => {
  await page.goto('/leo?fixture=reset');
  await expect(page.getByRole('heading', { name: 'Hei, Leo!' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Bli kjent' }).click();
  await page.getByRole('button', { name: '😊 Glad' }).click();
  for (let i = 0; i < 10; i++) {
    await page.getByLabel('Svaret ditt', { exact: true }).fill('999');
    await page.getByRole('button', { name: 'Sjekk svaret' }).click();
    await page.getByRole('button', { name: 'Neste oppgave' }).click();
  }
  await expect(
    page.getByRole('heading', { name: 'Nå er vi klare for matteeventyret' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tilbake til kartet' }).click();
  await page.getByRole('link', { name: 'Mine interesser' }).click();
  await page
    .getByRole('button', { name: 'Dinosaurer', exact: false })
    .first()
    .click();
  await expect(page.getByRole('status')).toHaveText('Valget ditt er lagret.');
  await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
  await page.getByRole('button', { name: 'Start en matteøkt' }).click();
  await page.getByRole('button', { name: '🙂 Rolig' }).click();
  await expect(
    page.getByText('Vi øver med faste oppgaver og rolige hint i dag.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Jeg vil ha et hint' }).click();
  await expect(page.getByText('Kan du tegne eller lage grupper')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Bygg et rutenett' }),
  ).toBeVisible();
  const question = await page.locator('#task-question').innerText();
  await page.reload();
  await expect(page.locator('#task-question')).toHaveText(question);
  await page.getByRole('button', { name: 'Jeg vil forklare' }).click();
  await page
    .getByLabel('Hvordan tenkte du?')
    .fill('Jeg prøvde å telle gruppene.');
  await page.getByRole('button', { name: 'Send forklaringen' }).click();
  await page.getByRole('button', { name: 'Avslutt for i dag' }).click();
  await page.getByLabel('Hva lærte du i dag?').fill('Jeg lærte å prøve igjen.');
  await page.getByRole('button', { name: 'Lagre og avslutt' }).click();
  await expect(
    page.getByRole('heading', { name: 'Takk for i dag' }),
  ).toBeVisible();
  await expect(page.getByText('Fremgangen din er lagret.')).toBeVisible();
});
test('seeded master challenge completes on tablet without hint or answer data', async ({
  page,
}) => {
  await page.goto('/leo?fixture=master');
  await page.getByRole('button', { name: 'Start mesterutfordring' }).click();
  await page.getByRole('button', { name: '😊 Glad' }).click();
  await expect(
    page.getByRole('button', { name: 'Jeg vil ha et hint' }),
  ).toHaveCount(0);
  for (let i = 0; i < 10; i++) {
    await expect(
      page.getByRole('button', { name: 'Sjekk svaret' }),
    ).toBeVisible();
    const question = await page.locator('#task-question').innerText();
    let answer = 0;
    if (question.startsWith('Start i')) {
      const steps = question.split('steg: ')[1].split('.')[0].split(', ');
      await page
        .getByLabel('x (bortover)')
        .fill(String(steps.filter((s) => s === 'høyre').length));
      await page
        .getByLabel('y (oppover)')
        .fill(String(steps.filter((s) => s === 'opp').length));
    } else {
      const n = (question.match(/\d+/g) ?? []).map(Number);
      if (question.includes('rette vinkler'))
        answer =
          n[0] *
          (question.includes('kvadrat') || question.includes('rektangel')
            ? 4
            : 0);
      else if (
        question.includes('kanter') ||
        question.includes('hjørner') ||
        question.includes('flater') ||
        question.includes('sider')
      ) {
        const shape = question.includes('trekantet pyramide')
          ? [6, 4, 4]
          : question.includes('firkantet pyramide')
            ? [8, 5, 5]
            : question.includes('trekantet prisme')
              ? [9, 6, 5]
              : question.includes('kube') ||
                  question.includes('firkantet prisme')
                ? [12, 8, 6]
                : question.includes('åttekant')
                  ? [8, 8, 0]
                  : question.includes('sekskant')
                    ? [6, 6, 0]
                    : question.includes('trekant')
                      ? [3, 3, 0]
                      : [4, 4, 0];
        answer =
          n[0] *
          shape[
            question.includes('kanter')
              ? 0
              : question.includes('flater')
                ? 2
                : 1
          ];
      } else if (question.includes('rommer')) answer = n[0] * n[1] * n[2];
      else if (question.startsWith('Mønsteret'))
        answer = n[0] + n[1] * (n[2] - 1);
      else if (question.startsWith('Variabelen')) answer = n[0] + n[1] * n[2];
      else if (question.startsWith('x er'))
        answer = n[0] + (n[0] > n[1] ? n[2] : n[3]);
      await page
        .getByLabel('Svaret ditt', { exact: true })
        .fill(String(answer));
    }
    const response = page.waitForResponse(
      (res) =>
        res.url().endsWith('/api/leo') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Sjekk svaret' }).click();
    const data = await (await response).json();
    expect(data.task).not.toHaveProperty('answer');
    if (i < 9)
      await page.getByRole('button', { name: 'Neste oppgave' }).click();
  }
  await expect(
    page.getByRole('heading', { name: 'Du har fått del 4 av medaljongen!' }),
  ).toBeVisible();
});
