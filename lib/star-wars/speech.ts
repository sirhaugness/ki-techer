import type { AdventureView } from './contracts';
export function adventureSpeech(view: AdventureView) {
  return view.finished
    ? view.teacher
    : view.status === 'correct'
      ? view.teacher
      : [...view.mission.narrative, view.mission.question, view.teacher].join(
          ' ',
        );
}
