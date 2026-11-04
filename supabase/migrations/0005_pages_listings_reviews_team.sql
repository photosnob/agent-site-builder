-- Multi-page sites, manual listings, curated reviews and team members.
-- Run in the Supabase SQL editor after 0004_seo.sql.

-- Extra pages (Buy, Sell, Team, Success Stories…). The home page stays in sites.content.
create table public.site_pages (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null references public.sites(id) on delete cascade,
  slug              text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$'),
  kind              text not null check (kind in ('buy','sell','team','reviews','custom')),
  title             text not null check (char_length(title) <= 80),
  nav_label         text not null check (char_length(nav_label) <= 30),
  enabled           boolean not null default true,
  position          int not null default 0,
  content           jsonb not null,           -- draft blocks
  published_content jsonb,                    -- what the public page renders
  seo_title         text check (char_length(seo_title) <= 120),
  meta_description  text check (char_length(meta_description) <= 300),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (site_id, slug)
);
create trigger site_pages_touch before update on public.site_pages for each row execute function public.touch_updated_at();

-- Listings entered by hand until an MLS/IDX feed is connected.
create table public.site_listings (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  address     text not null check (char_length(address) <= 160),
  city        text check (char_length(city) <= 80),
  price       text check (char_length(price) <= 40),
  status      text not null default 'active' check (status in ('active','pending','sold','coming-soon')),
  beds        numeric(4,1) check (beds >= 0 and beds <= 50),
  baths       numeric(4,1) check (baths >= 0 and baths <= 50),
  sqft        int check (sqft >= 0 and sqft <= 200000),
  description text check (char_length(description) <= 2000),
  photos      text[] not null default '{}',   -- URLs in our storage, first is the cover
  link_url    text check (char_length(link_url) <= 500),
  featured    boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index site_listings_site_idx on public.site_listings(site_id, position);
create trigger site_listings_touch before update on public.site_listings for each row execute function public.touch_updated_at();

-- Client reviews the agent curates (imported, typed in, or copied from review sites).
create table public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  quote      text not null check (char_length(quote) <= 1500),
  author     text not null check (char_length(author) <= 80),
  context    text check (char_length(context) <= 120),   -- e.g. "Sold in Willow Glen"
  rating     smallint check (rating between 1 and 5),
  source     text not null default 'manual' check (source in ('imported','manual','google','zillow','yelp','other')),
  visible    boolean not null default true,
  featured   boolean not null default false,            -- shown on the home page
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index testimonials_site_idx on public.testimonials(site_id, position);

create table public.team_members (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  name       text not null check (char_length(name) <= 80),
  title      text check (char_length(title) <= 80),
  photo      text,
  bio        text check (char_length(bio) <= 1500),
  email      text check (char_length(email) <= 200),
  phone      text check (char_length(phone) <= 40),
  license    text check (char_length(license) <= 60),
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index team_members_site_idx on public.team_members(site_id, position);

-- Revisions can belong to a page (null = home page).
alter table public.site_revisions add column if not exists page_id uuid references public.site_pages(id) on delete cascade;

-- RLS: owners can read; writes go through validated server routes.
alter table public.site_pages    enable row level security;
alter table public.site_listings enable row level security;
alter table public.testimonials  enable row level security;
alter table public.team_members  enable row level security;
create policy "owner reads pages"    on public.site_pages    for select using (public.owns_site(site_id));
create policy "owner reads listings" on public.site_listings for select using (public.owns_site(site_id));
create policy "owner reads reviews"  on public.testimonials  for select using (public.owns_site(site_id));
create policy "owner reads team"     on public.team_members  for select using (public.owns_site(site_id));

notify pgrst, 'reload schema';
