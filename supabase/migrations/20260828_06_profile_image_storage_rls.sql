-- Profile picture uploads (backend/auth.ts uploadProfileImage) write to the `images` storage
-- bucket under `profileImages/{userId}/avatar.{ext}`. That bucket's existing storage.objects RLS
-- policies only recognize the folders already in use (e.g. schoolID/, incidentDetailsMedia/), so
-- writes to the new profileImages/ folder were rejected with "new row violates row-level security
-- policy". This adds policies scoped to a user's own `profileImages/{auth.uid()}/...` folder,
-- mirroring the existing schoolID/{userId}/... per-user-folder convention, plus public read so
-- profile pictures keep working everywhere they're already rendered via a public URL (chat,
-- incident details, nav headers, etc).

drop policy if exists "Users can upload their own profile image" on storage.objects;
create policy "Users can upload their own profile image"
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'profileImages'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can replace their own profile image" on storage.objects;
create policy "Users can replace their own profile image"
  on storage.objects for update
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'profileImages'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'profileImages'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Users can delete their own profile image" on storage.objects;
create policy "Users can delete their own profile image"
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'profileImages'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Profile images are publicly readable" on storage.objects;
create policy "Profile images are publicly readable"
  on storage.objects for select
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'profileImages'
  );
