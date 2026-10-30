import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Editor } from "@/components/app/Editor";
import { aiEnabled } from "@/lib/ai/claude";
import type { SiteRow } from "@/lib/types";

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

  // With a root domain configured, sites live at <slug>.<root>; until then, at /s/<slug> on this app.
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const liveUrl = root
    ? `${root.startsWith("lvh.me") || root.startsWith("localhost") ? "http" : "https"}://${site.slug}.${root}`
    : `/s/${site.slug}`;

  return (
    <Editor
      siteId={site.id}
      slug={site.slug}
      status={site.status}
      liveUrl={liveUrl}
      publishedAt={site.published_at}
      aiReady={aiEnabled()}
      revisions={revisions ?? []}
      leads={leads ?? []}
    />
  );
}
