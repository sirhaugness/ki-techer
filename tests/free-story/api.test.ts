import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('workflow/api', () => ({ start: vi.fn() }));
import { GET, POST } from '../../app/api/free-chapters/route';
import { fixture, resetFixture } from '../../lib/learning/fixture';
import {
  chapterFixtures,
  resetChapterFixtures,
} from '../../lib/free-story/fixture';
import type { FreeStoryView } from '../../lib/free-story/types';
import { randomUUID } from 'node:crypto';

const post = (body: unknown, origin = 'http://localhost:3000') =>
  POST(
    new Request('http://localhost:3000/api/free-chapters', {
      method: 'POST',
      headers: { origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
async function view(response: Response): Promise<FreeStoryView> {
  expect(response.ok, await response.clone().text()).toBe(true);
  return (await response.json()).view;
}
beforeEach(() => {
  vi.stubEnv('E2E_LEO_FIXTURE', '1');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('APP_URL', '');
  vi.stubEnv('VERCEL_URL', '');
  resetFixture(false, true);
  resetChapterFixtures();
});
afterEach(() => vi.unstubAllEnvs());
describe('chapter HTTP contract with handwritten fixtures, no providers', () => {
  it('rejects cross-origin, unknown command fields, excess interests and oversized bodies', async () => {
    expect(
      (
        await post(
          { command: 'prepare', interests: ['Dyr'] },
          'http://evil.test',
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await post({
          command: 'prepare',
          interests: ['Dyr'],
          owner: randomUUID(),
        })
      ).status,
    ).toBe(400);
    expect(
      (await post({ command: 'prepare', interests: ['a', 'b', 'c', 'd'] }))
        .status,
    ).toBe(400);
    expect(
      (await post({ command: 'prepare', interests: ['a'.repeat(9000)] }))
        .status,
    ).toBe(413);
    expect(
      (
        await GET(
          new Request('http://localhost:3000/api/free-chapters?chapter=bad'),
        )
      ).status,
    ).toBe(400);
    expect(chapterFixtures().size).toBe(0);
  });
  it('keeps one current identity, records evidence, preserves pause and prepares exactly one next chapter', async () => {
    let current = await view(
      await post({ command: 'prepare', interests: ['Verdensrommet'] }),
    );
    const id = current.chapterId;
    expect(current.total).toBe(20);
    expect(current.available).toBe(20);
    expect(
      (await view(await post({ command: 'prepare', interests: ['Dyr'] })))
        .chapterId,
    ).toBe(id);
    current = await view(await post({ command: 'start', chapterId: id }));
    const chapter = chapterFixtures().get(id)!;
    const turn = async (event: unknown, requestId = randomUUID()) => {
      const command = {
        command: 'turn',
        chapterId: id,
        sessionId: current.sessionId,
        revision: current.revision,
        requestId,
        event,
      };
      current = await view(await post(command));
      return command;
    };
    await turn({ type: 'answer', answer: 999999 });
    await turn({ type: 'hint' });
    expect(fixture().state!.hints.level).toBeGreaterThan(0);
    await turn({ type: 'pause' });
    current = await view(await post({ command: 'start', chapterId: id }));
    expect(fixture().state!.hints.level).toBeGreaterThan(0);
    const nextIds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const command = await turn({
        type: 'answer',
        answer: chapter.slots[i].item.answer,
      });
      expect(current.solved).toBe(true);
      const revision = current.revision;
      const replay = await view(await post(command));
      expect(replay.revision).toBe(revision);
      expect(replay.task).not.toHaveProperty('answer');
      expect(replay.task).not.toHaveProperty('params');
      await turn({ type: 'next' });
      if (i < 13) expect(current.nextChapterId).toBeNull();
      else {
        expect(current.nextChapterId).toBeTruthy();
        nextIds.add(current.nextChapterId!);
      }
      if (i === 13) {
        expect(
          (await post({ command: 'start', chapterId: current.nextChapterId }))
            .status,
        ).toBe(409);
        expect(fixture().state!.freeChapter!.id).toBe(id);
      }
    }
    expect(nextIds.size).toBe(1);
    expect(chapterFixtures().size).toBe(2);
    expect(chapter.completed).toBe(true);
    expect(current.ending).toBeTruthy();
    expect(fixture().state!.history).toHaveLength(21);
    expect(
      (
        await view(
          await post({ command: 'start', chapterId: current.nextChapterId }),
        )
      ).index,
    ).toBe(0);
  });
  it('rejects stale revision and a turn for a different chapter', async () => {
    const prepared = await view(
      await post({ command: 'prepare', interests: ['Dyr'] }),
    );
    const current = await view(
      await post({ command: 'start', chapterId: prepared.chapterId }),
    );
    const base = {
      command: 'turn',
      chapterId: current.chapterId,
      sessionId: current.sessionId,
      revision: current.revision - 1,
      requestId: randomUUID(),
      event: { type: 'next' },
    };
    expect((await post(base)).status).toBe(409);
    expect((await post({ ...base, chapterId: randomUUID() })).status).toBe(404);
    expect(fixture().state!.revision).toBe(current.revision);
  });
});
