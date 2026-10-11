import { redirect } from 'next/navigation';
import { dashboard } from '@/lib/parent/repository';
import { parentFixture } from '@/lib/parent/fixture';
import { fixtureEnabled } from '@/lib/learning/fixture';
import { ParentDashboard } from '@/components/parent/dashboard';
export const dynamic = 'force-dynamic';
export default async function LearnerDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ learnerId: string }>;
  searchParams: Promise<{ offset?: string; fixture?: string }>;
}) {
  const { learnerId } = await params,
    query = await searchParams;
  const offset = Math.max(
    0,
    Math.min(100000, Math.floor(Number(query.offset) || 0)),
  );
  if (fixtureEnabled() && query.fixture === 'reset') {
    parentFixture(true);
    redirect(`/forelder/${learnerId}`);
  }
  const data = await dashboard(learnerId, offset);
  return (
    <ParentDashboard
      data={data}
      offset={offset}
      now={new Date().toISOString()}
    />
  );
}
