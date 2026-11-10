---
name: pixel-art
description: Agent Arena's art style guide. Use it before you draw or change any sprite, enemy, boss, effect, attack, pickup, icon or card art in src/art or src/render.
---

# Agent Arena pixel art guide

The numbers come from measuring tibo.dog's shipped sprite atlases (41 enemies, 13 bosses, every effect). The full teardown is in the project files at `agent-arena/art/tibo-dog-art-teardown.md`. Learn from her structure and numbers, but never copy her art.

Rules marked **[checked]** are enforced by `src/art/audit.test.ts`, using the limits in `src/art/art-rules.ts`. A sprite that breaks a rule must be listed in that test's `REDRAW_PENDING`. The test fails when a listed sprite starts passing, so the list can only shrink.

## 1. Enemies

- **Make each enemy a recognizable thing from its world's theme.** Pick a SaaS or office object that a player can name at a glance: an invoice, a usage meter, a chat bubble, a sticky note, a loading spinner, a paywall. Don't draw a generic robot with a different hat.
- **Give each enemy its own palette. [checked: hue spread]** Within a world, no two enemies may share a main hue (they must be at least 30° apart). The world's accent color belongs in the ground, props, effects and boss, never as a tint over every enemy.
- **Size by tier. [checked: span]** Measure the longer side of the drawn area, at the size it is shown:

  | Tier | Span in px | Kinds |
  |---|---|---|
  | fodder | 12–20 | grunt, runner |
  | mid | 18–28 | charger, shooter, exploder, splitter, loot runner |
  | heavy | 26–40 | brute, heavy |
  | boss | 56–96 | boss |

- **Use 10 to 24 colors per sprite. [checked: colors]** Give at least two materials a light, base and shadow step each. Shading adds three steps to every body color.
- **Silhouette first. [checked: silhouettes]** No two enemies in a world may overlap by more than 80% when their masks are lined up bottom-center. Fill the sprite with black: if you can't tell what it is, redraw it.
- **Pop off the ground. [checked: contrast]** The body's average brightness must have a contrast of at least 1.6 against every world's base ground tile.
- **Side view, light from the top.** Most enemies are wider than they are tall and face the way they move. Light falls from the top-left, so tops get the light step and the bottom and right edges get the shadow step (`shade()` in `src/art/shade.ts` does this for you).
- **Dark tinted outlines, never flat black everywhere.** `shade()` turns the outer `k` pixels into the ramp's dark line color. Keep pure black for eyes and small accents.
- **Elites:** the same enemy at twice the size, with a thick gold outline and a crown or similar mark. Draw it at that size rather than scaling it.

## 2. Bosses

- 3 to 5 times the size of fodder. A boss is the world's mascot: a recognizable object with a face.
- Every attack has its own windup pose, impact pose and effect.
- Each attack shows a ground mark that is the exact shape and size of what it will hit (a lane, a ring, a cone).

## 3. Animation (frames at fps)

| Clip | Frames | fps | Notes |
|---|---|---|---|
| walk | 4 | 8–10 | 5–6 for slow blobs, 12 for flies |
| hurt | 2 | 10 | Shift the whole sprite to a lighter, cooler palette, not pure white |
| death | 5 | 10 | A puff of the enemy's own material (paper, smoke, sparks). Don't just vanish |
| attack | 3 | 8–10 | Only for enemies that attack |
| boss idle | 4 | 4 | |
| boss windup | 3–4 | 8 | Add a 2-frame windup effect |
| boss impact | 3 | 10 | Add a 3-frame impact effect |
| boss death | 3 | 6 | |
| pickup bob | 4 | 5 | Pickups are 8–9 px |

## 4. Attacks and effects

- **Tells last at least 0.8 s. [checked]** Use 0.8–1.0 s for normal attacks and up to 1.2 s for big ones. Lock the aim when the tell starts, so a player who moves during the tell dodges (`roster.test.ts` checks this for the charger).
- **Every effect is a frame sequence:** anticipation, then impact, then recovery.
  - A hit spark is 6 frames at 30 fps (0.2 s): a star, then a burst, then scattered pixels.
  - An explosion is 6 frames at 20 fps: a white-hot star, a filled cloud, then a dithered dissolve.
- **One shape, many palettes.** Draw an effect once and recolor it for each damage element. Crits get their own, bigger spark.
- **Draw at the shown size. [checked: native scale]** Never stretch pixel art. If an effect grows, pre-draw it at each radius it is shown at. Elites and the boss are still scaled ×2 and are listed for a redraw.
- **Screen shake** uses trauma: at most 6 px of offset, decaying 1.5 per second, with each hit adding a share. Keep hit-stop for rare big moments (0–3 frames).
- **Readability in a crowd.** Hostile shots must be the most saturated thing on screen and must never use a ground or enemy-body hue. The player's own effects stay lighter and more transparent than hostile ones.

## 5. How to work

1. Read this guide and the teardown before you draw.
2. Sketch the silhouette in one color, then add materials, then shading.
3. Run `npx vitest run src/art`. If a sprite you redrew now passes, take it off the pending list.
4. Run `npm run art-sheet` and look at `art-sheet/enemies.png`: every enemy on every world's ground at 4×. Post it with in-game screenshots whenever you show art to Chowderr.
5. Show the before and after side by side in the PR.
