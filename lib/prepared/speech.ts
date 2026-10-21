import type { PreparedView } from './contracts';
export function preparedSpeech(view: PreparedView) {
  return view.finished
    ? 'Prøven er fullført. Alle er om bord i Falcon. Takk for øvingen!'
    : [
        view.scene,
        view.opening,
        view.question,
        view.index === 2
          ? 'A deler 18 signalbrikker likt mellom 3 sendere. B bruker 3 signalbrikker i hver pakke.'
          : '',
        view.feedback,
        view.teacher,
      ]
        .filter(Boolean)
        .join(' ');
}
