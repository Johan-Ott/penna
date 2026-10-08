import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface PageLayout {
  count: number;
  /** The first page of each scene, counted from 0. */
  sceneStarts: Map<string, number>;
  /** The pages where a chapter begins, which carry no running head. */
  chapterStarts: Set<number>;
  /** The text the pages were measured with. */
  text: unknown;
}

const EMPTY: PageLayout = {
  count: 1,
  sceneStarts: new Map(),
  chapterStarts: new Set(),
  text: null,
};

// Every page is one column of the flow, as wide as a page of the spread behind it.
function measure(flow: HTMLElement, perSpread: number, text: unknown): PageLayout {
  const pageWidth = (flow.parentElement?.clientWidth ?? 1) / perSpread;
  const left = flow.getBoundingClientRect().left;
  const pageOf = (element: Element) =>
    Math.max(0, Math.floor((element.getBoundingClientRect().left - left + 1) / pageWidth));
  const sceneStarts = new Map<string, number>();
  const chapterStarts = new Set<number>();
  flow.querySelectorAll<HTMLElement>(".read-scene").forEach((scene) => {
    const page = pageOf(scene);
    sceneStarts.set(scene.dataset["scene"] ?? "", page);
    if (scene.classList.contains("opens-chapter")) chapterStarts.add(page);
  });
  const count = Math.max(1, Math.ceil(flow.scrollWidth / pageWidth));
  return { count, sceneStarts, chapterStarts, text };
}

// Measured again when the window, the fonts or the text change the page breaks.
function usePageLayout(flow: RefObject<HTMLDivElement | null>, perSpread: number, text: unknown) {
  const [layout, setLayout] = useState(EMPTY);
  useLayoutEffect(() => {
    const element = flow.current;
    if (!element) return;
    const update = () => setLayout(measure(element, perSpread, text));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    void document.fonts.ready.then(update);
    return () => observer.disconnect();
  }, [flow, perSpread, text]);
  return layout;
}

/** The spread on show, opened first where the writer was. `text` is null until it is read. */
export function useBookPages(
  flow: RefObject<HTMLDivElement | null>,
  perSpread: number,
  text: unknown,
  startScene: string | null,
) {
  const layout = usePageLayout(flow, perSpread, text);
  const [page, setPage] = useState(0);
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current || layout.text === null) return;
    hasStarted.current = true;
    setPage(layout.sceneStarts.get(startScene ?? "") ?? 0);
  }, [layout, startScene]);
  const last = layout.count - 1;
  const goTo = (target: number) => setPage(Math.min(last, Math.max(0, target)));
  const first = Math.floor(Math.min(page, last) / perSpread) * perSpread;
  return { layout, first, goTo, turn: (step: number) => goTo(first + step * perSpread) };
}
