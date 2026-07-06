/**
 * Server-side persistence for the shared Build Mode world.
 *
 * Two maps, both merging naturally across players (last write wins per cell):
 *   • edits — block changes, "x,y,z" -> blockType
 *   • props — placed features that aren't blocks (campfires), "x,y,z" -> kind
 *
 * - If Upstash Redis env vars are present, everything lives there → truly global
 *   & permanent once the site is deployed.
 * - Otherwise it falls back to JSON files on disk, which persist locally across
 *   dev restarts (good enough to develop/preview against).
 */

import { promises as fs } from "fs";
import path from "path";

export type Edit = [number, number, number, number]; // x, y, z, type
export type Prop = [number, number, number, number]; // x, y, z, kind

const EDITS_KEY = "buildworld:edits";
const PROPS_KEY = "buildworld:props";
const EDITS_FILE = path.join(process.cwd(), ".buildworld.json");
const PROPS_FILE = path.join(process.cwd(), ".buildprops.json");

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// lazily create the redis client only when configured
let redisClient: import("@upstash/redis").Redis | null = null;
async function redis() {
  if (!hasRedis) return null;
  if (!redisClient) {
    const { Redis } = await import("@upstash/redis");
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

function toTuples(obj: Record<string, unknown>): Edit[] {
  const out: Edit[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const [x, y, z] = k.split(",").map(Number);
    out.push([x, y, z, Number(v)]);
  }
  return out;
}

// generic get/add over a hash (Redis) or JSON file (fallback)
async function getMap(key: string, file: string): Promise<Edit[]> {
  const r = await redis();
  if (r) {
    const h = (await r.hgetall(key)) as Record<string, unknown> | null;
    return h ? toTuples(h) : [];
  }
  try {
    const raw = await fs.readFile(file, "utf8");
    return toTuples(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return [];
  }
}

async function addMap(
  key: string,
  file: string,
  batch: Edit[]
): Promise<number> {
  if (!batch.length) return 0;
  const map: Record<string, number> = {};
  for (const [x, y, z, t] of batch) map[`${x},${y},${z}`] = t;

  const r = await redis();
  if (r) {
    await r.hset(key, map);
    return batch.length;
  }
  // file fallback: read-modify-write. On a read-only host (e.g. Vercel without
  // Redis) the write throws — swallow it so edits just don't persist, no 500.
  let obj: Record<string, number> = {};
  try {
    obj = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    /* first write */
  }
  Object.assign(obj, map);
  try {
    await fs.writeFile(file, JSON.stringify(obj));
  } catch {
    /* read-only filesystem (no Redis configured) — accept non-persistence */
  }
  return batch.length;
}

export const getEdits = () => getMap(EDITS_KEY, EDITS_FILE);
export const addEdits = (batch: Edit[]) => addMap(EDITS_KEY, EDITS_FILE, batch);
export const getProps = () => getMap(PROPS_KEY, PROPS_FILE);
export const addProps = (batch: Prop[]) => addMap(PROPS_KEY, PROPS_FILE, batch);

export const persistenceMode = hasRedis ? "redis" : "file";
