import { z } from 'zod';
import { dayKey, localMinutes, timestamp } from './time';
export type SessionPhase =
  | 'innsjekk'
  | 'oppvarming'
  | 'hovedøkt'
  | 'blandet_utfordring'
  | 'avslutning'
  | 'ferdig';
export const sessionSettingsSchema = z
  .object({
    plannedMinutes: z.number().int().min(5).max(60),
    dailyMaxMinutes: z.number().int().min(5).max(180),
    allowedStartMinute: z.number().int().min(0).max(1439),
    allowedEndMinute: z.number().int().min(1).max(1440),
  })
  .strict();
export type SessionSettings = z.infer<typeof sessionSettingsSchema>;
export const defaultSessionSettings: SessionSettings = {
  plannedMinutes: 15,
  dailyMaxMinutes: 30,
  allowedStartMinute: 0,
  allowedEndMinute: 1440,
};
export type SessionClock = {
  startedAt: string;
  plannedMinutes: number;
  dailyUsedMinutesAtStart: number;
  settings: SessionSettings;
};
function inWindow(settings: SessionSettings, now: string): boolean {
  const t = localMinutes(now),
    start = settings.allowedStartMinute,
    end = settings.allowedEndMinute;
  return start < end ? t >= start && t < end : t >= start || t < end;
}
export function startSession(
  settings: SessionSettings,
  now: string,
  usedMinutesToday: number,
): SessionClock {
  sessionSettingsSchema.parse(settings);
  timestamp.parse(now);
  z.number().finite().nonnegative().parse(usedMinutesToday);
  if (!inWindow(settings, now))
    throw new Error('Det er utenfor tiden dere har valgt for øving.');
  const remaining = settings.dailyMaxMinutes - usedMinutesToday;
  if (remaining <= 0) throw new Error('Vi er ferdige med dagens øving.');
  return {
    startedAt: now,
    plannedMinutes: Math.min(settings.plannedMinutes, remaining),
    dailyUsedMinutesAtStart: usedMinutesToday,
    settings,
  };
}
export function sessionPhase(clock: SessionClock, now: string): SessionPhase {
  timestamp.parse(now);
  const elapsed = (Date.parse(now) - Date.parse(clock.startedAt)) / 60000;
  if (elapsed < 0) throw new Error('Tidspunktet er før øktstart.');
  if (
    elapsed >= clock.plannedMinutes ||
    !inWindow(clock.settings, now) ||
    dayKey(now) !== dayKey(clock.startedAt)
  )
    return 'ferdig';
  const checkIn = Math.min(1, clock.plannedMinutes * 0.1),
    warmup = Math.min(2.5, clock.plannedMinutes * 0.2);
  if (elapsed < checkIn) return 'innsjekk';
  if (elapsed < checkIn + warmup) return 'oppvarming';
  if (elapsed < clock.plannedMinutes * 0.8) return 'hovedøkt';
  if (elapsed < clock.plannedMinutes * 0.93) return 'blandet_utfordring';
  return 'avslutning';
}
export function canAskSchoolTopic(
  now: string,
  lastAskedAt: string | null,
  isFirstSession: boolean,
): boolean {
  timestamp.parse(now);
  if (isFirstSession) return false;
  if (!lastAskedAt) return true;
  timestamp.parse(lastAskedAt);
  return Date.parse(now) - Date.parse(lastAskedAt) >= 7 * 86400000;
}
export function mayContinue(clock: SessionClock, now: string): boolean {
  return sessionPhase(clock, now) !== 'ferdig';
}
