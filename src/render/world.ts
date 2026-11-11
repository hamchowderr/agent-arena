import {
  AdditiveBlending,
  Color,
  Fog,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
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
import { aimCamera, CAMERA_DISTANCE, DEPTH_STRETCH, PITCH } from "./camera";
import {
  ENEMY_SHOT,
  HALLUCINATION,
  HAZARD,
  PROPS,
  DRONE,
} from "../art/arena-sprites";
import { BOSS_IDLE_FPS, BOSS_IDLE_FRAMES, BOSS_IMPACT_FPS, BOSS_IMPACT_FRAMES, BOSS_WINDUP_FRAMES, DEATH_FPS, DEATH_FRAMES, HURT_FRAMES, WALK_FRAMES, WINDUP_FRAMES } from "../art/animate";
import { ENEMY_ART_TIER, RENDER_SCALE } from "../art/art-rules";
import { CHEST_SPRITES, chestKind, TOKEN_SPRITES, tokenTier, type ChestKind, type TokenTier } from "../art/loot";
import { MARK_SIZES, MARK_WIDTH, markFrameIndex, markFrames, SPARK_BY_WEAPON, SPARK_FRAMES, sparkFrameIndex, sparkFrames, type MarkSize, type SparkStyle } from "../art/impacts";
import { SHOT_FRAMES, SHOT_GLOW, shotFrames, shotPlace, WEAPON_STAGES, weaponStage, type WeaponStage } from "../art/weapon-art";
import { shade } from "../art/shade";
import { BOSS_CLIP_START, bossClips, enemyClips, WALK_FPS, wallClips } from "../art/clips";
import { WORLD_LOOKS, type WorldLook } from "../art/world-looks";
import type { Sprite } from "../art/sprites";
import { agentClips } from "../art/clips";
import { agentBody } from "../art/agent";
import { isEvolvedWeapon, REGULAR_KINDS, WEAPONS, WORLDS, type EnemyKind, type GroundHazard, type RegularKind, type WeaponId, type WeaponKind, type WorldId } from "../sim/arena/content";
import { px, SUB, TICKS_PER_SECOND } from "../sim/arena/math";
import { CHARGE_WINDUP, GEM_FADE_TICKS, GEM_SETTLE_TICKS, HIT_FLASH_TICKS, dronePosition, inDarkWater, orbitPosition, PATCH_CAP, PATCH_WARMUP, ownedStats, seesThroughFakes, type ArenaState } from "../sim/arena/sim";
import { mixSeed } from "../sim/rng";
import { dronePhase, rayEnd } from "../sim/arena/tools";
import { CODER_DRONE } from "../art/tool-art";
import { mineIsHot, ToolFx } from "./tool-fx";
import type { Tier } from "../sim/tiers";
import { atlasImage, circleTexture, glowTexture, groundTexture, GROUND_TILE, patchTexture, pixelTexture, spriteImage, type AtlasImage, type PatchLook } from "./textures";

export const RENDER_WIDTH = 480;
export const RENDER_HEIGHT = 270;
const BASE_FOV = 32;
const TRAIL_LENGTH = 10;
const SHAKE_UNITS = 6;
const BOSS_RING_RADIUS = 40;
const BOSS_SHADOW = 52;
const BOSS_WINDUP_TICKS = CHARGE_WINDUP;
const BOSS_WINDUP_MIN_INTERVAL = 60;
const BOSS_HURT_TICKS = 4;
const CHUNK = 192;
const PROPS_PER_CHUNK = 26;
const MAX_SHOT_SPRITES = 160;
const ENEMY_CAPACITY: Readonly<Record<RegularKind, number>> = {
  grunt: 420,
  runner: 300,
  charger: 160,
  shooter: 40,
  exploder: 160,
  splitter: 160,
  brute: 160,
  heavy: 80,
  lootRunner: 2,
};
const ELITE_CAPACITY = 2;
const WALL_CAPACITY = 48;
const DEATH_CAPACITY = 48;
const AGENT_WALK_FPS = 10;
const MAX_DYING = 160;
const SPARK_CAPACITY = 64;
const SPARK_TICKS_PER_FRAME = 3;
const SPARK_HEIGHT = 8;
const BOSS_SPARK_HEIGHT = 26;
const MARK_CAPACITY = 96;
const MARK_LIFE_TICKS = 6 * TICKS_PER_SECOND;
const MARK_FADE_TICKS = 2 * TICKS_PER_SECOND;
const MARK_BY_TIER = { fodder: "small", mid: "medium", heavy: "large", boss: "crater" } as const;
const FACING_DEADZONE = px(3);
const DEATH_TICKS_PER_FRAME = TICKS_PER_SECOND / DEATH_FPS;
const WINDUP_TICKS_PER_FRAME = 4;
const PLAYER_RING_RADIUS = 13;
const MAX_HAZARD_SPRITES = 40;
const HAZARD_PIXELS = 13;
const SHOT_FRAME_TICKS = 6;
const WAVE_ARCS = 8;
const WAVE_LIFE = 22;
const SHOT_CAPACITY: Readonly<Record<WeaponKind, number>> = {
  bolt: 200,
  beam: 100,
  homing: 100,
  seeker: 120,
  orbit: 16,
  bomb: 40,
  brick: 40,
  pulse: WAVE_ARCS * 6,
  laser: 16,
  chain: 80,
  mine: 40,
};
const BIG_HAZARD_SCALE = 18 / 13;
const HAZARD_BLINK_TICKS = 40;
const FLASH_COLOR = new Color(4, 4, 4);
const PLAIN_COLOR = new Color(1, 1, 1);
const SEEN_FAKE_COLOR = new Color(0.35, 0.35, 0.45);
const FAKE_FLICKER_TICKS = 12;
const FAKE_HIDDEN_TICKS = 3;
const PATCH_OPACITY = 0.82;
const PATCH_LOOKS: Readonly<Record<GroundHazard, PatchLook>> = {
  dust: { base: "#8d8270", mark: "#b7ab92", rim: "#6b6253", pattern: "speckle" },
  meter: { base: "#b07a22", mark: "#ffd66b", rim: "#7a5214", pattern: "coins" },
  gate: { base: "#1f7f78", mark: "#9ff6ec", rim: "#0f4a46", pattern: "stripes" },
  darkWater: { base: "#0b1630", mark: "#3a5a9a", rim: "#050a18", pattern: "waves" },
};


function animate(material: MeshBasicMaterial, frames: number): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aFrame;\nattribute float aFlip;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>\nvMapUv = vec2((aFrame + mix(uv.x, 1.0 - uv.x, aFlip)) / ${frames.toFixed(1)}, uv.y);`);
  };
  material.customProgramCacheKey = () => `frames-${frames}`;
}

interface BatchShape {
  readonly frames: number;
  readonly sink: number;
  readonly lead?: number | undefined;
  readonly glow?: boolean;
}

const STILL: BatchShape = { frames: 1, sink: 0 };

class SpriteBatch {
  readonly mesh: InstancedMesh;
  private count = 0;
  private readonly matrix = new Matrix4();
  private readonly frame: InstancedBufferAttribute | null;
  private readonly flip: InstancedBufferAttribute | null;

  constructor(scene: Object3D, texture: Texture, width: number, height: number, capacity: number, flat: boolean, shape: BatchShape = STILL) {
    const geometry = new PlaneGeometry(width, height);
    if (flat) {
      geometry.translate(shape.lead === undefined ? 0 : shape.lead - width / 2, 0, 0);
      geometry.rotateX(-Math.PI / 2);
    } else {
      geometry.translate(0, height / 2 - shape.sink, 0);
      geometry.rotateX(-(Math.PI / 2 - PITCH) * 0.5);
      geometry.scale(1, 1, 1 / DEPTH_STRETCH);
    }
    const material = shape.glow
      ? new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false })
      : new MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false });
    if (shape.frames > 1) {
      this.frame = new InstancedBufferAttribute(new Float32Array(capacity), 1);
      this.flip = new InstancedBufferAttribute(new Float32Array(capacity), 1);
      geometry.setAttribute("aFrame", this.frame);
      geometry.setAttribute("aFlip", this.flip);
      animate(material, shape.frames);
    } else {
      this.frame = null;
      this.flip = null;
    }
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

  add(x: number, y: number, z: number, flash = false, rotation: Quaternion | null = null, frame = 0, flip = false, dim = false): void {
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
    this.mesh.setColorAt(this.count, flash ? FLASH_COLOR : dim ? SEEN_FAKE_COLOR : PLAIN_COLOR);
    this.frame?.setX(this.count, frame);
    this.flip?.setX(this.count, flip ? 1 : 0);
    this.count += 1;
  }

  commit(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (this.frame && this.flip) {
      this.frame.needsUpdate = true;
      this.flip.needsUpdate = true;
    }
  }

  dispose(scene: Object3D): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).map?.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
  }
}

interface Wave {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly weapon: WeaponId;
  age: number;
}

interface Spark {
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly style: SparkStyle;
  readonly start: number;
}

interface Stain {
  readonly x: number;
  readonly z: number;
  readonly size: MarkSize;
  readonly start: number;
}

interface Dying {
  readonly x: number;
  readonly z: number;
  readonly kind: EnemyKind;
  readonly elite: boolean;
  readonly flip: boolean;
  readonly start: number;
}

class ShadowBatch {
  readonly mesh: InstancedMesh;
  private count = 0;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();

  constructor(scene: Object3D, capacity: number) {
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
    this.scale.set(width, 1, (width * 0.5) / DEPTH_STRETCH);
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
uniform float dark;
uniform vec2 vignetteShape;
uniform vec2 sightShape;
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
  float vignette = smoothstep(0.85, 0.25, length(centered * vignetteShape));
  color.rgb *= mix(0.55, 1.05, vignette);
  float sight = smoothstep(0.5, 0.18, length(centered * sightShape));
  color.rgb *= mix(1.0, 0.12 + 0.88 * sight, dark);
  color.rgb = mix(color.rgb, color.rgb * vec3(1.06, 1.0, 0.9), 0.5);
  float border = max(smoothstep(0.42, 0.5, abs(centered.x)), smoothstep(0.40, 0.5, abs(centered.y)));
  color.rgb = mix(color.rgb, vec3(1.0, 0.45, 0.2), border * hurt * 0.85);
  float bars = step(0.5 - letterbox, abs(centered.y));
  color.rgb = mix(color.rgb, vec3(0.0), bars);
  gl_FragColor = vec4(color.rgb, 1.0);
  #include <colorspace_fragment>
}
`;

export function viewFov(renderHeight: number): number {
  const half = Math.tan((BASE_FOV * Math.PI) / 360) * (renderHeight / RENDER_HEIGHT);
  return (Math.atan(half) * 360) / Math.PI;
}

function worldOf(tier: Tier): WorldId {
  return WORLDS.find((world) => world.tier === tier)?.id ?? "hustlr";
}

function hash(seed: number, x: number, y: number, salt: number): number {
  return mixSeed(mixSeed(seed, x * 7919 + salt), y * 104729 + salt);
}

export class ArenaRenderer {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly world = new Group();
  private readonly camera = new PerspectiveCamera(BASE_FOV, RENDER_WIDTH / RENDER_HEIGHT, 10, 2000);
  private readonly target = new WebGLRenderTarget(RENDER_WIDTH, RENDER_HEIGHT, { magFilter: NearestFilter, minFilter: NearestFilter });
  private readonly postScene = new Scene();
  private readonly postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMaterial: ShaderMaterial;
  private readonly ground: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly glow: Mesh<CircleGeometry, MeshBasicMaterial>;
  private readonly slamFill: Mesh<CircleGeometry, MeshBasicMaterial>;
  private readonly slamRing: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly bossRing: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly playerRing: Mesh<RingGeometry, MeshBasicMaterial>;
  private readonly shadows: ShadowBatch;
  private enemies: Record<EnemyKind, SpriteBatch>;
  private elites: Record<RegularKind, SpriteBatch>;
  private walls: SpriteBatch;
  private deaths: Record<RegularKind, SpriteBatch>;
  private eliteDeaths: Record<RegularKind, SpriteBatch>;
  private bossDeath: SpriteBatch;
  private bossVolley = -1;
  private bossImpactTick = -1000;
  private readonly dying: Dying[] = [];
  private readonly sparkBatch: SpriteBatch;
  private markBatch: SpriteBatch;
  private readonly sparks: Spark[] = [];
  private readonly stains: Stain[] = [];
  private readonly facing = new Map<number, boolean>();
  private tick = 0;
  private lastPlayerX = 0;
  private lastPlayerZ = 0;
  private agentFlip = false;
  private readonly chests: Readonly<Record<ChestKind, SpriteBatch>>;
  private readonly agent: SpriteBatch[];
  private readonly ghosts: SpriteBatch[];
  private readonly trail: { x: number; z: number }[] = [];
  private readonly tokens: Readonly<Record<TokenTier, SpriteBatch>>;
  private readonly arms = new Map<string, SpriteBatch>();
  private readonly armGlows = new Map<string, SpriteBatch>();
  private readonly levels = new Map<WeaponId, number>();
  private readonly glows: Readonly<Record<TokenTier, SpriteBatch>>;
  private readonly drones: SpriteBatch;
  private readonly coderDrones: SpriteBatch;
  private readonly hallucinations: SpriteBatch;
  private readonly shots: SpriteBatch;
  private readonly seenFakes: SpriteBatch;
  private readonly hazards: SpriteBatch;
  private readonly bigHazards: SpriteBatch;
  private readonly props: SpriteBatch[];
  private readonly rings: Ring[] = [];
  private readonly waves: Wave[] = [];
  readonly tools: ToolFx;
  private readonly heading = new Quaternion();
  private readonly up = new Vector3(0, 1, 0);
  private readonly projector = new Vector3();
  private tier: Tier = 1;
  private propChunkX = Number.NaN;
  private propChunkY = Number.NaN;
  private seed = 0;
  private readonly patches: Mesh<PlaneGeometry, MeshBasicMaterial>[] = [];
  private readonly patchMaterials: Readonly<Record<GroundHazard, MeshBasicMaterial>>;
  width = RENDER_WIDTH;
  height = RENDER_HEIGHT;
  hurt = 0;
  dark = 0;
  letterbox = 0;
  shake = 0;

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
        dark: { value: 0 },
        vignetteShape: { value: [1, 1.25] },
        sightShape: { value: [1, 1.6] },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new Mesh(new PlaneGeometry(2, 2), this.postMaterial));

    this.world.scale.z = DEPTH_STRETCH;
    this.scene.add(this.world);
    const look = WORLD_LOOKS[1];
    this.scene.background = new Color(look.fog);
    this.scene.fog = new Fog(look.fog, CAMERA_DISTANCE * 0.95, CAMERA_DISTANCE * 1.55);

    const groundGeometry = new PlaneGeometry(GROUND_TILE * 40, GROUND_TILE * 40);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMap = groundTexture(7, look.ground);
    groundMap.repeat.set(40, 40);
    this.ground = new Mesh(groundGeometry, new MeshBasicMaterial({ map: groundMap, toneMapped: false }));
    this.world.add(this.ground);

    const glowGeometry = new CircleGeometry(90, 40);
    glowGeometry.rotateX(-Math.PI / 2);
    this.glow = new Mesh(
      glowGeometry,
      new MeshBasicMaterial({ map: glowTexture(128, "#ffe2b0", 0.22), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }),
    );
    this.glow.position.y = 0.3;
    this.world.add(this.glow);

    const playerRingGeometry = new RingGeometry(PLAYER_RING_RADIUS - 2, PLAYER_RING_RADIUS, 32);
    playerRingGeometry.rotateX(-Math.PI / 2);
    this.playerRing = new Mesh(playerRingGeometry, new MeshBasicMaterial({ color: "#73eff7", transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
    this.playerRing.position.y = 0.4;
    this.world.add(this.playerRing);

    const slamGeometry = new CircleGeometry(1, 40);
    slamGeometry.rotateX(-Math.PI / 2);
    this.slamFill = new Mesh(slamGeometry, new MeshBasicMaterial({ color: "#ff3b3b", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.slamFill.position.y = 0.4;
    this.world.add(this.slamFill);
    const slamRingGeometry = new RingGeometry(0.92, 1, 48);
    slamRingGeometry.rotateX(-Math.PI / 2);
    this.slamRing = new Mesh(slamRingGeometry, new MeshBasicMaterial({ color: "#ffe1a0", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.slamRing.position.y = 0.5;
    this.world.add(this.slamRing);
    const bossRingGeometry = new RingGeometry(0.78, 1, 48);
    bossRingGeometry.rotateX(-Math.PI / 2);
    this.bossRing = new Mesh(bossRingGeometry, new MeshBasicMaterial({ color: "#ffcd75", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
    this.bossRing.position.y = 0.45;
    this.bossRing.scale.setScalar(BOSS_RING_RADIUS);
    this.world.add(this.bossRing);

    const patchMaterial = (kind: GroundHazard) =>
      new MeshBasicMaterial({ map: patchTexture(PATCH_LOOKS[kind]), transparent: true, opacity: PATCH_OPACITY, alphaTest: 0.1, depthWrite: false, toneMapped: false });
    this.patchMaterials = { dust: patchMaterial("dust"), meter: patchMaterial("meter"), gate: patchMaterial("gate"), darkWater: patchMaterial("darkWater") };
    const patchGeometry = new PlaneGeometry(2, 2);
    patchGeometry.rotateX(-Math.PI / 2);
    for (let index = 0; index < PATCH_CAP + 2; index += 1) {
      const mesh = new Mesh(patchGeometry, this.patchMaterials.dust);
      mesh.position.y = 0.25;
      mesh.visible = false;
      mesh.renderOrder = 0;
      this.world.add(mesh);
      this.patches.push(mesh);
    }

    this.shadows = new ShadowBatch(this.world, 1400);
    this.tools = new ToolFx(this.world);
    this.enemies = this.enemyBatches(WORLD_LOOKS[1], 1);
    this.elites = this.eliteBatches(WORLD_LOOKS[1], 1);
    this.walls = this.wallBatch(WORLD_LOOKS[1], 1);
    this.deaths = this.deathBatches(WORLD_LOOKS[1], 1, false);
    this.eliteDeaths = this.deathBatches(WORLD_LOOKS[1], 1, true);
    this.bossDeath = this.bossDeathBatch(1);
    this.sparkBatch = this.onTop(this.atlasBatch(atlasImage(sparkFrames()), 1, SPARK_CAPACITY, 0));
    this.markBatch = this.markBatchFor(WORLD_LOOKS[1]);
    this.chests = { elite: this.batch([CHEST_SPRITES.elite], 2, 4, false), boss: this.batch([CHEST_SPRITES.boss], 2, 2, false) };
    this.agent = ([1, 2, 3, 4, 5] as const).map((tier) => {
      const batch = this.atlasBatch(atlasImage(agentClips(tier)), 1, 1, 0);
      batch.mesh.renderOrder = 11;
      (batch.mesh.material as MeshBasicMaterial).depthTest = false;
      return batch;
    });
    this.ghosts = ([1, 2, 3, 4, 5] as const).map((tier) => {
      const batch = this.batch([agentBody(tier)], 1, TRAIL_LENGTH, false);
      const material = batch.mesh.material as MeshBasicMaterial;
      material.transparent = true;
      material.opacity = 0.4;
      material.color.set("#73eff7");
      material.depthWrite = false;
      return batch;
    });
    this.tokens = {
      0: this.batch([TOKEN_SPRITES[0]], 1, 900, false),
      1: this.batch([TOKEN_SPRITES[1]], 1, 200, false),
      2: this.batch([TOKEN_SPRITES[2]], 1, 60, false),
      3: this.batch([TOKEN_SPRITES[3]], 1, 20, false),
    };
    this.buildArms();
    this.glows = {
      0: this.glowBatch(14, 10, "#ffcd75", 0.4, 900),
      1: this.glowBatch(22, 14, "#fff1a8", 0.55, 200),
      2: this.glowBatch(28, 16, "#fff1a8", 0.6, 60),
      3: this.glowBatch(40, 22, "#c8fff8", 0.7, 20),
    };
    this.drones = this.batch([DRONE], 1, 12, false);
    this.coderDrones = this.batch([CODER_DRONE], 1, 12, false);
    this.hallucinations = this.batch([HALLUCINATION], 1, 100, true);
    this.shots = this.batch([ENEMY_SHOT], 2, MAX_SHOT_SPRITES, false);
    this.shots.mesh.renderOrder = 12;
    (this.shots.mesh.material as MeshBasicMaterial).depthTest = false;
    this.seenFakes = this.batch([ENEMY_SHOT], 2, MAX_SHOT_SPRITES, false);
    this.seenFakes.mesh.renderOrder = 12;
    const fakeMaterial = this.seenFakes.mesh.material as MeshBasicMaterial;
    fakeMaterial.depthTest = false;
    fakeMaterial.transparent = true;
    fakeMaterial.opacity = 0.3;
    fakeMaterial.depthWrite = false;
    this.hazards = this.hazardBatch(1);
    this.bigHazards = this.hazardBatch(BIG_HAZARD_SCALE);
    this.props = PROPS.map((sprite) => this.batch([sprite], 1, PROPS_PER_CHUNK * 25, false));

    for (let index = 0; index < 28; index += 1) {
      const geometry = new RingGeometry(0.86, 1, 40);
      geometry.rotateX(-Math.PI / 2);
      const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: "#9ff6ff", transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
      mesh.position.y = 0.6;
      mesh.visible = false;
      this.world.add(mesh);
      this.rings.push({ mesh, age: 0, life: 1, radius: 1 });
    }
  }

  private batch(layers: readonly Sprite[], scale: number, capacity: number, flat: boolean, faction: string = WORLD_LOOKS[this.tier].faction): SpriteBatch {
    const image = spriteImage(layers, faction);
    return new SpriteBatch(this.world, pixelTexture(image.canvas), image.width * scale, image.height * scale, capacity, flat);
  }

  private buildArms(): void {
    const faction = WORLD_LOOKS[this.tier].faction;
    for (const weapon of Object.keys(WEAPONS) as WeaponId[]) {
      const place = shotPlace(weapon);
      const evolved = isEvolvedWeapon(weapon);
      const stages: readonly WeaponStage[] = evolved ? [0] : WEAPON_STAGES;
      const capacity = SHOT_CAPACITY[WEAPONS[weapon].kind];
      for (const stage of stages) {
        const key = `${weapon}:${stage}`;
        const image = atlasImage(shotFrames(weapon, stage).map((frame) => shade([frame], faction)));
        const flat = place === "flat" || place === "wave";
        const batch = new SpriteBatch(this.world, pixelTexture(image.canvas), image.width, image.height, capacity, flat, { frames: image.frames, sink: 0, lead: place === "flat" ? 2 : undefined });
        this.arms.set(key, place === "ground" ? batch : this.onTop(batch));
        if (place !== "flying" && place !== "flat") {
          continue;
        }
        const boost = evolved ? 1.6 : 1 + stage * 0.3;
        const alpha = Math.min(0.85, 0.45 + stage * 0.12 + (evolved ? 0.25 : 0));
        this.armGlows.set(
          key,
          place === "flat"
            ? this.glowBatch(image.width * 1.4, 16 * boost, SHOT_GLOW[weapon], alpha, capacity, 8)
            : this.glowBatch(image.width * 2 * boost, image.width * 1.5 * boost, SHOT_GLOW[weapon], alpha, capacity),
        );
      }
    }
  }

  private arm(weapon: WeaponId): string {
    const evolved = isEvolvedWeapon(weapon);
    return `${weapon}:${evolved ? 0 : weaponStage(this.levels.get(weapon) ?? 1)}`;
  }

  private onTop(batch: SpriteBatch): SpriteBatch {
    batch.mesh.renderOrder = 11;
    (batch.mesh.material as MeshBasicMaterial).depthTest = false;
    return batch;
  }

  private glowBatch(width: number, height: number, color: string, alpha: number, capacity: number, lead?: number): SpriteBatch {
    const batch = new SpriteBatch(this.world, glowTexture(64, color, alpha), width, height, capacity, true, { frames: 1, sink: 0, lead, glow: true });
    batch.mesh.renderOrder = 2;
    return batch;
  }

  private atlasBatch(image: AtlasImage, scale: number, capacity: number, sink: number): SpriteBatch {
    return new SpriteBatch(this.world, pixelTexture(image.canvas), image.width * scale, image.height * scale, capacity, false, { frames: image.frames, sink: sink * scale });
  }

  private enemyBatches(look: WorldLook, tier: Tier): Record<EnemyKind, SpriteBatch> {
    const batches = { boss: this.bossBatch(worldOf(tier), look.faction) } as Record<EnemyKind, SpriteBatch>;
    for (const kind of REGULAR_KINDS) {
      batches[kind] = this.atlasBatch(atlasImage(enemyClips(worldOf(tier), kind, look.faction, false).moving), RENDER_SCALE.regular, ENEMY_CAPACITY[kind], 0);
    }
    return batches;
  }

  private wallBatch(look: WorldLook, tier: Tier): SpriteBatch {
    return this.atlasBatch(atlasImage(wallClips(worldOf(tier), look.faction)), RENDER_SCALE.regular, WALL_CAPACITY, 0);
  }

  private eliteBatches(look: WorldLook, tier: Tier): Record<RegularKind, SpriteBatch> {
    const batches = {} as Record<RegularKind, SpriteBatch>;
    for (const kind of REGULAR_KINDS) {
      batches[kind] = this.atlasBatch(atlasImage(enemyClips(worldOf(tier), kind, look.faction, true).moving), RENDER_SCALE.elite, ELITE_CAPACITY, 0);
    }
    return batches;
  }

  private deathBatches(look: WorldLook, tier: Tier, elite: boolean): Record<RegularKind, SpriteBatch> {
    const batches = {} as Record<RegularKind, SpriteBatch>;
    for (const kind of REGULAR_KINDS) {
      const death = enemyClips(worldOf(tier), kind, look.faction, elite).death;
      const scale = elite ? RENDER_SCALE.elite : RENDER_SCALE.regular;
      batches[kind] = this.atlasBatch(atlasImage(death.frames), scale, elite ? ELITE_CAPACITY : DEATH_CAPACITY, death.below);
    }
    return batches;
  }

  private markBatchFor(look: WorldLook): SpriteBatch {
    const image = atlasImage(markFrames(look.ground[0]));
    const batch = new SpriteBatch(this.world, pixelTexture(image.canvas), MARK_WIDTH, MARK_WIDTH, MARK_CAPACITY, true, { frames: image.frames, sink: 0 });
    const material = batch.mesh.material as MeshBasicMaterial;
    material.transparent = true;
    material.opacity = 0.85;
    material.depthWrite = false;
    batch.mesh.renderOrder = 1;
    return batch;
  }

  spark(x: number, y: number, boss: boolean, weapon: WeaponId): void {
    if (this.sparks.length >= SPARK_CAPACITY) {
      this.sparks.shift();
    }
    this.sparks.push({ x: x / SUB, z: y / SUB, height: boss ? BOSS_SPARK_HEIGHT : SPARK_HEIGHT, style: SPARK_BY_WEAPON[WEAPONS[weapon].kind], start: this.tick });
  }

  mark(x: number, y: number, size: MarkSize): void {
    if (this.stains.length >= MARK_CAPACITY) {
      this.stains.shift();
    }
    this.stains.push({ x: x / SUB, z: y / SUB, size, start: this.tick });
  }

  private syncImpacts(): void {
    this.sparkBatch.begin();
    for (let index = this.sparks.length - 1; index >= 0; index -= 1) {
      const spark = this.sparks[index];
      const frame = spark ? Math.floor((this.tick - spark.start) / SPARK_TICKS_PER_FRAME) : SPARK_FRAMES;
      if (!spark || frame >= SPARK_FRAMES || frame < 0) {
        this.sparks.splice(index, 1);
        continue;
      }
      this.sparkBatch.add(spark.x, spark.height - 7, spark.z + 1, false, null, sparkFrameIndex(spark.style, frame));
    }
    this.sparkBatch.commit();
    this.markBatch.begin();
    for (let index = this.stains.length - 1; index >= 0; index -= 1) {
      const stain = this.stains[index];
      const age = stain ? this.tick - stain.start : MARK_LIFE_TICKS;
      if (!stain || age >= MARK_LIFE_TICKS || age < 0) {
        this.stains.splice(index, 1);
        continue;
      }
      this.markBatch.add(stain.x, 0.1, stain.z, false, null, markFrameIndex(stain.size, age > MARK_LIFE_TICKS - MARK_FADE_TICKS));
    }
    this.markBatch.commit();
  }

  die(x: number, y: number, kind: EnemyKind, elite: boolean, playerX: number): void {
    const size = MARK_BY_TIER[ENEMY_ART_TIER[kind]];
    this.mark(x, y, elite && size !== "crater" ? MARK_SIZES[MARK_SIZES.indexOf(size) + 1] ?? size : size);
    if (this.dying.length >= MAX_DYING) {
      return;
    }
    this.dying.push({ x: x / SUB, z: y / SUB, kind, elite, flip: playerX < x, start: this.tick });
  }

  private hazardBatch(scale: number): SpriteBatch {
    const batch = this.batch([HAZARD], scale, MAX_HAZARD_SPRITES, true);
    const material = batch.mesh.material as MeshBasicMaterial;
    material.transparent = true;
    material.opacity = 0.75;
    material.depthWrite = false;
    return batch;
  }

  private bossDeathBatch(tier: Tier): SpriteBatch {
    const death = bossClips(worldOf(tier), WORLD_LOOKS[tier].faction).death;
    const batch = this.atlasBatch(atlasImage(death.frames), RENDER_SCALE.boss, 2, death.below);
    batch.mesh.renderOrder = 10;
    (batch.mesh.material as MeshBasicMaterial).depthTest = false;
    return batch;
  }

  private bossBatch(world: WorldId, faction: string): SpriteBatch {
    const batch = this.atlasBatch(atlasImage(bossClips(world, faction).moving), RENDER_SCALE.boss, 2, 0);
    batch.mesh.renderOrder = 10;
    const material = batch.mesh.material as MeshBasicMaterial;
    material.depthTest = false;
    return batch;
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
    for (const batch of [...Object.values(this.enemies), ...Object.values(this.elites), ...Object.values(this.deaths), ...Object.values(this.eliteDeaths), this.walls]) {
      batch.dispose(this.world);
    }
    this.walls = this.wallBatch(look, tier);
    this.enemies = this.enemyBatches(look, tier);
    this.elites = this.eliteBatches(look, tier);
    this.deaths = this.deathBatches(look, tier, false);
    this.eliteDeaths = this.deathBatches(look, tier, true);
    this.bossDeath.dispose(this.world);
    this.bossDeath = this.bossDeathBatch(tier);
    this.dying.length = 0;
    this.markBatch.dispose(this.world);
    this.markBatch = this.markBatchFor(look);
    this.stains.length = 0;
    this.sparks.length = 0;
    this.facing.clear();
    this.propChunkX = Number.NaN;
  }

  private walkFrame(kind: RegularKind, id: number, tick: number): number {
    return Math.floor(((tick + id * 17) * WALK_FPS[kind]) / TICKS_PER_SECOND) % WALK_FRAMES;
  }

  private bossFrame(state: ArenaState, hitFlash: number): number {
    const fight = state.fight;
    if (fight && fight.volley !== this.bossVolley) {
      if (this.bossVolley >= 0 && fight.volley > this.bossVolley) {
        this.bossImpactTick = state.tick;
      }
      this.bossVolley = fight.volley;
    }
    if (!fight) {
      this.bossVolley = -1;
    }
    const idle = BOSS_CLIP_START.idle + (Math.floor((state.tick * BOSS_IDLE_FPS) / TICKS_PER_SECOND) % BOSS_IDLE_FRAMES);
    if (!fight || fight.transition > 0) {
      return idle;
    }
    if (fight.windup > 0) {
      return BOSS_CLIP_START.windup + Math.min(BOSS_WINDUP_FRAMES - 1, Math.floor(((BOSS_WINDUP_TICKS - Math.min(BOSS_WINDUP_TICKS, fight.windup)) * BOSS_WINDUP_FRAMES) / BOSS_WINDUP_TICKS));
    }
    const sinceImpact = state.tick - this.bossImpactTick;
    const impactTicks = (BOSS_IMPACT_FRAMES * TICKS_PER_SECOND) / BOSS_IMPACT_FPS;
    if (fight.chargeTicks > 0 || sinceImpact < impactTicks) {
      return BOSS_CLIP_START.impact + Math.min(BOSS_IMPACT_FRAMES - 1, Math.floor((Math.max(0, sinceImpact) * BOSS_IMPACT_FRAMES) / impactTicks));
    }
    if (this.bossImpactTick >= 0 && sinceImpact > BOSS_WINDUP_MIN_INTERVAL && fight.attackTimer <= BOSS_WINDUP_TICKS) {
      return BOSS_CLIP_START.windup + Math.min(BOSS_WINDUP_FRAMES - 1, Math.floor(((BOSS_WINDUP_TICKS - fight.attackTimer) * BOSS_WINDUP_FRAMES) / BOSS_WINDUP_TICKS));
    }
    if (hitFlash > HIT_FLASH_TICKS - BOSS_HURT_TICKS) {
      return BOSS_CLIP_START.hurt + (hitFlash > HIT_FLASH_TICKS - BOSS_HURT_TICKS / 2 ? 0 : 1);
    }
    return idle;
  }

  private syncEnemies(state: ArenaState): void {
    const batches = [this.walls, ...Object.values(this.enemies), ...Object.values(this.elites), ...Object.values(this.deaths), ...Object.values(this.eliteDeaths), this.bossDeath];
    for (const batch of batches) {
      batch.begin();
    }
    const seesFakes = seesThroughFakes(state);
    if (this.facing.size > state.enemies.length * 2 + 64) {
      this.facing.clear();
    }
    for (const enemy of state.enemies) {
      const x = enemy.x / SUB;
      const z = enemy.y / SUB;
      const telegraph = enemy.mode === "telegraph";
      const dx = state.player.x - enemy.x;
      if (Math.abs(dx) > FACING_DEADZONE) {
        this.facing.set(enemy.id, dx < 0);
      }
      const flip = this.facing.get(enemy.id) ?? false;
      if (enemy.kind === "boss") {
        this.shadows.add(x, z, BOSS_SHADOW);
        this.enemies.boss.add(x, 0, z, false, null, this.bossFrame(state, enemy.hitFlash), flip);
        continue;
      }
      if (enemy.fake && (state.tick + enemy.id) % FAKE_FLICKER_TICKS < FAKE_HIDDEN_TICKS) {
        continue;
      }
      if (!enemy.fake) {
        this.shadows.add(x, z, enemy.radius / SUB / 0.55);
      }
      const hurt = enemy.hitFlash > 0;
      const frame = hurt ? WALK_FRAMES + (enemy.hitFlash > HIT_FLASH_TICKS / 2 ? 0 : 1) : telegraph && !enemy.wall ? WALK_FRAMES + HURT_FRAMES + (Math.floor(state.tick / WINDUP_TICKS_PER_FRAME) % WINDUP_FRAMES) : telegraph ? 0 : this.walkFrame(enemy.kind, enemy.id, state.tick);
      const batch = enemy.wall ? this.walls : enemy.elite ? this.elites[enemy.kind] : this.enemies[enemy.kind];
      batch.add(x, 0, z, telegraph && Math.floor(state.tick / 3) % 2 === 0, null, frame, flip, enemy.fake && seesFakes);
    }
    for (let index = this.dying.length - 1; index >= 0; index -= 1) {
      const body = this.dying[index];
      if (!body) {
        continue;
      }
      const frame = Math.floor((state.tick - body.start) / DEATH_TICKS_PER_FRAME);
      if (frame >= DEATH_FRAMES || frame < 0) {
        this.dying.splice(index, 1);
        continue;
      }
      const batch = body.kind === "boss" ? this.bossDeath : (body.elite ? this.eliteDeaths : this.deaths)[body.kind];
      batch.add(body.x, 0, body.z, false, null, frame, body.flip);
    }
    for (const batch of batches) {
      batch.commit();
    }
  }

  private syncWaves(tick: number): void {
    for (let index = this.waves.length - 1; index >= 0; index -= 1) {
      const wave = this.waves[index];
      if (!wave) {
        continue;
      }
      wave.age += 1;
      if (wave.age > WAVE_LIFE) {
        this.waves.splice(index, 1);
        continue;
      }
      const progress = Math.min(1, (wave.age / WAVE_LIFE) * 1.3);
      const reach = wave.radius * (1 - (1 - progress) ** 2);
      const batch = this.arms.get(this.arm(wave.weapon));
      for (let arc = 0; arc < WAVE_ARCS; arc += 1) {
        const angle = (arc / WAVE_ARCS) * Math.PI * 2 + wave.age * 0.02;
        this.heading.setFromAxisAngle(this.up, -angle);
        batch?.add(wave.x + Math.cos(angle) * reach, 1, wave.z + Math.sin(angle) * reach, false, this.heading, (Math.floor(tick / SHOT_FRAME_TICKS) + arc) % SHOT_FRAMES);
      }
    }
  }

  wave(weapon: WeaponId, x: number, y: number, radius: number): void {
    if (this.waves.length >= 6) {
      this.waves.shift();
    }
    this.waves.push({ x: x / SUB, z: y / SUB, radius: radius / SUB, weapon, age: 0 });
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

  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) {
      return;
    }
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.target.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov = viewFov(height);
    this.camera.updateProjectionMatrix();
    const uniforms = this.postMaterial.uniforms;
    const tall = height > width;
    if (uniforms["texel"]) {
      uniforms["texel"].value = [1 / width, 1 / height];
    }
    if (uniforms["vignetteShape"]) {
      uniforms["vignetteShape"].value = tall ? [1.25, 1] : [1, 1.25];
    }
    if (uniforms["sightShape"]) {
      uniforms["sightShape"].value = tall ? [1.6, 1] : [1, 1.6];
    }
  }

  project(x: number, y: number, height: number): { readonly x: number; readonly y: number } {
    this.projector.set(x / SUB, height, (y / SUB) * DEPTH_STRETCH).project(this.camera);
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
    const shakeX = (Math.random() - 0.5) * this.shake * SHAKE_UNITS;
    const shakeZ = (Math.random() - 0.5) * this.shake * SHAKE_UNITS;
    aimCamera(this.camera, playerX + shakeX, playerZ + shakeZ);
    this.ground.position.set(Math.round(playerX / GROUND_TILE) * GROUND_TILE, 0, Math.round(playerZ / GROUND_TILE) * GROUND_TILE);
    this.glow.position.x = playerX;
    this.glow.position.z = playerZ;
    this.playerRing.position.x = playerX;
    this.playerRing.position.z = playerZ;
    this.placeProps(playerX, playerZ);

    this.shadows.begin();
    this.tick = state.tick;
    this.syncEnemies(state);
    this.syncImpacts();
    this.syncPatches(state);

    for (const batch of this.agent) {
      batch.begin();
    }
    const blink = state.player.invulnerable > 0 && Math.floor(state.player.invulnerable / 3) % 2 === 0;
    const stepX = playerX - this.lastPlayerX;
    const stepZ = playerZ - this.lastPlayerZ;
    const moving = Math.abs(stepX) + Math.abs(stepZ) > 0.01;
    if (Math.abs(stepX) > 0.01) {
      this.agentFlip = stepX < 0;
    }
    this.lastPlayerX = playerX;
    this.lastPlayerZ = playerZ;
    const agentFrame = moving ? Math.floor((state.tick * AGENT_WALK_FPS) / TICKS_PER_SECOND) % WALK_FRAMES : 0;
    this.agent[state.tier - 1]?.add(playerX, state.player.dashTicks > 0 ? 3 : 0, playerZ, blink, null, agentFrame, this.agentFlip);
    if (state.player.dashTicks > 0) {
      this.trail.push({ x: playerX, z: playerZ });
      if (this.trail.length > TRAIL_LENGTH) {
        this.trail.shift();
      }
    } else {
      this.trail.shift();
    }
    for (const batch of this.ghosts) {
      batch.begin();
    }
    const ghosts = this.ghosts[state.tier - 1];
    this.trail.forEach((point, index) => {
      if (index % 2 === 0) {
        ghosts?.add(point.x, 2, point.z);
      }
    });
    for (const batch of this.ghosts) {
      batch.commit();
    }
    this.shadows.add(playerX, playerZ, 13);
    for (const batch of this.agent) {
      batch.commit();
    }

    for (const glow of Object.values(this.glows)) {
      glow.begin();
    }
    for (const batch of [...Object.values(this.tokens), ...Object.values(this.chests)]) {
      batch.begin();
    }
    for (const gem of state.gems) {
      if (!gem.chest && gem.life < GEM_FADE_TICKS && Math.floor(gem.life / 6) % 2 === 0) {
        continue;
      }
      const hop = gem.settle > 0 ? Math.sin((gem.settle / GEM_SETTLE_TICKS) * Math.PI) * 9 : 0;
      const bob = Math.sin((state.tick + gem.x) / 9) * 1.2 + 1.5 + hop;
      if (gem.chest) {
        this.chests[chestKind(gem.prizes)].add(gem.x / SUB, bob, gem.y / SUB);
        continue;
      }
      const tier = tokenTier(gem.value);
      this.tokens[tier].add(gem.x / SUB, bob, gem.y / SUB);
      this.glows[tier].add(gem.x / SUB, 0.6, gem.y / SUB);
    }
    for (const batch of [...Object.values(this.tokens), ...Object.values(this.chests)]) {
      batch.commit();
    }

    this.levels.clear();
    for (const owned of state.weapons) {
      this.levels.set(owned.id, owned.level);
    }
    for (const batch of [...this.arms.values(), ...this.armGlows.values()]) {
      batch.begin();
    }
    this.hallucinations.begin();
    const shotFrame = (index: number) => (Math.floor(state.tick / SHOT_FRAME_TICKS) + index) % SHOT_FRAMES;
    state.projectiles.forEach((projectile, index) => {
      const x = projectile.x / SUB;
      const z = projectile.y / SUB;
      this.heading.setFromAxisAngle(this.up, -Math.atan2(projectile.vy, projectile.vx));
      if (projectile.hallucinated) {
        this.hallucinations.add(x, 6, z, false, this.heading);
        return;
      }
      const key = this.arm(projectile.weapon);
      const flat = shotPlace(projectile.weapon) === "flat";
      const lift = flat ? 6 : projectile.kind === "bomb" ? 4 + Math.min(projectile.life, 14) : 4;
      this.arms.get(key)?.add(x, lift, z, false, flat ? this.heading : null, shotFrame(index));
      this.armGlows.get(key)?.add(x, 0.7, z, false, flat ? this.heading : null);
      this.shadows.add(x, z, 5);
    });
    this.hallucinations.commit();
    state.rays.forEach((ray, index) => {
      if (ray.hallucinated) {
        return;
      }
      const end = rayEnd(state, ray);
      this.arms.get(this.arm(ray.weapon))?.add(end.x / SUB, 6, end.y / SUB, false, null, shotFrame(index));
    });
    this.tools.hops().forEach((hop, index) => {
      this.arms.get(this.arm(hop.weapon))?.add(hop.x, 6, hop.z, false, null, shotFrame(index));
    });
    state.mines.forEach((mine) => {
      const hot = mineIsHot(mine.fuse);
      this.arms.get(this.arm(mine.weapon))?.add(mine.x / SUB, 0, mine.y / SUB, false, null, hot ? 1 : 0);
      this.shadows.add(mine.x / SUB, mine.y / SUB, 6);
    });
    this.syncWaves(state.tick);

    this.shots.begin();
    this.seenFakes.begin();
    const seesFakeShots = (state.passives.get("guardrails") ?? 0) > 0;
    for (const shot of state.shots) {
      const x = shot.x / SUB;
      const z = shot.y / SUB;
      (shot.fake && seesFakeShots ? this.seenFakes : this.shots).add(x, 3, z);
      this.shadows.add(x, z, 4);
    }
    this.shots.commit();
    this.seenFakes.commit();

    this.hazards.begin();
    this.bigHazards.begin();
    for (const hazard of state.hazards) {
      const fading = hazard.life < HAZARD_BLINK_TICKS && Math.floor(hazard.life / 4) % 2 === 0;
      if (fading) {
        continue;
      }
      (hazard.radius > px(HAZARD_PIXELS) ? this.bigHazards : this.hazards).add(hazard.x / SUB, 0.35, hazard.y / SUB);
    }
    this.hazards.commit();
    this.bigHazards.commit();

    this.drones.begin();
    this.coderDrones.begin();
    for (const owned of state.weapons) {
      if (WEAPONS[owned.id].kind !== "seeker") {
        continue;
      }
      const count = ownedStats(state, owned).count;
      for (let index = 0; index < count; index += 1) {
        const drone = dronePosition(state, index, count, dronePhase(owned.id));
        const lift = 8 + Math.sin(state.tick / 7 + index) * 1.5;
        const coder = owned.id === "coderSubagent" || (owned.id !== "subagents" && index % 2 === 1);
        (coder ? this.coderDrones : this.drones).add(drone.x / SUB, lift, drone.y / SUB);
        this.shadows.add(drone.x / SUB, drone.y / SUB, 6);
      }
    }
    this.drones.commit();
    this.coderDrones.commit();
    this.tools.sync(state);

    for (const owned of state.weapons) {
      if (WEAPONS[owned.id].kind !== "orbit") {
        continue;
      }
      const key = this.arm(owned.id);
      const count = ownedStats(state, owned).count;
      for (let index = 0; index < count; index += 1) {
        const blade = orbitPosition(state, owned, index);
        this.arms.get(key)?.add(blade.x / SUB, 4, blade.y / SUB, false, null, shotFrame(index));
        this.armGlows.get(key)?.add(blade.x / SUB, 0.7, blade.y / SUB);
        this.shadows.add(blade.x / SUB, blade.y / SUB, 7);
      }
    }
    for (const batch of [...this.arms.values(), ...this.armGlows.values()]) {
      batch.commit();
    }
    for (const glow of Object.values(this.glows)) {
      glow.commit();
    }
    this.shadows.commit();

    const boss = state.enemies.find((enemy) => enemy.id === state.bossId);
    if (boss) {
      this.bossRing.position.x = boss.x / SUB;
      this.bossRing.position.z = boss.y / SUB;
      this.bossRing.material.opacity = 0.55 + 0.35 * Math.sin(state.tick / 6);
    } else {
      this.bossRing.material.opacity = 0;
    }

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

  private syncPatches(state: ArenaState): void {
    this.patches.forEach((mesh, index) => {
      const patch = state.patches[index];
      if (!patch) {
        mesh.visible = false;
        return;
      }
      const warming = patch.warmup > 0;
      mesh.visible = !warming || Math.floor(patch.warmup / 6) % 2 === 0;
      mesh.material = this.patchMaterials[patch.kind];
      mesh.position.x = patch.x / SUB;
      mesh.position.z = patch.y / SUB;
      const grow = warming ? 0.55 + 0.45 * (1 - patch.warmup / PATCH_WARMUP) : 1;
      const fading = patch.life < 60 ? patch.life / 60 : 1;
      mesh.scale.setScalar((patch.radius / SUB) * grow * Math.max(0.2, fading));
    });
    const target = inDarkWater(state) ? 1 : 0;
    this.dark += (target - this.dark) * 0.12;
  }

  render(): void {
    const uniforms = this.postMaterial.uniforms;
    if (uniforms["dark"]) {
      uniforms["dark"].value = this.dark;
    }
    if (uniforms["hurt"]) {
      uniforms["hurt"].value = this.hurt;
    }
    if (uniforms["letterbox"]) {
      uniforms["letterbox"].value = this.letterbox;
    }
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.world, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
