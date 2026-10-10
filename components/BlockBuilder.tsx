"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global Minecraft-style creative building — works anywhere on the page.
 *   • drag on empty space      → place beveled voxel blocks. Inside the hero
 *     each block is a window onto the photo hidden behind the page, so mining
 *     the hero chips the cream away and reveals the mountains underneath.
 *   • Alt-drag (or right-drag)  → mine blocks away
 *   • Esc / Delete             → clear everything
 * The overlay never blocks links, buttons, or inputs (clicks pass through to
 * interactive elements). Fixed to the viewport, monochrome, on-palette.
 * Disabled on touch and under reduced-motion.
 */

const CELL = 22;
// the picture revealed block by block inside the hero — a portrait crop for
// phone-shaped heroes, the wide one everywhere else
const HIDDEN_IMAGE = "/mountains.jpg";
const HIDDEN_IMAGE_TALL = "/mountains-mobile.jpg";

type Block = { t: number }; // place-pop progress 0→1

export function BlockBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // touch is supported (tap to place); only skip reduced-motion

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let sx = 0; // current horizontal scroll offset
    let sy = 0; // current vertical scroll offset
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // the picture hiding behind the hero, drawn only where blocks are placed
    const img = new Image();
    let imgReady = false;
    let imgSrc = "";
    img.onload = () => {
      imgReady = true;
    };

    // swap to whichever crop suits the hero's shape (phones get the portrait one)
    const pickPhoto = () => {
      const want = heroH > 0 && w / heroH < 0.95 ? HIDDEN_IMAGE_TALL : HIDDEN_IMAGE;
      if (want === imgSrc) return;
      imgSrc = want;
      imgReady = false;
      img.src = want;
    };

    // hero rect in document coords; the image is cover-fitted to it
    let heroTop = 0;
    let heroH = 0;
    const measureHero = () => {
      const el = document.getElementById("top");
      if (!el) {
        heroH = 0;
        return;
      }
      const r = el.getBoundingClientRect();
      const top = r.top + (window.scrollY || 0);
      heroTop = top;
      heroH = r.height;
      pickPhoto();
    };

    const blocks = new Map<string, Block>();
    let painting: null | "place" | "erase" = null;
    let last: { c: number; r: number } | null = null;
    let hover: { c: number; r: number } | null = null;
    let gridA = 0;
    let raf = 0;
    let frame = 0;

    const key = (c: number, r: number) => `${c}:${r}`;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureHero();
    };
    resize();

    const isInteractive = (el: Element | null) =>
      !!el?.closest(
        'a, button, [role="button"], input, textarea, select, label, summary'
      );

    // input is in viewport coords — add scroll so cells are anchored to the
    // document (blocks live on the page, not pinned to the screen)
    const cellOf = (x: number, y: number) => ({
      c: Math.floor((x + (window.scrollX || 0)) / CELL),
      r: Math.floor((y + (window.scrollY || 0)) / CELL),
    });

    const apply = (c: number, r: number) => {
      const k = key(c, r);
      if (painting === "place") {
        if (!blocks.has(k)) blocks.set(k, { t: 0 });
      } else {
        blocks.delete(k);
      }
    };

    // place along a line so fast drags don't leave gaps
    const stroke = (a: { c: number; r: number }, b: { c: number; r: number }) => {
      const dc = b.c - a.c;
      const dr = b.r - a.r;
      const steps = Math.max(Math.abs(dc), Math.abs(dr), 1);
      for (let i = 0; i <= steps; i++) {
        apply(Math.round(a.c + (dc * i) / steps), Math.round(a.r + (dr * i) / steps));
      }
    };

    let buildPaused = false;
    // on touch we don't paint on drag (that would block scrolling) — a tap places
    // a single block instead. mouse keeps the drag-to-build behaviour.
    let touchStart: { x: number; y: number } | null = null;
    let touchScrolled = false;
    const onDown = (e: PointerEvent) => {
      if (buildPaused) return;
      if (isInteractive(e.target as Element)) return; // let the page handle it
      if (e.pointerType === "touch") {
        touchStart = { x: e.clientX, y: e.clientY };
        touchScrolled = false;
        return; // wait for the tap/scroll decision on release
      }
      if (e.button !== 0 && e.button !== 2) return;
      const erase = e.button === 2 || e.altKey;
      painting = erase ? "erase" : "place";
      const cell = cellOf(e.clientX, e.clientY);
      apply(cell.c, cell.r);
      last = cell;
      hover = cell;
      setHint(false);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        // any real movement = a scroll, not a tap → don't place
        if (
          touchStart &&
          (Math.abs(e.clientX - touchStart.x) > 10 ||
            Math.abs(e.clientY - touchStart.y) > 10)
        )
          touchScrolled = true;
        return;
      }
      const cell = cellOf(e.clientX, e.clientY);
      hover = cell;
      if (painting) {
        if (last) stroke(last, cell);
        else apply(cell.c, cell.r);
        last = cell;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        if (touchStart && !touchScrolled) {
          painting = "place";
          const cell = cellOf(touchStart.x, touchStart.y);
          apply(cell.c, cell.r);
          painting = null;
          setHint(false);
        }
        touchStart = null;
        return;
      }
      painting = null;
      last = null;
    };
    const onCancel = () => {
      // browser took over for a scroll — drop the pending tap, no block
      touchStart = null;
      touchScrolled = false;
      painting = null;
      last = null;
    };
    const onContext = (e: MouseEvent) => {
      // only suppress the native menu when erasing over our canvas area
      if (!isInteractive(e.target as Element)) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Delete") {
        if (blocks.size) {
          blocks.clear();
          e.preventDefault();
        }
      }
    };

    // The hidden picture is drawn through the blocks: neighbouring blocks sample
    // adjoining slices, so a dug-out area becomes one continuous window onto it
    // (no bevels between them — only the outer edge of the hole stays blocky).
    const drawRevealed = (
      x: number,
      y: number,
      s: number,
      docX: number,
      docY: number,
      a: number
    ) => {
      if (!imgReady || heroH <= 0) return false;
      const rel = docY - heroTop;
      if (rel + s < 0 || rel > heroH) return false; // outside the hero
      const scale = Math.max(w / img.width, heroH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const ox = (w - dw) / 2;
      const oy = (heroH - dh) / 2;
      const srcX = (docX - ox) / scale;
      const srcY = (rel - oy) / scale;
      const srcS = s / scale;
      if (srcX + srcS < 0 || srcY + srcS < 0 || srcX > img.width || srcY > img.height)
        return false;
      ctx.save();
      ctx.globalAlpha = a;
      // round outwards so adjacent blocks meet with no hairline seam
      const rx = Math.floor(x);
      const ry = Math.floor(y);
      ctx.drawImage(img, srcX, srcY, srcS, srcS, rx, ry, Math.ceil(x + s) - rx, Math.ceil(y + s) - ry);
      ctx.restore();
      return true;
    };

    const drawBlock = (c: number, r: number, t: number) => {
      const s = CELL * (0.55 + 0.45 * t);
      const cx = c * CELL + CELL / 2 - sx;
      const cy = r * CELL + CELL / 2 - sy;
      const x = cx - s / 2;
      const y = cy - s / 2;
      const a = 0.9 * t;
      const bevel = Math.max(2, s * 0.16);
      // inside the hero the block is a window onto the hidden picture; elsewhere charcoal
      if (drawRevealed(x, y, s, cx + sx - s / 2, cy + sy - s / 2, a)) return;
      ctx.fillStyle = `rgba(46, 46, 44, ${a})`;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = `rgba(124, 120, 112, ${a})`;
      ctx.fillRect(x, y, s, bevel);
      ctx.fillRect(x, y, bevel, s);
      ctx.fillStyle = `rgba(18, 18, 18, ${a})`;
      ctx.fillRect(x, y + s - bevel, s, bevel);
      ctx.fillRect(x + s - bevel, y, bevel, s);
      ctx.fillStyle = `rgba(34, 34, 34, ${a})`;
      ctx.fillRect(x + bevel, y + bevel, s - bevel * 2, s - bevel * 2);
    };

    const drawGrid = () => {
      if (gridA <= 0.01) return;
      ctx.strokeStyle = `rgba(34, 34, 34, ${0.05 * gridA})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // offset the grid by the scroll remainder so it stays aligned with blocks
      for (let x = -(sx % CELL); x <= w; x += CELL) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, h);
      }
      for (let y = -(sy % CELL); y <= h; y += CELL) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(w, Math.round(y) + 0.5);
      }
      ctx.stroke();
    };

    const tick = () => {
      sx = window.scrollX || 0;
      sy = window.scrollY || 0;
      if (frame++ % 30 === 0) measureHero();
      gridA += ((painting ? 1 : 0) - gridA) * 0.15;
      ctx.clearRect(0, 0, w, h);
      drawGrid();
      for (const [k, b] of blocks) {
        if (b.t < 1) b.t = Math.min(1, b.t + 0.16);
        const [c, r] = k.split(":").map(Number);
        drawBlock(c, r, b.t);
      }
      if (painting && hover) {
        ctx.strokeStyle = "rgba(34, 34, 34, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          hover.c * CELL + 0.5 - sx,
          hover.r * CELL + 0.5 - sy,
          CELL - 1,
          CELL - 1
        );
      }
      raf = requestAnimationFrame(tick);
    };

    const onBuildMode = (e: Event) => {
      buildPaused = !!(e as CustomEvent).detail;
      if (buildPaused) {
        painting = null;
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, w, h);
      } else if (!raf) {
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    window.addEventListener("buildmode:change", onBuildMode);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("buildmode:change", onBuildMode);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      />
      <span
        className={`pointer-events-none fixed bottom-4 left-1/2 z-40 hidden -translate-x-1/2 select-none text-[10px] uppercase tracking-[0.22em] text-gray-soft transition-opacity duration-700 sm:block ${
          hint ? "opacity-50" : "opacity-0"
        }`}
      >
        Drag to dig · alt-drag to undo · esc clears
      </span>
    </>
  );
}

export default BlockBuilder;
