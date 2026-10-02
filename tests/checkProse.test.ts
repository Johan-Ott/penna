import { describe, expect, it } from "vitest";
import { findProblems } from "../scripts/check-prose.mjs";

const lines = (...parts: string[]) => parts.join("\n");

describe("findProblems", () => {
  it("flags an em dash", () => {
    const text = `const label = 'a ${String.fromCharCode(0x2014)} b';`;

    const problems = findProblems("src/label.ts", text);

    expect(problems).toHaveLength(1);
  });

  it("flags a comment with a marketing word", () => {
    const text = lines("// A robust parser", "const value = 1;");

    const problems = findProblems("src/parser.ts", text);

    expect(problems).toHaveLength(1);
  });

  it("flags a comment that tells history", () => {
    const text = lines("// Previously this read the whole file", "const value = 1;");

    const problems = findProblems("src/reader.ts", text);

    expect(problems).toHaveLength(1);
  });

  it("flags a comment block longer than two lines", () => {
    const text = lines("// first line", "// second line", "// third line", "const value = 1;");

    const problems = findProblems("src/block.ts", text);

    expect(problems).toHaveLength(1);
  });

  it("accepts a short comment that explains why", () => {
    const text = lines("// iCloud may list a file before it is downloaded", "const value = 1;");

    const problems = findProblems("src/files.ts", text);

    expect(problems).toEqual([]);
  });
});
