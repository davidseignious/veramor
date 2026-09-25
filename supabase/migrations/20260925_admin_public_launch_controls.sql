-- Owner launch controls for safe public rollout.

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
    'billing_live',coalesce((select enabled from private.feature_flags where flag='billing_live'),false)
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
declare clean_flag text:=lower(btrim(coalesce(p_flag,'')));
begin
  perform private.admin_preview_session_required(p_token);
  if clean_flag not in ('public_launch','signup_open','maintenance_mode','billing_live') then
    raise exception 'unsupported launch flag';
  end if;

  insert into private.feature_flags(flag,enabled,updated_at)
  values(clean_flag,coalesce(p_enabled,false),now())
  on conflict(flag) do update
    set enabled=excluded.enabled,updated_at=excluded.updated_at;

  insert into private.admin_audit_log(actor_id,action,details)
  values(null,'launch_flag_changed',jsonb_build_object('flag',clean_flag,'enabled',coalesce(p_enabled,false)));

  return public.admin_launch_config(p_token);
end;
$$;

revoke all on function public.admin_launch_config(text) from public,anon,authenticated;
revoke all on function public.admin_set_launch_flag(text,text,boolean) from public,anon,authenticated;
grant execute on function public.admin_launch_config(text) to service_role;
grant execute on function public.admin_set_launch_flag(text,text,boolean) to service_role;
