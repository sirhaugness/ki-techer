import { boundedJson } from '@/lib/security/body';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authOrigin } from '@/lib/auth/origin';
import { parentCommand } from '@/lib/parent/contracts';
import { parentLearner, clearHousehold } from '@/lib/parent/repository';
import { parentFixture } from '@/lib/parent/fixture';
import { adminDb } from '@/lib/db/server';
import { asJson } from '@/lib/learning/repository';
export const maxDuration = 120;
export async function POST(request: Request) {
  if (
    request.headers.get('origin') !== authOrigin(request.headers, request.url)
  )
    return Response.json({ message: 'Last siden på nytt.' }, { status: 403 });
  const body = await boundedJson(request);
  if (body.tooLarge)
    return Response.json(
      { message: 'Meldingen er for lang.' },
      { status: 413 },
    );
  const parsed = parentCommand.safeParse(body.value);
  if (!parsed.success)
    return Response.json(
      { message: 'Sjekk feltene og prøv igjen.' },
      { status: 400 },
    );
  const cmd = parsed.data;
  try {
    const access = await parentLearner(cmd.learnerId);
    if (access.mock) {
      const d = parentFixture();
      if (cmd.action === 'profile') {
        const existing = cmd.id
          ? d.observations.find((o) => o.id === cmd.id)
          : null;
        if (cmd.id && !existing) throw new Error('Fant ikke observasjonen.');
        if (existing)
          Object.assign(existing, {
            category: cmd.category,
            text: cmd.text,
            status: cmd.status,
          });
        else
          d.observations.push({
            id: randomUUID(),
            category: cmd.category,
            text: cmd.text,
            status: cmd.status,
            confidence: 1,
            evidence: { session_ids: [] },
          });
      } else if (cmd.action === 'seenPart') {
        const p = d.parts.find(
          (p) => String(p.part_id) === cmd.id && p.awarded_at,
        );
        if (!p) throw new Error('Fant ikke delen.');
        p.parent_seen = true;
      } else if (cmd.action === 'seenFlag') {
        const f = d.flags.find((f) => f.id === cmd.id);
        if (!f) throw new Error('Fant ikke flagget.');
        f.reviewed = true;
      } else if (cmd.action === 'settings') {
        d.learner.settings = cmd.settings;
        d.learner.grade = cmd.settings.grade;
      } else if (cmd.action === 'clearData') {
        d.sessions = [];
        d.flags = [];
        d.observations = [];
        d.states = [];
        d.parts = [];
      }
      return Response.json({
        message:
          cmd.action === 'clearData'
            ? 'Læringsdata er slettet. Innloggingskontoen beholdes.'
            : 'Valget er lagret.',
      });
    }
    const db = adminDb();
    if (cmd.action === 'profile') {
      const { error, data } = await db.rpc('edit_parent_profile', {
        target_learner: cmd.learnerId,
        observation_id: cmd.id,
        category: cmd.category,
        observation_text: cmd.text,
        desired_status: cmd.status,
      });
      if (error || !data)
        throw new Error(
          'Kunne ikke lagre observasjonen. Maks 25 aktive eller låste observasjoner.',
        );
    } else if (cmd.action === 'settings') {
      const { grade, ...settings } = cmd.settings;
      const { error } = await db
        .from('learners')
        .update({
          grade,
          settings: asJson({
            ...(access.learner.settings as object),
            ...settings,
          }),
        })
        .eq('id', cmd.learnerId)
        .eq('household_id', access.householdId);
      if (error) throw new Error('Kunne ikke lagre innstillingene.');
    } else if (cmd.action === 'seenPart') {
      const id = z.coerce.number().int().min(1).max(4).parse(cmd.id);
      const { data, error } = await db
        .from('medallion_progress')
        .update({ parent_seen: true })
        .eq('learner_id', cmd.learnerId)
        .eq('part_id', id)
        .not('awarded_at', 'is', null)
        .select('part_id');
      if (error || !data?.length) throw new Error('Fant ikke en tildelt del.');
    } else if (cmd.action === 'seenFlag') {
      const id = z.uuid().parse(cmd.id);
      const { data, error } = await db
        .from('safety_flags')
        .update({ reviewed: true })
        .eq('learner_id', cmd.learnerId)
        .eq('id', id)
        .select('id');
      if (error || !data?.length) throw new Error('Fant ikke flagget.');
    } else if (cmd.action === 'resetDiagnostic') {
      const { data, error } = await db.rpc('reset_diagnostic', {
        target_learner: cmd.learnerId,
      });
      if (error || !data)
        throw new Error('Avslutt den aktive økten før ny kartlegging.');
    } else if (cmd.action === 'pruneLogs') {
      const { error } = await db.rpc('prune_logs', {
        target_learner: cmd.learnerId,
        months: cmd.months,
      });
      if (error) throw new Error('Kunne ikke rydde gamle logger.');
    } else if (cmd.action === 'clearData') {
      await clearHousehold(access.householdId);
      return Response.json({
        message:
          'Alle læringsdata, lyd, PIN og forbrukslogger er slettet for husholdningen. Innloggingskontoen beholdes.',
      });
    }
    return Response.json(
      { message: 'Valget er lagret.' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return Response.json(
      {
        message:
          e instanceof Error && !e.message.includes('REDIRECT')
            ? e.message
            : 'Logg inn som forelder og lås opp med PIN først.',
      },
      { status: 400 },
    );
  }
}
