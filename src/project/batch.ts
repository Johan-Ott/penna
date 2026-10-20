// Several calls in one go, as `skrivro.mjs batch <fil.json>` runs them: [["add", "chapter",
// "Stormen"], ["set", "$0", "vad", "…"]], where "$0" is the first call's answer.

type Calls = Record<string, unknown>;
const EARLIER_ANSWER = /^\$(\d+)$/;

function stepsOf(steps: unknown): string[][] {
  const isStep = (step: unknown) =>
    Array.isArray(step) && step.length > 0 && step.every((part) => typeof part === "string");
  if (!Array.isArray(steps) || !steps.every(isStep))
    throw new Error(
      'En batch är en lista av anrop, till exempel [["tree"], ["status", "id", "klar"]].',
    );
  return steps as string[][];
}

function withAnswers(values: string[], answers: unknown[]) {
  return values.map((value) => {
    const index = EARLIER_ANSWER.exec(value)?.[1];
    return index === undefined ? value : String(answers[Number(index)]);
  });
}

/** The answers in the order the calls ran; the first call that fails stops the rest. */
export async function runBatch(calls: Calls, steps: unknown): Promise<unknown[]> {
  const answers: unknown[] = [];
  for (const [name = "", ...values] of stepsOf(steps)) {
    const call = calls[name];
    if (typeof call !== "function" || name === "batch")
      throw new Error(`Steg ${answers.length}: inget anrop heter ${name}.`);
    answers.push(await (call as (...given: string[]) => unknown)(...withAnswers(values, answers)));
  }
  return answers;
}
