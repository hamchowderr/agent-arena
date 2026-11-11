import { ENEMIES, EVOLUTIONS, REGULAR_KINDS, WEAPONS, WORLDS, type RegularKind, type WeaponId } from "../../src/sim/arena/content";
import { TIERS, type Tier } from "../../src/sim/tiers";
import { agentClips, bossClips, enemyClips, WALK_FPS, wallClips } from "../../src/art/clips";
import { BOSS_IDLE_FPS, BOSS_IMPACT_FPS, DEATH_FPS, HURT_FPS } from "../../src/art/animate";
import { BIG_GEM, CHEST, DRONE, ENEMY_SHOT, GEM, HALLUCINATION, HAZARD } from "../../src/art/arena-sprites";
import { markFrames, sparkFrames } from "../../src/art/impacts";
import { guidePortrait, PORTRAIT_FACES } from "../../src/art/portraits";
import { WEAPON_ICONS } from "../../src/art/icons";
import { WEAPON_STAGES, weaponSprite } from "../../src/art/weapon-art";
import { shade, type ColorGrid } from "../../src/art/shade";
import { WORLD_LOOKS } from "../../src/art/world-looks";
import { ENEMY_ART_TIER, MIN_ENEMY_COLORS, MIN_GROUND_CONTRAST, TIER_SPAN } from "../../src/art/art-rules";
import { colorCount, groundContrast, hueGap, dominantHue, luminance, silhouetteOverlap, span } from "../../src/art/audit";
import { en } from "../../src/i18n/locales/en";
import { GUIDE_NOTE, TIER_NOTES, WEAPON_NOTES, WORLD_NOTES } from "./notes";
import { attackBoard } from "./scene";
import { Canvas, canvasStrip, stripOf, type Strip } from "./canvas";

export interface Clip {
  readonly label: string;
  readonly strip: Strip;
  readonly fps: number;
  readonly zoom: number;
  readonly ground: string;
}

export interface Entry {
  readonly id: string;
  readonly section: string;
  readonly group: string;
  readonly title: string;
  readonly kicker: string;
  readonly hero: Clip;
  readonly clips: readonly Clip[];
  readonly silhouette: Strip | null;
  readonly palette: readonly string[];
  readonly facts: readonly (readonly [string, string])[];
  readonly text: readonly (readonly [string, string])[];
  readonly flags: readonly string[];
  readonly questions: readonly string[];
}

export interface Section {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly image?: Clip;
}

const SILHOUETTE_INK = "#1d2230";

function silhouetteOf(grid: ColorGrid): Strip {
  return stripOf([grid.map((row) => row.map((color) => (color === null ? null : SILHOUETTE_INK)))]);
}

function paletteOf(grids: readonly ColorGrid[]): string[] {
  const colors = new Set<string>();
  for (const grid of grids) {
    for (const row of grid) {
      for (const color of row) {
        if (color !== null) {
          colors.add(color.toLowerCase());
        }
      }
    }
  }
  return [...colors].sort((a, b) => luminance(b) - luminance(a));
}

function clip(label: string, frames: readonly ColorGrid[], fps: number, zoom: number, ground: string): Clip {
  return { label, strip: stripOf(frames, 2), fps, zoom, ground };
}

function slotsOf(world: (typeof WORLDS)[number]): RegularKind[] {
  return [...new Set<RegularKind>([...world.slots, "lootRunner"])];
}

function critterEntries(): Entry[] {
  return WORLDS.flatMap((world) => {
    const look = WORLD_LOOKS[world.tier];
    const note = WORLD_NOTES[world.id];
    const kinds = slotsOf(world);
    const bodies = new Map(kinds.map((kind) => [kind, enemyClips(world.id, kind, look.faction, false)]));
    return kinds.map((kind) => {
      const clips = bodies.get(kind) ?? enemyClips(world.id, kind, look.faction, false);
      const critter = note.critters[kind];
      const still = clips.moving[0] ?? [];
      const tier = ENEMY_ART_TIER[kind];
      const range = TIER_SPAN[tier];
      const size = span(still);
      const colors = colorCount(still);
      const contrast = groundContrast(still, look.ground[0]);
      const hue = dominantHue(still);
      const neighbours = kinds
        .filter((other) => other !== kind)
        .map((other) => {
          const body = bodies.get(other)?.moving[0] ?? [];
          return { other, overlap: silhouetteOverlap(still, body), gap: hueGap(hue, dominantHue(body)) };
        });
      const closest = [...neighbours].sort((a, b) => b.overlap - a.overlap)[0];
      const nearestHue = [...neighbours].sort((a, b) => a.gap - b.gap)[0];
      const flags: string[] = [];
      if (contrast < MIN_GROUND_CONTRAST + 0.25) {
        flags.push(`Ground contrast ${contrast.toFixed(2)} is within 0.25 of the ${MIN_GROUND_CONTRAST} floor. It will melt into the grass in a crowd.`);
      }
      if (size <= range.min + 2) {
        flags.push(`Span ${size} px is at the bottom of the ${tier} range (${range.min}–${range.max}).`);
      }
      if (colors <= MIN_ENEMY_COLORS + 2) {
        flags.push(`Only ${colors} colors. Thin shading next to the toad's richer ramps.`);
      }
      if (closest && closest.overlap >= 0.65) {
        flags.push(`Silhouette overlaps ${WORLD_NOTES[world.id].critters[closest.other]?.name ?? closest.other} by ${Math.round(closest.overlap * 100)}%.`);
      }
      if (nearestHue && nearestHue.gap < 40) {
        flags.push(`Main hue is ${Math.round(nearestHue.gap)}° from ${WORLD_NOTES[world.id].critters[nearestHue.other]?.name ?? nearestHue.other}.`);
      }
      const walk = clips.moving.slice(0, 4);
      const hurt = clips.moving.slice(4, 6);
      const windup = clips.moving.slice(6, 8);
      const elite = enemyClips(world.id, kind, look.faction, true).moving.slice(0, 4);
      const behavior = ENEMIES[kind].behavior;
      return {
        id: `${world.id}-${kind}`,
        section: "critters",
        group: `World ${world.tier} · ${note.name}`,
        title: critter?.name ?? kind,
        kicker: `${kind} · ${tier} · ${behavior}`,
        hero: clip("walk", walk, WALK_FPS[kind], 5, look.ground[0]),
        clips: [
          clip("walk", walk, WALK_FPS[kind], 4, look.ground[0]),
          clip("windup", windup, 8, 4, look.ground[0]),
          clip("hurt", hurt, HURT_FPS, 4, look.ground[0]),
          clip("death", clips.death.frames, DEATH_FPS, 4, look.ground[0]),
          ...(kind === world.slots[3] ? [clip("elite", elite, WALK_FPS[kind], 2, look.ground[0])] : []),
        ],
        silhouette: silhouetteOf(still),
        palette: paletteOf(walk),
        facts: [
          ["Span", `${size} px (${tier} ${range.min}–${range.max})`],
          ["Colors", `${colors}`],
          ["Ground contrast", contrast.toFixed(2)],
          ["Main hue", `${Math.round(hue)}°`],
          ["Walk", `${walk.length}f @ ${WALK_FPS[kind]} fps`],
        ],
        text: [
          ["Trait", critter?.trait ?? "Not written yet"],
          ["Props", critter?.props ?? "Not written yet"],
          ["Motion", critter?.motion ?? "Not written yet"],
        ],
        flags,
        questions: critter?.questions ?? [],
      };
    });
  });
}

function bossEntries(): Entry[] {
  return WORLDS.map((world) => {
    const look = WORLD_LOOKS[world.tier];
    const note = WORLD_NOTES[world.id];
    const clips = bossClips(world.id, look.faction);
    const idle = clips.moving.slice(0, 4);
    const still = idle[0] ?? [];
    const contrast = groundContrast(still, look.ground[0]);
    const flags: string[] = [];
    const windupChange = silhouetteOverlap(still, clips.moving[6] ?? still);
    if (windupChange > 0.85) {
      flags.push(`The windup keeps ${Math.round(windupChange * 100)}% of the idle silhouette. The tell comes from the face and a squash, not from a new pose.`);
    }
    if (contrast < MIN_GROUND_CONTRAST + 0.2) {
      flags.push(`Ground contrast ${contrast.toFixed(2)} is close to the ${MIN_GROUND_CONTRAST} floor.`);
    }
    return {
      id: `boss-${world.id}`,
      section: "bosses",
      group: "Bosses",
      title: note.boss,
      kicker: `${note.rival} · world ${world.tier} · ${world.pattern} attack`,
      hero: clip("idle", idle, BOSS_IDLE_FPS, 3, look.ground[0]),
      clips: [
        clip("idle", idle, BOSS_IDLE_FPS, 2, look.ground[0]),
        clip("windup", clips.moving.slice(4, 7), 8, 2, look.ground[0]),
        clip("impact", clips.moving.slice(7, 10), BOSS_IMPACT_FPS, 2, look.ground[0]),
        clip("hurt", clips.moving.slice(10, 12), HURT_FPS, 2, look.ground[0]),
        clip("death", clips.death.frames, 6, 2, look.ground[0]),
      ],
      silhouette: silhouetteOf(still),
      palette: paletteOf(idle),
      facts: [
        ["Span", `${span(still)} px (boss ${TIER_SPAN.boss.min}–${TIER_SPAN.boss.max})`],
        ["Colors", `${colorCount(still)}`],
        ["Ground contrast", contrast.toFixed(2)],
        ["Health", `${world.bossHealth}`],
        ["Attack", world.pattern],
      ],
      text: [
        ["Concept", note.bossConcept],
        ["Silhouette", note.bossSilhouette],
      ],
      flags,
      questions: note.bossQuestions,
    };
  });
}

function agentEntries(): Entry[] {
  const ground = WORLD_LOOKS[1].ground[0];
  return TIERS.map(({ tier, name, stage }) => {
    const walk = agentClips(tier as Tier);
    const still = walk[0] ?? [];
    const note = TIER_NOTES[tier as Tier];
    return {
      id: `agent-${tier}`,
      section: "agent",
      group: "Your agent",
      title: name,
      kicker: `Tier ${tier} · ${stage}`,
      hero: clip("walk", walk, 8, 5, ground),
      clips: [clip("walk", walk, 8, 4, ground)],
      silhouette: silhouetteOf(still),
      palette: paletteOf(walk),
      facts: [
        ["Span", `${span(still)} px`],
        ["Colors", `${colorCount(still)}`],
        ["Ground contrast", groundContrast(still, ground).toFixed(2)],
      ],
      text: [["Concept", note.concept]],
      flags: walk.length < 4 ? ["Fewer than 4 walk frames."] : [],
      questions: note.questions,
    };
  });
}

function guideEntry(): Entry {
  const ground = "#2a2f3d";
  const faces = PORTRAIT_FACES.map((face) => guidePortrait({ face, talking: false, blink: false }));
  const talk = [guidePortrait({ face: "smile", talking: false, blink: false }), guidePortrait({ face: "smile", talking: true, blink: false }), guidePortrait({ face: "grin", talking: true, blink: false }), guidePortrait({ face: "smile", talking: false, blink: true })];
  return {
    id: "guide",
    section: "agent",
    group: "Guide",
    title: "Chowderr",
    kicker: "Guide · story speaker box · 40 px bust",
    hero: clip("talk", talk, 6, 4, ground),
    clips: [clip("faces", faces, 1, 3, ground), clip("talk and blink", talk, 6, 3, ground)],
    silhouette: silhouetteOf(faces[0] ?? []),
    palette: paletteOf(faces),
    facts: [
      ["Size", "40 × 40 px"],
      ["Faces", PORTRAIT_FACES.join(", ")],
      ["Colors", `${colorCount(faces[0] ?? [])}`],
    ],
    text: [["Concept", GUIDE_NOTE.concept]],
    flags: ["Portrait only. No arena sprite, no turnaround."],
    questions: GUIDE_NOTE.questions,
  };
}

function paint(sprite: readonly string[]): ColorGrid {
  return sprite.length === 0 ? [] : shade([sprite], WORLD_LOOKS[1].faction);
}

function weaponEntries(): Entry[] {
  const ground = WORLD_LOOKS[1].ground[0];
  const ids = Object.keys(WEAPONS) as WeaponId[];
  return ids.map((id) => {
    const definition: { readonly kind: string; readonly levels: readonly unknown[]; readonly evolved?: true } = WEAPONS[id];
    const evolved = definition.evolved === true;
    const stages = evolved ? [paint(weaponSprite(id, 0))] : WEAPON_STAGES.map((stage) => paint(weaponSprite(id, stage)));
    const icon = paint(WEAPON_ICONS[id]);
    const top = definition.levels.length;
    const board = attackBoard(id, top);
    const early = evolved ? null : attackBoard(id, 1);
    const from = EVOLUTIONS.find((evolution) => evolution.result === id);
    const into = EVOLUTIONS.find((evolution) => evolution.weapon === id);
    const note = WEAPON_NOTES[id];
    const flags: string[] = [];
    if (stages.every((grid) => grid.length === 0)) {
      flags.push("No projectile sprite. The attack is drawn only as a renderer effect.");
    }
    if (!evolved && stages.length === 3) {
      const [first, , last] = stages;
      if (first && last && silhouetteOverlap(first, last) > 0.6) {
        flags.push(`Stage 3 keeps ${Math.round(silhouetteOverlap(first, last) * 100)}% of the stage 1 shape. The upgrade reads as an outline color, not a new form.`);
      }
    }
    if (board.hits === 0) {
      flags.push("No hits in the storyboard run. Check the range against how close rivals get.");
    }
    const shown = stages.filter((grid) => grid.length > 0);
    return {
      id: `weapon-${id}`,
      section: "weapons",
      group: evolved ? "Evolutions" : "Weapons",
      title: en[`weapon.${id}.name`],
      kicker: `${definition.kind} · ${note.guide}${evolved ? " · evolved" : ""}`,
      hero: { label: `level ${top} in the sim`, strip: board.strip, fps: board.fps, zoom: 2, ground },
      clips: [
        ...(shown.length > 0 ? [clip(evolved ? "sprite" : "stages 1 · 2 · 3", shown, 1, 5, ground)] : []),
        clip("card icon", [icon], 1, 4, "#2a2f3d"),
        ...(early ? [{ label: "level 1 in the sim", strip: early.strip, fps: early.fps, zoom: 2, ground }] : []),
      ],
      silhouette: shown[0] ? silhouetteOf(shown[shown.length - 1] ?? []) : null,
      palette: paletteOf(shown.length > 0 ? shown : [icon]),
      facts: [
        ["Kind", definition.kind],
        ["Levels", `${top}`],
        ["Storyboard", `${board.hits} hits, ${board.kills} kills in 2.5 s`],
        ...(into ? ([["Evolves", `${into.result} with ${into.passive}`]] as const) : []),
        ...(from ? ([["From", `${from.weapon} + ${from.passive}`]] as const) : []),
      ],
      text: [
        ["Concept", note.concept],
        ["Guide reference", note.guide],
        ["How it reads now", note.read],
      ],
      flags,
      questions: note.questions,
    };
  });
}

function pickupEntries(): Entry[] {
  const ground = WORLD_LOOKS[1].ground[0];
  const items: readonly { readonly id: string; readonly title: string; readonly kicker: string; readonly frames: readonly ColorGrid[]; readonly fps: number; readonly zoom: number; readonly concept: string; readonly questions: readonly string[] }[] = [
    { id: "gem", title: "Token", kicker: "XP pickup", frames: [paint(GEM)], fps: 1, zoom: 6, concept: "Gold coin with a T stamp. Waits on the floor, comes when you walk near, expires after 20 s.", questions: ["No bob frames yet. The guide asks for a 4-frame bob at 5 fps.", "No medium token; only small and big."] },
    { id: "big-gem", title: "Big token", kicker: "XP pickup", frames: [paint(BIG_GEM)], fps: 1, zoom: 6, concept: "A stack of tokens dropped by elites and late waves.", questions: [] },
    { id: "chest", title: "Chest", kicker: "Elite and boss drop", frames: [paint(CHEST)], fps: 1, zoom: 5, concept: "Opens the slot-machine spin. Evolutions come only from chests.", questions: ["No open or glow frames. The chest is the biggest reward moment and has one still sprite."] },
    { id: "drone", title: "Subagent drone", kicker: "Weapon body", frames: [paint(DRONE)], fps: 1, zoom: 6, concept: "A mini agent that orbits and fires.", questions: [] },
    { id: "enemy-shot", title: "Hostile shot", kicker: "Enemy projectile", frames: [paint(ENEMY_SHOT)], fps: 1, zoom: 8, concept: "Shared by every shooter and boss.", questions: ["One shot for every world. Each shooter could throw its own prop (letters, scrolls, invoices) in the same saturated red."] },
    { id: "hallucination", title: "Hallucinated shot", kicker: "Player misfire", frames: [paint(HALLUCINATION)], fps: 1, zoom: 8, concept: "A shot that veers off target when guardrails are low.", questions: [] },
    { id: "hazard", title: "Ground hazard", kicker: "Boss trail", frames: [paint(HAZARD)], fps: 1, zoom: 4, concept: "Left behind by trail attacks.", questions: [] },
    { id: "spark", title: "Hit spark", kicker: "Effect", frames: sparkFrames(), fps: 15, zoom: 6, concept: "Star, burst, embers. Plays on every hit.", questions: ["One palette for every weapon. The guide calls for one shape in many palettes, one per damage type."] },
    { id: "marks", title: "Ground marks", kicker: "Effect", frames: markFrames(ground), fps: 2, zoom: 3, concept: "Scorch marks in four sizes, fresh and faded.", questions: [] },
  ];
  const walls = WORLDS.map((world) => ({ world, frames: wallClips(world.id, WORLD_LOOKS[world.tier].faction).slice(0, 1) }));
  const wallEntry: Entry = {
      id: "pickup-walls",
      section: "pickups",
      group: "Pickups and effects",
      title: "Wall ring",
      kicker: "World event · one per world",
      hero: clip("walls", walls.flatMap((wall) => wall.frames), 1, 4, ground),
      clips: walls.map((wall) => clip(WORLD_NOTES[wall.world.id].name, wall.frames, 1, 3, WORLD_LOOKS[wall.world.tier].ground[0])),
      silhouette: null,
      palette: paletteOf(walls.flatMap((wall) => wall.frames)),
      facts: [["Size", "30 × 24 px"]],
      text: [["Concept", "A ring of living walls closes in at 0:30. Each world paints its own wall with two eyes."]],
      flags: [],
      questions: ["Walls share one shape across all worlds. Should each world's wall be a themed object (inbox stack, toll gate, conveyor, coral)?"],
  };
  return [
    ...items.map((item): Entry => ({
      id: `pickup-${item.id}`,
      section: "pickups",
      group: "Pickups and effects",
      title: item.title,
      kicker: item.kicker,
      hero: clip(item.frames.length > 1 ? "frames" : "sprite", item.frames, item.fps, item.zoom, ground),
      clips: item.frames.length > 1 ? [clip("frames", item.frames, item.fps, Math.max(2, item.zoom - 2), ground)] : [],
      silhouette: item.frames[0] ? silhouetteOf(item.frames[0]) : null,
      palette: paletteOf(item.frames),
      facts: [
        ["Size", `${item.frames[0]?.[0]?.length ?? 0} × ${item.frames[0]?.length ?? 0} px`],
        ["Frames", `${item.frames.length}`],
      ],
      text: [["Concept", item.concept]],
      flags: [],
      questions: item.questions,
    })),
    wallEntry,
  ];
}

function doubled(grid: ColorGrid): ColorGrid {
  return grid.flatMap((row) => {
    const wide = row.flatMap((color) => [color, color]);
    return [wide, wide];
  });
}

function lineup(): Clip {
  const ground = WORLD_LOOKS[1].ground[0];
  const pieces: ColorGrid[] = [
    agentClips(1)[0] ?? [],
    agentClips(5)[0] ?? [],
    ...WORLDS.slice(0, 1).flatMap((world) =>
      REGULAR_KINDS.filter((kind) => slotsOf(world).includes(kind)).map((kind) => enemyClips(world.id, kind, WORLD_LOOKS[world.tier].faction, false).moving[0] ?? []),
    ),
    doubled(enemyClips("hustlr", "splitter", WORLD_LOOKS[1].faction, true).moving[0] ?? []),
    bossClips("hustlr", WORLD_LOOKS[1].faction).moving[0] ?? [],
  ];
  const gap = 6;
  const width = pieces.reduce((sum, grid) => sum + (grid[0]?.length ?? 0) + gap, gap);
  const height = Math.max(...pieces.map((grid) => grid.length)) + 10;
  const canvas = new Canvas(width, height);
  canvas.fill(0, 0, width, height, ground);
  canvas.fill(0, height - 4, width, 1, WORLD_LOOKS[1].ground[2]);
  let left = gap;
  for (const grid of pieces) {
    canvas.draw(grid, left, height - 4 - grid.length);
    left += (grid[0]?.length ?? 0) + gap;
  }
  return { label: "scale lineup", strip: canvasStrip([canvas]), fps: 1, zoom: 3, ground };
}

export function buildBible(): { readonly sections: readonly Section[]; readonly entries: readonly Entry[] } {
  const sections: Section[] = [
    { id: "lineup", title: "Scale lineup", intro: "Everything at in-game size on the world 1 ground, left to right: agent tier 1, agent tier 5, the six world 1 critters, an elite and the boss. This is the size the player sees; the model sheets below are zoomed.", image: lineup() },
    { id: "agent", title: "Your agent and the guide", intro: "The player's agent grows from a raw model into a harnessed agent across five tiers. Chowderr is the guide in the story speaker box." },
    { id: "bosses", title: "Bosses", intro: "One rival person per world. Each has idle, windup, impact, hurt and death clips. A tell must read from the silhouette, not only the face." },
    { id: "critters", title: "Critters", intro: "Regular enemies are critters wearing SaaS props, side-on facing right, one trait each. Flags come from the same measurements the art audit uses." },
    { id: "weapons", title: "Weapons and attacks", intro: "Each weapon's storyboard is the real sim: the weapon at its top level fires at the run's first rivals for 2.5 seconds, drawn top-down with the real sprites. It is not the 3D renderer, so glows, tilt and screen shake are missing." },
    { id: "pickups", title: "Pickups and effects", intro: "Tokens, chests, shots, sparks, marks and walls." },
  ];
  return { sections, entries: [...agentEntries(), guideEntry(), ...bossEntries(), ...critterEntries(), ...weaponEntries(), ...pickupEntries()] };
}
