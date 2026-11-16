import { PlatformAnalytics } from "@/components/PlatformAnalytics";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Pages 404 for non-admins on their own; only show the admin menu to admins.
  const admin = await requireAdmin();
  return <>{admin && <AdminNav />}{children}<PlatformAnalytics /></>;
}
