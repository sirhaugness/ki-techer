-- R3: authoritative preparation checkpoints. Raw packages include answers and
-- remain service-only; every application route authorizes through leoAccess.
create table public.chapter_sagas(
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households on delete cascade,
 learner_id uuid not null,
 interest jsonb not null,
 facts jsonb not null default '{}',
 revision int not null default 0,
 created_at timestamptz not null default now(),
 unique(id,learner_id,household_id),
 foreign key(learner_id,household_id) references public.learners(id,household_id) on delete cascade
);
create table public.chapter_jobs(
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null,
 learner_id uuid not null,
 saga_id uuid not null,
 chapter_number int not null check(chapter_number>0),
 based_on_revision int not null check(based_on_revision>=0),
 seed bigint not null check(seed between 0 and 4294967295),
 phase text not null default 'research' check(phase in ('research','draft','review','assets','ready')),
 state text not null default 'queued' check(state in ('queued','running','ready','failed','budget','unknown','cancelled')),
 data jsonb not null default '{}',
 owner uuid,
 lease_until timestamptz,
 workflow_run_id text,
 error_code text,
 progress jsonb not null default '{"nodeId":null,"solved":false,"completed":[],"choices":[],"hintLevel":0,"failures":0}',
 play_revision int not null default 0,
 play_done boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(saga_id,chapter_number,based_on_revision),
 unique(id,household_id),
 foreign key(saga_id,learner_id,household_id) references public.chapter_sagas(id,learner_id,household_id) on delete cascade
);
-- Records are created BEFORE the provider is contacted. A pending call is not
-- safe to send again, even after lease expiry or a Workflow redelivery.
create table public.chapter_calls(
 id uuid primary key,
 job_id uuid not null,
 household_id uuid not null,
 phase text not null,
 state text not null check(state in ('pending','completed','failed','budget','unknown')),
 result jsonb,
 usage jsonb,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 unique(job_id,phase),
 foreign key(job_id,household_id) references public.chapter_jobs(id,household_id) on delete cascade
);
alter table public.chapter_sagas enable row level security;
alter table public.chapter_jobs enable row level security;
alter table public.chapter_calls enable row level security;
revoke all on public.chapter_sagas,public.chapter_jobs,public.chapter_calls from public,anon,authenticated;
grant all on public.chapter_sagas,public.chapter_jobs,public.chapter_calls to service_role;
create index chapter_jobs_learner on public.chapter_jobs(learner_id,created_at desc);
create index chapter_jobs_lease on public.chapter_jobs(lease_until) where state='running';
alter table public.ai_calls add column chapter_job_id uuid references public.chapter_jobs on delete set null;

alter table public.chapter_jobs add constraint chapter_job_learner_unique unique(id,learner_id);
create table public.chapter_requests(
 id uuid primary key,job_id uuid not null references public.chapter_jobs on delete cascade,
 learner_id uuid not null references public.learners on delete cascade,
 foreign key(job_id,learner_id) references public.chapter_jobs(id,learner_id) on delete cascade
);
alter table public.chapter_requests enable row level security;
revoke all on public.chapter_requests from public,anon,authenticated;
grant all on public.chapter_requests to service_role;

create function public.begin_chapter(target_learner uuid,target_household uuid,interest_identity jsonb,job_seed bigint,preparation_mode text,request_key uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare job uuid; saga public.chapter_sagas; n int;
begin
 if preparation_mode not in ('model','probe') then raise exception 'Invalid preparation mode'; end if;
 perform 1 from public.households where id=target_household and not clearing_data for share;
 if not found then raise exception 'Household unavailable'; end if;
 perform 1 from public.learners where id=target_learner and household_id=target_household for update;
 if not found then raise exception 'Learner unavailable'; end if;
 select r.job_id into job from public.chapter_requests r join public.chapter_jobs j on j.id=r.job_id where r.id=request_key and j.learner_id=target_learner and j.household_id=target_household;
 if job is not null then return job; end if;
 select id into job from public.chapter_jobs where learner_id=target_learner and household_id=target_household and not play_done and state<>'cancelled' and data->>'mode'=preparation_mode order by created_at desc limit 1;
 if job is not null then
  insert into public.chapter_requests(id,job_id,learner_id) values(request_key,job,target_learner);
  return job;
 end if;
 select * into saga from public.chapter_sagas where learner_id=target_learner and household_id=target_household and interest->>'key'=interest_identity->>'key' order by created_at desc limit 1;
 if saga.id is null then
  insert into public.chapter_sagas(household_id,learner_id,interest) values(target_household,target_learner,interest_identity) returning * into saga;
 end if;
 select coalesce(max(chapter_number),0)+1 into n from public.chapter_jobs where saga_id=saga.id;
 insert into public.chapter_jobs(household_id,learner_id,saga_id,chapter_number,based_on_revision,seed,data)
 values(target_household,target_learner,saga.id,n,saga.revision,job_seed,jsonb_build_object('facts',saga.facts,'interest',saga.interest,'mode',preparation_mode)) returning id into job;
 insert into public.chapter_requests(id,job_id,learner_id) values(request_key,job,target_learner);
 return job;
end; $$;

create function public.claim_chapter(target_job uuid,claim_owner uuid,run_id text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.households h join public.chapter_jobs j on j.household_id=h.id where j.id=target_job and not h.clearing_data for share of h;
 if not found then return false; end if;
 update public.chapter_jobs j set owner=claim_owner,lease_until=now()+interval '10 minutes',state='running',workflow_run_id=run_id,updated_at=now()
 from public.chapter_sagas s where j.id=target_job and j.saga_id=s.id and s.revision=j.based_on_revision and j.state in ('queued','running') and (j.owner is null or j.owner=claim_owner or j.lease_until<now());
 return found;
end; $$;

create function public.checkpoint_chapter(target_job uuid,claim_owner uuid,expected_phase text,next_phase text,phase_data jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.households h join public.chapter_jobs j on j.household_id=h.id where j.id=target_job and not h.clearing_data for share of h;
 if not found then return false; end if;
 if (expected_phase,next_phase) not in (('research','draft'),('draft','review'),('review','assets'),('assets','ready')) then raise exception 'Invalid phase transition'; end if;
 update public.chapter_jobs j set data=j.data||phase_data,phase=next_phase,state=case when next_phase='ready' then 'ready' else 'running' end,lease_until=now()+interval '10 minutes',updated_at=now()
 from public.chapter_sagas s where j.id=target_job and j.saga_id=s.id and s.revision=j.based_on_revision and j.owner=claim_owner and j.lease_until>now() and j.phase=expected_phase and j.state='running';
 return found;
end; $$;

create function public.begin_chapter_call(target_job uuid,claim_owner uuid,call_phase text,call_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.chapter_jobs; c public.chapter_calls;
begin
 select * into j from public.chapter_jobs where id=target_job for update;
 if j.id is null or j.owner<>claim_owner or j.lease_until<=now() or j.state<>'running' or not exists(select 1 from public.households where id=j.household_id and not clearing_data) then raise exception 'Claim unavailable'; end if;
 select * into c from public.chapter_calls where job_id=target_job and phase=call_phase;
 if c.id is not null then
  if c.state='budget' and not exists(select 1 from public.ai_reservations where id=c.id) then
   update public.chapter_calls set state='pending',completed_at=null where id=c.id returning * into c;
   return jsonb_build_object('fresh',true,'call',to_jsonb(c));
  end if;
  return jsonb_build_object('fresh',false,'call',to_jsonb(c));
 end if;
 insert into public.chapter_calls(id,job_id,household_id,phase,state) values(call_id,target_job,j.household_id,call_phase,'pending') returning * into c;
 return jsonb_build_object('fresh',true,'call',to_jsonb(c));
end; $$;

create function public.finish_chapter_call(target_job uuid,claim_owner uuid,call_id uuid,call_state text,call_result jsonb,call_usage jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if call_state not in ('completed','failed','budget','unknown') then raise exception 'Invalid call state'; end if;
 perform 1 from public.households h join public.chapter_jobs j on j.household_id=h.id where j.id=target_job and not h.clearing_data for share of h;
 if not found then return false; end if;
 update public.chapter_calls c set state=call_state,result=call_result,usage=call_usage,completed_at=now()
 from public.chapter_jobs j where j.id=target_job and c.job_id=j.id and c.id=call_id and c.state='pending' and j.owner=claim_owner and j.lease_until>now() and j.state='running';
 return found;
end; $$;

create function public.fail_chapter(target_job uuid,claim_owner uuid,failure_state text,failure_code text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if failure_state not in ('failed','budget','unknown','cancelled') then raise exception 'Invalid failure state'; end if;
 update public.chapter_jobs set state=failure_state,error_code=left(failure_code,100),updated_at=now() where id=target_job and owner=claim_owner and state in ('running','failed');
 return found;
end; $$;

create function public.commit_chapter_play(target_job uuid,target_learner uuid,expected_revision int,next_progress jsonb,actual_facts jsonb,finished boolean) returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.chapter_jobs;
begin
 select * into j from public.chapter_jobs where id=target_job and learner_id=target_learner and state='ready' for update;
 if j.id is null or j.play_revision<>expected_revision or j.play_done then return false; end if;
 perform 1 from public.households where id=j.household_id and not clearing_data for share;
 if not found then return false; end if;
 update public.chapter_jobs set progress=next_progress,play_revision=play_revision+1,play_done=finished,updated_at=now() where id=j.id;
 if actual_facts is not null then
  update public.chapter_sagas set facts=actual_facts,revision=revision+1 where id=j.saga_id;
 end if;
 return true;
end; $$;

-- Hosted default EXECUTE grants must be revoked explicitly too.
revoke all on function public.begin_chapter(uuid,uuid,jsonb,bigint,text,uuid),public.claim_chapter(uuid,uuid,text),public.checkpoint_chapter(uuid,uuid,text,text,jsonb),public.begin_chapter_call(uuid,uuid,text,uuid),public.finish_chapter_call(uuid,uuid,uuid,text,jsonb,jsonb),public.fail_chapter(uuid,uuid,text,text),public.commit_chapter_play(uuid,uuid,int,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.begin_chapter(uuid,uuid,jsonb,bigint,text,uuid),public.claim_chapter(uuid,uuid,text),public.checkpoint_chapter(uuid,uuid,text,text,jsonb),public.begin_chapter_call(uuid,uuid,text,uuid),public.finish_chapter_call(uuid,uuid,uuid,text,jsonb,jsonb),public.fail_chapter(uuid,uuid,text,text),public.commit_chapter_play(uuid,uuid,int,jsonb,jsonb,boolean) to service_role;

alter table public.chapter_jobs add constraint chapter_job_owner_unique unique(id,learner_id,household_id);
create table public.chapter_play_times(
 id uuid primary key default gen_random_uuid(),job_id uuid not null,household_id uuid not null,learner_id uuid not null,
 started_at timestamptz not null default now(),ended_at timestamptz,planned_minutes int not null check(planned_minutes between 1 and 60),
 foreign key(job_id,learner_id,household_id) references public.chapter_jobs(id,learner_id,household_id) on delete cascade
);
alter table public.chapter_play_times enable row level security;
revoke all on public.chapter_play_times from public,anon,authenticated;
grant all on public.chapter_play_times to service_role;
create unique index chapter_one_active_clock on public.chapter_play_times(learner_id) where ended_at is null;
create index chapter_time_learner on public.chapter_play_times(learner_id,started_at desc);
-- Serialize starting either player so simultaneous tabs cannot create two clocks.
create function public.guard_chapter_clock() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.ended_at is not null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.learner_id::text,421));
 if tg_table_name='sessions' then
  if exists(select 1 from public.chapter_play_times where learner_id=new.learner_id and ended_at is null) then raise exception 'Pause chapter first'; end if;
 else
  if exists(select 1 from public.sessions where learner_id=new.learner_id and ended_at is null) then raise exception 'End learning session first'; end if;
 end if;
 return new;
end; $$;
revoke all on function public.guard_chapter_clock() from public,anon,authenticated;
grant execute on function public.guard_chapter_clock() to service_role;
create trigger chapter_clock_before_session before insert on public.sessions for each row execute function public.guard_chapter_clock();
create trigger chapter_clock_before_play before insert on public.chapter_play_times for each row execute function public.guard_chapter_clock();

create function public.resume_chapter(target_job uuid,expected_owner uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.households h join public.chapter_jobs j on j.household_id=h.id where j.id=target_job and not h.clearing_data for share of h;
 if not found then return false; end if;
 update public.chapter_jobs j set state='queued',owner=null,lease_until=null,workflow_run_id=null,error_code=null,updated_at=now()
 where j.id=target_job and j.owner is not distinct from expected_owner and j.state in ('failed','budget')
 and (j.error_code='checkpoint_unavailable' or j.state='budget')
 and not exists(select 1 from public.chapter_calls c where c.job_id=j.id and c.state in ('pending','unknown','failed'));
 return found;
end; $$;
revoke all on function public.resume_chapter(uuid,uuid) from public,anon,authenticated;
grant execute on function public.resume_chapter(uuid,uuid) to service_role;

-- Include new private chapter records in the existing parent export immediately.
alter function public.export_household(uuid) rename to export_household_before_chapters;
create function public.export_household(target_household uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select public.export_household_before_chapters(target_household) || jsonb_build_object(
 'chapter_sagas',coalesce((select jsonb_agg(s) from public.chapter_sagas s where household_id=target_household),'[]'),
 'chapter_jobs',coalesce((select jsonb_agg(j) from public.chapter_jobs j where household_id=target_household),'[]'),
 'chapter_calls',coalesce((select jsonb_agg(c) from public.chapter_calls c where household_id=target_household),'[]'),
 'chapter_requests',coalesce((select jsonb_agg(r) from public.chapter_requests r join public.chapter_jobs j on j.id=r.job_id where j.household_id=target_household),'[]'),
 'chapter_play_times',coalesce((select jsonb_agg(t) from public.chapter_play_times t where household_id=target_household),'[]'));
$$;
revoke all on function public.export_household(uuid),public.export_household_before_chapters(uuid) from public,anon,authenticated;
grant execute on function public.export_household(uuid),public.export_household_before_chapters(uuid) to service_role;
