"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Instagram connected." },
  cancelled: { ok: false, text: "Instagram connection was cancelled." },
  expired: { ok: false, text: "That connection link expired. Please try again." },
  failed: { ok: false, text: "Instagram didn't accept the connection. Make sure it's a Business or Creator account and try again." },
  "not-configured": { ok: false, text: "Instagram isn't set up on this app yet (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)." },
};

export function InstagramSettings({ siteId, configured, connection, showing, status }: {
  siteId: string;
  configured: boolean;
  connection: { username: string | null; expiresAt: string; lastError: string | null; postCount: number } | null;
  showing: boolean;
  status?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const notice = status ? STATUS[status] : null;
  const act = async (action: "show" | "hide" | "disconnect") => {
    if (action === "disconnect" && !confirm("Disconnect Instagram? The section will be removed from your site.")) return;
    setBusy(true);
    await fetch(`/api/sites/${siteId}/instagram`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: action === "disconnect" ? "disconnect" : action }) });
    if (action === "disconnect") await fetch(`/api/sites/${siteId}/instagram`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "hide" }) });
    setBusy(false);
    router.refresh();
  };
  const expired = connection && new Date(connection.expiresAt).getTime() < Date.now();

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Instagram</h2>
        <p className="mt-1 text-sm text-stone-500">Show your 3 latest posts on your home page. They update automatically. Requires an Instagram Business or Creator account.</p>
      </div>
      {notice && <p className={`rounded-lg p-3 text-sm ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{notice.text}</p>}
      {!connection ? (
        configured ? <a className="btn inline-flex" href="/api/instagram/connect">Connect Instagram</a>
          : <p className="text-sm text-stone-500">Coming soon. The app owner needs to finish the Instagram setup.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>Connected as <strong>@{connection.username ?? "your account"}</strong>{connection.postCount ? ` · ${connection.postCount} recent posts` : ""}</p>
          {expired && <p className="text-amber-800">The connection expired. <a className="underline" href="/api/instagram/connect">Reconnect</a> to keep posts updating.</p>}
          {connection.lastError && !expired && <p className="text-xs text-amber-800">Last update had a problem: {connection.lastError}</p>}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showing} disabled={busy} onChange={(e) => act(e.target.checked ? "show" : "hide")} />
            Show the Instagram section on my home page
          </label>
          <button className="text-sm font-semibold text-red-700 hover:underline" disabled={busy} onClick={() => act("disconnect")}>Disconnect</button>
        </div>
      )}
    </section>
  );
}
