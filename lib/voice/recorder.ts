import { audioMime } from './contracts';
export type RecordingStatus =
  'idle' | 'permission' | 'recording' | 'processing';
type Recorder = {
  mimeType: string;
  start: () => void;
  stop: () => void;
  onData: (callback: (data: Blob) => void) => void;
  onStop: (callback: () => void) => void;
};
export type RecorderDependencies = {
  getStream: () => Promise<MediaStream>;
  create: (stream: MediaStream, mime: string) => Recorder;
  mime: () => string | null;
  upload: (file: File, signal: AbortSignal) => Promise<string>;
  status: (status: RecordingStatus) => void;
  text: (text: string) => void;
  error: (message: string) => void;
};
export class VoiceRecorder {
  private held = false;
  private disposed = false;
  private stream: MediaStream | null = null;
  private recorder: Recorder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  private generation = 0;
  constructor(private deps: RecorderDependencies) {}
  private release() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
  async start() {
    if (this.held || this.disposed || this.controller) return;
    this.held = true;
    const generation = ++this.generation;
    this.deps.error('');
    this.deps.status('permission');
    try {
      const mime = this.deps.mime();
      if (!mime) throw new Error('unsupported');
      const stream = await this.deps.getStream();
      if (!this.held || this.disposed || generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        if (!this.disposed && generation === this.generation)
          this.deps.status('idle');
        return;
      }
      this.stream = stream;
      const chunks: Blob[] = [];
      const recorder = this.deps.create(stream, mime);
      this.recorder = recorder;
      recorder.onData((data) => {
        if (data.size) chunks.push(data);
      });
      recorder.onStop(() => {
        if (this.disposed || generation !== this.generation) return;
        this.release();
        this.recorder = null;
        if (!chunks.length) {
          this.deps.status('idle');
          this.deps.error('Hold knappen litt lenger mens du snakker.');
          return;
        }
        this.deps.status('processing');
        const controller = new AbortController();
        this.controller = controller;
        const format = recorder.mimeType || mime;
        const file = new File(
          chunks,
          format.includes('mp4') ? 'svar.m4a' : 'svar.webm',
          { type: format },
        );
        void this.deps
          .upload(file, controller.signal)
          .then((text) => {
            if (!this.disposed && generation === this.generation)
              this.deps.text(text);
          })
          .catch((error) => {
            if (
              !this.disposed &&
              generation === this.generation &&
              error?.name !== 'AbortError'
            )
              this.deps.error(
                'Vi kunne ikke høre svaret. Prøv igjen eller bruk tastaturet.',
              );
          })
          .finally(() => {
            if (generation === this.generation) {
              this.controller = null;
              if (!this.disposed) this.deps.status('idle');
            }
          });
      });
      recorder.start();
      this.deps.status('recording');
      this.timer = setTimeout(() => this.stop(), 30_000);
    } catch (error) {
      if (generation !== this.generation) return;
      this.held = false;
      this.release();
      if (!this.disposed) {
        this.deps.status('idle');
        this.deps.error(
          error instanceof Error && error.name === 'NotAllowedError'
            ? 'Mikrofonen må tillates for å snakke. Du kan også bruke tastaturet.'
            : 'Taleopptak er ikke tilgjengelig her. Bruk tastaturet.',
        );
      }
    }
  }
  stop() {
    this.held = false;
    if (this.recorder) this.recorder.stop();
    else if (!this.disposed) this.deps.status('idle');
    this.release();
  }
  cancel() {
    this.generation++;
    this.stop();
    this.controller?.abort();
    this.controller = null;
    if (!this.disposed) this.deps.status('idle');
  }
  dispose() {
    this.disposed = true;
    this.cancel();
  }
}
export function browserRecorder(
  callbacks: Pick<RecorderDependencies, 'status' | 'text' | 'error'>,
) {
  return new VoiceRecorder({
    ...callbacks,
    mime: audioMime,
    getStream: () => navigator.mediaDevices.getUserMedia({ audio: true }),
    create(stream, mime) {
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      return {
        mimeType: recorder.mimeType,
        start: () => recorder.start(250),
        stop: () => {
          if (recorder.state !== 'inactive') recorder.stop();
        },
        onData: (callback) =>
          recorder.addEventListener('dataavailable', (e) => callback(e.data)),
        onStop: (callback) => recorder.addEventListener('stop', callback),
      };
    },
    async upload(file, signal) {
      const form = new FormData();
      form.set('audio', file);
      const response = await fetch('/api/voice/stt', {
        method: 'POST',
        body: form,
        signal,
      });
      const data = await response.json();
      if (!response.ok || typeof data.text !== 'string')
        throw new Error('transcription');
      return data.text;
    },
  });
}
