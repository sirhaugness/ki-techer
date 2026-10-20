export async function freeChapterWorkflow(chapterId: string) {
  'use workflow';
  await generateChapter(chapterId);
}

async function generateChapter(chapterId: string) {
  'use step';
  const { randomUUID } = await import('node:crypto');
  const { chapterDb, loadChapter, publishChapter, finishReserve } =
    await import('../lib/free-story/store');
  const { produceChapter } = await import('../lib/free-story/generation');
  const { productionChapterSource, productionSafetyCheck } =
    await import('../lib/free-story/provider');
  // A crashed paid step is never reclaimed. The deadline reader supplies reserve
  // missions instead of buying the chapter again on workflow redelivery.
  const owner = randomUUID();
  const claim = await chapterDb().rpc('claim_free_story', {
    target: chapterId,
    claim_owner: owner,
  });
  if (claim.error) throw Error('Kunne ikke starte kapitteljobben.');
  if (!claim.data) return;
  const chapter = await loadChapter(chapterId);
  if (!chapter) return;
  try {
    await produceChapter({
      slots: chapter.slots,
      interests: chapter.interests,
      ...chapter.context,
      deadline: Date.parse(chapter.deadline),
      source: productionChapterSource(chapterId, owner),
      validateSafety: (value, kind, signal) =>
        productionSafetyCheck(
          kind === 'header'
            ? Object.values(value).join('\n')
            : ['text', 'place', 'question', 'hint', 'success', 'retry']
                .map((k) => value[k as keyof typeof value])
                .join('\n'),
          signal,
        ),
      publish: (header, missions, done) =>
        publishChapter(chapter, header, missions, done),
    });
  } catch {
    const latest = await loadChapter(chapterId);
    if (latest) await finishReserve(latest, false);
  }
}
generateChapter.maxRetries = 0;
