"use client";

import { useEffect, useRef } from "react";

type Particle = {
  bx: number; // base (target) x in normalized [0,1]
  by: number; // base (target) y in normalized [0,1]
  x: number; // current px
  y: number; // current px
  vx: number;
  vy: number;
  size: number; // base radius
  alpha: number; // 0..1 from source brightness
  phase: number; // breathing phase
  freq: number; // breathing frequency
  amp: number; // drift amplitude px
};

const SAMPLE_SRC = "/hero-sample.png";
const CHARCOAL = "34, 34, 34"; // rgb of #222222

export function ParticleHero({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let t = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    // image fit rect within canvas (contain), in CSS px
    let fit = { x: 0, y: 0, w: 0, h: 0 };

    const pointer = { x: -9999, y: -9999, active: false };
    const REPEL_RADIUS = 110;
    const REPEL_FORCE = 0.9;

    function layout() {
      const rect = wrap!.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function computeFit(imgW: number, imgH: number) {
      // contain the source aspect ratio inside the canvas, then zoom toward the
      // subject (the orb + cat) so the portrait reads with presence, not as a
      // small cluster floating in whitespace.
      const cr = W / H;
      const ir = imgW / imgH;
      let w: number;
      let h: number;
      if (ir > cr) {
        w = W;
        h = W / ir;
      } else {
        h = H;
        w = H * ir;
      }
      const ZOOM = 1.42;
      const fx = 0.52; // focal point x (orb sits slightly right of center)
      const fy = 0.46; // focal point y (slightly above center)
      w *= ZOOM;
      h *= ZOOM;
      // map the focal point of the artwork onto the centre of the canvas
      fit = { x: W * 0.5 - fx * w, y: H * 0.5 - fy * h, w, h };
    }

    function build(img: HTMLImageElement) {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      const off = document.createElement("canvas");
      off.width = sw;
      off.height = sh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0);
      const data = octx.getImageData(0, 0, sw, sh).data;

      computeFit(sw, sh);

      // sample step scales with viewport — denser on large screens, lighter on mobile
      const targetAcross = W < 640 ? 130 : W < 1100 ? 180 : 230;
      const step = Math.max(1, Math.floor(sw / targetAcross));

      const next: Particle[] = [];
      for (let sy = 0; sy < sh; sy += step) {
        for (let sx = 0; sx < sw; sx += step) {
          const i = (sy * sw + sx) * 4;
          // grayscale source: use red channel as brightness
          const b = data[i] / 255;
          // background of reference is near-black; skip only the true void so the
          // cat's mid-tone fur and hand still register as faint dots.
          if (b < 0.08) continue;
          // gentle contrast curve — lifts highlights, keeps shadows restrained
          const w = Math.pow(b, 0.85);
          // subtle jitter so the grid never looks mechanical
          const jx = (Math.random() - 0.5) * step * 0.7;
          const jy = (Math.random() - 0.5) * step * 0.7;
          const bx = (sx + jx) / sw;
          const by = (sy + jy) / sh;
          next.push({
            bx,
            by,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: 0.45 + w * 1.7,
            alpha: 0.14 + w * 0.78,
            phase: Math.random() * Math.PI * 2,
            freq: 0.3 + Math.random() * 0.5,
            amp: 0.5 + Math.random() * 1.2,
          });
        }
      }
      particles = next;
      // seed current positions at base
      for (const p of particles) {
        p.x = fit.x + p.bx * fit.w;
        p.y = fit.y + p.by * fit.h;
      }
    }

    function targetOf(p: Particle) {
      return {
        tx: fit.x + p.bx * fit.w,
        ty: fit.y + p.by * fit.h,
      };
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      const breath = reduceMotion ? 0 : 1;
      for (let k = 0; k < particles.length; k++) {
        const p = particles[k];
        const { tx, ty } = targetOf(p);

        // gentle breathing drift around the target
        const driftX =
          breath * Math.cos(t * p.freq + p.phase) * p.amp;
        const driftY =
          breath * Math.sin(t * p.freq * 0.9 + p.phase) * p.amp;
        const homeX = tx + driftX;
        const homeY = ty + driftY;

        // spring back toward home
        p.vx += (homeX - p.x) * 0.06;
        p.vy += (homeY - p.y) * 0.06;

        // pointer repulsion
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          const r2 = REPEL_RADIUS * REPEL_RADIUS;
          if (d2 < r2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / REPEL_RADIUS) * REPEL_FORCE;
            p.vx += (dx / d) * f * 6;
            p.vy += (dy / d) * f * 6;
          }
        }

        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;

        const r = p.size * (1 + (breath ? 0.12 * Math.sin(t * 0.8 + p.phase) : 0));
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, Math.max(0.3, r), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${CHARCOAL}, ${p.alpha})`;
        ctx!.fill();
      }
    }

    function loop() {
      t += 0.016;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      if (reduceMotion) {
        draw();
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }
    function onPointerLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    // load + init
    const img = new Image();
    img.decoding = "async";
    img.src = SAMPLE_SRC;

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.05 }
    );

    let ready = false;
    img.onload = () => {
      layout();
      build(img);
      ready = true;
      io.observe(wrap!);
      start();
    };

    const ro = new ResizeObserver(() => {
      if (!ready) return;
      layout();
      build(img);
      if (reduceMotion) draw();
    });
    ro.observe(wrap!);

    // listen on window so the cursor effect works even when the artwork is a
    // pointer-events-none backdrop (the element itself never gets the events)
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default ParticleHero;
