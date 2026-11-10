---
name: pixel-art
description: Agent Arena's art style guide. Use it before you draw or change any sprite, enemy, boss, effect, attack, pickup, icon or card art in src/art or src/render.
---

# Agent Arena pixel art guide

The numbers come from measuring tibo.dog's shipped sprite atlases (41 enemies, 13 bosses, every effect). The full teardown is in the project files at `agent-arena/art/tibo-dog-art-teardown.md`. Learn from her structure and numbers, but never copy her art.

Rules marked **[checked]** are enforced by `src/art/audit.test.ts`, using the limits in `src/art/art-rules.ts`. A sprite that breaks a rule must be listed in that test's `REDRAW_PENDING`. The test fails when a listed sprite starts passing, so the list can only shrink.

## 1. Enemies

- **Each world has its own enemy set** in `src/art/world-enemies.ts` (`enemySprite(world, kind)`), drawn from the tables in `enemy-roster.md`. World 1 uses the office set in `arena-sprites.ts`. `world-enemies.test.ts` fails if a world reuses an office sprite for one of its slots.
- **Enemies are critters wearing SaaS props** (Chowderr's choice, 2026-11-10). Each one has one trait, and its body, face, prop and motion follow from it (Spam Roach with an envelope shell, Cold Email Crow in a tie, Thought Leader Toad on a red stage dot). Draw them side-on facing right, with rounded forms. Use the hand-picked ramps, `light()`, `tinted()` and `eye()` from `src/art/form.ts`, and hand-pose four frames as a `Pose` in `src/art/cast.ts`. A posed world registers in `POSES` in `world-enemies.ts`. World 1 is done; worlds 2 to 5 still use the generated object set until they are redrawn.
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
- **Elites:** the same enemy at twice the size, with a thick gold outline and a crown (`eliteSprite()` adds both). Draw it at that size rather than scaling it.

## 2. Bosses

- 3 to 5 times the size of fodder. A boss is the world's mascot: a recognizable object with a face. Each world has its own boss in `src/art/bosses.ts` (rocket, binder, meter, clipboard, light bulb), drawn at native size with the shape helpers in `src/art/raster.ts` (rect, ellipse, ring, line, polygon), then outlined.
- A boss drawing takes a `BossLook` (`flicker` for little moving parts like a flame or needle, `angry` for the attack face). `bossClips()` in `src/art/clips.ts` turns it into idle (4 frames, breathing squash), windup (3, crouch, angry), impact (3, stretch up), hurt (2) and a death puff. The renderer plays windup during the 0.8 s before an attack and impact right after it.
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
| pickup bob | 4 | 5 | Pickups are 8–9 px. XP tokens are gold coins with a T stamp [checked] |

Regular enemies and elites get their walk, hurt and death clips from `src/art/animate.ts`, built from the one sprite you draw, so you don't draw frames by hand:

- **walk:** the bottom rows that are much narrower than the body count as legs. With two or more legs the feet swing in opposite directions on frames 1 and 3 and the body lifts 1 px on frames 2 and 4. Without legs the body just bobs. Draw legs as separate narrow columns under the body if you want a stride. Speed per enemy is `WALK_FPS` in `src/art/clips.ts`.
- **hurt:** the walk frame mixed toward `HURT_TINT` (pale cool blue), strong then weaker. The renderer shows it for `HIT_FLASH_TICKS`.
- **death:** a squash flash, then the body breaks into 2 or 3 px chunks of its own colors that fly out and fall, inside a puff cloud of its lightest color that thins out by ordered dither.
- Enemies face the player. Draw every enemy facing right; the renderer mirrors it.
- `npm run art-sheet` also writes `art-sheet/animations.png`: every enemy's walk, hurt and death frames in a row. `src/art/animate.test.ts` checks the frame counts and that each clip moves, lightens or breaks apart.

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
