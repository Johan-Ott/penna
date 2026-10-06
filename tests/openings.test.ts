import { describe, expect, it } from "vitest";
import {
  OPENING_PRESETS,
  openingFor,
  picturesIn,
  templateFrom,
  touchesEdge,
  type OpeningTemplate,
} from "../src/export/openings";

const [klassisk, ornament, overst] = OPENING_PRESETS as [
  OpeningTemplate,
  OpeningTemplate,
  OpeningTemplate,
];

describe("chapter opening templates", () => {
  it("give a chapter its own template, or the book's standard when it has none or a removed one", () => {
    const templates = [klassisk, ornament];

    expect(openingFor(templates, "klassisk", { opening: "ornament" }).id).toBe("ornament");
    expect(openingFor(templates, "klassisk", {}).id).toBe("klassisk");
    expect(openingFor(templates, "klassisk", { opening: "borttagen" }).id).toBe("klassisk");
  });

  it("show the chapter's own picture in an area, and the template's where it has none", () => {
    const template = {
      ...ornament,
      areas: ornament.areas.map((area) => ({ ...area, picture: "rosett.png" })),
    };

    const [own] = picturesIn(template, { pictures: { bild1: "fyr.png" } });
    const [shared] = picturesIn(template, {});

    expect(own?.picture).toBe("fyr.png");
    expect(shared?.picture).toBe("rosett.png");
  });

  it("know which areas reach the paper's edge and so need bleed", () => {
    expect(overst.areas.every(touchesEdge)).toBe(true);
    expect(ornament.areas.some(touchesEdge)).toBe(false);
  });

  it("are made from a preset under a name and id of their own", () => {
    const first = templateFrom(ornament, [klassisk]);
    const second = templateFrom(ornament, [klassisk, first]);

    expect([first.name, second.name]).toEqual(["Ornament", "Ornament 2"]);
    expect(second.id).not.toBe(first.id);
  });
});
