export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { currentDevice } from '@/lib/auth/session';
import { UnlockForm } from '@/app/forelder/forms';
export default async function LeoPage() {
  const { client, device } = await currentDevice();
  if (!device?.leo_mode_locked) redirect('/forelder');
  const { data: learner } = await client
    .from('learners')
    .select('*')
    .eq('id', device.learner_id)
    .single();
  if (!learner) throw new Error('Fant ikke elevprofilen.');
  return (
    <>
      <div className="rounded-3xl bg-teal-100 p-8">
        <p className="text-6xl" aria-hidden="true">
          🌱
        </p>
        <h1 className="my-5 text-4xl font-bold">Hei, {learner.first_name}!</h1>
        <p>
          Jeg heter {learner.tutor_name}. Her skal vi utforske matte sammen.
        </p>
        <p className="mt-5">
          Matteeventyret bygges nå. Oppgaver og medaljong kommer i en senere
          milepæl.
        </p>
      </div>
      <details className="mt-12">
        <summary className="min-h-12 cursor-pointer">For forelder</summary>
        <UnlockForm />
      </details>
    </>
  );
}
