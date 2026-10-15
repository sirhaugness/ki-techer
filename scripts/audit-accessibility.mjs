import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
// A separate mock-only server: no real learner data, credentials or paid API calls.
const origin = 'http://127.0.0.1:3100';
const env = {
  ...process.env,
  NODE_ENV: 'development',
  E2E_LEO_FIXTURE: '1',
  APP_URL: '',
  VERCEL_URL: '',
};
for (const name of Object.keys(env))
  if (name.includes('SUPABASE') || name.startsWith('OPENAI_')) env[name] = '';
const server = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3100',
  ],
  { env, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverLog = '';
server.stdout.on('data', (b) => {
  serverLog += b;
});
server.stderr.on('data', (b) => {
  serverLog += b;
});
let chrome;
const results = [];
try {
  const deadline = Date.now() + 60000;
  while (true) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (Date.now() > deadline)
      throw new Error(`Audit server did not start: ${serverLog.slice(-3000)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  chrome = await launch({
    chromePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  await mkdir('test-results/lighthouse', { recursive: true });
  const audit = async (name, path) => {
    const result = await lighthouse(
      origin + path,
      {
        port: chrome.port,
        onlyCategories: ['accessibility'],
        output: ['json', 'html'],
        logLevel: 'error',
        disableStorageReset: true,
      },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1024,
            height: 768,
            deviceScaleFactor: 1,
            disabled: false,
          },
        },
      },
    );
    if (!result) throw new Error('Lighthouse returned no result');
    const score = Math.round(result.lhr.categories.accessibility.score * 100);
    results.push({ name, path, score });
    await writeFile(`test-results/lighthouse/${name}.json`, result.report[0]);
    await writeFile(`test-results/lighthouse/${name}.html`, result.report[1]);
    console.log(`${name}: accessibility ${score}/100`);
    for (const item of Object.values(result.lhr.audits))
      if (item.score === 0) console.log(`  ${item.id}: ${item.title}`);
  };
  await audit('home', '/');
  await audit('login', '/login');
  await fetch(origin + '/leo?fixture=master');
  await audit('leo-home', '/leo');
  const post = async (body) => {
    const r = await fetch(origin + '/api/leo', {
      method: 'POST',
      headers: { origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Fixture command failed: ${r.status}`);
    return r.json();
  };
  const started = await post({ command: 'start', mode: 'practice', part: 4 });
  await post({
    command: 'turn',
    sessionId: started.id,
    revision: started.revision,
    requestId: randomUUID(),
    event: { type: 'mood', mood: 'rolig' },
  });
  await audit('leo-task', '/leo');
  await fetch(origin + '/leo?fixture=quiet');
  await post({ command: 'interest', label: 'Star Wars' });
  const adventureSession = await post({
    command: 'start',
    mode: 'practice',
    part: null,
  });
  await post({
    command: 'turn',
    sessionId: adventureSession.id,
    revision: adventureSession.revision,
    requestId: randomUUID(),
    event: { type: 'mood', mood: 'rolig' },
  });
  await audit('leo-adventure', '/leo');
  await fetch(origin + '/leo?fixture=story');
  await post({ command: 'interest', label: 'Star Wars' });
  const storySession = await post({
    command: 'start',
    mode: 'practice',
    part: null,
  });
  await post({
    command: 'turn',
    sessionId: storySession.id,
    revision: storySession.revision,
    requestId: randomUUID(),
    event: { type: 'mood', mood: 'rolig' },
  });
  await audit('leo-story', '/leo');
  await audit(
    'parent',
    '/forelder/00000000-0000-4000-8000-000000000099?fixture=reset',
  );
  await audit(
    'diploma',
    '/forelder/00000000-0000-4000-8000-000000000099/diplom?part=4',
  );
  await writeFile(
    'test-results/lighthouse/summary.json',
    JSON.stringify(
      {
        environment: 'local mock-only development server, tablet viewport',
        results,
      },
      null,
      2,
    ),
  );
  if (results.some((r) => r.score < 90))
    throw new Error(
      'Accessibility score below 90; inspect test-results/lighthouse reports',
    );
} finally {
  await chrome?.kill();
  server.kill('SIGTERM');
}
