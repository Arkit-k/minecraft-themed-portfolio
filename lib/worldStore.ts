/**
 * Server-side persistence for the shared Build Mode world. Stores user edits as
 * a global key→type map ("x,y,z" -> blockType), so it merges naturally across
 * players (last write wins per cell).
 *
 * - If Upstash Redis env vars are present, edits live there → truly global &
 *   permanent once the site is deployed.
 * - Otherwise it falls back to a JSON file on disk, which persists locally
 *   across dev restarts (good enough to develop/preview against).
 */

import { promises as fs } from "fs";
import path from "path";

export type Edit = [number, number, number, number]; // x, y, z, type

const HASH_KEY = "buildworld:edits";
const FILE = path.join(process.cwd(), ".buildworld.json");

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

function toEdits(obj: Record<string, unknown>): Edit[] {
  const out: Edit[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const [x, y, z] = k.split(",").map(Number);
    out.push([x, y, z, Number(v)]);
  }
  return out;
}

export async function getEdits(): Promise<Edit[]> {
  const r = await redis();
  if (r) {
    const h = (await r.hgetall(HASH_KEY)) as Record<string, unknown> | null;
    return h ? toEdits(h) : [];
  }
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return toEdits(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return [];
  }
}

export async function addEdits(batch: Edit[]): Promise<number> {
  if (!batch.length) return 0;
  const map: Record<string, number> = {};
  for (const [x, y, z, t] of batch) map[`${x},${y},${z}`] = t;

  const r = await redis();
  if (r) {
    await r.hset(HASH_KEY, map);
    return batch.length;
  }
  // file fallback: read-modify-write
  let obj: Record<string, number> = {};
  try {
    obj = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    /* first write */
  }
  Object.assign(obj, map);
  await fs.writeFile(FILE, JSON.stringify(obj));
  return batch.length;
}

export const persistenceMode = hasRedis ? "redis" : "file";
