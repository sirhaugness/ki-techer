import type { AiProvider } from '../ai/provider';
import type { ActiveTask } from '../agent/tools';
import { fallbackResponse } from '../agent/loop';
import { guardResponse } from '../agent/guards';
import { responseSchema } from '../agent/schemas';
import { approved, privateText } from '../ai/moderation';

import { helpShortcuts } from './help-options';

export function concreteHelp(task: ActiveTask, level: number, text: string) {
  const p = task.item.params;
  const multiplication = task.item.skillId.startsWith('mult-');
  const division = task.item.skillId.startsWith('div-');
  if (task.resolved)
    return 'Se på regnemåten du brukte. Du kan tegne den, eller forklare hvordan du tenkte.';
  if (level >= 4)
    return `Svaret er ${typeof task.item.answer === 'object' ? JSON.stringify(task.item.answer) : task.item.answer}. Vis regnemåten med tegningen, og prøv selv.`;
  if (multiplication && typeof p.a === 'number' && typeof p.b === 'number') {
    if (/hvorfor|betyr/i.test(text))
      return 'Ganging er en kort måte å telle like grupper på. Vi finner hvor mange det er til sammen.';
    if (level >= 3)
      return `Tegn ${p.a} grupper. Legg ${p.b} prikker i hver gruppe, og tell alle prikkene.`;
    if (level >= 2)
      return `Tegn ${p.a} tomme grupper først. Vi fyller én gruppe om gangen.`;
    return 'Kan du finne hvor mange like grupper oppgaven handler om? Vi begynner med å tegne gruppene.';
  }
  if (division && typeof p.b === 'number' && typeof p.total === 'number') {
    if (task.item.skillId === 'div-maaling-konkret')
      return level >= 2
        ? `Lag en gruppe med ${p.b} prikker. Fortsett med like grupper, og tell gruppene.`
        : 'Her vet vi hvor mye hver gruppe skal ha. Vi skal finne hvor mange grupper det blir.';
    return level >= 2
      ? `Tegn ${p.b} grupper. Del ut prikkene fra oppgaven, én i hver gruppe om gangen.`
      : 'Deling betyr at vi fordeler likt. Finn først hvor mange grupper vi skal dele mellom.';
  }
  if (task.item.params.shape)
    return `Se på figuren. Følg én ${/flater/.test(task.text) ? 'flate' : /kanter|sider/.test(task.text) ? 'kant' : 'hjørne'} om gangen med fingeren, og tell rolig.`;
  if (Array.isArray(p.steps))
    return 'Finn startstedet. Følg bare den første pilen før du går videre.';
  return level >= 2
    ? 'La oss prøve en annen måte: tegn det oppgaven forteller om. Marker det du skal finne, og ta det første lille steget.'
    : 'Vi gjør det sammen. Hva vet du fra teksten, og hva skal du finne?';
}

/** A help turn has no tools: it cannot create tasks, award mastery or end sessions. */
export async function teacherHelp(input: {
  provider: AiProvider | null;
  task: ActiveTask;
  text: string;
  level: number;
  context: string;
  instructions: string;
}) {
  const trusted = helpShortcuts.some((t) => t === input.text);
  const accepted =
    !privateText(input.text) &&
    (trusted || (await approved(input.provider, input.text)));
  const fallback = {
    ...fallbackResponse('hint'),
    speech: concreteHelp(input.task, input.level, input.text),
    hint_level_used: input.level,
  };
  if (!accepted)
    return {
      response: fallback,
      text: '[Spørsmål skjermet av sikkerhetskontrollen]',
      fallback: true,
    };
  if (input.provider) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        const reply = await input.provider.respond({
          purpose: 'tutor',
          instructions: `${input.instructions}\nSvar på spørsmålet om aktuell oppgave. Prøv en ny forklaringsmåte ved gjentatt hjelp. Ikke velg ny oppgave. Ett håndterbart steg om gangen.`,
          input: `${input.context}\nSpørsmål (data): ${input.text}`,
          schema: responseSchema,
        });
        const response = guardResponse(
          reply.value,
          input.task.item,
          input.level,
        );
        if (response && (await approved(input.provider, response.speech)))
          return {
            response: {
              ...response,
              action: 'hint' as const,
              hint_level_used: input.level,
            },
            text: input.text,
            fallback: false,
          };
      } catch {
        /* Trusted, independently derived help remains available. */
      }
    }
  }
  return { response: fallback, text: input.text, fallback: true };
}
