import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidateSite } from "@/lib/siteUrls";

const Patch = z.object({
  enabled: z.boolean().optional(),
  navLabel: z.string().trim().min(1).max(30).optional(),
  title: z.string().trim().min(1).max(80).optional(),
  seoTitle: z.string().trim().max(120).nullable().optional(),
  metaDescription: z.string().trim().max(300).nullable().optional(),
  position: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;
  const ctx = await ownedSiteOr404(Promise.resolve({ id }));
  if ("error" in ctx) return ctx.error;
  const b = Patch.safeParse(await req.json().catch(() => null));
  if (!b.success) return fail(b.error.issues[0]?.message ?? "Invalid update", 422);
  const u: Record<string, unknown> = {};
  if (b.data.enabled !== undefined) u.enabled = b.data.enabled;
  if (b.data.navLabel !== undefined) u.nav_label = b.data.navLabel;
  if (b.data.title !== undefined) u.title = b.data.title;
  if (b.data.seoTitle !== undefined) u.seo_title = b.data.seoTitle || null;
  if (b.data.metaDescription !== undefined) u.meta_description = b.data.metaDescription || null;
  if (b.data.position !== undefined) u.position = b.data.position;
  const { data, error } = await createAdminClient().from("site_pages").update(u).eq("id", pageId).eq("site_id", ctx.site.id).select("slug").maybeSingle();
  if (error) return fail(error.message, 500);
  if (!data) return fail("Page not found", 404);
  revalidateSite(ctx.site.slug, "", `/${data.slug}`, "/blog");
  return json({ ok: true });
}
