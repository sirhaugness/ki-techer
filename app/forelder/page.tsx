export const dynamic = 'force-dynamic';
import { parentOnly } from '@/lib/auth/session';
import { LearnerForm, PinForm, LockForm } from './forms';
import { signOut } from './actions';
import { Button } from '@/components/ui/button';
export default async function ParentPage() {
  const { client } = await parentOnly();
  const { data: learners, error } = await client
    .from('learners')
    .select('*')
    .order('first_name');
  return (
    <>
      <h1 className="text-4xl font-bold">Foreldresiden</h1>
      <p className="my-6">Opprett en profil, velg PIN og gi enheten til Leo.</p>
      {error ? (
        <p role="alert">
          Kunne ikke hente profiler. Kontroller at migrasjonene er kjørt.
        </p>
      ) : (
        learners?.map((l) => (
          <section
            key={l.id}
            className="my-6 rounded-2xl border-2 border-teal-200 bg-white p-6"
          >
            <h2 className="mb-5 text-2xl font-bold">
              {l.first_name} · {l.grade}. trinn
            </h2>
            <LockForm id={l.id} name={l.first_name} />
          </section>
        ))
      )}
      <section className="my-8">
        <h2 className="text-2xl font-bold">Ny elevprofil</h2>
        <LearnerForm />
      </section>
      <section className="my-8">
        <h2 className="text-2xl font-bold">Leo-lås</h2>
        <PinForm />
      </section>
      <form action={signOut}>
        <Button variant="outline">Logg ut</Button>
      </form>
    </>
  );
}
