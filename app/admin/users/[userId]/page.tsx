import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { STEP_LABELS } from "@/lib/adminUsers";
import { createAdminClient } from "@/lib/supabase/server";
import { publicSiteUrl } from "@/lib/siteUrls";
import { SitePreviewFrame } from "@/components/admin/SitePreviewFrame";

export const dynamic = "force-dynamic";
export const metadata = { title: "User · Admin" };

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=/admin/users");
  if (!isAdminEmail(user.email)) notFound();
  const { userId } = await params;
  const admin = createAdminClient();
  const { data: au } = await admin.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } }));
  if (!au?.user) notFound();
  const u = au.user;
  const { data: site } = await admin.from("sites").select("id, slug, status, template, onboarding_step, published_at, created_at, agent, import_data").eq("owner_id", userId).maybeSingle();

  const [pages, listings, posts, leads, edits, assets] = site ? await Promise.all([
    admin.from("site_pages").select("slug, title, enabled").eq("site_id", site.id).order("position"),
    admin.from("site_listings").select("id", { count: "exact", head: true }).eq("site_id", site.id),
    admin.from("blog_posts").select("status").eq("site_id", site.id),
    admin.from("leads").select("created_at").eq("site_id", site.id).order("created_at", { ascending: false }),
    admin.from("ai_usage_events").select("prompt, outcome, created_at, cost_usd").eq("site_id", site.id).eq("feature", "edit").order("created_at", { ascending: false }).limit(15),
    admin.from("site_assets").select("kind").eq("site_id", site.id),
  ]) : [];

  const agent = (site?.agent ?? {}) as Record<string, unknown> & { name?: string; serviceAreas?: string[]; socials?: Record<string, string> };
  const imp = (site?.import_data ?? {}) as { sourceUrl?: string; sourceUrls?: string[] };
  const kinds = (assets?.data ?? []).reduce<Record<string, number>>((m, a) => ({ ...m, [a.kind]: (m[a.kind] ?? 0) + 1 }), {});
  const published = (posts?.data ?? []).filter((p) => p.status === "published").length;

  const Fact = ({ k, v }: { k: string; v: React.ReactNode }) => (<div className="flex justify-between gap-4 py-1.5"><dt className="text-stone-500">{k}</dt><dd className="text-right">{v || "—"}</dd></div>);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/admin/users" className="text-sm text-stone-500 hover:text-stone-900">← All users</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{agent.name ?? u.email}</h1>
          <p className="text-sm text-stone-500">{u.email}</p>
        </div>
        {site?.status === "live" && <a href={publicSiteUrl(site.slug)} target="_blank" rel="noreferrer" className="btn">View live site ↗</a>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {site && site.onboarding_step >= 6 ? (
            <SitePreviewFrame siteId={site.id} pages={(pages?.data ?? []).map((p) => ({ slug: p.slug, title: `${p.title}${p.enabled ? "" : " (off)"}` }))} />
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
              {site ? `Still onboarding (at "${STEP_LABELS[site.onboarding_step] ?? site.onboarding_step}"), so there's no site to preview yet.` : "Signed up but hasn't started a site."}
            </div>
          )}
        </section>

        <aside className="space-y-4 text-sm">
          <dl className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="mb-1 font-semibold">Account</p>
            <Fact k="Signed up" v={fmt(u.created_at)} />
            <Fact k="Last sign-in" v={fmt(u.last_sign_in_at)} />
            <Fact k="Email confirmed" v={u.email_confirmed_at ? "Yes" : "No"} />
          </dl>
          {site && (
            <>
              <dl className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="mb-1 font-semibold">Site</p>
                <Fact k="Status" v={site.status === "live" ? `Live since ${fmt(site.published_at)}` : site.onboarding_step < 6 ? `Onboarding: ${STEP_LABELS[site.onboarding_step]}` : "Built, not published"} />
                <Fact k="Template" v={<span className="capitalize">{site.template}</span>} />
                <Fact k="Address" v={<a className="underline" href={publicSiteUrl(site.slug)} target="_blank" rel="noreferrer">{site.slug}</a>} />
                <Fact k="Listings" v={listings?.count ?? 0} />
                <Fact k="Blog posts" v={`${published} published${(posts?.data?.length ?? 0) > published ? `, ${(posts?.data?.length ?? 0) - published} drafts` : ""}`} />
                <Fact k="Leads" v={`${leads?.data?.length ?? 0}${leads?.data?.[0] ? ` (last ${fmt(leads.data[0].created_at)})` : ""}`} />
                <Fact k="Photos" v={Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(", ")} />
              </dl>
              <dl className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="mb-1 font-semibold">Profile</p>
                <Fact k="Brokerage" v={agent.brokerage as string} />
                <Fact k="License" v={[agent.licenseState, agent.licenseNumber].filter(Boolean).join(" ")} />
                <Fact k="Phone" v={agent.phone as string} />
                <Fact k="Contact email" v={agent.email as string} />
                <Fact k="Areas" v={agent.serviceAreas?.join(", ")} />
                <Fact k="Old site" v={(imp.sourceUrls ?? (imp.sourceUrl ? [imp.sourceUrl] : [])).map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" className="block truncate underline">{s.replace(/^https?:\/\/(www\.)?/, "")}</a>)} />
              </dl>
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <p className="mb-2 font-semibold">Recent AI edit requests</p>
                {(edits?.data ?? []).length === 0 ? <p className="text-stone-500">None yet.</p> : (
                  <ul className="space-y-2">
                    {edits!.data!.map((e, i) => (
                      <li key={i}>
                        <p className="line-clamp-2">“{e.prompt}”</p>
                        <p className="text-xs text-stone-400">{fmt(e.created_at)} · {e.outcome}{e.cost_usd ? ` · $${Number(e.cost_usd).toFixed(3)}` : ""}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
