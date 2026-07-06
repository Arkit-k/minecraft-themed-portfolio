import { NextResponse } from "next/server";
import {
  getEdits,
  addEdits,
  getProps,
  addProps,
  persistenceMode,
  type Edit,
} from "@/lib/worldStore";

export const runtime = "nodejs"; // needs fs for the local fallback
export const dynamic = "force-dynamic";

export async function GET() {
  const [edits, props] = await Promise.all([getEdits(), getProps()]);
  return NextResponse.json({ edits, props, mode: persistenceMode });
}

function clean(raw: unknown): Edit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (e): e is Edit =>
        Array.isArray(e) && e.length === 4 && e.every((n) => Number.isFinite(n))
    )
    .slice(0, 4000); // cap a single batch
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const b = body as { edits?: unknown; props?: unknown };
  const edits = clean(b?.edits);
  const props = clean(b?.props);
  if (!edits.length && !props.length) {
    return NextResponse.json({ ok: false, error: "nothing to add" }, { status: 400 });
  }
  const [ec, pc] = await Promise.all([addEdits(edits), addProps(props)]);
  return NextResponse.json({ ok: true, edits: ec, props: pc });
}
