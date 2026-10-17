import { GuideTip as Tip } from "@llkit/guide/GuideTip.js";
import { guide, type StepId } from "./guide.js";
import { useResume } from "../resume/lastPlace.js";

/** Penna's guide's tip for this part of Penna, shown the first time the writer is here. */
export const GuideTip = (props: { step: StepId; isHere?: boolean }) => (
  <Tip guide={guide} {...props} />
);

// The first tip waits until the writer is in the text, not over the welcome back.
export function WritingTip({ isHidden }: { isHidden: boolean }) {
  const isWelcomingBack = useResume() !== null;
  return <GuideTip step="skriv" isHere={!isHidden && !isWelcomingBack} />;
}
