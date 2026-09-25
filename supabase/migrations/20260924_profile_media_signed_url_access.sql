-- Fix private profile photo signed URLs after operation-aware Storage RLS was introduced.
drop policy if exists profile_media_read_authenticated on storage.objects;

create policy profile_media_read_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-media'
  and storage.allow_any_operation(array[
    'object.get_authenticated_info',
    'object.get_authenticated',
    'object.sign'
  ])
  and (
    owner_id = (select auth.uid())::text
    or private.can_view_profile_owner((select auth.uid()), owner_id)
  )
);
