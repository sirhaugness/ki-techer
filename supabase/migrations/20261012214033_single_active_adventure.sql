-- Preserve the strongest previously selected adventure when upgrading old profiles.
with ranked as (
  select id,row_number() over(partition by learner_id order by weight desc,id) as n
  from public.interests where active
)
update public.interests set active=false where id in (select id from ranked where n>1);
create unique index interests_one_active_per_learner on public.interests(learner_id) where active;

-- Selection is atomic, serialized per learner; direct writes also obey the index.
-- The authenticated app supplies the learner from its checked locked-device access.
create function public.select_adventure(target_learner uuid, interest_id uuid, interest_label text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare chosen uuid;
begin
  perform 1 from public.learners where id=target_learner for update;
  if not found then raise exception 'Unknown learner'; end if;
  if interest_id is not null then
    select id into chosen from public.interests where id=interest_id and learner_id=target_learner;
    if not found then raise exception 'Unknown interest'; end if;
  else
    select id into chosen from public.interests where learner_id=target_learner and lower(label)=lower(trim(interest_label)) order by id limit 1;
    if chosen is null then
      if length(trim(interest_label)) not between 1 and 40 or
         (select count(*) from public.interests where learner_id=target_learner)>=20 then
        raise exception 'Invalid interest';
      end if;
      insert into public.interests(learner_id,label,source,active)
      values(target_learner,trim(interest_label),'leo',false) returning id into chosen;
    end if;
  end if;
  update public.interests set active=false where learner_id=target_learner and active and id<>chosen;
  update public.interests set active=true where id=chosen and learner_id=target_learner;
  return chosen;
end; $$;
revoke all on function public.select_adventure(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.select_adventure(uuid,uuid,text) to service_role;
