import type { GeneratedItem } from './skills/generators';
import { missionMath } from './mission';
import { verifyGeneratedItem } from './verified-item';

/** Named, verified quantities let the model write natural situations without supplying a key. */
export function storyQuantities(item: GeneratedItem): Record<string, number> {
  const m = missionMath(item);
  if (m.kind === 'groups')
    return { groups: m.groups, each: m.each, a: m.groups, b: m.each };
  if (m.kind === 'share')
    return { total: m.total, groups: m.groups, b: m.groups };
  if (m.kind === 'measure')
    return { total: m.total, capacity: m.each, b: m.each };
  if (m.kind === 'missing')
    return { total: m.total, known: m.known, c: m.known };
  if (m.kind === 'double')
    return m.mode === 'doble'
      ? { amount: m.known, a: m.known }
      : { amount: m.total, total: m.total };
  const p = item.params;
  const number = (name: string) => Number(p[name]);
  if (item.skillId === 'div-med-rest')
    return { total: number('total'), b: number('b') };
  if (item.skillId === 'hverdag-handel')
    return { budget: number('budget'), a: number('a'), b: number('b') };
  if (item.skillId === 'hverdag-ukjent')
    return { total: number('a') * number('b'), b: number('b') };
  if (['vurdere-modell', 'forklare-tenkemaate'].includes(item.skillId))
    return { total: number('total'), b: number('b') };
  if (item.skillId === 'mult-kommutativ-strategi')
    return { a: number('a'), b: number('b') };
  if (item.skillId === 'fire-regnearter-sammenheng')
    return p.operation === '-'
      ? { total: number('a') + number('b'), b: number('b') }
      : p.operation === '/'
        ? { total: number('a') * number('b'), b: number('b') }
        : { a: number('a'), b: number('b') };
  return Object.fromEntries(
    Object.entries(item.params).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  );
}
export function bindStoryProblem(
  template: string,
  item: GeneratedItem,
): string {
  if (!verifyGeneratedItem(item)) throw new Error('Ugyldig matematikk.');
  const quantities = storyQuantities(item);
  const result = template.replaceAll(/\{\{([a-z]+)\}\}/g, (_, name: string) => {
    if (!(name in quantities)) throw new Error(`Ukjent mengde: ${name}`);
    return String(quantities[name]);
  });
  if (/[{}]/.test(result)) throw new Error('Ugyldig mengdefelt.');
  return result;
}
export function validateStoryProblem(
  template: string,
  item: GeneratedItem,
): boolean {
  try {
    bindStoryProblem(template, item);
    // Character names may contain digits; all mathematical quantities must be bound.
    let unbound = template
      .replaceAll(/[‐‑–—]/g, '-')
      .replaceAll(/BB-?8|R2(?:-?D2)?|C-?3PO|T-65/gi, '');
    // The dimension in a geometry label is a verified property, not a task quantity.
    if (item.skillId === 'figur-3d-kanter-hjorner-flater')
      unbound = unbound.replaceAll(/\b3D/gi, '');
    if (item.skillId === 'figur-2d-egenskaper')
      unbound = unbound.replaceAll(/\b2D/gi, '');
    if (/\d/.test(unbound)) return false;
    const names = new Set(
      [...template.matchAll(/\{\{([a-z]+)\}\}/g)].map((m) => m[1]),
    );
    const m = missionMath(item);
    const aliases = (first: string, second: string) =>
      names.has(first) || names.has(second);
    if (m.kind === 'groups')
      return aliases('groups', 'a') && aliases('each', 'b');
    if (m.kind === 'share' || m.kind === 'measure')
      return (
        names.has('total') && (aliases('groups', 'b') || names.has('capacity'))
      );
    if (m.kind === 'missing')
      return names.has('total') && aliases('known', 'c');
    if (m.kind === 'double')
      return (
        names.has('amount') ||
        (m.mode === 'doble' ? names.has('a') : names.has('total'))
      );
    return Object.keys(storyQuantities(item)).every((key) => names.has(key));
  } catch {
    return false;
  }
}

/** An optional example from the verified question, never from the hidden answer. */
export function storyProblemExample(item: GeneratedItem): string | undefined {
  const quantities = Object.entries(storyQuantities(item));
  const template = item.question.replace(/\b\d+\b/g, (number) => {
    const field = quantities.find(([, value]) => value === Number(number));
    return field ? `{{${field[0]}}}` : number;
  });
  return validateStoryProblem(template, item) ? template : undefined;
}
