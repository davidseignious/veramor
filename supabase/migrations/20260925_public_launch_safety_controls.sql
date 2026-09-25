-- Public-launch safety controls and abuse protections.

insert into private.feature_flags(flag,enabled)
values
  ('public_launch',false),
  ('signup_open',true),
  ('maintenance_mode',false)
on conflict (flag) do nothing;

create or replace function public.launch_config()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select jsonb_build_object(
    'public_launch',coalesce((select enabled from private.feature_flags where flag='public_launch'),false),
    'signup_open',coalesce((select enabled from private.feature_flags where flag='signup_open'),true),
    'maintenance_mode',coalesce((select enabled from private.feature_flags where flag='maintenance_mode'),false),
    'billing_live',coalesce((select enabled from private.feature_flags where flag='billing_live'),false)
  );
$$;

revoke all on function public.launch_config() from public;
grant execute on function public.launch_config() to anon, authenticated;

create or replace function private.enforce_message_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  recent_minute integer;
  recent_hour integer;
  duplicate_recent integer;
begin
  if auth.uid() is not null and new.sender_id<>auth.uid() then
    raise exception 'message sender mismatch';
  end if;

  new.body:=btrim(coalesce(new.body,''));
  if char_length(new.body)<1 or char_length(new.body)>2000 then
    raise exception 'message must be between 1 and 2000 characters';
  end if;

  select count(*)::int into recent_minute
  from public.messages
  where sender_id=new.sender_id and created_at>=now()-interval '1 minute';

  if recent_minute>=30 then
    raise exception 'message rate limit reached; try again in a minute';
  end if;

  select count(*)::int into recent_hour
  from public.messages
  where sender_id=new.sender_id and created_at>=now()-interval '1 hour';

  if recent_hour>=300 then
    raise exception 'message rate limit reached; try again later';
  end if;

  select count(*)::int into duplicate_recent
  from public.messages
  where sender_id=new.sender_id
    and created_at>=now()-interval '5 minutes'
    and lower(btrim(body))=lower(new.body);

  if duplicate_recent>=5 then
    raise exception 'duplicate message limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_public_launch_guard on public.messages;
create trigger messages_public_launch_guard
before insert on public.messages
for each row execute function private.enforce_message_guard();

create or replace function private.enforce_report_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare recent_hour integer;
begin
  if auth.uid() is not null and new.reporter_id<>auth.uid() then
    raise exception 'reporter mismatch';
  end if;
  if new.reporter_id=new.reported_id then
    raise exception 'cannot report yourself';
  end if;
  new.reason:=left(btrim(coalesce(new.reason,'')),120);
  new.details:=left(btrim(coalesce(new.details,'')),2000);
  if char_length(new.reason)<2 then
    raise exception 'choose a report reason';
  end if;

  select count(*)::int into recent_hour
  from public.reports
  where reporter_id=new.reporter_id and created_at>=now()-interval '1 hour';

  if recent_hour>=10 then
    raise exception 'report rate limit reached; try again later';
  end if;

  if exists(
    select 1 from public.reports
    where reporter_id=new.reporter_id
      and reported_id=new.reported_id
      and created_at>=now()-interval '24 hours'
      and status in ('open','reviewing')
  ) then
    raise exception 'you already reported this account recently';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_public_launch_guard on public.reports;
create trigger reports_public_launch_guard
before insert on public.reports
for each row execute function private.enforce_report_guard();

create index if not exists reports_reporter_target_recent_idx
  on public.reports(reporter_id,reported_id,created_at desc);

create index if not exists messages_sender_body_recent_idx
  on public.messages(sender_id,created_at desc);
