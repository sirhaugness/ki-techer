import 'server-only';
import { currentDevice } from '../auth/session';
import type { Learner } from '../db/types';
import type { LearnerProfile } from './types';
export function learnerProfile(learner: Learner): LearnerProfile {
  return {
    id: learner.id,
    householdId: learner.household_id,
    firstName: learner.first_name,
    tutorName: learner.tutor_name,
    grade: learner.grade,
    avatar: learner.avatar,
    settings:
      learner.settings &&
      typeof learner.settings === 'object' &&
      !Array.isArray(learner.settings)
        ? learner.settings
        : {},
  };
}
export async function leoAccess() {
  const { client, device } = await currentDevice();
  if (!device?.leo_mode_locked)
    throw new Error('Start Leo-modus fra foreldresiden først.');
  const { data, error } = await client
    .from('learners')
    .select('*')
    .eq('id', device.learner_id)
    .single();
  if (error || !data) throw new Error('Fant ikke elevprofilen.');
  return { client, profile: learnerProfile(data), device };
}
