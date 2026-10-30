import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { FetchBlocked } from "@/lib/import/safeFetch";
import { scrapeAgentSite } from "@/lib/import/scrape";
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
    const result = await scrapeAgentSite(body.data.url, ctx.site.agent.name ?? "");
    // Remember the candidate list server-side; the confirm step may only import these URLs.
    await createAdminClient()
      .from("sites")
      .update({
        import_data: {
          sourceUrl: result.sourceUrl,
          bio: result.bio,
          testimonials: result.testimonials,
          specialties: result.specialties,
          candidates: [...result.headshots.map((h) => h.url), ...result.listings.map((l) => l.url), result.logo].filter(Boolean),
        },
      })
      .eq("id", ctx.site.id);
    return json(result);
  } catch (e) {
    if (e instanceof FetchBlocked) return fail(`That address can't be imported (${e.message}).`, 422);
    console.error(e);
    return fail("We couldn't read that site. You can upload a headshot instead.", 502);
  }
}
