import type { Stroke } from "./stickyNotes.js";

// Where a note shows and what the eraser takes, in pixels: pure, so both are tested without a screen.

type Point = [number, number];
type Box = { left: number; top: number; width: number; height: number };

/** How close, in pixels, the eraser rubs: about a fingertip. */
export const ERASER_REACH = 10;

// A line as points no more than two pixels apart, so the eraser can take any part of it.
function dense(stroke: Stroke): Stroke {
  return stroke.flatMap(([startX, startY], index) => {
    const [endX, endY] = stroke[index + 1] ?? [startX, startY];
    const steps = Math.max(1, Math.ceil(Math.hypot(endX - startX, endY - startY) / 2));
    const last = index === stroke.length - 1 ? 1 : steps;
    return Array.from({ length: last }, (_unused, step): [number, number] => [
      Math.round(startX + ((endX - startX) * step) / steps),
      Math.round(startY + ((endY - startY) * step) / steps),
    ]);
  });
}

// The pieces of a line left after the eraser has passed: one, two, or none.
function piecesOutside(stroke: Stroke, point: Point, reach: number): Stroke[] {
  const pieces: Stroke[] = [[]];
  for (const spot of dense(stroke)) {
    const isRubbed = Math.hypot(spot[0] - point[0], spot[1] - point[1]) <= reach;
    if (!isRubbed) pieces[pieces.length - 1]?.push(spot);
    else if (pieces[pieces.length - 1]?.length) pieces.push([]);
  }
  return pieces.filter((piece) => piece.length > 1);
}

/** The lines as the eraser leaves them: only what it passes over goes, as with a real eraser. */
export const rubOut = (strokes: Stroke[], point: Point, reach = ERASER_REACH) =>
  strokes.flatMap((stroke) => piecesOutside(stroke, point, reach));

/**
 * Where the note shows in a room of this size: inside it, and no larger. The note keeps its own
 * place, so it goes back there when the window grows again.
 */
export function placeInRoom(note: Box, room: { width: number; height: number }): Box {
  const width = Math.min(note.width, room.width);
  const height = Math.min(note.height, room.height);
  return {
    left: Math.max(0, Math.min(note.left, room.width - width)),
    top: Math.max(0, Math.min(note.top, room.height - height)),
    width,
    height,
  };
}
