'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  browserRecorder,
  type VoiceRecorder,
  type RecordingStatus,
} from '@/lib/voice/recorder';
export function RecordButton({
  label = 'Hold for å snakke',
  onText,
  disabled = false,
}: {
  label?: string;
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<RecordingStatus>('idle'),
    [error, setError] = useState('');
  const recorder = useRef<VoiceRecorder | null>(null);
  const receive = useEffectEvent((text: string) => onText(text));
  useEffect(() => {
    const capture = browserRecorder({
      status: setStatus,
      error: setError,
      text: receive,
    });
    recorder.current = capture;
    const blur = () => capture.cancel();
    const visibility = () => {
      if (document.hidden) capture.cancel();
    };
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      capture.dispose();
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  function start() {
    if (disabled) return;
    window.dispatchEvent(new Event('leo-recording'));
    window.speechSynthesis?.cancel();
    void recorder.current?.start();
  }
  return (
    <div className="record-control">
      <button
        type="button"
        disabled={disabled || status === 'processing'}
        aria-pressed={status === 'recording'}
        className={status === 'recording' ? 'recording' : ''}
        style={{ touchAction: 'none', userSelect: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={() => recorder.current?.stop()}
        onPointerCancel={() => recorder.current?.cancel()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            recorder.current?.stop();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        🎙{' '}
        {status === 'recording'
          ? 'Snakk nå. Slipp når du er ferdig.'
          : status === 'permission'
            ? 'Tillat mikrofonen …'
            : status === 'processing'
              ? 'Vi lytter til opptaket …'
              : label}
      </button>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
