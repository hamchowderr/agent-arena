import { afterEach, describe, expect, it } from "vitest";
import { currentLocale, detectLocale, format, LOADERS, LOCALES, nextLocale, setLocale, t, type LocaleCode, type MessageKey } from "./index";
import { en } from "./locales/en";

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const englishKeys = Object.keys(en).sort();

describe.each(LOCALES.map((entry) => entry.code))("locale %s", (code) => {
  it("has every English string, and nothing extra", async () => {
    const messages = await LOADERS[code]();
    expect(Object.keys(messages).sort()).toEqual(englishKeys);
  });

  it("fills every string", async () => {
    const messages = await LOADERS[code]();
    const empty = Object.entries(messages).filter(([, value]) => value.trim() === "");
    expect(empty).toEqual([]);
  });

  it("keeps the same placeholders as English", async () => {
    const messages = await LOADERS[code]();
    const mismatched = (Object.keys(en) as MessageKey[]).filter((key) => placeholders(messages[key]).join() !== placeholders(en[key]).join());
    expect(mismatched).toEqual([]);
  });

  it("keeps the key hints in brackets", async () => {
    const messages = await LOADERS[code]();
    const hints = (value: string) => [...value.matchAll(/\[([^\]]+)\]/g)].length;
    const mismatched = (Object.keys(en) as MessageKey[]).filter((key) => hints(messages[key]) !== hints(en[key]));
    expect(mismatched).toEqual([]);
  });
});

describe("i18n", () => {
  afterEach(async () => {
    await setLocale("en");
  });

  it("has a loader for every listed language", () => {
    expect(Object.keys(LOADERS).sort()).toEqual(LOCALES.map((entry) => entry.code).sort());
    expect(LOCALES).toHaveLength(8);
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(format("LV {level} {missing}", { level: 3 })).toBe("LV 3 {missing}");
  });

  it("switches language", async () => {
    expect(t("hud.boss")).toBe("Boss");
    await setLocale("ja");
    expect(currentLocale()).toBe("ja");
    expect(t("hud.boss")).toBe("ボス");
    expect(t("hud.level", { level: 4 })).toBe("LV 4");
  });

  it("keeps the last language asked for when loads finish out of order", async () => {
    const slow = setLocale("de");
    const fast = setLocale("fr");
    await Promise.all([slow, fast]);
    expect(currentLocale()).toBe("fr");
  });

  it.each([
    [["es-MX"], "es"],
    [["pt-BR"], "pt"],
    [["fr-CA"], "fr"],
    [["de-AT"], "de"],
    [["ja-JP"], "ja"],
    [["ko-KR"], "ko"],
    [["zh-CN"], "zh-Hans"],
    [["zh-Hans-SG"], "zh-Hans"],
    [["zh-TW", "en-US"], "en"],
    [["it-IT", "fr-FR"], "fr"],
    [[null, "zh-Hans", "de"], "zh-Hans"],
    [["xx"], "en"],
    [[], "en"],
  ] as const)("picks a language from %o", (preferred, expected) => {
    expect(detectLocale(preferred)).toBe(expected);
  });

  it("cycles through every language and wraps around", () => {
    const seen: LocaleCode[] = [LOCALES[0].code];
    let code = nextLocale(LOCALES[0].code);
    while (code !== LOCALES[0].code) {
      seen.push(code);
      code = nextLocale(code);
    }
    expect(seen).toEqual(LOCALES.map((entry) => entry.code));
  });
});
