import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import type { Stroke } from "../../project/stickyNotes.js";

// What is drawn on a note: its lines, over its text, drawn with the pen and rubbed out with the
// eraser while one of them is chosen.

export type NoteTool = "pen" | "eraser";

function draw(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * scale;
  canvas.height = canvas.offsetHeight * scale;
  context.scale(scale, scale);
  context.lineWidth = 2;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = getComputedStyle(canvas).color;
  for (const stroke of strokes) {
    context.beginPath();
    stroke.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.stroke();
  }
}

const pointOf = (event: PointerEvent<HTMLCanvasElement>): [number, number] => {
  const box = event.currentTarget.getBoundingClientRect();
  return [Math.round(event.clientX - box.left), Math.round(event.clientY - box.top)];
};

// A line follows the pointer from press to release, and is kept when it is more than a dot.
function usePen(
  canvas: RefObject<HTMLCanvasElement | null>,
  strokes: Stroke[],
  onStroke: (stroke: Stroke) => void,
) {
  const drawing = useRef<Stroke | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drawing.current = [pointOf(event)];
    },
    onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || !canvas.current) return;
      drawing.current.push(pointOf(event));
      draw(canvas.current, [...strokes, drawing.current]);
    },
    onPointerUp: () => {
      if (drawing.current && drawing.current.length > 1) onStroke(drawing.current);
      drawing.current = null;
    },
  };
}

// The eraser takes the lines it passes over, from press to release.
function useEraser(onErase: (point: [number, number]) => void) {
  const isErasing = useRef(false);
  return {
    onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      isErasing.current = true;
      onErase(pointOf(event));
    },
    onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => {
      if (isErasing.current) onErase(pointOf(event));
    },
    onPointerUp: () => {
      isErasing.current = false;
    },
  };
}

export function NoteDrawing(props: {
  strokes: Stroke[];
  tool: NoteTool | null;
  size: string;
  onStroke: (stroke: Stroke) => void;
  onErase: (point: [number, number]) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pen = usePen(canvas, props.strokes, props.onStroke);
  const eraser = useEraser(props.onErase);
  useEffect(() => {
    if (canvas.current) draw(canvas.current, props.strokes);
  }, [props.strokes, props.size]);
  const handlers = props.tool ? { pen, eraser }[props.tool] : {};
  return (
    <canvas
      ref={canvas}
      className={props.tool ? `note-drawing ${props.tool}` : "note-drawing"}
      {...handlers}
    />
  );
}
