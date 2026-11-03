-- SEO settings. Run in the Supabase SQL editor after 0003_ai_usage.sql.

-- Agent-editable SEO overrides for the whole site:
-- { title, description, ogImage, noindex, googleVerification, llmsTxt }
alter table public.sites add column if not exists seo jsonb not null default '{}'::jsonb;

-- Custom search-result title for a blog post (falls back to the post title).
alter table public.blog_posts add column if not exists seo_title text check (char_length(seo_title) <= 120);

notify pgrst, 'reload schema';
