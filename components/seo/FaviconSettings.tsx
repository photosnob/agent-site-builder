"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { iconFromLogo, iconFromUpload } from "@/lib/favicon";

type Icon = { url: string; auto: boolean } | null;

/**
 * The small icon in browser tabs and bookmarks for the agent's site. Made from
 * the logo automatically; agents can upload their own instead.
 */
export function FaviconSettings({ siteId, icon, logoUrl, fallbackUrl, siteName }: {
  siteId: string; icon: Icon; logoUrl: string | null; fallbackUrl: string; siteName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const tried = useRef(false);

  async function upload(blob: Blob, auto: boolean) {
    const fd = new FormData();
    fd.set("file", new File([blob], "icon.png", { type: "image/png" }));
    fd.set("kind", "favicon");
    if (auto) fd.set("auto", "1");
    const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Couldn't save the icon");
  }

  // Sites whose logo was added before icons existed get their logo icon made the first time this opens.
  useEffect(() => {
    if (icon || !logoUrl || tried.current) return;
    tried.current = true;
    iconFromLogo(logoUrl).then((b) => upload(b, true)).then(() => router.refresh()).catch(() => { /* the fallback icon still works */ });
  }, [icon, logoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onFile(f?: File) {
    if (!f) return;
    setMsg(null);
    if (!f.type.startsWith("image/") || f.type === "image/svg+xml") { setMsg({ ok: false, text: "Upload a PNG, JPG or WebP image." }); return; }
    setBusy("upload");
    try {
      await upload(await iconFromUpload(f), false);
      setMsg({ ok: true, text: "Icon saved. Browsers can take a while to show a new icon; a hard refresh helps." });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  }

  async function useLogo() {
    setBusy("logo"); setMsg(null);
    try {
      await fetch(`/api/sites/${siteId}/assets?kind=favicon`, { method: "DELETE" });
      if (logoUrl) await upload(await iconFromLogo(logoUrl), true);
      setMsg({ ok: true, text: logoUrl ? "Back to the icon made from your logo." : "Custom icon removed." });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(null); }
  }

  const src = icon?.url ?? fallbackUrl;
  const custom = icon && !icon.auto;
  const status = custom ? "Your custom icon." : logoUrl ? "Made from your logo automatically." : "Your initials, until you add a logo or upload an icon.";
  const tab = (bg: string, fg: string, border: string) => (
    <div className="flex w-56 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-xs" style={{ background: bg, color: fg, borderColor: border }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={16} height={16} className="h-4 w-4 shrink-0 rounded-[3px]" />
      <span className="truncate">{siteName}</span>
      <span className="ml-auto opacity-50">×</span>
    </div>
  );

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Site icon</h2>
        <p className="mt-1 text-sm text-stone-500">The small icon in browser tabs, bookmarks and phone home screens. We make it from your logo, using just the symbol if your logo has one. You can upload your own instead.</p>
      </div>
      <div className="flex flex-wrap items-end gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Site icon" width={64} height={64} className="h-16 w-16 rounded-xl border border-stone-100" style={{ backgroundImage: "repeating-conic-gradient(#f5f5f4 0% 25%, #fff 0% 50%)", backgroundSize: "10px 10px" }} />
        <div className="space-y-1">
          {tab("#ffffff", "#1c1917", "#e7e5e4")}
          {tab("#292524", "#f5f5f4", "#292524")}
        </div>
      </div>
      <p className="text-sm text-stone-600">{status}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" disabled={!!busy} onClick={() => file.current?.click()}>{busy === "upload" ? "Saving…" : custom ? "Replace custom icon" : "Upload custom icon"}</button>
        {custom && <button className="btn-ghost" disabled={!!busy} onClick={useLogo}>{busy === "logo" ? "Saving…" : logoUrl ? "Use my logo instead" : "Remove custom icon"}</button>}
      </div>
      <p className="text-xs text-stone-400">Use a square image, at least 256 × 256 pixels. Non-square images are cropped to the center.</p>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}
