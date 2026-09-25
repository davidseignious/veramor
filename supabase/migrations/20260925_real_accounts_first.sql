-- Preserve real-account-first ordering at the database boundary.

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
  ),
  visible as (
    select
      (c.profile - 'university_domain') as profile,
      c.distance_miles,
      coalesce((c.profile->>'is_demo_profile')::boolean,false) as is_demo
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
    )
  )
  select profile,distance_miles
  from visible
  order by is_demo asc, distance_miles nulls last;
$$;
