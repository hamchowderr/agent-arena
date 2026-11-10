import { describe, expect, it } from "vitest";
import { WORLDS, type EnemyKind, type World, type WorldId } from "../sim/arena/content";
import { seconds } from "../sim/arena/math";
import { CHARGE_WINDUP, FUSE_TICKS, TELEGRAPH_TICKS } from "../sim/arena/sim";
import { ENEMY_SPRITES } from "./arena-sprites";
import { bossSprite } from "./bosses";
import {
  ENEMY_ART_TIER,
  MAX_SILHOUETTE_OVERLAP,
  MAX_SPRITE_COLORS,
  MIN_ENEMY_COLORS,
  MIN_GROUND_CONTRAST,
  MIN_HUE_GAP_IN_WORLD,
  MIN_TELEGRAPH_SECONDS,
  RENDER_SCALE,
  TIER_SPAN,
} from "./art-rules";
import { colorCount, contrastRatio, dominantHue, groundContrast, hueGap, silhouetteOverlap, span } from "./audit";
import { shade, type ColorGrid } from "./shade";
import { WORLD_LOOKS, type WorldLook } from "./world-looks";

type EnemyCheck = "span" | "colors" | "contrast";

const REDRAW_PENDING: Readonly<Partial<Record<EnemyKind, readonly EnemyCheck[]>>> = {};

const HUES_PENDING: readonly WorldId[] = [];

const NATIVE_SCALE_PENDING: readonly (keyof typeof RENDER_SCALE)[] = ["elite"];

function worldKinds(slots: readonly EnemyKind[]): EnemyKind[] {
  return [...new Set<EnemyKind>([...slots, "lootRunner"])];
}

function look(tier: number) {
  const found = Object.entries(WORLD_LOOKS).find(([key]) => Number(key) === tier)?.[1];
  if (!found) {
    throw new Error(`no look for tier ${tier}`);
  }
  return found;
}

function art(kind: EnemyKind, scene: WorldLook, world: World): ColorGrid {
  return kind === "boss" ? shade([bossSprite(world.id)], scene.faction) : shade([ENEMY_SPRITES[kind]], scene.faction);
}

function shownSpan(kind: EnemyKind, grid: ColorGrid): number {
  return span(grid) * (kind === "boss" ? RENDER_SCALE.boss : RENDER_SCALE.regular);
}

function passes(kind: EnemyKind, check: EnemyCheck): boolean {
  const worlds = WORLDS.filter((world) => kind === "boss" || worldKinds(world.slots).includes(kind));
  return worlds.every((world) => {
    const scene = look(world.tier);
    const grid = art(kind, scene, world);
    switch (check) {
      case "span": {
        const range = TIER_SPAN[ENEMY_ART_TIER[kind]];
        const size = shownSpan(kind, grid);
        return size >= range.min && size <= range.max;
      }
      case "colors": {
        const count = colorCount(grid);
        return count >= MIN_ENEMY_COLORS && count <= MAX_SPRITE_COLORS;
      }
      case "contrast":
        return groundContrast(grid, scene.ground[0]) >= MIN_GROUND_CONTRAST;
    }
  });
}

const KINDS = Object.keys(ENEMY_ART_TIER) as EnemyKind[];
const CHECKS: readonly EnemyCheck[] = ["span", "colors", "contrast"];
const CASES = KINDS.flatMap((kind) => CHECKS.map((check) => [kind, check] as const));

describe("enemy art rules", () => {
  it.each(CASES)("%s meets the %s rule, or is listed for a redraw", (kind, check) => {
    const pending = REDRAW_PENDING[kind]?.includes(check) ?? false;
    expect(passes(kind, check), pending ? "now passes: remove it from REDRAW_PENDING" : "breaks the art rule").toBe(!pending);
  });

  it.each(WORLDS.map((world) => [world.id, world] as const))("%s keeps every enemy's main hue apart, or is listed for a redraw", (id, world) => {
    const scene = look(world.tier);
    const hues = worldKinds(world.slots).map((kind) => dominantHue(art(kind, scene, world)));
    const apart = hues.every((hue, index) => hues.slice(index + 1).every((other) => hueGap(hue, other) >= MIN_HUE_GAP_IN_WORLD));
    expect(apart).toBe(!HUES_PENDING.includes(id));
  });

  it.each(WORLDS.map((world) => [world.id, world] as const))("%s gives every enemy its own silhouette", (_, world) => {
    const scene = look(world.tier);
    const grids = worldKinds(world.slots).map((kind) => [kind, art(kind, scene, world)] as const);
    for (const [index, [kind, grid]] of grids.entries()) {
      for (const [other, otherGrid] of grids.slice(index + 1)) {
        expect(silhouetteOverlap(grid, otherGrid), `${kind} and ${other} look alike`).toBeLessThan(MAX_SILHOUETTE_OVERLAP);
      }
    }
  });

  it("draws pixel art at its shown size instead of scaling it, or lists it for a redraw", () => {
    for (const [use, scale] of Object.entries(RENDER_SCALE) as [keyof typeof RENDER_SCALE, number][]) {
      expect(scale === 1).toBe(!NATIVE_SCALE_PENDING.includes(use));
    }
  });
});

describe("attack tells", () => {
  it("gives every charge, shot and fuse a tell of at least the minimum", () => {
    expect(TELEGRAPH_TICKS).toBeGreaterThanOrEqual(seconds(MIN_TELEGRAPH_SECONDS));
    expect(FUSE_TICKS).toBeGreaterThanOrEqual(seconds(MIN_TELEGRAPH_SECONDS));
    expect(CHARGE_WINDUP).toBeGreaterThanOrEqual(seconds(MIN_TELEGRAPH_SECONDS));
  });
});

describe("audit helpers", () => {
  it("measures contrast like WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("wraps hue gaps around the color wheel", () => {
    expect(hueGap(350, 10)).toBe(20);
    expect(hueGap(0, 180)).toBe(180);
  });

  it("finds identical silhouettes and tells different ones apart", () => {
    const square: ColorGrid = [
      ["#ff0000", "#ff0000"],
      ["#ff0000", "#ff0000"],
    ];
    const bar: ColorGrid = [
      [null, null],
      ["#00ff00", "#00ff00"],
    ];
    expect(silhouetteOverlap(square, square)).toBe(1);
    expect(silhouetteOverlap(square, bar)).toBeCloseTo(0.5, 5);
  });

  it("counts colors and measures the larger side of the drawn area", () => {
    const grid: ColorGrid = [
      [null, "#111111", null],
      [null, "#222222", null],
      [null, "#111111", null],
    ];
    expect(colorCount(grid)).toBe(2);
    expect(span(grid)).toBe(3);
  });
});
