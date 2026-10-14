import { expect, it } from 'vitest';
import { readLearningResponse } from '../../lib/learning/read-response';
it('shows streamed progress and returns only the committed view across split Unicode chunks', async () => {
  const text =
    '{"progress":"Vi følger sporene …"}\n{"view":{"id":"saved","revision":3}}\n';
  const bytes = new TextEncoder().encode(text),
    messages: string[] = [];
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 32));
        controller.enqueue(bytes.slice(32));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson' } },
  );
  expect(
    await readLearningResponse(response, (text) => messages.push(text)),
  ).toEqual({ id: 'saved', revision: 3 });
  expect(messages).toEqual(['Vi følger sporene …']);
});
it('keeps ordinary responses and surfaces recoverable errors without accepting a partial result', async () => {
  expect(
    await readLearningResponse(Response.json({ revision: 4 }), () => {}),
  ).toEqual({ revision: 4 });
  await expect(
    readLearningResponse(
      new Response('{"progress":"Vi prøver …"}\n{"message":"Prøv igjen."}\n', {
        headers: { 'Content-Type': 'application/x-ndjson' },
      }),
      () => {},
    ),
  ).rejects.toThrow('Prøv igjen.');
});
