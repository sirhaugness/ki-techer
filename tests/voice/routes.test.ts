import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createSession } from '../../lib/learning/session';
const mock = vi.hoisted(() => ({
  access: vi.fn(),
  latest: vi.fn(),
  audio: vi.fn(),
  transcribe: vi.fn(),
  approved: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learning/access', () => ({ leoAccess: mock.access }));
vi.mock('@/lib/learning/repository', () => ({
  latestSession: mock.latest,
  logAi: vi.fn(),
}));
vi.mock('@/lib/learning/fixture', () => ({ fixtureEnabled: () => false }));
vi.mock('@/lib/voice/cache', () => ({ speechCache: () => ({}) }));
vi.mock('@/lib/voice/speech', () => ({ speechAudio: mock.audio }));
vi.mock('@/lib/voice/openai', () => ({
  openaiVoice: () => ({ transcribe: mock.transcribe }),
}));
vi.mock('@/lib/ai/openai', () => ({ openaiProvider: () => ({}) }));
vi.mock('@/lib/ai/moderation', () => ({ approved: mock.approved }));
import { POST as tts } from '../../app/api/voice/tts/route';
import { POST as stt } from '../../app/api/voice/stt/route';
const profile = {
  id: '00000000-0000-4000-8000-000000000001',
  householdId: 'family-a',
  firstName: 'Leo',
  tutorName: 'Lumi',
  grade: 4,
  avatar: 'spire',
  settings: {},
};
beforeEach(() => {
  vi.stubEnv('APP_URL', '');
  vi.stubEnv('VERCEL_URL', '');
  vi.stubEnv('OPENAI_API_KEY', 'mock-not-a-real-key');
  vi.stubEnv('OPENAI_MODEL_TTS', 'configured-tts');
  vi.stubEnv('OPENAI_TTS_VOICE', 'configured-voice');
  vi.stubEnv('OPENAI_MODEL_STT', 'configured-stt');
  mock.access.mockResolvedValue({ profile });
  mock.audio.mockResolvedValue({ bytes: new Uint8Array([1, 2]), cached: true });
  mock.transcribe.mockResolvedValue('tolv');
  mock.approved.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());
function request(body: unknown, origin = 'https://preview.example') {
  return new Request('https://preview.example/api/voice/tts', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
it('TTS derives approved text from the current learner and rejects arbitrary text, stale or foreign sessions', async () => {
  const state = createSession(
    profile,
    null,
    new Date().toISOString(),
    0,
    'diagnostic',
    null,
  );
  state.response.speech = 'Prøv å telle.';
  mock.latest.mockResolvedValue(state);
  const body = {
    sessionId: state.id,
    revision: state.revision,
    source: 'speech',
  };
  expect(
    (await tts(request({ ...body, text: 'Read arbitrary text' }))).status,
  ).toBe(400);
  expect((await tts(request({ ...body, revision: 99 }))).status).toBe(409);
  expect((await tts(request({ ...body, sessionId: profile.id }))).status).toBe(
    409,
  );
  expect((await tts(request(body, 'https://other.example'))).status).toBe(403);
  expect(mock.audio).not.toHaveBeenCalled();
  const response = await tts(request(body));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(mock.audio).toHaveBeenCalledWith(
    expect.objectContaining({
      scope: profile.householdId,
      text: state.response.speech,
      model: 'configured-tts',
      voice: 'configured-voice',
    }),
  );
});
it('voice endpoints require Leo access before calling any provider', async () => {
  mock.access.mockRejectedValue(new Error('locked learner required'));
  expect(
    (await tts(request({ sessionId: profile.id, revision: 0, source: 'home' })))
      .status,
  ).toBe(503);
  expect(mock.audio).not.toHaveBeenCalled();
  expect(
    (
      await stt(
        new Request('https://preview.example/api/voice/stt', {
          method: 'POST',
          headers: { origin: 'https://preview.example' },
        }),
      )
    ).status,
  ).toBe(503);
  expect(mock.transcribe).not.toHaveBeenCalled();
});
it('STT rejects unsupported audio and withholds rejected transcripts, then returns safe editable text', async () => {
  const upload = (type: string) => {
    const form = new FormData();
    form.set('audio', new File(['audio'], 'svar.webm', { type }));
    return new Request('https://preview.example/api/voice/stt', {
      method: 'POST',
      headers: { origin: 'https://preview.example' },
      body: form,
    });
  };
  expect((await stt(upload('image/png'))).status).toBe(400);
  expect(mock.transcribe).not.toHaveBeenCalled();
  mock.approved.mockResolvedValue(false);
  const rejected = await stt(upload('audio/webm'));
  expect(rejected.status).toBe(400);
  expect(await rejected.text()).not.toContain('tolv');
  mock.approved.mockResolvedValue(true);
  const response = await stt(upload('audio/mp4'));
  expect(await response.json()).toEqual({ text: 'tolv' });
  expect(response.headers.get('cache-control')).toBe('no-store');
});

it('parent voice-off setting blocks both audio routes', async () => {
  mock.access.mockResolvedValue({
    profile: { ...profile, settings: { voice: false } },
  });
  expect(
    (await tts(request({ sessionId: profile.id, revision: 0, source: 'home' })))
      .status,
  ).toBe(403);
  const form = new FormData();
  form.set(
    'audio',
    new File(['test'], 'recording.webm', { type: 'audio/webm' }),
  );
  expect(
    (
      await stt(
        new Request('https://preview.example/api/voice/stt', {
          method: 'POST',
          headers: { origin: 'https://preview.example' },
          body: form,
        }),
      )
    ).status,
  ).toBe(403);
  expect(mock.transcribe).not.toHaveBeenCalled();
});
