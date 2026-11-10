import { describe, expect, it } from "vitest";
import { buildAgent } from "../sim/loadout";
import { describeBuild, describeEffect, slotLabel } from "./text";

describe("card text", () => {
  it("lists each nonzero effect with its sign", () => {
    expect(describeEffect("frontierBrain")).toBe("+4 ATK  -6 SPD  -10 HALL%");
    expect(describeEffect("toolRouter")).toBe("Routes tool calls");
  });

  it("turns slot ids into readable labels", () => {
    expect(slotLabel("shortTermMemory")).toBe("Short Term Memory");
    expect(slotLabel("brain")).toBe("Brain");
  });

  it("summarizes a build", () => {
    expect(describeBuild(buildAgent({ name: "Bare", tier: 1, parts: [] }))).toBe("HP 100  ATK 6  SPD 30  CRIT 5%  HALL 30%");
  });
});
