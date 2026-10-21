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
import { eventSchema } from '@/lib/prepared/contracts';
import { preparedTurn, preparedView, startPrepared } from '@/lib/prepared/play';
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
        view: preparedView(c.state),
        itemId: c.state?.preparedChapter?.itemId ?? null,
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
          (cmd.switchFromPrevious && !previous.preparedActive))
      ) {
        const ended = {
          ...previous,
          endedAt: now,
          preparedActive: false,
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
      const state = startPrepared(
        c.profile,
        previous,
        now,
        c.mock ? 0 : await usedMinutes(c.profile.id, now),
      );
      if (c.mock) c.f!.state = state;
      else if (state.id !== c.state?.id)
        await insertSession(state, c.profile.id);
      return Response.json(
        { view: preparedView(state), itemId: state.preparedChapter!.itemId },
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
        { view: preparedView(state), itemId: state.preparedChapter?.itemId },
        { headers },
      );
    if (
      !state.preparedActive ||
      state.revision !== cmd.revision ||
      state.preparedChapter?.itemId !== cmd.itemId
    )
      return Response.json(
        { message: 'Oppgaven er endret. Hent siste fremdrift.' },
        { status: 409, headers },
      );
    const needsTeacher = cmd.event.type === 'probe' || cmd.event.type === 'ask';
    const provider =
      needsTeacher && !c.mock
        ? await controlledProvider(c.profile.householdId, {
            sessionId: state.id,
          })
        : null;
    const instructions = needsTeacher
      ? await readFile(
          process.cwd() + '/lib/agent/prompts/prepared-tutor.v1.md',
          'utf8',
        )
      : '';
    const result = await preparedTurn({
      state,
      event: cmd.event,
      requestId: cmd.requestId,
      itemId: cmd.itemId,
      now,
      provider,
      instructions,
    });
    if (c.mock) {
      if (c.f!.state?.revision !== cmd.revision)
        return Response.json(
          { message: 'Økten er endret. Hent siste fremdrift.' },
          { status: 409, headers },
        );
      c.f!.state = result.state;
    } else if (
      !(await saveTurn(result.state, c.profile.id, cmd.revision, result.events))
    )
      return Response.json(
        {
          message: 'En annen handling ble lagret først. Hent siste fremdrift.',
        },
        { status: 409, headers },
      );
    return Response.json(
      {
        view: preparedView(result.state),
        itemId: result.state.preparedChapter!.itemId,
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
