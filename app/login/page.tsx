import Link from 'next/link';
import { LoginForm } from './form';
import { configured } from '@/lib/db/server';
export default function Login() {
  return (
    <>
      <Link href="/">← Til forsiden</Link>
      <h1 className="mt-8 text-4xl font-bold">Innlogging for forelder</h1>
      <p className="my-6">
        Du får en lenke på e-post. Leo trenger ikke egen konto.
      </p>
      {!configured() && (
        <p className="rounded-xl bg-amber-100 p-4">
          Supabase er ikke koblet til ennå. Innlogging blir tilgjengelig etter
          oppsettet.
        </p>
      )}
      <LoginForm />
    </>
  );
}
