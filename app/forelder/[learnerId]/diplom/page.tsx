import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dashboard } from '@/lib/parent/repository';
import { text, num } from '@/lib/parent/contracts';
import { partTitles } from '@/components/leo/art';
import { PrintButton } from '@/components/parent/print-button';
export const dynamic = 'force-dynamic';
export default async function Diploma({
  params,
  searchParams,
}: {
  params: Promise<{ learnerId: string }>;
  searchParams: Promise<{ part?: string }>;
}) {
  const { learnerId } = await params,
    { part } = await searchParams,
    data = await dashboard(learnerId);
  const awarded = data.parts.filter((p) => p.awarded_at);
  const whole = part === 'all';
  const item = awarded.find((p) => String(p.part_id) === part);
  if ((whole && awarded.length !== 4) || (!whole && !item)) notFound();
  const awardedAt = whole
    ? awarded
        .map((p) => text(p, 'awarded_at'))
        .sort()
        .at(-1)!
    : text(item!, 'awarded_at');
  return (
    <>
      <nav className="print-hide">
        <Link href={`/forelder/${learnerId}`}>Tilbake til foreldresiden</Link>
      </nav>
      <PrintButton />
      <section className="diploma">
        <p className="diploma-star" aria-hidden="true">
          ✦
        </p>
        <h1>Mattemedaljongen</h1>
        <p>Diplom til</p>
        <h2>{text(data.learner, 'first_name')}</h2>
        <p>
          {whole
            ? 'Hele medaljongen for 4. trinn'
            : `Del ${num(item!, 'part_id')}: ${partTitles[num(item!, 'part_id') - 1]}`}
        </p>
        <p>
          Du prøvde, utforsket og holdt ut.
          <br />
          Du viste at du kan bruke det du har lært.
        </p>
        <p>
          {new Date(awardedAt).toLocaleDateString('nb-NO', {
            timeZone: 'Europe/Oslo',
            dateStyle: 'long',
          })}
        </p>
        <p>Leo-læreren · Matematikk etter LK20</p>
      </section>
    </>
  );
}
