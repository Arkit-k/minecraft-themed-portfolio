/**
 * Greedy-ish chunk mesher (per-face culling) + a monochrome 1-bit texture
 * atlas. Each block type gets a 16x16 grayscale tile; faces are shaded by
 * direction via vertex colors so the black-and-white world still reads as 3D.
 */

import * as THREE from "three";
import {
  World,
  SY,
  CHUNK,
  AIR,
  BLOCK_COUNT,
  GRASS,
  DIRT,
  STONE,
  WOOD,
  PLANK,
  LEAF,
  SAND,
  WATER,
  SNOW,
  TORCH,
  ROAD,
} from "./world";

const TILE = 16;

// six cube faces, CCW from outside, with a directional shade and uv corners
const FACES = [
  { n: [0, 0, -1], s: 0.66, v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  { n: [0, 0, 1], s: 0.72, v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [-1, 0, 0], s: 0.78, v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [1, 0, 0], s: 0.84, v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [0, 1, 0], s: 1.0, v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], s: 0.46, v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
] as const;
const UVC = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

export function createAtlasTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = TILE * BLOCK_COUNT;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;
  const base = "#9a9a9a";
  const mark = "#5a5a5a";
  const dark = "#444444";

  const px = (ox: number, x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, y, 1, 1);
  };

  const snow = "#e8e6df"; // bright cap
  const water = "#bcc0c2"; // light, tinted by the translucent material
  const torch = "#efe9d8"; // bright, glowing block
  const road = "#5a5a57"; // dark asphalt

  for (let t = 0; t < BLOCK_COUNT; t++) {
    const ox = t * TILE;
    // most blocks share the mid-gray base; snow/water/torch/road differ
    ctx.fillStyle =
      t === SNOW
        ? snow
        : t === WATER
        ? water
        : t === TORCH
        ? torch
        : t === ROAD
        ? road
        : base;
    ctx.fillRect(ox, 0, TILE, TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const h = (x * 7 + y * 13 + t * 31) % 16;
        switch (t) {
          case GRASS:
            if (y < 3 && h % 3 === 0) px(ox, x, y, mark);
            else if (h % 7 === 0) px(ox, x, y, mark);
            break;
          case DIRT:
            if (h % 5 === 0) px(ox, x, y, mark);
            break;
          case STONE:
            if (y % 5 === 0 || (x % 8 === ((y < 5 ? 2 : 6) % 8))) px(ox, x, y, mark);
            break;
          case WOOD:
            if (x % 5 === 0) px(ox, x, y, dark);
            else if (h % 11 === 0) px(ox, x, y, mark);
            break;
          case PLANK:
            if (y % 4 === 0) px(ox, x, y, dark);
            else if (x % 7 === 3) px(ox, x, y, mark);
            break;
          case LEAF:
            if ((x + y) % 3 === 0 || (x - y + 16) % 4 === 0) px(ox, x, y, mark);
            break;
          case SAND:
            if (h % 6 === 0) px(ox, x, y, mark);
            break;
          case SNOW:
            if (h % 9 === 0) px(ox, x, y, "#cfccc4"); // faint sparkle
            break;
          case WATER:
            if (y % 4 === 1) px(ox, x, y, "#a6abae"); // horizontal ripples
            else if (h % 6 === 0) px(ox, x, y, "#cdd1d3");
            break;
          case TORCH:
            // a glowing core with a darker frame so it reads as a lantern
            if (x < 2 || x > 13 || y < 2 || y > 13) px(ox, x, y, "#8a8678");
            else if (h % 5 === 0) px(ox, x, y, "#fffdf4");
            break;
          case ROAD:
            // dashed centre line + faint asphalt speckle
            if (x === 8 && y % 4 < 2) px(ox, x, y, "#cdc9bf");
            else if (h % 7 === 0) px(ox, x, y, "#6e6e6a");
            break;
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const ATLAS_W = TILE * BLOCK_COUNT;
const INSET_U = 0.5 / ATLAS_W;
const INSET_V = 0.5 / TILE;

// when it has snowed, exposed ground tops are re-skinned with the snow tile
let SNOW_COVER = false;
export function setSnowCover(on: boolean) {
  SNOW_COVER = on;
}

// natural per-block colours (multiply the grayscale atlas → coloured world)
const NATURAL: [number, number, number][] = [];
NATURAL[GRASS] = [0.5, 0.95, 0.42];
NATURAL[DIRT] = [0.85, 0.6, 0.4];
NATURAL[STONE] = [0.82, 0.84, 0.9];
NATURAL[WOOD] = [0.72, 0.5, 0.32];
NATURAL[PLANK] = [0.98, 0.74, 0.46];
NATURAL[LEAF] = [0.42, 0.85, 0.4];
NATURAL[SAND] = [1.08, 0.96, 0.64];
NATURAL[WATER] = [0.36, 0.6, 1.1];
NATURAL[SNOW] = [1, 1, 1.03];
NATURAL[TORCH] = [1.15, 0.92, 0.55];
NATURAL[ROAD] = [0.58, 0.58, 0.62];
const WHITE: [number, number, number] = [1, 1, 1];

// per-planet palette tint — shifts every block toward the world's theme
let TINT: [number, number, number] = [1, 1, 1];
export function setBlockTint(r: number, g: number, b: number) {
  TINT = [r, g, b];
}

// home world stays monochrome (black & white); alien planets are coloured
let COLORED = false;
export function setColored(on: boolean) {
  COLORED = on;
}

type Buf = {
  pos: number[];
  nor: number[];
  col: number[];
  uv: number[];
  idx: number[];
};

const newBuf = (): Buf => ({ pos: [], nor: [], col: [], uv: [], idx: [] });

function toGeometry(b: Buf): THREE.BufferGeometry | null {
  if (b.idx.length === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
  g.setIndex(b.idx);
  return g;
}

/**
 * Build two meshes for a chunk: `opaque` (solid terrain) and `water`
 * (translucent sea, rendered in a separate transparent pass). Solid faces that
 * border water are kept so submerged terrain shows through the sea; water faces
 * are emitted only against AIR so the surface reads cleanly with no inner walls.
 */
export function buildChunkGeometry(
  world: World,
  cx: number,
  cz: number
): { opaque: THREE.BufferGeometry | null; water: THREE.BufferGeometry | null } {
  const solid = newBuf();
  const liquid = newBuf();

  const x0 = cx * CHUNK;
  const z0 = cz * CHUNK;

  for (let x = x0; x < x0 + CHUNK; x++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let y = 0; y < SY; y++) {
        const t = world.get(x, y, z);
        if (t === AIR) continue;
        const isWater = t === WATER;
        const b = isWater ? liquid : solid;
        const snowable =
          t === GRASS || t === DIRT || t === SAND || t === STONE;
        for (const f of FACES) {
          const nb = world.get(x + f.n[0], y + f.n[1], z + f.n[2]);
          // water: only show faces against air. solid: show against air OR water.
          if (isWater ? nb !== AIR : nb !== AIR && nb !== WATER) continue;
          // skin the exposed top of ground blocks with snow after it's snowed
          const tile = SNOW_COVER && f.n[1] === 1 && snowable ? SNOW : t;
          const u0 = tile / BLOCK_COUNT + INSET_U;
          const u1 = (tile + 1) / BLOCK_COUNT - INSET_U;
          // colour the face: directional shade × block colour × planet tint;
          // monochrome worlds keep the plain grayscale shade
          const nc = COLORED ? NATURAL[tile] || WHITE : WHITE;
          const cr = f.s * nc[0] * TINT[0];
          const cg = f.s * nc[1] * TINT[1];
          const cb = f.s * nc[2] * TINT[2];
          const start = b.pos.length / 3;
          for (let k = 0; k < 4; k++) {
            const vv = f.v[k];
            b.pos.push(x + vv[0], y + vv[1], z + vv[2]);
            b.nor.push(f.n[0], f.n[1], f.n[2]);
            b.col.push(cr, cg, cb);
            const cu = UVC[k][0];
            const cv = UVC[k][1];
            b.uv.push(u0 + cu * (u1 - u0), INSET_V + cv * (1 - 2 * INSET_V));
          }
          b.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
      }
    }
  }

  return { opaque: toGeometry(solid), water: toGeometry(liquid) };
}
