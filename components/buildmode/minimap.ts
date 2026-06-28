/**
 * Maps — a small always-on minimap (top-left) plus a big full-screen map toggled
 * with M. Both sample the world top-down around the player and colour it by
 * terrain/structure. Reads are NON-generating (`world.surfaceTop`): only loaded
 * chunks are drawn, unexplored cells render dark, so opening the big map is
 * instant and never freezes generating distant terrain. The heavy sampling is
 * throttled to an offscreen canvas; the player marker composites every frame.
 */

import {
  World,
  WATER,
  GRASS,
  DIRT,
  STONE,
  SAND,
  SNOW,
  PLANK,
  WOOD,
  ROAD,
} from "./world";

const SMALL = { size: 150, cell: 3, step: 3 }; // ~150-block view
const BIG = { size: 260, cell: 2, step: 2 }; // ~260-block view, scaled up by CSS
const REFRESH = 0.4; // seconds between resamples
const UNEXPLORED = "#3a3836";

function colorFor(top: number, hasTree: boolean): string {
  if (hasTree) return "#525c46"; // forest canopy
  switch (top) {
    case WATER:
      return "#b7c2c6";
    case SAND:
      return "#d8d0bd";
    case GRASS:
      return "#8f9a7a";
    case DIRT:
      return "#9c8f76";
    case STONE:
      return "#74746f"; // mountain / building
    case SNOW:
      return "#eef0ea";
    case PLANK:
      return "#b9863f"; // structures
    case WOOD:
      return "#7c6a4a";
    case ROAD:
      return "#54544f";
    default:
      return "#86867f";
  }
}

type Pane = {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  off: HTMLCanvasElement;
  octx: CanvasRenderingContext2D;
  acc: number;
};

export class Minimap {
  private world: World;
  private small: Pane;
  private big: Pane | null = null;
  private bigOpen = false;
  private markers: { x: number; z: number }[] = [];

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.world = world;
    this.small = this.makePane(canvas, SMALL.size);
  }

  setMarkers(markers: { x: number; z: number }[]) {
    this.markers = markers;
  }

  private drawMarkers(
    ctx: CanvasRenderingContext2D,
    cfg: { size: number; cell: number; step: number },
    px: number,
    pz: number
  ) {
    const ppw = cfg.cell / cfg.step; // pixels per world block
    const big = cfg.size > 200;
    const r = big ? 8 : 5;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const m of this.markers) {
      // clamp to the map edge so an off-view launch centre still points the way
      const sx = Math.max(r, Math.min(cfg.size - r, cfg.size / 2 + (m.x - px) * ppw));
      const sy = Math.max(r, Math.min(cfg.size - r, cfg.size / 2 + (m.z - pz) * ppw));
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill(); // bright ring backing
      ctx.beginPath();
      ctx.arc(sx, sy, r - 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff7a2e"; // vivid launch-centre orange
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `bold ${big ? 10 : 7}px system-ui, sans-serif`;
      ctx.fillText("R", sx, sy + 0.5);
    }
  }

  private makePane(cv: HTMLCanvasElement, size: number): Pane {
    cv.width = size;
    cv.height = size;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    return {
      cv,
      ctx: cv.getContext("2d")!,
      off,
      octx: off.getContext("2d")!,
      acc: REFRESH,
    };
  }

  setBig(canvas: HTMLCanvasElement | null) {
    this.big = canvas ? this.makePane(canvas, BIG.size) : null;
  }

  setOpen(open: boolean) {
    this.bigOpen = open;
    if (open && this.big) this.big.acc = REFRESH; // resample immediately
  }

  private sample(
    octx: CanvasRenderingContext2D,
    cfg: { size: number; cell: number; step: number },
    px: number,
    pz: number
  ) {
    const grid = Math.floor(cfg.size / cfg.cell);
    const half = (grid * cfg.step) / 2;
    for (let cy = 0; cy < grid; cy++) {
      for (let cx = 0; cx < grid; cx++) {
        const wx = Math.floor(px - half + cx * cfg.step);
        const wz = Math.floor(pz - half + cy * cfg.step);
        const s = this.world.surfaceTop(wx, wz);
        octx.fillStyle = s ? colorFor(s.block, s.tree) : UNEXPLORED;
        octx.fillRect(cx * cfg.cell, cy * cfg.cell, cfg.cell, cfg.cell);
      }
    }
  }

  private drawMarker(ctx: CanvasRenderingContext2D, size: number, yaw: number) {
    const mid = size / 2;
    const dx = -Math.sin(yaw);
    const dz = -Math.cos(yaw); // world forward → +z is screen-down
    const r = size > 200 ? 11 : 7;
    ctx.save();
    ctx.translate(mid, mid);
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(dx * r, dz * r);
    ctx.lineTo(-dz * r * 0.55 - dx * r * 0.55, dx * r * 0.55 - dz * r * 0.55);
    ctx.lineTo(dz * r * 0.55 - dx * r * 0.55, -dx * r * 0.55 - dz * r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  update(dt: number, player: { x: number; z: number }, yaw: number) {
    // small map — always on
    this.small.acc += dt;
    if (this.small.acc >= REFRESH) {
      this.small.acc = 0;
      this.sample(this.small.octx, SMALL, player.x, player.z);
    }
    this.small.ctx.clearRect(0, 0, SMALL.size, SMALL.size);
    this.small.ctx.drawImage(this.small.off, 0, 0);
    this.drawMarkers(this.small.ctx, SMALL, player.x, player.z);
    this.drawMarker(this.small.ctx, SMALL.size, yaw);

    // big map — only while open
    if (this.bigOpen && this.big) {
      this.big.acc += dt;
      if (this.big.acc >= REFRESH) {
        this.big.acc = 0;
        this.sample(this.big.octx, BIG, player.x, player.z);
      }
      const c = this.big.ctx;
      c.clearRect(0, 0, BIG.size, BIG.size);
      c.drawImage(this.big.off, 0, 0);
      this.drawMarkers(c, BIG, player.x, player.z);
      this.drawMarker(c, BIG.size, yaw);
      // North indicator (top centre)
      c.fillStyle = "rgba(34,34,34,0.85)";
      c.font = "bold 13px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText("N", BIG.size / 2, 14);
    }
  }

  dispose() {
    // canvases are owned by React; nothing GPU-bound to free
  }
}
