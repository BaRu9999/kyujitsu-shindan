alter table public.diagnosis_campaign_users
  add column if not exists coloring_participant_code text references public.diagnosis_participants(participant_code) on delete set null,
  add column if not exists coloring_pass_type text check (coloring_pass_type in ('advance', 'same_day')),
  add column if not exists coloring_pass_created_at timestamptz;

create unique index if not exists diagnosis_campaign_users_coloring_participant_idx
  on public.diagnosis_campaign_users (coloring_participant_code)
  where coloring_participant_code is not null;

update public.diagnosis_campaign_users u
set coloring_participant_code = u.participant_code,
    coloring_pass_type = p.pass_type,
    coloring_pass_created_at = coalesce(u.diagnosis_completed_at, u.created_at),
    updated_at = now()
from public.diagnosis_participants p
where u.diagnosis_result = 'coloring'
  and u.participant_code = p.participant_code
  and u.coloring_participant_code is null;

create or replace function public.complete_diagnosis_campaign(
  p_campaign_id text,
  p_line_user_id text,
  p_result text,
  p_answers jsonb,
  p_participant_code text,
  p_token text,
  p_pass_type text,
  p_source text,
  p_diagnosed_on date,
  p_event_eligible boolean,
  p_coupon_code text,
  p_coupon_type text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.diagnosis_campaign_users;
begin
  select * into v_user
  from public.diagnosis_campaign_users
  where campaign_id = p_campaign_id and line_user_id = p_line_user_id
  for update;

  if v_user.id is null then raise exception 'campaign_user_not_found'; end if;

  if v_user.diagnosis_completed_at is not null then
    return to_jsonb(v_user) || jsonb_build_object('was_existing', true);
  end if;

  insert into public.diagnosis_participants (
    participant_code, token, diagnosis_result, pass_type, source,
    diagnosed_on, event_eligible, preview_used, updated_at
  ) values (
    p_participant_code, p_token, p_result, nullif(p_pass_type, ''),
    left(coalesce(p_source, 'line'), 40), p_diagnosed_on,
    p_event_eligible, false, now()
  );

  insert into public.participation_events (
    participant_code, event_type, source, metadata
  ) values (
    p_participant_code, 'diagnosis_completed', left(coalesce(p_source, 'line'), 40),
    jsonb_build_object('campaign_id', p_campaign_id, 'answers', p_answers)
  );

  update public.diagnosis_campaign_users
  set diagnosis_started_at = coalesce(diagnosis_started_at, now()),
      diagnosis_completed_at = now(),
      diagnosed_on = p_diagnosed_on,
      diagnosis_result = p_result,
      answers = p_answers,
      participant_code = p_participant_code,
      coloring_participant_code = case
        when p_result = 'coloring' and v_user.coloring_participant_code is null then p_participant_code
        else v_user.coloring_participant_code
      end,
      coloring_pass_type = case
        when p_result = 'coloring' and v_user.coloring_participant_code is null then nullif(p_pass_type, '')
        else v_user.coloring_pass_type
      end,
      coloring_pass_created_at = case
        when p_result = 'coloring' and v_user.coloring_participant_code is null then now()
        else v_user.coloring_pass_created_at
      end,
      coupon_code = p_coupon_code,
      coupon_type = p_coupon_type,
      updated_at = now()
  where id = v_user.id
  returning * into v_user;

  insert into public.diagnosis_campaign_events (campaign_user_id, event_type, metadata)
  values (
    v_user.id, 'diagnosis_completed',
    jsonb_build_object('result', p_result, 'participant_code', p_participant_code)
  );

  return to_jsonb(v_user) || jsonb_build_object('was_existing', false);
end;
$$;

create or replace function public.issue_table_coloring_pass(
  p_campaign_id text,
  p_line_user_id text,
  p_participant_code text,
  p_token text,
  p_source text,
  p_diagnosed_on date
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.diagnosis_campaign_users;
  v_pass public.diagnosis_participants;
  v_created boolean := false;
begin
  select * into v_user
  from public.diagnosis_campaign_users
  where campaign_id = p_campaign_id and line_user_id = p_line_user_id
  for update;

  if v_user.id is null then raise exception 'campaign_user_not_found'; end if;

  if v_user.coloring_participant_code is null then
    insert into public.diagnosis_participants (
      participant_code, token, diagnosis_result, pass_type, source,
      diagnosed_on, event_eligible, preview_used, updated_at
    ) values (
      p_participant_code, p_token, 'coloring', 'same_day',
      left(coalesce(p_source, 'table'), 40), p_diagnosed_on,
      true, false, now()
    ) returning * into v_pass;

    update public.diagnosis_campaign_users
    set coloring_participant_code = v_pass.participant_code,
        coloring_pass_type = 'same_day',
        coloring_pass_created_at = now(),
        updated_at = now()
    where id = v_user.id
    returning * into v_user;

    v_created := true;
  else
    select * into v_pass
    from public.diagnosis_participants
    where participant_code = v_user.coloring_participant_code;

    if v_pass.id is null then raise exception 'coloring_pass_not_found'; end if;

    update public.diagnosis_campaign_users
    set coloring_pass_type = v_pass.pass_type,
        coloring_pass_created_at = coalesce(coloring_pass_created_at, v_pass.created_at),
        updated_at = now()
    where id = v_user.id
    returning * into v_user;
  end if;

  insert into public.participation_events (
    participant_code, event_type, source, metadata
  ) values (
    v_pass.participant_code, 'table_qr_opened', left(coalesce(p_source, 'table'), 40),
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'pass_issued', v_created,
      'pass_type', v_pass.pass_type
    )
  );

  return jsonb_build_object(
    'participantCode', v_pass.participant_code,
    'token', v_pass.token,
    'passType', v_pass.pass_type,
    'source', v_pass.source,
    'diagnosedOn', v_pass.diagnosed_on,
    'previewUsed', v_pass.preview_used,
    'created', v_created
  );
end;
$$;

revoke all on function public.issue_table_coloring_pass(text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.issue_table_coloring_pass(text, text, text, text, text, date) to service_role;

drop view if exists public.sheet_participation_export;
create view public.sheet_participation_export as
select
  p.participant_code,
  p.diagnosed_on,
  p.diagnosis_result,
  p.pass_type,
  p.source,
  p.event_eligible,
  p.preview_used,
  p.artwork_status,
  p.created_at,
  p.updated_at,
  count(e.id) filter (where e.event_type = 'table_qr_opened') as table_qr_count,
  count(e.id) filter (where e.event_type = 'coloring_started') as coloring_start_count,
  count(e.id) filter (where e.event_type = 'artwork_submitted') as artwork_submit_count,
  u.campaign_id,
  u.line_display_name,
  case when u.line_user_id is null then null else '***' || right(u.line_user_id, 6) end as line_user_masked,
  u.answers,
  u.coupon_code,
  u.coupon_type,
  u.coupon_send_status,
  u.coupon_sent_at,
  u.coupon_redeemed_at
from public.diagnosis_participants p
left join public.participation_events e on e.participant_code = p.participant_code
left join public.diagnosis_campaign_users u
  on u.participant_code = p.participant_code
  or u.coloring_participant_code = p.participant_code
group by p.id, u.id;

drop view if exists public.sheet_diagnosis_funnel_export;
create view public.sheet_diagnosis_funnel_export as
select
  campaign_id,
  line_display_name,
  '***' || right(line_user_id, 6) as line_user_masked,
  source,
  first_opened_at,
  last_opened_at,
  opened_count,
  diagnosis_started_at,
  diagnosis_completed_at,
  diagnosed_on,
  diagnosis_result,
  answers,
  participant_code,
  coloring_participant_code,
  coloring_pass_type,
  coloring_pass_created_at,
  coupon_code,
  coupon_type,
  coupon_send_status,
  coupon_sent_at,
  coupon_redeemed_at,
  updated_at
from public.diagnosis_campaign_users;

revoke all on public.sheet_participation_export from anon, authenticated;
revoke all on public.sheet_diagnosis_funnel_export from anon, authenticated;
