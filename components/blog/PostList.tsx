"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PostListItem { id: string; slug: string; title: string; status: "draft" | "published"; updated_at: string }

/** Post rows with edit links and a Delete button (drafts and live posts). */
export function PostList({ posts: initial, apiBase, editBase, empty }: { posts: PostListItem[]; apiBase: string; editBase: string; empty: string }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (p: PostListItem) => {
    const msg = p.status === "published"
      ? `Delete “${p.title}”? It's live, so it will disappear from the blog right away. This can't be undone.`
      : `Delete the draft “${p.title}”? This can't be undone.`;
    if (!confirm(msg)) return;
    setBusy(p.id); setError(null);
    const res = await fetch(`${apiBase}/${p.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) { setError(`Couldn't delete “${p.title}”. Try again.`); return; }
    try { localStorage.removeItem(`ll-post-backup:${p.id}`); } catch { /* ignore */ }
    setPosts((list) => list.filter((x) => x.id !== p.id));
    router.refresh();
  };

  return (
    <>
      {error && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-8 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        {posts.length === 0 && <p className="p-8 text-center text-sm text-stone-500">{empty}</p>}
        {posts.map((p) => (
          <div key={p.id} className="flex items-center gap-2 pr-3 hover:bg-stone-50">
            <Link href={`${editBase}/${p.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-xs text-stone-500">/blog/{p.slug} · edited {new Date(p.updated_at).toLocaleDateString()}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                {p.status === "published" ? "Published" : "Draft"}
              </span>
            </Link>
            <button type="button" onClick={() => remove(p)} disabled={busy === p.id} aria-label={`Delete ${p.title}`}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
              {busy === p.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
