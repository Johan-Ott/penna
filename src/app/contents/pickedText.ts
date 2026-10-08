import type { Anchor } from "../../project/comments.js";

const CONTEXT = 32;

/** What is selected in the book: in which scene and paragraph, and the words with their surroundings. */
export interface Picked {
  sceneId: string;
  blockIndex: number;
  /** Null when the selection runs over more than one paragraph. */
  anchor: Anchor | null;
  top: number;
  left: number;
  bottom: number;
}

const elementOf = (node: Node) => (node instanceof Element ? node : node.parentElement);

function textAround(block: Element, range: Range): Anchor {
  const before = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);
  const after = document.createRange();
  after.selectNodeContents(block);
  after.setStart(range.endContainer, range.endOffset);
  return {
    quote: range.toString(),
    prefix: before.toString().slice(-CONTEXT),
    suffix: after.toString().slice(0, CONTEXT),
  };
}

// The scene and the paragraph where the selection starts.
function placeOf(flow: HTMLElement, range: Range) {
  const scene = elementOf(range.startContainer)?.closest<HTMLElement>(".read-scene");
  if (!scene || !flow.contains(scene)) return null;
  const blocks = Array.from(scene.querySelector(".read-text")?.children ?? []);
  const blockIndex = blocks.findIndex((block) => block.contains(range.startContainer));
  const block = blocks[blockIndex];
  return block ? { sceneId: scene.dataset["scene"] ?? "", block, blockIndex } : null;
}

export function pickedIn(flow: HTMLElement, selection: Selection | null): Picked | null {
  const range = selection && !selection.isCollapsed ? selection.getRangeAt(0) : null;
  const place = range && placeOf(flow, range);
  if (!range || !place) return null;
  const { top, left, bottom } = range.getBoundingClientRect();
  return {
    sceneId: place.sceneId,
    blockIndex: place.blockIndex,
    anchor: place.block.contains(range.endContainer) ? textAround(place.block, range) : null,
    top,
    left,
    bottom,
  };
}
