import { Fragment } from "react";
import { buildToc, type DocNode } from "@/lib/blog/content";
import type { VideoRef } from "@/lib/blog/video";
import { VideoEmbed } from "./VideoEmbed";

/**
 * Renders validated post JSON to React. Only known node and mark types are
 * rendered; anything else is skipped. No HTML strings are ever injected.
 */
export function PostBody({ doc }: { doc: DocNode }) {
  const ids = buildToc(doc).map((t) => t.id);
  let h = 0;
  return (
    <div className="post-body">
      {(doc.content ?? []).map((n, i) => {
        if (n.type === "heading" && (n.content ?? []).some((c) => c.text?.trim())) return <Node key={i} node={n} id={ids[h++]} />;
        return <Node key={i} node={n} />;
      })}
    </div>
  );
}

function Node({ node: n, id }: { node: DocNode; id?: string }): React.ReactNode {
  const kids = () => (n.content ?? []).map((c, i) => <Node key={i} node={c} />);
  switch (n.type) {
    case "paragraph":
      return <p>{kids()}</p>;
    case "heading": {
      const level = n.attrs?.level;
      const Tag = level === 3 ? "h3" : level === 4 ? "h4" : "h2";
      return <Tag id={id}>{kids()}</Tag>;
    }
    case "bulletList":
      return <ul>{kids()}</ul>;
    case "orderedList":
      return <ol start={typeof n.attrs?.start === "number" ? n.attrs.start : undefined}>{kids()}</ol>;
    case "listItem":
      return <li>{kids()}</li>;
    case "blockquote":
      return <blockquote>{kids()}</blockquote>;
    case "table": {
      const rows = n.content ?? [];
      return (
        <div className="post-table">
          <table>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {(r.content ?? []).map((c, ci) => {
                    const Cell = c.type === "tableHeader" ? "th" : "td";
                    const colSpan = Number(c.attrs?.colspan) > 1 ? Number(c.attrs?.colspan) : undefined;
                    const rowSpan = Number(c.attrs?.rowspan) > 1 ? Number(c.attrs?.rowspan) : undefined;
                    return (
                      <Cell key={ci} colSpan={colSpan} rowSpan={rowSpan} scope={c.type === "tableHeader" ? (ri === 0 ? "col" : "row") : undefined}>
                        {(c.content ?? []).map((k, ki) => <Node key={ki} node={k} />)}
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "horizontalRule":
      return <hr />;
    case "hardBreak":
      return <br />;
    case "figure": {
      const caption = (n.content ?? []).length > 0;
      return (
        <figure className="post-figure" data-size={(n.attrs?.size as string) || "large"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(n.attrs?.src)} alt={String(n.attrs?.alt ?? "")} loading="lazy" />
          {caption && <figcaption>{kids()}</figcaption>}
        </figure>
      );
    }
    case "video": {
      const a = n.attrs ?? {};
      const ref: VideoRef = { provider: a.provider === "vimeo" ? "vimeo" : "youtube", videoId: String(a.videoId), start: Number(a.start) || undefined, hash: (a.hash as string) || undefined };
      const caption = (n.content ?? []).length > 0;
      return (
        <figure className="post-video" data-vertical={a.vertical ? "" : undefined}>
          <VideoEmbed video={ref} title={caption ? (n.content ?? []).map((c) => c.text ?? "").join("") : "Video"} />
          {caption && <figcaption>{kids()}</figcaption>}
        </figure>
      );
    }
    case "text":
      return <Marks text={n.text ?? ""} marks={n.marks ?? []} />;
    default:
      return null;
  }
}

function Marks({ text, marks }: { text: string; marks: NonNullable<DocNode["marks"]> }) {
  let out: React.ReactNode = text;
  for (const m of marks) {
    switch (m.type) {
      case "bold": out = <strong>{out}</strong>; break;
      case "italic": out = <em>{out}</em>; break;
      case "underline": out = <u>{out}</u>; break;
      case "strike": out = <s>{out}</s>; break;
      case "code": out = <code>{out}</code>; break;
      case "link": {
        const href = String(m.attrs?.href ?? "");
        const external = /^https?:\/\//i.test(href);
        out = <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{out}</a>;
        break;
      }
    }
  }
  return <Fragment>{out}</Fragment>;
}
