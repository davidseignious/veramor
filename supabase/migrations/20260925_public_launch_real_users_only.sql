-- Keep beta/demo behavior out of public launch.

create or replace function public.get_discovery_candidates()
returns table(profile jsonb, distance_miles numeric)
language sql
set search_path to 'public','private'
as $$
  with campus as (
    select
      p.university_verified as me_verified,
      p.university_domain as me_domain,
      coalesce(us.university_mode_enabled,false) as enabled,
      coalesce(us.university_scope,'same_school') as scope
    from public.profiles p
    left join public.user_settings us on us.user_id=p.id
    where p.id=auth.uid()
  ),
  launch as (
    select coalesce((select enabled from private.feature_flags where flag='public_launch'),false) as public_launch
  )
  select (c.profile - 'university_domain') as profile,c.distance_miles
  from private.get_discovery_candidates_impl() c
  cross join campus u
  cross join launch l
  where not exists (
    select 1 from public.passes ps
    where ps.passer_id=auth.uid()
      and ps.passed_id=(c.profile->>'id')::uuid
      and ps.created_at>=now()-interval '30 days'
  )
  and (
    not l.public_launch
    or coalesce((c.profile->>'is_demo_profile')::boolean,false)=false
  )
  and (
    not u.enabled
    or (
      u.me_verified=true
      and coalesce((c.profile->>'university_verified')::boolean,false)=true
      and (
        u.scope='all_colleges'
        or lower(coalesce(c.profile->>'university_domain',''))=lower(coalesce(u.me_domain,''))
      )
    )
  );
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

  if clean_flag='public_launch' and coalesce(p_enabled,false)=true then
    insert into private.feature_flags(flag,enabled,updated_at)
    values('beta_all_paid_perks',false,now())
    on conflict(flag) do update
      set enabled=false,updated_at=now();
  end if;

  insert into private.admin_audit_log(actor_id,action,details)
  values(null,'launch_flag_changed',jsonb_build_object('flag',clean_flag,'enabled',coalesce(p_enabled,false)));

  return public.admin_launch_config(p_token);
end;
$$;

revoke all on function public.admin_set_launch_flag(text,text,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_launch_flag(text,text,boolean) to service_role;
