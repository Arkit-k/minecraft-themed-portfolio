/**
 * Simple FPS combat layer for the voxel world: blocky bots that wander, chase
 * the player when they have line-of-sight (occluded by terrain/built blocks, so
 * you can hide), and shoot at you. The player kills them with a hitscan ray.
 * All monochrome, kept small for performance.
 */

import * as THREE from "three";
import { World } from "./world";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** distance to the first solid voxel along a ray, or Infinity */
function voxelHitDist(
  world: World,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number
) {
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  let z = Math.floor(oz);
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / dx);
  const tdy = Math.abs(1 / dy);
  const tdz = Math.abs(1 / dz);
  const fx = ox - x;
  const fy = oy - y;
  const fz = oz - z;
  let tMaxX = dx === 0 ? Infinity : (dx > 0 ? 1 - fx : fx) * tdx;
  let tMaxY = dy === 0 ? Infinity : (dy > 0 ? 1 - fy : fy) * tdy;
  let tMaxZ = dz === 0 ? Infinity : (dz > 0 ? 1 - fz : fz) * tdz;
  let dist = 0;
  while (dist <= maxDist) {
    if (world.isSolid(x, y, z)) return dist;
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      dist = tMaxX;
      tMaxX += tdx;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      dist = tMaxY;
      tMaxY += tdy;
    } else {
      z += stepZ;
      dist = tMaxZ;
      tMaxZ += tdz;
    }
  }
  return Infinity;
}

/** ray vs axis-aligned box, returns entry t or -1 */
function rayAabb(
  o: THREE.Vector3,
  d: THREE.Vector3,
  min: THREE.Vector3,
  max: THREE.Vector3
) {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const ax of ["x", "y", "z"] as const) {
    const inv = 1 / d[ax];
    let t1 = (min[ax] - o[ax]) * inv;
    let t2 = (max[ax] - o[ax]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }
  if (tmax < Math.max(0, tmin)) return -1;
  return tmin > 0 ? tmin : tmax > 0 ? tmax : -1;
}

const BOT_H = 1.8;
const HALF = 0.34;

type Part = { mat: THREE.MeshBasicMaterial; base: number };

class Enemy {
  pos = new THREE.Vector3();
  health = 100;
  maxHealth = 100;
  alive = true;
  lastShot = 0;
  hitFlash = 0;
  group: THREE.Group;
  private parts: Part[] = [];
  private barCanvas: HTMLCanvasElement;
  private barTex: THREE.CanvasTexture;
  private bar: THREE.Sprite;

  constructor() {
    this.group = new THREE.Group();
    const mk = (w: number, h: number, d: number, color: number, y: number, z = 0) => {
      const mat = new THREE.MeshBasicMaterial({ color });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(0, y, z);
      this.group.add(m);
      this.parts.push({ mat, base: ((color >> 16) & 255) / 255 });
    };
    mk(0.5, 0.5, 0.34, 0x282828, 0.0); // legs
    mk(0.62, 1.05, 0.42, 0x363636, 0.55); // body
    mk(0.5, 0.5, 0.5, 0x1c1c1c, 1.32); // head
    mk(0.52, 0.12, 0.04, 0xcfccc4, 1.36, 0.24); // visor

    this.barCanvas = document.createElement("canvas");
    this.barCanvas.width = 48;
    this.barCanvas.height = 8;
    this.barTex = new THREE.CanvasTexture(this.barCanvas);
    this.barTex.magFilter = THREE.NearestFilter;
    this.barTex.minFilter = THREE.NearestFilter;
    this.bar = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.barTex, transparent: true })
    );
    this.bar.scale.set(1.0, 0.16, 1);
    this.bar.position.y = 2.25;
    this.bar.visible = false;
    this.group.add(this.bar);
  }

  center() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z);
  }

  updateBar() {
    const ctx = this.barCanvas.getContext("2d")!;
    const w = 48;
    const h = 8;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(238,236,230,0.92)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    const f = Math.max(0, this.health) / this.maxHealth;
    ctx.fillStyle = "#222";
    ctx.fillRect(1, 1, (w - 2) * f, h - 2);
    this.barTex.needsUpdate = true;
    this.bar.visible = this.alive && this.health < this.maxHealth;
  }

  applyFlash() {
    const f = this.hitFlash;
    for (const p of this.parts) p.mat.color.setScalar(p.base + (1 - p.base) * f);
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material as THREE.Material | undefined;
      if (mat) mat.dispose();
    });
    this.barTex.dispose();
  }
}

export type ShotResult = { point: THREE.Vector3; killed: boolean } | null;

export class BotManager {
  enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private world: World;
  private t = 0;
  private tracers: { line: THREE.Line; until: number }[] = [];
  private tracerMat = new THREE.LineBasicMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.5,
  });
  private tracerIdx = 0;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const line = new THREE.Line(g, this.tracerMat);
      line.visible = false;
      this.scene.add(line);
      this.tracers.push({ line, until: 0 });
    }
  }

  private fireTracer(from: THREE.Vector3, to: THREE.Vector3) {
    const tr = this.tracers[this.tracerIdx];
    this.tracerIdx = (this.tracerIdx + 1) % this.tracers.length;
    const pos = tr.line.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
    tr.line.visible = true;
    tr.until = this.t + 0.09;
  }

  dispose() {
    this.clear();
    for (const tr of this.tracers) {
      this.scene.remove(tr.line);
      tr.line.geometry.dispose();
    }
    this.tracers = [];
    this.tracerMat.dispose();
  }

  get aliveCount() {
    return this.enemies.filter((e) => e.alive).length;
  }

  setVisible(v: boolean) {
    this.enemies.forEach((e) => (e.group.visible = v && e.alive));
  }

  spawn(count: number, center: THREE.Vector3) {
    this.clear();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < 400) {
      const ang = Math.random() * Math.PI * 2;
      const dist = rand(14, 34);
      const x = Math.floor(center.x + Math.cos(ang) * dist);
      const z = Math.floor(center.z + Math.sin(ang) * dist);
      const y = this.world.surfaceY(x, z) + 1;
      const e = new Enemy();
      e.pos.set(x + 0.5, y, z + 0.5);
      e.group.position.copy(e.pos);
      this.scene.add(e.group);
      this.enemies.push(e);
      placed++;
    }
  }

  clear() {
    for (const e of this.enemies) {
      this.scene.remove(e.group);
      e.dispose();
    }
    this.enemies = [];
  }

  /** player fires; returns hit info and applies damage to the nearest bot */
  shoot(origin: THREE.Vector3, dir: THREE.Vector3, range = 80): ShotResult {
    let best: Enemy | null = null;
    let bestT = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const c = e.center();
      const min = new THREE.Vector3(c.x - HALF, e.pos.y, c.z - HALF);
      const max = new THREE.Vector3(c.x + HALF, e.pos.y + BOT_H, c.z + HALF);
      const t = rayAabb(origin, dir, min, max);
      if (t < 0 || t > range || t >= bestT) continue;
      // occlusion: a wall closer than the bot blocks the shot
      const wall = voxelHitDist(this.world, origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, t);
      if (wall < t - 0.1) continue;
      best = e;
      bestT = t;
    }
    if (!best) return null;
    best.health -= 45;
    best.hitFlash = 1;
    best.applyFlash();
    best.updateBar();
    const point = origin.clone().add(dir.clone().multiplyScalar(bestT));
    let killed = false;
    if (best.health <= 0) {
      best.alive = false;
      best.group.visible = false;
      killed = true;
    }
    return { point, killed };
  }

  /** advance bots; returns total damage dealt to the player this frame */
  update(dt: number, playerEye: THREE.Vector3): number {
    this.t += dt;
    for (const tr of this.tracers)
      if (tr.line.visible && this.t > tr.until) tr.line.visible = false;
    let dmg = 0;
    const world = this.world;
    for (const e of this.enemies) {
      if (!e.alive) continue;

      if (e.hitFlash > 0) {
        e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
        e.applyFlash();
      }

      // stick to terrain surface
      const gx = Math.floor(e.pos.x);
      const gz = Math.floor(e.pos.z);
      e.pos.y = world.surfaceY(gx, gz) + 1;

      const toPlayer = new THREE.Vector3().subVectors(playerEye, e.center());
      const dist = toPlayer.length();
      const dir = toPlayer.clone().normalize();
      const eye = e.center();
      const wall = voxelHitDist(world, eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, dist);
      const los = wall >= dist - 0.6;

      if (los && dist < 48) {
        // face & approach, keeping some distance
        const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
        e.group.rotation.y = Math.atan2(flat.x, flat.z);
        let move = 0;
        if (dist > 8) move = 2.4;
        else if (dist < 5) move = -1.8;
        if (move !== 0) {
          const nx = e.pos.x + flat.x * move * dt;
          const nz = e.pos.z + flat.z * move * dt;
          const fy = Math.floor(e.pos.y);
          if (!world.isSolid(Math.floor(nx), fy, Math.floor(nz)) &&
              !world.isSolid(Math.floor(nx), fy + 1, Math.floor(nz))) {
            e.pos.x = nx;
            e.pos.z = nz;
          }
        }
        // shoot on a cooldown
        if (this.t - e.lastShot > 1.15) {
          e.lastShot = this.t;
          this.fireTracer(e.center(), playerEye);
          if (Math.random() < 0.75) dmg += Math.round(rand(6, 13));
        }
      }
      e.group.position.copy(e.pos);
    }
    return dmg;
  }
}
