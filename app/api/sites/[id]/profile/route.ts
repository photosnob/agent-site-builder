import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { lintFairHousing } from "@/lib/guardrails/fairHousing";
import { SOCIAL_NETWORKS, normalizeSocial, type SocialNetwork } from "@/lib/social";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidateSite } from "@/lib/siteUrls";

const Body = z.object({
  shortBio: z.string().max(400).optional(),
  socials: z.record(z.string(), z.string().max(300)).optional(),
});

/** Profile extras shown on the live site right away: short author bio and social links. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid profile", 422);

  const socials: Partial<Record<SocialNetwork, string>> = {};
  for (const k of Object.keys(SOCIAL_NETWORKS) as SocialNetwork[]) {
    const raw = body.data.socials?.[k];
    if (raw === undefined) continue;
    const r = normalizeSocial(k, raw);
    if (r.error) return fail(r.error, 422, { field: k });
    if (r.url) socials[k] = r.url;
  }
  const shortBio = body.data.shortBio?.replace(/\s+/g, " ").trim();
  if (shortBio && /<[^>]+>|https?:\/\//i.test(shortBio)) return fail("Keep the bio to plain text (no links or code).", 422);
  const blocking = shortBio ? lintFairHousing(shortBio).filter((f) => f.severity === "block") : [];
  if (blocking.length) return fail(`Fair Housing: ${blocking[0].message}`, 422);

  const agent = { ...ctx.site.agent, shortBio: shortBio || undefined, socials };
  const { error } = await createAdminClient().from("sites").update({ agent }).eq("id", ctx.site.id);
  if (error) return fail(error.message, 500);
  revalidateSite(ctx.site.slug, "", "/blog");
  return json({ ok: true, socials, shortBio: agent.shortBio ?? "" });
}
