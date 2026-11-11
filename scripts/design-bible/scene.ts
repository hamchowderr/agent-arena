import { WEAPONS, type RegularKind, type WeaponId } from "../../src/sim/arena/content";
import { createArena, currentWorld, dronePosition, IDLE, maxHealth, orbitPosition, step, weaponStats, type ArenaState } from "../../src/sim/arena/sim";
import { SUB } from "../../src/sim/arena/math";
import { agentClips, enemyClips, type EnemyClips } from "../../src/art/clips";
import { DRONE, ENEMY_SHOT, GEM } from "../../src/art/arena-sprites";
import { sparkFrames } from "../../src/art/impacts";
import { weaponSprite, weaponStage } from "../../src/art/weapon-art";
import { shade, type ColorGrid } from "../../src/art/shade";
import { WORLD_LOOKS } from "../../src/art/world-looks";
import { Canvas, canvasStrip, type Strip } from "./canvas";

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 136;
const WARMUP_TICKS = 480;
const RECORD_TICKS = 150;
const EVERY = 2;
const DEATH_TICKS_PER_FRAME = 6;
const SPARK_TICKS_PER_FRAME = 2;
const PULSE_TICKS = 14;

interface Fading {
  readonly x: number;
  readonly y: number;
  readonly born: number;
  readonly frames: readonly ColorGrid[];
  readonly ticksPerFrame: number;
}

interface Ring {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly born: number;
}

const FLAME_COLORS = ["#fff1a8", "#ffcd75", "#ef7d57", "#b13e53"] as const;

function paint(sprite: readonly string[]): ColorGrid {
  return shade([sprite], WORLD_LOOKS[1].faction);
}

function keepAlive(state: ArenaState): void {
  state.player.health = maxHealth(state);
  state.xp = 0;
  state.pendingLevelUps = 0;
}

export interface AttackBoard {
  readonly weapon: WeaponId;
  readonly level: number;
  readonly strip: Strip;
  readonly fps: number;
  readonly hits: number;
  readonly kills: number;
}

export function attackBoard(weapon: WeaponId, level: number, seed = 7): AttackBoard {
  const state = createArena(seed);
  state.weapons.splice(0, state.weapons.length, { id: weapon, level, cooldown: 0, orbitHits: new Map() });
  const clipCache = new Map<RegularKind, EnemyClips>();
  const clipsOf = (kind: RegularKind) => {
    const cached = clipCache.get(kind);
    if (cached) {
      return cached;
    }
    const made = enemyClips(currentWorld(state).id, kind, WORLD_LOOKS[state.tier].faction, false);
    clipCache.set(kind, made);
    return made;
  };
  const agent = agentClips(state.tier);
  const sparks = sparkFrames();
  const shotArt = weaponSprite(weapon, WEAPONS[weapon].levels.length === 1 ? 0 : weaponStage(level));
  const shot = shotArt.length > 0 ? paint(shotArt) : [];
  const drone = paint(DRONE);
  const enemyShot = paint(ENEMY_SHOT);
  const gem = paint(GEM);
  const fading: Fading[] = [];
  const rings: Ring[] = [];
  const frames: Canvas[] = [];
  const ground = WORLD_LOOKS[state.tier].ground;
  let hits = 0;
  let kills = 0;
  for (let tick = 0; tick < WARMUP_TICKS + RECORD_TICKS; tick += 1) {
    keepAlive(state);
    step(state, IDLE);
    const recording = tick >= WARMUP_TICKS;
    for (const event of state.events) {
      if (!recording) {
        continue;
      }
      if (event.kind === "damage") {
        hits += 1;
        fading.push({ x: event.x, y: event.y, born: state.tick, frames: sparks, ticksPerFrame: SPARK_TICKS_PER_FRAME });
      } else if (event.kind === "kill" && event.enemy !== "boss") {
        kills += 1;
        fading.push({ x: event.x, y: event.y, born: state.tick, frames: clipsOf(event.enemy).death.frames, ticksPerFrame: DEATH_TICKS_PER_FRAME });
      } else if (event.kind === "pulse") {
        rings.push({ x: event.x, y: event.y, radius: event.radius, born: state.tick });
      }
    }
    if (!recording || (tick - WARMUP_TICKS) % EVERY !== 0) {
      continue;
    }
    const view = new Canvas(VIEW_WIDTH, VIEW_HEIGHT);
    const left = state.player.x / SUB - VIEW_WIDTH / 2;
    const top = state.player.y / SUB - VIEW_HEIGHT / 2;
    const sx = (x: number) => x / SUB - left;
    const sy = (y: number) => y / SUB - top;
    for (let y = 0; y < VIEW_HEIGHT; y += 1) {
      for (let x = 0; x < VIEW_WIDTH; x += 1) {
        const wx = Math.floor((x + left) / 8);
        const wy = Math.floor((y + top) / 8);
        view.set(x, y, ((wx * 7 + wy * 13) & 7) === 0 ? ground[2] : ground[0]);
      }
    }
    for (const flame of state.flames) {
      const radius = flame.radius / SUB;
      view.disc(sx(flame.x), sy(flame.y), radius, (x, y, edge) => {
        const flicker = (x * 3 + y * 5 + state.tick) % 4;
        if ((x + y) % 2 === 1 && edge > 0.55) {
          return null;
        }
        return FLAME_COLORS[Math.min(3, Math.floor(edge * 3) + (flicker === 0 ? 1 : 0))] ?? null;
      });
    }
    for (const gemAt of state.gems) {
      view.drawCentered(gem, sx(gemAt.x), sy(gemAt.y));
    }
    const bodies = [...state.enemies].sort((a, b) => a.y - b.y);
    for (const enemy of bodies) {
      if (enemy.kind === "boss") {
        continue;
      }
      const clips = clipsOf(enemy.kind);
      const walk = clips.moving[Math.floor(state.tick / 7 + enemy.id) % 4] ?? [];
      const frame = enemy.hitFlash > 0 ? (clips.moving[4] ?? walk) : walk;
      view.drawFeet(frame, sx(enemy.x), sy(enemy.y) + 4, enemy.x > state.player.x);
    }
    view.drawFeet(agent[Math.floor(state.tick / 8) % agent.length] ?? [], sx(state.player.x), sy(state.player.y) + 6);
    for (const projectile of state.projectiles) {
      if (shot.length === 0) {
        continue;
      }
      const lift = projectile.kind === "bomb" ? 4 + Math.min(projectile.life, 14) : 4;
      if (projectile.kind === "homing" || projectile.kind === "beam") {
        view.drawRotated(shot, sx(projectile.x), sy(projectile.y) - 4, Math.atan2(projectile.vy, projectile.vx));
      } else {
        view.drawCentered(shot, sx(projectile.x), sy(projectile.y) - lift);
      }
    }
    for (const owned of state.weapons) {
      const kind = WEAPONS[owned.id].kind;
      const count = weaponStats(owned.id, owned.level).count;
      for (let index = 0; index < count; index += 1) {
        if (kind === "orbit") {
          const blade = orbitPosition(state, owned, index);
          view.drawCentered(shot, sx(blade.x), sy(blade.y) - 4);
        } else if (kind === "seeker") {
          const at = dronePosition(state, index, count);
          view.drawCentered(drone, sx(at.x), sy(at.y) - 8);
        }
      }
    }
    for (const hostile of state.shots) {
      view.drawCentered(enemyShot, sx(hostile.x), sy(hostile.y) - 3);
    }
    for (const ring of rings) {
      const age = state.tick - ring.born;
      if (age >= 0 && age < PULSE_TICKS) {
        const grow = (ring.radius / SUB) * (0.35 + (0.65 * age) / PULSE_TICKS);
        view.ring(sx(ring.x), sy(ring.y), grow, "#73eff7", 1 - age / PULSE_TICKS);
        view.ring(sx(ring.x), sy(ring.y), grow - 1, "#f4f4f4", 0.6 * (1 - age / PULSE_TICKS));
      }
    }
    for (const effect of fading) {
      const index = Math.floor((state.tick - effect.born) / effect.ticksPerFrame);
      const frame = effect.frames[index];
      if (frame) {
        view.drawCentered(frame, sx(effect.x), sy(effect.y) - 4);
      }
    }
    frames.push(view);
  }
  return { weapon, level, strip: canvasStrip(frames), fps: 60 / EVERY, hits, kills };
}
