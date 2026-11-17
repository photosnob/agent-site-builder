import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/server";
import { DomainError, addDomain, checkDomain, domainPair, domainsConfigured, isReservedDomain, normalizeDomain, removeDomain } from "@/lib/domains";

export const maxDuration = 30;

const refreshSite = (slug: string) => { for (const m of ["s", "h"]) revalidatePath(`/${m}/${slug}`, "layout"); };

/** Current domain and live DNS status (also re-checks and records the status). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const site = ctx.site;
  if (!domainsConfigured()) return json({ configured: false, domain: site.custom_domain });
  if (!site.custom_domain) return json({ configured: true, domain: null });
  const { primary, alias } = domainPair(site.custom_domain);
  const check = await checkDomain(primary, alias);
  if (check.status !== site.domain_status) {
    await createAdminClient().from("sites").update({ domain_status: check.status, domain_checked_at: new Date().toISOString() }).eq("id", site.id);
    // Going live (or dropping off) changes canonical URLs and the sitemap.
    if (check.status === "active" || site.domain_status === "active") refreshSite(site.slug);
  }
  return json({ configured: true, domain: primary, alias, ...check });
}

/** Connect a domain: registers it with the host and returns the DNS records to add. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  if (!domainsConfigured()) return fail("Custom domains aren't switched on yet.", 503);
  const b = z.object({ domain: z.string().max(300) }).safeParse(await req.json().catch(() => null));
  const host = b.success ? normalizeDomain(b.data.domain) : null;
  if (!host) return fail("Enter a domain like janedoe.com or www.janedoe.com", 422);
  if (isReservedDomain(host)) return fail("That address can't be used as a custom domain.", 422);
  if (ctx.site.custom_domain) return fail("Remove your current domain first.", 409);
  const { primary, alias } = domainPair(host);

  const admin = createAdminClient();
  const { data: taken } = await admin.from("sites").select("id").in("custom_domain", [primary, ...(alias ? [alias] : [])]).neq("id", ctx.site.id).limit(1);
  if (taken?.length) return fail("That domain is already connected to another site here.", 409);

  try {
    await addDomain(primary, alias);
  } catch (e) {
    return fail(e instanceof DomainError ? e.message : "Couldn't add that domain. Try again.", 422);
  }
  const { error } = await admin.from("sites").update({ custom_domain: primary, domain_status: "pending", domain_checked_at: new Date().toISOString() }).eq("id", ctx.site.id);
  if (error) {
    await removeDomain(primary, alias).catch(() => {});
    return fail(error.message.includes("domain_status") ? "Custom domains need the 0010 database migration." : error.message, 500);
  }
  const check = await checkDomain(primary, alias).catch(() => null);
  return json({ configured: true, domain: primary, alias, ...(check ?? { status: "pending", records: [], message: "" }) });
}

/** Disconnect the domain. The site stays on its free address. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const current = ctx.site.custom_domain;
  if (!current) return json({ ok: true });
  const { primary, alias } = domainPair(current);
  if (domainsConfigured()) await removeDomain(primary, alias).catch(() => {});
  await createAdminClient().from("sites").update({ custom_domain: null, domain_status: null, domain_checked_at: null }).eq("id", ctx.site.id);
  refreshSite(ctx.site.slug);
  return json({ ok: true });
}
