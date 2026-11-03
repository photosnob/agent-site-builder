import { Node, mergeAttributes } from "@tiptap/react";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import type { ImageSize } from "@/lib/blog/content";

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: { src: string; alt?: string }) => ReturnType;
      setFigureSize: (size: ImageSize) => ReturnType;
      setFigureAlt: (alt: string) => ReturnType;
      removeFigure: () => ReturnType;
    };
  }
}

/**
 * An image with an editable caption. The image is an atom inside the node;
 * the node's own inline content is the caption, so typing below an image
 * writes the caption. Size is a preset, never a pixel value.
 */
export const Figure = Node.create({
  name: "figure",
  group: "block",
  content: "inline*",
  draggable: true,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      src: { default: null, parseHTML: (el) => el.querySelector("img")?.getAttribute("src") },
      alt: { default: "", parseHTML: (el) => el.querySelector("img")?.getAttribute("alt") ?? "" },
      size: { default: "large", parseHTML: (el) => el.getAttribute("data-size") || "large" },
    };
  },

  parseHTML() {
    // Only our own figures. Pasted <img> tags from other sites are dropped,
    // since post images must live in this site's library.
    return [{ tag: "figure[data-figure]", contentElement: "figcaption" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, size, ...rest } = HTMLAttributes;
    return [
      "figure",
      mergeAttributes(rest, { "data-figure": "", "data-size": size, class: "post-figure" }),
      ["img", { src, alt, draggable: "false", contenteditable: "false" }],
      ["figcaption", 0],
    ];
  },

  // Clicking the photo selects the whole figure, so the size/alt controls appear.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn: (view, _pos, node, nodePos, event) => {
            if (node.type.name !== this.name || (event.target as HTMLElement).tagName !== "IMG") return false;
            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
            return true;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertFigure:
        ({ src, alt = "" }) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { src, alt, size: "large" } }, { type: "paragraph" }]),
      setFigureSize:
        (size) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { size }),
      setFigureAlt:
        (alt) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { alt }),
      // Works whether the figure itself is selected or the cursor is in its caption.
      removeFigure:
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
