import { test, expect, type Page } from '@playwright/test';
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Synthetic fixture; Auth/storage are checked separately.',
  ),
);
test.use({ video: 'on' });
test('Home waits for an in-flight pause and saves once before navigating', async ({
  page,
}) => {
  await page.goto('/leo?fixture=quiet');
  await page.goto('/leo/stjerneoppdrag');
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  let release!: () => void,
    notify!: () => void,
    pauses = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const received = new Promise<void>((resolve) => {
    notify = resolve;
  });
  await page.route('**/api/star-wars', async (route) => {
    const request = route.request();
    if (
      request.method() === 'POST' &&
      request.postDataJSON().event?.type === 'pause'
    ) {
      pauses++;
      const response = await route.fetch();
      notify();
      await held;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  await received;
  await page.getByRole('link', { name: '← Hjem', exact: true }).click();
  release();
  await expect(page).toHaveURL(/\/leo$/);
  await expect(page.getByRole('heading', { name: 'Hei, Leo!' })).toBeVisible();
  const saved = await (await page.request.get('/api/star-wars')).json();
  expect(saved.view.running).toBe(false);
  expect(saved.view.work.groups).toEqual([1, 0, 0, 0]);
  expect(pauses).toBe(1);
});
test('responsive draft saves survive a lost response and a later edit without overwriting either', async ({
  page,
}) => {
  await page.goto('/leo?fixture=quiet');
  await page.goto('/leo/stjerneoppdrag');
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  let dropped = false;
  await page.route('**/api/star-wars', async (route) => {
    const request = route.request();
    if (
      request.method() === 'POST' &&
      request.postDataJSON().event?.type === 'work' &&
      !dropped
    ) {
      dropped = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('button', { name: 'Prøv lagring igjen' }),
  ).toBeVisible();
  await expect(page.getByLabel('Energiceller i skjoldfelt 1')).toHaveText('1');
  await page.getByRole('button', { name: 'Prøv lagring igjen' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Det du har skrevet her' }),
  ).toHaveCount(0);
  const saved = await (await page.request.get('/api/star-wars')).json();
  expect(saved.view.revision).toBe(1);
  await page.unroute('**/api/star-wars');
  let sent!: () => void;
  const firstSave = new Promise<void>((resolve) => {
    sent = resolve;
  });
  let held = false;
  await page.route('**/api/star-wars', async (route) => {
    const request = route.request();
    if (
      request.method() === 'POST' &&
      request.postDataJSON().event?.type === 'work' &&
      !held
    ) {
      held = true;
      const response = await route.fetch();
      sent();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  await firstSave;
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Arbeidet er lagret' }),
  ).toBeVisible();
  await expect(page.getByLabel('Energiceller i skjoldfelt 1')).toHaveText('3');
  await page.reload();
  await expect(page.getByLabel('Energiceller i skjoldfelt 1')).toHaveText('3');
});
test('Kraften speech reads the current story and a new hint once, including after pause', async ({
  page,
}) => {
  await page.goto('/leo?fixture=reset');
  await page.goto('/leo/stjerneoppdrag');
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  const requests: { source: string; revision: number }[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/api/voice/tts')) requests.push(r.postDataJSON());
  });
  await page.getByRole('button', { name: 'Auto-opplesing: av' }).click();
  await expect(page.getByText('Leser høyt.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].source).toBe('star-wars');
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Arbeidet er lagret' }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  const voice = page.waitForResponse((r) => r.url().endsWith('/api/voice/tts'));
  await page.getByRole('button', { name: 'Gi meg et hint' }).click();
  expect((await voice).status()).toBe(200);
  expect(requests).toHaveLength(2);
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  const saved = await (await page.request.get('/api/star-wars')).json();
  const audio = await page.request.post('/api/voice/tts', {
    headers: { origin: 'http://127.0.0.1:3000' },
    data: {
      sessionId: saved.view.sessionId,
      revision: saved.view.revision,
      source: 'star-wars',
    },
  });
  expect(audio.status()).toBe(200);
});
async function next(page: Page) {
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(page.getByTestId('lightsaber')).toBeVisible();
  await page.getByRole('button', { name: 'Bli her litt' }).click();
  await page
    .getByRole('button', { name: 'Neste oppdrag', exact: false })
    .click();
}
async function numbers(page: Page, values: number[]) {
  const fields = page.locator('[data-mission] input');
  await expect(fields).toHaveCount(values.length);
  for (let i = 0; i < values.length; i++)
    await fields.nth(i).fill(String(values[i]));
}
async function shape(page: Page) {
  await page
    .getByRole('button', { name: 'Velg nøkkel B', exact: true })
    .click();
  for (let i = 1; i <= 4; i++)
    await page
      .getByRole('button', { name: `Hjørne ${i}`, exact: true })
      .click();
}
test('twenty missions: map, force dialogue, animated automatic progression and saved ending', async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/leo?fixture=quiet');
  await page.getByRole('link', { name: 'Spill Star Wars' }).click();
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  await expect(
    page.getByRole('heading', { name: 'Kraften', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Et eventyr der du tenker/)).toHaveCount(0);
  await expect(page.locator('[data-mission] input')).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Du har 23 celler igjen' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Snakk med Kraften' }).click();
  await page.getByLabel('Hva lurer du på?').fill('Hva betyr like mange?');
  await page.getByRole('button', { name: 'Send til Kraften' }).click();
  await expect(
    page.getByText('Kraften bruker et lagret hint akkurat nå.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Fortsett eventyret' }).click();
  await expect(page.getByLabel('Energiceller i skjoldfelt 1')).toHaveText('1');
  for (let i = 1; i <= 4; i++)
    for (let j = i === 1 ? 1 : 0; j < 6; j++)
      await page
        .getByRole('button', {
          name: `Legg én energicelle i skjoldfelt ${i}`,
          exact: true,
        })
        .click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(page.getByTestId('lightsaber')).toBeVisible();
  const blade = page.getByTestId('lightsaber').locator('[class*=blade]');
  await expect
    .poll(() => blade.evaluate((el) => getComputedStyle(el).transform))
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
  await expect(
    page.getByRole('heading', { name: 'Rydd vei med laserne' }),
  ).toBeVisible({ timeout: 12000 });
  await numbers(page, [4]);
  await next(page);
  await numbers(page, [24, 18]);
  await next(page);
  await expect(
    page.getByRole('img', { name: /Navigasjonskart: 2, 5, 8, 11/ }),
  ).toBeVisible();
  await expect(page.locator('[data-mission] input')).toHaveCount(0);
  await page.getByRole('button', { name: /Rute 2:/ }).click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(page.getByTestId('lightsaber')).toHaveCount(0);
  await page.getByRole('button', { name: /Rute 1:/ }).click();
  await next(page);
  for (const [i, direction] of ['right', 'right', 'up'].entries())
    await page.getByLabel(`Steg ${i + 1}`).selectOption(direction);
  await expect(page.getByText(/Hver rute er 1 m²/)).toHaveCount(0);
  await next(page);
  await shape(page);
  await next(page);
  await numbers(page, [12]);
  await next(page);
  await page.getByRole('button', { name: 'Rød', exact: true }).click();
  await next(page);
  await numbers(page, [56]);
  await next(page);
  await expect(page.getByText(/Løp, Leo! Jeg holder ham her/)).toBeVisible();
  await numbers(page, [4]);
  await next(page);
  await numbers(page, [62]);
  await next(page);
  await numbers(page, [12]);
  await next(page);
  await expect(
    page.getByText(/De planlegger et angrep mot opprørsbasen/),
  ).toBeVisible();
  await numbers(page, [28]);
  await next(page);
  await page
    .getByRole('button', { name: 'Blå → grønn → rød', exact: true })
    .click();
  await next(page);
  await numbers(page, [42]);
  await next(page);
  await numbers(page, [61, 3]);
  await page
    .getByRole('button', { name: 'Ja, det er nok', exact: true })
    .click();
  await next(page);
  await shape(page);
  await next(page);
  await numbers(page, [24, 28]);
  await next(page);
  await numbers(page, [6]);
  await page
    .getByRole('button', { name: 'Ja, det er nok', exact: true })
    .click();
  await next(page);
  await expect(page.getByText(/Takk for at du reddet meg, Leo/)).toBeVisible();
  await page.getByRole('button', { name: 'Ja!', exact: true }).click();
  await page.getByRole('button', { name: 'Svar Luke', exact: false }).click();
  await expect(page.getByText(/kule faren din/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Galaksen venter, Leo!' }),
  ).toBeVisible();
  const final = await (await page.request.get('/api/star-wars')).json();
  expect(final.view).toMatchObject({
    index: 20,
    finished: true,
    ending: 'yes',
  });
  expect(errors).toEqual([]);
});
test('one home entry on narrow screens, reduced motion and pause during celebration', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/leo?fixture=quiet');
    await expect(
      page.getByRole('link', { name: 'Spill Star Wars' }),
    ).toBeVisible();
    const button = await page
      .getByRole('link', { name: 'Spill Star Wars' })
      .boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole('link', {
        name: /interesser|nytt kapittel|spillflaten|Velg ditt eventyr/i,
      }),
    ).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Spill Star Wars' }).click();
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  await expect(
    page.getByRole('button', { name: 'Les høyt', exact: true }),
  ).toHaveCount(0);
  await page.getByText('Mer hjelp', { exact: true }).click();
  await page.getByRole('button', { name: 'Vis og forklar løsningen' }).click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(page.getByTestId('lightsaber')).toBeVisible();
  expect(
    await page
      .getByTestId('lightsaber')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.getByRole('button', { name: 'Bli her litt' }).click();
  await page.waitForTimeout(8500);
  await expect(page.locator('[data-mission]')).toHaveAttribute(
    'data-mission',
    'SW01',
  );
  await page.screenshot({ path: '/tmp/leo-force-narrow.png', fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Fortsett eventyret' }).click();
  await page.getByRole('button', { name: 'Bli her litt' }).click();
  await page
    .getByRole('button', { name: 'Neste oppdrag', exact: false })
    .click();
  await expect(page.locator('[data-mission]')).toHaveAttribute(
    'data-mission',
    'SW02',
  );
});

test('Kraften reserve conversation: error, hint, why, another explanation and paused solution', async ({
  page,
}) => {
  await page.goto('/leo?fixture=quiet');
  await page.goto('/leo/stjerneoppdrag');
  await page.getByRole('button', { name: 'Start eventyret' }).click();
  await page
    .getByRole('button', {
      name: 'Legg én energicelle i skjoldfelt 1',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  const reply = page
    .getByRole('status')
    .filter({ hasText: /Du har 23 celler igjen/ });
  await expect(reply).toBeVisible();
  await page.getByRole('button', { name: 'Gi meg et hint' }).click();
  await page.getByRole('button', { name: 'Snakk med Kraften' }).click();
  await page.getByLabel('Hva lurer du på?').fill('Hvorfor må de få like mye?');
  await page.getByRole('button', { name: 'Send til Kraften' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Lik fordeling betyr' }),
  ).toBeVisible();
  await page.getByLabel('Hva lurer du på?').fill('Jeg skjønner fortsatt ikke');
  await page.getByRole('button', { name: 'Send til Kraften' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'På øvepanelet' }),
  ).toBeVisible();
  await expect(
    page.getByText('Kraften bruker et lagret hint akkurat nå.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause og lagre' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Fortsett eventyret' }).click();
  await expect(page.getByLabel('Energiceller i skjoldfelt 1')).toHaveText('1');
  await page.getByRole('button', { name: 'Snakk med Kraften' }).click();
  await page.getByLabel('Hva lurer du på?').fill('Forklar på en annen måte');
  await page.getByRole('button', { name: 'Send til Kraften' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Legg én celle i hvert felt.' }),
  ).toBeVisible();
  await page.getByText('Mer hjelp', { exact: true }).click();
  await page.getByRole('button', { name: 'Vis og forklar løsningen' }).click();
  const before = await (await page.request.get('/api/star-wars')).json();
  expect(before.view).toMatchObject({
    index: 0,
    status: 'working',
    assisted: true,
    work: { groups: [6, 6, 6, 6] },
  });
  await page.getByRole('button', { name: 'Sjekk svaret', exact: true }).click();
  await expect(page.getByTestId('lightsaber')).toBeVisible();
  await page.getByRole('button', { name: 'Bli her litt' }).click();
  const after = await (await page.request.get('/api/star-wars')).json();
  expect(after.view).toMatchObject({
    index: 0,
    status: 'correct',
    assisted: true,
  });
});
