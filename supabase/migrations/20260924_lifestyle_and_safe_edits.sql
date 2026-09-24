-- Required lifestyle answers and safe edits to approved profiles.
alter table public.profiles add column if not exists cannabis_use text;
alter table public.profiles add column if not exists has_children text;
alter table public.profiles add column if not exists wants_children text;

CREATE OR REPLACE FUNCTION private.profile_launch_status(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.profiles%rowtype;
  photo_count integer := 0;
  face_video_count integer := 0;
  media_ready boolean := false;
  prompts_ready boolean := false;
  details_ready boolean := false;
  age_years integer := null;
  launch_ready boolean := false;
  missing text[] := '{}'::text[];
begin
  select * into p from public.profiles where id=p_user;
  if not found then
    return jsonb_build_object('exists',false,'photo_count',0,'photos_required',4,'face_video_submitted',false,'media_ready',false,'prompts_ready',false,'details_ready',false,'profile_complete',false,'verification_status','unverified','launch_ready',false);
  end if;

  if coalesce(p.birthdate,p.birth_date) is not null then
    age_years:=extract(year from age(current_date,coalesce(p.birthdate,p.birth_date)))::int;
  end if;

  select count(*)::int into photo_count
  from storage.objects o
  where o.bucket_id='profile-media'
    and o.owner_id=p_user::text
    and (storage.foldername(o.name))[1]=p_user::text
    and (coalesce(o.metadata->>'mimetype','') like 'image/%' or lower(o.name) ~ '\.(jpg|jpeg|png|webp)$');

  select count(*)::int into face_video_count
  from storage.objects o
  where o.bucket_id='verification-media'
    and o.owner_id=p_user::text
    and (storage.foldername(o.name))[1]=p_user::text
    and (coalesce(o.metadata->>'mimetype','') like 'video/%' or lower(o.name) ~ '\.(mp4|mov|webm)$');

  media_ready:=photo_count>=4 and face_video_count>=1;
  prompts_ready:=private.profile_has_minimum_prompts(p_user);
  details_ready:=coalesce(char_length(btrim(coalesce(p.display_name,''))) between 2 and 50
    and age_years is not null and age_years between 18 and 100
    and char_length(btrim(coalesce(p.gender,'')))>=1
    and char_length(btrim(coalesce(p.city,'')))>=2
    and char_length(btrim(coalesce(p.bio,'')))>=20
    and char_length(btrim(coalesce(p.relationship_intent,'')))>=2
    and prompts_ready
    and p.height_inches between 36 and 96
    and p.smoking in ('Never','Sometimes','Often','Quitting','Prefer not to say')
    and p.cannabis_use in ('Never','Sometimes','Often','Prefer not to say')
    and p.drinking in ('Never','Socially','Often','Prefer not to say')
    and p.has_children in ('Yes','No','Prefer not to say')
    and p.wants_children in ('Yes','No','Open to it','Not sure','Prefer not to say'),false);

  if char_length(btrim(coalesce(p.display_name,'')))<2 then missing:=array_append(missing,'name'); end if;
  if age_years is null or age_years<18 or age_years>100 then missing:=array_append(missing,'date of birth (age 18–100)'); end if;
  if char_length(btrim(coalesce(p.gender,'')))<1 then missing:=array_append(missing,'gender'); end if;
  if char_length(btrim(coalesce(p.city,'')))<2 then missing:=array_append(missing,'city'); end if;
  if char_length(btrim(coalesce(p.bio,'')))<20 then missing:=array_append(missing,'bio'); end if;
  if char_length(btrim(coalesce(p.relationship_intent,'')))<2 then missing:=array_append(missing,'relationship intent'); end if;
  if not prompts_ready then missing:=array_append(missing,'3 prompt answers'); end if;
  if p.height_inches is null or p.height_inches not between 36 and 96 then missing:=array_append(missing,'height'); end if;
  if p.smoking is null or p.smoking not in ('Never','Sometimes','Often','Quitting','Prefer not to say') then missing:=array_append(missing,'cigarette use'); end if;
  if p.cannabis_use is null or p.cannabis_use not in ('Never','Sometimes','Often','Prefer not to say') then missing:=array_append(missing,'weed use'); end if;
  if p.drinking is null or p.drinking not in ('Never','Socially','Often','Prefer not to say') then missing:=array_append(missing,'alcohol use'); end if;
  if p.has_children is null or p.has_children not in ('Yes','No','Prefer not to say') then missing:=array_append(missing,'whether you have kids'); end if;
  if p.wants_children is null or p.wants_children not in ('Yes','No','Open to it','Not sure','Prefer not to say') then missing:=array_append(missing,'whether you want kids'); end if;

  launch_ready:=media_ready and details_ready and p.profile_complete=true and p.profile_status='active' and p.is_visible=true and p.verification_status='verified' and p.liveness_verified=true and p.ai_media_verified=true;

  return jsonb_build_object(
    'exists',true,'photo_count',photo_count,'photos_required',4,'photos_remaining',greatest(0,4-photo_count),
    'face_video_count',face_video_count,'face_video_submitted',face_video_count>=1,'media_ready',media_ready,
    'prompts_ready',prompts_ready,'prompts_required',3,
    'details_ready',details_ready,'missing_details',to_jsonb(missing),'profile_complete',p.profile_complete,
    'profile_status',p.profile_status,'verification_status',p.verification_status,'liveness_verified',p.liveness_verified,
    'ai_media_verified',p.ai_media_verified,'is_visible',p.is_visible,'ready_for_review',media_ready and details_ready and p.profile_complete,
    'launch_ready',launch_ready
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.enforce_profile_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private'
AS $function$
declare
  self_update boolean:=false;
  system_update boolean:=coalesce(current_setting('app.veramor_system_update',true),'')='1';
  was_verified boolean:=false;
  birth_for_age date;
  age_years integer;
begin
  birth_for_age:=coalesce(new.birthdate,new.birth_date);
  if birth_for_age is not null then
    age_years:=extract(year from age(current_date,birth_for_age))::int;
    if birth_for_age>current_date or age_years<18 or age_years>100 then
      raise exception 'VERAMOR is for ages 18 to 100 only';
    end if;
  end if;
  if new.birthdate is not null and new.birth_date is not null and new.birthdate<>new.birth_date then
    new.birth_date:=new.birthdate;
  elsif new.birthdate is null and new.birth_date is not null then
    new.birthdate:=new.birth_date;
  elsif new.birth_date is null and new.birthdate is not null then
    new.birth_date:=new.birthdate;
  end if;
  if lower(coalesce(new.bio,'')) ~ '(onlyfans|fansly|escort|cash[[:space:]]?app|venmo[[:space:]]+me|telegram|whatsapp[[:space:]]+me|premium[[:space:]]+snap|buy[[:space:]]+content|subscribe[[:space:]]+to[[:space:]]+my|link[[:space:]]+in[[:space:]]+bio|https?://|www\\.)' then raise exception 'Links and solicitation are not allowed'; end if;

  self_update:=auth.uid() is not null and auth.uid()=new.id;
  if self_update and not system_update then
    if tg_op='INSERT' then
      new.plan:='free';new.profile_status:='onboarding';new.verification_status:='unverified';new.id_verified:=false;new.liveness_verified:=false;new.ai_media_verified:=false;new.is_visible:=false;new.profile_complete:=false;
    else
      was_verified:=old.verification_status='verified' and old.is_visible=true;
      new.plan:=old.plan;
      new.profile_status:=old.profile_status;
      new.id_verified:=old.id_verified;
      new.verification_status:=old.verification_status;
      new.liveness_verified:=old.liveness_verified;
      new.ai_media_verified:=old.ai_media_verified;
      new.is_visible:=old.is_visible;
      if was_verified then
        new.profile_complete:=old.profile_complete;
        if char_length(btrim(coalesce(new.display_name,'')))<2 or char_length(btrim(coalesce(new.city,'')))<2
          or char_length(btrim(coalesce(new.bio,'')))<20 or char_length(btrim(coalesce(new.relationship_intent,'')))<2
          or new.height_inches is null or new.smoking is null or new.drinking is null
          or new.cannabis_use is null or new.has_children is null or new.wants_children is null
          or jsonb_array_length(coalesce(new.prompts,'[]'::jsonb))<3 then
          raise exception 'Keep all required details and three prompts on your live profile';
        end if;
      end if;
      if new.profile_complete=true and not private.profile_media_ready(new.id) then new.profile_complete:=false; end if;
    end if;
  end if;

  if new.is_visible=true and not system_update and not private.profile_eligible_for_visibility(new.id) then new.is_visible:=false; end if;
  new.updated_at:=now();
  return new;
end;
$function$;


-- Newly uploaded profile photos require authenticity review, while prior face verification stays valid.
create or replace function private.flag_profile_media_change()
returns trigger language plpgsql security definer set search_path to '' as $photo$
begin
  if tg_op='INSERT' and new.bucket_id='profile-media' and new.owner_id is not null then
    perform pg_catalog.set_config('app.veramor_system_update','1',true);
    update public.profiles set verification_status='pending', ai_media_verified=false, is_visible=false
      where id=new.owner_id::uuid and verification_status='verified';
    perform pg_catalog.set_config('app.veramor_system_update','',true);
  elsif tg_op='DELETE' and old.bucket_id='profile-media' and old.owner_id is not null then
    if not private.profile_media_ready(old.owner_id::uuid) then
      perform pg_catalog.set_config('app.veramor_system_update','1',true);
      update public.profiles set profile_complete=false, is_visible=false, verification_status='pending'
        where id=old.owner_id::uuid and verification_status='verified';
      perform pg_catalog.set_config('app.veramor_system_update','',true);
    end if;
  end if;
  return coalesce(new,old);
end;
$photo$;

create trigger veramor_review_new_profile_photo after insert or delete on storage.objects
for each row execute function private.flag_profile_media_change();
