-- Launch & List's own blog (launchandlist.com/blog), written by admins.
-- Same shape as blog_posts, minus site_id. Run in the Supabase SQL editor after 0008.

create table public.platform_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  title            text not null default 'Untitled post' check (char_length(title) <= 160),
  excerpt          text check (char_length(excerpt) <= 300),
  meta_description text check (char_length(meta_description) <= 160),
  seo_title        text check (char_length(seo_title) <= 120),
  cover_image      text,
  -- Validated editor JSON (never raw HTML). Rendered server-side by our own renderer.
  content          jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  show_toc         boolean not null default true,
  status           text not null default 'draft' check (status in ('draft','published')),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index platform_posts_status_idx on public.platform_posts(status, published_at desc);

create trigger platform_posts_touch before update on public.platform_posts
for each row execute function public.touch_updated_at();

-- No policies: only server routes (service role, after an admin check) read or write.
alter table public.platform_posts enable row level security;
