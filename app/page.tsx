export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { configured } from '@/lib/db/server';
import { currentDevice } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/server';
export default async function Home() {
  if (configured()) {
    const {
      data: { user },
    } = await (await db()).auth.getUser();
    if (user) {
      const { device } = await currentDevice();
      redirect(device?.leo_mode_locked ? '/leo' : '/forelder');
    }
  }
  return (
    <>
      <div className="mb-8 text-6xl" aria-hidden="true">
        🌱
      </div>
      <p className="mb-3 font-semibold text-teal-700">ET LITE MATTEEVENTYR</p>
      <h1 className="text-5xl font-bold">Leo-læreren</h1>
      <p className="my-8 leading-relaxed">
        Små steg. Gode spørsmål. Tid til å forstå.
      </p>
      <Link
        href="/login"
        className="inline-flex min-h-12 items-center rounded-xl bg-teal-800 px-6 py-4 font-bold text-white no-underline"
      >
        Kom i gang som forelder
      </Link>
      <p className="mt-8 text-base">
        Første versjon: innlogging, elevprofil og Leo-lås. Matteøkter kommer
        senere.
      </p>
    </>
  );
}
