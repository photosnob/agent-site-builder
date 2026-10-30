-- Agent Site Builder: core schema
-- Run in Supabase SQL editor or with `supabase db push`.

create extension if not exists "pgcrypto";

-- One site per agent for the MVP (teams/brokerages later via an orgs table).
create table public.sites (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  slug             text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  status           text not null default 'onboarding' check (status in ('onboarding','draft','live','suspended')),
  template         text check (template in ('modern','estate','midcentury')),
  onboarding_step  int  not null default 1,
  -- Facts the agent stated. Compliance fields (license, brokerage) live here and
  -- are never editable by AI prompts.
  agent            jsonb not null default '{}'::jsonb,
  -- What the importer found on the agent's existing site (untrusted data).
  import_data      jsonb,
  theme            jsonb,            -- validated design tokens
  content          jsonb,            -- draft: { blocks: Block[] }
  published_content jsonb,           -- what the public site renders
  published_theme  jsonb,
  custom_domain    text unique,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index sites_owner_idx on public.sites(owner_id);

-- Images copied into our storage (never hot-linked from the agent's old site).
create table public.site_assets (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  kind        text not null check (kind in ('headshot','logo','listing','other')),
  url         text not null,          -- public URL in our bucket
  storage_path text not null,
  source_url  text,                   -- where it was imported from
  meta        jsonb not null default '{}'::jsonb,  -- alt, address, price, etc.
  created_at  timestamptz not null default now()
);
create index site_assets_site_idx on public.site_assets(site_id);

-- Every change to content/theme is a revision. AI edits are created as
-- 'proposed' and only become the draft when the agent accepts them.
create table public.site_revisions (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  status      text not null default 'applied' check (status in ('proposed','applied','discarded')),
  source      text not null check (source in ('generate','ai_edit','undo','manual')),
  prompt      text,
  ops         jsonb,                  -- the validated edit operations
  warnings    jsonb not null default '[]'::jsonb,
  content     jsonb not null,
  theme       jsonb not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index site_revisions_site_idx on public.site_revisions(site_id, created_at desc);

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  name        text not null check (char_length(name) <= 120),
  email       text check (char_length(email) <= 200),
  phone       text check (char_length(phone) <= 40),
  message     text check (char_length(message) <= 2000),
  intent      text check (intent in ('contact','valuation','listing')),
  page_path   text,
  created_at  timestamptz not null default now()
);
create index leads_site_idx on public.leads(site_id, created_at desc);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger sites_touch before update on public.sites
for each row execute function public.touch_updated_at();

-- ---------- Row-level security ----------
alter table public.sites          enable row level security;
alter table public.site_assets    enable row level security;
alter table public.site_revisions enable row level security;
alter table public.leads          enable row level security;

create policy "owner reads sites"   on public.sites for select using (owner_id = auth.uid());
create policy "owner creates sites" on public.sites for insert with check (owner_id = auth.uid());
create policy "owner updates sites" on public.sites for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.owns_site(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sites where id = sid and owner_id = auth.uid());
$$;

create policy "owner reads assets"    on public.site_assets    for select using (public.owns_site(site_id));
create policy "owner deletes assets"  on public.site_assets    for delete using (public.owns_site(site_id));
create policy "owner reads revisions" on public.site_revisions for select using (public.owns_site(site_id));
create policy "owner reads leads"     on public.leads          for select using (public.owns_site(site_id));

-- Asset/revision/lead inserts and publishing go through server routes using the
-- service role, after validation. There are intentionally no client insert
-- policies on those tables. Public sites are rendered server-side, so anon has
-- no direct table access at all.

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/avif','image/gif'])
on conflict (id) do nothing;
