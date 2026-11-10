import { describe, expect, it } from "vitest";
import { abbreviation, clock, compact, tierLabel } from "./format";

describe("format", () => {
  it("shows minutes and padded seconds", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(125)).toBe("2:05");
  });

  it("abbreviates part names to two letters", () => {
    expect(abbreviation("Long context")).toBe("LC");
    expect(abbreviation("Temperature 1.2")).toBe("T1");
    expect(abbreviation("Planner")).toBe("PL");
  });

  it("names tiers with their stage", () => {
    expect(tierLabel(1)).toBe("Raw LLM · Pre-seed");
  });

  it("shortens big numbers", () => {
    expect(compact(950)).toBe("950");
    expect(compact(11200)).toBe("11.2K");
  });
});
