import { z } from "zod";
import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { FetchBlocked, diagnoseFetch, fetchWithFallback } from "@/lib/import/safeFetch";
import { parsePage } from "@/lib/import/scrape";

export const maxDuration = 60;

/** Admin diagnostic: shows each fetch step for a URL and what the importer would find. */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail("Not found", 404);
  const body = z.object({ url: z.string().url(), agentName: z.string().max(80).optional() }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Enter a full URL", 422);
  try {
    const d = await diagnoseFetch(body.data.url);
    let found: Record<string, unknown> | null = null;
    if (d.bytes > 0) {
      const r = await fetchWithFallback(body.data.url); // served from the remembered tier
      const p = parsePage(r.body.toString("utf8"), r.url, body.data.agentName ?? "");
      found = {
        headshots: p.headshots.slice(0, 3).map((h) => h.url),
        listings: p.listings.length,
        idxWidget: p.idxWidget,
        textChars: p.text.length,
        textSample: p.text.slice(0, 200),
      };
    }
    return json({ ...d, found });
  } catch (e) {
    if (e instanceof FetchBlocked) return fail(e.message, 422);
    return fail((e as Error).message, 500);
  }
}
