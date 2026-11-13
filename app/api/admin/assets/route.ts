import { fail, json } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { PLATFORM_ASSET_FOLDER } from "@/lib/blog/platform";
import { storeImage } from "@/lib/import/storeAsset";

export const maxDuration = 60;

/** Image upload for the Launch & List blog editor (multipart: file). */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail("Not found", 404);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Missing file");
  if (file.size > 8_000_000) return fail("Images must be under 8 MB");
  try {
    const stored = await storeImage(PLATFORM_ASSET_FOLDER, Buffer.from(await file.arrayBuffer()));
    return json({ asset: { url: stored.url } });
  } catch {
    return fail("That file isn't a supported image (JPG, PNG, WebP, AVIF).", 422);
  }
}
