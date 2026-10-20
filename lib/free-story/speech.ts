import type { FreeStoryView } from './types';
/** Cached server audio and device fallback read the same visible content. */
export function storySpeech(view: FreeStoryView) {
  return [
    ...new Set(
      [
        view.scene?.text,
        view.feedback,
        view.teacher,
        !view.solved && !view.ending ? view.task?.question : '',
        view.ending,
      ].filter(Boolean),
    ),
  ].join(' ');
}
