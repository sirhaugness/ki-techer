alter table public.households add column clearing_data boolean not null default false;
alter table public.households add column privacy_cutoff timestamptz;
create function public.parent_dashboard(target_learner uuid, page_offset int default 0) returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'learner',to_jsonb(l),
 'parts',coalesce((select jsonb_agg(p order by part_id) from public.medallion_progress p where learner_id=l.id),'[]'),
 'states',coalesce((select jsonb_agg(s) from public.skill_states s where learner_id=l.id),'[]'),
 'observations',coalesce((select jsonb_agg(o order by updated_at desc) from public.learner_profile_observations o where learner_id=l.id),'[]'),
 'misconceptions',coalesce((select jsonb_agg(m order by last_seen_at desc) from public.misconceptions m where learner_id=l.id),'[]'),
 'strategies',coalesce((select jsonb_agg(a) from public.strategy_arms a where learner_id=l.id),'[]'),
 'flags',coalesce((select jsonb_agg(f order by created_at desc) from (select * from public.safety_flags where learner_id=l.id order by created_at desc limit 100) f),'[]'),
 'sessions',coalesce((select jsonb_agg(to_jsonb(s)-'engine_state' order by started_at desc) from (select * from public.sessions where learner_id=l.id order by started_at desc,id desc limit 20 offset greatest(0,page_offset)) s),'[]'),
 'spend',coalesce((select sum(cost_estimate) from public.ai_calls where household_id=l.household_id and created_at>=date_trunc('month',now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo'),0),
 'sessionCount',(select count(*) from public.sessions where learner_id=l.id),
 'daily',coalesce((select jsonb_agg(d order by "day") from (select (started_at at time zone 'Europe/Oslo')::date as "day",count(*) sessions,round(sum(greatest(0,least(planned_minutes,extract(epoch from(coalesce(ended_at,now())-started_at))/60)))::numeric,1) minutes from public.sessions where learner_id=l.id and started_at>=now()-interval '7 days' group by "day") d),'[]'),
 'accuracy',coalesce((select jsonb_agg(d order by "day") from (select (a.created_at at time zone 'Europe/Oslo')::date as "day",count(*) answers,round(avg(correct::int)::numeric*100) percent from public.attempts a where learner_id=l.id and created_at>=now()-interval '14 days' and not is_master_test group by "day") d),'[]'),
 'moods',coalesce((select jsonb_agg(d order by started_at) from (select started_at,mood_start,mood_end from public.sessions where learner_id=l.id and started_at>=now()-interval '14 days' order by started_at desc limit 30) d),'[]')
) from public.learners l where id=target_learner;
$$;
create function public.session_insight(target_session uuid,target_learner uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('session',to_jsonb(s)-'engine_state','messages',coalesce((select jsonb_agg(m order by created_at,id) from public.messages m where session_id=s.id and learner_id=target_learner),'[]'),'tools',coalesce((select jsonb_agg(t order by created_at,id) from public.tool_calls t where session_id=s.id and learner_id=target_learner),'[]'),'attempts',coalesce((select jsonb_agg(a order by created_at,id) from public.attempts a where session_id=s.id and learner_id=target_learner),'[]')) from public.sessions s where id=target_session and learner_id=target_learner;
$$;
create function public.export_household(target_household uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; table_name text; rows_json jsonb;
begin
 select jsonb_build_object('household',to_jsonb(h),'schema_version',1,'exported_at',now()) into result from public.households h where id=target_household;
 if result is null then return null; end if;
 foreach table_name in array array['parents','learners','devices','ai_calls'] loop
  execute format('select coalesce(jsonb_agg(t),''[]''::jsonb) from public.%I t where household_id=$1',table_name) into rows_json using target_household;
  result := result || jsonb_build_object(table_name,rows_json);
 end loop;
 foreach table_name in array array['skill_states','medallion_progress','master_tests','interests','school_topics','sessions','items','attempts','messages','tool_calls','misconceptions','learner_profile_observations','strategy_arms','safety_flags'] loop
  execute format('select coalesce(jsonb_agg(t),''[]''::jsonb) from public.%I t join public.learners l on l.id=t.learner_id where l.household_id=$1',table_name) into rows_json using target_household;
  result := result || jsonb_build_object(table_name,rows_json);
 end loop;
 result := result || jsonb_build_object('tts_cache',coalesce((select jsonb_agg(t) from public.tts_cache t where storage_path like target_household::text||'/%'),'[]'));
 result := result || jsonb_build_object('pin_settings',coalesce((select jsonb_agg(jsonb_build_object('parent_id',s.parent_id,'pin_set',true,'failed_attempts',s.failed_attempts,'locked_until',s.locked_until)) from public.parent_secrets s join public.parents p on p.id=s.parent_id where p.household_id=target_household),'[]'));
 foreach table_name in array array['subjects','skills','medallion_parts'] loop
  execute format('select coalesce(jsonb_agg(t),''[]''::jsonb) from public.%I t',table_name) into rows_json;
  result := result || jsonb_build_object(table_name,rows_json);
 end loop;
 return result;
end; $$;
create function public.edit_parent_profile(target_learner uuid, observation_id uuid, category text, observation_text text, desired_status text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.learners where id=target_learner for update;
 if not found then return false; end if;
 if length(btrim(observation_text)) not between 1 and 240 or desired_status not in ('aktiv','låst','avvist','arkivert') then raise exception 'Invalid profile'; end if;
 if observation_id is null then
   if desired_status in ('aktiv','låst') and (select count(*) from public.learner_profile_observations where learner_id=target_learner and status in ('aktiv','låst'))>=25 then raise exception 'Profile limit'; end if;
   insert into public.learner_profile_observations(learner_id,category,text,status,confidence,updated_by) values(target_learner,category,btrim(observation_text),desired_status,1,'forelder');
 else
   if desired_status in ('aktiv','låst') and not exists(select 1 from public.learner_profile_observations where id=observation_id and learner_id=target_learner and status in ('aktiv','låst')) and (select count(*) from public.learner_profile_observations where learner_id=target_learner and status in ('aktiv','låst'))>=25 then raise exception 'Profile limit'; end if;
   update public.learner_profile_observations set category=edit_parent_profile.category,text=btrim(observation_text),status=desired_status,updated_by='forelder',updated_at=now() where id=observation_id and learner_id=target_learner;
   return found;
 end if;
 return true;
end; $$;
create function public.reset_diagnostic(target_learner uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.learners where id=target_learner for update;
 if not found then return false; end if;
 -- Finish an open session first; mastery and awards remain intact.
 if exists(select 1 from public.sessions where learner_id=target_learner and ended_at is null) then return false; end if;
 update public.sessions set engine_state=jsonb_set(engine_state,'{diagnosticComplete}','false') where id=(select id from public.sessions where learner_id=target_learner order by started_at desc,id desc limit 1);
 return true;
end; $$;
create function public.prune_logs(target_learner uuid,months int) returns int language plpgsql security invoker set search_path='' as $$
declare cutoff timestamptz; removed int;
begin
 if months not between 1 and 36 then raise exception 'Invalid retention'; end if;
 cutoff := now()-make_interval(months=>months);
 delete from public.messages where learner_id=target_learner and created_at<cutoff;
 get diagnostics removed=row_count;
 delete from public.tool_calls where learner_id=target_learner and created_at<cutoff;
 update public.sessions set engine_state=engine_state||jsonb_build_object('messages','[]'::jsonb,'pendingObservations','[]'::jsonb) where learner_id=target_learner and ended_at<cutoff;
 return removed;
end; $$;
create function public.begin_data_clear(target_household uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 update public.households set clearing_data=true,privacy_cutoff=now() where id=target_household;
 return found;
end; $$;
create function public.clear_app_data(target_household uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.households where id=target_household and clearing_data for update;
 if not found then return false; end if;
 delete from public.learners where household_id=target_household;
 delete from public.ai_calls where household_id=target_household;
 delete from public.tts_cache where storage_path like target_household::text||'/%';
 delete from public.parent_secrets where parent_id in (select id from public.parents where household_id=target_household);
 update public.parents set display_name='Forelder' where household_id=target_household;
 update public.households set clearing_data=false where id=target_household;
 return true;
end; $$;
revoke all on function public.parent_dashboard(uuid,int),public.session_insight(uuid,uuid),public.export_household(uuid),public.edit_parent_profile(uuid,uuid,text,text,text),public.reset_diagnostic(uuid),public.prune_logs(uuid,int),public.begin_data_clear(uuid),public.clear_app_data(uuid) from public,anon,authenticated;
grant execute on function public.parent_dashboard(uuid,int),public.session_insight(uuid,uuid),public.export_household(uuid),public.edit_parent_profile(uuid,uuid,text,text,text),public.reset_diagnostic(uuid),public.prune_logs(uuid,int),public.begin_data_clear(uuid),public.clear_app_data(uuid) to service_role;

-- Reject writes from a session or audio request that predates a privacy reset.
alter table public.tts_cache add column generation_started_at timestamptz not null default now();
create function public.guard_audio_cache() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.households where id=split_part(new.storage_path,'/',1)::uuid and not clearing_data and (privacy_cutoff is null or new.generation_started_at>privacy_cutoff)) then raise exception 'Data clear in progress'; end if;
 return new;
end; $$;
create trigger guard_audio_cache before insert or update on public.tts_cache for each row execute function public.guard_audio_cache();
create function public.guard_session_insert() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.learners l join public.households h on h.id=l.household_id where l.id=new.learner_id and not h.clearing_data and (h.privacy_cutoff is null or new.started_at>h.privacy_cutoff)) then raise exception 'Data clear in progress'; end if;
 return new;
end; $$;
create trigger guard_session_insert before insert on public.sessions for each row execute function public.guard_session_insert();
revoke all on function public.guard_audio_cache(),public.guard_session_insert() from public,anon,authenticated;
grant execute on function public.guard_audio_cache(),public.guard_session_insert() to service_role;
create or replace function public.commit_learning_turn(target_session uuid, target_learner uuid, expected_revision int, next_state jsonb, events jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_revision int; obj jsonb; key text; arm_json jsonb; dim_key text;
begin
  perform 1 from public.learners l join public.households h on h.id=l.household_id where l.id=target_learner and not h.clearing_data for update of l;
  if not found then return false; end if;
  select revision into current_revision from public.sessions
    where id=target_session and learner_id=target_learner for update;
  if not found or current_revision <> expected_revision then return false; end if;
  if (next_state->>'revision')::int <> expected_revision+1 or next_state->>'id' <> target_session::text then
    raise exception 'Invalid state revision';
  end if;
  for obj in select value from jsonb_array_elements(events->'items') loop
    insert into public.items(id,learner_id,skill_id,origin,difficulty,params,answer,expression,representation,strategy,story_text,visual_spec,prompt_version,validated)
    values((obj->>'id')::uuid,target_learner,obj->>'skill_id',obj->>'origin',(obj->>'difficulty')::int,obj->'params',obj->'answer',obj->>'expression',obj->>'representation',obj->'strategy',obj->>'story_text',obj->'visual_spec',obj->>'prompt_version',(obj->>'validated')::bool);
  end loop;
  for obj in select value from jsonb_array_elements(events->'attempts') loop
    insert into public.attempts(id,session_id,learner_id,item_id,answer_raw,answer_parsed,correct,credit,hint_level_used,time_ms,input_mode,misconception_code,is_master_test)
    values((obj->>'id')::uuid,target_session,target_learner,(obj->>'item_id')::uuid,obj->>'answer_raw',obj->'answer_parsed',(obj->>'correct')::bool,(obj->>'credit')::float,(obj->>'hint_level_used')::int,(obj->>'time_ms')::int,obj->>'input_mode',obj->>'misconception_code',(obj->>'is_master_test')::bool);
  end loop;
  for obj in select value from jsonb_array_elements(events->'messages') loop
    insert into public.messages(id,session_id,learner_id,role,text,meta)
    values((obj->>'id')::uuid,target_session,target_learner,obj->>'role',obj->>'text',obj->'meta');
  end loop;
  for obj in select value from jsonb_array_elements(events->'tools') loop
    insert into public.tool_calls(id,session_id,learner_id,tool,args,result,ok,latency_ms)
    values((obj->>'id')::uuid,target_session,target_learner,obj->>'tool',obj->'args',obj->'result',(obj->>'ok')::bool,(obj->>'latency_ms')::int);
  end loop;
  for obj in select value from jsonb_array_elements(events->'flags') loop
    insert into public.safety_flags(id,session_id,learner_id,type,excerpt)
    values((obj->>'id')::uuid,target_session,target_learner,obj->>'type',obj->>'excerpt');
  end loop;
  for obj in select value from jsonb_array_elements(events->'masterTests') loop
    insert into public.master_tests(id,learner_id,session_id,part_id,item_ids,score,passed)
    values((obj->>'id')::uuid,target_learner,target_session,(obj->>'part_id')::int,array(select value::uuid from jsonb_array_elements_text(obj->'item_ids')),(obj->>'score')::float,(obj->>'passed')::bool)
    on conflict(id) do update set score=excluded.score,passed=excluded.passed;
  end loop;
  for obj in select value from jsonb_array_elements(events->'misconceptions') loop
    insert into public.misconceptions(learner_id,skill_id,code,description)
    values(target_learner,obj->>'skill_id',obj->>'code',obj->>'description')
    on conflict(learner_id,skill_id,code) do update set evidence_count=public.misconceptions.evidence_count+1,last_seen_at=now(),status='aktiv';
  end loop;
  for obj in select value from jsonb_array_elements(events->'schoolTopics') loop
    insert into public.school_topics(learner_id,raw_text,mapped_skill_ids,confidence,expires_at)
    values(target_learner,obj->>'raw_text',array(select value from jsonb_array_elements_text(obj->'mapped_skill_ids')),(obj->>'confidence')::float,(obj->>'expires_at')::timestamptz);
  end loop;
  for key,obj in select * from jsonb_each(next_state->'states') loop
    insert into public.skill_states(learner_id,skill_id,theta,attempts,correct_no_hint,distinct_days_correct,recent_attempts,correct_days,seen_attempt_ids,model_mastery_claim_at,model_mastery_claim_reason,understanding_confirmed,mastered_at,last_seen_at,next_review_at,fsrs_card)
    values(target_learner,key,(obj->>'theta')::float,(obj->>'attempts')::int,(obj->>'correctNoHint')::int,jsonb_array_length(obj->'correctDays'),obj->'recent',array(select value::date from jsonb_array_elements_text(obj->'correctDays')),array(select value from jsonb_array_elements_text(obj->'seenAttemptIds')),(obj->'claim'->>'at')::timestamptz,obj->'claim'->>'reason',(obj->>'explained')::bool,(obj->>'masteredAt')::timestamptz,(obj->>'lastSeenAt')::timestamptz,(obj->>'nextReviewAt')::timestamptz,next_state->'cards'->key)
    on conflict(learner_id,skill_id) do update set theta=excluded.theta,attempts=excluded.attempts,correct_no_hint=excluded.correct_no_hint,distinct_days_correct=excluded.distinct_days_correct,recent_attempts=excluded.recent_attempts,correct_days=excluded.correct_days,seen_attempt_ids=excluded.seen_attempt_ids,model_mastery_claim_at=excluded.model_mastery_claim_at,model_mastery_claim_reason=excluded.model_mastery_claim_reason,understanding_confirmed=excluded.understanding_confirmed,mastered_at=coalesce(public.skill_states.mastered_at,excluded.mastered_at),last_seen_at=excluded.last_seen_at,next_review_at=excluded.next_review_at,fsrs_card=excluded.fsrs_card;
  end loop;
  for obj in select value from jsonb_array_elements(next_state->'parts') loop
    insert into public.medallion_progress(learner_id,part_id,status,skills_mastered,skills_total,master_test_attempts,awarded_at,ready_since,last_test_at,targeted_skill_ids)
    values(target_learner,(obj->>'id')::int,obj->>'status',(obj->>'skillsMastered')::int,(obj->>'skillsTotal')::int,(obj->>'testAttempts')::int,(obj->>'awardedAt')::timestamptz,(obj->>'readySince')::timestamptz,(obj->>'lastTestAt')::timestamptz,array(select value from jsonb_array_elements_text(obj->'targetedSkills')))
    on conflict(learner_id,subject_id,grade,part_id) do update set status=case when public.medallion_progress.awarded_at is not null then 'tildelt' else excluded.status end,skills_mastered=excluded.skills_mastered,skills_total=excluded.skills_total,master_test_attempts=excluded.master_test_attempts,awarded_at=coalesce(public.medallion_progress.awarded_at,excluded.awarded_at),ready_since=excluded.ready_since,last_test_at=excluded.last_test_at,targeted_skill_ids=excluded.targeted_skill_ids;
  end loop;
  for dim_key,obj in select * from jsonb_each(next_state->'bandit') loop
    for arm_json in select value from jsonb_array_elements(obj) loop
      insert into public.strategy_arms(learner_id,dimension,arm,alpha,beta,pulls)
      values(target_learner,dim_key,arm_json->>'name',(arm_json->>'alpha')::float,(arm_json->>'beta')::float,(arm_json->>'pulls')::int)
      on conflict(learner_id,dimension,arm) do update set alpha=excluded.alpha,beta=excluded.beta,pulls=excluded.pulls,updated_at=now();
    end loop;
  end loop;
  update public.sessions set engine_state=next_state,revision=expected_revision+1,
    ended_at=(next_state->>'endedAt')::timestamptz,mood_start=next_state->>'moodStart',mood_end=next_state->>'moodEnd',
    summary=case when next_state->>'endedAt' is not null then 'Økten er avsluttet. Se øvingssvar og samtale for detaljer.' else null end,
    stats=jsonb_build_object('answers',jsonb_array_length(next_state->'history'),'mode',next_state->>'mode')
    where id=target_session;
  return true;
end; $$;
revoke all on function public.commit_learning_turn(uuid,uuid,int,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_learning_turn(uuid,uuid,int,jsonb,jsonb) to service_role;

alter table public.ai_calls add column request_started_at timestamptz not null default now();
create function public.guard_ai_log() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.households where id=new.household_id and not clearing_data and (privacy_cutoff is null or new.request_started_at>privacy_cutoff)) then return null; end if;
 return new;
end; $$;
create trigger guard_ai_log before insert on public.ai_calls for each row execute function public.guard_ai_log();
revoke all on function public.guard_ai_log() from public,anon,authenticated;
grant execute on function public.guard_ai_log() to service_role;
