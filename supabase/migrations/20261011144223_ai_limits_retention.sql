create table public.ai_budget_months(household_id uuid not null references public.households on delete cascade,month date not null,spent numeric not null default 0 check(spent>=0),primary key(household_id,month));
create table public.ai_reservations(id uuid primary key,household_id uuid not null references public.households on delete cascade,month date not null,ceiling numeric not null check(ceiling>=0),settled boolean not null default false,created_at timestamptz not null default now());
create table public.ai_request_limits(device_id uuid not null references public.devices on delete cascade,scope text not null,minute timestamptz not null,requests int not null default 1,primary key(device_id,scope,minute));
alter table public.ai_budget_months enable row level security;
alter table public.ai_reservations enable row level security;
alter table public.ai_request_limits enable row level security;
revoke all on public.ai_budget_months,public.ai_reservations,public.ai_request_limits from public,anon,authenticated;
grant all on public.ai_budget_months,public.ai_reservations,public.ai_request_limits to service_role;
grant select on public.ai_budget_months to authenticated;
create policy family_read on public.ai_budget_months for select to authenticated using(public.in_household(household_id));
create index ai_calls_monthly on public.ai_calls(household_id,created_at);
create index sessions_history on public.sessions(learner_id,started_at desc,id desc);
create index messages_retention on public.messages(learner_id,created_at);
create index tool_calls_retention on public.tool_calls(learner_id,created_at);
create index ai_limits_expiry on public.ai_request_limits(minute);
create function public.budget_status(target_household uuid,configured_limit float) returns jsonb language sql stable security invoker set search_path='' as $$
 with limits as (select least(greatest(0,configured_limit),coalesce(min(case when settings->>'ai_budget_nok' ~ '^[0-9]+([.][0-9]+)?$' then (settings->>'ai_budget_nok')::float else configured_limit end),configured_limit)) cap from public.learners where household_id=target_household), usage as (
 select coalesce((select spent from public.ai_budget_months where household_id=target_household and month=date_trunc('month',now() at time zone 'Europe/Oslo')::date),(select sum(cost_estimate) from public.ai_calls where household_id=target_household and created_at>=date_trunc('month',now() at time zone 'Europe/Oslo') at time zone 'Europe/Oslo'),0) spent)
 select jsonb_build_object('spent',spent,'limit',cap,'remaining',greatest(0,cap-spent),'warning',spent>=cap*0.8,'fallback',spent>=cap) from limits,usage;
$$;
create function public.reserve_ai_budget(target_household uuid,reservation_id uuid,amount float,configured_limit float) returns boolean language plpgsql security invoker set search_path='' as $$
declare current_month date; cap numeric;
begin
 if amount<0 or amount>10000 or amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid reservation'; end if;
 perform 1 from public.households where id=target_household and not clearing_data for share;
 if not found or exists(select 1 from public.ai_reservations where id=reservation_id) then return false; end if;
 current_month:=date_trunc('month',now() at time zone 'Europe/Oslo')::date;
 cap:=(public.budget_status(target_household,configured_limit)->>'limit')::numeric;
 insert into public.ai_budget_months(household_id,month,spent) values(target_household,current_month,coalesce((select sum(cost_estimate) from public.ai_calls where household_id=target_household and created_at>=current_month::timestamp at time zone 'Europe/Oslo'),0)) on conflict do nothing;
 perform 1 from public.ai_budget_months where household_id=target_household and month=current_month for update;
 update public.ai_budget_months set spent=spent+amount::numeric where household_id=target_household and month=current_month and spent+amount::numeric<=cap and spent<cap;
 if not found then return false; end if;
 insert into public.ai_reservations(id,household_id,month,ceiling) values(reservation_id,target_household,current_month,amount);
 return true;
end; $$;
create function public.settle_ai_budget(reservation_id uuid,actual float) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.ai_reservations;
begin
 select * into r from public.ai_reservations where id=reservation_id for update;
 if not found or r.settled then return false; end if;
 if actual<0 or actual::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid cost'; end if;
 -- Never release an unknown/failed request: caller retains the full ceiling.
 update public.ai_budget_months set spent=greatest(0,spent-r.ceiling+least(actual::numeric,r.ceiling)) where household_id=r.household_id and month=r.month;
 update public.ai_reservations set settled=true where id=reservation_id;
 return true;
end; $$;
create function public.allow_ai_request(target_device uuid,target_household uuid,request_scope text,request_limit int) returns boolean language plpgsql security invoker set search_path='' as $$
declare bucket timestamptz;
begin
 if request_limit not between 1 and 60 or request_scope not in ('leo','tts','stt') then raise exception 'Invalid limit'; end if;
 perform 1 from public.devices d join public.households h on h.id=d.household_id where d.id=target_device and d.household_id=target_household and d.leo_mode_locked and not h.clearing_data;
 if not found then return false; end if;
 bucket:=date_trunc('minute',clock_timestamp());
 insert into public.ai_request_limits(device_id,scope,minute,requests)values(target_device,request_scope,bucket,1) on conflict(device_id,scope,minute) do update set requests=public.ai_request_limits.requests+1 where public.ai_request_limits.requests<request_limit;
 return found;
end; $$;
create function public.maintain_learner(target_learner uuid) returns void language plpgsql security invoker set search_path='' as $$
declare months int;
begin
 select case when settings->>'retention_months' ~ '^[0-9]+$' then greatest(1,least(36,(settings->>'retention_months')::int)) else 12 end into months from public.learners where id=target_learner;
 if not found then return; end if;
 perform public.prune_logs(target_learner,months);
 delete from public.school_topics where learner_id=target_learner and expires_at<=now();
 update public.sessions set engine_state=jsonb_set(engine_state,'{schoolTopics}',coalesce((select jsonb_agg(t) from jsonb_array_elements(engine_state->'schoolTopics') t where (t->>'expiresAt')::timestamptz>now()),'[]')) where learner_id=target_learner and engine_state ? 'schoolTopics' and exists(select 1 from jsonb_array_elements(engine_state->'schoolTopics') t where (t->>'expiresAt')::timestamptz<=now());
 delete from public.ai_request_limits where minute<now()-interval '2 hours';
 delete from public.ai_reservations where created_at<now()-interval '12 months';
 delete from public.ai_budget_months where month<(date_trunc('month',now() at time zone 'Europe/Oslo')-interval '24 months')::date;
end; $$;
revoke all on function public.budget_status(uuid,float),public.reserve_ai_budget(uuid,uuid,float,float),public.settle_ai_budget(uuid,float),public.allow_ai_request(uuid,uuid,text,int),public.maintain_learner(uuid) from public,anon,authenticated;
grant execute on function public.budget_status(uuid,float),public.reserve_ai_budget(uuid,uuid,float,float),public.settle_ai_budget(uuid,float),public.allow_ai_request(uuid,uuid,text,int),public.maintain_learner(uuid) to service_role;

create or replace function public.export_household(target_household uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; table_name text; rows_json jsonb;
begin
 select jsonb_build_object('household',to_jsonb(h),'schema_version',1,'exported_at',now()) into result from public.households h where id=target_household;
 if result is null then return null; end if;
 foreach table_name in array array['parents','learners','devices','ai_calls','ai_budget_months','ai_reservations'] loop
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
 result := result || jsonb_build_object('ai_request_limits',coalesce((select jsonb_agg(t) from public.ai_request_limits t join public.devices d on d.id=t.device_id where d.household_id=target_household),'[]'));
 return result;
end; $$;

create or replace function public.clear_app_data(target_household uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.households where id=target_household and clearing_data for update;
 if not found then return false; end if;
 delete from public.learners where household_id=target_household;
 delete from public.ai_request_limits where device_id in (select id from public.devices where household_id=target_household);
 delete from public.ai_reservations where household_id=target_household;
 delete from public.ai_budget_months where household_id=target_household;
 delete from public.ai_calls where household_id=target_household;
 delete from public.tts_cache where storage_path like target_household::text||'/%';
 delete from public.parent_secrets where parent_id in (select id from public.parents where household_id=target_household);
 update public.parents set display_name='Forelder' where household_id=target_household;
 update public.households set clearing_data=false where id=target_household;
 return true;
end; $$;

create index tts_cache_expiry on public.tts_cache(generation_started_at);
