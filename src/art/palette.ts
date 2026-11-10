export const PALETTE = {
  k: "#1a1c2c",
  p: "#5d275d",
  r: "#b13e53",
  o: "#ef7d57",
  y: "#ffcd75",
  l: "#a7f070",
  g: "#38b764",
  G: "#257179",
  b: "#29366f",
  B: "#3b5dc9",
  c: "#41a6f6",
  m: "#73eff7",
  w: "#f4f4f4",
  s: "#94b0c2",
  S: "#566c86",
  d: "#333c57",
} as const;

export type PaletteKey = keyof typeof PALETTE;

export const TRANSPARENT = ".";
