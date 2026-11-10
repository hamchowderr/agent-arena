export const LOCALES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh-Hans", name: "简体中文" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export function isLocale(value: string): value is LocaleCode {
  return LOCALES.some((entry) => entry.code === value);
}

export function matchLocale(tag: string): LocaleCode | null {
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh")) {
    return lower.includes("hant") || /-(tw|hk|mo)\b/.test(lower) ? null : "zh-Hans";
  }
  const base = lower.split("-")[0] ?? "";
  return isLocale(base) ? base : null;
}

export function detectLocale(preferred: readonly (string | null | undefined)[]): LocaleCode {
  for (const tag of preferred) {
    const match = tag ? (isLocale(tag) ? tag : matchLocale(tag)) : null;
    if (match) {
      return match;
    }
  }
  return DEFAULT_LOCALE;
}

export function nextLocale(code: LocaleCode): LocaleCode {
  const index = LOCALES.findIndex((entry) => entry.code === code);
  return LOCALES[(index + 1) % LOCALES.length]?.code ?? DEFAULT_LOCALE;
}

export function localeName(code: LocaleCode): string {
  return LOCALES.find((entry) => entry.code === code)?.name ?? code;
}

export function usesSpaces(code: LocaleCode): boolean {
  return code !== "ja" && code !== "zh-Hans";
}
