/**
 * Live multiplayer presence for the shared Build Mode world.
 *
 * Each player sends a heartbeat (id + position + which planet they're on) every
 * couple of seconds; we stamp it with the moment we saw them and, when running
 * on Vercel, with the city/country the request came from (from the edge geo
 * headers). Reading back returns everyone seen in the last few seconds on the
 * same planet — so two people opening the site from different cities see each
 * other's avatar move around in real time.
 *
 * - With Upstash Redis configured, presence is a global hash → works across
 *   every serverless instance and every visitor, worldwide.
 * - Without it, an in-process Map is used. Good enough for local dev (two tabs
 *   on the same dev server), but it does NOT sync across Vercel instances —
 *   configure Redis for true global presence in production.
 */

export type Presence = {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  planet: string;
  loc: string; // human location label, e.g. "Kolkata, IN"
  t: number; // last-seen epoch ms
};

const KEY = "buildworld:presence";
const TTL = 12_000; // players unseen for this long are considered gone

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redisClient: import("@upstash/redis").Redis | null = null;
async function redis() {
  if (!hasRedis) return null;
  if (!redisClient) {
    const { Redis } = await import("@upstash/redis");
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

// in-process fallback (single instance only)
const mem = new Map<string, Presence>();

export async function heartbeat(p: Presence): Promise<void> {
  const r = await redis();
  if (r) {
    await r.hset(KEY, { [p.id]: JSON.stringify(p) });
    return;
  }
  mem.set(p.id, p);
}

export async function leave(id: string): Promise<void> {
  const r = await redis();
  if (r) {
    await r.hdel(KEY, id);
    return;
  }
  mem.delete(id);
}

/** everyone seen recently on the given planet, excluding the caller */
export async function activePlayers(
  planet: string,
  excludeId: string
): Promise<Presence[]> {
  const now = Date.now();
  const fresh: Presence[] = [];
  const stale: string[] = [];

  const r = await redis();
  if (r) {
    const h = (await r.hgetall(KEY)) as Record<string, unknown> | null;
    if (h) {
      for (const [id, v] of Object.entries(h)) {
        const p = parse(v);
        if (!p) {
          stale.push(id);
          continue;
        }
        if (now - p.t > TTL) stale.push(id);
        else if (id !== excludeId && p.planet === planet) fresh.push(p);
      }
    }
    if (stale.length) await r.hdel(KEY, ...stale);
    return fresh;
  }

  for (const [id, p] of mem) {
    if (now - p.t > TTL) mem.delete(id);
    else if (id !== excludeId && p.planet === planet) fresh.push(p);
  }
  return fresh;
}

function parse(v: unknown): Presence | null {
  try {
    const p = typeof v === "string" ? JSON.parse(v) : v;
    if (p && typeof p.id === "string" && Number.isFinite(p.t)) return p as Presence;
  } catch {
    /* corrupt entry */
  }
  return null;
}

export const presenceMode = hasRedis ? "redis" : "memory";
