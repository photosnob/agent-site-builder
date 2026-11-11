import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { importRemoteImage } from "@/lib/import/storeAsset";

export const maxDuration = 60;

/** Copies the photos the agent picked from a listing scan into their library, in order. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const b = z.object({ urls: z.array(z.string().url().max(1500)).min(1).max(20), address: z.string().max(160).optional() }).safeParse(await req.json().catch(() => null));
  if (!b.success) return fail("Pick up to 20 photos", 422);
  const allowed = new Set((ctx.site.import_data as { listingPhotoCandidates?: string[] } | null)?.listingPhotoCandidates ?? []);
  if (b.data.urls.some((u) => !allowed.has(u))) return fail("Only photos found on the listing page can be imported", 422);

  // A few at a time, so a 20-photo gallery stays within the time limit without hammering the source.
  const out: ({ url: string; path: string; source: string } | null)[] = new Array(b.data.urls.length).fill(null);
  let next = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (next < b.data.urls.length) {
      const i = next++;
      try { const s = await importRemoteImage(ctx.site.id, b.data.urls[i]); out[i] = { url: s.url, path: s.path, source: b.data.urls[i] }; } catch { /* skip this one */ }
    }
  }));
  const stored = out.filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (stored.length) {
    await createAdminClient().from("site_assets").insert(stored.map((s) => ({ site_id: ctx.site.id, kind: "listing", url: s.url, storage_path: s.path, source_url: s.source, meta: b.data.address ? { address: b.data.address } : {} })));
  }
  return json({ photos: stored.map((s) => s.url), failed: b.data.urls.length - stored.length });
}
