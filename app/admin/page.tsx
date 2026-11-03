import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAiSettings } from "@/lib/ai/usage";
import { buildReport, type SiteInfo, type UsageEvent } from "@/lib/ai/report";
import { createAdminClient } from "@/lib/supabase/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI usage · Admin" };

export default async function AdminPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) notFound();

  const settings = await getAiSettings(true);
  const admin = createAdminClient();
  const since = new Date(Date.now() - 31 * 86_400_000).toISOString();
  // Fine for MVP volumes; move to SQL rollups once this passes ~50k events/month.
  const { data: events } = await admin
    .from("ai_usage_events")
    .select("id, site_id, feature, model, prompt, categories, outcome, input_tokens, output_tokens, cost_usd, latency_ms, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50000);
  const siteIds = [...new Set((events ?? []).map((e) => e.site_id).filter(Boolean))] as string[];
  const { data: siteRows } = siteIds.length
    ? await admin.from("sites").select("id, slug, agent, ai_daily_edit_limit").in("id", siteIds)
    : { data: [] };
  const sites: SiteInfo[] = (siteRows ?? []).map((s) => ({ id: s.id, slug: s.slug, name: (s.agent as { name?: string })?.name ?? s.slug, ai_daily_edit_limit: s.ai_daily_edit_limit }));

  const report = buildReport((events ?? []) as UsageEvent[], sites, settings);
  return <AdminDashboard report={report} settings={settings} model={process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5"} />;
}
