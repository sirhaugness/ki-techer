export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Learner = {
  id: string;
  household_id: string;
  first_name: string;
  grade: number;
  birth_year: number | null;
  tutor_name: string;
  avatar: string;
  settings: Json;
};
export type Parent = { id: string; household_id: string; display_name: string };
export type Device = {
  id: string;
  household_id: string;
  learner_id: string;
  parent_id: string;
  leo_mode_locked: boolean;
  created_at: string;
};
export type ParentSecret = {
  parent_id: string;
  pin_hash: string;
  failed_attempts: number;
  locked_until: string | null;
};
type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type SessionRow = {
  id: string;
  learner_id: string;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  engine_state: Json;
  revision: number;
  reflected_at: string | null;
  reflection_started_at: string | null;
  summary: string | null;
  suggestions: Json;
};
export type InterestRow = {
  id: string;
  learner_id: string;
  label: string;
  active: boolean;
  source: string;
  weight: number;
  times_used: number;
};
type AiCallRow = {
  id: string;
  household_id: string;
  purpose: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  latency_ms: number;
  ok: boolean;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      learner_profile_observations: Table<
        import('../profile/rules').Observation
      >;
      tool_calls: Table<{
        id: string;
        learner_id: string;
        session_id: string;
        tool: string;
        ok: boolean;
        args: Json;
        result: Json;
      }>;
      learners: Table<Learner>;
      parents: Table<Parent>;
      devices: Table<Device>;
      parent_secrets: Table<ParentSecret>;
      sessions: Table<SessionRow>;
      interests: Table<InterestRow>;
      ai_calls: Table<AiCallRow>;
      tts_cache: Table<{
        text_hash: string;
        voice: string;
        storage_path: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      claim_reflection: {
        Args: { target_session: string; target_learner: string };
        Returns: boolean;
      };
      commit_reflection: {
        Args: { target_session: string; target_learner: string; result: Json };
        Returns: boolean;
      };
      commit_learning_turn: {
        Args: {
          target_session: string;
          target_learner: string;
          expected_revision: number;
          next_state: Json;
          events: Json;
        };
        Returns: boolean;
      };
      ensure_household: { Args: Record<string, never>; Returns: string };
      record_pin_attempt: {
        Args: { target_parent: string; success: boolean };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
