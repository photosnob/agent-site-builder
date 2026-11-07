-- Redirects from an agent's old website URLs to their new pages.
-- Run in the Supabase SQL editor after 0006_hero_media_instagram.sql.
create table public.site_redirects (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.sites(id) on delete cascade,
  from_path    text not null check (from_path ~ '^/.' and char_length(from_path) <= 500),  -- normalized: lowercase, no trailing slash, no query
  to_path      text not null check (char_length(to_path) <= 800),                         -- "/page", "/#contact" or an https URL
  permanent    boolean not null default true,                                             -- 301-style (true) or temporary
  source       text not null default 'manual' check (source in ('manual','auto','import')),
  needs_review boolean not null default false,                                            -- auto-matched with low confidence
  created_at   timestamptz not null default now(),
  unique (site_id, from_path)
);
create index site_redirects_site on public.site_redirects (site_id);
alter table public.site_redirects enable row level security;
create policy "owner reads redirects" on public.site_redirects for select using (public.owns_site(site_id));

notify pgrst, 'reload schema';
