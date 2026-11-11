import { describe, expect, it } from "vitest";
import { EVOLUTIONS, isEvolvedWeapon, MERGES, WEAPONS, type WeaponId } from "../sim/arena/content";
import { BEAM, BIG_GEM, GEM } from "./arena-sprites";
import { MAX_SPRITE_COLORS, MIN_GROUND_CONTRAST } from "./art-rules";
import { colorCount, dominantHue, groundContrast, hueGap, hueOf, span } from "./audit";
import { SPARK_BY_WEAPON, SPARK_COLORS } from "./impacts";
import { shade } from "./shade";
import { SHOT_FRAMES, shotFrames, WEAPON_STAGES, weaponSprite, type WeaponStage } from "./weapon-art";
import { WORLD_LOOKS } from "./world-looks";

const TOKENS = { GEM, BIG_GEM } as const;
const GOLD_HUE = 40;
const MAX_HUE_GAP_FROM_SPARK = 35;
const GROUNDS = Object.values(WORLD_LOOKS).map((look) => look.ground[0]);
const ALL_WEAPONS = Object.keys(WEAPONS) as WeaponId[];
const stagesOf = (weapon: WeaponId): readonly WeaponStage[] => (isEvolvedWeapon(weapon) ? [0] : WEAPON_STAGES);
const SHOTS = ALL_WEAPONS.flatMap((weapon) => stagesOf(weapon).map((stage) => [`${weapon} stage ${stage}`, weapon, stage] as const));
const paint = (sprite: readonly string[]) => shade([sprite], "#000000");
const measure = (sprite: readonly string[]) => span(paint(sprite));
const top = (weapon: WeaponId) => weaponSprite(weapon, isEvolvedWeapon(weapon) ? 0 : 2);

describe("weapon shot art", () => {
  it.each(SHOTS)("%s has animated frames of one size", (_, weapon, stage) => {
    const frames = shotFrames(weapon, stage);
    expect(frames).toHaveLength(SHOT_FRAMES);
    expect(new Set(frames.map((frame) => `${frame.length}x${frame[0]?.length ?? 0}`)).size).toBe(1);
    expect(new Set(frames.map((frame) => frame.join("/"))).size).toBe(SHOT_FRAMES);
  });

  it.each(SHOTS)("%s reads in a crowd and stands out on every world's ground", (_, weapon, stage) => {
    for (const frame of shotFrames(weapon, stage)) {
      expect(measure(frame)).toBeGreaterThanOrEqual(9);
      expect(colorCount(paint(frame))).toBeLessThanOrEqual(MAX_SPRITE_COLORS);
      for (const ground of GROUNDS) {
        expect(groundContrast(paint(frame), ground)).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
      }
    }
  });

  it.each(SHOTS)("%s is drawn in the colors of its hit spark", (_, weapon, stage) => {
    const spark = SPARK_COLORS[SPARK_BY_WEAPON[WEAPONS[weapon].kind]];
    expect(hueGap(dominantHue(paint(weaponSprite(weapon, stage))), hueOf(spark[2]))).toBeLessThan(MAX_HUE_GAP_FROM_SPARK);
  });

  it("gives every weapon and evolution its own drawing", () => {
    const drawings = ALL_WEAPONS.map((weapon) => top(weapon).join("/"));
    expect(new Set(drawings).size).toBe(ALL_WEAPONS.length);
  });

  it.each(ALL_WEAPONS.filter((weapon) => !isEvolvedWeapon(weapon)))("%s looks bigger at each level stage", (weapon) => {
    const sizes = WEAPON_STAGES.map((stage) => measure(weaponSprite(weapon, stage)));
    expect(sizes[1]).toBeGreaterThan(sizes[0] ?? 0);
    expect(sizes[2]).toBeGreaterThan(sizes[1] ?? 0);
  });

  it.each([...EVOLUTIONS.map((evolution) => [evolution.weapon, evolution.result] as const), ...MERGES.flatMap((merge) => merge.weapons.map((weapon) => [weapon, merge.result] as const))])(
    "%s grows into %s",
    (base, evolved) => {
      expect(measure(top(evolved))).toBeGreaterThan(measure(top(base)));
    },
  );

  it("draws web search as homing darts, shorter than the old beam and longer once evolved", () => {
    const dart = measure(weaponSprite("webSearch", 0));
    expect(dart).toBeGreaterThanOrEqual(16);
    expect(dart).toBeLessThan(measure(BEAM));
    expect(measure(weaponSprite("ragSearch", 0))).toBeGreaterThan(measure(weaponSprite("webSearch", 2)));
  });
});

describe("token art", () => {
  it("sizes XP tokens like pickups, with the big token larger", () => {
    expect(measure(GEM)).toBe(9);
    expect(measure(BIG_GEM)).toBeGreaterThan(9);
  });

  it.each(Object.entries(TOKENS))("%s reads as a gold token and stands out on every ground", (_, sprite) => {
    expect(hueGap(dominantHue(paint(sprite)), GOLD_HUE)).toBeLessThan(15);
    for (const ground of GROUNDS) {
      expect(groundContrast(paint(sprite), ground)).toBeGreaterThanOrEqual(MIN_GROUND_CONTRAST);
    }
  });
});
