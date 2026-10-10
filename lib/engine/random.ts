export type Rng = () => number;
/** Mulberry32: deterministic, injectable, never uses global Math.random. */
export function seededRng(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function integer(rng: Rng, min: number, max: number) {
  if (max < min) throw new Error('Ugyldig tallområde.');
  return min + Math.floor(rng() * (max - min + 1));
}
export function pick<T>(rng: Rng, values: readonly T[]): T {
  if (!values.length) throw new Error('Tom liste.');
  return values[integer(rng, 0, values.length - 1)];
}
