import { z } from 'zod';
import {
  getCandidates,
  validateItemRequest,
  type CandidateContext,
} from '../engine/candidates';
import { generate, type GeneratedItem } from '../engine/skills/generators';
import {
  initialState,
  proposeMastery,
  type SkillState,
} from '../engine/mastery';
import {
  progressForPart,
  startMasterTest,
  type MasterTest,
  type PartProgress,
} from '../engine/medallion';
import { validateProposal } from '../engine/validate';
import type { Rng } from '../engine/random';
import { contextualize } from '../ai/contextualize';
import { approved } from '../ai/moderation';
import type { AiProvider, ToolDefinition } from '../ai/provider';
import { representationSchema, visualSchema } from './schemas';

const empty = z.object({}).strict();
const itemArgs = z
  .object({
    skill_id: z.string(),
    vanskegrad: z.number().int().min(1).max(5),
    interesse_id: z.string().nullable(),
    representasjon: representationSchema,
    kontekst_stil: z.enum(['interessefortelling', 'ren_oppgave', 'utfordring']),
    begrunnelse: z.string().min(8).max(300),
  })
  .strict();
export const toolSchemas = {
  hent_elevstatus: empty,
  hent_kandidater: empty,
  lag_oppgave: itemArgs,
  foreslå_egen_oppgave: z
    .object({
      skill_id: z.string(),
      tekst: z.string().min(1).max(600),
      regneuttrykk: z.string().max(120),
      svar: z.number().finite(),
      representasjon: representationSchema,
    })
    .strict(),
  vis_representasjon: visualSchema,
  foreslå_mestring: z
    .object({ skill_id: z.string(), begrunnelse: z.string().min(8).max(300) })
    .strict(),
  start_mesterprøve: z
    .object({ part_id: z.number().int().min(1).max(4) })
    .strict(),
  registrer_observasjon: z
    .object({
      kategori: z.enum([
        'interesse',
        'læringspreferanse',
        'motivasjon',
        'styrke',
        'utfordring',
        'misoppfatning',
        'skolemetode',
      ]),
      tekst: z.string().min(1).max(240),
    })
    .strict(),
  noter_skoletema: z.object({ leo_sa: z.string().min(1).max(240) }).strict(),
  foreslå_pause: empty,
  avslutt_økt: empty,
};
export type ToolName = keyof typeof toolSchemas;
export const toolDefinitions: ToolDefinition[] = Object.entries(
  toolSchemas,
).map(([name, schema]) => ({
  name,
  description: `Bruk ${name}. Motorens harde regler kan aldri overstyres.`,
  parameters: z.toJSONSchema(schema),
}));
export type ActiveTask = {
  id: string;
  item: GeneratedItem;
  text: string;
  representation: z.infer<typeof representationSchema>;
  strategy: Record<string, string>;
  resolved: boolean;
};
export type AgentRuntime = {
  taskCreationAllowed?: boolean;
  masterStartAllowed?: boolean;
  context: CandidateContext;
  rng: Rng;
  uuid: () => string;
  provider: AiProvider | null;
  active: ActiveTask | null;
  states: Record<string, SkillState>;
  parts: PartProgress[];
  masterTest: MasterTest | null;
  interests: { id: string; label: string; active: boolean }[];
  usedInterests: (string | null)[];
  pendingObservations: { category: string; text: string }[];
  schoolTopics: {
    rawText: string;
    skillIds: string[];
    confidence: number;
    expiresAt: string;
  }[];
  visual: z.infer<typeof visualSchema> | null;
  ended: boolean;
  pauseOffered: boolean;
};
export type ToolResult = { ok: boolean; result: unknown };
export async function executeTool(
  runtime: AgentRuntime,
  name: string,
  args: unknown,
): Promise<ToolResult> {
  if (!(name in toolSchemas) || !Object.hasOwn(toolSchemas, name))
    return { ok: false, result: 'Ukjent verktøy.' };
  const parsed = toolSchemas[name as ToolName].safeParse(args);
  if (!parsed.success)
    return {
      ok: false,
      result: 'Ugyldige argumenter. Prøv én gang med riktig skjema.',
    };
  if (runtime.ended && name !== 'hent_elevstatus')
    return { ok: false, result: 'Økten er avsluttet.' };
  const ctx = { ...runtime.context, states: runtime.states };
  const candidates = () => getCandidates(ctx, runtime.rng);
  switch (name as ToolName) {
    case 'hent_elevstatus':
      return {
        ok: true,
        result: { parts: runtime.parts, states: runtime.states },
      };
    case 'hent_kandidater':
      return { ok: true, result: candidates() };
    case 'lag_oppgave': {
      if (runtime.taskCreationAllowed === false)
        return {
          ok: false,
          result: 'Neste oppgave velges når eleven trykker Neste oppgave.',
        };
      if (runtime.masterTest || (runtime.active && !runtime.active.resolved))
        return { ok: false, result: 'Fullfør den aktive oppgaven først.' };
      const a = itemArgs.parse(args);
      const list = candidates();
      const check = validateItemRequest(
        {
          skillId: a.skill_id,
          difficulty: a.vanskegrad,
          representation: a.representasjon,
          reason: a.begrunnelse,
        },
        ctx,
        list,
      );
      if (!check.ok) return { ok: false, result: check.reason };
      const interest = runtime.interests.find(
        (i) => i.id === a.interesse_id && i.active,
      );
      if (a.interesse_id && !interest)
        return { ok: false, result: 'Interessen er ikke aktiv.' };
      if (
        a.interesse_id &&
        runtime.usedInterests.slice(-2).length === 2 &&
        runtime.usedInterests.slice(-2).every((id) => id === a.interesse_id)
      )
        return { ok: false, result: 'Velg en annen ramme denne gangen.' };
      const item = generate(
        a.skill_id,
        a.vanskegrad as 1 | 2 | 3 | 4 | 5,
        runtime.rng,
        runtime.active?.item,
      );
      const text = await contextualize(
        runtime.provider,
        item,
        a.kontekst_stil === 'interessefortelling'
          ? (interest?.label ?? null)
          : null,
      );
      runtime.active = {
        id: runtime.uuid(),
        item,
        text,
        representation: a.representasjon,
        strategy:
          list.find((c) => c.skill_id === a.skill_id)?.anbefalt_strategi ?? {},
        resolved: false,
      };
      runtime.usedInterests.push(a.interesse_id);
      return {
        ok: true,
        result: {
          id: runtime.active.id,
          question: text,
          skill_id: item.skillId,
        },
      };
    }
    case 'foreslå_egen_oppgave': {
      if (runtime.taskCreationAllowed === false)
        return { ok: false, result: 'Fullfør denne turen først.' };
      const a = toolSchemas.foreslå_egen_oppgave.parse(args);
      const validation = validateProposal({
        skillId: a.skill_id,
        text: a.tekst,
        expression: a.regneuttrykk,
        answer: a.svar,
        representation: a.representasjon,
      });
      if (!validation.ok) return { ok: false, result: validation.reason };
      // The text must be a transparent expression question; arbitrary stories
      // cannot be proved equivalent by a numeric AST validator.
      if (a.tekst !== `Hva er ${a.regneuttrykk}?`)
        return {
          ok: false,
          result:
            'Bruk et verifiserbart uttrykkspørsmål eller generatoren for fortellinger.',
        };
      const check = validateItemRequest(
        {
          skillId: a.skill_id,
          difficulty: 3,
          representation: a.representasjon,
          reason: 'Elevens eget oppgaveønske.',
        },
        ctx,
        candidates(),
      );
      if (
        !check.ok ||
        runtime.masterTest ||
        (runtime.active && !runtime.active.resolved)
      )
        return {
          ok: false,
          result: check.ok ? 'Fullfør aktiv oppgave.' : check.reason,
        };
      if (!(await approved(runtime.provider, a.tekst)))
        return {
          ok: false,
          result: 'Oppgaven ble ikke godkjent av sikkerhetskontrollen.',
        };
      runtime.active = {
        id: runtime.uuid(),
        item: {
          skillId: a.skill_id,
          difficulty: 3,
          params: {},
          answer: a.svar,
          answerType: 'number',
          expression: a.regneuttrykk,
          question: a.tekst,
          representationHints: [a.representasjon],
          commonWrongAnswers: [],
        },
        text: a.tekst,
        representation: a.representasjon,
        strategy: {},
        resolved: false,
      };
      return { ok: true, result: { id: runtime.active.id, question: a.tekst } };
    }
    case 'vis_representasjon': {
      if (!runtime.active || runtime.masterTest)
        return { ok: false, result: 'En vanlig øvingsoppgave må være aktiv.' };
      const visual = visualSchema.parse(args);
      const params = Object.values(runtime.active.item.params);
      if (
        !params.includes(visual.data.count) ||
        !params.includes(visual.data.groups)
      )
        return {
          ok: false,
          result: 'Representasjonen må bruke tall fra oppgaven.',
        };
      runtime.visual = visual;
      return { ok: true, result: visual };
    }
    case 'foreslå_mestring': {
      const a = toolSchemas.foreslå_mestring.parse(args);
      if (!runtime.states[a.skill_id])
        return { ok: false, result: 'Ingen forsøk på ferdigheten ennå.' };
      const proposed = proposeMastery(
        runtime.states[a.skill_id] ?? initialState(),
        a.begrunnelse,
        ctx.now,
      );
      runtime.states[a.skill_id] = proposed.state;
      runtime.parts = runtime.parts.map((p) =>
        progressForPart(p.id, runtime.states, p),
      );
      return { ok: proposed.approved, result: proposed.remaining };
    }
    case 'start_mesterprøve': {
      if (runtime.masterStartAllowed === false)
        return {
          ok: false,
          result: 'Eleven velger mesterutfordringen fra kartet.',
        };
      const a = toolSchemas.start_mesterprøve.parse(args),
        progress = runtime.parts.find((p) => p.id === a.part_id);
      if (
        !progress ||
        runtime.masterTest ||
        (runtime.active && !runtime.active.resolved)
      )
        return {
          ok: false,
          result: 'Mesterutfordringen er ikke tilgjengelig.',
        };
      try {
        runtime.masterTest = startMasterTest(
          progress,
          ctx.now,
          runtime.uuid(),
          Array.from({ length: 10 }, runtime.uuid),
        );
        return { ok: true, result: runtime.masterTest };
      } catch {
        return {
          ok: false,
          result: 'Mesterutfordringen kan tas tidligst neste dag.',
        };
      }
    }
    case 'registrer_observasjon': {
      const a = toolSchemas.registrer_observasjon.parse(args);
      if (!(await approved(runtime.provider, a.tekst)))
        return { ok: false, result: 'Observasjonen ble ikke godkjent.' };
      runtime.pendingObservations.push({ category: a.kategori, text: a.tekst });
      return {
        ok: true,
        result:
          'Forslaget venter på profilfletting; endrer ikke låste eller avviste observasjoner.',
      };
    }
    case 'noter_skoletema': {
      const a = toolSchemas.noter_skoletema.parse(args);
      if (!(await approved(runtime.provider, a.leo_sa)))
        return { ok: false, result: 'Skoletemaet ble ikke godkjent.' };
      const topic = /\b(divisjon|deling|dele)\b/i.test(a.leo_sa)
        ? ['div-deling-konkret']
        : /\b(ganging|multiplikasjon|gangetabell)\b/i.test(a.leo_sa)
          ? ['mult-telling-grupper']
          : /\b(figurer|geometri|former)\b/i.test(a.leo_sa)
            ? ['figur-2d-egenskaper']
            : /\b(algoritmer|løkker|programmering)\b/i.test(a.leo_sa)
              ? ['algoritme-folg-instruksjon']
              : [];
      if (!topic.length)
        return { ok: true, result: 'Temaet er usikkert og lagres ikke.' };
      runtime.schoolTopics.push({
        rawText: a.leo_sa,
        skillIds: topic,
        confidence: 0.6,
        expiresAt: new Date(Date.parse(ctx.now) + 7 * 86400000).toISOString(),
      });
      return { ok: true, result: 'Temaet er notert for denne uken.' };
    }
    case 'foreslå_pause':
      runtime.pauseOffered = true;
      return { ok: true, result: 'Du kan ta en pause eller avslutte.' };
    case 'avslutt_økt':
      runtime.ended = true;
      return { ok: true, result: 'Økten avsluttes og lagres.' };
  }
}
