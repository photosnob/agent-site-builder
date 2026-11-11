import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { FetchBlocked, SiteRefused } from "@/lib/import/safeFetch";
import { scrapeListing } from "@/lib/import/listing";

export const maxDuration = 60;

/** Reads a listing page and returns a draft for the agent to review. Nothing is saved. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const b = z.object({ url: z.string().trim().url().max(1000) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Paste the full link to the listing, starting with https://", 422);
  try {
    const result = await scrapeListing(b.data.url, { siteId: ctx.site.id, userId: ctx.user.id });
    // Only photos found by a scan may be copied in later (same rule as onboarding import).
    const prev = (ctx.site.import_data ?? {}) as Record<string, unknown> & { listingPhotoCandidates?: string[] };
    await createAdminClient().from("sites").update({
      import_data: { ...prev, listingPhotoCandidates: [...new Set([...(prev.listingPhotoCandidates ?? []), ...result.photos])].slice(-600) },
    }).eq("id", ctx.site.id);
    return json(result);
  } catch (e) {
    if (e instanceof FetchBlocked) return fail("That link can't be read.", 422);
    if (e instanceof SiteRefused) return fail("That site blocks automated readers, so we couldn't read the listing. Add it by hand instead.", 422);
    console.error(e);
    return fail("We couldn't read that page. Check the link, or add the listing by hand.", 502);
  }
}
