import { AdditiveBlending, CanvasTexture, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, RingGeometry, SRGBColorSpace, type Object3D } from "three";
import { PALETTE, type PaletteKey } from "../art/palette";
import { BOLT_PROFILES, RAY_PROFILES, type BoltLook, type RayLook } from "../art/tool-art";
import type { WeaponId } from "../sim/arena/content";
import { SUB } from "../sim/arena/math";
import type { ArenaState } from "../sim/arena/sim";
import { RAY_TICKS, rayEnd } from "../sim/arena/tools";

const MAX_RAYS = 16;
const MAX_BOLT_SEGMENTS = 160;
const MAX_MINES = 40;
const BOLT_LIFE = 16;
const BOLT_JAGS = 6;
const BOLT_REJAG_EVERY = 3;
const RAY_LIFT = 6;
const BOLT_LIFT = 7;
const MINE_HOT_TICKS = 24;
const RAY_OPEN_TICKS = 4;
const RAY_CLOSE_TICKS = 8;

export function mineIsHot(fuse: number): boolean {
  return fuse <= MINE_HOT_TICKS && Math.floor(fuse / (fuse < 10 ? 2 : 4)) % 2 === 0;
}

export interface Hop {
  readonly weapon: WeaponId;
  readonly x: number;
  readonly z: number;
}

interface Bolt {
  readonly weapon: WeaponId;
  readonly look: BoltLook;
  readonly points: readonly number[];
  age: number;
  jags: number[];
}

function bandTexture(keys: readonly string[]): CanvasTexture {
  const height = keys.length + 2;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    keys.forEach((key, index) => {
      context.fillStyle = PALETTE[key as PaletteKey] ?? PALETTE.w;
      context.fillRect(0, index + 1, 4, 1);
    });
    context.fillStyle = PALETTE[(keys[0] ?? "w") as PaletteKey] ?? PALETTE.w;
    for (let x = 0; x < 4; x += 2) {
      context.fillRect(x, 0, 1, 1);
      context.fillRect(x + 1, height - 1, 1, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function flatPlane(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function band(map: CanvasTexture): MeshBasicMaterial {
  return new MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, depthWrite: false, depthTest: false, toneMapped: false });
}

function rayLook(weapon: WeaponId): RayLook {
  return weapon === "mapReduce" ? "mapReduce" : "fileReader";
}

function boltLook(weapon: WeaponId): BoltLook {
  return weapon === "mcpServer" ? "mcpServer" : "apiCall";
}

export class ToolFx {
  private readonly rays: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private readonly rayGlows: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private readonly segments: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private readonly marks: Mesh<RingGeometry, MeshBasicMaterial>[] = [];
  private readonly rayMaterials: Readonly<Record<RayLook, MeshBasicMaterial>>;
  private readonly rayGlowMaterials: Readonly<Record<RayLook, MeshBasicMaterial>>;
  private readonly boltMaterials: Readonly<Record<BoltLook, MeshBasicMaterial>>;
  private readonly bolts: Bolt[] = [];

  constructor(scene: Object3D) {
    this.rayMaterials = { fileReader: band(bandTexture(RAY_PROFILES.fileReader)), mapReduce: band(bandTexture(RAY_PROFILES.mapReduce)) };
    this.rayGlowMaterials = {
      fileReader: new MeshBasicMaterial({ color: PALETTE.r, transparent: true, opacity: 0.12, depthWrite: false, depthTest: false, blending: AdditiveBlending, toneMapped: false }),
      mapReduce: new MeshBasicMaterial({ color: PALETTE.y, transparent: true, opacity: 0.12, depthWrite: false, depthTest: false, blending: AdditiveBlending, toneMapped: false }),
    };
    this.boltMaterials = { apiCall: band(bandTexture(BOLT_PROFILES.apiCall)), mcpServer: band(bandTexture(BOLT_PROFILES.mcpServer)) };
    const plane = flatPlane();
    for (let index = 0; index < MAX_RAYS; index += 1) {
      const glow = new Mesh(plane, this.rayGlowMaterials.fileReader);
      glow.renderOrder = 10;
      glow.visible = false;
      scene.add(glow);
      this.rayGlows.push(glow);
      const ray = new Mesh(plane, this.rayMaterials.fileReader);
      ray.renderOrder = 11;
      ray.visible = false;
      scene.add(ray);
      this.rays.push(ray);
    }
    for (let index = 0; index < MAX_BOLT_SEGMENTS; index += 1) {
      const segment = new Mesh(plane, this.boltMaterials.apiCall);
      segment.renderOrder = 11;
      segment.visible = false;
      scene.add(segment);
      this.segments.push(segment);
    }
    const ring = new RingGeometry(0.9, 1, 40);
    ring.rotateX(-Math.PI / 2);
    for (let index = 0; index < MAX_MINES; index += 1) {
      const mark = new Mesh(ring, new MeshBasicMaterial({ color: PALETTE.y, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      mark.position.y = 0.3;
      mark.visible = false;
      scene.add(mark);
      this.marks.push(mark);
    }
  }

  chain(weapon: WeaponId, points: readonly number[]): void {
    if (this.bolts.length > 24) {
      this.bolts.shift();
    }
    this.bolts.push({ weapon, look: boltLook(weapon), points, age: 0, jags: [] });
  }

  hops(): Hop[] {
    return this.bolts.flatMap((bolt) => {
      const hops: Hop[] = [];
      for (let index = 2; index + 1 < bolt.points.length; index += 2) {
        hops.push({ weapon: bolt.weapon, x: (bolt.points[index] ?? 0) / SUB, z: (bolt.points[index + 1] ?? 0) / SUB });
      }
      return hops;
    });
  }

  sync(state: ArenaState): void {
    this.syncRays(state);
    this.syncBolts();
    this.syncMines(state);
  }

  private syncRays(state: ArenaState): void {
    const originX = state.player.x / SUB;
    const originZ = state.player.y / SUB;
    this.rays.forEach((mesh, index) => {
      const glow = this.rayGlows[index];
      const ray = state.rays[index];
      if (!ray || !glow) {
        mesh.visible = false;
        if (glow) {
          glow.visible = false;
        }
        return;
      }
      const age = RAY_TICKS - ray.life;
      const open = Math.min(1, (age + 1) / RAY_OPEN_TICKS);
      const close = Math.min(1, ray.life / RAY_CLOSE_TICKS);
      const flicker = (state.tick + index) % 4 < 2 ? 1 : 0.8;
      const end = rayEnd(state, ray);
      const endX = end.x / SUB;
      const endZ = end.y / SUB;
      const length = Math.hypot(endX - originX, endZ - originZ) * open;
      const angle = Math.atan2(endZ - originZ, endX - originX);
      const width = (ray.width / SUB + 3) * close * flicker;
      const look = rayLook(ray.weapon);
      mesh.visible = !ray.hallucinated || state.tick % 2 === 0;
      mesh.material = this.rayMaterials[look];
      mesh.position.set(originX + (Math.cos(angle) * length) / 2, RAY_LIFT, originZ + (Math.sin(angle) * length) / 2);
      mesh.rotation.set(0, -angle, 0);
      mesh.scale.set(Math.max(0.01, length), 1, Math.max(0.01, width));
      glow.visible = mesh.visible;
      glow.material = this.rayGlowMaterials[look];
      glow.position.set(mesh.position.x, 0.5, mesh.position.z);
      glow.rotation.set(0, -angle, 0);
      glow.scale.set(Math.max(0.01, length), 1, Math.max(0.01, width * 2));
    });
  }

  private syncBolts(): void {
    let used = 0;
    for (let index = this.bolts.length - 1; index >= 0; index -= 1) {
      const bolt = this.bolts[index];
      if (!bolt) {
        continue;
      }
      bolt.age += 1;
      if (bolt.age > BOLT_LIFE) {
        this.bolts.splice(index, 1);
        continue;
      }
      if (bolt.age % BOLT_REJAG_EVERY === 1 || bolt.jags.length === 0) {
        bolt.jags = Array.from({ length: (bolt.points.length / 2) * BOLT_JAGS }, () => Math.random() - 0.5);
      }
      const fade = 1 - bolt.age / BOLT_LIFE;
      const thickness = (bolt.look === "mcpServer" ? 6 : 5) * (0.5 + fade * 0.5);
      for (let link = 0; link + 3 < bolt.points.length; link += 2) {
        const fromX = (bolt.points[link] ?? 0) / SUB;
        const fromZ = (bolt.points[link + 1] ?? 0) / SUB;
        const toX = (bolt.points[link + 2] ?? 0) / SUB;
        const toZ = (bolt.points[link + 3] ?? 0) / SUB;
        const dx = toX - fromX;
        const dz = toZ - fromZ;
        const span = Math.hypot(dx, dz) || 1;
        const normalX = -dz / span;
        const normalZ = dx / span;
        let lastX = fromX;
        let lastZ = fromZ;
        for (let jag = 1; jag <= BOLT_JAGS; jag += 1) {
          const along = jag / BOLT_JAGS;
          const offset = jag === BOLT_JAGS ? 0 : (bolt.jags[(link / 2) * BOLT_JAGS + jag] ?? 0) * Math.max(8, span * 0.3);
          const x = fromX + dx * along + normalX * offset;
          const z = fromZ + dz * along + normalZ * offset;
          const segment = this.segments[used];
          if (segment) {
            used += 1;
            const length = Math.hypot(x - lastX, z - lastZ);
            const angle = Math.atan2(z - lastZ, x - lastX);
            segment.visible = true;
            segment.material = this.boltMaterials[bolt.look];
            segment.position.set((x + lastX) / 2, BOLT_LIFT, (z + lastZ) / 2);
            segment.rotation.set(0, -angle, 0);
            segment.scale.set(length + 1, 1, thickness);
          }
          lastX = x;
          lastZ = z;
        }
      }
    }
    for (let index = used; index < this.segments.length; index += 1) {
      const segment = this.segments[index];
      if (segment) {
        segment.visible = false;
      }
    }
  }

  private syncMines(state: ArenaState): void {
    this.marks.forEach((mark, index) => {
      const mine = state.mines[index];
      if (!mine) {
        mark.visible = false;
        return;
      }
      const hot = mineIsHot(mine.fuse);
      const warning = Math.max(0, 1 - mine.fuse / (MINE_HOT_TICKS * 2));
      mark.visible = warning > 0;
      mark.position.x = mine.x / SUB;
      mark.position.z = mine.y / SUB;
      mark.scale.setScalar(mine.radius / SUB);
      mark.material.color.set(hot ? PALETTE.r : PALETTE.y);
      mark.material.opacity = 0.25 + warning * 0.55;
    });
  }
}
