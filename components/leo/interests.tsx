'use client';
import Link from 'next/link';
import { useState } from 'react';
import { RecordButton } from './record-button';
import { useRouter } from 'next/navigation';
import type { Interest } from '@/lib/learning/types';
export function Interests({
  interests,
  tutorName,
  avatar,
  voiceEnabled = true,
}: {
  interests: Interest[];
  tutorName: string;
  avatar: string;
  voiceEnabled?: boolean;
}) {
  const [label, setLabel] = useState(''),
    [name, setName] = useState(tutorName),
    [selected, setSelected] = useState(avatar === 'ugle' ? 'spire' : avatar),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save(command: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/leo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        }),
        data = await res.json();
      setMessage(res.ok ? 'Valget ditt er lagret.' : data.message);
      if (res.ok) {
        setLabel('');
        router.refresh();
      }
    } catch {
      setMessage('Kunne ikke lagre nå. Prøv igjen.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/leo">← Tilbake til kartet</Link>
      <h1 className="my-6 text-4xl font-bold">Mine interesser</h1>
      <p>
        Velg ett eventyr. Det følger deg til du selv bytter. Du beholder alt du
        har lært i matte.
      </p>
      <p className="home-note">
        Hvis du er midt i en oppgave, fullfører du den først. Neste oppdrag
        følger det nye eventyret.
      </p>
      <div className="interest-presets">
        {[
          ['🌟', 'Star Wars'],
          ['🦕', 'Dinosaurer'],
          ['⚽', 'Fotball'],
          ['🚀', 'Verdensrommet'],
          ['🐾', 'Dyr'],
          ['🧱', 'Bygging'],
        ].map(([icon, text]) => (
          <button
            disabled={busy}
            key={text}
            onClick={() => void save({ command: 'interest', label: text })}
          >
            <span aria-hidden="true">{icon}</span>
            {text}
          </button>
        ))}
      </div>
      <div className="interest-chips">
        {interests.map((i) => (
          <button
            disabled={busy}
            key={i.id}
            aria-pressed={i.active}
            onClick={() =>
              void save({
                command: 'toggleInterest',
                id: i.id,
                active: true,
              })
            }
          >
            {i.active ? '✓ ' : ''}
            {i.label}
          </button>
        ))}
      </div>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ command: 'interest', label });
        }}
      >
        <label>
          Legg til noe annet du liker
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={40}
          />
        </label>
        {voiceEnabled && (
          <RecordButton
            label="Hold for å fortelle hva du liker"
            disabled={busy || !voiceEnabled}
            onText={(text) => setLabel(text.slice(0, 40))}
          />
        )}
        <button disabled={busy || !label.trim()}>Lagre interesse</button>
      </form>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ command: 'profile', tutorName: name, avatar: selected });
        }}
      >
        <h2>Din lærer og figur</h2>
        <label>
          Hva skal læreren hete?
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
        </label>
        <fieldset>
          <legend>Velg din figur</legend>
          <div className="button-row">
            {[
              ['🌱', 'spire'],
              ['⭐', 'stjerne'],
              ['⛰️', 'fjell'],
            ].map(([icon, value]) => (
              <button
                type="button"
                key={value}
                aria-pressed={selected === value}
                onClick={() => setSelected(value)}
              >
                {icon} {value}
              </button>
            ))}
          </div>
        </fieldset>
        <button disabled={busy || !name.trim()}>Lagre lærer og figur</button>
      </form>
      <p role="status">{message}</p>
    </>
  );
}
