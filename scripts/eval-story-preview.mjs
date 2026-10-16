// Explicit live evaluation, never run by CI. Uses a separate dev-only test profile.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { fetch as trustedFetch, EnvHttpProxyAgent } from 'undici';
import { X509Certificate, createHash } from 'node:crypto';
import { solidFor, solidEdges } from '../lib/engine/solids.ts';
import { assertPreviewTestBudget } from './lib/live-eval-budget.mjs';
const [
  publicFile,
  sessionFile,
  profileFile,
  bypassFile,
  output = '/workspace/story-verification/live',
] = process.argv.slice(2);
if (!publicFile || !sessionFile || !profileFile || !bypassFile)
  throw new Error('Provide the four private local evaluation files.');
const [config, session, profile, bypass] = await Promise.all(
  [publicFile, sessionFile, profileFile, bypassFile].map(async (path) =>
    JSON.parse(await readFile(path, 'utf8')),
  ),
);
const origin = new URL(config.previewUrl).origin;
if (
  new URL(origin).protocol !== 'https:' ||
  !new URL(origin).hostname.endsWith('-team-thor1.vercel.app') ||
  new URL(config.supabaseUrl).hostname !== 'tabddnhkrugkejjxbctv.supabase.co'
)
  throw new Error('Only the confirmed dev Preview may be evaluated.');
await mkdir(output, { recursive: true });
// Pin only the managed proxy's existing public CA for this one browser process.
// No persistent trust settings are changed, and all other origins are blocked below.
const proxyCertificate = new X509Certificate(
  await readFile('/usr/local/share/ca-certificates/environment-proxy-ca.crt'),
);
const proxyPin = createHash('sha256')
  .update(proxyCertificate.publicKey.export({ type: 'spki', format: 'der' }))
  .digest('base64');
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  args: [`--ignore-certificate-errors-spki-list=${proxyPin}`],
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 960 },
  recordVideo: { dir: output, size: { width: 1280, height: 960 } },
});
const cookieName = 'sb-tabddnhkrugkejjxbctv-auth-token';
const encoded = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
const chunks = Array.from(
  { length: Math.ceil(encoded.length / 3000) },
  (_, i) => ({
    name: encoded.length > 3000 ? `${cookieName}.${i}` : cookieName,
    value: encoded.slice(i * 3000, (i + 1) * 3000),
    url: origin,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  }),
);
await context.addCookies([
  ...chunks,
  {
    name: 'leo-device',
    value: profile.deviceId,
    url: origin,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  },
]);
const shareResponse = await trustedFetch(
  `${origin}/login?_vercel_share=${encodeURIComponent(bypass.secret)}`,
  { redirect: 'manual', dispatcher: new EnvHttpProxyAgent() },
);
const vercelCookies = shareResponse.headers.getSetCookie();
await shareResponse.body?.cancel();
await context.addCookies(
  vercelCookies
    .filter((cookie) => cookie.startsWith('_vercel_jwt='))
    .map((cookie) => ({
      name: '_vercel_jwt',
      value: cookie.slice('_vercel_jwt='.length).split(';')[0],
      url: origin,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    })),
);
const page = await context.newPage();
await page.route('**/*', async (route) => {
  if (new URL(route.request().url()).origin !== origin) {
    await route.abort('blockedbyclient');
    return;
  }
  await route.continue();
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let view;
const results = [];
async function preflight() {
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/leo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'costStatus' }),
    });
    if (!response.ok) throw new Error('Could not verify the live test budget.');
    return response.json();
  });
  assertPreviewTestBudget(status);
}
async function command(click, name) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/leo') &&
      r.request().method() === 'POST' &&
      r.request().postDataJSON()?.command !== 'feedback',
    { timeout: 240000 },
  );
  const [result] = await Promise.all([response, click()]);
  let body;
  if (result.headers()['content-type']?.includes('application/x-ndjson')) {
    // Observe the actual browser consumer; CDP cannot reliably read stream bodies.
    await page.waitForFunction(
      () =>
        document.querySelector('.request-status')?.textContent?.trim() === '',
      null,
      { timeout: 290000 },
    );
    if (await page.locator('.error-box').count())
      throw new Error(await page.locator('.error-box p').innerText());
    body = await page.evaluate(async () => {
      const response = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'start',
          mode: 'practice',
          part: null,
        }),
      });
      return response.json();
    });
  } else body = await result.json();
  if (!result.ok())
    throw new Error(`${name}: HTTP ${result.status()}: ${body.message}`);
  if (body.task !== undefined) view = body;
  console.log(
    JSON.stringify({
      step: name,
      status: result.status(),
      chapter: view?.adventure?.number,
      mission: view?.adventure?.mission,
      scene: view?.task?.scene?.title,
      source: view?.adventure?.source,
    }),
  );
  return body;
}
try {
  await page.goto(`${origin}/leo`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  console.log(
    JSON.stringify({
      step: 'authenticated-page',
      path: new URL(page.url()).pathname,
      title: await page.title(),
    }),
  );
  await preflight();
  if (process.env.EVAL_RESTART_SESSION === '1') {
    await page.evaluate(async () => {
      const start = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'start',
          mode: 'practice',
          part: null,
        }),
      });
      const current = await start.json();
      if (!current.ended) {
        const response = await fetch('/api/leo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'turn',
            sessionId: current.id,
            revision: current.revision,
            requestId: crypto.randomUUID(),
            event: { type: 'end', mood: 'rolig', reflection: '' },
          }),
        });
        if (!response.ok)
          throw new Error(
            'Could not close the temporary evaluation session normally.',
          );
      }
    });
    await page.reload({ waitUntil: 'networkidle' });
  }
  const interests = process.env.EVAL_INTERESTS?.split('|') ?? ['Star Wars'];
  const missionLimit = Number(process.env.EVAL_MISSION_LIMIT ?? 6);
  const advanceChapter = process.env.EVAL_NEXT_CHAPTER === '1';
  if (
    !interests.every((i) => ['Star Wars', 'Dinosaurer'].includes(i)) ||
    !Number.isInteger(missionLimit) ||
    missionLimit < 1 ||
    missionLimit > 6
  )
    throw new Error('Invalid evaluation scope.');
  for (const interest of interests) {
    await page.getByRole('link', { name: 'Mine interesser' }).click();
    await command(
      () =>
        page
          .locator('.interest-presets')
          .getByRole('button', { name: interest, exact: true })
          .click(),
      'select-interest',
    );
    await page.getByRole('link', { name: 'Tilbake til kartet' }).click();
    const endMapButton = page.getByRole('button', {
      name: 'Tilbake til kartet',
      exact: true,
    });
    if (await endMapButton.isVisible()) await endMapButton.click();
    const startButton = page
      .getByRole('button', { name: 'Start eventyret', exact: true })
      .or(
        page.getByRole('button', { name: 'Fortsett eventyret', exact: true }),
      );
    const switchButton = page.getByRole('button', {
      name: `Fortsett eventyret om ${interest}`,
      exact: true,
    });
    const moodButton = page.getByRole('button', { name: '🙂 Rolig' });
    const taskQuestion = page.locator('#task-question');
    await startButton
      .or(switchButton)
      .or(moodButton)
      .or(taskQuestion)
      .or(endMapButton)
      .waitFor({ state: 'visible', timeout: 60000 });
    if (await endMapButton.isVisible()) {
      await endMapButton.click();
      await startButton
        .or(switchButton)
        .or(moodButton)
        .or(taskQuestion)
        .waitFor({ state: 'visible', timeout: 60000 });
    }
    if (await moodButton.isVisible()) {
      await command(() => moodButton.click(), 'research-and-first-chapter');
    } else if (await startButton.isVisible()) {
      await command(() => startButton.click(), 'start');
      await command(() => moodButton.click(), 'research-and-first-chapter');
    } else if (await switchButton.isVisible()) {
      await command(() => switchButton.click(), 'switch-interest');
    } else {
      view = await page.evaluate(async () => {
        const r = await fetch('/api/leo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'start',
            mode: 'practice',
            part: null,
          }),
        });
        return r.json();
      });
    }
    if (!view.task?.scene || view.adventure?.source !== 'model')
      throw new Error('The real researched story path was not used.');
    const prefix = interest === 'Star Wars' ? 'space' : 'dinosaur';
    await page
      .locator('.story-player')
      .screenshot({ path: `${output}/${prefix}-opening.png` });
    const initial = structuredClone(view);
    const firstMission = view.adventure.mission - 1;
    for (
      let i = firstMission;
      i < Math.min(6, firstMission + missionLimit);
      i++
    ) {
      await page.locator('.story-player').screenshot({
        path: `${output}/${prefix}-chapter-${view.adventure.number}-mission-${i + 1}-before.png`,
      });
      if (view.task.resolved && !view.adventure.choice) {
        if (i === 5 && !advanceChapter) break;
        await command(
          () =>
            page.getByRole('button', { name: 'Fortsett eventyret →' }).click(),
          'resume-chapter-transition',
        );
        continue;
      }
      const task = view.task,
        m = task.interaction.math;
      let answer;
      if (task.answerType === 'coordinate')
        answer = {
          x: task.visual.steps.filter((s) => s === 'høyre').length,
          y: task.visual.steps.filter((s) => s === 'opp').length,
        };
      else if (m.kind === 'groups') answer = m.total;
      else if (m.kind === 'missing') answer = m.total - m.known;
      else if (m.kind === 'double')
        answer = m.mode === 'doble' ? m.total : m.each;
      else if (m.kind === 'share') answer = m.each;
      else if (m.kind === 'measure') answer = m.total / m.each;
      else if (
        task.skillTitle === 'Mål volum med klosser og liter' &&
        /(\d+) lag[\s\S]*?(\d+) ganger (\d+)/.test(task.question)
      ) {
        const dimensions = task.question.match(
          /(\d+) lag[\s\S]*?(\d+) ganger (\d+)/,
        );
        answer = dimensions
          .slice(1)
          .map(Number)
          .reduce((a, b) => a * b, 1);
      } else if (
        task.skillTitle === 'Mål volum med klosser og liter' &&
        /rommer (\d+) · (\d+) klosser i hvert lag\. Den har (\d+) lag/.test(
          task.question,
        )
      ) {
        const dimensions = task.question.match(
          /rommer (\d+) · (\d+) klosser i hvert lag\. Den har (\d+) lag/,
        );
        answer = dimensions
          .slice(1)
          .map(Number)
          .reduce((a, b) => a * b, 1);
      } else if (task.visual.type === 'figur3d' && task.visual.shape) {
        const solid = solidFor(task.visual.shape);
        const quantity = /hjørner/.test(task.question)
          ? solid.vertices.length
          : /kanter/.test(task.question)
            ? solidEdges(solid).length
            : solid.faces.length;
        answer = quantity * task.visual.count;
      } else if (task.visual.type === 'figur2d' && task.visual.shape) {
        const sides = task.visual.shape.includes('trekant')
          ? 3
          : task.visual.shape.includes('sekskant')
            ? 6
            : task.visual.shape.includes('åttekant')
              ? 8
              : 4;
        answer = /rette vinkler/.test(task.question)
          ? ['kvadrat', 'rektangel'].includes(task.visual.shape)
            ? 4 * task.visual.count
            : 0
          : sides * task.visual.count;
      } else
        throw new Error(`Manual evaluation needed for ${task.skillTitle}.`);
      if (
        i === 0 &&
        !task.expressionRequired &&
        task.interaction.kind !== 'grouping' &&
        task.scene.action !== 'route' &&
        task.answerType !== 'choice'
      ) {
        await page.getByLabel('Svaret ditt', { exact: true }).fill('999');
        if (task.answerType === 'coordinate')
          await page.getByLabel('y (oppover)', { exact: true }).fill('0');
        await command(
          () =>
            page
              .getByRole('button', { name: 'Sjekk svaret', exact: true })
              .click(),
          'wrong-answer',
        );
        await page
          .locator('.story-player')
          .screenshot({ path: `${output}/${prefix}-retry.png` });
      }
      if (task.answerType === 'coordinate') {
        await page
          .getByLabel('Svaret ditt', { exact: true })
          .fill(String(answer.x));
        await page
          .getByLabel('y (oppover)', { exact: true })
          .fill(String(answer.y));
      } else if (task.interaction.kind === 'grouping')
        for (let j = 0; j < m.groups; j++)
          await page
            .getByLabel(`Antall i ${task.scene.container} ${j + 1}`, {
              exact: true,
            })
            .fill(String(m.each));
      else if (
        task.scene.action === 'route' &&
        task.interaction.kind === 'compare'
      )
        await page
          .locator('.story-answer-options button')
          .filter({ hasText: String(answer) })
          .first()
          .click();
      else
        await page
          .getByLabel('Svaret ditt', { exact: true })
          .fill(String(answer));
      if (task.expressionRequired)
        await page
          .getByLabel('Regnestykket ditt', { exact: true })
          .fill(`${m.groups}x${m.each}`);
      await command(
        () =>
          page
            .getByRole('button', { name: 'Sjekk svaret', exact: true })
            .click(),
        'solve',
      );
      if (!view.correct)
        throw new Error('The independently derived answer was not accepted.');
      await page.locator('.story-player').screenshot({
        path: `${output}/${prefix}-chapter-${view.adventure.number}-mission-${i + 1}-solved.png`,
      });
      if (i === 0)
        await page
          .locator('.story-player')
          .screenshot({ path: `${output}/${prefix}-solved.png` });
      if (view.adventure.choice) {
        const choice = view.adventure.choice;
        const option = choice.options.find((o) => o.cost <= choice.budget);
        await page.locator('.story-routes button').nth(option.id).click();
        await page
          .getByLabel('Forsyninger igjen')
          .fill(String(choice.budget - option.cost));
        await command(
          () => page.getByRole('button', { name: 'Velg denne veien' }).click(),
          'math-choice',
        );
      }
      if (view.task.scene.branch)
        await page
          .locator('.story-player')
          .screenshot({ path: `${output}/${prefix}-payoff.png` });
      await page.reload({ waitUntil: 'networkidle' });
      if (i === 5 && !advanceChapter) break;
      await command(
        () =>
          page.getByRole('button', { name: 'Fortsett eventyret →' }).click(),
        'continue',
      );
    }
    if (
      missionLimit === 6 &&
      advanceChapter &&
      (view.adventure.number !== initial.adventure.number + 1 ||
        view.adventure.journey.chapters.at(-2).events.length !== 6)
    )
      throw new Error('History did not survive chapter transition.');
    if (
      missionLimit === 6 &&
      !advanceChapter &&
      (!view.task.resolved ||
        view.adventure.journey.chapters.at(-1).events.length !== 6)
    )
      throw new Error(
        'Current chapter did not finish with six recorded events.',
      );
    await page
      .locator('.story-player')
      .screenshot({ path: `${output}/${prefix}-continuation.png` });
    results.push({
      interest,
      first: initial,
      continuation: structuredClone(view),
    });
    await writeFile(
      `${output}/results.json`,
      JSON.stringify({ results, errors }, null, 2),
    );
  }
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  if (errors.length) throw new Error(`Browser errors: ${errors.length}`);
  console.log(
    JSON.stringify({
      verified: true,
      universes: results.length,
      errors: errors.length,
    }),
  );
} finally {
  await writeFile(
    `${output}/last-view.json`,
    JSON.stringify(view ?? {}, null, 2),
  );
  await page.screenshot({ path: `${output}/last-page.png`, fullPage: true });
  await browser.close();
}
