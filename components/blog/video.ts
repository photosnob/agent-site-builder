import { Node, mergeAttributes } from "@tiptap/react";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import { thumbnailUrl, type VideoRef } from "@/lib/blog/video";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (ref: VideoRef) => ReturnType;
      removeVideo: () => ReturnType;
    };
  }
}

/**
 * A YouTube/Vimeo embed with an editable caption. In the editor it shows a
 * thumbnail (no iframe, so typing stays fast); the published post gets the player.
 */
export const Video = Node.create({
  name: "video",
  group: "block",
  content: "inline*",
  draggable: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      provider: { default: "youtube", parseHTML: (el) => el.getAttribute("data-provider") },
      videoId: { default: null, parseHTML: (el) => el.getAttribute("data-video-id") },
      start: { default: null, parseHTML: (el) => Number(el.getAttribute("data-start")) || null },
      hash: { default: null, parseHTML: (el) => el.getAttribute("data-hash") },
      vertical: { default: false, parseHTML: (el) => el.hasAttribute("data-vertical") },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-video]", contentElement: "figcaption" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { provider, videoId, start, hash, vertical, ...rest } = HTMLAttributes;
    const ref = node.attrs as VideoRef;
    const thumb = thumbnailUrl(ref);
    return [
      "figure",
      mergeAttributes(rest, {
        "data-video": "", "data-provider": provider, "data-video-id": videoId,
        ...(start ? { "data-start": start } : {}), ...(hash ? { "data-hash": hash } : {}), ...(vertical ? { "data-vertical": "" } : {}),
        class: "post-video",
      }),
      ["div", { class: "post-video-frame", contenteditable: "false" },
        ...(thumb ? [["img", { src: thumb, alt: "", draggable: "false" }]] : []),
        ["span", { class: "post-video-badge" }, `▶ ${provider === "vimeo" ? "Vimeo" : "YouTube"} video`],
      ],
      ["figcaption", 0],
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn: (view, _pos, node, nodePos, event) => {
            if (node.type.name !== this.name || !(event.target as HTMLElement).closest(".post-video-frame")) return false;
            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
            return true;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertVideo:
        (ref) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { ...ref, start: ref.start ?? null, hash: ref.hash ?? null, vertical: !!ref.vertical } }, { type: "paragraph" }]),
      removeVideo:
        () =>
        ({ state, tr, dispatch }) => {
          const sel = state.selection;
          if (sel instanceof NodeSelection && sel.node.type.name === this.name) {
            if (dispatch) dispatch(tr.delete(sel.from, sel.to));
            return true;
          }
          const $from = sel.$from;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === this.name) {
              if (dispatch) dispatch(tr.delete($from.before(d), $from.after(d)));
              return true;
            }
          }
          return false;
        },
    };
  },
});
