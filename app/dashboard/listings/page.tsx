import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DashNav } from "@/components/app/DashNav";
import { ListingsManager } from "@/components/manage/ListingsManager";
import { publicSiteUrl } from "@/lib/siteUrls";
import type { SiteRow } from "@/lib/types";
import { seedListingsFromImport } from "@/lib/pages/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/dashboard/listings");
  const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  const site = data as SiteRow | null;
  if (!site) redirect("/onboarding");
  await seedListingsFromImport(site).catch(() => 0);
  const { data: items, error } = await supabase.from("site_listings").select("*").eq("site_id", site.id).order("position").order("created_at", { ascending: false });
  return (
    <>
      <DashNav active="/dashboard/listings" liveUrl={site.status === "live" ? publicSiteUrl(site.slug) : null} />
      {error ? (
        <p className="mx-auto mt-10 max-w-xl rounded-lg bg-amber-50 p-4 text-sm text-amber-900">This section needs the <code>0005_pages_listings_reviews_team.sql</code> database migration. Run it in Supabase&apos;s SQL Editor, then refresh.</p>
      ) : (
        <ListingsManager siteId={site.id} initial={items ?? []} />
      )}
    </>
  );
}
