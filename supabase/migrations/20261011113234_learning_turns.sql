-- One authoritative session and atomic turns, including evidence and logs.
alter table public.sessions add column revision int not null default 0;
create unique index sessions_one_open_per_learner on public.sessions(learner_id) where ended_at is null;

create function public.commit_learning_turn(target_session uuid, target_learner uuid, expected_revision int, next_state jsonb, events jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_revision int; obj jsonb; key text; arm_json jsonb; dim_key text;
begin
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
