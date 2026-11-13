import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Onboarding } from "@/components/app/Onboarding";
import { ProfileMenu } from "@/components/app/ProfileMenu";
import { getAssets } from "@/lib/sites";
import type { SiteRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/onboarding");
  const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  const site = data as SiteRow | null;
  if (site && site.onboarding_step >= 6) redirect("/dashboard");
  const assets = site ? await getAssets(site.id) : [];
  return (
    <>
      <div className="flex justify-end px-6 pt-4"><ProfileMenu /></div>
      <Onboarding site={site} email={user.email ?? ""} initialAssets={assets} />
    </>
  );
}
