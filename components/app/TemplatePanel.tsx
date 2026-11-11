"use client";
import { useState } from "react";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/templates";
import { TemplateThumb } from "./TemplateThumb";

/** Switch the site's template from the editor. Content stays; the design changes in the draft. */
export function TemplatePanel({ siteId, current, onSwitched }: { siteId: string; current: TemplateId | null; onSwitched: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<TemplateId | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const name = TEMPLATE_LIST.find((t) => t.id === current)?.name ?? "None";

  async function pick(id: TemplateId) {
    if (id === current || busy) return;
    setBusy(id); setMsg(null);
    const res = await fetch(`/api/sites/${siteId}/template`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ template: id }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? "Couldn't switch templates" }); return; }
    setMsg({ ok: true, text: `Switched to ${TEMPLATE_LIST.find((t) => t.id === id)?.name}. Check the preview, then Publish to make it live. Undo in History.` });
    onSwitched();
  }

  return (
    <div className="mb-4 rounded-lg border border-stone-200">
      <button className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>Template{!open && <span className="block text-xs font-normal text-stone-500">Change your site&apos;s whole look; your content stays</span>}</span>
        <span className="font-normal text-stone-500">{name} {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-stone-100 p-3">
          <p className="text-xs text-stone-500">Your text, photos, listings and pages stay the same. Colors, fonts and layout change in your draft; nothing goes live until you publish.</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_LIST.map((t) => (
              <button key={t.id} type="button" onClick={() => pick(t.id as TemplateId)} disabled={!!busy} aria-pressed={t.id === current}
                className={`overflow-hidden rounded-lg border-2 text-left transition ${t.id === current ? "border-stone-900" : "border-stone-200 hover:border-stone-400"} ${busy && busy !== t.id ? "opacity-50" : ""}`}>
                <TemplateThumb t={t} />
                <span className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold">
                  {t.name}
                  {t.id === current ? <span className="rounded bg-stone-900 px-1.5 py-0.5 text-[10px] font-medium text-white">Current</span> : busy === t.id ? <span className="font-normal text-stone-500">Switching…</span> : null}
                </span>
              </button>
            ))}
          </div>
          {msg && <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}
