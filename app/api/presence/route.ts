import { NextResponse } from "next/server";
import {
  heartbeat,
  leave,
  activePlayers,
  presenceMode,
  type Presence,
} from "@/lib/presenceStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build a friendly "City, CC" label from Vercel's edge geo headers. Falls back
// gracefully when they're absent (local dev / non-Vercel hosts).
function locationOf(req: Request): string {
  const h = req.headers;
  const dec = (v: string | null) => {
    if (!v) return "";
    try {
      return decodeURIComponent(v).trim();
    } catch {
      return v.trim();
    }
  };
  const city = dec(h.get("x-vercel-ip-city"));
  const region = dec(h.get("x-vercel-ip-country-region"));
  const country = dec(h.get("x-vercel-ip-country"));
  const parts = [city, country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (region || country) return [region, country].filter(Boolean).join(", ");
  return "Somewhere";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  // a leaving player just removes itself
  if (b?.leave && typeof b.id === "string") {
    await leave(b.id);
    return NextResponse.json({ ok: true });
  }

  const id = typeof b?.id === "string" ? b.id.slice(0, 64) : "";
  const planet = typeof b?.planet === "string" ? b.planet.slice(0, 32) : "Terra";
  const nums = ["x", "y", "z", "yaw"].map((k) => Number(b?.[k]));
  if (!id || nums.some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ ok: false, error: "bad presence" }, { status: 400 });
  }
  const [x, y, z, yaw] = nums;

  const me: Presence = {
    id,
    x,
    y,
    z,
    yaw,
    planet,
    loc: locationOf(req),
    t: Date.now(),
  };
  await heartbeat(me);

  // one round-trip does both: report myself, get everyone else back
  const players = await activePlayers(planet, id);
  return NextResponse.json({ ok: true, you: { loc: me.loc }, players, mode: presenceMode });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const planet = url.searchParams.get("planet") || "Terra";
  const id = url.searchParams.get("id") || "";
  const players = await activePlayers(planet, id);
  return NextResponse.json({ players, mode: presenceMode });
}
