import { test, expect } from '@playwright/test';
test.beforeEach(() =>
  test.skip(
    process.env.E2E_LOCAL_SUPABASE === '1',
    'Voice mocks run in the separate fixture job.',
  ),
);
test('read aloud, auto preference, hold-to-speak, visible editable transcript and confirmed answer', async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Recorder extends EventTarget {
      static isTypeSupported(type: string) {
        return type === 'audio/webm;codecs=opus';
      }
      mimeType = 'audio/webm;codecs=opus';
      state = 'inactive';
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        const event = new Event('dataavailable');
        Object.defineProperty(event, 'data', {
          value: new Blob(['mock-audio'], { type: this.mimeType }),
        });
        this.dispatchEvent(event);
        this.dispatchEvent(new Event('stop'));
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { value: Recorder });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => ({ getTracks: () => [{ stop: () => {} }] }),
      },
    });
  });
  await page.goto('/leo?fixture=reset');
  await page.getByRole('button', { name: 'Start Bli kjent' }).click();
  await page.getByRole('button', { name: '😊 Glad' }).click();
  await page.getByRole('button', { name: 'Les høyt' }).click();
  await expect(page.getByText('Leser høyt.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stopp opplesing' }).click();
  await expect(page.getByText('Opplesingen er stoppet.')).toBeVisible();
  await page.getByRole('button', { name: 'Auto-opplesing: av' }).click();
  await expect(
    page.getByRole('button', { name: 'Auto-opplesing: på' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Auto-opplesing: på' }).click();
  const mic = page.getByRole('button', { name: 'Hold for å snakke' });
  await mic.focus();
  await page.keyboard.down('Space');
  await expect(
    page.getByRole('button', { name: 'Snakk nå. Slipp når du er ferdig.' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.up('Space');
  await expect(page.getByLabel('Dette hørte vi.')).toHaveValue('Tolv.');
  await expect(
    page.getByRole('button', { name: 'Sjekk svaret' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bruk talesvaret' }).click();
  await expect(
    page.getByRole('button', { name: 'Neste oppgave' }),
  ).toBeVisible();
});
test('denied microphone leaves text answer available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'MediaRecorder', {
      value: class {
        static isTypeSupported() {
          return true;
        }
      },
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: async () => {
          throw new DOMException('denied', 'NotAllowedError');
        },
      },
    });
  });
  await page.goto('/leo?fixture=reset');
  await page.getByRole('button', { name: 'Start Bli kjent' }).click();
  await page.getByRole('button', { name: '🙂 Rolig' }).click();
  const mic = page.getByRole('button', { name: 'Hold for å snakke' });
  await mic.focus();
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect(
    page.getByText('Mikrofonen må tillates', { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel('Svaret ditt', { exact: true })).toBeEnabled();
});
