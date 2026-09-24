-- The API firewall records each request, so these authenticated RPCs must run
-- in read/write transactions even though they only return data.
alter function public.instagram_carousel(uuid) volatile;
alter function public.instagram_own_media() volatile;
alter function public.instagram_service_connection(uuid) volatile;
