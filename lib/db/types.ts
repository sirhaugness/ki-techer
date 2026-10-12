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
  request_started_at: string;
  latency_ms: number;
  ok: boolean;
  created_at: string;
};
export type Database = {
  public: {
    Tables: {
      households: Table<{
        id: string;
        clearing_data: boolean;
        privacy_cutoff: string | null;
      }>;
      medallion_progress: Table<{
        learner_id: string;
        part_id: number;
        parent_seen: boolean;
        awarded_at: string | null;
      }>;
      safety_flags: Table<{
        id: string;
        learner_id: string;
        reviewed: boolean;
      }>;
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
        generation_started_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      select_adventure: {
        Args: {
          target_learner: string;
          interest_id: string | null;
          interest_label: string;
        };
        Returns: string;
      };
      budget_status: {
        Args: { target_household: string; configured_limit: number };
        Returns: Json;
      };
      reserve_ai_budget: {
        Args: {
          target_household: string;
          reservation_id: string;
          amount: number;
          configured_limit: number;
        };
        Returns: boolean;
      };
      settle_ai_budget: {
        Args: { reservation_id: string; actual: number };
        Returns: boolean;
      };
      allow_ai_request: {
        Args: {
          target_device: string;
          target_household: string;
          request_scope: string;
          request_limit: number;
        };
        Returns: boolean;
      };
      maintain_learner: {
        Args: { target_learner: string };
        Returns: undefined;
      };
      parent_dashboard: {
        Args: { target_learner: string; page_offset: number };
        Returns: Json;
      };
      session_insight: {
        Args: { target_session: string; target_learner: string };
        Returns: Json;
      };
      export_household: { Args: { target_household: string }; Returns: Json };
      edit_parent_profile: {
        Args: {
          target_learner: string;
          observation_id: string | null;
          category: string;
          observation_text: string;
          desired_status: string;
        };
        Returns: boolean;
      };
      reset_diagnostic: { Args: { target_learner: string }; Returns: boolean };
      prune_logs: {
        Args: { target_learner: string; months: number };
        Returns: number;
      };
      begin_data_clear: {
        Args: { target_household: string };
        Returns: boolean;
      };
      clear_app_data: { Args: { target_household: string }; Returns: boolean };
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
