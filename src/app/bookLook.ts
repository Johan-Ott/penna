import { designedLabel } from "../export/bookWords.js";
import { BREAK_PICTURE, designOf, type HeaderContent } from "../export/bookDesign.js";
import { bookLanguage } from "../project/bookLanguage.js";
import { proseStyle, type WritingSettings } from "../editor/writingSettings.js";

// Boktypografi in Skriv follows the book's design in Publicera, so the page looks as it will print.

/** The page's classes for the design's drop cap, lead-in and title case, and its scene break. */
export function bookLook(fields: Record<string, unknown>) {
  const design = designOf(fields);
  const classes = [
    design.dropCap && "drop-cap",
    design.leadIn && "lead-in",
    `title-${design.titleCase}`,
    design.sceneBreak === BREAK_PICTURE && "break-picture",
  ].filter(Boolean);
  const breakSign = design.sceneBreak === BREAK_PICTURE ? null : design.sceneBreak;
  return { classes: classes.join(" "), breakSign };
}

export type BookLook = ReturnType<typeof bookLook>;

/** "Kapitel 8", "8", "VIII" or nothing, as the printed book numbers the chapter. */
export function chapterLabel(fields: Record<string, unknown>, number: number, title: string) {
  const style = designOf(fields).chapterLabel;
  return designedLabel({ kind: "chapter", number, title }, bookLanguage(fields), style);
}

/** A number alone stands large above the title; a word is set small, as a label. */
export const isBareNumber = (fields: Record<string, unknown>) =>
  ["siffra", "romersk"].includes(designOf(fields).chapterLabel);

/** The running head's two sides, as the design's left and right pages show them; once if alike. */
export function runningHead(
  fields: Record<string, unknown>,
  texts: { title: string; author: string; chapter: string },
) {
  const design = designOf(fields);
  const shown: Record<HeaderContent, string> = {
    titel: texts.title,
    forfattare: texts.author,
    kapitel: texts.chapter,
    inget: "",
  };
  const book = shown[design.headerLeft];
  const chapter = shown[design.headerRight];
  return book === chapter ? { book, chapter: "" } : { book, chapter };
}

interface PageLook {
  settings: WritingSettings;
  isFocusMode: boolean;
  opensChapter?: boolean | undefined;
  bookLook?: BookLook | undefined;
}

export function pageClass({ settings, isFocusMode, opensChapter, bookLook }: PageLook) {
  return [
    "page",
    settings.paper && !isFocusMode && "paper",
    settings.bookType && `book-type ${bookLook?.classes ?? ""}`,
    opensChapter && "opens-chapter",
  ]
    .filter(Boolean)
    .join(" ");
}

// A quoted string, so the scene break's ::after can show the book's own sign.
export const pageStyle = ({ settings, bookLook }: PageLook) => ({
  ...proseStyle(settings),
  "--break-sign": JSON.stringify(bookLook?.breakSign ?? ""),
});
