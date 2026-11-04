import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { importRemoteImage, storeImage } from "@/lib/import/storeAsset";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const maxDuration = 60;

const Confirm = z.object({
  headshotUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  listings: z
    .array(z.object({
      url: z.string().url(),
      address: z.string().max(120).optional(),
      price: z.string().max(30).optional(),
      status: z.enum(["active", "pending", "sold", "coming-soon"]).optional(),
    }))
    .max(12)
    .default([]),
});

/**
 * POST application/json   → import the candidates the agent selected from the scan
 * POST multipart/form-data → direct upload (file, kind=headshot|logo|listing)
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const admin = createAdminClient();
  const siteId = ctx.site.id;

  if ((req.headers.get("content-type") || "").startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const kind = z.enum(["headshot", "logo", "listing", "other"]).safeParse(form.get("kind"));
    if (!(file instanceof File) || !kind.success) return fail("Missing file or kind");
    if (file.size > 8_000_000) return fail("Images must be under 8 MB");
    try {
      const stored = await storeImage(siteId, Buffer.from(await file.arrayBuffer()));
      // One headshot and one logo per site: replace the previous one.
      let previous: string[] = [];
      if (kind.data === "headshot" || kind.data === "logo") {
        const { data: old } = await admin.from("site_assets").select("url").eq("site_id", siteId).eq("kind", kind.data);
        previous = (old ?? []).map((r) => r.url as string);
        await admin.from("site_assets").delete().eq("site_id", siteId).eq("kind", kind.data);
      }
      const { data } = await admin.from("site_assets").insert({ site_id: siteId, kind: kind.data, url: stored.url, storage_path: stored.path, meta: {} }).select("id, kind, url, meta").single();
      if (kind.data === "headshot" && previous.length) await swapImageUrl(admin, siteId, previous, stored.url);
      // Header logo and author photo appear on every page, so refresh the whole site.
      if (kind.data === "headshot" || kind.data === "logo") for (const m of ["s", "h"]) revalidatePath(`/${m}/${ctx.site.slug}`, "layout");
      return json({ asset: data });
    } catch {
      return fail("That file isn't a supported image (JPG, PNG, WebP, AVIF).", 422);
    }
  }

  const body = Confirm.safeParse(await req.json());
  if (!body.success) return fail("Invalid selection", 422);
  const allowed = new Set<string>((ctx.site.import_data as { candidates?: string[] } | null)?.candidates ?? []);
  const picks = [
    ...(body.data.headshotUrl ? [{ kind: "headshot", url: body.data.headshotUrl, meta: {} }] : []),
    ...(body.data.logoUrl ? [{ kind: "logo", url: body.data.logoUrl, meta: {} }] : []),
    ...body.data.listings.map((l) => ({ kind: "listing", url: l.url, meta: { address: l.address, price: l.price, status: l.status } })),
  ];
  if (picks.some((p) => !allowed.has(p.url))) return fail("Only images found by the scan can be imported", 422);

  const results = await Promise.allSettled(
    picks.map(async (p) => {
      const stored = await importRemoteImage(siteId, p.url);
      return { site_id: siteId, kind: p.kind, url: stored.url, storage_path: stored.path, source_url: p.url, meta: p.meta };
    }),
  );
  const rows = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (rows.some((r) => r.kind === "headshot")) await admin.from("site_assets").delete().eq("site_id", siteId).eq("kind", "headshot");
  if (rows.length) await admin.from("site_assets").insert(rows);
  return json({ imported: rows.length, failed: results.length - rows.length });
}

/** Pages that showed the old headshot (About photo, hero) switch to the new one, draft and live. */
async function swapImageUrl(admin: ReturnType<typeof createAdminClient>, siteId: string, from: string[], to: string) {
  const swap = (v: unknown) => {
    if (!v) return { v, changed: false };
    let text = JSON.stringify(v);
    const before = text;
    for (const f of from) text = text.split(JSON.stringify(f)).join(JSON.stringify(to));
    return { v: JSON.parse(text), changed: text !== before };
  };
  const { data: site } = await admin.from("sites").select("content, published_content").eq("id", siteId).single();
  if (site) {
    const c = swap(site.content), p = swap(site.published_content);
    if (c.changed || p.changed) await admin.from("sites").update({ content: c.v, published_content: p.v }).eq("id", siteId);
  }
  const { data: pages } = await admin.from("site_pages").select("id, content, published_content").eq("site_id", siteId);
  for (const pg of pages ?? []) {
    const c = swap(pg.content), p = swap(pg.published_content);
    if (c.changed || p.changed) await admin.from("site_pages").update({ content: c.v, published_content: p.v }).eq("id", pg.id);
  }
}
