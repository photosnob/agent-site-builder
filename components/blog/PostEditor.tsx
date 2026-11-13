"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { looksLikeMarkdown, markdownToEditorHtml } from "@/lib/blog/markdownPaste";
import { Figure } from "./figure";
import { Video } from "./video";
import { parseVideoUrl } from "@/lib/blog/video";
import { prepareImage } from "@/components/manage/resize";
import { IMAGE_SIZES, postSlug, type PostDoc } from "@/lib/blog/content";
import type { Finding } from "@/lib/guardrails/fairHousing";
import { CharCount, SearchPreview } from "@/components/seo/SearchPreview";
import { ProfileMenu } from "@/components/app/ProfileMenu";

interface Post {
  id: string; slug: string; title: string; excerpt: string | null; meta_description: string | null; seo_title?: string | null;
  cover_image: string | null; content: PostDoc; show_toc: boolean; status: "draft" | "published"; published_at: string | null; updated_at: string;
}

const SIZE_LABEL = { small: "S", medium: "M", large: "L", full: "Full" } as const;

async function uploadImage(uploadUrl: string, original: File): Promise<string> {
  if (!original.type.startsWith("image/")) throw new Error("That file isn't an image.");
  const file = await prepareImage(original);
  if (file.size > 8_000_000) throw new Error("Images must be under 8 MB.");
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", "other");
  const res = await fetch(uploadUrl, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.asset.url as string;
}

/** Where the editor saves. Defaults to the agent's own site; the admin blog passes its own. */
export interface PostEndpoints { post: string; upload: string; back: string }

export function PostEditor({ siteId, post: initial, publicBase, agentName = "", canonicalBase, endpoints }: { siteId?: string; post: Post; publicBase: string; agentName?: string; canonicalBase?: string; endpoints?: PostEndpoints }) {
  const router = useRouter();
  const api: PostEndpoints = endpoints ?? { post: `/api/sites/${siteId}/posts/${initial.id}`, upload: `/api/sites/${siteId}/assets`, back: "/dashboard/blog" };
  const [post, setPost] = useState(initial);
  const [meta, setMeta] = useState<Meta>(() => snapshotMeta(initial));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [findings, setFindings] = useState<{ list: Finding[]; needsAck: boolean } | null>(null);
  const [ack, setAck] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [restored, setRestored] = useState<string | null>(null);
  const [edits, setEdits] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // Bumped on every edit, so a save that finishes after newer typing doesn't mark the post clean.
  const changeSeq = useRef(0);
  // How the post looked when this editing session started, for "Revert".
  const sessionStart = useRef({ meta: snapshotMeta(initial), content: initial.content, status: initial.status });
  const savedThisSession = useRef(false);
  const deleted = useRef(false);
  // After a failed autosave, wait for the next edit before trying again.
  const autosaveFailedAt = useRef(-1);
  const backupKey = `ll-post-backup:${initial.id}`;
  const slugTouched = useRef(!initial.slug.startsWith("untitled-"));
  const fileInput = useRef<HTMLInputElement>(null);

  const onUploadError = useCallback((e: unknown) => setMessage({ kind: "error", text: (e as Error).message }), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener", target: null } },
      }),
      Figure,
      Video,
      TableKit.configure({ table: { resizable: false, HTMLAttributes: { class: "editor-table" } } }),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => (node.type.name === "figure" || node.type.name === "video" ? "Add a caption (optional)" : "Start writing… Use the toolbar for headings and images."),
      }),
    ],
    content: initial.content,
    editorProps: {
      attributes: { class: "post-body editor-body", "aria-label": "Post content" },
      // Map pasted H1/H5/H6 from Docs or Word onto the levels we support.
      transformPastedHTML: (html) => html.replace(/<(\/?)h1\b/gi, "<$1h2").replace(/<(\/?)h[56]\b/gi, "<$1h4"),
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) {
          // A YouTube/Vimeo link pasted on its own becomes an embedded video.
          const pasted = (event.clipboardData?.getData("text/plain") ?? "").trim();
          const video = !/\s/.test(pasted) ? parseVideoUrl(pasted) : null;
          if (video) {
            editorRef.current?.chain().focus().insertVideo(video).run();
            return true;
          }
          // Markdown pasted as plain text (e.g. ChatGPT's copy button) → formatted content.
          const html = event.clipboardData?.getData("text/html");
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (!html && text && looksLikeMarkdown(text)) {
            editorRef.current?.chain().focus().insertContent(markdownToEditorHtml(text)).run();
            return true;
          }
          return false;
        }
        files.forEach((f) => uploadImage(api.upload, f).then((src) => editorRef.current?.chain().focus().insertFigure({ src }).run()).catch(onUploadError));
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((f) => uploadImage(api.upload, f).then((src) => editorRef.current?.chain().focus().insertFigure({ src }).run()).catch(onUploadError));
        return true;
      },
    },
    onUpdate: () => markChanged(),
  });
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  const save = useCallback(
    async (extra: Record<string, unknown> = {}, label = "save") => {
      if (!editor) return false;
      const quiet = label === "autosave";
      const seq = changeSeq.current;
      setBusy(label);
      if (!quiet) setMessage(null);
      try {
        const res = await fetch(api.post, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: meta.title.trim() || "Untitled post",
            slug: meta.slug,
            excerpt: meta.excerpt || null,
            metaDescription: meta.metaDescription || null,
            seoTitle: meta.seoTitle || null,
            coverImage: meta.coverImage,
            showToc: meta.showToc,
            content: editor.getJSON(),
            ...extra,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.findings) { setFindings({ list: data.findings, needsAck: Boolean(data.needsAck) }); setAck(false); }
          if (quiet) autosaveFailedAt.current = seq;
          setMessage({ kind: "error", text: quiet ? `Couldn't autosave: ${data.error}` : data.error });
          return false;
        }
        setPost(data.post);
        savedThisSession.current = true;
        setSavedAt(new Date());
        const clean = changeSeq.current === seq;
        setDirty(!clean);
        if (clean) clearBackup(backupKey);
        setFindings(null);
        if (!quiet) {
          setMessage({ kind: "ok", text: label === "publish" ? "Published." : label === "unpublish" ? "Moved back to draft." : label === "revert" ? "Reverted to how it was when you opened it." : "Saved." });
          router.refresh();
        }
        return true;
      } finally {
        setBusy(null);
      }
    },
    [editor, meta, router, api.post, backupKey],
  );

  function markChanged() {
    changeSeq.current += 1;
    setEdits((n) => n + 1);
    setDirty(true);
  }

  const isPublished = post.status === "published";

  // Always-current copy of the unsaved work, for the backup and for saving on the way out.
  const latest = useRef({ meta, dirty, isPublished });
  latest.current = { meta, dirty, isPublished };
  const writeBackup = useCallback(() => {
    if (deleted.current || !editorRef.current || !latest.current.dirty) return;
    try {
      localStorage.setItem(backupKey, JSON.stringify({ at: Date.now(), meta: latest.current.meta, content: editorRef.current.getJSON() }));
    } catch { /* storage full or blocked; the server autosave still runs for drafts */ }
  }, [backupKey]);

  // On open: bring back work that never reached the server (back button, closed tab, crash).
  useEffect(() => {
    if (!editor) return;
    const backup = readBackup(backupKey);
    if (!backup || backup.at <= Date.parse(initial.updated_at)) { clearBackup(backupKey); return; }
    editor.commands.setContent(backup.content, { emitUpdate: false });
    setMeta(backup.meta);
    markChanged();
    setRestored(new Date(backup.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Every change is backed up on this device right away. Drafts also autosave to the
  // server a moment after you stop typing; published posts wait for "Update" so
  // half-finished edits never go live.
  useEffect(() => {
    if (!dirty) return;
    const backup = setTimeout(writeBackup, 300);
    const server = !isPublished && !busy && autosaveFailedAt.current !== changeSeq.current ? setTimeout(() => save({}, "autosave"), 2000) : undefined;
    return () => { clearTimeout(backup); if (server) clearTimeout(server); };
  }, [dirty, meta, isPublished, busy, save, writeBackup, edits]);

  // Leaving the page (back button, link, closing the tab): back up now, and push drafts to the server.
  const flush = useCallback(() => {
    if (deleted.current || !latest.current.dirty || !editorRef.current) return;
    writeBackup();
    if (latest.current.isPublished) return;
    const m = latest.current.meta;
    fetch(api.post, {
      method: "PATCH", keepalive: true, headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: m.title.trim() || "Untitled post", slug: m.slug, excerpt: m.excerpt || null, metaDescription: m.metaDescription || null, seoTitle: m.seoTitle || null, coverImage: m.coverImage, showToc: m.showToc, content: editorRef.current.getJSON() }),
    }).then((r) => { if (r.ok) clearBackup(backupKey); }).catch(() => {});
  }, [api.post, backupKey, writeBackup]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onHide); flush(); };
  }, [flush]);

  // Cmd/Ctrl+S saves; still warn before closing a published post with edits that aren't live yet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(isPublished ? { acknowledgeWarnings: ack } : {}, isPublished ? "update" : "save"); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty && isPublished) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [dirty, isPublished, ack, save]);

  const setField = <K extends keyof typeof meta>(k: K, v: (typeof meta)[K]) => {
    setMeta((m) => {
      const next = { ...m, [k]: v };
      if (k === "title" && !slugTouched.current && post.status === "draft") next.slug = postSlug(String(v));
      return next;
    });
    markChanged();
  };

  const deletePost = async () => {
    const name = meta.title.trim() || "this post";
    const msg = isPublished
      ? `Delete “${name}”? It's live, so it will disappear from the blog right away. This can't be undone.`
      : `Delete the draft “${name}”? This can't be undone.`;
    if (!confirm(msg)) return;
    setBusy("delete");
    const res = await fetch(api.post, { method: "DELETE" });
    if (!res.ok) { setBusy(null); setMessage({ kind: "error", text: "Couldn't delete the post." }); return; }
    deleted.current = true; // stop the leave-page autosave from recreating it
    clearBackup(backupKey);
    setDirty(false);
    router.push(api.back);
    router.refresh();
  };

  // Undo the whole editing session: content, settings and publish state go back to how they were on open.
  const sessionChanged = dirty || savedThisSession.current || restored !== null;
  const revert = async () => {
    if (!editor || !confirm("Undo everything you changed since you opened this post? It goes back to exactly how it was.")) return;
    const start = sessionStart.current;
    editor.commands.setContent(start.content, { emitUpdate: false });
    setMeta(start.meta);
    slugTouched.current = !start.meta.slug.startsWith("untitled-");
    setRestored(null);
    if (!savedThisSession.current) {
      clearBackup(backupKey);
      changeSeq.current += 1;
      setDirty(false);
      setMessage({ kind: "ok", text: "Reverted to how it was when you opened it." });
      return;
    }
    await save({
      title: start.meta.title.trim() || "Untitled post", slug: start.meta.slug, excerpt: start.meta.excerpt || null,
      metaDescription: start.meta.metaDescription || null, seoTitle: start.meta.seoTitle || null, coverImage: start.meta.coverImage,
      showToc: start.meta.showToc, content: start.content, status: start.status, acknowledgeWarnings: true,
    }, "revert");
  };
  const liveUrl = `${publicBase}/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Link href={api.back} className="font-semibold text-stone-600 hover:text-stone-900">← All posts</Link>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isPublished ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
            {isPublished ? "Published" : "Draft"}
          </span>
          <span className="text-stone-400" aria-live="polite">
            {busy === "save" || busy === "autosave" ? "Saving…"
              : dirty ? (isPublished ? "Edits saved on this device · click Update to publish them" : "Unsaved changes")
              : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "All changes saved"}
          </span>
        </div>
        <div className="flex gap-2">
          {sessionChanged && <button className="btn-ghost" disabled={!!busy} onClick={revert} title="Undo everything changed since you opened this post">Revert</button>}
          <button className="btn-ghost" onClick={() => setShowSettings((s) => !s)}>Settings</button>
          <button className="btn-ghost !text-red-700" disabled={!!busy} onClick={deletePost} title="Delete this post">{busy === "delete" ? "Deleting…" : "Delete"}</button>
          {isPublished && <a className="btn-ghost" href={liveUrl} target="_blank">View ↗</a>}
          <button className="btn-ghost" disabled={!!busy || !dirty} onClick={() => save()}>Save</button>
          {isPublished ? (
            <>
              <button className="btn-ghost" disabled={!!busy} onClick={() => save({ status: "draft" }, "unpublish")}>Unpublish</button>
              <button className="btn" disabled={!!busy || !dirty} onClick={() => save({ acknowledgeWarnings: ack }, "update")}>Update</button>
            </>
          ) : (
            <button className="btn" disabled={!!busy || !meta.title.trim()} onClick={() => save({ status: "published", acknowledgeWarnings: ack }, "publish")}>
              {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
          )}
          <ProfileMenu />
        </div>
      </header>

      {restored && (
        <div className="mx-auto max-w-3xl px-5 pt-4">
          <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
            We brought back unsaved changes from {restored}. Use <strong>Revert</strong> to throw them away.
          </p>
        </div>
      )}
      {(message || findings) && (
        <div className="mx-auto max-w-3xl px-5 pt-4">
          {message && <p className={`rounded-lg p-3 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
          {findings && (
            <div className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <ul className="list-disc pl-4">
                {findings.list.map((f) => <li key={f.match}><strong>“{f.match}”</strong>: {f.message}</li>)}
              </ul>
              {findings.needsAck && (
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                  I&apos;ve reviewed these. Publish anyway.
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <section className="mx-auto mt-4 max-w-3xl space-y-4 rounded-xl border border-stone-200 bg-white p-5 px-5">
          <div>
            <label className="label" htmlFor="slug">URL</label>
            <div className="flex items-center gap-1 text-sm text-stone-500">
              <span className="shrink-0">/blog/</span>
              <input id="slug" className="input" value={meta.slug} onChange={(e) => { slugTouched.current = true; setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); }} />
            </div>
            {isPublished && <p className="mt-1 text-xs text-amber-700">Changing the URL of a published post breaks existing links to it.</p>}
          </div>
          <div>
            <label className="label" htmlFor="excerpt">Excerpt <span className="font-normal text-stone-400">(shown on the blog index)</span></label>
            <textarea id="excerpt" className="input" rows={2} maxLength={300} value={meta.excerpt} onChange={(e) => setField("excerpt", e.target.value)} />
          </div>
          <div className="space-y-4 border-t border-stone-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Search engines</p>
            <div>
              <label className="label" htmlFor="seoTitle">SEO title <CharCount value={meta.seoTitle} soft={60} /></label>
              <input id="seoTitle" className="input" maxLength={120} value={meta.seoTitle} placeholder={`${meta.title || "Post title"} | ${agentName}`}
                onChange={(e) => setField("seoTitle", e.target.value)} />
              <p className="mt-1 text-xs text-stone-400">Shown in Google and browser tabs. Leave empty to use the post title.</p>
            </div>
            <div>
              <label className="label" htmlFor="meta">Meta description <CharCount value={meta.metaDescription} soft={160} /></label>
              <textarea id="meta" className="input" rows={2} maxLength={160} value={meta.metaDescription}
                placeholder={meta.excerpt || "A one- or two-sentence summary for search results."} onChange={(e) => setField("metaDescription", e.target.value)} />
            </div>
            <SearchPreview url={`${canonicalBase || publicBase}/blog/${meta.slug}`}
              title={meta.seoTitle || `${meta.title || "Post title"} | ${agentName}`}
              description={meta.metaDescription || meta.excerpt} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={meta.showToc} onChange={(e) => setField("showToc", e.target.checked)} />
            Show a table of contents (built from your headings)
          </label>
          <div className="border-t border-stone-100 pt-4">
            <button className="text-sm font-semibold text-red-700 hover:underline" disabled={!!busy} onClick={deletePost}>Delete post</button>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <CoverImage uploadUrl={api.upload} value={meta.coverImage} onChange={(v) => setField("coverImage", v)} onError={onUploadError} />
        <textarea
          value={meta.title}
          onChange={(e) => setField("title", e.target.value.replace(/\n/g, ""))}
          placeholder="Post title"
          rows={1}
          maxLength={160}
          className="mt-6 w-full resize-none bg-transparent text-4xl font-bold leading-tight outline-none placeholder:text-stone-300"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        {editor && <Toolbar editor={editor} onPickImage={() => fileInput.current?.click()} />}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f || !editor) return;
            setBusy("upload");
            // Upload first, then build the insert from the editor's current state. Starting the
            // chain before the await applied a stale transaction ("Applying a mismatched transaction").
            try {
              const src = await uploadImage(api.upload, f);
              (editorRef.current ?? editor).chain().focus().insertFigure({ src }).run();
            } catch (err) { onUploadError(err); } finally { setBusy(null); }
          }}
        />
        {busy === "upload" && <p className="mt-2 text-sm text-stone-500">Uploading image…</p>}
        <div className="mt-4 rounded-xl border border-stone-200 bg-white px-6 py-6 sm:px-10">
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      p: e.isActive("paragraph"),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      figure: e.isActive("figure"),
      video: e.isActive("video"),
      table: e.isActive("table"),
      size: (e.getAttributes("figure").size as string | undefined) ?? "large",
      alt: (e.getAttributes("figure").alt as string | undefined) ?? "",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const applyVideo = () => {
    const v = parseVideoUrl(videoUrl);
    if (!v) { setVideoError("Paste a YouTube or Vimeo link, like https://www.youtube.com/watch?v=…"); return; }
    c().insertVideo(v).run();
    setVideoOpen(false); setVideoUrl(""); setVideoError(null);
  };
  const [href, setHref] = useState("");
  const c = () => editor.chain().focus();

  const applyLink = () => {
    const v = href.trim();
    if (!v) c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: /^(https?:|mailto:|tel:|\/|#)/i.test(v) ? v : `https://${v}` }).run();
    setLinkOpen(false);
  };

  return (
    <div className="sticky top-[57px] z-10 mt-4 rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5">
        <TB active={s.p && !s.figure} onClick={() => c().setParagraph().run()} title="Body text">Text</TB>
        <TB active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()} title="Heading 2 (section)">H2</TB>
        <TB active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()} title="Heading 3 (subsection)">H3</TB>
        <TB active={s.h4} onClick={() => c().toggleHeading({ level: 4 }).run()} title="Heading 4">H4</TB>
        <Sep />
        <TB active={s.bold} onClick={() => c().toggleBold().run()} title="Bold (⌘B)"><b>B</b></TB>
        <TB active={s.italic} onClick={() => c().toggleItalic().run()} title="Italic (⌘I)"><i>I</i></TB>
        <TB active={s.underline} onClick={() => c().toggleUnderline().run()} title="Underline (⌘U)"><u>U</u></TB>
        <TB active={s.strike} onClick={() => c().toggleStrike().run()} title="Strikethrough"><s>S</s></TB>
        <TB active={s.link || linkOpen} onClick={() => { setHref(s.href); setLinkOpen((o) => !o); }} title="Link">Link</TB>
        <Sep />
        <TB active={s.bullet} onClick={() => c().toggleBulletList().run()} title="Bulleted list">• List</TB>
        <TB active={s.ordered} onClick={() => c().toggleOrderedList().run()} title="Numbered list">1. List</TB>
        <TB active={s.quote} onClick={() => c().toggleBlockquote().run()} title="Quote">Quote</TB>
        <TB onClick={() => c().setHorizontalRule().run()} title="Divider">—</TB>
        <Sep />
        <TB onClick={onPickImage} title="Insert image (or paste / drag one in)">Image</TB>
        <TB active={videoOpen} onClick={() => { setVideoOpen((o) => !o); setVideoError(null); }} title="Insert a YouTube or Vimeo video (or paste the link into the post)">Video</TB>
        <TB active={s.table} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">Table</TB>
        <Sep />
        <TB disabled={!s.canUndo} onClick={() => c().undo().run()} title="Undo">↶</TB>
        <TB disabled={!s.canRedo} onClick={() => c().redo().run()} title="Redo">↷</TB>
      </div>

      {linkOpen && (
        <div className="mt-1.5 flex gap-2 border-t border-stone-100 px-1 pt-1.5">
          <input autoFocus className="input !py-1.5" placeholder="https://… (leave empty to remove)" value={href}
            onChange={(e) => setHref(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") setLinkOpen(false); }} />
          <button className="btn !py-1.5" onClick={applyLink}>Apply</button>
        </div>
      )}

      {videoOpen && (
        <div className="mt-1.5 border-t border-stone-100 px-1 pt-1.5">
          <div className="flex gap-2">
            <input autoFocus className="input !py-1.5" placeholder="YouTube or Vimeo link, e.g. https://youtu.be/…" value={videoUrl}
              onChange={(e) => { setVideoUrl(e.target.value); setVideoError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyVideo(); } if (e.key === "Escape") setVideoOpen(false); }} />
            <button className="btn !py-1.5" onClick={applyVideo}>Insert</button>
          </div>
          {videoError && <p className="mt-1 text-xs text-red-600">{videoError}</p>}
        </div>
      )}

      {s.video && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-stone-100 px-1 pt-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Video</span>
          <span className="text-xs text-stone-500">Type below the video to add a caption.</span>
          <TB onClick={() => c().removeVideo().run()} title="Remove video">Remove</TB>
        </div>
      )}

      {s.table && (
        <div className="mt-1.5 flex flex-wrap items-center gap-0.5 border-t border-stone-100 px-1 pt-1.5 text-sm">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Table</span>
          <TB onClick={() => c().addRowAfter().run()} title="Add row below">+ Row</TB>
          <TB onClick={() => c().addColumnAfter().run()} title="Add column to the right">+ Column</TB>
          <TB onClick={() => c().deleteRow().run()} title="Delete this row">− Row</TB>
          <TB onClick={() => c().deleteColumn().run()} title="Delete this column">− Column</TB>
          <TB onClick={() => c().toggleHeaderRow().run()} title="Toggle header row">Header row</TB>
          <Sep />
          <TB onClick={() => c().deleteTable().run()} title="Delete table">Delete table</TB>
        </div>
      )}

      {s.figure && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-stone-100 px-1 pt-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Image size</span>
          {IMAGE_SIZES.map((size) => (
            <TB key={size} active={s.size === size} onClick={() => c().setFigureSize(size).run()} title={`${size} width`}>{SIZE_LABEL[size]}</TB>
          ))}
          <input className="input !w-auto min-w-48 flex-1 !py-1.5" placeholder="Alt text: describe the image for screen readers and SEO"
            value={s.alt} maxLength={300} onChange={(e) => editor.commands.setFigureAlt(e.target.value)} />
          <TB onClick={() => c().removeFigure().run()} title="Remove image">Remove</TB>
        </div>
      )}
    </div>
  );
}

function TB({ active, disabled, onClick, title, children }: { active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={active} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`rounded-md px-2 py-1.5 text-sm ${active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"} disabled:opacity-30`}>
      {children}
    </button>
  );
}
const Sep = () => <span className="mx-0.5 h-5 w-px bg-stone-200" />;

function CoverImage({ uploadUrl, value, onChange, onError }: { uploadUrl: string; value: string | null; onChange: (v: string | null) => void; onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadImage(uploadUrl, f)); } catch (e) { onError(e); } finally { setBusy(false); }
  };
  if (value)
    return (
      <div className="group relative overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="aspect-[2/1] w-full object-cover" />
        <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
          <label className="btn-ghost cursor-pointer !py-1.5">Replace<input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} /></label>
          <button className="btn-ghost !py-1.5" onClick={() => onChange(null)}>Remove</button>
        </div>
      </div>
    );
  return (
    <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 py-6 text-sm text-stone-500 hover:bg-white">
      {busy ? "Uploading…" : "+ Add a cover image"}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}

type Meta = { title: string; slug: string; excerpt: string; metaDescription: string; seoTitle: string; coverImage: string | null; showToc: boolean };

function snapshotMeta(p: Post): Meta {
  return {
    title: p.title === "Untitled post" ? "" : p.title, slug: p.slug, excerpt: p.excerpt ?? "", metaDescription: p.meta_description ?? "",
    seoTitle: p.seo_title ?? "", coverImage: p.cover_image, showToc: p.show_toc,
  };
}

function readBackup(key: string): { at: number; meta: Meta; content: PostDoc } | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v && typeof v.at === "number" && v.meta && v.content?.type === "doc" ? v : null;
  } catch { return null; }
}
function clearBackup(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
