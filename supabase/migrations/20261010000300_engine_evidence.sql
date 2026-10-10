-- Persist the engine's evidence so state can be reconstructed without inference.
alter table public.skill_states
  add column correct_days date[] not null default '{}',
  add column seen_attempt_ids text[] not null default '{}',
  add column model_mastery_claim_reason text,
  add column understanding_confirmed bool not null default false;
alter table public.medallion_progress
  add column ready_since timestamptz,
  add column last_test_at timestamptz,
  add column targeted_skill_ids text[] not null default '{}';
alter table public.sessions
  add column engine_state jsonb not null default '{}';
