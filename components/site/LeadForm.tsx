"use client";
import { useState } from "react";

export function LeadForm({ siteId, disabled }: { siteId: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const intent = typeof window !== "undefined" && window.location.hash.includes("valuation") ? "valuation" : "contact";
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteId,
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        message: fd.get("message"),
        website: fd.get("website"), // honeypot
        intent,
        pagePath: window.location.pathname,
      }),
    });
    setState(res.ok ? "sent" : "error");
  }

  if (state === "sent") return <p className="self-center text-lg">Thanks — I&apos;ll be in touch shortly.</p>;

  const field = "w-full border px-4 py-3 text-sm outline-none";
  const style = { borderColor: "var(--surface)", background: "var(--bg)", color: "var(--text)", borderRadius: "var(--radius)" };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="name" required maxLength={120} placeholder="Name" className={field} style={style} />
      <input name="email" type="email" required maxLength={200} placeholder="Email" className={field} style={style} />
      <input name="phone" maxLength={40} placeholder="Phone (optional)" className={field} style={style} />
      <textarea name="message" rows={4} maxLength={2000} placeholder="How can I help?" className={field} style={style} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <button disabled={disabled || state === "sending"} className="site-btn w-full disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Send"}
      </button>
      {state === "error" && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      {disabled && <p className="text-xs" style={{ color: "var(--muted)" }}>Form is disabled in preview.</p>}
    </form>
  );
}
