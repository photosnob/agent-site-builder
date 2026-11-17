import { createAdminClient } from "@/lib/supabase/server";
import { publicSiteUrl } from "@/lib/siteUrls";

export const STEP_LABELS: Record<number, string> = { 1: "Profile", 2: "Market", 3: "Import", 4: "Design", 5: "Building", 6: "Done" };

export type AdminSite = {
  id: string; slug: string; name: string; brokerage: string | null; market: string | null; phone: string | null; contactEmail: string | null;
  status: string; template: string | null; step: number; publishedAt: string | null; createdAt: string;
  liveUrl: string; sourceUrl: string | null;
  listings: number; posts: number; leads: number; aiEdits30d: number; aiCost30d: number;
};
export type AdminUserRow = { userId: string; email: string; signedUpAt: string; lastSignInAt: string | null; confirmed: boolean; site: AdminSite | null };

/** Every account with its site and activity counts. Fine at MVP scale; move counts into SQL later. */
export async function loadAdminUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [sites, listings, posts, leads, ai] = await Promise.all([
    admin.from("sites").select("id, owner_id, slug, status, template, onboarding_step, published_at, created_at, agent, custom_domain, domain_status, source:import_data->>sourceUrl"),
    admin.from("site_listings").select("site_id"),
    admin.from("blog_posts").select("site_id"),
    admin.from("leads").select("site_id"),
    admin.from("ai_usage_events").select("site_id, feature, cost_usd").gte("created_at", since).limit(100000),
  ]);
  const count = (rows: { site_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.site_id) m.set(r.site_id, (m.get(r.site_id) ?? 0) + 1);
    return m;
  };
  const nListings = count(listings.data), nPosts = count(posts.data), nLeads = count(leads.data);
  const usage = new Map<string, { n: number; cost: number }>();
  for (const e of ai.data ?? []) {
    if (!e.site_id) continue;
    const cur = usage.get(e.site_id) ?? { n: 0, cost: 0 };
    usage.set(e.site_id, { n: cur.n + (e.feature === "edit" ? 1 : 0), cost: cur.cost + Number(e.cost_usd ?? 0) });
  }
  const byOwner = new Map((sites.data ?? []).map((s) => [s.owner_id as string, s]));

  return users
    .map((u): AdminUserRow => {
      const s = byOwner.get(u.id);
      const agent = (s?.agent ?? {}) as { name?: string; brokerage?: string; serviceAreas?: string[]; phone?: string; email?: string };
      return {
        userId: u.id,
        email: u.email ?? "",
        signedUpAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmed: Boolean(u.email_confirmed_at),
        site: s ? {
          id: s.id, slug: s.slug, name: agent.name || s.slug, brokerage: agent.brokerage ?? null,
          market: agent.serviceAreas?.slice(0, 3).join(", ") || null, phone: agent.phone || null, contactEmail: agent.email || null,
          status: s.status, template: s.template, step: s.onboarding_step, publishedAt: s.published_at, createdAt: s.created_at,
          liveUrl: publicSiteUrl(s), sourceUrl: (s as { source?: string | null }).source ?? null,
          listings: nListings.get(s.id) ?? 0, posts: nPosts.get(s.id) ?? 0, leads: nLeads.get(s.id) ?? 0,
          aiEdits30d: usage.get(s.id)?.n ?? 0, aiCost30d: usage.get(s.id)?.cost ?? 0,
        } : null,
      };
    })
    .sort((a, b) => b.signedUpAt.localeCompare(a.signedUpAt));
}
