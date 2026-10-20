import { z } from 'zod';
import { answerSchema, checkAnswer } from '../engine/skills/generators';
import { arithmeticValue, verifyGeneratedItem } from '../engine/verified-item';
import { parse } from 'mathjs';
import type {
  ApprovedMission,
  MathSlot,
  StoryHeader,
  StoryMission,
} from './types';

export const CHAPTER_LIMIT_NOK = 1;
export const CHAPTER_DEADLINE_MS = 90_000;
const short = z.string().trim().min(1).max(320);
export const headerSchema = z
  .object({
    title: z.string().trim().min(1).max(90),
    summary: short,
    setting: z.string().trim().min(1).max(90),
    opening: short,
    ending: short,
  })
  .strict();
export const missionSchema = z
  .object({
    slotId: z.string(),
    skillId: z.string(),
    difficulty: z.number().int().min(1).max(5),
    text: short,
    place: z.string().trim().min(1).max(90),
    art: z.enum(['none', 'forest', 'harbor', 'workshop', 'space']),
    question: short,
    expression: z.string().max(120).nullable(),
    answer: answerSchema,
    hint: z.string().trim().min(1).max(180),
    success: short,
    retry: z.string().trim().min(1).max(180),
  })
  .strict();
export const chapterResponseSchema = z
  .object({
    ...headerSchema.shape,
    missions: z.array(missionSchema).min(20).max(25),
  })
  .strict();
const normalize = (s: string) =>
  s.normalize('NFKC').toLocaleLowerCase('nb-NO').replace(/\s+/g, ' ').trim();
export const sentences = (s: string) =>
  s
    .split(/(?<=[.!?])\s+|\n+/u)
    .map(normalize)
    .filter(Boolean);
const canonicalExpression = (s: string | null) =>
  s
    ?.replaceAll(/[×·]/g, '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-')
    .replaceAll(/\s+/g, '') ?? null;
const childText = (m: StoryMission) =>
  [m.text, m.question, m.hint, m.success, m.retry].join('\n');
const forbidden =
  /oppdraget venter|som en (?:ki|språkmodell)|https?:|<script|sk-proj-/i;
const artWords = {
  forest: /skog|tre|lund/i,
  harbor: /havn|brygge|kai/i,
  workshop: /verksted/i,
  space: /rom|planet|stjerne/i,
};

export function validHeader(
  raw: unknown,
  interests: string[],
): StoryHeader | null {
  const p = headerSchema.safeParse(raw);
  if (
    !p.success ||
    !/\bLeo\b/u.test(p.data.opening) ||
    !interests.some((i) =>
      normalize(p.data.opening + ' ' + p.data.title).includes(normalize(i)),
    ) ||
    forbidden.test(JSON.stringify(p.data))
  )
    return null;
  const seen = new Set<string>();
  for (const sentence of sentences(p.data.opening + '\n' + p.data.ending)) {
    if (seen.has(sentence)) return null;
    seen.add(sentence);
  }
  return p.data;
}
export function missionIssues(
  raw: unknown,
  slot: MathSlot,
  used: Set<string>,
): string[] {
  const p = missionSchema.safeParse(raw);
  if (!p.success) return ['Fyll alle oppdragsfelt med korte, gyldige verdier.'];
  const m = p.data,
    item = slot.item,
    issues: string[] = [];
  if (normalize(m.question) !== normalize(item.question))
    issues.push(
      'Behold motorens spørsmål uendret; knytt handlingen til regningen i sceneteksten.',
    );
  if (
    m.slotId !== slot.id ||
    m.skillId !== item.skillId ||
    m.difficulty !== item.difficulty
  )
    issues.push('Behold matteplassens id, ferdighet og vanskegrad.');
  if (
    !verifyGeneratedItem(item) ||
    !checkAnswer(item, m.answer) ||
    canonicalExpression(m.expression) !== canonicalExpression(item.expression)
  )
    issues.push('Kopier motorens uttrykk og kontrollerte svar uendret.');
  if (item.expression && typeof item.answer === 'number') {
    try {
      if (
        arithmeticValue(parse(canonicalExpression(m.expression)!)) !==
        item.answer
      )
        issues.push('Uttrykket gir feil svar.');
    } catch {
      issues.push('Ugyldig regneuttrykk.');
    }
  }
  if (!/\bLeo\b/u.test(m.text))
    issues.push('Leo må være den som handler i teksten.');
  if (
    [m.text, m.question, m.hint, m.success, m.retry].some(
      (t) => t.split(/\s+/).length > 55,
    ) ||
    forbidden.test(childText(m))
  )
    issues.push('Bruk korte, konkrete norske setninger uten fylltekst.');
  // Known data may be restated, but no new numeric data or early answer.
  const givens = new Set(item.question.match(/\d+(?:[.,]\d+)?/g) ?? []);
  const questionNumbers = new Set(m.question.match(/\d+(?:[.,]\d+)?/g) ?? []);
  if (
    [...questionNumbers].some((n) => !givens.has(n)) ||
    [...givens].some((n) => !questionNumbers.has(n))
  )
    issues.push('Behold alle motorens gitte tall i spørsmålet, uten nye tall.');
  const beforeAnswer = [m.text, m.place, m.hint, m.retry].join(' ');
  if (
    typeof item.answer === 'number' &&
    !givens.has(String(item.answer)) &&
    (beforeAnswer.match(/\d+(?:[.,]\d+)?/g) ?? []).some(
      (n) => Number(n.replace(',', '.')) === item.answer,
    )
  )
    issues.push('Ikke røp fasit før oppgaven er løst.');
  if (
    typeof item.answer === 'string' &&
    normalize(beforeAnswer).includes(normalize(item.answer))
  )
    issues.push('Ikke røp svaralternativet før oppgaven er løst.');
  const own = new Set<string>();
  for (const s of sentences(childText(m))) {
    if (used.has(s) || own.has(s))
      issues.push('En setning gjentas; skriv den om.');
    own.add(s);
  }
  return [...new Set(issues)];
}
export function approveMission(
  raw: unknown,
  slot: MathSlot,
  used: Set<string>,
): ApprovedMission | null {
  if (missionIssues(raw, slot, used).length) return null;
  const m = missionSchema.parse(raw);
  // Uncertain art is omitted, never replaced by an unrelated default scene.
  if (m.art !== 'none' && !artWords[m.art].test(m.place)) m.art = 'none';
  return { ...m, source: 'model' };
}
export function reserveHeader(interests: string[]): StoryHeader {
  const setting = interests.join(' og ');
  return {
    title: `Leo utforsker ${setting}`,
    setting,
    summary: `Leo utforsker ${setting} og løser matematikk underveis.`,
    opening: `Leo vil undersøke ${setting} og finne en vei videre.`,
    ending: `Leo har fullført reisen gjennom ${setting} og funnet løsningene sine.`,
  };
}
export function reserveMission(
  slot: MathSlot,
  setting: string,
): ApprovedMission {
  const n = slot.index + 1,
    item = slot.item;
  return {
    slotId: slot.id,
    skillId: item.skillId,
    difficulty: item.difficulty,
    text: `Ved stopp ${n} i ${setting} undersøker Leo tallene før han går videre.`,
    place: setting,
    art: 'none',
    question: `Stopp ${n}: ${item.question.replace(/[.!?](?=\s|$)/g, ',').replace(/,+$/, '')}?`,
    expression: item.expression,
    answer: item.answer,
    hint: `For stopp ${n} kan du tegne det oppgaven forteller og markere det du skal finne.`,
    success: `Leo har kontrollert løsningen ved stopp ${n} i ${setting} og kan fortsette reisen.`,
    retry: `Ved stopp ${n} undersøker Leo regningen en gang til med deg.`,
    source: 'generator',
  };
}

/** Incremental lexical parser. Only complete objects/strings are emitted; braces
 * inside escaped strings never terminate a mission. Bounded input, linear scan. */
export class ChapterFragments {
  private text = '';
  private stack: string[] = [];
  private quoted = false;
  private escaped = false;
  private stringStart = 0;
  private lastString = '';
  private key: string | null = null;
  private missionStart = -1;
  private header: Record<string, string> = {};
  push(delta: string): { header: Record<string, string>; missions: unknown[] } {
    if (this.text.length + delta.length > 256_000)
      throw Error('Kapittelresponsen er for stor.');
    const offset = this.text.length;
    this.text += delta;
    const missions: unknown[] = [];
    for (let i = offset; i < this.text.length; i++) {
      const c = this.text[i];
      if (this.quoted) {
        if (this.escaped) {
          this.escaped = false;
          continue;
        }
        if (c === '\\') {
          this.escaped = true;
          continue;
        }
        if (c === '"') {
          this.quoted = false;
          this.lastString = this.text.slice(this.stringStart, i + 1);
          if (
            this.stack.length === 1 &&
            this.key &&
            ['title', 'summary', 'setting', 'opening', 'ending'].includes(
              this.key,
            )
          )
            this.header[this.key] = JSON.parse(this.lastString);
        }
        continue;
      }
      if (c === '"') {
        this.quoted = true;
        this.stringStart = i;
        continue;
      }
      if (c === ':' && this.stack.length === 1) {
        this.key = JSON.parse(this.lastString);
        continue;
      }
      if (c === ',' && this.stack.length === 1) {
        this.key = null;
        continue;
      }
      if (c === '{' || c === '[') {
        if (
          c === '{' &&
          this.key === 'missions' &&
          this.stack.length === 2 &&
          this.stack[1] === '['
        )
          this.missionStart = i;
        this.stack.push(c);
        continue;
      }
      if (c === '}' || c === ']') {
        const open = this.stack.pop();
        if (open !== (c === '}' ? '{' : '['))
          throw Error('Ugyldig JSONstruktur.');
        if (c === '}' && this.stack.length === 2 && this.missionStart >= 0) {
          missions.push(JSON.parse(this.text.slice(this.missionStart, i + 1)));
          this.missionStart = -1;
        }
      }
    }
    return { header: { ...this.header }, missions };
  }
}

export type ChapterSource = (
  phase: 'generate' | 'repair',
  input: unknown,
  signal: AbortSignal,
) => AsyncIterable<string>;
export type SafetyValidator = (
  value: StoryHeader | StoryMission,
  kind: 'header' | 'mission',
  signal: AbortSignal,
) => Promise<boolean>;

function immutable<T>(value: T): T {
  const copy = structuredClone(value);
  const freeze = (v: unknown) => {
    if (v && typeof v === 'object') {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(copy);
  return copy;
}
/** Neither a pending next() nor iterator.return() may hold the worker open. */
function untilAbort<T>(
  pending: PromiseLike<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(new Error('Chapter phase timed out.'));
    };
    const cleanup = () => signal.removeEventListener('abort', abort);
    Promise.resolve(pending).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}
class PublicationError extends Error {
  constructor(cause: unknown) {
    super('Kapittellagringen ble ikke bekreftet før fristen.', { cause });
  }
}
export async function produceChapter(input: {
  slots: MathSlot[];
  interests: string[];
  previousSummary: string;
  currentPreview?: string;
  deadline: number;
  source: ChapterSource;
  now?: () => number;
  validateSafety?: SafetyValidator;
  publish: (
    header: StoryHeader,
    missions: ApprovedMission[],
    done: boolean,
  ) => Promise<void>;
}) {
  const now = input.now ?? Date.now,
    started = now();
  const deadline = Math.min(input.deadline, started + CHAPTER_DEADLINE_MS);
  if (
    new Set(input.slots.map((s) => s.id)).size !== input.slots.length ||
    input.slots.some((s) => !verifyGeneratedItem(s.item))
  )
    throw Error(
      'Matteplassene må ha unike id-er og verifiserte motoroppgaver.',
    );
  const slots = new Map(input.slots.map((slot) => [slot.id, slot]));
  const candidates = new Map<string, unknown>();
  const safe = new Map<string, unknown>();
  const duplicates = new Set<string>();
  const used = new Set<string>();
  let header: StoryHeader | null = null;
  const published: ApprovedMission[] = [];
  let rawHeader: Record<string, string> = {},
    checkedHeader = '',
    headerRejected = false;
  const issuesFor = (slot: MathSlot, seen = used) => [
    ...missionIssues(candidates.get(slot.id), slot, seen),
    ...(duplicates.has(slot.id)
      ? ['Matteplassen forekommer flere ganger.']
      : []),
    ...(candidates.has(slot.id) && safe.get(slot.id) !== candidates.get(slot.id)
      ? ['Oppdraget er ikke sikkerhetsgodkjent.']
      : []),
  ];
  const publishPrefix = async (signal: AbortSignal) => {
    if (!header) return;
    while (published.length < input.slots.length) {
      const slot = input.slots[published.length];
      if (!candidates.has(slot.id) || issuesFor(slot).length) break;
      const mission = immutable(
        approveMission(candidates.get(slot.id), slot, used)!,
      );
      try {
        await untilAbort(
          Promise.resolve().then(() =>
            input.publish(header!, immutable([...published, mission]), false),
          ),
          signal,
        );
      } catch (error) {
        throw new PublicationError(error);
      }
      // Only acknowledged writes become the local immutable prefix. An
      // uncertain late write is recovered by storage, never replaced here.
      published.push(mission);
      sentences(childText(mission)).forEach((s) => used.add(s));
    }
  };
  const safety = async (
    value: StoryHeader | StoryMission,
    kind: 'header' | 'mission',
    signal: AbortSignal,
  ) => {
    if (!input.validateSafety) return true;
    try {
      return (
        (await untilAbort(
          Promise.resolve().then(() =>
            input.validateSafety!(immutable(value), kind, signal),
          ),
          signal,
        )) === true
      );
    } catch {
      return false;
    }
  };
  const stream = async (
    phase: 'generate' | 'repair',
    payload: unknown,
    maxMs: number,
    repairIds?: Set<string>,
  ) => {
    // Keep the last five seconds for the final durable fallback write.
    const remaining = Math.min(maxMs, deadline - now() - 5_000);
    if (remaining <= 0) return;
    const phaseDeadline = now() + remaining;
    const parser = new ChapterFragments(),
      controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    let iterator: AsyncIterator<string> | undefined;
    try {
      iterator = input
        .source(phase, payload, controller.signal)
        [Symbol.asyncIterator]();
      const received = new Set<string>();
      while (!controller.signal.aborted && now() < phaseDeadline) {
        const next = await untilAbort(
          Promise.resolve().then(() => iterator!.next()),
          controller.signal,
        );
        if (next.done || controller.signal.aborted || now() >= phaseDeadline)
          break;
        const chunk = parser.push(next.value);
        if (!header) {
          rawHeader = chunk.header;
          const signature = JSON.stringify(rawHeader);
          if (
            signature !== checkedHeader &&
            Object.keys(rawHeader).length === 5
          ) {
            checkedHeader = signature;
            const parsed = validHeader(rawHeader, input.interests);
            if (
              parsed &&
              (await safety(parsed, 'header', controller.signal)) &&
              !controller.signal.aborted &&
              now() < phaseDeadline
            ) {
              header = immutable(parsed);
              sentences(header.opening + '\n' + header.ending).forEach((s) =>
                used.add(s),
              );
            } else headerRejected = true;
          }
        }
        for (const raw of chunk.missions) {
          if (controller.signal.aborted || now() >= phaseDeadline) break;
          const id = (raw as { slotId?: unknown })?.slotId;
          if (
            typeof id !== 'string' ||
            !slots.has(id) ||
            published.some((m) => m.slotId === id) ||
            (repairIds && !repairIds.has(id))
          )
            continue;
          if (received.has(id)) {
            duplicates.add(id);
            continue;
          }
          received.add(id);
          if (phase === 'repair') duplicates.delete(id);
          candidates.set(id, raw);
          safe.delete(id);
          const approved = approveMission(raw, slots.get(id)!, new Set());
          if (
            approved &&
            (await safety(approved, 'mission', controller.signal)) &&
            !controller.signal.aborted &&
            now() < phaseDeadline
          )
            safe.set(id, raw);
        }
        await publishPrefix(controller.signal);
      }
    } catch (error) {
      if (error instanceof PublicationError) throw error;
      /* Keep approved fragments; provider/JSON/safety failures use fallback. */
    } finally {
      clearTimeout(timer);
      controller.abort();
      // Async generators can queue return() behind a next() that never resolves.
      try {
        void Promise.resolve(iterator?.return?.()).catch(() => {});
      } catch {
        /* Best-effort cleanup only. */
      }
    }
  };
  await stream(
    'generate',
    {
      interests: input.interests,
      previousSummary: input.previousSummary,
      currentPreview: input.currentPreview,
      slots: input.slots,
    },
    65_000,
  );
  const reviewUsed = new Set(used);
  const errors = input.slots
    .slice(published.length)
    .filter((slot) => candidates.has(slot.id))
    .flatMap((slot) => {
      const issues = issuesFor(slot, reviewUsed);
      if (!issues.length)
        sentences(
          childText(missionSchema.parse(candidates.get(slot.id))),
        ).forEach((s) => reviewUsed.add(s));
      return issues.length
        ? [{ slotId: slot.id, issues, draft: candidates.get(slot.id) }]
        : [];
    });
  if ((errors.length || (!header && headerRejected)) && now() < deadline) {
    const repairIds = new Set(errors.map((e) => e.slotId));
    await stream(
      'repair',
      {
        interests: input.interests,
        header: header ? undefined : rawHeader,
        errors,
        slots: input.slots.filter((s) => repairIds.has(s.id)),
      },
      20_000,
      repairIds,
    );
  }
  header ??= immutable(reserveHeader(input.interests));
  for (const slot of input.slots.slice(published.length)) {
    const mission = !issuesFor(slot).length
      ? approveMission(candidates.get(slot.id), slot, used)
      : null;
    const approved = immutable(
      mission ??
        reserveMission(slot, published.at(-1)?.place ?? header.setting),
    );
    published.push(approved);
    sentences(childText(approved)).forEach((s) => used.add(s));
  }
  const result = { header, missions: immutable(published) };
  const remaining = deadline - now();
  if (remaining <= 0)
    throw new PublicationError(new Error('Absolutt kapittelfrist utløpt.'));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    await untilAbort(
      Promise.resolve().then(() =>
        input.publish(result.header, result.missions, true),
      ),
      controller.signal,
    );
  } catch (error) {
    throw new PublicationError(error);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  return result;
}
