# Agent Site Builder (MVP)

A real estate agent signs up, answers a few questions, imports their headshot, listings, bio and testimonials from their current site, picks a design, and gets a generated site. They can then edit it with plain-English prompts, inside guardrails.

**Stack:** Next.js 16 (App Router) · Supabase (Auth, Postgres + RLS, Storage) · Claude API · Tailwind v4 · Vercel

## How it works

```
signup → profile → market → import (scan site → confirm picks) → template → generate → editor (prompt → preview → apply) → publish
```

- **Sites are data, not code.** Each site is a list of typed blocks (`lib/blocks/schema.ts`) plus design tokens (`lib/blocks/theme.ts`). One app renders every site (`components/site/SiteRenderer.tsx`), served at `<slug>.<ROOT_DOMAIN>` via `proxy.ts`.
- **Generation** (`lib/ai/generate.ts`): Claude writes *copy only*. Structure, images, testimonials and stats are assembled from what the agent supplied, so the AI can't invent reviews, numbers or image URLs. Without an API key it falls back to template copy.
- **Import** (`lib/import/`): fetches the agent's site through an SSRF-hardened fetcher, follows up to 3 about/listings pages, scores image candidates, and has Claude extract the bio and verbatim testimonials. The agent confirms everything; selected images are copied into Supabase Storage (never hot-linked). Only URLs from that scan can be imported.
- **Prompt edits** (`lib/ai/edit.ts`, `lib/guardrails/ops.ts`): Claude returns up to 12 typed operations (`set_text`, `add_block`, `move_block`, `set_theme`…), never a rewritten page. The server applies them to a copy and validates the result. It's saved as a **proposed** revision; the agent previews it, then applies or discards. Undo restores the previous applied revision.

### Blog

Agents write posts in a rich-text editor (`components/blog/PostEditor.tsx`, built on Tiptap): H2–H4 headings, bold/italic/underline/strike, links, lists, quotes, dividers, and images (upload, paste or drag in) with S/M/L/Full size presets, captions and alt text. Posts are stored as validated editor JSON (`lib/blog/content.ts`), never HTML, and rendered by our own renderer (`components/blog/PostBody.tsx`). Post images must come from the site's own storage. The post title is the page's only H1. Each post gets a table of contents built from its headings: a sticky sidebar with section highlighting on desktop, and a collapsible box on mobile. It can be turned off per post. Publishing runs the Fair Housing lint and adds BlogPosting structured data, a canonical URL and Open Graph tags.

Public URLs: `/s/<slug>/blog` on the app domain, or `<slug>.<root>/blog`, served from `app/h/[slug]` via `proxy.ts`.

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

1. **Supabase:** create a project, then run each file in `supabase/migrations/` in order (`0001_init.sql`, `0002_blog.sql`, `0003_ai_usage.sql`) in the SQL editor. Under Auth → URL Configuration, add `http://localhost:3000/auth/callback` (and your production URL) as a redirect.
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
