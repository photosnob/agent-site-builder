-- Hero videos and Instagram. Run in the Supabase SQL editor after 0005.

-- Allow short MP4/WebM hero videos (uploaded straight to storage) up to 50 MB.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','video/webm']
where id = 'site-assets';

-- Instagram connection per site (Business Login for Instagram).
-- The access token is encrypted by the app before it's stored.
create table public.instagram_connections (
  site_id         uuid primary key references public.sites(id) on delete cascade,
  ig_user_id      text not null,
  username        text,
  token_enc       text not null,
  expires_at      timestamptz not null,
  media           jsonb not null default '[]'::jsonb,  -- cached recent posts
  media_cached_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger instagram_connections_touch before update on public.instagram_connections for each row execute function public.touch_updated_at();
-- Service role only (tokens never reach the browser).
alter table public.instagram_connections enable row level security;

notify pgrst, 'reload schema';
