import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { authOrigin } from '@/lib/auth/origin';
import { boundedJson } from '@/lib/security/body';
import { allowDevice } from '@/lib/security/limits';
import { leoAccess } from '@/lib/learning/access';
import { fixture, fixtureEnabled } from '@/lib/learning/fixture';
import {
  insertSession,
  latestSession,
  saveTurn,
} from '@/lib/learning/repository';
import { emptyEvents } from '@/lib/learning/types';
import { usedMinutes } from '@/lib/free-story/store';
import { mayContinue } from '@/lib/engine/session';
import { controlledProvider } from '@/lib/ai/control';
import { eventSchema } from '@/lib/star-wars/contracts';
import { missions } from '@/lib/star-wars/content';
import {
  adventureTurn,
  adventureView,
  startAdventure,
} from '@/lib/star-wars/play';
export const runtime = 'nodejs';
export const maxDuration = 60;
const schema = z.discriminatedUnion('command', [
  z
    .object({
      command: z.literal('start'),
      switchFromPrevious: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      command: z.literal('turn'),
      sessionId: z.uuid(),
      itemId: z.uuid(),
      revision: z.number().int().nonnegative(),
      requestId: z.uuid(),
      event: eventSchema,
    })
    .strict(),
]);
const headers = { 'Cache-Control': 'private, no-store' };
async function context() {
  const mock = fixtureEnabled(),
    f = mock ? fixture() : null,
    access = mock ? null : await leoAccess();
  const profile = f?.profile ?? access!.profile,
    state = f ? f.state : await latestSession(profile.id);
  return { mock, f, access, profile, state };
}
export async function GET() {
  try {
    const c = await context();
    return Response.json(
      {
        view: adventureView(c.state),
        itemId: c.state?.starWars?.itemId ?? null,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { message: 'Kunne ikke hente stjerneoppdraget.' },
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
      (cmd.command !== 'turn' || cmd.event.type !== 'work') &&
      !(await allowDevice(c.access!.device.id, c.profile.householdId, 'leo'))
    )
      return Response.json(
        { message: 'Ta en liten pause før neste handling.' },
        { status: 429, headers },
      );
    if (cmd.command === 'start') {
      let previous = c.state;
      if (
        previous &&
        !previous.endedAt &&
        (!mayContinue(previous.clock, now) ||
          (cmd.switchFromPrevious && !previous.starWarsActive))
      ) {
        const ended = {
          ...previous,
          endedAt: now,
          starWarsActive: false,
          revision: previous.revision + 1,
        };
        if (
          !c.mock &&
          !(await saveTurn(
            ended,
            c.profile.id,
            previous.revision,
            emptyEvents(),
          ))
        )
          throw Error('Økten er endret. Last siden på nytt.');
        if (c.mock) c.f!.state = ended;
        previous = ended;
      }
      const state = startAdventure(
        c.profile,
        previous,
        now,
        c.mock ? 0 : await usedMinutes(c.profile.id, now),
      );
      if (c.mock) c.f!.state = state;
      else if (state.id !== c.state?.id)
        await insertSession(state, c.profile.id);
      return Response.json(
        { view: adventureView(state), itemId: state.starWars!.itemId },
        { headers },
      );
    }
    const state = c.state;
    if (!state || state.id !== cmd.sessionId)
      return Response.json(
        { message: 'Denne økten er ikke aktiv. Hent siste fremdrift.' },
        { status: 409, headers },
      );
    // Idempotence is checked before a provider can be called, even after a lost response.
    if (state.seenEvents.includes(cmd.requestId))
      return Response.json(
        { view: adventureView(state), itemId: state.starWars?.itemId },
        { headers },
      );
    if (
      !state.starWarsActive ||
      state.revision !== cmd.revision ||
      state.starWars?.itemId !== cmd.itemId
    )
      return Response.json(
        { message: 'Oppgaven er endret. Hent siste fremdrift.' },
        { status: 409, headers },
      );
    const needsTeacher = cmd.event.type === 'ask';
    // Claim a paid help request durably before contacting the provider. A lost
    // response can replay this safe hint; it must never buy the same turn twice.
    // If the worker stops, the learner can still continue from this saved state.
    let reserved: typeof state | null = null;
    if (needsTeacher && !c.mock && mayContinue(state.clock, now)) {
      if (state.starWars!.status === 'correct')
        throw Error('Dette oppdraget er allerede løst.');
      reserved = structuredClone(state);
      const progress = reserved.starWars!;
      progress.assisted = true;
      progress.helpLevel = Math.max(1, progress.helpLevel);
      progress.teacher =
        missions[progress.index].hints[Math.min(progress.helpLevel - 1, 2)];
      progress.source = 'fallback';
      reserved.revision++;
      reserved.seenEvents = [...reserved.seenEvents, cmd.requestId].slice(-50);
      if (
        !(await saveTurn(reserved, c.profile.id, state.revision, emptyEvents()))
      )
        return Response.json(
          {
            message:
              'En annen handling ble lagret først. Hent siste fremdrift.',
          },
          { status: 409, headers },
        );
    }
    const provider =
      needsTeacher && !c.mock && mayContinue(state.clock, now)
        ? await controlledProvider(c.profile.householdId, {
            sessionId: state.id,
          })
        : null;
    const instructions = needsTeacher
      ? await readFile(
          process.cwd() + '/lib/agent/prompts/force-tutor.v1.md',
          'utf8',
        )
      : '';
    const result = await adventureTurn({
      state,
      event: cmd.event,
      requestId: cmd.requestId,
      itemId: cmd.itemId,
      now,
      provider,
      instructions,
    });
    if (reserved) result.state.revision = reserved.revision + 1;
    if (c.mock) {
      if (c.f!.state?.revision !== cmd.revision)
        return Response.json(
          { message: 'Økten er endret. Hent siste fremdrift.' },
          { status: 409, headers },
        );
      c.f!.state = result.state;
    } else if (
      !(await saveTurn(
        result.state,
        c.profile.id,
        reserved?.revision ?? cmd.revision,
        result.events,
      ))
    ) {
      if (reserved) {
        const latest = await latestSession(c.profile.id);
        return Response.json(
          { view: adventureView(latest), itemId: latest?.starWars?.itemId },
          { headers },
        );
      }
      return Response.json(
        {
          message: 'En annen handling ble lagret først. Hent siste fremdrift.',
        },
        { status: 409, headers },
      );
    }
    return Response.json(
      {
        view: adventureView(result.state),
        itemId: result.state.starWars!.itemId,
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Handlingen kunne ikke lagres.',
      },
      { status: 400, headers },
    );
  }
}
