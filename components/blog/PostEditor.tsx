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
import { IMAGE_SIZES, postSlug, type PostDoc } from "@/lib/blog/content";
import type { Finding } from "@/lib/guardrails/fairHousing";

interface Post {
  id: string; slug: string; title: string; excerpt: string | null; meta_description: string | null;
  cover_image: string | null; content: PostDoc; show_toc: boolean; status: "draft" | "published"; published_at: string | null;
}

const SIZE_LABEL = { small: "S", medium: "M", large: "L", full: "Full" } as const;

async function uploadImage(siteId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > 8_000_000) throw new Error("Images must be under 8 MB.");
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", "other");
  const res = await fetch(`/api/sites/${siteId}/assets`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.asset.url as string;
}

export function PostEditor({ siteId, post: initial, publicBase }: { siteId: string; post: Post; publicBase: string }) {
  const router = useRouter();
  const [post, setPost] = useState(initial);
  const [meta, setMeta] = useState({
    title: initial.title === "Untitled post" ? "" : initial.title,
    slug: initial.slug,
    excerpt: initial.excerpt ?? "",
    metaDescription: initial.meta_description ?? "",
    coverImage: initial.cover_image,
    showToc: initial.show_toc,
  });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [findings, setFindings] = useState<{ list: Finding[]; needsAck: boolean } | null>(null);
  const [ack, setAck] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
      TableKit.configure({ table: { resizable: false, HTMLAttributes: { class: "editor-table" } } }),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => (node.type.name === "figure" ? "Add a caption (optional)" : "Start writing… Use the toolbar for headings and images."),
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
          // Markdown pasted as plain text (e.g. ChatGPT's copy button) → formatted content.
          const html = event.clipboardData?.getData("text/html");
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (!html && text && looksLikeMarkdown(text)) {
            editorRef.current?.chain().focus().insertContent(markdownToEditorHtml(text)).run();
            return true;
          }
          return false;
        }
        files.forEach((f) => uploadImage(siteId, f).then((src) => editorRef.current?.chain().focus().insertFigure({ src }).run()).catch(onUploadError));
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((f) => uploadImage(siteId, f).then((src) => editorRef.current?.chain().focus().insertFigure({ src }).run()).catch(onUploadError));
        return true;
      },
    },
    onUpdate: () => setDirty(true),
  });
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  const save = useCallback(
    async (extra: Record<string, unknown> = {}, label = "save") => {
      if (!editor) return false;
      setBusy(label); setMessage(null);
      try {
        const res = await fetch(`/api/sites/${siteId}/posts/${post.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: meta.title.trim() || "Untitled post",
            slug: meta.slug,
            excerpt: meta.excerpt || null,
            metaDescription: meta.metaDescription || null,
            coverImage: meta.coverImage,
            showToc: meta.showToc,
            content: editor.getJSON(),
            ...extra,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.findings) { setFindings({ list: data.findings, needsAck: Boolean(data.needsAck) }); setAck(false); }
          setMessage({ kind: "error", text: data.error });
          return false;
        }
        setPost(data.post);
        setDirty(false);
        setFindings(null);
        setMessage({ kind: "ok", text: label === "publish" ? "Published." : label === "unpublish" ? "Moved back to draft." : "Saved." });
        router.refresh();
        return true;
      } finally {
        setBusy(null);
      }
    },
    [editor, meta, post.id, router, siteId],
  );

  // Cmd/Ctrl+S saves; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("beforeunload", onLeave); };
  }, [dirty, save]);

  const setField = <K extends keyof typeof meta>(k: K, v: (typeof meta)[K]) => {
    setMeta((m) => {
      const next = { ...m, [k]: v };
      if (k === "title" && !slugTouched.current && post.status === "draft") next.slug = postSlug(String(v));
      return next;
    });
    setDirty(true);
  };

  const isPublished = post.status === "published";
  const liveUrl = `${publicBase}/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard/blog" className="font-semibold text-stone-600 hover:text-stone-900">← All posts</Link>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isPublished ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
            {isPublished ? "Published" : "Draft"}
          </span>
          <span className="text-stone-400">{busy === "save" ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setShowSettings((s) => !s)}>Settings</button>
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
        </div>
      </header>

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
          <div>
            <label className="label" htmlFor="meta">Meta description <span className="font-normal text-stone-400">({meta.metaDescription.length}/160, for search results)</span></label>
            <textarea id="meta" className="input" rows={2} maxLength={160} value={meta.metaDescription} onChange={(e) => setField("metaDescription", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={meta.showToc} onChange={(e) => setField("showToc", e.target.checked)} />
            Show a table of contents (built from your headings)
          </label>
          <div className="border-t border-stone-100 pt-4">
            <button className="text-sm font-semibold text-red-700 hover:underline" disabled={!!busy} onClick={async () => {
              if (!confirm("Delete this post? This can't be undone.")) return;
              setBusy("delete");
              const res = await fetch(`/api/sites/${siteId}/posts/${post.id}`, { method: "DELETE" });
              if (res.ok) { setDirty(false); router.push("/dashboard/blog"); } else { setBusy(null); setMessage({ kind: "error", text: "Couldn't delete the post." }); }
            }}>Delete post</button>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <CoverImage siteId={siteId} value={meta.coverImage} onChange={(v) => setField("coverImage", v)} onError={onUploadError} />
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
            try { editor.chain().focus().insertFigure({ src: await uploadImage(siteId, f) }).run(); } catch (err) { onUploadError(err); } finally { setBusy(null); }
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
      table: e.isActive("table"),
      size: (e.getAttributes("figure").size as string | undefined) ?? "large",
      alt: (e.getAttributes("figure").alt as string | undefined) ?? "",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
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

function CoverImage({ siteId, value, onChange, onError }: { siteId: string; value: string | null; onChange: (v: string | null) => void; onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { onChange(await uploadImage(siteId, f)); } catch (e) { onError(e); } finally { setBusy(false); }
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
