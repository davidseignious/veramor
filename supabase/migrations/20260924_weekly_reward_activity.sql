-- Count actual actions for the weekly gift; client calls may only record login.
create or replace function public.record_engagement(activity_kind text)
returns void language plpgsql set search_path to 'public','private' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if activity_kind <> 'login' then raise exception 'activity is recorded automatically'; end if;
  perform private.record_engagement_impl(activity_kind);
end $$;

-- Auth signup trigger is internal and must not be exposed as an RPC.
revoke all on function public.ensure_user_settings_for_auth_user() from public, anon, authenticated;

create or replace function private.record_real_engagement()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_user uuid; v_swipe integer := 0; v_message integer := 0;
begin
  if tg_table_name = 'likes' then
    v_user := new.liker_id; v_swipe := 1;
  elsif tg_table_name = 'messages' then
    v_user := new.sender_id; v_message := 1;
  else
    raise exception 'unsupported engagement event';
  end if;
  insert into public.engagement_daily(user_id,activity_date,login_count,swipes_count,messages_sent,compatibility_checks)
  values(v_user,current_date,0,v_swipe,v_message,0)
  on conflict(user_id,activity_date) do update set
    swipes_count=public.engagement_daily.swipes_count+excluded.swipes_count,
    messages_sent=public.engagement_daily.messages_sent+excluded.messages_sent,
    updated_at=now();
  return new;
end $$;
revoke all on function private.record_real_engagement() from public, anon, authenticated;
drop trigger if exists likes_record_engagement on public.likes;
create trigger likes_record_engagement after insert on public.likes
for each row execute function private.record_real_engagement();
drop trigger if exists messages_record_engagement on public.messages;
create trigger messages_record_engagement after insert on public.messages
for each row execute function private.record_real_engagement();

-- Only award a perk the current Friend Beta can redeem.
create or replace function private.weekly_reward_status_impl()
returns jsonb language plpgsql security definer set search_path to 'public','private' as $$
declare me uuid := auth.uid(); login_days integer; swipe_days integer; chat_days integer; already_claimed boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select count(*) filter(where login_count>0),count(*) filter(where swipes_count>0),count(*) filter(where messages_sent>0)
  into login_days,swipe_days,chat_days from public.engagement_daily
  where user_id=me and activity_date between current_date-6 and current_date;
  select exists(select 1 from public.weekly_reward_claims where user_id=me and streak_end>=current_date-6)
  into already_claimed;
  return jsonb_build_object('login_days',login_days,'swipe_days',swipe_days,'chat_days',chat_days,
    'eligible',login_days=7 and swipe_days>=5 and chat_days>=3 and not already_claimed,
    'already_claimed',already_claimed,'next_reward','super_like',
    'days_remaining',greatest(0,7-login_days));
end $$;

create or replace function private.super_like_profile_impl(target_user uuid)
returns jsonb language plpgsql security definer set search_path to 'public','private' as $$
declare me uuid:=auth.uid(); tier text; daily_limit integer; used integer; reciprocal boolean;
  a uuid; b uuid; new_match uuid; inserted_super boolean; inserted_like boolean; credit_used boolean:=false;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not private.profile_launch_ready(me) then raise exception 'complete profile verification before swiping'; end if;
  if target_user=me then raise exception 'cannot super like self'; end if;
  if not private.profile_launch_ready(target_user) then raise exception 'user unavailable'; end if;
  if exists(select 1 from public.blocks where (blocker_id=me and blocked_id=target_user) or (blocker_id=target_user and blocked_id=me)) then raise exception 'user unavailable'; end if;
  tier:=private.veramor_plan_for(me);
  daily_limit:=case when tier='premium' then 5 when tier='plus' then 3 else 1 end;
  select count(*)::int into used from public.super_likes where sender_id=me and created_at>=date_trunc('day',now());
  if used>=daily_limit then
    update public.reward_wallets set super_likes=super_likes-1,updated_at=now()
    where user_id=me and super_likes>0;
    if not found then raise exception 'daily super like limit reached; earn a weekly gift for an extra'; end if;
    credit_used:=true;
  end if;
  insert into public.super_likes(sender_id,receiver_id) values(me,target_user) on conflict do nothing;
  inserted_super:=found;
  if not inserted_super then raise exception 'you already super liked this person'; end if;
  insert into public.likes(liker_id,liked_id) values(me,target_user) on conflict do nothing;
  inserted_like:=found;
  if inserted_like then
    insert into public.daily_like_usage(user_id,usage_date,likes_used) values(me,current_date,1)
    on conflict(user_id,usage_date) do update set likes_used=public.daily_like_usage.likes_used+1;
  end if;
  select exists(select 1 from public.likes where liker_id=target_user and liked_id=me) into reciprocal;
  if reciprocal then
    a:=least(me,target_user);b:=greatest(me,target_user);
    insert into public.matches(user_a,user_b) values(a,b)
      on conflict(user_a,user_b) do update set status='active' returning id into new_match;
  end if;
  return jsonb_build_object('matched',reciprocal,'match_id',new_match,'plan',tier,
    'super_likes_used',used+1,'daily_limit',daily_limit,'reward_credit_used',credit_used);
end $$;
