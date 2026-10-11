/** Limits the actual stream, including requests without Content-Length. */
export async function boundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array | null> {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes)
    return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
export async function boundedJson(request: Request, maxBytes = 8000) {
  try {
    const body = await boundedBody(request, maxBytes);
    if (!body) return { tooLarge: true, value: null };
    return {
      tooLarge: false,
      value: JSON.parse(new TextDecoder().decode(body)) as unknown,
    };
  } catch {
    return { tooLarge: false, value: null };
  }
}
