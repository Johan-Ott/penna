import { describe, expect, it, vi } from "vitest";
import { feedbackText, sendFeedback } from "../src/app/feedback/sendFeedback";

const feedback = {
  kind: "fel" as const,
  message: " Sidkartan visar fel sida. ",
  email: "",
  hasReport: false,
};

describe("feedback", () => {
  it("sends only what the writer chose, as JSON", async () => {
    const send = vi.fn(async () => new Response("{}", { status: 200 }));

    await sendFeedback(feedback, send);

    const body = JSON.parse(
      String((send.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body).toMatchObject({ kind: "fel", message: "Sidkartan visar fel sida." });
    expect(body).not.toHaveProperty("report");
    expect(body).not.toHaveProperty("email");
  });

  it("fails loudly when it was not received, so the text can be copied instead", async () => {
    const send = vi.fn(async () => new Response("", { status: 500 }));

    await expect(sendFeedback(feedback, send)).rejects.toThrow("500");
  });

  it("puts the report under the message when it goes along", () => {
    const text = feedbackText({ ...feedback, hasReport: true });

    expect(text).toMatch(/^Sidkartan visar fel sida\.\n\n---\nPenna /);
  });
});

describe("the error report", () => {
  it("goes along only with something that is wrong", () => {
    const idea = feedbackText({ ...feedback, kind: "ide", hasReport: true });

    expect(idea).not.toContain("---");
  });
});
