/** Consume progress without confusing it with the final, committed learning view. */
export async function readLearningResponse(
  response: Response,
  onProgress: (message: string) => void,
): Promise<Record<string, unknown>> {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson'))
    return response.json();
  if (!response.body) throw new Error('Eventyret fikk ikke svart. Prøv igjen.');
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = '',
    result: Record<string, unknown> | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {
      progress?: string;
      view?: Record<string, unknown>;
      message?: string;
    };
    if (event.progress) onProgress(event.progress);
    if (event.message) throw new Error(event.message);
    if (event.view) result = event.view;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(consume);
      if (done) break;
    }
    consume(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!result) throw new Error('Eventyret fikk ikke svart ferdig. Prøv igjen.');
  return result;
}
