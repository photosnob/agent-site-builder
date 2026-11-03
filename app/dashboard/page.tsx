import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Editor } from "@/components/app/Editor";
import { aiEnabled } from "@/lib/ai/claude";
import type { SiteRow } from "@/lib/types";
import { publicSiteUrl } from "@/lib/siteUrls";
import { editsLeftToday } from "@/lib/ai/usage";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/dashboard");
  const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  const site = data as SiteRow | null;
  if (!site || site.onboarding_step < 6 || !site.content) redirect("/onboarding");

  const [{ data: revisions }, { data: leads }] = await Promise.all([
    supabase.from("site_revisions").select("id, status, source, prompt, created_at").eq("site_id", site.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("leads").select("id, name, email, phone, intent, message, created_at").eq("site_id", site.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const liveUrl = publicSiteUrl(site.slug);
  const quota = await editsLeftToday(site.id, (site as SiteRow & { ai_daily_edit_limit?: number | null }).ai_daily_edit_limit ?? null);

  return (
    <Editor
      siteId={site.id}
      slug={site.slug}
      status={site.status}
      liveUrl={liveUrl}
      publishedAt={site.published_at}
      aiReady={aiEnabled()}
      editsLeft={quota.left}
      editsLimit={quota.limit}
      revisions={revisions ?? []}
      leads={leads ?? []}
    />
  );
}
