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
  view: Pick<LearningView, 'id' | 'revision' | 'speech' | 'ended' | 'task'> &
    Partial<LearningView>;
  initialAuto?: boolean;
  source?: 'home' | 'all';
}) {
  const [auto, setAuto] = useState(initialAuto),
    [enabled, setEnabled] = useState(false),
    [message, setMessage] = useState(''),
    [retry, setRetry] = useState(0);
  const key = `${source}:${view.id}:${view.revision}`;
  const player = useRef<HTMLAudioElement | null>(null),
    url = useRef<string | null>(null),
    ready = useRef<{ key: string; blob: Blob } | null>(null);
  const wanted = useRef(false),
    unavailable = useRef(false),
    autoRead = useRef(initialAuto),
    playback = useRef(0),
    utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stopped = useRef<string | null>(null),
    current = useRef(key);
  const text =
    `${view.speech} ${view.ended ? '' : (view.task?.question ?? '')}`.trim();
  const invalidatePlayback = useCallback(() => ++playback.current, []);
  const native = useCallback(() => {
    if ('speechSynthesis' in window) {
      const attempt = invalidatePlayback();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = 'nb-NO';
      utterance.rate = 0.9;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => /^nb|^no/i.test(v.lang));
      if (voice) utterance.voice = voice;
      utterance.onerror = () => {
        if (attempt === playback.current)
          setMessage(
            'Lyden kunne ikke starte. Prøv Les høyt igjen eller les teksten.',
          );
      };
      window.speechSynthesis.speak(utterance);
      setMessage('Leser med stemmen på enheten.');
    } else setMessage('Lyden er utilgjengelig. Du kan alltid lese teksten.');
  }, [text, invalidatePlayback]);
  const play = useCallback(async () => {
    const audio = player.current;
    if (!audio) return;
    if (!ready.current || ready.current.key !== key) {
      native();
      return;
    }
    window.speechSynthesis?.cancel();
    const attempt = invalidatePlayback();
    audio.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(ready.current.blob);
    audio.src = url.current;
    try {
      await audio.play();
      if (attempt === playback.current) setMessage('Leser høyt.');
    } catch {
      if (attempt === playback.current)
        setMessage('Trykk Les høyt en gang til for å starte lyden.');
    }
  }, [native, key, invalidatePlayback]);
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    player.current = audio;
    const stop = () => {
      invalidatePlayback();
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
  }, [invalidatePlayback]);
  useEffect(() => {
    if (current.current !== key) wanted.current = false;
    current.current = key;
    if (!enabled) return;
    const controller = new AbortController();
    invalidatePlayback();
    ready.current = null;
    unavailable.current = false;
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
            ready.current = { key, blob };
            if (
              (autoRead.current && stopped.current !== key) ||
              wanted.current
            ) {
              wanted.current = false;
              await play();
            }
          }
        } else if (!controller.signal.aborted) {
          unavailable.current = true;
          if ((autoRead.current && stopped.current !== key) || wanted.current) {
            wanted.current = false;
            native();
          }
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error?.name !== 'AbortError') {
          unavailable.current = true;
          if ((autoRead.current && stopped.current !== key) || wanted.current) {
            wanted.current = false;
            native();
          }
        }
      });
    return () => {
      controller.abort();
      invalidatePlayback();
    };
  }, [
    view.id,
    view.revision,
    key,
    retry,
    enabled,
    play,
    native,
    source,
    invalidatePlayback,
  ]);
  function activate() {
    stopped.current = null;
    wanted.current = true;
    invalidatePlayback();
    setEnabled(true);
    const audio = player.current;
    if (audio) {
      audio.src = silence;
      void audio.play().catch(() => {});
    }
    if (ready.current?.key === key) {
      wanted.current = false;
      void play();
    } else if (unavailable.current) {
      unavailable.current = false;
      setRetry((attempt) => attempt + 1);
      setMessage('Gjør klar lyd …');
    } else setMessage('Gjør klar lyd …');
  }
  async function toggle() {
    const value = !auto;
    autoRead.current = value;
    setAuto(value);
    if (value) activate();
    else {
      wanted.current = false;
      stopped.current = key;
      invalidatePlayback();
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
            invalidatePlayback();
            player.current?.pause();
            window.speechSynthesis?.cancel();
            stopped.current = key;
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
