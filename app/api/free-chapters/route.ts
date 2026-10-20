import { start } from 'workflow/api';
import { z } from 'zod';
import { authOrigin } from '@/lib/auth/origin';
import { boundedJson } from '@/lib/security/body';
import { allowDevice } from '@/lib/security/limits';
import { leoAccess } from '@/lib/learning/access';
import { fixture, fixtureEnabled } from '@/lib/learning/fixture';
import { latestSession, saveTurn } from '@/lib/learning/repository';
import { emptyEvents } from '@/lib/learning/types';
import { controlledProvider } from '@/lib/ai/control';
import { answerSchema } from '@/lib/engine/skills/generators';
import { mayContinue } from '@/lib/engine/session';
import { chapterFixtures, prepareFixture } from '@/lib/free-story/fixture';
import { productionSafetyCheck } from '@/lib/free-story/provider';
import {
  startStorySession,
  storyTurn,
  freeStoryView,
} from '@/lib/free-story/play';
import {
  loadChapter,
  currentChapter,
  nextChapter,
  prepareChapter,
  finishReserve,
  commitStory,
  insertStory,
  latestStorySession,
  usedMinutes,
} from '@/lib/free-story/store';
import { freeChapterWorkflow } from '@/workflows/free-chapter';
import type { FreeChapter, StorySession } from '@/lib/free-story/types';

export const runtime = 'nodejs';
export const maxDuration = 120;
const schema = z.discriminatedUnion('command', [
  z
    .object({
      command: z.literal('prepare'),
      interests: z.array(z.string().trim().min(1).max(40)).min(1).max(3),
    })
    .strict(),
  z.object({ command: z.literal('start'), chapterId: z.uuid() }).strict(),
  z
    .object({
      command: z.literal('turn'),
      chapterId: z.uuid(),
      sessionId: z.uuid(),
      revision: z.number().int().nonnegative(),
      requestId: z.uuid(),
      event: z.discriminatedUnion('type', [
        z.object({ type: z.literal('answer'), answer: answerSchema }).strict(),
        z.object({ type: z.literal('hint') }).strict(),
        z
          .object({
            type: z.literal('ask'),
            text: z.string().trim().min(1).max(600),
          })
          .strict(),
        z.object({ type: z.literal('next') }).strict(),
        z.object({ type: z.literal('pause') }).strict(),
      ]),
    })
    .strict(),
]);
const headers = { 'Cache-Control': 'private, no-store' };
const reply = (view: ReturnType<typeof freeStoryView> | null) =>
  Response.json({ view }, { headers });
async function context() {
  const mock = fixtureEnabled(),
    f = mock ? fixture() : null,
    access = mock ? null : await leoAccess();
  const profile = f?.profile ?? access!.profile,
    state = f ? f.state : await latestSession(profile.id);
  const load = async (id: string) =>
    mock ? (chapterFixtures().get(id) ?? null) : loadChapter(id, profile.id);
  const next = async (c: FreeChapter) =>
    mock
      ? ([...chapterFixtures().values()].find((n) => n.previous_id === c.id) ??
        null)
      : nextChapter(c);
  const current = async () =>
    mock
      ? state?.freeChapter
        ? await load(state.freeChapter.id)
        : ([...chapterFixtures().values()].find((c) => !c.previous_id) ?? null)
      : currentChapter(profile.id, state);
  const prepare = async (
    interests: string[],
    parent: FreeChapter | null,
    planningState = state,
  ) => {
    const chapter = mock
      ? await prepareFixture(interests, parent)
      : await prepareChapter(profile, planningState, interests, parent);
    if (!mock && chapter.status === 'queued') {
      try {
        await start(freeChapterWorkflow, [chapter.id], { region: 'arn1' });
      } catch {
        /* Persisted identity survives queue failure. Deadline read supplies reserve. */
      }
    }
    return chapter;
  };
  const view = async (c: FreeChapter, s = state) =>
    freeStoryView(
      c,
      s?.freeChapter?.id === c.id
        ? (s as StorySession)
        : mock
          ? null
          : await latestStorySession(profile.id, c.id),
      new Date().toISOString(),
      (await next(c))?.id ?? null,
    );
  return {
    mock,
    f,
    access,
    profile,
    state,
    load,
    next,
    current,
    prepare,
    view,
  };
}
export async function GET(request: Request) {
  try {
    const c = await context(),
      id = new URL(request.url).searchParams.get('chapter');
    if (id && !z.uuid().safeParse(id).success)
      return Response.json(
        { message: 'Ugyldig kapittel.' },
        { status: 400, headers },
      );
    let chapter = id ? await c.load(id) : await c.current();
    if (!chapter) return reply(null);
    if (!c.mock) chapter = await finishReserve(chapter);
    return reply(await c.view(chapter));
  } catch {
    return Response.json(
      { message: 'Kunne ikke hente eventyret. Prøv igjen.' },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  if (
    request.headers.get('origin') !== authOrigin(request.headers, request.url)
  )
    return Response.json(
      { message: 'Last siden på nytt.' },
      { status: 403, headers },
    );
  const body = await boundedJson(request);
  if (body.tooLarge)
    return Response.json(
      { message: 'Meldingen er for lang.' },
      { status: 413, headers },
    );
  const parsed = schema.safeParse(body.value);
  if (!parsed.success)
    return Response.json(
      { message: 'Sjekk svaret og prøv igjen.' },
      { status: 400, headers },
    );
  try {
    const c = await context(),
      cmd = parsed.data,
      now = new Date().toISOString();
    if (
      !c.mock &&
      !(await allowDevice(c.access!.device.id, c.profile.householdId, 'leo'))
    )
      return Response.json(
        { message: 'Ta en liten pause og prøv igjen om ett minutt.' },
        { status: 429, headers },
      );
    if (cmd.command === 'prepare') {
      const current = await c.current();
      if (current && !current.completed)
        return reply(
          await c.view(c.mock ? current : await finishReserve(current)),
        );
      const interests = [
        ...new Map(
          cmd.interests.map((label) => [
            label.normalize('NFKC').toLocaleLowerCase('nb-NO'),
            label,
          ]),
        ).values(),
      ];
      const custom = interests.filter(
        (i) =>
          ![
            'Verdensrommet',
            'Dinosaurer',
            'Dyr',
            'Bygging',
            'Fotball',
            'Star Wars',
          ].includes(i),
      );
      if (
        custom.length &&
        !c.mock &&
        !(await productionSafetyCheck(
          custom.join('\n'),
          AbortSignal.timeout(5000),
        ))
      )
        return Response.json(
          {
            message:
              'Velg en interesse fra knappene, eller prøv en annen kort tekst.',
          },
          { status: 400, headers },
        );
      return reply(await c.view(await c.prepare(interests, current)));
    }
    let chapter = await c.load(cmd.chapterId);
    if (!chapter)
      return Response.json(
        { message: 'Fant ikke kapitlet.' },
        { status: 404, headers },
      );
    if (!c.mock) chapter = await finishReserve(chapter);
    if (cmd.command === 'start') {
      if (
        chapter.previous_id &&
        !(await c.load(chapter.previous_id))?.completed
      )
        throw Error(
          'Fullfør kapitlet du spiller før du starter fortsettelsen.',
        );
      if (!chapter.missions.length) return reply(await c.view(chapter, null));
      if (c.state && !c.state.endedAt && mayContinue(c.state.clock, now)) {
        if (c.state.freeChapter?.id === chapter.id)
          return reply(await c.view(chapter));
        throw Error(
          'Ta pause i økten på kartet før du starter dette kapitlet.',
        );
      }
      if (c.state && !c.state.endedAt) {
        const expired = {
          ...c.state,
          endedAt: now,
          revision: c.state.revision + 1,
        };
        if (c.f) c.f.state = expired;
        else if (c.state.freeChapter)
          await commitStory(
            expired,
            c.profile.id,
            c.state.revision,
            emptyEvents(),
          );
        else if (
          !(await saveTurn(
            expired,
            c.profile.id,
            c.state.revision,
            emptyEvents(),
          ))
        )
          throw Error('Økten er oppdatert. Last siden på nytt.');
      }
      const result = startStorySession(
        chapter,
        c.profile,
        c.state,
        now,
        c.mock ? 0 : await usedMinutes(c.profile.id, now),
        c.mock ? null : await latestStorySession(c.profile.id, chapter.id),
      );
      if (c.f) c.f.state = result.state;
      else await insertStory(result.state, c.profile.id, result.events);
      return reply(await c.view(chapter, result.state));
    }
    if (
      !c.state ||
      c.state.id !== cmd.sessionId ||
      c.state.freeChapter?.id !== chapter.id
    )
      return Response.json(
        { message: 'Økten er endret. Last siden på nytt.' },
        { status: 409, headers },
      );
    if (c.state.seenEvents.includes(cmd.requestId))
      return reply(await c.view(chapter));
    if (c.state.revision !== cmd.revision)
      return Response.json(
        { message: 'Handlingen er allerede oppdatert. Last siden på nytt.' },
        { status: 409, headers },
      );
    const provider =
      !c.mock && ['hint', 'ask'].includes(cmd.event.type)
        ? await controlledProvider(c.profile.householdId, {
            sessionId: c.state.id,
          })
        : null;
    const result = await storyTurn(
      chapter,
      c.state as StorySession,
      cmd.event,
      cmd.requestId,
      now,
      c.profile,
      provider,
      'Du er en varm mattelærer for Leo, ni år. Gi ett kort steg på bokmål. Behold oppgaven og ikke røp svaret. Historien og matten er allerede bestemt.',
    );
    if (c.f) {
      c.f.state = result.state;
      if (result.completed) chapter.completed = true;
    } else
      await commitStory(
        result.state,
        c.profile.id,
        cmd.revision,
        result.events,
      );
    // Stable parent identity is independent of subsequent answer revisions.
    if (
      result.state.freeChapter.index / chapter.slots.length >= 0.7 &&
      !(await c.next(chapter))
    )
      await c.prepare(chapter.interests, chapter, result.state);
    return reply(await c.view(chapter, result.state));
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Handlingen kunne ikke lagres.',
      },
      { status: 409, headers },
    );
  }
}
