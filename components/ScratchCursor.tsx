"use client";

import { useEffect, useRef } from "react";

/**
 * A Minecraft-flavoured "mining" cursor for fine-pointer devices.
 *   • the cursor is a small pixel-art hammer
 *   • clicking / holding swings the hammer and chips charcoal "scratch"
 *     cracks into the surface that deepen where you mine and fade away
 * Stays monochrome (charcoal / graphite) to fit the cream editorial palette.
 * Disabled on touch and under reduced-motion (native cursor stays).
 */

const BLOCK = 14; // pixel-grid the cracks snap to
const SCRATCH_ALPHA = 0.18; // peak darkness of a fresh crack
const DECAY = 0.012; // life lost per frame (~1.4s to fade)
const MAX_SCRATCHES = 600;
const PX = 2.5; // size of one hammer "pixel"
const FOLLOW = 9; // cursor glide speed — lower = slower, more trailing
const SWING_DECAY = 5.4; // swing recoil per second

// Pixel-art hammer: head up-left, handle down-right (Minecraft tool angle).
// H = dark head, h = head highlight, W = handle.
const HAMMER = [
  "................",
  ".HHHHHH.........",
  ".HhhhhH.........",
  ".HhhhhH.........",
  ".HhhhhH.........",
  ".HHHHHHW........",
  "....HHWW........",
  ".....WWW........",
  "......WWW.......",
  ".......WWW......",
  ".......WWW......",
  "........WWW.....",
  ".........WWW....",
  ".........WWW....",
  "..........WW....",
  "................",
];
const HAMMER_COLS = 16;
// strike point (where the head meets the surface), in grid cells
const HOT_C = 5;
const HOT_R = 6;

type Scratch = { gx: number; gy: number; life: number; depth: number };

// cheap deterministic hash so each grid cell chips the same way every time
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function ScratchCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    document.documentElement.classList.add("has-scratch-cursor");

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const scratches: Scratch[] = [];
    const cellIndex = new Map<string, Scratch>();

    let tx = -100;
    let ty = -100;
    let cx = -100; // eased cursor position
    let cy = -100;
    let lastGX = Infinity;
    let lastGY = Infinity;
    let shown = false;
    let down = false;
    let swing = 0; // 1 right after a strike, eases to 0
    let frame = 0;
    let raf = 0;
    let lastT = performance.now();

    const addScratch = (gx: number, gy: number, boost: number) => {
      const key = `${gx}:${gy}`;
      const existing = cellIndex.get(key);
      if (existing && existing.life > 0.15) {
        existing.life = 1; // re-mining the same spot deepens the crack
        existing.depth = Math.min(existing.depth + boost, 3);
        return;
      }
      const s: Scratch = { gx, gy, life: 1, depth: boost };
      scratches.push(s);
      cellIndex.set(key, s);
      if (scratches.length > MAX_SCRATCHES) scratches.shift();
    };

    // chip a burst of cracks around the strike point
    const strikeAt = (px: number, py: number, power: number) => {
      const gx = Math.floor(px / BLOCK);
      const gy = Math.floor(py / BLOCK);
      addScratch(gx, gy, power);
      addScratch(gx + 1, gy, power * 0.6);
      addScratch(gx - 1, gy, power * 0.5);
      addScratch(gx, gy + 1, power * 0.6);
      addScratch(gx, gy - 1, power * 0.4);
    };

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        cx = tx;
        cy = ty;
      }
    };
    const onLeave = () => {
      shown = false;
    };
    const onDown = () => {
      down = true;
      swing = 1;
      strikeAt(cx, cy, 2.4); // solid first hit
      lastGX = Math.floor(cx / BLOCK);
      lastGY = Math.floor(cy / BLOCK);
    };
    const onUp = () => {
      down = false;
    };

    const drawScratch = (s: Scratch) => {
      const ox = s.gx * BLOCK;
      const oy = s.gy * BLOCK;
      const a = s.life * SCRATCH_ALPHA;
      ctx.fillStyle = `rgba(34, 34, 34, ${a})`;
      const chips = 2 + Math.round(s.depth) + Math.floor(hash(s.gx, s.gy) * 2);
      let px = ox + BLOCK / 2;
      let py = oy + BLOCK / 2;
      const sub = BLOCK / 4;
      for (let i = 0; i < chips; i++) {
        const r = hash(s.gx + i * 1.3, s.gy - i * 2.1);
        const dir = Math.floor(r * 4);
        if (dir === 0) px += sub;
        else if (dir === 1) px -= sub;
        else if (dir === 2) py += sub;
        else py -= sub;
        const sx = Math.round((px - ox) / sub) * sub + ox;
        const sy = Math.round((py - oy) / sub) * sub + oy;
        ctx.fillRect(sx, sy, sub, sub);
      }
    };

    const drawHammer = () => {
      // swing the head down-toward the strike point on click
      const angle = swing * 0.5; // radians, recoil
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle);
      // place the pixel grid so the strike cell sits at the cursor
      const ox = -HOT_C * PX;
      const oy = -HOT_R * PX;
      for (let r = 0; r < HAMMER.length; r++) {
        const row = HAMMER[r];
        for (let c = 0; c < HAMMER_COLS; c++) {
          const ch = row[c];
          if (!ch || ch === ".") continue;
          if (ch === "H") ctx.fillStyle = "rgba(34, 34, 34, 0.95)";
          else if (ch === "h") ctx.fillStyle = "rgba(98, 98, 94, 0.92)";
          else ctx.fillStyle = "rgba(120, 116, 108, 0.95)"; // handle
          ctx.fillRect(ox + c * PX, oy + r * PX, PX + 0.5, PX + 0.5);
        }
      }
      ctx.restore();
    };

    const tick = () => {
      frame++;
      // frame-rate-independent exponential smoothing: feels identical on a
      // 60Hz or 120Hz display, glides smoothly instead of snapping
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const k = 1 - Math.exp(-FOLLOW * dt);
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      if (swing > 0) swing = Math.max(0, swing - SWING_DECAY * dt);

      // mining trail: while held, chip along the path and re-strike held cells
      if (down && shown) {
        const gx = Math.floor(cx / BLOCK);
        const gy = Math.floor(cy / BLOCK);
        if (gx !== lastGX || gy !== lastGY) {
          strikeAt(cx, cy, 1.6);
          lastGX = gx;
          lastGY = gy;
        } else if (frame % 7 === 0) {
          addScratch(gx, gy, 1); // holding still keeps deepening
        }
      }

      ctx.clearRect(0, 0, w, h);

      for (let i = scratches.length - 1; i >= 0; i--) {
        const s = scratches[i];
        s.life -= DECAY;
        if (s.life <= 0) {
          cellIndex.delete(`${s.gx}:${s.gy}`);
          scratches.splice(i, 1);
          continue;
        }
        drawScratch(s);
      }

      if (shown) drawHammer();

      raf = requestAnimationFrame(tick);
    };

    const onBuildMode = (e: Event) => {
      const paused = !!(e as CustomEvent).detail;
      if (paused) {
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, w, h);
        document.documentElement.classList.remove("has-scratch-cursor");
      } else if (!raf) {
        document.documentElement.classList.add("has-scratch-cursor");
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    window.addEventListener("buildmode:change", onBuildMode);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      window.removeEventListener("buildmode:change", onBuildMode);
      document.documentElement.classList.remove("has-scratch-cursor");
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="scratch-layer" />;
}
