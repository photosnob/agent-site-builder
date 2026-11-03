-- Blog posts. Run in the Supabase SQL editor after 0001_init.sql.

create table public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites(id) on delete cascade,
  slug             text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  title            text not null default 'Untitled post' check (char_length(title) <= 160),
  excerpt          text check (char_length(excerpt) <= 300),
  meta_description text check (char_length(meta_description) <= 160),
  cover_image      text,
  -- Validated editor JSON (never raw HTML). Rendered server-side by our own renderer.
  content          jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  show_toc         boolean not null default true,
  status           text not null default 'draft' check (status in ('draft','published')),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (site_id, slug)
);
create index blog_posts_site_idx on public.blog_posts(site_id, status, published_at desc);

create trigger blog_posts_touch before update on public.blog_posts
for each row execute function public.touch_updated_at();

alter table public.blog_posts enable row level security;
create policy "owner reads posts" on public.blog_posts for select using (public.owns_site(site_id));
-- Writes go through server routes (validated, service role) after an ownership check.
