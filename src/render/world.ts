import {
  AdditiveBlending,
  Color,
  Fog,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  CircleGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type Texture,
} from "three";
import {
  BEAM,
  BIG_GEM,
  BOLT,
  BOSS,
  BRUTE,
  CODE_BLOCK,
  GEM,
  GRUNT,
  HALLUCINATION,
  PROPS,
  RUNNER,
  SEEKER,
} from "../art/arena-sprites";
import { PALETTE } from "../art/palette";
import { agentSprite, type Sprite } from "../art/sprites";
import { WEAPONS, type EnemyKind } from "../sim/arena/content";
import { SUB } from "../sim/arena/math";
import { orbitPosition, weaponStats, type ArenaState } from "../sim/arena/sim";
import { mixSeed } from "../sim/rng";
import type { Tier } from "../sim/tiers";
import { circleTexture, glowTexture, groundTexture, GROUND_TILE, pixelTexture, spriteImage } from "./textures";

export const RENDER_WIDTH = 480;
export const RENDER_HEIGHT = 270;
const PITCH = (48 * Math.PI) / 180;
const CAMERA_DISTANCE = 380;
const CHUNK = 192;
const PROPS_PER_CHUNK = 26;
const FLASH_COLOR = new Color(4, 4, 4);
const PLAIN_COLOR = new Color(1, 1, 1);

export interface WorldLook {
  readonly ground: readonly [string, string, string, string];
  readonly fog: string;
  readonly faction: string;
}

export const WORLD_LOOKS: Readonly<Record<Tier, WorldLook>> = {
  1: { ground: ["#3f7a3a", "#4a8a40", "#356b33", "#6aa84a"], fog: "#1b2a2a", faction: PALETTE.r },
  2: { ground: ["#5a7a3a", "#6b8a44", "#4d6a32", "#9ab25a"], fog: "#2a2a1b", faction: PALETTE.p },
  3: { ground: ["#3a6a6a", "#447a78", "#325a5c", "#6aa8a0"], fog: "#14222a", faction: PALETTE.o },
  4: { ground: ["#5a4a6a", "#6a5a7a", "#4a3a5a", "#8a7aa8"], fog: "#1a1424", faction: PALETTE.B },
  5: { ground: ["#6a5a3a", "#7a6a44", "#5a4a32", "#b29a5a"], fog: "#2a2014", faction: PALETTE.g },
};

class SpriteBatch {
  readonly mesh: InstancedMesh;
  private count = 0;
  private readonly matrix = new Matrix4();

  constructor(scene: Scene, texture: Texture, width: number, height: number, capacity: number, flat: boolean) {
    const geometry = new PlaneGeometry(width, height);
    if (flat) {
      geometry.rotateX(-Math.PI / 2);
    } else {
      geometry.translate(0, height / 2, 0);
      geometry.rotateX(-(Math.PI / 2 - PITCH) * 0.5);
    }
    const material = new MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false });
    this.mesh = new InstancedMesh(geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let index = 0; index < capacity; index += 1) {
      this.mesh.setColorAt(index, PLAIN_COLOR);
    }
    scene.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  add(x: number, y: number, z: number, flash = false, rotation: Quaternion | null = null): void {
    if (this.count >= this.mesh.instanceMatrix.count) {
      return;
    }
    if (rotation) {
      this.matrix.makeRotationFromQuaternion(rotation);
      this.matrix.setPosition(x, y, z);
    } else {
      this.matrix.makeTranslation(x, y, z);
    }
    this.mesh.setMatrixAt(this.count, this.matrix);
    this.mesh.setColorAt(this.count, flash ? FLASH_COLOR : PLAIN_COLOR);
    this.count += 1;
  }

  commit(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).map?.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}

class ShadowBatch {
  readonly mesh: InstancedMesh;
  private count = 0;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();

  constructor(scene: Scene, capacity: number) {
    const geometry = new PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial({ map: circleTexture(16, "#000000", 0.42), transparent: true, depthWrite: false, toneMapped: false });
    this.mesh = new InstancedMesh(geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  add(x: number, z: number, width: number): void {
    if (this.count >= this.mesh.instanceMatrix.count) {
      return;
    }
    this.position.set(x, 0.2, z);
    this.scale.set(width, 1, width * 0.5);
    this.matrix.compose(this.position, this.rotation, this.scale);
    this.mesh.setMatrixAt(this.count, this.matrix);
    this.count += 1;
  }

  commit(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

interface Ring {
  readonly mesh: Mesh<RingGeometry, MeshBasicMaterial>;
  age: number;
  life: number;
  radius: number;
}

const POST_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const POST_FRAGMENT = `
uniform sampler2D scene;
uniform vec2 texel;
uniform float hurt;
uniform float letterbox;
varying vec2 vUv;
void main() {
  float edge = clamp((abs(vUv.y - 0.5) - 0.24) / 0.26, 0.0, 1.0);
  float spread = edge * edge * 2.5;
  vec4 color = texture2D(scene, vUv) * 0.28;
  color += texture2D(scene, vUv + vec2(0.0, texel.y * spread)) * 0.18;
  color += texture2D(scene, vUv - vec2(0.0, texel.y * spread)) * 0.18;
  color += texture2D(scene, vUv + vec2(texel.x * spread, 0.0)) * 0.18;
  color += texture2D(scene, vUv - vec2(texel.x * spread, 0.0)) * 0.18;
  vec2 centered = vUv - 0.5;
  float vignette = smoothstep(0.85, 0.25, length(centered * vec2(1.0, 1.25)));
  color.rgb *= mix(0.55, 1.05, vignette);
  color.rgb = mix(color.rgb, color.rgb * vec3(1.06, 1.0, 0.9), 0.5);
  float border = max(smoothstep(0.42, 0.5, abs(centered.x)), smoothstep(0.40, 0.5, abs(centered.y)));
  color.rgb = mix(color.rgb, vec3(1.0, 0.45, 0.2), border * hurt * 0.85);
  float bars = step(0.5 - letterbox, abs(centered.y));
  color.rgb = mix(color.rgb, vec3(0.0), bars);
  gl_FragColor = vec4(color.rgb, 1.0);
  #include <colorspace_fragment>
}
`;

function hash(seed: number, x: number, y: number, salt: number): number {
  return mixSeed(mixSeed(seed, x * 7919 + salt), y * 104729 + salt);
}

export class ArenaRenderer {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, RENDER_WIDTH / RENDER_HEIGHT, 10, 2000);
  private readonly target = new WebGLRenderTarget(RENDER_WIDTH, RENDER_HEIGHT, { magFilter: NearestFilter, minFilter: NearestFilter });
  private readonly postScene = new Scene();
  private readonly postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMaterial: ShaderMaterial;
  private readonly ground: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly glow: Mesh<CircleGeometry, MeshBasicMaterial>;
  private readonly slamFill: Mesh<CircleGeometry, MeshBasicMaterial>;
  private readonly slamRing: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly shadows: ShadowBatch;
  private readonly enemies: Record<EnemyKind, SpriteBatch>;
  private readonly agent: SpriteBatch[];
  private readonly gems: SpriteBatch;
  private readonly bigGems: SpriteBatch;
  private readonly bolts: SpriteBatch;
  private readonly beams: SpriteBatch;
  private readonly seekers: SpriteBatch;
  private readonly blocks: SpriteBatch;
  private readonly hallucinations: SpriteBatch;
  private readonly props: SpriteBatch[];
  private readonly rings: Ring[] = [];
  private readonly heading = new Quaternion();
  private readonly up = new Vector3(0, 1, 0);
  private readonly projector = new Vector3();
  private tier: Tier = 1;
  private propChunkX = Number.NaN;
  private propChunkY = Number.NaN;
  private seed = 0;
  hurt = 0;
  letterbox = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.target.texture.colorSpace = SRGBColorSpace;
    this.postMaterial = new ShaderMaterial({
      vertexShader: POST_VERTEX,
      fragmentShader: POST_FRAGMENT,
      uniforms: {
        scene: { value: this.target.texture },
        texel: { value: [1 / RENDER_WIDTH, 1 / RENDER_HEIGHT] },
        hurt: { value: 0 },
        letterbox: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new Mesh(new PlaneGeometry(2, 2), this.postMaterial));

    const look = WORLD_LOOKS[1];
    this.scene.background = new Color(look.fog);
    this.scene.fog = new Fog(look.fog, CAMERA_DISTANCE * 0.95, CAMERA_DISTANCE * 1.55);

    const groundGeometry = new PlaneGeometry(GROUND_TILE * 40, GROUND_TILE * 40);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMap = groundTexture(7, look.ground);
    groundMap.repeat.set(40, 40);
    this.ground = new Mesh(groundGeometry, new MeshBasicMaterial({ map: groundMap, toneMapped: false }));
    this.scene.add(this.ground);

    const glowGeometry = new CircleGeometry(90, 40);
    glowGeometry.rotateX(-Math.PI / 2);
    this.glow = new Mesh(
      glowGeometry,
      new MeshBasicMaterial({ map: glowTexture(128, "#ffe2b0", 0.22), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
    );
    this.glow.position.y = 0.3;
    this.scene.add(this.glow);

    const slamGeometry = new CircleGeometry(1, 40);
    slamGeometry.rotateX(-Math.PI / 2);
    this.slamFill = new Mesh(slamGeometry, new MeshBasicMaterial({ color: "#ff3b3b", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.slamFill.position.y = 0.4;
    this.scene.add(this.slamFill);
    const slamRingGeometry = new RingGeometry(0.92, 1, 48);
    slamRingGeometry.rotateX(-Math.PI / 2);
    this.slamRing = new Mesh(slamRingGeometry, new MeshBasicMaterial({ color: "#ffe1a0", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.slamRing.position.y = 0.5;
    this.scene.add(this.slamRing);

    this.shadows = new ShadowBatch(this.scene, 1400);
    this.enemies = {
      grunt: this.batch([GRUNT], 1, 500, false),
      runner: this.batch([RUNNER], 1, 300, false),
      brute: this.batch([BRUTE], 1, 120, false),
      boss: this.batch([BOSS], 2, 2, false),
    };
    this.agent = ([1, 2, 3, 4, 5] as const).map((tier) => this.batch(agentSprite(tier), 1, 1, false));
    this.gems = this.batch([GEM], 1, 900, false);
    this.bigGems = this.batch([BIG_GEM], 1, 200, false);
    this.bolts = this.batch([BOLT], 1, 200, true);
    this.beams = this.batch([BEAM], 1, 100, true);
    this.seekers = this.batch([SEEKER], 1, 100, true);
    this.blocks = this.batch([CODE_BLOCK], 1, 16, false);
    this.hallucinations = this.batch([HALLUCINATION], 1, 100, true);
    this.props = PROPS.map((sprite) => this.batch([sprite], 1, PROPS_PER_CHUNK * 25, false));

    for (let index = 0; index < 12; index += 1) {
      const geometry = new RingGeometry(0.86, 1, 40);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: "#9ff6ff", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
      mesh.position.y = 0.6;
      mesh.visible = false;
      this.scene.add(mesh);
      this.rings.push({ mesh, age: 0, life: 1, radius: 1 });
    }
  }

  private batch(layers: readonly Sprite[], scale: number, capacity: number, flat: boolean, faction: string = WORLD_LOOKS[this.tier].faction): SpriteBatch {
    const image = spriteImage(layers, faction);
    return new SpriteBatch(this.scene, pixelTexture(image.canvas), image.width * scale, image.height * scale, capacity, flat);
  }

  setWorld(tier: Tier, seed: number): void {
    this.seed = seed;
    this.tier = tier;
    const look = WORLD_LOOKS[tier];
    this.scene.background = new Color(look.fog);
    this.scene.fog = new Fog(look.fog, CAMERA_DISTANCE * 0.95, CAMERA_DISTANCE * 1.55);
    const material = this.ground.material;
    material.map?.dispose();
    const map = groundTexture(seed + tier, look.ground);
    map.repeat.set(40, 40);
    material.map = map;
    material.needsUpdate = true;
    for (const kind of ["grunt", "runner", "brute", "boss"] as const) {
      const old = this.enemies[kind];
      const capacity = old.mesh.instanceMatrix.count;
      old.dispose(this.scene);
      const sprite = kind === "grunt" ? GRUNT : kind === "runner" ? RUNNER : kind === "brute" ? BRUTE : BOSS;
      this.enemies[kind] = this.batch([sprite], kind === "boss" ? 2 : 1, capacity, false, look.faction);
    }
    this.propChunkX = Number.NaN;
  }

  pulse(x: number, y: number, radius: number, color: string): void {
    const ring = this.rings.find((candidate) => !candidate.mesh.visible) ?? this.rings[0];
    if (!ring) {
      return;
    }
    ring.mesh.visible = true;
    ring.mesh.position.x = x / SUB;
    ring.mesh.position.z = y / SUB;
    ring.mesh.material.color.set(color);
    ring.age = 0;
    ring.life = 18;
    ring.radius = radius / SUB;
  }

  project(x: number, y: number, height: number): { readonly x: number; readonly y: number } {
    this.projector.set(x / SUB, height, y / SUB).project(this.camera);
    return { x: (this.projector.x + 1) / 2, y: (1 - this.projector.y) / 2 };
  }

  private placeProps(playerX: number, playerY: number): void {
    const chunkX = Math.floor(playerX / CHUNK);
    const chunkY = Math.floor(playerY / CHUNK);
    if (chunkX === this.propChunkX && chunkY === this.propChunkY) {
      return;
    }
    this.propChunkX = chunkX;
    this.propChunkY = chunkY;
    for (const batch of this.props) {
      batch.begin();
    }
    for (let cx = chunkX - 2; cx <= chunkX + 2; cx += 1) {
      for (let cy = chunkY - 2; cy <= chunkY + 2; cy += 1) {
        for (let index = 0; index < PROPS_PER_CHUNK; index += 1) {
          const value = hash(this.seed, cx, cy, index);
          const x = cx * CHUNK + (value % CHUNK);
          const z = cy * CHUNK + ((value >>> 10) % CHUNK);
          if (Math.abs(x) < 40 && Math.abs(z) < 40) {
            continue;
          }
          const kind = (value >>> 20) % this.props.length;
          this.props[kind]?.add(x, 0, z);
        }
      }
    }
    for (const batch of this.props) {
      batch.commit();
    }
  }

  sync(state: ArenaState): void {
    const playerX = state.player.x / SUB;
    const playerZ = state.player.y / SUB;
    this.camera.position.set(playerX, Math.sin(PITCH) * CAMERA_DISTANCE, playerZ + Math.cos(PITCH) * CAMERA_DISTANCE);
    this.camera.lookAt(playerX, 0, playerZ);
    this.ground.position.set(Math.round(playerX / GROUND_TILE) * GROUND_TILE, 0, Math.round(playerZ / GROUND_TILE) * GROUND_TILE);
    this.glow.position.x = playerX;
    this.glow.position.z = playerZ;
    this.placeProps(playerX, playerZ);

    this.shadows.begin();
    for (const batch of Object.values(this.enemies)) {
      batch.begin();
    }
    for (const enemy of state.enemies) {
      const x = enemy.x / SUB;
      const z = enemy.y / SUB;
      this.enemies[enemy.kind].add(x, 0, z, enemy.hitFlash > 0);
      this.shadows.add(x, z, enemy.radius / SUB / 0.55);
    }
    for (const batch of Object.values(this.enemies)) {
      batch.commit();
    }

    for (const batch of this.agent) {
      batch.begin();
    }
    const blink = state.player.invulnerable > 0 && Math.floor(state.player.invulnerable / 3) % 2 === 0;
    this.agent[state.tier - 1]?.add(playerX, state.player.dashTicks > 0 ? 3 : 0, playerZ, blink);
    this.shadows.add(playerX, playerZ, 13);
    for (const batch of this.agent) {
      batch.commit();
    }

    this.gems.begin();
    this.bigGems.begin();
    for (const gem of state.gems) {
      const bob = Math.sin((state.tick + gem.x) / 9) * 1.2 + 1.5;
      (gem.value > 1 ? this.bigGems : this.gems).add(gem.x / SUB, bob, gem.y / SUB);
    }
    this.gems.commit();
    this.bigGems.commit();

    this.bolts.begin();
    this.beams.begin();
    this.seekers.begin();
    this.hallucinations.begin();
    for (const projectile of state.projectiles) {
      const x = projectile.x / SUB;
      const z = projectile.y / SUB;
      this.heading.setFromAxisAngle(this.up, -Math.atan2(projectile.vy, projectile.vx));
      const batch = projectile.hallucinated
        ? this.hallucinations
        : projectile.kind === "beam"
          ? this.beams
          : projectile.kind === "seeker"
            ? this.seekers
            : this.bolts;
      batch.add(x, 6, z, false, this.heading);
      this.shadows.add(x, z, 5);
    }
    this.bolts.commit();
    this.beams.commit();
    this.seekers.commit();
    this.hallucinations.commit();

    this.blocks.begin();
    for (const owned of state.weapons) {
      if (WEAPONS[owned.id].kind !== "orbit") {
        continue;
      }
      const count = weaponStats(owned.id, owned.level).count;
      for (let index = 0; index < count; index += 1) {
        const blade = orbitPosition(state, owned, index);
        this.blocks.add(blade.x / SUB, 4, blade.y / SUB);
        this.shadows.add(blade.x / SUB, blade.y / SUB, 7);
      }
    }
    this.blocks.commit();
    this.shadows.commit();

    if (state.slam) {
      const progress = 1 - state.slam.ticksLeft / 60;
      const radius = 40;
      this.slamFill.position.set(state.slam.x / SUB, 0.4, state.slam.y / SUB);
      this.slamFill.scale.setScalar(radius * progress);
      this.slamFill.material.opacity = 0.25 + 0.2 * progress;
      this.slamRing.position.set(state.slam.x / SUB, 0.5, state.slam.y / SUB);
      this.slamRing.scale.setScalar(radius);
      this.slamRing.material.opacity = 0.9;
    } else {
      this.slamFill.material.opacity = 0;
      this.slamRing.material.opacity = 0;
    }

    for (const ring of this.rings) {
      if (!ring.mesh.visible) {
        continue;
      }
      ring.age += 1;
      const progress = ring.age / ring.life;
      ring.mesh.scale.setScalar(Math.max(0.01, ring.radius * Math.min(1, progress * 1.4)));
      ring.mesh.material.opacity = 0.9 * (1 - progress);
      if (ring.age >= ring.life) {
        ring.mesh.visible = false;
      }
    }
  }

  render(): void {
    const uniforms = this.postMaterial.uniforms;
    if (uniforms["hurt"]) {
      uniforms["hurt"].value = this.hurt;
    }
    if (uniforms["letterbox"]) {
      uniforms["letterbox"].value = this.letterbox;
    }
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
