const SVG = "http://www.w3.org/2000/svg";
// Space between the pages, in the SVG's own units (points).
const GAP = 16;

/** Typst draws the pages edge to edge; this gives each a white sheet and space around it. */
export function framePages(svg: SVGSVGElement) {
  let top = 0;
  let width = 0;
  for (const page of Array.from(svg.querySelectorAll<SVGGElement>(".typst-page"))) {
    const pageWidth = Number(page.dataset["pageWidth"]);
    const pageHeight = Number(page.dataset["pageHeight"]);
    const sheet = document.createElementNS(SVG, "rect");
    sheet.setAttribute("width", String(pageWidth));
    sheet.setAttribute("height", String(pageHeight));
    sheet.setAttribute("class", "print-sheet");
    page.prepend(sheet);
    page.setAttribute("transform", `translate(0, ${top})`);
    top += pageHeight + GAP;
    width = Math.max(width, pageWidth);
  }
  svg.setAttribute("viewBox", `0 0 ${width} ${Math.max(0, top - GAP)}`);
  svg.removeAttribute("height");
}
