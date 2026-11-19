-- Two new templates: monument and heritage.
-- Run in the Supabase SQL editor after 0010_custom_domains.sql.
alter table public.sites drop constraint if exists sites_template_check;
alter table public.sites add constraint sites_template_check
  check (template in ('modern','estate','midcentury','noir','riviera','bright','monument','heritage'));
