"use client";

/**
 * Shrinks large photos in the browser before upload. Keeps uploads under the
 * ~4.5 MB serverless request limit and makes pages load faster. PNGs with
 * transparency stay PNG; everything else becomes a high-quality JPEG.
 */
export async function prepareImage(file: File, maxSide = 2400, maxBytes = 3_500_000): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    img.src = url;
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    return file; // let the server reject it with a clear message
  }
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && file.size <= maxBytes) { URL.revokeObjectURL(url); return file; }
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  const keepPng = file.type === "image/png" && hasTransparency(ctx, w, h);
  const type = keepPng ? "image/png" : "image/jpeg";
  for (const q of [0.88, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
    if (blob && (blob.size <= maxBytes || q === 0.7)) return new File([blob], file.name.replace(/\.\w+$/, keepPng ? ".png" : ".jpg"), { type });
  }
  return file;
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 40));
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] < 250) return true;
  return false;
}
