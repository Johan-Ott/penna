import { describe, expect, it } from "vitest";
import { provideAppName } from "@llkit/appInfo.js";
import {
  deviceOf,
  feedbackMail,
  feedbackText,
  provideFeedbackAddress,
} from "@llkit/feedback/sendFeedback.js";

// As the app does when it starts.
provideAppName("Skrivro");
provideFeedbackAddress("feedback@example.com");

const feedback = { kind: "fel" as const, message: " Sidkartan visar fel sida. ", hasReport: false };

const mail = (link: string) => {
  const url = new URL(link);
  return {
    to: url.pathname,
    subject: url.searchParams.get("subject"),
    body: url.searchParams.get("body") ?? "",
  };
};

describe("feedback", () => {
  it("opens a mail to the app's address with only what the writer wrote", () => {
    const { to, subject, body } = mail(feedbackMail(feedback));

    expect(to).toBe("feedback@example.com");
    expect(subject).toBe("Skrivro test: Fel");
    expect(body).toBe("Sidkartan visar fel sida.");
  });

  it("puts the report under the message when it goes along", () => {
    const text = feedbackText({ ...feedback, hasReport: true });

    expect(text).toMatch(/^Sidkartan visar fel sida\.\n\n---\nSkrivro /);
  });

  it("leaves a report too long for a mail link to be pasted from the clipboard", () => {
    const long = { ...feedback, message: "x".repeat(1700), hasReport: true };

    expect(feedbackMail(long).length).toBeLessThan(2000);
    expect(mail(feedbackMail(long)).body).toMatch(/Felrapporten är kopierad/);
  });
});

describe("the error report", () => {
  it("goes along only with something that is wrong", () => {
    const idea = feedbackText({ ...feedback, kind: "ide", hasReport: true });

    expect(idea).not.toContain("---");
  });
});

describe("deviceOf", () => {
  it("names the system and the engine instead of the whole user agent", () => {
    const phone =
      "Mozilla/5.0 (Linux; Android 14; SM-S921B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36";
    const windows =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";

    expect(deviceOf(phone)).toBe("Android 14, Chromium 130");
    expect(deviceOf(windows)).toBe("Windows, Chromium 130");
  });
});
