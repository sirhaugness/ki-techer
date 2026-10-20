import type { GeneratedItem } from '../engine/skills/generators';
import type { PublicTask, Snapshot } from '../learning/types';

export type MathSlot = {
  id: string;
  index: number;
  reason: 'repetition' | 'learning' | 'maintenance';
  item: GeneratedItem;
};
export type StoryHeader = {
  title: string;
  summary: string;
  setting: string;
  opening: string;
  ending: string;
};
export type StoryMission = {
  slotId: string;
  skillId: string;
  difficulty: number;
  text: string;
  place: string;
  art: 'none' | 'forest' | 'harbor' | 'workshop' | 'space';
  question: string;
  expression: string | null;
  answer: GeneratedItem['answer'];
  hint: string;
  success: string;
  retry: string;
};
export type ApprovedMission = StoryMission & { source: 'model' | 'generator' };
export type FreeChapter = {
  id: string;
  learner_id: string;
  household_id: string;
  previous_id: string | null;
  interests: string[];
  context: { previousSummary: string; currentPreview?: string };
  slots: MathSlot[];
  header: StoryHeader | null;
  missions: ApprovedMission[];
  status: 'queued' | 'running' | 'done';
  owner: string | null;
  created_at: string;
  deadline: string;
  spent: number;
  finished_at: string | null;
  completed: boolean;
  calls: Record<string, unknown>;
};
export type StorySession = Snapshot & {
  freeChapter: {
    id: string;
    index: number;
    failures: number;
    reactions?: string[];
  };
};
export type FreeStoryView = {
  chapterId: string;
  title: string;
  opening: string;
  interests: string[];
  preparing: boolean;
  available: number;
  total: number;
  index: number;
  scene: { text: string; place: string; art: StoryMission['art'] } | null;
  task: PublicTask | null;
  feedback: string;
  teacher: string;
  solved: boolean;
  ending: string | null;
  sessionId: string | null;
  revision: number;
  playing: boolean;
  nextChapterId: string | null;
};
