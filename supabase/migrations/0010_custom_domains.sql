-- Custom domains: status of the agent's own domain (sites.custom_domain already exists, unique).
-- Run in the Supabase SQL editor after 0009_platform_blog.sql.
alter table public.sites
  add column if not exists domain_status text check (domain_status in ('pending', 'active', 'error')),
  add column if not exists domain_checked_at timestamptz;
create index if not exists sites_custom_domain on public.sites (custom_domain) where custom_domain is not null;
