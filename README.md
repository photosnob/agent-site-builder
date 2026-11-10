# Launch & List (MVP)

A real estate agent signs up, answers a few questions, imports their headshot, listings, bio and testimonials from their current site, picks a design, and gets a generated site. They can then edit it with plain-English prompts, inside guardrails.

**Stack:** Next.js 16 (App Router) · Supabase (Auth, Postgres + RLS, Storage) · Claude API · Tailwind v4 · Vercel

## How it works

```
signup → profile → market → import (scan site → confirm picks) → template → generate → editor (prompt → preview → apply) → publish
```

- **Sites are data, not code.** Each site is a list of typed blocks (`lib/blocks/schema.ts`) plus design tokens (`lib/blocks/theme.ts`). One app renders every site (`components/site/SiteRenderer.tsx`), served at `<slug>.<ROOT_DOMAIN>` via `proxy.ts`.
- **Generation** (`lib/ai/generate.ts`): Claude writes *copy only*. Structure, images, testimonials and stats are assembled from what the agent supplied, so the AI can't invent reviews, numbers or image URLs. Without an API key it falls back to template copy.
- **Import** (`lib/import/`): fetches the agent's site through an SSRF-hardened fetcher. Many agent-site platforms block cloud servers; if `SCRAPINGBEE_API_KEY` is set, refused requests are retried through ScrapingBee (standard proxy, then premium). The importer then follows up to 3 about/listings pages, scores image candidates, and has Claude extract the bio and verbatim testimonials. The agent confirms everything; selected images are copied into Supabase Storage (never hot-linked). Only URLs from that scan can be imported.
- **Prompt edits** (`lib/ai/edit.ts`, `lib/guardrails/ops.ts`): Claude returns up to 12 typed operations (`set_text`, `add_block`, `move_block`, `set_theme`…), never a rewritten page. The server applies them to a copy and validates the result. It's saved as a **proposed** revision; the agent previews it, then applies or discards. Undo restores the previous applied revision.

### Blog

Agents write posts in a rich-text editor (`components/blog/PostEditor.tsx`, built on Tiptap): H2–H4 headings, bold/italic/underline/strike, links, lists, quotes, dividers, and images (upload, paste or drag in) with S/M/L/Full size presets, captions and alt text. Posts are stored as validated editor JSON (`lib/blog/content.ts`), never HTML, and rendered by our own renderer (`components/blog/PostBody.tsx`). Post images must come from the site's own storage. The post title is the page's only H1. Paste a YouTube or Vimeo link on its own line (or use the Video button) to embed it. Only the provider and video id are stored; posts load a thumbnail and fetch the player on click (privacy-enhanced youtube-nocookie / Vimeo dnt). Each post gets a table of contents built from its headings: a sticky sidebar with section highlighting on desktop, and a collapsible box on mobile. It can be turned off per post. Publishing runs the Fair Housing lint and adds BlogPosting structured data, a canonical URL and Open Graph tags.

Public URLs: `/s/<slug>/blog` on the app domain, or `<slug>.<root>/blog`, served from `app/h/[slug]` via `proxy.ts`.

### Pages, listings, reviews, team

Besides the home page, each site gets **Buy**, **Sell** (a seller's guide), **Meet the Team** and **Success Stories** pages (`lib/pages/defaults.ts`; Claude personalizes the Buy/Sell copy). Pages are edited with the same guarded prompt editor (pick the page at the top of the editor) and published together with the home page. Data-driven sections render from dashboard-managed tables, and changes there go live immediately:
- **Listings** (`/dashboard/listings`): hand-entered properties with photos, a stopgap until MLS/IDX. They replace the imported items in every Featured listings section.
- **Reviews** (`/dashboard/reviews`): curate, hide, reorder and star reviews. Starred ones show on the home page, and all visible ones on Success Stories. Imported testimonials are copied in the first time.
- **Team** (`/dashboard/team`): team members after the agent.
- **Logo** (Settings): solid backgrounds are removed in the browser (`lib/logo.ts`), previewed, then uploaded as a trimmed PNG.

### Templates and looks

Six templates (`lib/templates.ts`). Modern, Estate and Mid-Century use the classic block layouts. **Noir** (dark, light Montserrat, video hero, scrolling listings rail, full-height neighborhood photos), **Riviera** (dark film hero with tall serif type opening into a light gallery page, photo band, dark enquiry section) and **Bright** (white, bold Instrument Sans, two-tone headlines, pill buttons, rounded photos) set `theme.look`, which switches header, hero and section layouts (`components/site/looks.tsx`, `LookMenu.tsx`, look rules in `globals.css`). Looks are set by the template, never by prompts. Neighborhoods and call-to-action sections take optional photos from the agent's library (`set_image`, with `itemIndex` for a neighborhood). Video templates start on the first stock clip at 0.75× speed.

### Hero styles and Instagram

- **Hero styles** (editor → Hero style): Photo, Split, Centered, **Video** (full-screen looping MP4/WebM up to 50 MB, uploaded straight to storage with a signed URL, with a still image for reduced-motion visitors) and **Slideshow** (2–8 crossfading photos). Video and slideshow use a centered, uppercase luxury layout with an overlaid header, two buttons, the license line and a stats bar from the agent's claims.
- **Stock video library:** upload licensed clips to `site-assets/stock/` in Supabase Storage (optional same-name `.jpg` poster) and they appear for every agent.
- **Instagram** (Settings): Business Login for Instagram (`instagram_business_basic`). Tokens are encrypted (AES-GCM, `TOKEN_ENCRYPTION_KEY`) and refreshed before they expire. Posts are cached for an hour, and the home section shows the 3 latest. Serving agents' accounts beyond your own requires Meta's Advanced Access (App Review).

### Redirects from the agent's old site

`/dashboard/redirects`: the agent scans their old site (sitemap via robots.txt, sitemap_index.xml, wp-sitemap.xml; home page links as a fallback; limited to the folder entered, so an agent page on a brokerage site doesn't pull in the brokerage) and each old URL gets a suggested destination (`lib/redirects.ts`: matching post slug, page/section keywords, similar post titles; otherwise home/blog, flagged "Needs a look"). They can edit any row, add one, or paste a list. Redirects are only looked up where the site would otherwise 404 (`redirectOrNotFound`, plus the `[...path]` catch-all for deeper old URLs), so they cost nothing for normal page views; changes revalidate just the affected paths. They take effect once the old domain points at this app, which needs custom domains (see below).

### Email

New leads are emailed to the agent through Resend (`lib/email.ts`); replies go to the lead. Set `RESEND_API_KEY` and `EMAIL_FROM` (on a domain verified in Resend).

### SEO

Generated automatically for every site and refreshed on publish: `/sitemap.xml`, `/robots.txt` (on agent subdomains), `/llms.txt`, `/blog/rss.xml`, canonical URLs, Open Graph/Twitter cards, `RealEstateAgent` structured data on the home page, and `BlogPosting` on posts. Agents can override all of this in **Settings** (`/dashboard/settings`): site title, meta description, social share image, a "hide from search engines" switch, Google Search Console verification, and a custom llms.txt (paste or upload). Each post also has its own SEO title and meta description, with a search-result preview. The app's own domain serves its own robots.txt and sitemap. Until a root domain is configured, that sitemap lists the `/s/<slug>` sites.

### AI usage and limits

Every Claude call (site generation, import extraction, prompt edits) is logged to `ai_usage_events` with its tokens, estimated cost, latency and outcome. For edits it also records the prompt, its category (copy / layout / style / images / out of scope), and whether the agent applied or discarded it. `/admin` (restricted to `ADMIN_EMAILS`) shows daily cost by feature, spend per agent, what agents ask for, and recent prompts. From there you set:
- **Daily AI edits per agent** (default 30, overridable per agent). Resets at midnight in the configured time zone.
- **Global daily spend cap**. When reached, all AI features pause for the rest of the day. Generation falls back to template copy.
- **Token rates** used for cost estimates. Check them against Anthropic's pricing for your model.

### Guardrails

| Guard | Where |
|---|---|
| No HTML/scripts/URLs in any text field; length caps per field | `blocks/schema.ts` |
| Hero must be first and unique; contact section required | `SiteContent` refinements |
| License #, brokerage and Fair Housing disclaimer render from the profile, not content, so prompts can't touch them | `ComplianceFooter` |
| Images only from the site's own library | `applyEditPlan` |
| Stats only from numbers the agent entered | `applyEditPlan` |
| Colors/fonts only from curated sets, palettes limited per template | `theme.ts`, `templates.ts` |
| Fair Housing lint: exclusionary language blocks the edit; steering language needs confirmation | `guardrails/fairHousing.ts` |
| Unverified claims ("#1", "$500M", "top 1%") need confirmation | `lintClaims` |
| Out-of-scope requests (code, tracking, compliance info) are refused | edit system prompt |
| Scraped text is wrapped as untrusted data (prompt-injection defense) | `ai/claude.ts` |
| 40 AI edits/hour per site; lead form honeypot + IP rate limit | routes |
| Row-level security on every table; service role used only after ownership checks | `supabase/migrations` |

The Fair Housing lists are a starting point, not legal review. Have broker compliance counsel extend them.

## Setup

1. **Supabase:** create a project, then run each file in `supabase/migrations/` in order (`0001_init.sql`, `0002_blog.sql`, `0003_ai_usage.sql`, `0004_seo.sql`, `0005_pages_listings_reviews_team.sql`, `0006_hero_media_instagram.sql`, `0007_redirects.sql`, `0008_more_templates.sql`) in the SQL editor. Under Auth → URL Configuration, add `http://localhost:3000/auth/callback` (and your production URL) as a redirect.
2. **Env:** `cp .env.example .env.local` and fill in the Supabase keys and `ANTHROPIC_API_KEY`.
3. **Run:**
   ```bash
   npm install
   npm run dev        # http://localhost:3000
   npm test           # guardrail tests
   ```
   Published sites: `http://<slug>.lvh.me:3000` (lvh.me resolves to localhost) or `http://localhost:3000/s/<slug>`.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel. Add the same env vars, with `NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com`.
2. Add `yourdomain.com` and the wildcard `*.yourdomain.com` to the project. The wildcard requires Vercel nameservers.
3. Update the Supabase redirect URL to `https://yourdomain.com/auth/callback`.

## Not in this MVP (next steps)

- **Custom domains:** add via the Vercel Domains API, verify ownership, and resolve `sites.custom_domain` in `proxy.ts` (cache the lookup).
- **MLS feed:** RESO Web API ingestion → `featured-listings` sourced from the feed, plus per-MLS display rules.
- **Lead routing:** email/SMS notifications (with TCPA-compliant consent capture), CRM sync, Turnstile on forms.
- **Production hardening:** a shared rate limiter (Upstash/Vercel KV), IP-pinned fetches against DNS rebinding, image resizing, more block types, a direct-manipulation editor for small text tweaks, and multi-page sites (neighborhood pages for SEO).
