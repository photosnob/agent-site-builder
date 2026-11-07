import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DashNav } from "@/components/app/DashNav";
import { RedirectsManager } from "@/components/manage/RedirectsManager";
import { publicSiteUrl } from "@/lib/siteUrls";
import type { SiteRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/dashboard/redirects");
  const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  const site = data as SiteRow | null;
  if (!site) redirect("/onboarding");
  const live = site.status === "live" ? publicSiteUrl(site.slug) : null;
  return (
    <>
      <DashNav active="/dashboard/settings" liveUrl={live} />
      <div className="mx-auto max-w-5xl px-6 pt-6"><Link href="/dashboard/settings" className="text-sm text-stone-500 hover:text-stone-900">← Settings</Link></div>
      <RedirectsManager siteId={site.id} oldSiteUrl={site.import_data?.sourceUrl || site.agent.existingSiteUrl || ""} liveOrigin={live ? live.replace(/\/$/, "") : null} />
    </>
  );
}
