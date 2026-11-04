"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/social";

export function ProfileSettings({ siteId, initial, bioPlaceholder }: {
  siteId: string;
  initial: { shortBio?: string; socials?: Partial<Record<SocialNetwork, string>> };
  bioPlaceholder: string;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(initial.shortBio ?? "");
  const [socials, setSocials] = useState<Record<string, string>>({ instagram: "", facebook: "", linkedin: "", ...initial.socials });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/sites/${siteId}/profile`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ shortBio: bio, socials }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    setSocials({ instagram: "", facebook: "", linkedin: "", ...data.socials });
    setDirty(false);
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-stone-500">Shown in your site footer and the &quot;About the author&quot; box on blog posts, and used to connect your profiles in search results.</p>
      </div>
      <div>
        <label className="label" htmlFor="short-bio">Short bio <span className="font-normal text-stone-400">({bio.length}/400)</span></label>
        <textarea id="short-bio" className="input" rows={3} maxLength={400} value={bio} placeholder={bioPlaceholder} onChange={(e) => { setBio(e.target.value); setDirty(true); }} />
        <p className="mt-1 text-xs text-stone-400">One or two sentences. Leave empty to use the start of your About section.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(SOCIAL_NETWORKS) as SocialNetwork[]).map((k) => (
          <div key={k}>
            <label className="label" htmlFor={`social-${k}`}>{SOCIAL_NETWORKS[k].label}</label>
            <input id={`social-${k}`} className="input" value={socials[k] ?? ""} placeholder={SOCIAL_NETWORKS[k].example.replace("https://", "")}
              onChange={(e) => { setSocials({ ...socials, [k]: e.target.value }); setDirty(true); }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save profile"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
