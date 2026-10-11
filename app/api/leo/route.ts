import { after } from 'next/server';
import { observations, reflectPending } from '@/lib/profile/repository';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { leoAccess } from '@/lib/learning/access';
import { fixtureEnabled, fixture } from '@/lib/learning/fixture';
import {
  createSession,
  learningTurn,
  publicView,
} from '@/lib/learning/session';
import {
  latestSession,
  insertSession,
  saveTurn,
  logAi,
} from '@/lib/learning/repository';
import { adminDb } from '@/lib/db/server';
import { openaiProvider } from '@/lib/ai/openai';
import { approved } from '@/lib/ai/moderation';
import { eventSchema } from '@/lib/learning/types';
import { authOrigin } from '@/lib/auth/origin';
import { dayKey } from '@/lib/engine/time';

export const runtime = 'nodejs';
export const maxDuration = 120;
const commandSchema = z.discriminatedUnion('command', [
  z
    .object({ command: z.literal('voiceSettings'), autoRead: z.boolean() })
    .strict(),
  z.object({
    command: z.literal('start'),
    mode: z.enum(['diagnostic', 'practice', 'master']),
    part: z.number().int().min(1).max(4).nullable(),
  }),
  z.object({
    command: z.literal('turn'),
    sessionId: z.uuid(),
    revision: z.number().int().nonnegative(),
    requestId: z.uuid(),
    event: eventSchema,
  }),
  z.object({
    command: z.literal('interest'),
    label: z.string().trim().min(1).max(40),
  }),
  z.object({
    command: z.literal('toggleInterest'),
    id: z.uuid(),
    active: z.boolean(),
  }),
  z.object({
    command: z.literal('profile'),
    tutorName: z.string().trim().min(1).max(40),
    avatar: z.enum(['spire', 'stjerne', 'fjell']),
  }),
]);
export async function POST(request: Request) {
  if (
    request.headers.get('origin') !== authOrigin(request.headers, request.url)
  )
    return Response.json(
      { message: 'Last siden på nytt før du prøver igjen.' },
      { status: 403 },
    );
  if (Number(request.headers.get('content-length') ?? 0) > 8_000)
    return Response.json(
      { message: 'Meldingen er for lang.' },
      { status: 413 },
    );
  const parsed = commandSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { message: 'Sjekk svaret og prøv igjen.' },
      { status: 400 },
    );
  try {
    const mock = fixtureEnabled(),
      f = mock ? fixture() : null;
    const access = mock ? null : await leoAccess(),
      profile = f?.profile ?? access!.profile;
    const provider =
      mock || !process.env.OPENAI_API_KEY
        ? null
        : openaiProvider((call) => logAi(profile.householdId, call));
    const cmd = parsed.data;
    if (cmd.command === 'voiceSettings') {
      const settings = {
        ...profile.settings,
        voice: true,
        auto_read: cmd.autoRead,
      };
      if (f) f.profile.settings = settings;
      else {
        const { error } = await adminDb()
          .from('learners')
          .update({ settings: settings as import('@/lib/db/types').Json })
          .eq('id', profile.id);
        if (error) throw new Error('Kunne ikke lagre talevalget.');
      }
      return Response.json({ ok: true });
    }
    const interestRows =
      f?.interests ??
      (
        await access!.client
          .from('interests')
          .select('*')
          .eq('learner_id', profile.id)
      ).data ??
      [];
    const interests = interestRows.map((i) => ({
      id: i.id,
      label: i.label,
      active: i.active,
      weight: 'weight' in i ? Number(i.weight) : 1,
    }));
    if (cmd.command === 'interest') {
      // Preset labels are trusted app content; custom text requires moderation.
      const preset = [
        'Dinosaurer',
        'Fotball',
        'Verdensrommet',
        'Dyr',
        'Bygging',
      ].includes(cmd.label);
      if (!preset && !(await approved(provider, cmd.label)))
        return Response.json(
          {
            message:
              'Den interessen kunne ikke lagres. Velg et bilde eller prøv en annen kort tekst.',
          },
          { status: 400 },
        );
      if (interests.length >= 20)
        return Response.json(
          { message: 'Du har mange interesser. Skru på en du allerede har.' },
          { status: 400 },
        );
      if (
        !interests.some(
          (i) =>
            i.label.toLocaleLowerCase('nb-NO') ===
            cmd.label.toLocaleLowerCase('nb-NO'),
        )
      ) {
        if (f)
          f.interests.push({
            id: randomUUID(),
            label: cmd.label,
            active: true,
          });
        else {
          const { error } = await adminDb().from('interests').insert({
            learner_id: profile.id,
            label: cmd.label,
            source: 'leo',
          });
          if (error) throw new Error('Kunne ikke lagre interessen.');
        }
      }
      return Response.json({ ok: true });
    }
    if (cmd.command === 'toggleInterest') {
      if (!interests.some((i) => i.id === cmd.id))
        return Response.json(
          { message: 'Fant ikke interessen.' },
          { status: 404 },
        );
      if (f)
        f.interests = f.interests.map((i) =>
          i.id === cmd.id ? { ...i, active: cmd.active } : i,
        );
      else {
        const { error } = await adminDb()
          .from('interests')
          .update({ active: cmd.active })
          .eq('id', cmd.id)
          .eq('learner_id', profile.id);
        if (error) throw new Error('Kunne ikke lagre valget.');
      }
      return Response.json({ ok: true });
    }
    if (cmd.command === 'profile') {
      if (
        cmd.tutorName !== profile.tutorName &&
        !(await approved(provider, cmd.tutorName))
      )
        return Response.json(
          {
            message: 'Lærernavnet kunne ikke lagres. Prøv et annet kort navn.',
          },
          { status: 400 },
        );
      if (f) {
        f.profile.tutorName = cmd.tutorName;
        f.profile.avatar = cmd.avatar;
      } else {
        const { error } = await adminDb()
          .from('learners')
          .update({ tutor_name: cmd.tutorName, avatar: cmd.avatar })
          .eq('id', profile.id);
        if (error) throw new Error('Kunne ikke lagre valget.');
      }
      return Response.json({ ok: true });
    }
    let state = f ? f.state : await latestSession(profile.id);
    const now = new Date().toISOString();
    if (cmd.command === 'start') {
      if (state && !state.endedAt)
        return Response.json(publicView(state), {
          headers: { 'Cache-Control': 'no-store' },
        });
      let used = 0;
      if (!mock) {
        const { data, error } = await access!.client
          .from('sessions')
          .select('*')
          .eq('learner_id', profile.id)
          .gte('started_at', new Date(Date.now() - 2 * 86400000).toISOString());
        if (error) throw new Error('Kunne ikke kontrollere dagens øvingstid.');
        used = (data ?? [])
          .filter((s) => dayKey(s.started_at) === dayKey(now))
          .reduce(
            (sum, s) =>
              sum +
              Math.min(
                s.planned_minutes,
                Math.max(
                  0,
                  (Date.parse(s.ended_at ?? now) - Date.parse(s.started_at)) /
                    60000,
                ),
              ),
            0,
          );
      }
      const mode = state?.diagnosticComplete ? cmd.mode : 'diagnostic';
      state = createSession(
        profile,
        state,
        now,
        used,
        mode,
        mode === 'diagnostic' ? null : (cmd.part as 1 | 2 | 3 | 4 | null),
      );
      if (f) f.state = state;
      else await insertSession(state, profile.id);
      return Response.json(publicView(state), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    if (!state || state.id !== cmd.sessionId)
      return Response.json(
        { message: 'Økten finnes ikke. Gå tilbake til hjemskjermen.' },
        { status: 404 },
      );
    if (state.seenEvents.includes(cmd.requestId))
      return Response.json(publicView(state));
    if (state.revision !== cmd.revision)
      return Response.json(
        { message: 'Økten er oppdatert et annet sted. Last siden på nytt.' },
        { status: 409 },
      );
    const instructions = (
      await readFile(process.cwd() + '/lib/agent/prompts/tutor.v1.md', 'utf8')
    )
      .replaceAll('{first_name}', profile.firstName)
      .replaceAll('{tutor_name}', profile.tutorName);
    const result = await learningTurn(
      state,
      cmd.event,
      cmd.requestId,
      now,
      profile,
      interests,
      provider,
      instructions,
      mock ? [] : await observations(profile.id),
    );
    if (f) {
      if (f.state?.revision !== cmd.revision)
        return Response.json(
          { message: 'Last siden på nytt.' },
          { status: 409 },
        );
      f.state = result.state;
    } else if (
      !(await saveTurn(result.state, profile.id, cmd.revision, result.events))
    )
      return Response.json(
        { message: 'Økten ble oppdatert. Last siden på nytt.' },
        { status: 409 },
      );
    if (!mock && result.state.endedAt)
      after(() => reflectPending(profile.id, profile.householdId));
    return Response.json(publicView(result.state), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      {
        message:
          'Vi kunne ikke fullføre eller lagre dette. Last siden på nytt og prøv igjen.',
      },
      { status: 503 },
    );
  }
}
