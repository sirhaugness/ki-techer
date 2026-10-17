// Controlled local UI fixture only. Never used by Preview or model production.
import { writeFileSync } from 'node:fs';
import { productionFixture } from '../tests/chapters/fixtures/production';
import {
  chapterView,
  advanceChapter,
  initialFacts,
} from '../lib/chapters/play';
let { job } = productionFixture();
let facts = initialFacts(job);
const ready = chapterView(job, false),
  queued = {
    ...ready,
    state: 'running',
    phase: 'research',
    mission: null,
    goal: '',
    title: 'Ditt neste kapittel',
    opening: '',
    message:
      'Vi gjør hele kapittelet klart. Du kan ta en pause mens vi arbeider.',
  };
const steps = [] as { command: string; turn?: unknown; view: unknown }[];
function turn(type: string, extra: Record<string, unknown> = {}) {
  const command = { type, revision: job.play_revision, ...extra },
    next = advanceChapter(job, command, facts);
  job = next.job;
  if (next.facts) facts = next.facts;
  steps.push({ command: 'turn', turn: command, view: next.view });
}
steps.push({ command: 'start', view: chapterView(job, true) });
turn('answer', { value: '11', allocations: [] });
turn('story');
turn('hint');
turn('answer', { value: '12', allocations: [] });
turn('next');
steps.push({ command: 'pause', view: chapterView(job, false) });
steps.push({ command: 'start', view: chapterView(job, true) });
turn('answer', { value: '6', allocations: [] });
turn('next');
turn('answer', { value: '', allocations: [4, 4, 4] });
turn('next');
writeFileSync(
  process.argv[2] ?? '/tmp/r3-browser-fixture.json',
  JSON.stringify({ ready, queued, steps }),
);
