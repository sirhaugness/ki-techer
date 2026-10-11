alter table public.sessions add column reflected_at timestamptz;
alter table public.sessions add column reflection_started_at timestamptz;
alter table public.sessions add column suggestions jsonb not null default '[]';
alter table public.learner_profile_observations drop constraint learner_profile_observations_status_check;
alter table public.learner_profile_observations add constraint learner_profile_observations_status_check check(status in ('aktiv','låst','avvist','arkivert'));
create index sessions_pending_reflection on public.sessions(learner_id,started_at) where ended_at is not null and reflected_at is null;
create function public.claim_reflection(target_session uuid,target_learner uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.sessions set reflection_started_at=now() where id=target_session and learner_id=target_learner and ended_at is not null and reflected_at is null and (reflection_started_at is null or reflection_started_at < now()-interval '5 minutes');
  return found;
end; $$;
create function public.commit_reflection(target_session uuid,target_learner uuid,result jsonb) returns boolean language plpgsql security invoker set search_path='' as $$
declare s public.sessions; o public.learner_profile_observations; obj jsonb; c float; used_id uuid; uses int; engagement float; handled uuid[] := '{}';
begin
  -- Parent profile writes use this same learner lock; no lost parent edits.
  perform 1 from public.learners where id=target_learner for update;
  if not found then return false; end if;
  select * into s from public.sessions where id=target_session and learner_id=target_learner for update;
  if not found or s.ended_at is null or s.reflected_at is not null then return false; end if;
  for obj in select value from jsonb_array_elements(result->'operations') loop
    if obj->>'evidence_session_id' <> target_session::text then continue; end if;
    o := null;
    if obj->>'observation_id' is not null then
      select * into o from public.learner_profile_observations where id=(obj->>'observation_id')::uuid and learner_id=target_learner for update;
      if not found then continue; end if;
    else
      select * into o from public.learner_profile_observations where learner_id=target_learner and category=obj->>'category' and lower(btrim(text))=lower(btrim(obj->>'text')) order by updated_at desc limit 1 for update;
    end if;
    if o.id is not null then
      if o.id=any(handled) or o.status in ('låst','avvist','arkivert') or coalesce(o.evidence->'session_ids','[]') ? target_session::text then continue; end if;
      handled := array_append(handled,o.id);
      c := round(greatest(0,least(1,o.confidence+case when obj->>'op' in ('legg_til','styrk') then 0.15 else -0.2 end))::numeric,2);
      update public.learner_profile_observations set confidence=c,status=case when c<0.2 then 'arkivert' else status end,evidence=jsonb_build_object('session_ids',coalesce(o.evidence->'session_ids','[]') || to_jsonb(target_session::text)),updated_at=now() where id=o.id;
    elsif obj->>'op'='legg_til' and (select count(*) from public.learner_profile_observations where learner_id=target_learner and status in ('aktiv','låst'))<25 then
      insert into public.learner_profile_observations(learner_id,category,text,evidence,confidence,updated_by) values(target_learner,obj->>'category',obj->>'text',jsonb_build_object('session_ids',jsonb_build_array(target_session::text)),0.4,'system');
    end if;
  end loop;
  -- Engagement is the child's reported mood, not a reward for easy correct answers.
  engagement := case s.mood_end when 'glad' then 1 when 'sliten' then 0 else 0.5 end;
  for used_id,uses in select value::uuid,count(*)::int from jsonb_array_elements_text(s.engine_state->'usedInterests') where value is not null group by value loop
    update public.interests set engagement_avg=(coalesce(engagement_avg,0.5)*times_used+engagement*uses)/(times_used+uses),times_used=times_used+uses,weight=greatest(0.25,least(3,weight+(engagement-0.5)*0.2)) where id=used_id and learner_id=target_learner;
  end loop;
  update public.sessions set summary=result->>'summary',suggestions=result->'suggestions',reflected_at=now() where id=target_session;
  return true;
end; $$;
revoke all on function public.claim_reflection(uuid,uuid), public.commit_reflection(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_reflection(uuid,uuid), public.commit_reflection(uuid,uuid,jsonb) to service_role;
