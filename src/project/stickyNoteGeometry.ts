import type { Stroke } from "./stickyNotes.js";

// Where a note shows and what the eraser takes, in pixels: pure, so both are tested without a screen.

type Point = [number, number];
type Box = { left: number; top: number; width: number; height: number };

/** How close, in pixels, the eraser must come to a line to take it. */
export const ERASER_REACH = 8;

// How far the point is from the nearest place on the line between start and end.
function distanceToSegment(point: Point, start: Point, end: Point) {
  const [pointX, pointY] = point;
  const [startX, startY] = start;
  const run = end[0] - startX;
  const rise = end[1] - startY;
  const lengthSquared = run * run + rise * rise;
  const projected = ((pointX - startX) * run + (pointY - startY) * rise) / (lengthSquared || 1);
  const along = Math.max(0, Math.min(1, projected));
  return Math.hypot(pointX - (startX + along * run), pointY - (startY + along * rise));
}

const isNear = (stroke: Stroke, point: Point, reach: number) =>
  stroke.some(
    (start, index) => distanceToSegment(point, start, stroke[index + 1] ?? start) <= reach,
  );

/** The lines the eraser does not touch; a touched line goes whole, as a pencil line rubs out. */
export const withoutStrokesNear = (strokes: Stroke[], point: Point, reach = ERASER_REACH) =>
  strokes.filter((stroke) => !isNear(stroke, point, reach));

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
