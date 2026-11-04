import { createAdminClient } from "./supabase/server";

const BUCKET = "site-assets";
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Public URL prefix for the shared stock video library (files you upload to site-assets/stock/). */
export function stockPrefix() {
  return createAdminClient().storage.from(BUCKET).getPublicUrl("stock/").data.publicUrl;
}

export interface StockVideo { name: string; url: string; poster: string | null }

/**
 * The stock library is just a folder: upload licensed clips to `site-assets/stock/`
 * in Supabase Storage (e.g. `walnut-creek-aerial.mp4`), optionally with a poster
 * image of the same name (`walnut-creek-aerial.jpg`).
 */
export async function listStockVideos(): Promise<StockVideo[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).list("stock", { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (error || !data) return [];
  const names = new Set(data.map((f) => f.name));
  const url = (n: string) => admin.storage.from(BUCKET).getPublicUrl(`stock/${n}`).data.publicUrl;
  return data
    .filter((f) => /\.(mp4|webm)$/i.test(f.name))
    .map((f) => {
      const base = f.name.replace(/\.(mp4|webm)$/i, "");
      const poster = ["jpg", "jpeg", "png", "webp"].map((e) => `${base}.${e}`).find((n) => names.has(n));
      return { name: base.replace(/[-_]+/g, " "), url: url(f.name), poster: poster ? url(poster) : null };
    });
}

/** Signed URL so the browser uploads the video straight to storage (bypasses the ~4.5 MB function body limit). */
export async function createVideoUpload(siteId: string, contentType: string) {
  const ext = VIDEO_TYPES[contentType];
  if (!ext) throw new Error("Upload an MP4 or WebM video.");
  const path = `${siteId}/video-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Couldn't start the upload");
  return { path, token: data.token };
}

/** After upload: confirm the file exists, is a video and isn't too big, then record it. */
export async function finishVideoUpload(siteId: string, path: string) {
  if (!path.startsWith(`${siteId}/video-`) || !/^[\w/.-]+$/.test(path)) throw new Error("Invalid upload");
  const admin = createAdminClient();
  const name = path.split("/").pop()!;
  const { data } = await admin.storage.from(BUCKET).list(siteId, { search: name, limit: 5 });
  const file = data?.find((f) => f.name === name);
  if (!file) throw new Error("The upload didn't finish. Please try again.");
  const meta = (file.metadata ?? {}) as { size?: number; mimetype?: string };
  if ((meta.size ?? 0) > MAX_VIDEO_BYTES || (meta.mimetype && !VIDEO_TYPES[meta.mimetype])) {
    await admin.storage.from(BUCKET).remove([path]);
    throw new Error("Videos must be MP4 or WebM and under 50 MB.");
  }
  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { data: asset } = await admin.from("site_assets").insert({ site_id: siteId, kind: "other", url, storage_path: path, meta: { type: "video", size: meta.size } }).select("id, kind, url, meta").single();
  return asset;
}
