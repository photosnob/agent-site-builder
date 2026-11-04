/**
 * Transactional email through Resend (resend.com). Without RESEND_API_KEY,
 * emails are skipped and logged, so the app still works in development.
 */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }) {
  if (!emailEnabled()) {
    console.warn(`[email] skipped (RESEND_API_KEY/EMAIL_FROM not set): ${msg.subject}`);
    return { ok: false as const, skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM!.trim(),
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      reply_to: msg.replyTo,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error(`[email] Resend ${res.status}: ${detail}`);
    return { ok: false as const, status: res.status, detail };
  }
  return { ok: true as const };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function leadEmail(lead: { name: string; email: string; phone?: string | null; message?: string | null; intent: string; pagePath?: string }, site: { agentName?: string; siteUrl: string; dashboardUrl: string }) {
  const intentLabel = lead.intent === "valuation" ? "Home valuation request" : lead.intent === "listing" ? "Listing inquiry" : "New contact";
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ...(lead.phone ? [["Phone", lead.phone] as [string, string]] : []),
    ...(lead.pagePath ? [["From page", `${site.siteUrl.replace(/\/$/, "")}${lead.pagePath.replace(/^\/s\/[^/]+/, "")}`] as [string, string]] : []),
  ];
  const subject = `${intentLabel}: ${lead.name}`;
  const text = [
    `${intentLabel} from your website`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(lead.message ? ["", "Message:", lead.message] : []),
    "",
    `Reply to this email to respond to ${lead.name} directly.`,
    `All leads: ${site.dashboardUrl}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:24px">
    <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#78716c">${esc(intentLabel)}</p>
    <h1 style="margin:6px 0 16px;font-size:22px">${esc(lead.name)} reached out</h1>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#78716c;width:110px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${k === "Email" ? `<a href="mailto:${esc(v)}" style="color:#1c1917">${esc(v)}</a>` : k === "Phone" ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ""))}" style="color:#1c1917">${esc(v)}</a>` : esc(v)}</td></tr>`).join("")}
    </table>
    ${lead.message ? `<div style="margin-top:16px;padding:14px;background:#fafaf9;border-radius:8px;white-space:pre-wrap;font-size:15px;line-height:1.5">${esc(lead.message)}</div>` : ""}
    <p style="margin:20px 0 0;font-size:14px;color:#57534e">Reply to this email to respond to ${esc(lead.name.split(" ")[0])} directly.</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#a8a29e;margin-top:16px"><a href="${esc(site.dashboardUrl)}" style="color:#78716c">View all leads</a></p>
</div></body></html>`;
  return { subject, text, html };
}
