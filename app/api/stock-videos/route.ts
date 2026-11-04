import { fail, json } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listStockVideos } from "@/lib/media";

export async function GET() {
  const { user } = await requireUser();
  if (!user) return fail("Sign in required", 401);
  return json({ videos: await listStockVideos() });
}
