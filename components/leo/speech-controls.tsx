'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import type { LearningView } from '@/lib/learning/types';
const silence =
  'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';
export function SpeechControls({
  view,
  initialAuto = false,
  source = 'all',
}: {
  view: LearningView;
  initialAuto?: boolean;
  source?: 'home' | 'all';
}) {
  const [auto, setAuto] = useState(initialAuto),
    [enabled, setEnabled] = useState(false),
    [message, setMessage] = useState('');
  const player = useRef<HTMLAudioElement | null>(null),
    url = useRef<string | null>(null),
    ready = useRef<{ revision: number; blob: Blob } | null>(null);
  const wanted = useRef(false),
    unavailable = useRef(false);
  const stopped = useRef<number | null>(null),
    current = useRef(view.revision);
  const text =
    `${view.speech} ${view.ended ? '' : (view.task?.question ?? '')}`.trim();
  const native = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nb-NO';
      utterance.rate = 0.9;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => /^nb|^no/i.test(v.lang));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
      setMessage('Leser med stemmen på enheten.');
    } else setMessage('Lyden er utilgjengelig. Du kan alltid lese teksten.');
  }, [text]);
  const play = useCallback(async () => {
    const audio = player.current;
    if (!audio) return;
    if (!ready.current || ready.current.revision !== view.revision) {
      native();
      return;
    }
    window.speechSynthesis?.cancel();
    audio.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(ready.current.blob);
    audio.src = url.current;
    try {
      await audio.play();
      setMessage('Leser høyt.');
    } catch {
      setMessage('Trykk Les høyt en gang til for å starte lyden.');
    }
  }, [native, view.revision]);
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    player.current = audio;
    const stop = () => {
      audio.pause();
      stopped.current = current.current;
      wanted.current = false;
      window.speechSynthesis?.cancel();
    };
    window.addEventListener('leo-recording', stop);
    return () => {
      stop();
      audio.removeAttribute('src');
      audio.load();
      if (url.current) URL.revokeObjectURL(url.current);
      window.removeEventListener('leo-recording', stop);
    };
  }, []);
  useEffect(() => {
    current.current = view.revision;
    if (!enabled) return;
    const controller = new AbortController();
    ready.current = null;
    player.current?.pause();
    window.speechSynthesis?.cancel();
    void fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: view.id,
        revision: view.revision,
        source,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.ok) {
          const blob = await response.blob();
          if (!controller.signal.aborted) {
            ready.current = { revision: view.revision, blob };
            if ((auto && stopped.current !== view.revision) || wanted.current) {
              wanted.current = false;
              await play();
            }
          }
        } else if (!controller.signal.aborted) {
          unavailable.current = true;
          if ((auto && stopped.current !== view.revision) || wanted.current) {
            wanted.current = false;
            native();
          }
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          unavailable.current = true;
          if ((auto && stopped.current !== view.revision) || wanted.current) {
            wanted.current = false;
            native();
          }
        }
      });
    return () => controller.abort();
  }, [view.id, view.revision, auto, enabled, play, native, source]);
  function activate() {
    stopped.current = null;
    wanted.current = true;
    setEnabled(true);
    const audio = player.current;
    if (audio) {
      audio.src = silence;
      void audio.play().catch(() => {});
    }
    if (ready.current?.revision === view.revision) {
      wanted.current = false;
      void play();
    } else if (unavailable.current) {
      wanted.current = false;
      native();
    } else setMessage('Gjør klar lyd …');
  }
  async function toggle() {
    const value = !auto;
    setAuto(value);
    if (value) activate();
    else {
      wanted.current = false;
      stopped.current = view.revision;
      player.current?.pause();
      window.speechSynthesis?.cancel();
    }
    try {
      const response = await fetch('/api/leo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'voiceSettings', autoRead: value }),
      });
      if (!response.ok) throw new Error('settings');
    } catch {
      setMessage('Valget gjelder nå, men kunne ikke lagres til neste økt.');
    }
  }
  return (
    <div className="speech-controls">
      <div className="button-row">
        <button type="button" onClick={activate}>
          🔊 Les høyt
        </button>
        <button
          type="button"
          onClick={() => {
            player.current?.pause();
            window.speechSynthesis?.cancel();
            stopped.current = view.revision;
            wanted.current = false;
            setMessage('Opplesingen er stoppet.');
          }}
        >
          Stopp opplesing
        </button>
        <button type="button" aria-pressed={auto} onClick={() => void toggle()}>
          Auto-opplesing: {auto ? 'på' : 'av'}
        </button>
      </div>
      {auto && !enabled && (
        <p>Trykk Les høyt for å aktivere lyd på denne enheten.</p>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
