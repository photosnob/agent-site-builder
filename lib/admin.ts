import { requireUser } from "@/lib/auth";

/** Admins are listed by email in ADMIN_EMAILS (comma-separated). */
export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const { user } = await requireUser();
  return user && isAdminEmail(user.email) ? user : null;
}
