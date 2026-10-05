import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// kept outside /public so there is no static URL to open or save
const FILE = path.join(process.cwd(), "private", "audio", "intro.m4a");

// bytes per response, so the song arrives in pieces as it plays instead of as one download
const CHUNK = 1024 * 1024;

// Only the page's own <audio> element may fetch the song. Opening the URL in a tab sends
// Sec-Fetch-Dest: document, and a hotlink comes from another site. Browsers that don't send
// fetch-metadata headers fall back to a same-origin Referer check.
function isOwnAudioElement(req: NextRequest) {
  const dest = req.headers.get("sec-fetch-dest");
  if (dest) return dest === "audio" && req.headers.get("sec-fetch-site") === "same-origin";
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!isOwnAudioElement(req)) return new Response("Forbidden", { status: 403 });

  let size: number;
  try {
    size = (await fs.stat(FILE)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  // media elements always ask for byte ranges; a plain full-file request is refused
  const match = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  let start: number;
  let end: number;
  if (match[1] === "") {
    // suffix range: the last N bytes
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  end = Math.min(end, start + CHUNK - 1, size - 1);

  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const body = Readable.toWeb(createReadStream(FILE, { start, end })) as ReadableStream<Uint8Array>;

  return new Response(body, {
    status: 206,
    headers: {
      "Content-Type": "audio/mp4",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store, private",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
