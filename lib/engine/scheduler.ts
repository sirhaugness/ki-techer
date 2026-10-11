import {
  fsrs,
  createEmptyCard,
  Rating,
  type Card,
  type CardInput,
} from 'ts-fsrs';
import { z } from 'zod';
import { timestamp } from './time';
const scheduler = fsrs({
  enable_fuzz: false,
  enable_short_term: false,
  request_retention: 0.9,
});
export function reviewRating(
  correct: boolean,
  hintLevel: number,
  timeMs: number,
  medianMs: number | null,
): Rating.Again | Rating.Hard | Rating.Good | Rating.Easy {
  z.number().int().min(0).max(4).parse(hintLevel);
  z.number().finite().nonnegative().parse(timeMs);
  if (medianMs !== null) z.number().finite().positive().parse(medianMs);
  if (!correct) return Rating.Again;
  if (hintLevel > 0) return Rating.Hard;
  return medianMs !== null && timeMs < medianMs ? Rating.Easy : Rating.Good;
}
export function scheduleReview(
  card: CardInput | Card | null,
  now: string,
  result: {
    correct: boolean;
    hintLevel: number;
    timeMs: number;
    medianMs: number | null;
  },
): Card {
  timestamp.parse(now);
  return scheduler.next(
    card ?? createEmptyCard(now),
    now,
    reviewRating(
      result.correct,
      result.hintLevel,
      result.timeMs,
      result.medianMs,
    ),
  ).card;
}
export function serializeCard(card: Card) {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review?.toISOString(),
  };
}
export function dueReviews(
  cards: Readonly<Record<string, CardInput>>,
  now: string,
): string[] {
  timestamp.parse(now);
  return Object.entries(cards)
    .filter(([, c]) => new Date(c.due).getTime() <= Date.parse(now))
    .sort((a, b) => new Date(a[1].due).getTime() - new Date(b[1].due).getTime())
    .map(([id]) => id);
}
