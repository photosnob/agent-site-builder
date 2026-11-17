"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Rec = { type: "A" | "CNAME" | "TXT"; name: string; value: string; purpose: string };
type State = { configured: boolean; domain: string | null; alias?: string | null; status?: "active" | "pending" | "error"; records?: Rec[]; message?: string };

const TIPS: [string, string][] = [
  ["GoDaddy", "My Products → your domain → DNS. Edit the existing A record for @ (don't add a second one) and the CNAME for www."],
  ["Namecheap", "Domain List → Manage → Advanced DNS. Under Host Records, replace the @ and www records with the ones above."],
  ["Squarespace / Google Domains", "Domains → your domain → DNS → Custom records. Remove any Squarespace defaults for @ and www first."],
  ["Cloudflare", "DNS → Records. Add the records with the proxy status set to DNS only (grey cloud), or the secure certificate can't be issued."],
  ["Wix / other site builders", "If your domain is managed inside your old website builder, look for DNS or Advanced settings there; your old site stops showing once you switch."],
];

/** Connect the agent's own domain (janedoe.com) to their site. */
export function DomainSettings({ siteId, initial, freeUrl }: { siteId: string; initial: State; freeUrl: string }) {
  const [st, setSt] = useState<State>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"add" | "check" | "remove" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const polls = useRef(0);

  const check = useCallback(async (manual = false) => {
    if (manual) setBusy("check");
    try {
      const r = await fetch(`/api/sites/${siteId}/domain`);
      const d = await r.json();
      if (r.ok) setSt(d);
    } finally { if (manual) setBusy(null); }
  }, [siteId]);

  // Live check on open, then every 20 seconds while waiting (up to ~15 minutes).
  useEffect(() => { if (st.configured && st.domain) check(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (st.status !== "pending") return;
    const t = setInterval(() => { if (polls.current++ < 45) check(); }, 20_000);
    return () => clearInterval(t);
  }, [st.status, check]);

  async function add() {
    setBusy("add"); setErr(null);
    const r = await fetch(`/api/sites/${siteId}/domain`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ domain: input }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setErr(d.error ?? "Couldn't add that domain"); return; }
    polls.current = 0;
    setSt(d); setInput("");
  }

  async function remove() {
    setBusy("remove"); setErr(null);
    await fetch(`/api/sites/${siteId}/domain`, { method: "DELETE" });
    setBusy(null); setConfirmRemove(false);
    setSt({ configured: true, domain: null });
  }

  const copy = (v: string) => { navigator.clipboard?.writeText(v); setCopied(v); setTimeout(() => setCopied(null), 1500); };
  const pill = st.status === "active" ? ["bg-emerald-50 text-emerald-800", "Connected"] : st.status === "error" ? ["bg-red-50 text-red-800", "Problem"] : ["bg-amber-50 text-amber-800", "Waiting for DNS"];

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Your domain</h2>
        <p className="mt-1 text-sm text-stone-500">
          Your site is always available at <a href={freeUrl} target="_blank" rel="noreferrer" className="underline">{freeUrl.replace(/^https?:\/\//, "")}</a>. Connect a domain you own (like janedoe.com) to use that address instead.
        </p>
      </div>

      {!st.configured ? (
        <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">Custom domains are coming soon.</p>
      ) : !st.domain ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label htmlFor="domain" className="sr-only">Domain</label>
            <input id="domain" className="input min-w-60 flex-1" placeholder="janedoe.com" value={input} autoComplete="off" spellCheck={false}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim() && !busy) add(); }} />
            <button className="btn" disabled={!!busy || !input.trim()} onClick={add}>{busy === "add" ? "Connecting…" : "Connect domain"}</button>
          </div>
          <p className="text-xs text-stone-500">You&apos;ll need to sign in where you bought the domain (GoDaddy, Namecheap, Squarespace, Cloudflare…) to add two records. Moving from an old website? Set up <Link href="/dashboard/redirects" className="underline">redirects</Link> first so old links keep working.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <a href={`https://${st.domain}`} target="_blank" rel="noreferrer" className="text-lg font-semibold underline-offset-4 hover:underline">{st.domain}</a>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill[0]}`}>{pill[1]}</span>
            </div>
            <div className="flex gap-2">
              {st.status !== "active" && <button className="btn-ghost" disabled={!!busy} onClick={() => check(true)}>{busy === "check" ? "Checking…" : "Check now"}</button>}
              {!confirmRemove ? (
                <button className="btn-ghost text-red-700" disabled={!!busy} onClick={() => setConfirmRemove(true)}>Remove</button>
              ) : (
                <span className="flex items-center gap-2 text-sm">Remove {st.domain}?
                  <button className="btn-ghost text-red-700" disabled={!!busy} onClick={remove}>{busy === "remove" ? "Removing…" : "Yes, remove"}</button>
                  <button className="text-stone-500 underline" onClick={() => setConfirmRemove(false)}>Cancel</button>
                </span>
              )}
            </div>
          </div>
          {st.message && <p className={`text-sm ${st.status === "active" ? "text-emerald-800" : st.status === "error" ? "text-red-700" : "text-stone-700"}`}>{st.message}</p>}
          {st.alias && st.status === "active" && <p className="text-xs text-stone-500">{st.alias} also works and forwards to {st.domain}.</p>}

          {st.status !== "active" && (st.records?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Add these records at your domain provider:</p>
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                    <tr><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Name / Host</th><th className="px-3 py-2 font-medium">Value / Points to</th><th className="px-3 py-2" /></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {st.records!.map((r) => (
                      <tr key={`${r.type}${r.name}${r.value}`}>
                        <td className="px-3 py-2.5 font-mono">{r.type}</td>
                        <td className="px-3 py-2.5 font-mono">{r.name}</td>
                        <td className="px-3 py-2.5"><span className="break-all font-mono">{r.value}</span><span className="block text-xs text-stone-400">{r.purpose}</span></td>
                        <td className="px-3 py-2.5 text-right"><button className="text-xs underline" onClick={() => copy(r.value)} aria-label={`Copy ${r.type} value`}>{copied === r.value ? "Copied" : "Copy"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-stone-500">Replace any existing records with the same name and type (they point to your old site). Changes usually show up within minutes; we keep checking while this page is open.</p>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium">Where do I add these?</summary>
                <ul className="mt-2 space-y-2">
                  {TIPS.map(([who, how]) => <li key={who}><span className="font-medium">{who}:</span> <span className="text-stone-600">{how}</span></li>)}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}
      {err && <p className="text-sm text-red-700">{err}</p>}
    </section>
  );
}
