-- AI usage tracking and limits. Run in the Supabase SQL editor after 0002_blog.sql.

-- One row per Claude API call.
create table public.ai_usage_events (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid references public.sites(id) on delete set null,
  user_id       uuid references auth.users(id) on delete set null,
  feature       text not null check (feature in ('generate','import_extract','edit')),
  model         text not null,
  prompt        text,                         -- what the agent typed (edits only)
  categories    text[] not null default '{}', -- copy / layout / style / images / out_of_scope
  outcome       text not null default 'ok'
                check (outcome in ('ok','proposed','applied','discarded','rejected','refused','error','blocked_limit')),
  revision_id   uuid references public.site_revisions(id) on delete set null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens  int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd      numeric(12,6) not null default 0, -- computed with the rates in effect at the time
  latency_ms    int,
  error         text,
  created_at    timestamptz not null default now()
);
create index ai_usage_created_idx on public.ai_usage_events(created_at desc);
create index ai_usage_site_idx on public.ai_usage_events(site_id, feature, created_at desc);
create index ai_usage_revision_idx on public.ai_usage_events(revision_id);

-- Admin-tunable settings (limits, pricing). Single row per key.
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values ('ai', '{
  "defaultDailyEditsPerSite": 30,
  "globalDailySpendUsd": 10,
  "timezone": "America/Los_Angeles",
  "pricing": { "inputPerM": 2.0, "outputPerM": 10.0, "cacheWritePerM": 2.5, "cacheReadPerM": 0.1 }
}'::jsonb) on conflict (key) do nothing;

-- Per-agent override of the daily edit limit (null = use the default).
alter table public.sites add column if not exists ai_daily_edit_limit int check (ai_daily_edit_limit >= 0);

-- Admin-only data: RLS on with no policies, so only the service role can read or write.
alter table public.ai_usage_events enable row level security;
alter table public.app_settings    enable row level security;

-- Fast spend total for the global cap check.
create or replace function public.ai_spend_since(since timestamptz) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_usd), 0) from public.ai_usage_events where created_at >= since;
$$;
revoke execute on function public.ai_spend_since(timestamptz) from public, anon, authenticated;
grant execute on function public.ai_spend_since(timestamptz) to service_role;
