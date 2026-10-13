import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('real local Auth: persistent browser restart, automatic refresh, PIN protection and logout', async ({
  request,
}) => {
  test.skip(
    process.env.E2E_LOCAL_SUPABASE !== '1',
    'Requires real local Supabase Auth and Mailpit.',
  );
  test.setTimeout(90_000);
  const profileDir = await mkdtemp(join(tmpdir(), 'leo-auth-browser-'));
  const launch = () =>
    chromium.launchPersistentContext(profileDir, {
      headless: true,
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      viewport: { width: 1024, height: 768 },
    });
  let context = await launch();
  try {
    let page = context.pages()[0];
    const email = `persistent-${Date.now()}@example.test`;
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByLabel('E-postadressen din').fill(email);
    await page.getByRole('button', { name: 'Send innloggingslenke' }).click();
    await expect(page.getByRole('status')).toContainText('Sjekk e-posten');
    let messageId = '';
    await expect
      .poll(async () => {
        const inbox = await (
          await request.get('http://127.0.0.1:54324/api/v1/messages')
        ).json();
        messageId =
          inbox.messages.find((m: { ID: string; To: { Address: string }[] }) =>
            m.To.some((t) => t.Address === email),
          )?.ID ?? '';
        return messageId;
      })
      .not.toBe('');
    const detail = await (
      await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`)
    ).json();
    const link = /href="([^"]*\/auth\/v1\/verify[^"]*)"/
      .exec(detail.HTML)?.[1]
      ?.replaceAll('&amp;', '&');
    expect(link).toBeTruthy();
    await page.goto(link!);
    await expect(
      page.getByRole('heading', { name: 'Foreldresiden', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Opprett elevprofil' }).click();
    await page.getByLabel('Forelderens PIN (fire sifre)').fill('0123');
    await page.getByRole('button', { name: 'Lagre PIN' }).click();
    await page.getByRole('button', { name: 'Start Leo-modus for Leo' }).click();
    await expect(
      page.getByRole('heading', { name: 'Hei, Leo!' }),
    ).toBeVisible();
    const authCookies = (await context.cookies()).filter((c) =>
      /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name),
    );
    expect(authCookies.length).toBeGreaterThan(0);
    expect(
      authCookies.every((c) => c.expires > Date.now() / 1000 + 86400),
    ).toBe(true);
    await context.close();
    context = await launch();
    page = context.pages()[0];
    await page.goto('http://127.0.0.1:3000/leo');
    await expect(
      page.getByRole('heading', { name: 'Hei, Leo!' }),
    ).toBeVisible();
    await page.goto('http://127.0.0.1:3000/forelder');
    await expect(page).toHaveURL(/\/leo$/);
    // Advance the cached expiry only. Auth must rotate the real refresh token;
    // the access token signature and hosted JWT configuration are unchanged.
    const cookies = (await context.cookies())
      .filter((c) => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const encoded = cookies.map((c) => c.value).join('');
    const session = JSON.parse(
      Buffer.from(encoded.replace(/^base64-/, ''), 'base64url').toString(),
    );
    const previousRefresh = session.refresh_token;
    session.expires_at = Math.floor(Date.now() / 1000) - 60;
    const changed = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
    const baseName = cookies[0].name.replace(/\.\d+$/, '');
    const chunks = changed.match(/.{1,3000}/g)!;
    await context.clearCookies({
      name: new RegExp(`^${baseName}(?:\\.\\d+)?$`),
    });
    await context.addCookies(
      chunks.map((value, i) => ({
        ...cookies[0],
        name: chunks.length === 1 ? baseName : `${baseName}.${i}`,
        value,
      })),
    );
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Hei, Leo!' }),
    ).toBeVisible();
    const refreshedCookies = (await context.cookies())
      .filter((c) => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const refreshed = JSON.parse(
      Buffer.from(
        refreshedCookies
          .map((c) => c.value)
          .join('')
          .replace(/^base64-/, ''),
        'base64url',
      ).toString(),
    );
    expect(refreshed.refresh_token).not.toBe(previousRefresh);
    expect(refreshed.expires_at).toBeGreaterThan(Date.now() / 1000);
    await page.getByText('For forelder', { exact: true }).click();
    await page.getByLabel('Forelderens PIN', { exact: true }).fill('0123');
    await page.getByRole('button', { name: 'Lås opp foreldresiden' }).click();
    await expect(
      page.getByRole('heading', { name: 'Foreldresiden', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Logg ut', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('http://127.0.0.1:3000/leo');
    await expect(page).toHaveURL(/\/login/);
  } finally {
    await context.close();
    await rm(profileDir, { recursive: true, force: true });
  }
});
