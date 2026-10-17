import 'server-only';
import { generate } from './generator-v1/skills/generators';
import { seededRng } from './generator-v1/random';
import type { MissionVariant } from './contracts';
import { verifyGeneratedItem } from './generator-v1/verified-item';
import {
  bindStoryProblem,
  storyQuantities,
  validateStoryProblem,
} from './generator-v1/story-problem';
import {
  chapterPackageSchema,
  chapterProgressSchema,
  identifyInterest,
  sagaFactsSchema,
  tutorStateSchema,
  type ChapterPackage,
  type PublicMission,
} from './contracts';

/** Version 1 uses the existing seeded engine; old packages must retain this generator version. */
export function materializeProblem(variant: MissionVariant) {
  const ref = variant.problem;
  return generate(
    ref.skillId,
    ref.difficulty as 1 | 2 | 3 | 4 | 5,
    seededRng(ref.seed),
  );
}

const unique = (values: string[]) => new Set(values).size === values.length;
function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Validates references and verified math; deliberately does not declare a story ready. */
export function validateChapterPackage(input: unknown): ChapterPackage {
  const chapter = chapterPackageSchema.parse(input);
  requireValid(
    chapter.interest.key === identifyInterest(chapter.interest.label).key,
    'Interesseidentiteten er ikke normalisert.',
  );
  const nodeIds = chapter.nodes.map((n) => n.id),
    locationIds = chapter.locations.map((l) => l.id),
    actorIds = chapter.actors.map((a) => a.id),
    assetIds = chapter.assets.map((a) => a.id);
  for (const values of [nodeIds, locationIds, actorIds, assetIds])
    requireValid(unique(values), 'Referanser må ha unike ID-er.');
  requireValid(nodeIds.includes(chapter.entryNodeId), 'Startpunktet mangler.');
  requireValid(
    chapter.nodes.some((n) => n.kind === 'mission'),
    'Kapittelet må ha minst ett oppdrag.',
  );
  for (const actor of chapter.actors)
    requireValid(
      chapter.assets.some(
        (a) => a.id === actor.assetId && a.role === 'character',
      ),
      'Figuren mangler en karakterressurs.',
    );
  const edges = new Map<string, string[]>();
  for (const node of chapter.nodes) {
    const next =
      node.kind === 'ending'
        ? []
        : node.kind === 'choice'
          ? node.options.map((o) => o.next)
          : [node.next];
    requireValid(
      next.every((id) => nodeIds.includes(id)),
      'Fortsettelsen viser til en ukjent hendelse.',
    );
    edges.set(node.id, next);
    if (node.kind === 'choice')
      requireValid(
        unique(node.options.map((o) => o.id)),
        'Valgene trenger unike ID-er.',
      );
    if (node.kind !== 'mission') continue;
    requireValid(
      unique(node.variants.map((v) => v.id)),
      'Variantene trenger unike ID-er.',
    );
    requireValid(
      node.variants.filter((v) => v.role === 'primary').length === 1,
      'Oppdraget trenger én hovedvariant.',
    );
    for (const variant of node.variants) {
      const scene = variant.scene,
        item = materializeProblem(variant);
      requireValid(verifyGeneratedItem(item), 'Ugyldig matematikk.');
      requireValid(
        validateStoryProblem(
          `${variant.questionTemplate} ${variant.clueTemplate}`,
          item,
        ),
        'Spørsmålet må bruke kontrollerte gitte mengder.',
      );
      requireValid(locationIds.includes(scene.locationId), 'Ukjent sted.');
      requireValid(
        unique(scene.actorIds) &&
          scene.actorIds.every((id) => actorIds.includes(id)),
        'Ukjente eller gjentatte figurer.',
      );
      requireValid(
        chapter.assets.some(
          (a) => a.id === scene.backgroundAssetId && a.role === 'background',
        ),
        'Scenen mangler en bakgrunnsressurs.',
      );
      requireValid(
        unique([...scene.objects.map((o) => o.id), ...scene.actorIds]),
        'Sceneobjekter trenger unike ID-er.',
      );
      const quantities = storyQuantities(item);
      for (const object of scene.objects) {
        requireValid(
          chapter.assets.some(
            (a) => a.id === object.assetId && a.role === 'prop',
          ),
          'Objektet mangler en gjenstandsressurs.',
        );
        requireValid(
          object.quantityKey === null ||
            (Object.hasOwn(quantities, object.quantityKey) &&
              Number.isSafeInteger(quantities[object.quantityKey]) &&
              quantities[object.quantityKey] >= 0),
          'Scenen kan bare telle verifiserte gitte mengder.',
        );
      }
      for (const effect of Object.values(scene.feedback).flatMap((v) =>
        Array.isArray(v) ? v : [],
      ))
        requireValid(
          scene.objects.some((o) => o.id === effect.targetId) ||
            scene.actorIds.includes(effect.targetId),
          'Animasjonen viser til et ukjent sceneobjekt.',
        );
    }
  }
  const visited = new Set<string>(),
    visiting = new Set<string>();
  const visit = (id: string) => {
    requireValid(
      !visiting.has(id),
      'Kapittelet inneholder en uavsluttet løkke.',
    );
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of edges.get(id)!) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  visit(chapter.entryNodeId);
  requireValid(
    visited.size === chapter.nodes.length,
    'Kapittelet inneholder hendelser som aldri kan nås.',
  );
  return chapter;
}

/** Server projection: selecting a variant is NOT a pedagogical authorization. */
export function publicMission(
  input: unknown,
  missionId: string,
  variantId: string,
): PublicMission {
  const chapter = validateChapterPackage(input);
  const mission = chapter.nodes.find(
    (n) => n.id === missionId && n.kind === 'mission',
  );
  requireValid(mission?.kind === 'mission', 'Ukjent oppdrag.');
  const variant = mission.variants.find((v) => v.id === variantId);
  requireValid(!!variant, 'Ukjent oppgavevariant.');
  const item = materializeProblem(variant);
  const quantities = storyQuantities(item);
  return {
    chapterId: chapter.id,
    missionId,
    variantId,
    title: mission.title,
    before: mission.before,
    goal: mission.goal,
    question: bindStoryProblem(variant.questionTemplate, item),
    clue: bindStoryProblem(variant.clueTemplate, item),
    representation: variant.representation,
    answerType: item.answerType,
    choices: [...(item.choices ?? [])],
    location: chapter.locations.find((l) => l.id === variant.scene.locationId)!,
    actors: chapter.actors.filter((a) => variant.scene.actorIds.includes(a.id)),
    scene: {
      locationId: variant.scene.locationId,
      actorIds: [...variant.scene.actorIds],
      backgroundAssetId: variant.scene.backgroundAssetId,
      interaction: variant.scene.interaction,
      objects: variant.scene.objects.map((o) => ({
        id: o.id,
        label: o.label,
        assetId: o.assetId,
        quantity: o.quantityKey === null ? null : quantities[o.quantityKey],
      })),
      feedback: {
        working: variant.scene.feedback.working,
        incorrect: variant.scene.feedback.incorrect,
        reducedMotion: {
          working: variant.scene.feedback.reducedMotion.working,
          incorrect: variant.scene.feedback.reducedMotion.incorrect,
        },
      },
    },
  };
}

/** Context for the ordinary help path; full-solution help needs a separate guarded path. */
export function tutorContext(
  chapterInput: unknown,
  sagaInput: unknown,
  progressInput: unknown,
  tutorStateInput: unknown,
) {
  const chapter = validateChapterPackage(chapterInput),
    saga = sagaFactsSchema.parse(sagaInput),
    progress = chapterProgressSchema.parse(progressInput),
    tutorState = tutorStateSchema.parse(tutorStateInput);
  requireValid(
    saga.id === chapter.sagaId &&
      saga.revision >= chapter.basedOnRevision &&
      saga.interest.key === chapter.interest.key,
    'Kapittelet bygger på en annen sagatilstand.',
  );
  requireValid(
    progress.chapterId === chapter.id && progress.sagaId === saga.id,
    'Fremdriften gjelder et annet kapittel.',
  );
  requireValid(
    unique(progress.completedMissionIds) &&
      progress.completedMissionIds.every(
        (id) =>
          id !== progress.currentMissionId &&
          chapter.nodes.some((n) => n.id === id && n.kind === 'mission'),
      ),
    'Ugyldig liste over fullførte oppdrag.',
  );
  requireValid(
    unique(progress.choices.map((c) => c.nodeId)),
    'Et veivalg kan bare forekomme én gang.',
  );
  let cursor = chapter.entryNodeId,
    completedIndex = 0,
    choiceIndex = 0;
  while (cursor !== progress.currentMissionId) {
    const node = chapter.nodes.find((n) => n.id === cursor)!;
    requireValid(
      node.kind !== 'ending',
      'Oppdraget ligger ikke på den valgte ruten.',
    );
    if (node.kind === 'mission') {
      requireValid(
        progress.completedMissionIds[completedIndex++] === node.id,
        'Fremdriften hopper over eller gjentar et oppdrag.',
      );
      cursor = node.next;
    } else {
      const choice = progress.choices[choiceIndex++];
      requireValid(
        choice?.nodeId === node.id,
        'Ruten mangler et faktisk veivalg.',
      );
      const option = node.options.find((o) => o.id === choice.optionId);
      requireValid(!!option, 'Ukjent valgt alternativ.');
      cursor = option.next;
    }
  }
  requireValid(
    completedIndex === progress.completedMissionIds.length &&
      choiceIndex === progress.choices.length,
    'Fremdriften inneholder framtidige oppdrag eller valg.',
  );
  const actual = saga.events.filter((e) => e.chapterId === chapter.id);
  requireValid(
    !saga.chapterSummaries.some((c) => c.chapterId === chapter.id) &&
      unique(actual.map((e) => e.missionId)) &&
      actual.length === progress.completedMissionIds.length &&
      actual.every(
        (e, index) => progress.completedMissionIds[index] === e.missionId,
      ),
    'Planlagte hendelser kan ikke brukes som faktisk historikk.',
  );
  return {
    schemaVersion: 1 as const,
    chapter: { id: chapter.id, title: chapter.title, goal: chapter.goal },
    mission: publicMission(
      chapter,
      progress.currentMissionId,
      progress.variantId,
    ),
    chosenRoute: progress.choices.map((choice) => {
      const node = chapter.nodes.find((n) => n.id === choice.nodeId);
      requireValid(node?.kind === 'choice', 'Ukjent veivalg.');
      return {
        choiceId: node.id,
        label: node.options.find((o) => o.id === choice.optionId)!.label,
      };
    }),
    saga: {
      goal: saga.goal,
      chapterSummaries: saga.chapterSummaries,
      recentEvents: saga.events.slice(-6),
      inventory: saga.inventory,
      actorLocations: saga.actorLocations,
    },
    ...tutorState,
    // History/word explanations do not automatically count as mathematical help.
    helpKinds: ['story', 'wording', 'mathematics'] as const,
  };
}
