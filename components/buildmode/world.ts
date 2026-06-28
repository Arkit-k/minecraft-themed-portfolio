/**
 * Infinite voxel world: terrain is stored as 16x16 chunk columns (full height)
 * in a Map, generated on demand from a deterministic function of world
 * coordinates. User edits are tracked globally (and per chunk) so they survive
 * chunk unload/regeneration and can be saved. Horizontally infinite; vertically
 * bounded to SY.
 */

export const CHUNK = 16;
export const SY = 64; // vertical bound (raised so mountains can tower)
export const SEA_LEVEL = 14; // water fills submerged columns up to this y

// block types — IDs 0–7 are stable so existing saves keep loading
export const AIR = 0;
export const GRASS = 1;
export const DIRT = 2;
export const STONE = 3;
export const WOOD = 4;
export const PLANK = 5;
export const LEAF = 6;
export const SAND = 7;
export const WATER = 8;
export const SNOW = 9;
export const TORCH = 10;
export const ROAD = 11;
export const BLOCK_COUNT = 12;

export const PALETTE = [
  GRASS, DIRT, STONE, WOOD, PLANK, LEAF, SAND, WATER, SNOW, TORCH, ROAD,
];
export const BLOCK_NAMES: Record<number, string> = {
  [GRASS]: "Grass",
  [DIRT]: "Dirt",
  [STONE]: "Stone",
  [WOOD]: "Wood",
  [PLANK]: "Plank",
  [LEAF]: "Leaf",
  [SAND]: "Sand",
  [WATER]: "Water",
  [SNOW]: "Snow",
  [TORCH]: "Torch",
  [ROAD]: "Road",
};

// biome thresholds (world Y)
const MOUNTAIN_LINE = SEA_LEVEL + 18; // bare rock above this
const SNOW_LINE = SEA_LEVEL + 30; // snow caps above this
const ROAD_SPACING = 28; // a road runs every this-many blocks (global grid)

const lidx = (lx: number, lz: number, y: number) =>
  lx + CHUNK * (lz + CHUNK * y);
const ck = (cx: number, cz: number) => `${cx},${cz}`;

// ---- planets: the generator is reseeded per world ----
export type Planet = {
  name: string;
  seed: number;
  water: boolean;
  trees: boolean;
  civilization: boolean;
  surface: "normal" | "sand" | "snow" | "stone"; // dominant ground override
  atmosphere: [number, number, number]; // sky/fog/light tint (RGB multiplier)
  weather: string[]; // weather types this world gets (cycled through)
  colored: boolean; // false → monochrome black-and-white blocks (home)
};
export const PLANETS: Planet[] = [
  { name: "Terra", seed: 0, water: true, trees: true, civilization: true, surface: "normal", atmosphere: [1, 1, 1], weather: ["rain", "thunder", "snow"], colored: false }, // home: black & white
  { name: "Inferno", seed: 137, water: false, trees: false, civilization: false, surface: "sand", atmosphere: [1.0, 0.58, 0.3], weather: ["sandstorm"], colored: true }, // orange
  { name: "Oceanus", seed: 401, water: true, trees: true, civilization: false, surface: "normal", atmosphere: [0.55, 0.72, 1.0], weather: ["rain", "typhoon", "thunder"], colored: true }, // blue
  { name: "Luna", seed: 911, water: false, trees: false, civilization: false, surface: "stone", atmosphere: [1.0, 0.88, 0.62], weather: ["sandstorm"], colored: true }, // sandy
];

// launch centres sit on a coarse grid (one every LAUNCH_SPACING blocks, on a
// chunk-interior tile) so there's always one within reach wherever you wander.
const LAUNCH_SPACING = 96;
const LAUNCH_OFFSET = 40; // → local (8,8) of its chunk
export function launchCentersNear(px: number, pz: number, range: number) {
  const out: { x: number; z: number }[] = [];
  const k0 = Math.floor((px - range - LAUNCH_OFFSET) / LAUNCH_SPACING);
  const k1 = Math.ceil((px + range - LAUNCH_OFFSET) / LAUNCH_SPACING);
  const m0 = Math.floor((pz - range - LAUNCH_OFFSET) / LAUNCH_SPACING);
  const m1 = Math.ceil((pz + range - LAUNCH_OFFSET) / LAUNCH_SPACING);
  for (let k = k0; k <= k1; k++)
    for (let m = m0; m <= m1; m++)
      out.push({
        x: k * LAUNCH_SPACING + LAUNCH_OFFSET,
        z: m * LAUNCH_SPACING + LAUNCH_OFFSET,
      });
  return out;
}

let SEED = 0;
let PLANET: Planet = PLANETS[0];

// deterministic hash → [0,1) — mixes the planet seed so each world differs
function hash2(x: number, z: number) {
  const s =
    Math.sin((x + SEED * 1.37) * 127.1 + (z + SEED * 2.53) * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

// smooth value noise in [0,1) — interpolated white noise
function valueNoise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const v00 = hash2(xi, zi);
  const v10 = hash2(xi + 1, zi);
  const v01 = hash2(xi, zi + 1);
  const v11 = hash2(xi + 1, zi + 1);
  const u = smooth(xf);
  const v = smooth(zf);
  const a = v00 + (v10 - v00) * u;
  const b = v01 + (v11 - v01) * u;
  return a + (b - a) * v;
}

// fractal Brownian motion → soft rolling hills, [0,1)
function fbm(x: number, z: number, oct = 4) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * valueNoise(x * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// ridged fbm → sharp mountain crests, [0,1)
function ridge(x: number, z: number, oct = 4) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    const n = valueNoise(x * freq, z * freq);
    const r = 1 - Math.abs(2 * n - 1);
    sum += amp * r * r;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

type Col = { h: number; surface: number; desert: boolean };

// memoised so the many generation passes (water, caves, waterfalls, bridges,
// trees, structures…) don't recompute the same column's noise dozens of times.
// Keyed by SEED too so a planet swap doesn't return stale columns.
const colMemo = new Map<string, Col>();

// per-column terrain: surface height + top block + biome flags. Deterministic
// (pure function of world x,z) so chunks regenerate identically.
function column(x: number, z: number): Col {
  const key = SEED + ":" + x + "," + z;
  const cached = colMemo.get(key);
  if (cached) return cached;
  if (colMemo.size > 12000) colMemo.clear(); // bound memory
  const r = computeColumn(x, z);
  colMemo.set(key, r);
  return r;
}

function computeColumn(x: number, z: number): Col {
  const cont = fbm(x * 0.012, z * 0.012); // continents vs ocean basins
  const mask = smooth(
    Math.max(0, Math.min(1, (fbm(x * 0.0065 + 100, z * 0.0065 + 100) - 0.55) / 0.25))
  ); // where mountains rise
  const peak = ridge(x * 0.02 + 50, z * 0.02 + 50);
  const temp = fbm(x * 0.01 + 200, z * 0.01 + 200); // desert vs temperate
  const detail = (fbm(x * 0.08, z * 0.08) - 0.5) * 3;

  let hf = SEA_LEVEL + (cont - 0.5) * 26 + mask * peak * 34 + detail;
  // pull terrain near the spawn (origin) up to guaranteed walkable land
  const r = Math.hypot(x, z);
  hf += Math.max(0, SEA_LEVEL + 5 - hf) * Math.max(0, 1 - r / 30);
  const h = Math.max(1, Math.min(SY - 2, Math.round(hf)));

  const desert = temp > 0.62 && mask < 0.2 && h > SEA_LEVEL + 1 && h < MOUNTAIN_LINE;

  let surface: number;
  if (h >= SNOW_LINE) surface = SNOW;
  else if (h >= MOUNTAIN_LINE) surface = STONE;
  else if (h < SEA_LEVEL) surface = SEA_LEVEL - h <= 2 ? SAND : DIRT; // sea floor
  else if (h <= SEA_LEVEL + 1) surface = SAND; // beach
  else if (desert) surface = SAND;
  else surface = GRASS;
  // planet override — paint the ground per world type (peaks/sea floor kept)
  if (PLANET.surface !== "normal" && h >= SEA_LEVEL && h < SNOW_LINE) {
    if (PLANET.surface === "sand") surface = SAND;
    else if (PLANET.surface === "snow") surface = SNOW;
    else if (PLANET.surface === "stone") surface = STONE;
  }
  return { h, surface, desert };
}

// pseudo-3D coherent noise from three 2D slices — cheap winding cave tunnels
function caveAt(x: number, y: number, z: number) {
  const f = 0.085;
  const n =
    (valueNoise(x * f, y * f) +
      valueNoise(y * f + 31.7, z * f + 5.1) +
      valueNoise(x * f + 13.1, z * f + 7.3)) /
    3;
  return Math.abs(n - 0.5) < 0.06; // narrow band around the midline = a tunnel
}

export class World {
  private chunks = new Map<string, Uint8Array>();
  private editsByChunk = new Map<string, Map<number, number>>();
  private carvedByChunk = new Map<string, Set<number>>(); // structure clearings
  edits = new Map<string, number>(); // "x,y,z" -> type (for save)
  private dirty = new Set<string>(); // chunk keys needing remesh

  private generateChunk(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(CHUNK * SY * CHUNK);
    for (let lx = 0; lx < CHUNK; lx++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        const gx = cx * CHUNK + lx;
        const gz = cz * CHUNK + lz;
        const col = column(gx, gz);
        const h = col.h;
        const rocky = col.surface === STONE || col.surface === SNOW;
        // a 2-wide road grid paves walkable lowland (global coords → seamless)
        const walkable =
          col.surface === GRASS || col.surface === SAND || col.surface === DIRT;
        const onRoad =
          PLANET.civilization &&
          h > SEA_LEVEL &&
          h < MOUNTAIN_LINE &&
          walkable &&
          (((gx % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING < 2 ||
            ((gz % ROAD_SPACING) + ROAD_SPACING) % ROAD_SPACING < 2);
        for (let y = 0; y <= h && y < SY; y++) {
          let t = STONE;
          if (y === h) t = onRoad ? ROAD : col.surface;
          else if (!rocky && y >= h - 3) t = DIRT; // soil under grass/sand
          // hollow out caverns in the rock, leaving a crust under the surface
          if (y > 1 && y < h - 2 && caveAt(gx, y, gz)) continue;
          data[lidx(lx, lz, y)] = t;
        }
        // flood the sea — skipped on waterless worlds; frozen over on ice worlds
        if (PLANET.water) {
          for (let y = h + 1; y <= SEA_LEVEL && y < SY; y++)
            data[lidx(lx, lz, y)] = WATER;
          if (PLANET.surface === "snow" && h < SEA_LEVEL && SEA_LEVEL < SY)
            data[lidx(lx, lz, SEA_LEVEL)] = SNOW; // ice sheet over the sea
        }
      }
    }
    // waterfalls — only on worlds with liquid water
    if (PLANET.water)
    for (let lx = 2; lx <= 13; lx++) {
      for (let lz = 2; lz <= 13; lz++) {
        const gx = cx * CHUNK + lx;
        const gz = cz * CHUNK + lz;
        const here = column(gx, gz).h;
        let maxN = here;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nh = column(gx + dx, gz + dz).h;
          if (nh > maxN) maxN = nh;
        }
        const tall = maxN >= SNOW_LINE - 6; // a true mountain cliff
        if (maxN - here >= 6 && hash2(gx * 1.7, gz * 1.3) > (tall ? 0.78 : 0.9)) {
          for (let y = here + 1; y < maxN && y < SY; y++)
            if (data[lidx(lx, lz, y)] === AIR) data[lidx(lx, lz, y)] = WATER;
        }
      }
    }
    // footbridges — a plank walkway across a narrow water channel between two
    // low banks (kept fully interior so a bridge never spans two chunks)
    const deckY = SEA_LEVEL + 1;
    const lowBank = (h: number) => h >= SEA_LEVEL && h <= SEA_LEVEL + 2;
    if (PLANET.water && PLANET.civilization)
    for (let lz = 3; lz <= 12; lz++) {
      for (let lx = 3; lx <= 12; lx++) {
        const gx = cx * CHUNK + lx;
        const gz = cz * CHUNK + lz;
        if (!lowBank(column(gx, gz).h)) continue; // start on a low bank
        if (column(gx + 1, gz).h >= SEA_LEVEL) continue; // water immediately east
        if (hash2(gx * 1.3, gz * 2.1) < 0.97) continue; // sparse placement
        let span = 1;
        while (span <= 8 && lx + span <= 13 && column(gx + span, gz).h < SEA_LEVEL)
          span++;
        if (span < 2 || lx + span > 13 || !lowBank(column(gx + span, gz).h)) continue;
        for (let xx = lx; xx <= lx + span; xx++) {
          const li = lidx(xx, lz, deckY);
          if (data[li] === AIR || data[li] === WATER) data[li] = PLANK;
        }
      }
    }
    // interior trees only (kept ≥2 from borders so canopy never crosses chunks),
    // and only on grassy lowland plains — never on sand, rock, snow, or sea
    if (PLANET.trees)
    for (let lx = 2; lx <= 13; lx++) {
      for (let lz = 2; lz <= 13; lz++) {
        const gx = cx * CHUNK + lx;
        const gz = cz * CHUNK + lz;
        // forests: a low-frequency mask thickens the trees in certain regions
        const forest = fbm(gx * 0.01 + 400, gz * 0.01 + 400);
        const thr = 0.985 - Math.max(0, forest - 0.5) * 0.13;
        if (hash2(gx, gz) > thr) {
          const col = column(gx, gz);
          if (col.surface !== GRASS) continue;
          const h = col.h;
          const th = 4 + Math.floor(hash2(gz, gx) * 2);
          for (let i = 1; i <= th && h + i < SY; i++)
            data[lidx(lx, lz, h + i)] = WOOD;
          const top = h + th;
          for (let dx = -2; dx <= 2; dx++)
            for (let dz = -2; dz <= 2; dz++)
              for (let dy = -1; dy <= 1; dy++) {
                if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
                const yy = top + dy;
                if (yy < 0 || yy >= SY) continue;
                if (data[lidx(lx + dx, lz + dz, yy)] === AIR)
                  data[lidx(lx + dx, lz + dz, yy)] = LEAF;
              }
        }
      }
    }
    // ---- structures: cabins, boulders, bushes, docks (deterministic, interior) ----
    for (let lx = 2; lx <= 13; lx++) {
      for (let lz = 2; lz <= 13; lz++) {
        const gx = cx * CHUNK + lx;
        const gz = cz * CHUNK + lz;
        const col = column(gx, gz);
        const h = col.h;
        const flatGrass =
          lx <= 9 &&
          lz <= 9 &&
          col.surface === GRASS &&
          h > SEA_LEVEL + 1 &&
          h < MOUNTAIN_LINE;
        // city zones — a low-frequency mask makes tall buildings cluster
        const city = smooth(
          Math.max(0, Math.min(1, (fbm(gx * 0.004 + 300, gz * 0.004 + 300) - 0.6) / 0.12))
        );
        // a moored boat on the water near a bank
        if (
          PLANET.water &&
          h < SEA_LEVEL &&
          lx >= 1 && lx <= 13 && lz >= 1 && lz <= 11 &&
          hash2(gx * 4.7 + 6, gz * 3.9 + 2) > 0.997 &&
          (column(gx + 3, gz).h >= SEA_LEVEL ||
            column(gx - 3, gz).h >= SEA_LEVEL ||
            column(gx, gz + 3).h >= SEA_LEVEL ||
            column(gx, gz - 3).h >= SEA_LEVEL)
        ) {
          this.placeBoat(data, lx, lz);
          continue;
        }
        // civic landmarks & buildings only exist on inhabited worlds
        if (PLANET.civilization) {
          // landmark: shopping mall in a city centre
          if (
            lx <= 4 && lz <= 4 && col.surface === GRASS &&
            h > SEA_LEVEL + 1 && h < MOUNTAIN_LINE && city > 0.5 &&
            hash2(gx * 7.7 + 2, gz * 6.1 + 5) > 0.996 && this.flatN(gx, gz, h, 7)
          ) {
            this.placeMall(data, lx, lz, h + 1);
            continue;
          }
          // landmark: ferris wheel (amusement park)
          if (
            lx <= 4 && col.surface === GRASS &&
            h > SEA_LEVEL + 1 && h < MOUNTAIN_LINE &&
            hash2(gx * 6.3 + 8, gz * 5.9 + 4) > 0.996 && this.flatN(gx, gz, h, 7)
          ) {
            this.placeFerris(data, lx, lz, h + 1);
            continue;
          }
          // landmark: rocket on a launch pad (rare)
          if (
            lx >= 1 && lx <= 12 && lz >= 1 && lz <= 12 && col.surface === GRASS &&
            h > SEA_LEVEL + 1 && h < MOUNTAIN_LINE &&
            hash2(gx * 9.3 + 3, gz * 8.7 + 1) > 0.9991 && this.flatN(gx, gz, h, 4)
          ) {
            this.placeRocket(data, lx, lz, h + 1);
            continue;
          }
          // a multi-storey building inside a city zone
          if (flatGrass && city > 0.5 && hash2(gx * 5.1, gz * 4.3) > 0.93 && this.flat5(gx, gz, h)) {
            this.placeTower(data, lx, lz, h + 1, 7 + Math.floor(hash2(gx * 1.1, gz * 1.7) * 6));
            continue;
          }
          // a plank cabin on countryside grassland (rare)
          if (flatGrass && city < 0.4 && hash2(gx * 3.1, gz * 2.7) > 0.9975 && this.flat5(gx, gz, h)) {
            this.placeCabin(data, lx, lz, h + 1);
            continue;
          }
          // a fenced farm on countryside grassland
          if (flatGrass && city < 0.4 && hash2(gx * 2.1 + 11, gz * 2.6 + 4) > 0.992 && this.flat5(gx, gz, h)) {
            this.placeFarm(data, lx, lz, h + 1);
            continue;
          }
        }
        // a stone boulder on grass / sand / rock
        if (
          (col.surface === GRASS || col.surface === SAND || col.surface === STONE) &&
          hash2(gx * 1.9 + 7, gz * 2.3 + 3) > 0.992
        ) {
          this.placeBoulder(data, lx, lz, h);
          continue;
        }
        // a leafy bush on grass (vegetated worlds only)
        if (PLANET.trees && col.surface === GRASS && hash2(gx * 4.3 + 1, gz * 1.7 + 9) > 0.985) {
          this.placeBush(data, lx, lz, h + 1);
          continue;
        }
        // a plank pier reaching out over the water from a low bank
        if (
          PLANET.water && PLANET.civilization &&
          lowBank(h) &&
          column(gx + 1, gz).h < SEA_LEVEL &&
          hash2(gx * 2.9 + 5, gz * 3.3 + 2) > 0.99
        ) {
          this.placeDock(data, lx, lz, gx, gz);
        }
      }
    }
    // launch centre — a rocket on a pad in every 6th chunk both ways (the grid)
    if ((((cx - 2) % 6) + 6) % 6 === 0 && (((cz - 2) % 6) + 6) % 6 === 0) {
      const lx = 8;
      const lz = 8;
      const gx = cx * CHUNK + lx;
      const gz = cz * CHUNK + lz;
      const h = column(gx, gz).h;
      // level a small plot so the pad sits flat, then build the rocket
      for (let dx = -1; dx <= 3; dx++)
        for (let dz = -1; dz <= 3; dz++) {
          const x = lx + dx;
          const z = lz + dz;
          if (x < 0 || x >= CHUNK || z < 0 || z >= CHUNK) continue;
          for (let y = h + 1; y < SY; y++) data[lidx(x, z, y)] = AIR;
          data[lidx(x, z, h)] = STONE;
        }
      this.placeRocket(data, lx, lz, h + 1);
    }
    // clear cells where structures stand (so trees/hills don't intersect them)
    const cbc = this.carvedByChunk.get(ck(cx, cz));
    if (cbc) for (const li of cbc) data[li] = AIR;
    // overlay any stored edits for this chunk (player edits win over carving)
    const ebc = this.editsByChunk.get(ck(cx, cz));
    if (ebc) for (const [li, t] of ebc) data[li] = t;
    return data;
  }

  // ---- structure builders (operate on a chunk's local data array) ----

  /** the 5×5 cabin footprint is level enough to build on */
  private flat5(gx: number, gz: number, h: number) {
    for (const [dx, dz] of [
      [0, 0],
      [4, 0],
      [0, 4],
      [4, 4],
      [2, 2],
    ]) {
      if (Math.abs(column(gx + dx, gz + dz).h - h) > 1) return false;
    }
    return true;
  }

  private placeCabin(data: Uint8Array, lx: number, lz: number, gy: number) {
    const W = 5;
    const D = 5;
    const HH = 4; // wall height
    if (gy + HH >= SY) return;
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        data[lidx(lx + x, lz + z, gy - 1)] = PLANK; // floor
        for (let y = 0; y < HH; y++) data[lidx(lx + x, lz + z, gy + y)] = AIR; // hollow it
        data[lidx(lx + x, lz + z, gy + HH)] = WOOD; // flat roof
      }
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        const edge = x === 0 || x === W - 1 || z === 0 || z === D - 1;
        if (!edge) continue;
        const corner = (x === 0 || x === W - 1) && (z === 0 || z === D - 1);
        for (let y = 0; y < HH; y++) {
          if (z === 0 && x === 2 && y < 2) continue; // doorway
          data[lidx(lx + x, lz + z, gy + y)] = corner ? WOOD : PLANK;
        }
      }
  }

  private placeBoulder(data: Uint8Array, lx: number, lz: number, gy: number) {
    const r = 2;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        for (let dy = 0; dy <= r; dy++) {
          if (dx * dx + dz * dz + dy * dy > r * r + 1) continue;
          const x = lx + dx;
          const z = lz + dz;
          const y = gy + dy;
          if (x < 0 || x >= CHUNK || z < 0 || z >= CHUNK || y < 0 || y >= SY) continue;
          data[lidx(x, z, y)] = STONE;
        }
  }

  private placeBush(data: Uint8Array, lx: number, lz: number, gy: number) {
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dy = 0; dy <= 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + dy > 2) continue;
          const x = lx + dx;
          const z = lz + dz;
          const y = gy + dy;
          if (x < 0 || x >= CHUNK || z < 0 || z >= CHUNK || y < 0 || y >= SY) continue;
          if (data[lidx(x, z, y)] === AIR) data[lidx(x, z, y)] = LEAF;
        }
  }

  private placeTower(
    data: Uint8Array,
    lx: number,
    lz: number,
    gy: number,
    height: number
  ) {
    const W = 5;
    const D = 5;
    let H = height;
    if (gy + H >= SY) H = SY - 1 - gy;
    if (H < 4) return;
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        data[lidx(lx + x, lz + z, gy - 1)] = STONE; // foundation
        const edge = x === 0 || x === W - 1 || z === 0 || z === D - 1;
        const corner = (x === 0 || x === W - 1) && (z === 0 || z === D - 1);
        for (let y = 0; y < H; y++) {
          if (!edge) {
            data[lidx(lx + x, lz + z, gy + y)] = AIR; // hollow floors
            continue;
          }
          // window gaps on every third row at the wall mid-cells
          const win = (x === 2 || z === 2) && !corner && y % 3 === 2;
          data[lidx(lx + x, lz + z, gy + y)] = win ? AIR : STONE;
        }
        data[lidx(lx + x, lz + z, gy + H)] = STONE; // roof
      }
    data[lidx(lx + 2, lz, gy)] = AIR; // doorway
    data[lidx(lx + 2, lz, gy + 1)] = AIR;
  }

  private placeFarm(data: Uint8Array, lx: number, lz: number, gy: number) {
    const S = 5;
    if (gy + 1 >= SY) return;
    for (let x = 0; x < S; x++)
      for (let z = 0; z < S; z++) {
        const border = x === 0 || x === S - 1 || z === 0 || z === S - 1;
        if (border) {
          data[lidx(lx + x, lz + z, gy - 1)] = GRASS;
          data[lidx(lx + x, lz + z, gy)] = WOOD; // fence
        } else {
          data[lidx(lx + x, lz + z, gy - 1)] = DIRT; // tilled soil
          data[lidx(lx + x, lz + z, gy)] = z % 2 === 0 ? LEAF : AIR; // crop rows
        }
        data[lidx(lx + x, lz + z, gy + 1)] = AIR; // headroom
      }
    // a scarecrow standing in the middle of the field
    if (gy + 2 < SY) {
      data[lidx(lx + 2, lz + 2, gy)] = WOOD;
      data[lidx(lx + 2, lz + 2, gy + 1)] = WOOD;
      data[lidx(lx + 1, lz + 2, gy + 1)] = WOOD; // outstretched arms
      data[lidx(lx + 3, lz + 2, gy + 1)] = WOOD;
      data[lidx(lx + 2, lz + 2, gy + 2)] = PLANK; // straw head
    }
  }

  private placeDock(data: Uint8Array, lx: number, lz: number, gx: number, gz: number) {
    const deckY = SEA_LEVEL + 1;
    let len = 0;
    while (len < 6 && lx + 1 + len <= 13 && column(gx + 1 + len, gz).h < SEA_LEVEL) len++;
    if (len < 3) return;
    for (let i = 0; i <= len; i++) {
      const x = lx + i;
      if (x >= CHUNK || deckY >= SY) break;
      const li = lidx(x, lz, deckY);
      if (data[li] === AIR || data[li] === WATER) data[li] = PLANK;
    }
    // a support post at the far end down to the seabed
    const px = lx + len;
    if (px < CHUNK) {
      const floor = column(gx + len, gz).h;
      for (let y = floor + 1; y < deckY && y < SY; y++) {
        const li = lidx(px, lz, y);
        if (data[li] === WATER || data[li] === AIR) data[li] = WOOD;
      }
    }
  }

  // bounds-checked local write (keeps big structures from corrupting neighbours)
  private put(data: Uint8Array, lx: number, lz: number, y: number, t: number) {
    if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 0 || y >= SY) return;
    data[lidx(lx, lz, y)] = t;
  }

  /** the n×n footprint is level enough to build on */
  private flatN(gx: number, gz: number, h: number, n: number) {
    const m = n - 1;
    for (const [dx, dz] of [
      [0, 0],
      [m, 0],
      [0, m],
      [m, m],
      [m >> 1, m >> 1],
    ]) {
      if (Math.abs(column(gx + dx, gz + dz).h - h) > 1) return false;
    }
    return true;
  }

  // a wide flat shopping mall (STONE shell with windows + a big entrance)
  private placeMall(data: Uint8Array, lx: number, lz: number, gy: number) {
    const S = 9;
    const H = 5;
    if (gy + H >= SY) return;
    for (let x = 0; x < S; x++)
      for (let z = 0; z < S; z++) {
        this.put(data, lx + x, lz + z, gy - 1, STONE); // floor
        const edge = x === 0 || x === S - 1 || z === 0 || z === S - 1;
        const corner = (x === 0 || x === S - 1) && (z === 0 || z === S - 1);
        for (let y = 0; y < H; y++) {
          if (!edge) {
            this.put(data, lx + x, lz + z, gy + y, AIR);
            continue;
          }
          const win = !corner && y === 2 && (x + z) % 2 === 0;
          this.put(data, lx + x, lz + z, gy + y, win ? AIR : STONE);
        }
        this.put(data, lx + x, lz + z, gy + H, PLANK); // roof
      }
    for (let dx = -1; dx <= 1; dx++) {
      this.put(data, lx + 4 + dx, lz, gy, AIR); // wide entrance
      this.put(data, lx + 4 + dx, lz, gy + 1, AIR);
    }
  }

  // a rocket on a launch pad — a tall plank body, nose cone, fins
  private placeRocket(data: Uint8Array, lx: number, lz: number, gy: number) {
    const H = 13;
    if (gy + H + 2 >= SY) return;
    for (let x = -1; x <= 3; x++)
      for (let z = -1; z <= 3; z++) this.put(data, lx + x, lz + z, gy - 1, STONE); // pad
    for (let y = 0; y < H; y++)
      for (let x = 0; x < 3; x++)
        for (let z = 0; z < 3; z++) {
          const edge = x === 0 || x === 2 || z === 0 || z === 2;
          this.put(data, lx + x, lz + z, gy + y, edge ? PLANK : AIR);
        }
    this.put(data, lx + 1, lz, gy + H - 3, AIR); // porthole
    this.put(data, lx + 1, lz + 1, gy + H, PLANK); // nose
    this.put(data, lx + 1, lz + 1, gy + H + 1, STONE);
    for (const [fx, fz] of [
      [-1, 0],
      [3, 0],
      [0, -1],
      [0, 3],
    ])
      this.put(data, lx + 1 + fx, lz + 1 + fz, gy, WOOD); // fins
  }

  // a ferris wheel — a vertical wood ring with cabins, on two legs
  private placeFerris(data: Uint8Array, lx: number, lz: number, gy: number) {
    const R = 4;
    const cx = lx + 4;
    const cy = gy + R + 1; // axle height
    if (cy + R >= SY) return;
    for (let y = 0; y <= cy - gy; y++) {
      this.put(data, lx + 1, lz, gy + y, WOOD); // legs
      this.put(data, lx + 7, lz, gy + y, WOOD);
    }
    this.put(data, cx, lz, cy, WOOD); // axle
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const rx = cx + Math.round(Math.cos(a) * R);
      const ry = cy + Math.round(Math.sin(a) * R);
      this.put(data, rx, lz, ry, i % 7 === 0 ? PLANK : WOOD); // cabins every 7
    }
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2])
      for (let r = 1; r < R; r++)
        this.put(data, cx + Math.round(Math.cos(a) * r), lz, cy + Math.round(Math.sin(a) * r), WOOD); // spokes
  }

  // a small moored boat — a plank hull at the water line with a little mast
  private placeBoat(data: Uint8Array, lx: number, lz: number) {
    const wy = SEA_LEVEL;
    for (let x = 0; x < 3; x++)
      for (let z = 0; z < 5; z++) {
        const edge = x === 0 || x === 2 || z === 0 || z === 4;
        this.put(data, lx + x, lz + z, wy, edge ? PLANK : AIR); // hull rim, hollow deck
        this.put(data, lx + x, lz + z, wy + 1, AIR);
      }
    this.put(data, lx + 1, lz + 2, wy + 1, WOOD); // mast
    this.put(data, lx + 1, lz + 2, wy + 2, WOOD);
    this.put(data, lx + 1, lz + 2, wy + 3, PLANK); // little sail/flag
  }

  private ensureChunk(cx: number, cz: number): Uint8Array {
    const key = ck(cx, cz);
    let d = this.chunks.get(key);
    if (!d) {
      d = this.generateChunk(cx, cz);
      this.chunks.set(key, d);
    }
    return d;
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= SY) return AIR;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const d = this.ensureChunk(cx, cz);
    return d[lidx(x - cx * CHUNK, z - cz * CHUNK, y)];
  }

  /** switch to another planet: set its seed + rules and drop all cached data */
  reseed(planet: Planet) {
    SEED = planet.seed;
    PLANET = planet;
    colMemo.clear();
    this.chunks.clear();
    this.editsByChunk.clear();
    this.carvedByChunk.clear();
    this.edits.clear();
    this.dirty.clear();
  }

  /** read a block WITHOUT generating its chunk — returns -1 if not loaded */
  peek(x: number, y: number, z: number): number {
    if (y < 0 || y >= SY) return AIR;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const d = this.chunks.get(ck(cx, cz));
    if (!d) return -1;
    return d[lidx(x - cx * CHUNK, z - cz * CHUNK, y)];
  }

  /** top block of a loaded column (+ whether it's wooded), or null if unloaded */
  surfaceTop(x: number, z: number): { block: number; tree: boolean } | null {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const d = this.chunks.get(ck(cx, cz));
    if (!d) return null;
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    let block = AIR;
    let tree = false;
    for (let y = SY - 1; y >= 0; y--) {
      const b = d[lidx(lx, lz, y)];
      if (b === AIR) continue;
      if (block === AIR) block = b; // first (top) solid
      if (b === WOOD || b === LEAF) {
        tree = true;
        break;
      }
    }
    return { block, tree };
  }

  isSolid(x: number, y: number, z: number) {
    const t = this.get(x, y, z);
    return t !== AIR && t !== WATER; // water is walk-through (swimmable)
  }

  private recordEdit(cx: number, cz: number, li: number, t: number) {
    let m = this.editsByChunk.get(ck(cx, cz));
    if (!m) {
      m = new Map();
      this.editsByChunk.set(ck(cx, cz), m);
    }
    m.set(li, t);
  }

  private markDirty(cx: number, cz: number, lx: number, lz: number) {
    this.dirty.add(ck(cx, cz));
    if (lx === 0) this.dirty.add(ck(cx - 1, cz));
    if (lx === CHUNK - 1) this.dirty.add(ck(cx + 1, cz));
    if (lz === 0) this.dirty.add(ck(cx, cz - 1));
    if (lz === CHUNK - 1) this.dirty.add(ck(cx, cz + 1));
  }

  set(x: number, y: number, z: number, t: number) {
    if (y < 0 || y >= SY) return;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    const d = this.ensureChunk(cx, cz);
    const li = lidx(lx, lz, y);
    d[li] = t;
    this.recordEdit(cx, cz, li, t);
    this.edits.set(`${x},${y},${z}`, t);
    this.markDirty(cx, cz, lx, lz);
  }

  /** force a cell to AIR for a structure clearing — not a saved player edit,
   *  but persists across chunk regeneration within the session */
  carve(x: number, y: number, z: number) {
    if (y < 0 || y >= SY) return;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    const li = lidx(lx, lz, y);
    let s = this.carvedByChunk.get(ck(cx, cz));
    if (!s) {
      s = new Set();
      this.carvedByChunk.set(ck(cx, cz), s);
    }
    s.add(li);
    const d = this.chunks.get(ck(cx, cz));
    if (d) {
      d[li] = AIR;
      this.markDirty(cx, cz, lx, lz);
    }
  }

  surfaceY(x: number, z: number) {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const d = this.ensureChunk(cx, cz);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    // highest solid ground — ignore water and tree leaves so spawns land on terra firma
    for (let y = SY - 1; y >= 0; y--) {
      const t = d[lidx(lx, lz, y)];
      if (t !== AIR && t !== WATER && t !== LEAF) return y;
    }
    return 0;
  }

  takeDirty(): string[] {
    const out = [...this.dirty];
    this.dirty.clear();
    return out;
  }

  /** drop chunk data outside `keep` to bound memory (edits are preserved) */
  evict(keep: Set<string>) {
    for (const key of this.chunks.keys()) if (!keep.has(key)) this.chunks.delete(key);
  }

  serializeEdits(): number[][] {
    return [...this.edits.entries()].map(([k, t]) => {
      const [x, y, z] = k.split(",").map(Number);
      return [x, y, z, t];
    });
  }

  applyEdits(entries: number[][]) {
    for (const [x, y, z, t] of entries) {
      if (y < 0 || y >= SY) continue;
      const cx = Math.floor(x / CHUNK);
      const cz = Math.floor(z / CHUNK);
      const li = lidx(x - cx * CHUNK, z - cz * CHUNK, y);
      this.recordEdit(cx, cz, li, t);
      this.edits.set(`${x},${y},${z}`, t);
      const d = this.chunks.get(ck(cx, cz));
      if (d) {
        d[li] = t;
        this.markDirty(cx, cz, x - cx * CHUNK, z - cz * CHUNK);
      }
    }
  }
}
