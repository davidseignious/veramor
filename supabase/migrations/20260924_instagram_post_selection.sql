-- Let members choose up to six Instagram photos and retain their choices on refresh.
CREATE OR REPLACE FUNCTION public.instagram_service_store_connection(p_user uuid, p_ig_user text, p_username text, p_account_type text, p_token text, p_expires_at timestamp with time zone, p_media jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare item jsonb; idx integer:=0;
begin
  insert into private.instagram_connections(user_id,instagram_user_id,username,account_type,access_token,token_expires_at,connected_at,last_synced_at,updated_at)
  values(p_user,p_ig_user,p_username,p_account_type,p_token,p_expires_at,now(),now(),now())
  on conflict(user_id) do update set instagram_user_id=excluded.instagram_user_id,username=excluded.username,account_type=excluded.account_type,access_token=excluded.access_token,token_expires_at=excluded.token_expires_at,last_synced_at=now(),updated_at=now();
  -- Keep members' selections when refreshing their Instagram feed.
  for item in select * from jsonb_array_elements(coalesce(p_media,'[]'::jsonb)) loop
    idx:=idx+1;
    exit when idx>24;
    insert into private.instagram_media(user_id,media_id,media_type,media_url,thumbnail_url,permalink,caption,posted_at,sort_order,selected,synced_at)
    values(p_user,item->>'id',coalesce(item->>'media_type','IMAGE'),item->>'media_url',item->>'thumbnail_url',item->>'permalink',left(coalesce(item->>'caption',''),1000),nullif(item->>'timestamp','')::timestamptz,idx,idx<=6,now())
    on conflict(user_id,media_id) do update set media_type=excluded.media_type,media_url=excluded.media_url,thumbnail_url=excluded.thumbnail_url,permalink=excluded.permalink,caption=excluded.caption,posted_at=excluded.posted_at,sort_order=excluded.sort_order,selected=private.instagram_media.selected,synced_at=now();
  end loop;
  delete from private.instagram_media where user_id=p_user and synced_at < now();
end $function$
;

create or replace function public.instagram_own_media()
returns jsonb language plpgsql stable security definer set search_path to '' as $ig$
declare me uuid:=auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('media_id',m.media_id,'thumbnail_url',m.thumbnail_url,'media_url',m.media_url,'permalink',m.permalink,'selected',m.selected) order by m.sort_order) from private.instagram_media m where m.user_id=me),'[]'::jsonb);
end;
$ig$;

create or replace function public.instagram_select_media(p_media_id text,p_selected boolean)
returns jsonb language plpgsql security definer set search_path to '' as $ig$
declare me uuid:=auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists(select 1 from private.instagram_media where user_id=me and media_id=p_media_id) then raise exception 'Photo unavailable'; end if;
  if p_selected and (select count(*) from private.instagram_media where user_id=me and selected and media_id<>p_media_id)>=6 then raise exception 'Choose up to six Instagram photos'; end if;
  update private.instagram_media set selected=p_selected where user_id=me and media_id=p_media_id;
  return jsonb_build_object('ok',true);
end;
$ig$;
revoke all on function public.instagram_own_media() from public,anon;
revoke all on function public.instagram_select_media(text,boolean) from public,anon;
grant execute on function public.instagram_own_media() to authenticated;
grant execute on function public.instagram_select_media(text,boolean) to authenticated;
