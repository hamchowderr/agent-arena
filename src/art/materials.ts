export const MATERIALS = {
  "1": "#f4e04a",
  "2": "#62d24e",
  "3": "#f56a4a",
  "4": "#bc8cf0",
  "5": "#2fc6c8",
  "6": "#78a2ee",
  "7": "#f57a80",
  "8": "#9be04a",
  "9": "#e67cc0",
  "0": "#9aa6b8",
  A: "#e8e6dc",
  C: "#e6b04a",
  D: "#4a4e5e",
} as const;

export type MaterialKey = keyof typeof MATERIALS;

export function isMaterial(key: string): key is MaterialKey {
  return Object.hasOwn(MATERIALS, key);
}
