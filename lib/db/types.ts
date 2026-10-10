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
export type Database = {
  public: {
    Tables: {
      learners: Table<Learner>;
      parents: Table<Parent>;
      devices: Table<Device>;
      parent_secrets: Table<ParentSecret>;
    };
    Views: Record<string, never>;
    Functions: {
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
