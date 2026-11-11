import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { FetchBlocked, SiteRefused, scraperEnabled } from "@/lib/import/safeFetch";
import { scrapeAgentSite } from "@/lib/import/scrape";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

export const maxDuration = 60;

/** Reads the agent's existing site and returns candidates. Nothing is imported until they confirm. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const body = z.object({ url: z.string().url().max(300) }).safeParse(await req.json());
  if (!body.success) return fail("Enter a full URL, like https://yoursite.com");

  try {
    const result = await scrapeAgentSite(body.data.url, ctx.site.agent.name ?? "", { siteId: ctx.site.id, userId: ctx.user.id });
    // Remember the candidate list server-side; the confirm step may only import these URLs.
    // Scans add up: an agent can scan several sites (their own, their brokerage profile, Zillow…)
    // and pick from everything found.
    const prev = (ctx.site.import_data ?? {}) as { sourceUrl?: string; sourceUrls?: string[]; candidates?: string[]; specialties?: string[] };
    const found = [...result.headshots.map((h) => h.url), ...result.listings.map((l) => l.url), result.logo].filter((u): u is string => Boolean(u));
    await createAdminClient()
      .from("sites")
      .update({
        import_data: {
          ...prev,
          sourceUrl: prev.sourceUrl ?? result.sourceUrl,
          sourceUrls: [...new Set([...(prev.sourceUrls ?? (prev.sourceUrl ? [prev.sourceUrl] : [])), result.sourceUrl])].slice(-10),
          specialties: [...new Set([...(prev.specialties ?? []), ...result.specialties])].slice(0, 20),
          candidates: [...new Set([...(prev.candidates ?? []), ...found])].slice(-1000),
        },
      })
      .eq("id", ctx.site.id);
    return json(result);
  } catch (e) {
    if (e instanceof FetchBlocked) return fail(`That address can't be imported (${e.message}).`, 422);
    if (e instanceof SiteRefused) {
      const detail = isAdminEmail(ctx.user.email) ? `${e.message}${scraperEnabled() ? "" : ". Add SCRAPINGBEE_API_KEY in Vercel to retry blocked sites through a scraping service."}` : undefined;
      return fail("That site blocks automated readers, so we couldn't scan it. Upload your headshot and a few listing photos below instead.", 422, { detail });
    }
    console.error(e);
    return fail("We couldn't read that site. You can upload a headshot instead.", 502);
  }
}
