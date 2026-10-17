import { demoChapter } from '../../../lib/chapters/demo-chapter';
import { artwork, type ArtworkId } from '../../../lib/chapters/artwork';
import {
  readyManifest,
  type ProblemOption,
} from '../../../lib/chapters/production';
import { materializeProblem } from '../../../lib/chapters/compile';
import { storyQuantities } from '../../../lib/chapters/generator-v1/story-problem';
import type { ChapterJob } from '../../../lib/chapters/production-contracts';
import { asJson } from '../../../lib/learning/repository';
export function productionFixture() {
  const p = structuredClone(demoChapter),
    id = '00000000-0000-4000-8000-000000000001',
    saga = '00000000-0000-4000-8000-000000000002';
  p.id = `chapter-${id}`;
  p.sagaId = `saga-${saga}`;
  const assets: Record<string, string> = {
    'cove-art': 'harbor-sky',
    'post-carrier': 'person',
    envelope: 'letter',
    mailbox: 'box',
  };
  const map = (id: string) => assets[id] ?? id;
  p.assets = p.assets.map((a) => ({
    id: map(a.id),
    role: a.role,
    description: artwork[map(a.id) as ArtworkId].description,
  }));
  p.actors = p.actors.map((a) => ({ ...a, assetId: map(a.assetId) }));
  const menu: ProblemOption[] = [];
  for (const n of p.nodes)
    if (n.kind === 'mission')
      for (const v of n.variants) {
        v.scene.backgroundAssetId = map(v.scene.backgroundAssetId);
        v.scene.objects = v.scene.objects.map((o) => ({
          ...o,
          assetId: map(o.assetId),
        }));
        menu.push({
          problem: v.problem,
          quantities: storyQuantities(materializeProblem(v)),
          interaction: v.scene.interaction as ProblemOption['interaction'],
        });
      }
  const first = p.nodes.find((n) => n.kind === 'mission')!;
  if (first.kind === 'mission')
    first.goal = 'Hver lykt må få lyssteiner før postbåten kan finne leia.';
  const job: ChapterJob = {
    id,
    household_id: '00000000-0000-4000-8000-000000000003',
    learner_id: '00000000-0000-4000-8000-000000000004',
    saga_id: saga,
    chapter_number: 1,
    based_on_revision: 0,
    seed: 10,
    phase: 'ready',
    state: 'ready',
    data: asJson({
      interest: p.interest,
      facts: {},
      packet: p,
      manifest: readyManifest(p),
      menu,
      mode: 'model',
    }),
    owner: null,
    lease_until: null,
    workflow_run_id: null,
    error_code: null,
    progress: asJson({
      nodeId: null,
      solved: false,
      completed: [],
      choices: [],
      hintLevel: 0,
      failures: 0,
    }),
    play_revision: 0,
    play_done: false,
    created_at: '2026-10-16T10:00:00Z',
    updated_at: '2026-10-16T10:00:00Z',
  };
  return { packet: p, job, menu };
}
