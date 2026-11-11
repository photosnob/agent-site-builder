import { createAdminClient } from "../supabase/server";
import type { SiteRow } from "../types";
import type { SitePage } from "../siteData";
import { DEFAULT_PAGES, generateDefaultPages, type PageKind } from "./defaults";

export async function listPages(siteId: string): Promise<SitePage[]> {
  const { data, error } = await createAdminClient().from("site_pages").select("*").eq("site_id", siteId).order("position");
  if (error) return [];
  return (data ?? []) as SitePage[];
}

/** Creates any default pages the site doesn't have yet. Returns how many were created. */
export async function createMissingDefaultPages(site: Pick<SiteRow, "id" | "agent" | "theme">, userId: string) {
  const admin = createAdminClient();
  const existing = await listPages(site.id);
  const have = new Set(existing.map((p) => p.slug));
  const missing = DEFAULT_PAGES.filter((p) => !have.has(p.slug)).map((p) => p.kind as PageKind);
  if (!missing.length) return 0;
  const pages = await generateDefaultPages(site.agent, missing, { siteId: site.id, userId });
  const rows = pages.map((p) => ({
    site_id: site.id,
    slug: p.slug,
    kind: p.kind,
    title: p.title,
    nav_label: p.nav,
    position: DEFAULT_PAGES.findIndex((d) => d.slug === p.slug),
    content: p.content,
  }));
  const { data, error } = await admin.from("site_pages").insert(rows).select("id, content");
  if (error) throw error;
  // Starting point for undo on each page.
  await admin.from("site_revisions").insert((data ?? []).map((r) => ({
    site_id: site.id, page_id: r.id, status: "applied", source: "generate", content: r.content, theme: site.theme ?? {}, created_by: userId,
  })));
  return rows.length;
}

/** First time reviews are curated, copy over the testimonials found during import. */
export async function seedTestimonialsFromImport(site: Pick<SiteRow, "id" | "import_data" | "content">) {
  const admin = createAdminClient();
  const { count, error } = await admin.from("testimonials").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  if (error || (count ?? 0) > 0) return 0;
  const fromImport = site.import_data?.testimonials ?? [];
  const fromBlock = site.content?.blocks.flatMap((b) => (b.type === "testimonials" ? b.props.items : [])) ?? [];
  const seen = new Set<string>();
  const items = [...fromImport, ...fromBlock].filter((t) => t.quote && !seen.has(t.quote) && seen.add(t.quote));
  if (!items.length) return 0;
  await admin.from("testimonials").insert(items.slice(0, 50).map((t, i) => ({
    site_id: site.id, quote: t.quote.slice(0, 1500), author: (t.author || "Client").slice(0, 80), source: "imported", featured: i < 4, position: i,
  })));
  return items.length;
}

/**
 * Listings picked during onboarding live in the site's Featured listings section
 * and as listing photos in the library. Copy them into the Listings manager once
 * so the agent can edit them there. A flag stops them coming back if deleted.
 */
export async function seedListingsFromImport(site: Pick<SiteRow, "id" | "import_data" | "content">) {
  if ((site.import_data as { listingsSeeded?: boolean } | null)?.listingsSeeded) return 0;
  const admin = createAdminClient();
  const { count, error } = await admin.from("site_listings").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  if (error) return 0;
  const markDone = () => admin.from("sites").update({ import_data: { ...(site.import_data ?? {}), listingsSeeded: true } }).eq("id", site.id);
  if ((count ?? 0) > 0) { await markDone(); return 0; }

  type Row = { photo: string; address?: string; price?: string; status?: string };
  const fromBlock: Row[] = (site.content?.blocks ?? []).flatMap((b) => (b.type === "featured-listings" ? b.props.items.map((i) => ({ photo: i.image, address: i.address, price: i.price, status: i.status })) : []));
  const { data: assets } = await admin.from("site_assets").select("url, meta, source_url").eq("site_id", site.id).eq("kind", "listing").not("source_url", "is", null).order("created_at");
  const fromAssets: Row[] = (assets ?? []).map((a) => { const m = (a.meta ?? {}) as Record<string, string | undefined>; return { photo: a.url as string, address: m.address, price: m.price, status: m.status }; });
  const seen = new Set<string>();
  const rows = [...fromBlock, ...fromAssets].filter((r) => r.photo && !seen.has(r.photo) && seen.add(r.photo)).slice(0, 50);
  if (rows.length) {
    const STATUSES = ["active", "pending", "sold", "coming-soon"];
    const { error: insErr } = await admin.from("site_listings").insert(rows.map((r, i) => {
      const hasAddress = (r.address ?? "").trim().length >= 3;
      return {
        site_id: site.id,
        address: hasAddress ? r.address!.trim().slice(0, 160) : "Add the address",
        price: r.price?.slice(0, 40) || null,
        status: STATUSES.includes(r.status ?? "") ? r.status : "sold",
        photos: [r.photo],
        // Without an address it stays hidden from the site until the agent fills it in.
        featured: hasAddress,
        position: i,
      };
    }));
    if (insErr) return 0;
  }
  await markDone();
  return rows.length;
}
