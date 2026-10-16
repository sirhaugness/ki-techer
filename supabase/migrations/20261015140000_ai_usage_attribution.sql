-- Keep historical amounts unchanged. New usage can be attributed and repriced.
alter table public.ai_calls
  add column session_id uuid references public.sessions(id) on delete set null,
  add column chapter_number int check (chapter_number >= 1),
  add column usage_known boolean not null default false,
  add column pricing_version text not null default 'legacy-flat-v1',
  add column environment text not null default 'legacy';
create index ai_calls_session_usage on public.ai_calls(session_id,chapter_number)
  where session_id is not null;
