-- New site templates: noir, riviera, bright.
-- Run in the Supabase SQL editor after 0007_redirects.sql.
alter table public.sites drop constraint if exists sites_template_check;
alter table public.sites add constraint sites_template_check
  check (template in ('modern','estate','midcentury','noir','riviera','bright'));
