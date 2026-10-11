import { it, expect, vi, afterEach } from 'vitest';
import { speechAudio, speechHash } from '../../lib/voice/speech';
import { parseVoiceAnswer } from '../../lib/voice/parse';
import {
  audioMime,
  validAudio,
  MAX_AUDIO_BYTES,
} from '../../lib/voice/contracts';
import {
  VoiceRecorder,
  type RecorderDependencies,
} from '../../lib/voice/recorder';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('caches audio by household, text, voice and model and survives cache failures', async () => {
  const bytes = new Uint8Array([1, 2, 3]),
    provider = { speak: vi.fn(async () => bytes), transcribe: vi.fn() },
    cache = {
      get: vi.fn(async () => null as Uint8Array | null),
      put: vi.fn(async () => {}),
    };
  const params = {
    scope: 'family-a',
    text: 'Prøv igjen.',
    model: 'configured-tts',
    voice: 'configured-voice',
    provider,
    cache,
  };
  expect((await speechAudio(params)).cached).toBe(false);
  cache.get.mockResolvedValue(bytes);
  expect((await speechAudio(params)).cached).toBe(true);
  expect(provider.speak).toHaveBeenCalledTimes(1);
  expect(
    speechHash('family-b', params.text, params.model, params.voice),
  ).not.toBe(speechHash(params.scope, params.text, params.model, params.voice));
  expect(
    speechHash(params.scope, params.text, 'other-model', params.voice),
  ).not.toBe(speechHash(params.scope, params.text, params.model, params.voice));
  cache.get.mockRejectedValue(new Error('cache'));
  cache.put.mockRejectedValue(new Error('storage'));
  expect((await speechAudio(params)).bytes).toEqual(bytes);
});
it.each([
  ['tolv', 12],
  ['Svaret er 12.', 12],
  ['tre komma fem', 3.5],
  ['tjue tre', 23],
  ['12 eller 13', null],
  ['jeg vet ikke', null],
])('parses only unambiguous spoken numbers: %s', (text, expected) => {
  expect(parseVoiceAnswer(text as string, 'number')).toBe(expected);
});
it('supports explicit rest and coordinates, rejects arbitrary transcription as an answer', () => {
  expect(parseVoiceAnswer('tre rest en', 'remainder')).toEqual({
    quotient: 3,
    remainder: 1,
  });
  expect(parseVoiceAnswer('x to y tre', 'coordinate')).toEqual({ x: 2, y: 3 });
  expect(parseVoiceAnswer('gå høyre', 'choice', ['Gå høyre', 'Gå opp'])).toBe(
    'Gå høyre',
  );
  expect(
    parseVoiceAnswer('gå hvor som helst', 'choice', ['Gå høyre']),
  ).toBeNull();
});
it('selects Safari MP4 and Chromium WebM, rejects empty, unsupported or oversized audio', () => {
  vi.stubGlobal('MediaRecorder', {
    isTypeSupported: (type: string) => type === 'audio/mp4',
  });
  expect(audioMime()).toBe('audio/mp4');
  vi.stubGlobal('MediaRecorder', {
    isTypeSupported: (type: string) => type === 'audio/webm;codecs=opus',
  });
  expect(audioMime()).toBe('audio/webm;codecs=opus');
  expect(
    validAudio(new File(['audio'], 'svar.m4a', { type: 'audio/mp4' })),
  ).toBe(true);
  expect(validAudio(new File([], 'empty.webm', { type: 'audio/webm' }))).toBe(
    false,
  );
  expect(
    validAudio(new File(['image'], 'image.png', { type: 'image/png' })),
  ).toBe(false);
  expect(
    validAudio(
      new File([new Uint8Array(MAX_AUDIO_BYTES + 1)], 'long.webm', {
        type: 'audio/webm',
      }),
    ),
  ).toBe(false);
});
function capture() {
  const stop = vi.fn(),
    stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  let onData: (data: Blob) => void = () => {},
    onStop: () => void = () => {};
  const recorder = {
    mimeType: 'audio/mp4',
    start: vi.fn(),
    stop: vi.fn(() => {
      onData(new Blob(['audio']));
      onStop();
    }),
    onData: (cb: (data: Blob) => void) => {
      onData = cb;
    },
    onStop: (cb: () => void) => {
      onStop = cb;
    },
  };
  const deps: RecorderDependencies = {
    getStream: vi.fn(async () => stream),
    create: () => recorder,
    mime: () => 'audio/mp4',
    upload: vi.fn(async () => 'Tolv.'),
    status: vi.fn(),
    text: vi.fn(),
    error: vi.fn(),
  };
  return { stop, stream, recorder, deps, controller: new VoiceRecorder(deps) };
}
it('does not start recording if released while permission is pending and releases the stream', async () => {
  const c = capture();
  let resolve: (stream: MediaStream) => void = () => {};
  c.deps.getStream = () =>
    new Promise((r) => {
      resolve = r;
    });
  const pending = c.controller.start();
  c.controller.stop();
  resolve(c.stream);
  await pending;
  expect(c.recorder.start).not.toHaveBeenCalled();
  expect(c.stop).toHaveBeenCalledOnce();
  expect(c.deps.upload).not.toHaveBeenCalled();
});
it('stops at thirty seconds, transcribes once, and releases microphone on disposal', async () => {
  vi.useFakeTimers();
  const c = capture();
  await c.controller.start();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(c.deps.text).toHaveBeenCalledWith('Tolv.');
  expect(c.deps.upload).toHaveBeenCalledOnce();
  expect(c.stop).toHaveBeenCalled();
  const d = capture();
  await d.controller.start();
  d.controller.dispose();
  expect(d.stop).toHaveBeenCalled();
  expect(d.deps.upload).not.toHaveBeenCalled();
});
it('denied permission leaves keyboard usable and gives a clear message', async () => {
  const c = capture();
  c.deps.getStream = async () => {
    throw new DOMException('denied', 'NotAllowedError');
  };
  await c.controller.start();
  expect(c.deps.error).toHaveBeenCalledWith(
    expect.stringContaining('Mikrofonen må tillates'),
  );
  expect(c.deps.upload).not.toHaveBeenCalled();
});
