import { z } from 'zod';
import { pick, type Rng } from './random';
export const strategyDimensions = {
  kontekst: ['interessefortelling', 'ren_oppgave', 'utfordring'],
  representasjon: ['konkret', 'bilde', 'tall'],
  forklaringsstil: ['eksempel_foerst', 'proev_foerst', 'sporsmaal'],
  tempo: ['kort', 'lang'],
} as const;
export type Dimension = keyof typeof strategyDimensions;
export type Arm = { name: string; alpha: number; beta: number; pulls: number };
export type BanditState = Record<Dimension, Arm[]>;
export function newBandit(): BanditState {
  return Object.fromEntries(
    Object.entries(strategyDimensions).map(([dim, names]) => [
      dim,
      names.map((name) => ({ name, alpha: 1, beta: 1, pulls: 0 })),
    ]),
  ) as BanditState;
}
// Marsaglia–Tsang gamma sampler; rng is explicit so experiments are repeatable.
function normal(rng: Rng): number {
  return (
    Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) *
    Math.cos(2 * Math.PI * rng())
  );
}
function gamma(shape: number, rng: Rng): number {
  if (shape < 1)
    return gamma(shape + 1, rng) * Math.pow(Math.max(rng(), 1e-12), 1 / shape);
  const d = shape - 1 / 3,
    c = 1 / Math.sqrt(9 * d);
  for (let tries = 0; tries < 1000; tries++) {
    const x = normal(rng),
      v = Math.pow(1 + c * x, 3);
    if (v <= 0) continue;
    const u = Math.max(rng(), 1e-12);
    if (
      u < 1 - 0.0331 * x ** 4 ||
      Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))
    )
      return d * v;
  }
  throw new Error('Tilfeldighetskilden gir ikke gyldige beta-trekk.');
}
export function sampleBeta(alpha: number, beta: number, rng: Rng): number {
  z.number().finite().positive().parse(alpha);
  z.number().finite().positive().parse(beta);
  const a = gamma(alpha, rng),
    b = gamma(beta, rng);
  return a / (a + b);
}
export function chooseArm(arms: readonly Arm[], rng: Rng): string {
  if (!arms.length) throw new Error('Ingen strategier.');
  if (rng() < 0.1) return pick(rng, arms).name;
  return arms
    .map((arm) => ({
      name: arm.name,
      value: sampleBeta(arm.alpha, arm.beta, rng),
    }))
    .sort((a, b) => b.value - a.value)[0].name;
}
const unit = z.number().finite().min(0).max(1);
export function reward(signals: {
  nextCredit: number;
  laterReview: number;
  engagement: number;
  selfReport: number;
}): number {
  Object.values(signals).forEach((v) => unit.parse(v));
  return (
    0.5 * ((signals.nextCredit + signals.laterReview) / 2) +
    0.3 * signals.engagement +
    0.2 * signals.selfReport
  );
}
export function updateArm(
  arms: readonly Arm[],
  name: string,
  value: number,
): Arm[] {
  unit.parse(value);
  if (!arms.some((a) => a.name === name)) throw new Error('Ukjent strategi.');
  return arms.map((a) =>
    a.name === name
      ? {
          ...a,
          alpha: a.alpha + value,
          beta: a.beta + 1 - value,
          pulls: a.pulls + 1,
        }
      : { ...a },
  );
}
export function forget(state: BanditState): BanditState {
  return Object.fromEntries(
    Object.entries(state).map(([dimension, arms]) => [
      dimension,
      arms.map((a) => ({
        ...a,
        alpha: 1 + (a.alpha - 1) * 0.97,
        beta: 1 + (a.beta - 1) * 0.97,
      })),
    ]),
  ) as BanditState;
}
export function recommendStrategies(
  state: BanditState,
  rng: Rng,
  introducedAttempts: number,
): Record<Dimension, string> {
  return {
    kontekst: chooseArm(state.kontekst, rng),
    representasjon:
      introducedAttempts < 3
        ? ['konkret', 'bilde', 'tall'][introducedAttempts]
        : chooseArm(state.representasjon, rng),
    forklaringsstil: chooseArm(state.forklaringsstil, rng),
    tempo: chooseArm(state.tempo, rng),
  };
}
