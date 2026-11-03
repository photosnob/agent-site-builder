"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewPostButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn" disabled={busy} onClick={async () => {
      setBusy(true);
      const res = await fetch(`/api/sites/${siteId}/posts`, { method: "POST" });
      const data = await res.json();
      if (res.ok) router.push(`/dashboard/blog/${data.id}`);
      else { alert(data.error); setBusy(false); }
    }}>
      {busy ? "Creating…" : "New post"}
    </button>
  );
}
