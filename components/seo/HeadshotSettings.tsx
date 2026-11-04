"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImage } from "@/components/manage/resize";
import { ImageCropper, type CropState } from "@/components/manage/ImageCropper";

type Current = { url: string; originalUrl?: string; crop?: CropState } | null;
type Editing = { src: string; original?: File; originalUrl?: string; initial?: CropState | null; revoke?: boolean };

/** Upload, crop and reposition the agent's headshot. Used in About, the team grid, blog author boxes and structured data. */
export function HeadshotSettings({ siteId, current, agentName }: { siteId: string; current: Current; agentName: string }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = saved ?? current?.url ?? null;

  function close() {
    if (editing?.revoke) URL.revokeObjectURL(editing.src);
    setEditing(null);
  }

  async function onFile(f?: File) {
    if (!f) return;
    setMsg(null);
    if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type)) { setMsg({ ok: false, text: "Upload a JPG, PNG or WebP photo." }); return; }
    const prepared = await prepareImage(f);
    close();
    setEditing({ src: URL.createObjectURL(prepared), original: prepared, revoke: true });
  }

  async function adjust() {
    if (!current) return;
    setMsg(null);
    if (current.originalUrl) { setEditing({ src: current.originalUrl, originalUrl: current.originalUrl, initial: current.crop }); return; }
    // Older headshot without a saved original: crop from the current photo and keep it as the original.
    try {
      const blob = await (await fetch(current.url)).blob();
      setEditing({ src: URL.createObjectURL(blob), original: new File([blob], "headshot.jpg", { type: blob.type || "image/jpeg" }), revoke: true });
    } catch {
      setMsg({ ok: false, text: "Couldn't open your current photo. Upload it again to crop it." });
    }
  }

  async function save(blob: Blob, crop: CropState) {
    if (!editing) return;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.set("kind", "headshot");
      fd.set("file", new File([blob], "headshot.jpg", { type: "image/jpeg" }));
      if (editing.original) fd.set("original", editing.original);
      else if (editing.originalUrl) fd.set("originalUrl", editing.originalUrl);
      fd.set("crop", JSON.stringify(crop));
      const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setSaved(data.asset.url);
      close();
      setMsg({ ok: true, text: "Saved. Your photo now shows in About, Meet the Team, and blog author boxes." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Profile photo</h2>
        <p className="mt-1 text-sm text-stone-500">Your headshot. It appears in your About section, Meet the Team, the &ldquo;About the author&rdquo; box on blog posts, and in search results. A well-lit photo of your face works best.</p>
      </div>
      {editing ? (
        <ImageCropper src={editing.src} initial={editing.initial} circle onCancel={close} onSave={save} saving={busy} />
      ) : (
        <div className="flex flex-wrap items-center gap-5">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={agentName ? `${agentName} headshot` : "Headshot"} className="h-24 w-24 rounded-full border border-stone-200 object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-stone-300 text-xs text-stone-400">No photo</div>
          )}
          <div className="flex flex-wrap gap-2">
            {shown && <button className="btn-ghost" onClick={adjust}>Crop &amp; reposition</button>}
            <button className="btn-ghost" onClick={() => file.current?.click()}>{shown ? "Replace photo" : "Upload photo"}</button>
          </div>
        </div>
      )}
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
