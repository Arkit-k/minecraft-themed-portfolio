import { NextResponse } from "next/server";
import { getEdits, addEdits, persistenceMode, type Edit } from "@/lib/worldStore";

export const runtime = "nodejs"; // needs fs for the local fallback
export const dynamic = "force-dynamic";

export async function GET() {
  const edits = await getEdits();
  return NextResponse.json({ edits, mode: persistenceMode });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const raw = (body as { edits?: unknown })?.edits;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ ok: false, error: "no edits" }, { status: 400 });
  }
  const clean: Edit[] = raw
    .filter(
      (e): e is Edit =>
        Array.isArray(e) && e.length === 4 && e.every((n) => Number.isFinite(n))
    )
    .slice(0, 4000); // cap a single batch
  const count = await addEdits(clean);
  return NextResponse.json({ ok: true, count });
}
