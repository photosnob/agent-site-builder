import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { FetchBlocked, SiteRefused } from "@/lib/import/safeFetch";
import { discoverOldUrls, refreshRedirectPaths, suggestRedirects } from "@/lib/redirects.server";

export const maxDuration = 60;

/** Reads the old site's sitemap and adds a suggested redirect for every old page. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const b = z.object({ url: z.string().trim().url().max(300) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Enter your old site's address, like https://janedoe.com", 422);
  let found: Awaited<ReturnType<typeof discoverOldUrls>>;
  try {
    found = await discoverOldUrls(b.data.url);
  } catch (e) {
    if (e instanceof FetchBlocked) return fail("That address isn't allowed.", 422);
    if (e instanceof SiteRefused) return fail("Your old site blocked our scanner. Paste your old URLs below instead (from your old site's sitemap or Google Search Console).", 422);
    return fail("Couldn't reach that site. Check the address, or paste your old URLs below.", 422);
  }
  const rows = await suggestRedirects(ctx.site.id, found.urls);
  if (rows.length) {
    const { error } = await createAdminClient().from("site_redirects").upsert(rows.map((r) => ({ ...r, site_id: ctx.site.id, source: "auto", permanent: true })), { onConflict: "site_id,from_path", ignoreDuplicates: true });
    if (error) return fail(error.message, 500);
    refreshRedirectPaths(ctx.site.slug, rows.map((r) => r.from_path));
  }
  return json({ scanned: found.urls.length, via: found.via, added: rows.length, review: rows.filter((r) => r.needs_review).length });
}
