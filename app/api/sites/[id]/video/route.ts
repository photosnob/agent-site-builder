import { z } from "zod";
import { fail, json, ownedSiteOr404 } from "@/lib/api";
import { MAX_VIDEO_BYTES, createVideoUpload, finishVideoUpload } from "@/lib/media";

/** { action: "start", contentType, size } → signed upload; { action: "finish", path } → asset. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ownedSiteOr404(params);
  if ("error" in ctx) return ctx.error;
  const body = z.discriminatedUnion("action", [
    z.object({ action: z.literal("start"), contentType: z.string(), size: z.number().int().positive() }),
    z.object({ action: z.literal("finish"), path: z.string().max(200) }),
  ]).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid request", 422);
  try {
    if (body.data.action === "start") {
      if (body.data.size > MAX_VIDEO_BYTES) return fail("Videos must be under 50 MB. Try a shorter clip or export at 1080p.", 422);
      return json(await createVideoUpload(ctx.site.id, body.data.contentType));
    }
    return json({ asset: await finishVideoUpload(ctx.site.id, body.data.path) });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
}
