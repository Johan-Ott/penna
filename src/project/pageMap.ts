import type { PageMarks } from "../export/typstCompile.js";

/** The book as printed: its length, the page each block starts on, and each chapter's pages. */
export interface PageMap {
  pages: number;
  blockPages: Map<string, number[]>;
  chapterPages: Map<string, { first: number; last: number }>;
}

/** `rows` are the chapters (or loose scenes) in reading order, as Innehåll lists them. */
export function pageMap(found: PageMarks, rows: { id: string; sceneIds: string[] }[]): PageMap {
  const blockPages = new Map<string, number[]>();
  for (const { scene, block, page } of found.marks) {
    const pages = blockPages.get(scene) ?? [];
    pages[block] = page;
    blockPages.set(scene, pages);
  }
  const firstPages = rows.map((row) => {
    const starts = row.sceneIds.map((id) => blockPages.get(id)?.[0]).filter((page) => page);
    return starts.length > 0 ? Math.min(...(starts as number[])) : null;
  });
  const chapterPages = new Map<string, { first: number; last: number }>();
  rows.forEach((row, index) => {
    const first = firstPages[index];
    if (!first) return;
    const next = firstPages.slice(index + 1).find((page) => page);
    chapterPages.set(row.id, { first, last: next ? next - 1 : found.lastPage });
  });
  return { pages: found.pages, blockPages, chapterPages };
}
