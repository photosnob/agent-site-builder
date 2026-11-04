"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/components/manage/shared";

/** Upload or replace the agent's headshot. Used in About, the team grid, blog author boxes and structured data. */
export function HeadshotSettings({ siteId, current, agentName }: { siteId: string; current: string | null; agentName: string }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = preview ?? current;

  async function onFile(f?: File) {
    if (!f) return;
    setMsg(null);
    if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(f.type)) { setMsg({ ok: false, text: "Upload a JPG, PNG or WebP photo." }); return; }
    const local = URL.createObjectURL(f);
    setPreview(local);
    setBusy(true);
    try {
      await uploadPhoto(siteId, f, "headshot");
      setMsg({ ok: true, text: "Saved. Your new photo now shows in About, Meet the Team, and blog author boxes." });
      router.refresh();
    } catch (e) {
      setPreview(null);
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setBusy(false);
      URL.revokeObjectURL(local);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Profile photo</h2>
        <p className="mt-1 text-sm text-stone-500">Your headshot. It appears in your About section, Meet the Team, the &ldquo;About the author&rdquo; box on blog posts, and in search results. A square-ish, well-lit photo of your face works best.</p>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt={agentName ? `${agentName} headshot` : "Headshot"} className={`h-24 w-24 rounded-full border border-stone-200 object-cover ${busy ? "opacity-60" : ""}`} />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-stone-300 text-xs text-stone-400">No photo</div>
        )}
        <button className="btn-ghost" disabled={busy} onClick={() => file.current?.click()}>
          {busy ? "Uploading…" : shown ? "Replace photo" : "Upload photo"}
        </button>
      </div>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
