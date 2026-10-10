import { expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
it('leverer testdata fra en mock uten eksterne tjenester', async () => {
  server.use(
    http.get('https://mock.invalid/status', () =>
      HttpResponse.json({ ok: true }),
    ),
  );
  expect(await (await fetch('https://mock.invalid/status')).json()).toEqual({
    ok: true,
  });
});
it('stopper nettverkskall som mangler en mock', async () => {
  await expect(fetch('https://mock.invalid/unhandled')).rejects.toThrow();
});
