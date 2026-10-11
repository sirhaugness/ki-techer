'use client';
import { useActionState } from 'react';
import { sendLink } from './actions';
import { Button } from '@/components/ui/button';
export function LoginForm() {
  const [state, action, pending] = useActionState(sendLink, { message: '' });
  return (
    <form action={action}>
      <label>
        E-postadressen din
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <Button disabled={pending}>
        {pending ? 'Sender …' : 'Send innloggingslenke'}
      </Button>
      <p role="status" className="mt-5">
        {state.message}
      </p>
    </form>
  );
}
