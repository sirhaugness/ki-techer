'use client';
import { useActionState } from 'react';
import { createLearner, setPin, lockLeo, unlockLeo } from './actions';
import { Button } from '@/components/ui/button';
export function LearnerForm() {
  const [state, action, pending] = useActionState(createLearner, {
    message: '',
  });
  return (
    <form action={action}>
      <label>
        Barnets fornavn
        <input name="first_name" maxLength={40} required defaultValue="Leo" />
      </label>
      <label>
        Lærerens navn
        <input name="tutor_name" maxLength={40} required defaultValue="Lumi" />
      </label>
      <label>
        Trinn
        <input
          name="grade"
          type="number"
          min={1}
          max={13}
          defaultValue={4}
          required
        />
      </label>
      <Button disabled={pending}>Opprett elevprofil</Button>
      <p role="status">{state.message}</p>
    </form>
  );
}
export function PinForm() {
  const [state, action, pending] = useActionState(setPin, { message: '' });
  return (
    <form action={action}>
      <label>
        Forelderens PIN (fire sifre)
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          autoComplete="new-password"
          required
        />
      </label>
      <Button disabled={pending}>Lagre PIN</Button>
      <p role="status">{state.message}</p>
    </form>
  );
}
export function LockForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(lockLeo, { message: '' });
  return (
    <form action={action}>
      <input name="learner_id" type="hidden" value={id} />
      <Button disabled={pending}>Start Leo-modus for {name}</Button>
      <p role="status">{state.message}</p>
    </form>
  );
}
export function UnlockForm() {
  const [state, action, pending] = useActionState(unlockLeo, { message: '' });
  return (
    <form action={action}>
      <label>
        Forelderens PIN
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          autoComplete="off"
          required
        />
      </label>
      <Button variant="outline" disabled={pending}>
        Lås opp foreldresiden
      </Button>
      <p role="status">{state.message}</p>
    </form>
  );
}
