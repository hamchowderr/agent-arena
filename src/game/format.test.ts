import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n";
import { abbreviation, changeValue, clock, compact, killerName, tierLabel } from "./format";

describe("format", () => {
  afterEach(async () => {
    await setLocale("en");
  });

  it("shows minutes and padded seconds", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(125)).toBe("2:05");
  });

  it("abbreviates part names to two letters", () => {
    expect(abbreviation("Long context")).toBe("LC");
    expect(abbreviation("Temperature 1.2")).toBe("T1");
    expect(abbreviation("Planner")).toBe("PL");
  });

  it("abbreviates names in any script", () => {
    expect(abbreviation("Mémoire vectorielle")).toBe("MV");
    expect(abbreviation("ロングコンテキスト")).toBe("ロン");
    expect(abbreviation("롱 컨텍스트")).toBe("롱컨");
    expect(abbreviation("长上下文")).toBe("长上");
  });

  it("names tiers with their stage", async () => {
    expect(tierLabel(1)).toBe("Raw LLM · Pre-seed");
    await setLocale("es");
    expect(tierLabel(1)).toBe("LLM en bruto · Pre-semilla");
  });

  it("shortens big numbers", () => {
    expect(compact(950)).toBe("950");
    expect(compact(11200)).toBe("11.2K");
  });

  it("names whoever took you out", async () => {
    expect(killerName(null)).toBe("the swarm");
    expect(killerName({ world: "meterly", enemy: "boss" })).toBe("The Meter");
    expect(killerName({ world: "hustlr", enemy: "runner" })).toBe("Hustlr runner");
    await setLocale("fr");
    expect(killerName({ world: "hustlr", enemy: "runner" })).toBe("un coureur de Hustlr");
  });

  it("formats card changes by unit", () => {
    expect(changeValue({ stat: "every", unit: "ticks", before: 32, after: 30 }, 30)).toBe("0.5s");
    expect(changeValue({ stat: "crit", unit: "percent", before: 5, after: 11 }, 11)).toBe("11%");
    expect(changeValue({ stat: "damage", unit: "bonusPercent", before: 0, after: 10 }, 10)).toBe("+10%");
    expect(changeValue({ stat: "damage", unit: "bonusPercent", before: 0, after: 10 }, 0)).toBe("0%");
    expect(changeValue({ stat: "regen", unit: "regen", before: 0, after: 1 }, 1)).toBe("1 HP/2s");
    expect(changeValue({ stat: "damage", unit: "plain", before: null, after: 10 }, null)).toBe("-");
  });
});
