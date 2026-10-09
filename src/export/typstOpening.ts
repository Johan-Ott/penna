import { BREAK_PICTURE, DEFAULT_DESIGN, trimSize, type BookDesign } from "./bookDesign.js";
import {
  openingFor,
  picturesIn,
  touchesEdge,
  type ChapterOpening,
  type OpeningTemplate,
  type PictureArea,
} from "./openings.js";
import { marginsOf } from "./bookDesign.js";
import { BLEED_MM, millimetres } from "./typstPage.js";
import { textMark } from "./typstTemplate.js";
import { typstString } from "./typstText.js";

/** Where Typst finds a picture: the compiler is handed each one under this path. */
export const picturePath = (name: string) => `/bilder/${name}`;

type Pictures = Map<string, Uint8Array> | undefined;

const ALIGNS: Record<OpeningTemplate["headingAlign"], string> = {
  mitten: "center",
  vanster: "left",
};
const EDGE = 0.002;

/** The chapter's template and the areas in it that show a picture that was found. */
export function openingOf(design: BookDesign, chapter: ChapterOpening, images: Pictures) {
  const template = openingFor(design.openings, design.opening, chapter);
  const areas = picturesIn(template, chapter).filter((shown) => images?.has(shown.picture));
  return { template, areas };
}

/** True when some chapter's picture reaches the edge of the paper, so the book needs bleed. */
export const needsBleed = (design: BookDesign, chapters: ChapterOpening[], images: Pictures) =>
  chapters.some((chapter) => openingOf(design, chapter, images).areas.some(touchesEdge));

// In millimetres from the trim's corner; a side at the paper's edge reaches out into the bleed.
function areaTypst(shown: PictureArea, design: BookDesign, bleed: number) {
  const { width, height } = trimSize(design.trim);
  let [x, y, across, down] = [
    shown.x * width,
    shown.y * height,
    shown.width * width,
    shown.height * height,
  ];
  if (shown.x <= EDGE) [x, across] = [x - bleed, across + bleed];
  if (shown.y <= EDGE) [y, down] = [y - bleed, down + bleed];
  if (shown.x + shown.width >= 1 - EDGE) across += bleed;
  if (shown.y + shown.height >= 1 - EDGE) down += bleed;
  const fit = shown.fit === "fyll" ? `"cover"` : `"contain"`;
  const path = typstString(picturePath(shown.picture));
  return `(path: ${path}, x: ${millimetres(x)}, y: ${millimetres(y)}, width: ${millimetres(across)}, height: ${millimetres(down)}, fit: ${fit})`;
}

function layoutTypst(design: BookDesign, template: OpeningTemplate, areas: string[]) {
  const drop = Math.max(
    0,
    template.headingTop * trimSize(design.trim).height - marginsOf(design).top,
  );
  const pictures = areas.length ? `(${areas.join(", ")},)` : "()";
  return `(drop: ${millimetres(drop)}, align: ${ALIGNS[template.headingAlign]}, pictures: ${pictures})`;
}

/** A chapter's opening as Typst: its pictures, how far down and how its heading is set. */
export function chapterLayout(
  design: BookDesign,
  chapter: ChapterOpening,
  images: Pictures,
  hasBleed: boolean,
) {
  const { template, areas } = openingOf(design, chapter, images);
  const bleed = hasBleed ? BLEED_MM : 0;
  return layoutTypst(
    design,
    template,
    areas.map((shown) => areaTypst(shown, design, bleed)),
  );
}

/** The standard template without pictures, for the back matter. */
export const plainLayout = (design: BookDesign) =>
  layoutTypst(design, openingFor(design.openings, design.opening, {}), []);

export const partLayout = (design: BookDesign) =>
  layoutTypst(
    design,
    { id: "", name: "", headingTop: 0.32, headingAlign: "mitten", areas: [] },
    [],
  );

/** The scene break: the writer's picture when chosen and found, otherwise the marks. */
export function breakMark(design: BookDesign, images: Pictures) {
  if (design.sceneBreak !== BREAK_PICTURE) return textMark(design.sceneBreak);
  if (!images?.has(design.breakPicture)) return textMark(DEFAULT_DESIGN.sceneBreak);
  return `fitted(${typstString(picturePath(design.breakPicture))}, 35%, 1.6em)`;
}
