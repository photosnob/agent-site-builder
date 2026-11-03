import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { siteImagePrefix } from "@/lib/blog/server";
import { SiteSeo, cleanPlainText, extractVerificationCode } from "@/lib/seo/schema";
import { lintFairHousing } from "@/lib/guardrails/fairHousing";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidateSite } from "@/lib/siteUrls";

/** SEO settings apply to the live site right away (they aren't part of the draft). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return fail("Invalid settings", 422);

  // Normalize before validating: empty strings mean "use the default".
  const input: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      const t = k === "llmsTxt" ? cleanPlainText(v) : v.trim();
      if (t.trim()) input[k] = k === "googleVerification" ? extractVerificationCode(t) : t;
    } else if (typeof v === "boolean") input[k] = v;
  }
  const parsed = SiteSeo.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid settings", 422);
  const seo = parsed.data;

  if (seo.ogImage && !seo.ogImage.startsWith(siteImagePrefix(ctx.site.id))) return fail("Choose a share image from your library", 422);
  const blocking = lintFairHousing(`${seo.title ?? ""}\n${seo.description ?? ""}`).filter((f) => f.severity === "block");
  if (blocking.length) return fail(`Fair Housing: ${blocking[0].message} ("${blocking[0].match}")`, 422);

  const { error } = await createAdminClient().from("sites").update({ seo }).eq("id", ctx.site.id);
  if (error) return fail(error.message, 500);
  revalidateSite(ctx.site.slug, "", "/blog");
  return json({ ok: true, seo });
}
