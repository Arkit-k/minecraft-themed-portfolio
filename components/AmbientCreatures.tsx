"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient bitmap wildlife — original pixel-art creatures that drift across the
 * whole screen at calm intervals, layered behind the page content.
 *   • a galloping cheetah (4-phase procedural legs + pixel body)
 *   • a flying bird / small flock (2-frame wing flap)
 *   • a shooting star (bright head + dithered fading trail)
 * Monochrome charcoal, dithered/bitmap idiom (à la classic TIGER.GIF), all
 * original artwork. Paused when the tab is hidden; disabled under
 * reduced-motion and on coarse/touch pointers.
 */

const C = "34, 34, 34"; // charcoal rgb

// ---- bird sprites (face right; mirrored when flying left) ----
const BIRD_UP = [
  "#.......#",
  ".#.....#.",
  "..#...#..",
  "...#.#...",
  "....#....",
];
const BIRD_DOWN = [
  "....#....",
  "...#.#...",
  "..#...#..",
  ".#.....#.",
  "#.......#",
];

// ---- fish (face right; tail swings between the two frames) ----
const FISH_1 = [
  "......####....",
  "....########..",
  "...##########.",
  "..##########.#", // eye hole near head
  "##.##########.",
  "##..########..",
  "......####....",
];
const FISH_2 = [
  "......####....",
  "##..########..",
  "##.##########.",
  "..##########.#",
  "...##########.",
  "....########..",
  "......####....",
];

// ---- butterfly (top-ish view; wings open / mid-flap) ----
const BFLY_OPEN = [
  "##.#.##",
  "#######",
  ".#####.",
  "##.#.##",
];
const BFLY_FLAP = [
  "..#.#..",
  ".#####.",
  "..###..",
  "..#.#..",
];

type Creature =
  | {
      kind: "bird";
      x: number;
      y: number;
      vx: number;
      dir: 1 | -1;
      px: number;
      born: number;
      members: { dx: number; dy: number; fp: number; amp: number }[];
    }
  | {
      kind: "star";
      x: number;
      y: number;
      vx: number;
      vy: number;
      px: number;
      born: number;
    }
  | {
      kind: "fish";
      x: number;
      y: number;
      vx: number;
      dir: 1 | -1;
      px: number;
      born: number;
    }
  | {
      kind: "butterfly";
      x: number;
      y: number;
      vx: number;
      dir: 1 | -1;
      px: number;
      born: number;
    }
  | {
      kind: "walker";
      x: number;
      y: number;
      vx: number;
      dir: 1 | -1;
      px: number;
      born: number;
    };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function AmbientCreatures() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const creatures: Creature[] = [];
    let raf = 0;
    let lastT = performance.now() / 1000;
    let nextSpawn = lastT + rand(2, 4); // first one comes fairly soon

    // ---------- spawning ----------
    const spawn = () => {
      if (creatures.length >= 2) return;
      const r = Math.random();
      const t = performance.now() / 1000;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      if (r < 0.2) {
        // bird / small flock
        const px = rand(2.5, 3.5);
        const n = pick([1, 1, 2, 3]);
        const members = Array.from({ length: n }, (_, i) => ({
          dx: i === 0 ? 0 : rand(-70, 70),
          dy: i === 0 ? 0 : rand(-34, 34),
          fp: rand(0, Math.PI * 2),
          amp: rand(6, 14),
        }));
        creatures.push({
          kind: "bird",
          dir,
          px,
          members,
          x: dir > 0 ? -120 : W + 120,
          y: rand(H * 0.1, H * 0.42),
          vx: dir * rand(95, 150),
          born: t,
        });
      } else if (r < 0.4) {
        // butterfly — flutters along an erratic path
        const px = rand(2.5, 3.5);
        creatures.push({
          kind: "butterfly",
          dir,
          px,
          x: dir > 0 ? -40 : W + 40,
          y: rand(H * 0.18, H * 0.7),
          vx: dir * rand(55, 100),
          born: t,
        });
      } else if (r < 0.6) {
        // fish — swims with a vertical bob + bubbles
        const px = rand(3, 4);
        creatures.push({
          kind: "fish",
          dir,
          px,
          x: dir > 0 ? -14 * px - 20 : W + 20,
          y: rand(H * 0.45, H * 0.78),
          vx: dir * rand(80, 140),
          born: t,
        });
      } else if (r < 0.8) {
        // human walking a leashed dog while waving
        const px = rand(3.5, 4.5);
        creatures.push({
          kind: "walker",
          dir,
          px,
          x: dir > 0 ? -16 * px : W + 16 * px,
          y: rand(H * 0.66, H * 0.85),
          vx: dir * rand(45, 72),
          born: t,
        });
      } else {
        // shooting star
        const toRight = Math.random() < 0.5;
        const speed = rand(420, 620);
        const ang = rand(0.5, 0.85); // downward diagonal
        creatures.push({
          kind: "star",
          px: 3,
          x: toRight ? rand(W * 0.05, W * 0.35) : rand(W * 0.65, W * 0.95),
          y: rand(-20, H * 0.1),
          vx: (toRight ? 1 : -1) * speed * Math.cos(ang),
          vy: speed * Math.sin(ang),
          born: t,
        });
      }
    };

    // ---------- drawing helpers ----------
    const drawMap = (
      map: string[],
      x: number,
      y: number,
      px: number,
      dir: 1 | -1,
      alpha: number
    ) => {
      const w = map[0].length;
      ctx.fillStyle = `rgba(${C}, ${alpha})`;
      for (let r = 0; r < map.length; r++) {
        const row = map[r];
        for (let c = 0; c < w; c++) {
          if (row[c] !== "#") continue;
          const gx = dir > 0 ? c : w - 1 - c;
          ctx.fillRect(Math.round(x + gx * px), Math.round(y + r * px), px + 0.6, px + 0.6);
        }
      }
    };

    const drawBird = (cr: Extract<Creature, { kind: "bird" }>, t: number) => {
      for (const m of cr.members) {
        const flap = Math.sin((t - cr.born) * 11 + m.fp) > 0 ? BIRD_UP : BIRD_DOWN;
        const wob = Math.sin((t - cr.born) * 1.6 + m.fp) * m.amp;
        drawMap(flap, cr.x + m.dx, cr.y + m.dy + wob, cr.px, cr.dir, 0.62);
      }
    };

    const drawStar = (cr: Extract<Creature, { kind: "star" }>) => {
      const sp = Math.hypot(cr.vx, cr.vy) || 1;
      const nx = cr.vx / sp;
      const ny = cr.vy / sp;
      const len = 20;
      const step = cr.px + 0.5;
      for (let i = len; i >= 0; i--) {
        if (i % 4 === 3) continue; // dither gaps in the trail
        const a = (1 - i / len) * 0.85;
        if (a <= 0) continue;
        const gx = Math.round((cr.x - nx * i * step) / cr.px) * cr.px;
        const gy = Math.round((cr.y - ny * i * step) / cr.px) * cr.px;
        const s = i < len * 0.25 ? cr.px + 1 : cr.px;
        ctx.fillStyle = `rgba(${C}, ${a})`;
        ctx.fillRect(gx, gy, s, s);
      }
      // bright head
      ctx.fillStyle = `rgba(${C}, 0.95)`;
      ctx.fillRect(Math.round(cr.x) - 1, Math.round(cr.y) - 1, cr.px + 2, cr.px + 2);
    };

    const drawFish = (cr: Extract<Creature, { kind: "fish" }>, t: number) => {
      const e = t - cr.born;
      const frame = Math.sin(e * 8) > 0 ? FISH_1 : FISH_2;
      const y = cr.y + Math.sin(e * 1.8) * 10;
      drawMap(frame, cr.x, y, cr.px, cr.dir, 0.68);
      // a few rising bubbles drifting from the mouth
      const mouthX = cr.x + (cr.dir > 0 ? 14 : 0) * cr.px;
      ctx.fillStyle = `rgba(${C}, 0.38)`;
      for (let i = 0; i < 3; i++) {
        const bp = (e * 0.7 + i * 0.37) % 1;
        const bx = mouthX + cr.dir * (3 + i * 5) * cr.px;
        const by = y - bp * 16 + 6;
        ctx.fillRect(Math.round(bx), Math.round(by), Math.max(1, cr.px - 1), Math.max(1, cr.px - 1));
      }
    };

    const drawButterfly = (cr: Extract<Creature, { kind: "butterfly" }>, t: number) => {
      const e = t - cr.born;
      const frame = Math.sin(e * 16) > 0 ? BFLY_OPEN : BFLY_FLAP;
      const y = cr.y + Math.sin(e * 3) * 20 + Math.sin(e * 7.3) * 7;
      drawMap(frame, cr.x, y, cr.px, cr.dir, 0.58);
    };

    const drawWalker = (cr: Extract<Creature, { kind: "walker" }>, t: number) => {
      const { px, dir } = cr;
      const wp = (t - cr.born) * 7; // walk cycle
      const wave = (t - cr.born) * 6; // waving oscillation
      const bob = Math.abs(Math.sin(wp)) * 0.35;
      const fx = cr.x;
      const fy = cr.y; // feet baseline
      const toX = (gx: number) => fx + (dir > 0 ? gx : -gx) * px;
      const toY = (gy: number) => fy + (gy + bob) * px; // up = negative gy
      const cell = (gx: number, gy: number) =>
        ctx.fillRect(Math.round(toX(gx)), Math.round(toY(gy)), px + 0.6, px + 0.6);
      const plot = (ax: number, ay: number, bx: number, by: number) => {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5);
        for (let i = 0; i <= n; i++)
          cell(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
      };

      ctx.fillStyle = `rgba(${C}, 0.72)`;

      // ----- dog (ahead of the human) -----
      const dogX = 8;
      plot(dogX - 2.5, -2, dogX + 2, -2); // back
      plot(dogX - 2.5, -1.3, dogX + 2, -1.3); // belly
      cell(dogX + 2.5, -2.2); // head
      cell(dogX + 3, -2.2);
      cell(dogX + 3, -1.5); // snout
      cell(dogX + 2.7, -3); // ear
      plot(dogX - 2.5, -2, dogX - 3.4, -3.1); // tail up
      const dlp = wp * 1.2;
      [dogX - 2, dogX - 1, dogX + 1, dogX + 2].forEach((lx, i) => {
        const th = 0.5 * Math.sin(dlp + i * Math.PI);
        plot(lx, -1.2, lx + Math.sin(th) * 1.4, -1.2 + Math.cos(th) * 1.4);
      });

      // ----- human -----
      const hipY = -6;
      const shY = -11;
      // legs (walking)
      [0, Math.PI].forEach((ph) => {
        const th1 = 0.5 * Math.sin(wp + ph);
        const kx = Math.sin(th1) * 3;
        const ky = hipY + Math.cos(th1) * 3;
        const th2 = th1 * 0.25;
        const ftx = kx + Math.sin(th2) * 3;
        const fty = ky + Math.cos(th2) * 3;
        plot(0, hipY, kx, ky);
        plot(kx, ky, ftx, fty);
      });
      // torso (2px wide)
      plot(0, hipY, 0, shY);
      plot(0.5, hipY, 0.5, shY);
      // shoulders + neck + head
      plot(-0.6, shY, 0.8, shY);
      plot(0.2, shY, 0.2, -12.5);
      ctx.fillRect(Math.round(toX(-0.6)), Math.round(toY(-14.2)), px * 1.7, px * 1.7);

      // leash arm (front, reaching down toward the dog)
      const laTh = 0.95 + 0.08 * Math.sin(wp);
      const laEx = Math.sin(laTh) * 2.4;
      const laEy = shY + Math.cos(laTh) * 2.4;
      const handX = laEx + Math.sin(1.15) * 2.4;
      const handY = laEy + Math.cos(1.15) * 2.4;
      plot(0, shY, laEx, laEy);
      plot(laEx, laEy, handX, handY);

      // wave arm (back, raised high, hand oscillating)
      const waTh1 = Math.PI + 0.25;
      const waEx = Math.sin(waTh1) * 2.4;
      const waEy = shY + Math.cos(waTh1) * 2.4;
      const waTh2 = Math.PI - 0.5 + 0.6 * Math.sin(wave);
      const waHx = waEx + Math.sin(waTh2) * 2.4;
      const waHy = waEy + Math.cos(waTh2) * 2.4;
      plot(0, shY, waEx, waEy);
      plot(waEx, waEy, waHx, waHy);

      // ----- leash as a little chain from hand to dog collar -----
      const colX = dogX + 2;
      const colY = -2.6;
      const midX = (handX + colX) / 2;
      const midY = (handY + colY) / 2 + 1.2; // slack sag
      const chain = (ax: number, ay: number, bx: number, by: number) => {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5);
        for (let i = 0; i <= n; i++)
          if (i % 2 === 0)
            cell(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
      };
      chain(handX, handY, midX, midY);
      chain(midX, midY, colX, colY);
    };

    // ---------- loop ----------
    const tick = () => {
      const t = performance.now() / 1000;
      const dt = Math.min(t - lastT, 0.05);
      lastT = t;

      if (t >= nextSpawn) {
        spawn();
        nextSpawn = t + rand(8, 15);
      }

      // update + cull
      const M = 160;
      for (let i = creatures.length - 1; i >= 0; i--) {
        const cr = creatures[i];
        cr.x += cr.vx * dt;
        if (cr.kind === "star") {
          cr.y += cr.vy * dt;
          if (cr.y > H + M || cr.x < -M || cr.x > W + M) creatures.splice(i, 1);
        } else {
          const off = cr.kind === "walker" ? 18 * cr.px + M : 160;
          if (cr.x > W + off || cr.x < -off) creatures.splice(i, 1);
        }
      }

      ctx.clearRect(0, 0, W, H);
      for (const cr of creatures) {
        if (cr.kind === "bird") drawBird(cr, t);
        else if (cr.kind === "fish") drawFish(cr, t);
        else if (cr.kind === "butterfly") drawButterfly(cr, t);
        else if (cr.kind === "walker") drawWalker(cr, t);
        else drawStar(cr);
      }
      raf = requestAnimationFrame(tick);
    };

    let buildPaused = false;
    const onVisibility = () => {
      if (document.hidden || buildPaused) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        lastT = performance.now() / 1000;
        raf = requestAnimationFrame(tick);
      }
    };
    const onBuildMode = (e: Event) => {
      buildPaused = !!(e as CustomEvent).detail;
      if (buildPaused) {
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, W, H);
      } else if (!document.hidden) {
        lastT = performance.now() / 1000;
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("buildmode:change", onBuildMode);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("buildmode:change", onBuildMode);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}

export default AmbientCreatures;
