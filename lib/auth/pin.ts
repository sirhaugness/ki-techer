import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
export const pinSchema = z.string().regex(/^\d{4}$/, 'Bruk fire sifre.');
export function hashPin(pin: string) {
  pinSchema.parse(pin);
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}
export function verifyPin(pin: string, stored: string) {
  if (!pinSchema.safeParse(pin).success) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(scryptSync(pin, salt, 32), Buffer.from(hash, 'hex'));
}
