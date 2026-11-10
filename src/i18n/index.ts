import { en, type MessageKey, type Messages } from "./locales/en";
import { DEFAULT_LOCALE, type LocaleCode } from "./locales";

export type { MessageKey, Messages } from "./locales/en";
export * from "./locales";

export type Params = Readonly<Record<string, string | number>>;

export const LOADERS: Readonly<Record<LocaleCode, () => Promise<Messages>>> = {
  en: () => Promise.resolve(en),
  es: () => import("./locales/es").then((module) => module.es),
  pt: () => import("./locales/pt").then((module) => module.pt),
  fr: () => import("./locales/fr").then((module) => module.fr),
  de: () => import("./locales/de").then((module) => module.de),
  ja: () => import("./locales/ja").then((module) => module.ja),
  ko: () => import("./locales/ko").then((module) => module.ko),
  "zh-Hans": () => import("./locales/zh-Hans").then((module) => module.zhHans),
};

let activeCode: LocaleCode = DEFAULT_LOCALE;
let active: Messages = en;
let pending: LocaleCode | null = null;

export function format(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

export function t(key: MessageKey, params?: Params): string {
  return format(active[key], params);
}

export function currentLocale(): LocaleCode {
  return activeCode;
}

export async function setLocale(code: LocaleCode): Promise<LocaleCode> {
  pending = code;
  const messages = await LOADERS[code]();
  if (pending === code) {
    active = messages;
    activeCode = code;
    pending = null;
  }
  return activeCode;
}
