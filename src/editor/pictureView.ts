import type { Node } from "prosemirror-model";
import { NodeSelection, type Command } from "prosemirror-state";
import type { EditorView, NodeView } from "prosemirror-view";
import {
  PICTURE_SIZES,
  type PictureSize,
  manuscriptSchema as schema,
} from "../manuscript/schema.js";
import { t } from "../i18n/i18n.js";

/** The picture's address for an <img>, or null when it cannot be read. */
export type PictureUrl = (name: string) => Promise<string | null>;

const SIZE_NAMES: Record<PictureSize, string> = {
  smal: t("Smal"),
  bred: t("Bred"),
  sida: t("Egen sida"),
};

/** Puts the picture where the cursor is, as a block of its own, and selects it. */
export const insertPicture =
  (name: string): Command =>
  (state, dispatch) => {
    const picture = schema.nodes.picture.create({ name });
    const transaction = state.tr.replaceSelectionWith(picture);
    const position = transaction.mapping.map(state.selection.from) - picture.nodeSize;
    if (position >= 0 && transaction.doc.nodeAt(position) === picture) {
      transaction.setSelection(NodeSelection.create(transaction.doc, position));
    }
    dispatch?.(transaction.scrollIntoView());
    return true;
  };

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
  const created = document.createElement(tag);
  created.className = className;
  return created;
};

// The picture, its caption to type in, and buttons for its size; all of it outside the text.
class PictureView implements NodeView {
  dom = element("figure", "picture");
  private image = element("img", "picture-image");
  private caption = element("input", "picture-caption");
  private sizes = element("div", "picture-sizes");

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined,
    private pictureUrl: PictureUrl,
  ) {
    this.dom.contentEditable = "false";
    this.image.alt = "";
    this.caption.placeholder = t("Bildtext");
    this.caption.addEventListener("change", () => this.change({ caption: this.caption.value }));
    for (const size of PICTURE_SIZES) this.sizes.append(this.sizeButton(size));
    this.dom.append(this.image, this.caption, this.sizes);
    this.show(node, true);
  }

  private sizeButton(size: PictureSize) {
    const button = element("button", "picture-size");
    button.type = "button";
    button.textContent = SIZE_NAMES[size];
    button.dataset["size"] = size;
    button.addEventListener("click", () => this.change({ size }));
    return button;
  }

  private change(attrs: Record<string, string>) {
    const position = this.getPos();
    if (position === undefined) return;
    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(position, undefined, { ...this.node.attrs, ...attrs }),
    );
  }

  private show(node: Node, isNewPicture: boolean) {
    this.dom.dataset["size"] = String(node.attrs["size"]);
    if (document.activeElement !== this.caption) this.caption.value = String(node.attrs["caption"]);
    for (const button of Array.from(this.sizes.children)) {
      button.classList.toggle(
        "chosen",
        (button as HTMLElement).dataset["size"] === node.attrs["size"],
      );
    }
    if (isNewPicture) {
      void this.pictureUrl(String(node.attrs["name"])).then((url) => {
        if (url) this.image.src = url;
        else this.dom.classList.add("missing");
        this.dom.dataset["missing"] = t("Bilden {name} saknas i bokens mapp bilder/", {
          name: String(node.attrs["name"]),
        });
      });
    }
  }

  update(node: Node) {
    if (node.type !== this.node.type) return false;
    const isNewPicture = node.attrs["name"] !== this.node.attrs["name"];
    this.node = node;
    this.show(node, isNewPicture);
    return true;
  }

  selectNode() {
    this.dom.classList.add("selected");
  }

  deselectNode() {
    this.dom.classList.remove("selected");
  }

  // Typing in the caption and clicking the buttons belong to the view, not to the text.
  stopEvent(event: Event) {
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement;
  }

  ignoreMutation() {
    return true;
  }
}

export const pictureNodeView =
  (pictureUrl: PictureUrl) => (node: Node, view: EditorView, getPos: () => number | undefined) =>
    new PictureView(node, view, getPos, pictureUrl);
