-- Manual preflight sign-offs required before owner can flip public launch on.

insert into private.feature_flags(flag,enabled)
values
  ('production_host_ready',false),
  ('public_legal_ready',false)
on conflict(flag) do nothing;

create or replace function public.admin_launch_config(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.admin_preview_session_required(p_token);
  return jsonb_build_object(
    'public_launch',coalesce((select enabled from private.feature_flags where flag='public_launch'),false),
    'signup_open',coalesce((select enabled from private.feature_flags where flag='signup_open'),true),
    'maintenance_mode',coalesce((select enabled from private.feature_flags where flag='maintenance_mode'),false),
    'billing_live',coalesce((select enabled from private.feature_flags where flag='billing_live'),false),
    'production_host_ready',coalesce((select enabled from private.feature_flags where flag='production_host_ready'),false),
    'public_legal_ready',coalesce((select enabled from private.feature_flags where flag='public_legal_ready'),false)
  );
end;
$$;

create or replace function public.admin_set_launch_flag(
  p_token text,
  p_flag text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  clean_flag text:=lower(btrim(coalesce(p_flag,'')));
  open_reports integer:=0;
  ready_profiles integer:=0;
  maintenance boolean:=false;
  host_ready boolean:=false;
  legal_ready boolean:=false;
begin
  perform private.admin_preview_session_required(p_token);
  if clean_flag not in (
    'public_launch','signup_open','maintenance_mode','billing_live',
    'production_host_ready','public_legal_ready'
  ) then
    raise exception 'unsupported launch flag';
  end if;

  if clean_flag='public_launch' and coalesce(p_enabled,false)=true then
    select count(*)::int into open_reports
    from public.reports
    where coalesce(status,'open') not in ('resolved','dismissed');

    select count(*)::int into ready_profiles
    from public.profiles p
    where private.profile_launch_ready(p.id);

    select coalesce(enabled,false) into maintenance
    from private.feature_flags where flag='maintenance_mode';
    select coalesce(enabled,false) into host_ready
    from private.feature_flags where flag='production_host_ready';
    select coalesce(enabled,false) into legal_ready
    from private.feature_flags where flag='public_legal_ready';

    if maintenance then raise exception 'turn off maintenance mode before public launch'; end if;
    if not host_ready then raise exception 'confirm the production host before public launch'; end if;
    if not legal_ready then raise exception 'confirm public Terms and Privacy review before public launch'; end if;
    if open_reports>0 then raise exception 'resolve open safety reports before public launch'; end if;
    if ready_profiles<1 then raise exception 'at least one verified launch-ready profile is required before public launch'; end if;
  end if;

  insert into private.feature_flags(flag,enabled,updated_at)
  values(clean_flag,coalesce(p_enabled,false),now())
  on conflict(flag) do update
    set enabled=excluded.enabled,updated_at=excluded.updated_at;

  if clean_flag='public_launch' and coalesce(p_enabled,false)=true then
    insert into private.feature_flags(flag,enabled,updated_at)
    values('beta_all_paid_perks',false,now())
    on conflict(flag) do update set enabled=false,updated_at=now();
  end if;

  insert into private.admin_audit_log(actor_id,action,details)
  values(null,'launch_flag_changed',jsonb_build_object('flag',clean_flag,'enabled',coalesce(p_enabled,false)));

  return public.admin_launch_config(p_token);
end;
$$;

revoke all on function public.admin_launch_config(text) from public,anon,authenticated;
revoke all on function public.admin_set_launch_flag(text,text,boolean) from public,anon,authenticated;
grant execute on function public.admin_launch_config(text) to service_role;
grant execute on function public.admin_set_launch_flag(text,text,boolean) to service_role;
