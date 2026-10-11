'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function DeleteAccount() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <details className="parent-dashboard card">
      <summary>Slett forelders innloggingskonto</summary>
      <p>
        Dette sletter din innloggingskonto og alle husholdningens læringsdata,
        PIN og private lydfiler. Andre foreldres innloggingskontoer beholdes.
        Sletting kan ikke angres.
      </p>
      <label>
        Skriv SLETT KONTO for å bekrefte
        <input
          value={confirmation}
          autoComplete="off"
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </label>
      <button
        disabled={busy || confirmation !== 'SLETT KONTO'}
        onClick={async () => {
          setBusy(true);
          setMessage('');
          try {
            const result = await fetch('/api/parent/account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ confirmation }),
            });
            const value = await result.json();
            if (!result.ok) throw new Error(value.message);
            router.replace('/login');
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Sletting feilet.');
          } finally {
            setBusy(false);
          }
        }}
      >
        Slett konto og appdata
      </button>
      {message && <p role="alert">{message}</p>}
    </details>
  );
}
