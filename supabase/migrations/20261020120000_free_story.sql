-- Chapter generation has one immutable identity, absolute deadline and shared
-- call budget. The parked chapter migration remains byte-identical history.
create table public.free_story_chapters(
 id uuid primary key default gen_random_uuid(),
 learner_id uuid not null, household_id uuid not null,
 previous_id uuid, interest_key text not null, interests jsonb not null,
 context jsonb not null, slots jsonb not null,
 header jsonb, missions jsonb not null default '[]',
 status text not null default 'queued' check(status in ('queued','running','done')),
 owner uuid, calls jsonb not null default '{}',
 spent numeric not null default 0 check(spent between 0 and 1),
 created_at timestamptz not null default now(),
 deadline timestamptz not null default now()+interval '90 seconds',
 finished_at timestamptz, completed boolean not null default false,
 unique(id,learner_id),
 foreign key(learner_id,household_id) references public.learners(id,household_id) on delete cascade,
 foreign key(previous_id,learner_id) references public.free_story_chapters(id,learner_id) on delete cascade,
 check(jsonb_array_length(slots) between 20 and 25),
 check(jsonb_array_length(missions)<=jsonb_array_length(slots))
);
create unique index free_story_identity on public.free_story_chapters(learner_id,coalesce(previous_id,'00000000-0000-0000-0000-000000000000'::uuid),interest_key);
create index free_story_learner on public.free_story_chapters(learner_id,created_at desc);
alter table public.free_story_chapters enable row level security;
revoke all on public.free_story_chapters from public,anon,authenticated;
grant all on public.free_story_chapters to service_role;
alter table public.ai_calls add column free_chapter_id uuid references public.free_story_chapters on delete set null;
alter table public.ai_calls add column chapter_duration_ms int;
alter table public.ai_calls add column chapter_cost_nok numeric;

create function public.begin_free_story(target_learner uuid,target_household uuid,parent_chapter uuid,interest_identity text,chapter_interests jsonb,chapter_context jsonb,math_slots jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 perform 1 from public.learners l join public.households h on h.id=l.household_id where l.id=target_learner and l.household_id=target_household and not h.clearing_data for update of l;
 if not found then raise exception 'Learner unavailable'; end if;
 if parent_chapter is not null and not exists(select 1 from public.free_story_chapters where id=parent_chapter and learner_id=target_learner) then raise exception 'Invalid previous chapter'; end if;
 insert into public.free_story_chapters(learner_id,household_id,previous_id,interest_key,interests,context,slots)
 values(target_learner,target_household,parent_chapter,interest_identity,chapter_interests,chapter_context,math_slots)
 on conflict do nothing returning id into result;
 if result is null then select id into result from public.free_story_chapters where learner_id=target_learner and previous_id is not distinct from parent_chapter and interest_key=interest_identity; end if;
 return result;
end; $$;

create function public.claim_free_story(target uuid,claim_owner uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.free_story_chapters j set owner=claim_owner,status='running' where id=target and status='queued' and owner is null and deadline>now()
 and exists(select 1 from public.households h where h.id=j.household_id and not h.clearing_data);
 return found;
end; $$;

create function public.begin_free_story_call(target uuid,claim_owner uuid,phase text,ceiling numeric,configured_limit float)
returns uuid language plpgsql security invoker set search_path='' as $$
declare j public.free_story_chapters; call_id uuid:=gen_random_uuid();
begin
 select * into j from public.free_story_chapters where id=target for update;
 if not found or j.owner is distinct from claim_owner or j.status<>'running' or now()>=j.deadline or phase not in ('generate','repair') or j.calls ? phase or ceiling<=0 or j.spent+ceiling>1 then return null; end if;
 if phase='repair' and not (j.calls ? 'generate') then return null; end if;
 if not public.reserve_ai_budget(j.household_id,call_id,ceiling::float,configured_limit) then return null; end if;
 update public.free_story_chapters set spent=spent+ceiling,calls=calls||jsonb_build_object(phase,jsonb_build_object('id',call_id,'ceiling',ceiling,'state','pending')) where id=target;
 return call_id;
end; $$;

create function public.finish_free_story_call(target uuid,claim_owner uuid,phase text,call_id uuid,usage jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.free_story_chapters; ceiling numeric; charged numeric;
begin
 select * into j from public.free_story_chapters where id=target for update;
 if not found or phase is null or phase not in ('generate','repair') or call_id is null
 or j.owner is distinct from claim_owner or j.calls->phase->>'id' is distinct from call_id::text
 or j.calls->phase->>'state' is distinct from 'pending' then return false; end if;
 if not exists(select 1 from public.households where id=j.household_id and not clearing_data) then return false; end if;
 ceiling:=(j.calls->phase->>'ceiling')::numeric;
 charged:=case when coalesce((usage->>'usage_known')::boolean,false) then least(ceiling,(usage->>'cost_estimate')::numeric) else ceiling end;
 perform public.settle_ai_budget(call_id,charged::float);
 update public.free_story_chapters set spent=greatest(0,spent-ceiling+charged),calls=jsonb_set(calls,array[phase,'state'],to_jsonb(case when coalesce((usage->>'usage_known')::boolean,false) then 'completed'::text else 'unknown'::text end)) where id=target;
 insert into public.ai_calls(id,household_id,purpose,model,input_tokens,output_tokens,cost_estimate,latency_ms,ok,usage_known,environment,pricing_version,free_chapter_id,request_started_at)
 values(call_id,j.household_id,usage->>'purpose',usage->>'model',(usage->>'input_tokens')::int,(usage->>'output_tokens')::int,(usage->>'cost_estimate')::float,(usage->>'latency_ms')::int,(usage->>'ok')::boolean,(usage->>'usage_known')::boolean,usage->>'environment',usage->>'pricing_version',target,now()-((usage->>'latency_ms')||' milliseconds')::interval)
 on conflict(id) do nothing;
 update public.ai_calls set chapter_cost_nok=greatest(0,j.spent-ceiling+charged) where id=target and purpose='chapter-total';
 return true;
end; $$;

create function public.publish_free_story(target uuid,claim_owner uuid,chapter_header jsonb,chapter_missions jsonb,finished boolean,expired boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.free_story_chapters; i int;
begin
 select * into j from public.free_story_chapters where id=target for update;
 if not found or j.status='done' or j.owner is distinct from claim_owner then return false; end if;
 if not exists(select 1 from public.households where id=j.household_id and not clearing_data) then return false; end if;
 if expired and now()<j.deadline then return false; end if;
 if not expired and now()>=j.deadline then return false; end if;
 if jsonb_array_length(chapter_missions)<jsonb_array_length(j.missions) or jsonb_array_length(chapter_missions)>jsonb_array_length(j.slots) then return false; end if;
 if finished and jsonb_array_length(chapter_missions)<>jsonb_array_length(j.slots) then return false; end if;
 if jsonb_array_length(j.missions)>0 and chapter_header<>j.header then return false; end if;
 for i in 0..jsonb_array_length(j.missions)-1 loop
   if chapter_missions->i<>j.missions->i then return false; end if;
 end loop;
 update public.free_story_chapters set header=chapter_header,missions=chapter_missions,status=case when finished then 'done' else status end,finished_at=case when finished then now() else null end where id=target;
 if finished then
  -- cost_estimate=0 prevents double-counting the individual paid calls.
  insert into public.ai_calls(id,household_id,purpose,model,input_tokens,output_tokens,cost_estimate,latency_ms,ok,usage_known,free_chapter_id,chapter_duration_ms,chapter_cost_nok)
  values(target,j.household_id,'chapter-total','chapter',0,0,0,0,true,false,target,(extract(epoch from now()-j.created_at)*1000)::int,j.spent)
  on conflict(id) do nothing;
 end if;
 return true;
end; $$;

create function public.commit_free_story_turn(target_session uuid,target_learner uuid,expected_revision int,next_state jsonb,events jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare chapter_id uuid:=(next_state->'freeChapter'->>'id')::uuid;
begin
 if not exists(select 1 from public.free_story_chapters where id=chapter_id and learner_id=target_learner) then return false; end if;
 if not public.commit_learning_turn(target_session,target_learner,expected_revision,next_state,events) then return false; end if;
 update public.free_story_chapters set completed=true where id=chapter_id and status='done' and (next_state->'freeChapter'->>'index')::int>=jsonb_array_length(slots);
 return true;
end; $$;

create function public.start_free_story_session(target_learner uuid,next_state jsonb,events jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare sid uuid:=(next_state->>'id')::uuid;
begin
 if not exists(select 1 from public.free_story_chapters where id=(next_state->'freeChapter'->>'id')::uuid and learner_id=target_learner) then return false; end if;
 insert into public.sessions(id,learner_id,started_at,planned_minutes,engine_state)
 values(sid,target_learner,(next_state->'clock'->>'startedAt')::timestamptz,(next_state->'clock'->>'plannedMinutes')::int,jsonb_set(next_state,'{revision}','0'));
 if not public.commit_free_story_turn(sid,target_learner,0,next_state,events) then raise exception 'Chapter start could not commit'; end if;
 return true;
end; $$;

alter function public.export_household(uuid) rename to export_household_before_free_story;
create function public.export_household(target_household uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select public.export_household_before_free_story(target_household)||jsonb_build_object('free_story_chapters',coalesce((select jsonb_agg(j) from public.free_story_chapters j where household_id=target_household),'[]'));
$$;
revoke all on function public.begin_free_story(uuid,uuid,uuid,text,jsonb,jsonb,jsonb), public.claim_free_story(uuid,uuid),public.begin_free_story_call(uuid,uuid,text,numeric,float),public.finish_free_story_call(uuid,uuid,text,uuid,jsonb),public.publish_free_story(uuid,uuid,jsonb,jsonb,boolean,boolean),public.commit_free_story_turn(uuid,uuid,int,jsonb,jsonb),public.export_household(uuid),public.export_household_before_free_story(uuid) from public,anon,authenticated;
grant execute on function public.begin_free_story(uuid,uuid,uuid,text,jsonb,jsonb,jsonb), public.claim_free_story(uuid,uuid),public.begin_free_story_call(uuid,uuid,text,numeric,float),public.finish_free_story_call(uuid,uuid,text,uuid,jsonb),public.publish_free_story(uuid,uuid,jsonb,jsonb,boolean,boolean),public.commit_free_story_turn(uuid,uuid,int,jsonb,jsonb),public.export_household(uuid),public.export_household_before_free_story(uuid) to service_role;
revoke all on function public.start_free_story_session(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.start_free_story_session(uuid,jsonb,jsonb) to service_role;
