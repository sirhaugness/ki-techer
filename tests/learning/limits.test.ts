import { expect, it } from 'vitest';
import { boundedBody, boundedJson } from '../../lib/security/body';
import { configuredBudget } from '../../lib/engine/limits';
it('reads and limits actual chunked UTF-8 bytes rather than trusting headers', async () => {
  const req = () =>
    new Request('https://example.test', {
      method: 'POST',
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('ææ'));
          c.enqueue(new TextEncoder().encode('øø'));
          c.close();
        },
      }),
      duplex: 'half',
    } as RequestInit);
  expect(await boundedBody(req(), 7)).toBeNull();
  expect((await boundedBody(req(), 8))?.byteLength).toBe(8);
  const aborted = new Request('https://example.test', {
    method: 'POST',
    body: new ReadableStream({
      start(c) {
        c.error(new Error('aborted'));
      },
    }),
    duplex: 'half',
  } as RequestInit);
  expect(await boundedJson(aborted)).toEqual({ tooLarge: false, value: null });
  expect(
    (
      await boundedJson(
        new Request('https://example.test', {
          method: 'POST',
          body: 'not json',
        }),
      )
    ).value,
  ).toBeNull();
  expect(
    (
      await boundedJson(
        new Request('https://example.test', {
          method: 'POST',
          body: JSON.stringify({ text: 'hei' }),
        }),
      )
    ).value,
  ).toEqual({ text: 'hei' });
});
it('fails closed on invalid budget configuration', () => {
  expect(configuredBudget(undefined)).toBe(100);
  expect(configuredBudget('0')).toBe(0);
  expect(configuredBudget('bad')).toBe(0);
  expect(configuredBudget('-1')).toBe(0);
});
