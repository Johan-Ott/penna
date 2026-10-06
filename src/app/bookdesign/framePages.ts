const SVG = "http://www.w3.org/2000/svg";
// Space around and between the spreads, in the SVG's own units (points).
const GAP = 24;

// Typst draws the pages in one column; this lays them out as an open book, page 1 alone on the
// right, then 2 and 3, 4 and 5.
export function framePages(svg: SVGSVGElement) {
  const pages = Array.from(svg.querySelectorAll<SVGGElement>(".typst-page"));
  const width = Math.max(0, ...pages.map((page) => Number(page.dataset["pageWidth"])));
  const height = Math.max(0, ...pages.map((page) => Number(page.dataset["pageHeight"])));
  pages.forEach((page, index) => {
    const sheet = document.createElementNS(SVG, "rect");
    sheet.setAttribute("width", String(width));
    sheet.setAttribute("height", String(height));
    sheet.setAttribute("class", "print-sheet");
    page.prepend(sheet);
    const column = (index + 1) % 2;
    const row = Math.floor((index + 1) / 2);
    page.setAttribute("transform", `translate(${column * width}, ${row * (height + GAP)})`);
  });
  const rows = Math.ceil((pages.length + 1) / 2);
  svg.setAttribute("viewBox", `0 0 ${width * 2} ${Math.max(0, rows * (height + GAP) - GAP)}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
}
