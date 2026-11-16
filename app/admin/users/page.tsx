import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { loadAdminUsers } from "@/lib/adminUsers";
import { AdminUsers } from "@/components/admin/AdminUsers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users · Admin" };

export default async function Page() {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=/admin/users");
  if (!isAdminEmail(user.email)) notFound();
  const rows = await loadAdminUsers();
  return <AdminUsers rows={rows} />;
}
