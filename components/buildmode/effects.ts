/**
 * Ground & water flourishes:
 *   • Footprints — dark pressings left as you walk across snow or sand, fading
 *     out behind you (a pooled set of flat quads, recycled oldest-first).
 *   • Splashes  — a burst of droplets + an expanding ripple ring when you dive
 *     into water.
 * Both are pooled (no per-event allocation) and fully disposed on teardown.
 */

import * as THREE from "three";
import { World, GRASS, DIRT, STONE, SAND, WATER } from "./world";

// ---------------- footprints ----------------
const FOOT_POOL = 48;
const FOOT_FADE = 5; // seconds to fade
const FOOT_PEAK = 0.34;
const STRIDE = 1.1; // distance between prints

export class Footprints {
  private scene: THREE.Scene;
  private world: World;
  private prints: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number }[] = [];
  private geo = new THREE.PlaneGeometry(0.26, 0.4);
  private cursor = 0;
  private px = 0;
  private pz = 0;
  private dist = 0;
  private left = false;
  private started = false;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    for (let i = 0; i < FOOT_POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.rotation.x = -Math.PI / 2; // lie flat on the ground
      mesh.visible = false;
      scene.add(mesh);
      this.prints.push({ mesh, mat, life: 0 });
    }
  }

  update(dt: number, pos: THREE.Vector3, onGround: boolean, snowy: boolean) {
    // fade existing prints
    for (const p of this.prints) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.mat.opacity = Math.max(0, p.life / FOOT_FADE) * FOOT_PEAK;
      if (p.life <= 0) p.mesh.visible = false;
    }

    if (!this.started) {
      this.px = pos.x;
      this.pz = pos.z;
      this.started = true;
      return;
    }
    const dx = pos.x - this.px;
    const dz = pos.z - this.pz;
    this.px = pos.x;
    this.pz = pos.z;
    if (!onGround) return;
    const moved = Math.hypot(dx, dz);
    this.dist += moved;
    if (this.dist < STRIDE || moved < 1e-4) return;
    this.dist = 0;

    const gx = Math.floor(pos.x);
    const gz = Math.floor(pos.z);
    const sy = this.world.surfaceY(gx, gz);
    const top = this.world.get(gx, sy, gz);
    const onSnow = snowy && (top === GRASS || top === DIRT || top === STONE || top === SAND);
    if (top !== SAND && !onSnow) return; // only leave prints in sand or snow

    // place to the left/right of the stride
    const inv = 1 / (moved || 1);
    const perpX = -dz * inv;
    const perpZ = dx * inv;
    const side = (this.left ? 1 : -1) * 0.12;
    this.left = !this.left;

    const slot = this.prints[this.cursor];
    this.cursor = (this.cursor + 1) % FOOT_POOL;
    slot.mesh.position.set(pos.x + perpX * side, sy + 1.02, pos.z + perpZ * side);
    slot.mesh.rotation.z = Math.atan2(dx, dz); // align with walk direction
    slot.life = FOOT_FADE;
    slot.mat.opacity = FOOT_PEAK;
    slot.mesh.visible = true;
  }

  dispose() {
    for (const p of this.prints) {
      this.scene.remove(p.mesh);
      p.mat.dispose();
    }
    this.geo.dispose();
  }
}

// ---------------- splashes ----------------
const SPLASH_POOL = 5;
const DROPS = 22;
const SPLASH_LIFE = 0.9;
const GRAV = 16;

type Splash = {
  pts: THREE.Points;
  geo: THREE.BufferGeometry;
  pmat: THREE.PointsMaterial;
  pos: Float32Array;
  vel: Float32Array;
  ring: THREE.Mesh;
  rgeo: THREE.RingGeometry;
  rmat: THREE.MeshBasicMaterial;
  life: number;
};

export class Splashes {
  private scene: THREE.Scene;
  private pool: Splash[] = [];
  private cursor = 0;
  private color: number;

  constructor(scene: THREE.Scene, color = 0xbfc3c6) {
    this.scene = scene;
    this.color = color;
    for (let i = 0; i < SPLASH_POOL; i++) {
      const pos = new Float32Array(DROPS * 3);
      const vel = new Float32Array(DROPS * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pmat = new THREE.PointsMaterial({
        color: this.color,
        size: 0.16,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, pmat);
      pts.frustumCulled = false;
      pts.visible = false;
      const rgeo = new THREE.RingGeometry(0.2, 0.32, 20);
      const rmat = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(rgeo, rmat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.scene.add(pts, ring);
      this.pool.push({ pts, geo, pmat, pos, vel, ring, rgeo, rmat, life: 0 });
    }
  }

  splashAt(x: number, y: number, z: number) {
    const s = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % SPLASH_POOL;
    for (let i = 0; i < DROPS; i++) {
      s.pos[i * 3] = x;
      s.pos[i * 3 + 1] = y;
      s.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const out = 1 + Math.random() * 2.5;
      s.vel[i * 3] = Math.cos(a) * out;
      s.vel[i * 3 + 1] = 2.5 + Math.random() * 3.5;
      s.vel[i * 3 + 2] = Math.sin(a) * out;
    }
    s.geo.attributes.position.needsUpdate = true;
    s.pts.visible = true;
    s.pmat.opacity = 0.8;
    s.ring.position.set(x, y + 0.05, z);
    s.ring.scale.setScalar(0.3);
    s.ring.visible = true;
    s.rmat.opacity = 0.7;
    s.life = SPLASH_LIFE;
  }

  update(dt: number) {
    for (const s of this.pool) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = Math.max(0, s.life / SPLASH_LIFE);
      for (let i = 0; i < DROPS; i++) {
        s.vel[i * 3 + 1] -= GRAV * dt;
        s.pos[i * 3] += s.vel[i * 3] * dt;
        s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
        s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      }
      s.geo.attributes.position.needsUpdate = true;
      s.pmat.opacity = 0.8 * k;
      // ring expands and fades
      const grow = 1 + (1 - k) * 6;
      s.ring.scale.setScalar(0.3 * grow);
      s.rmat.opacity = 0.7 * k;
      if (s.life <= 0) {
        s.pts.visible = false;
        s.ring.visible = false;
      }
    }
  }

  dispose() {
    for (const s of this.pool) {
      this.scene.remove(s.pts, s.ring);
      s.geo.dispose();
      s.pmat.dispose();
      s.rgeo.dispose();
      s.rmat.dispose();
    }
  }
}

// ---------------- torch glow ----------------
const GLOW_POOL = 28;
const GLOW_RANGE = 30;

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 1, 32, 32, 32);
  g.addColorStop(0, "rgba(255,250,235,0.95)");
  g.addColorStop(0.4, "rgba(255,247,225,0.45)");
  g.addColorStop(1, "rgba(255,247,225,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Soft additive halos over placed torch blocks that bloom at night and fade by
 * day. Not real light propagation — a believable, cheap "pool of light" that
 * suits the unlit voxel world. Positions are tracked by the host as torches are
 * placed/broken; only the nearest few are lit each frame.
 */
export class TorchGlow {
  private scene: THREE.Scene;
  private tex = glowTexture();
  private mat: THREE.SpriteMaterial;
  private sprites: THREE.Sprite[] = [];
  private set = new Set<string>();
  private t = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mat = new THREE.SpriteMaterial({
      map: this.tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    for (let i = 0; i < GLOW_POOL; i++) {
      const s = new THREE.Sprite(this.mat.clone());
      s.scale.setScalar(4.5);
      s.visible = false;
      scene.add(s);
      this.sprites.push(s);
    }
  }

  add(x: number, y: number, z: number) {
    this.set.add(`${x},${y},${z}`);
  }
  remove(x: number, y: number, z: number) {
    this.set.delete(`${x},${y},${z}`);
  }
  clear() {
    this.set.clear();
  }

  update(dt: number, player: THREE.Vector3, light: number) {
    this.t += dt;
    // brightness ramps up as it gets dark
    const night = Math.max(0, Math.min(1, (0.62 - light) / 0.22));
    if (night <= 0.001 || this.set.size === 0) {
      for (const s of this.sprites) s.visible = false;
      return;
    }
    // collect the nearest torches to the player
    const near: [number, number, number, number][] = [];
    for (const key of this.set) {
      const [x, y, z] = key.split(",").map(Number);
      const d = Math.hypot(x - player.x, y - player.y, z - player.z);
      if (d < GLOW_RANGE) near.push([d, x, y, z]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const n = near[i];
      if (!n) {
        s.visible = false;
        continue;
      }
      const flick = 0.85 + 0.15 * Math.sin(this.t * 11 + i * 1.7);
      const fade = 1 - n[0] / GLOW_RANGE; // dimmer far away
      const sm = s.material as THREE.SpriteMaterial;
      sm.opacity = night * fade * flick * 0.8;
      s.position.set(n[1] + 0.5, n[2] + 0.7, n[3] + 0.5);
      s.scale.setScalar(4 + flick);
      s.visible = true;
    }
  }

  dispose() {
    for (const s of this.sprites) {
      this.scene.remove(s);
      (s.material as THREE.SpriteMaterial).dispose();
    }
    this.mat.dispose();
    this.tex.dispose();
  }
}

// ---------------- fireflies ----------------
const FLY_COUNT = 48;
const FLY_R = 22;

/** warm glowing motes that drift over water after dark (riverside / shoreline) */
export class Fireflies {
  private scene: THREE.Scene;
  private world: World;
  private tex = glowTexture();
  private mat: THREE.PointsMaterial;
  private pts: THREE.Points;
  private geo = new THREE.BufferGeometry();
  private pos = new Float32Array(FLY_COUNT * 3);
  private home = new Float32Array(FLY_COUNT * 3);
  private phase = new Float32Array(FLY_COUNT * 3);
  private freq = new Float32Array(FLY_COUNT);
  private t = 0;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    for (let i = 0; i < FLY_COUNT; i++) {
      this.home[i * 3] = (Math.random() * 2 - 1) * FLY_R;
      this.home[i * 3 + 1] = 0.4 + Math.random() * 3.6;
      this.home[i * 3 + 2] = (Math.random() * 2 - 1) * FLY_R;
      this.phase[i * 3] = Math.random() * 6.28;
      this.phase[i * 3 + 1] = Math.random() * 6.28;
      this.phase[i * 3 + 2] = Math.random() * 6.28;
      this.freq[i] = 0.6 + Math.random() * 0.9;
    }
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({
      map: this.tex,
      color: 0xfff0bf,
      size: 0.55,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.pts = new THREE.Points(this.geo, this.mat);
    this.pts.frustumCulled = false;
    this.pts.visible = false;
    scene.add(this.pts);
  }

  // is there water within a couple of blocks of this spot? (riverside / shore)
  private riverside(wx: number, wz: number) {
    for (const [ox, oz] of [
      [0, 0],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const gx = Math.floor(wx + ox);
      const gz = Math.floor(wz + oz);
      const sy = this.world.surfaceY(gx, gz);
      if (this.world.get(gx, sy + 1, gz) === WATER) return true;
    }
    return false;
  }

  update(dt: number, player: THREE.Vector3, light: number) {
    this.t += dt;
    const night = Math.max(0, Math.min(1, (0.6 - light) / 0.2));
    this.mat.opacity = night * 0.9;
    this.pts.visible = night > 0.02;
    if (!this.pts.visible) return;
    this.pts.position.set(player.x, player.y, player.z);
    const t = this.t;
    for (let i = 0; i < FLY_COUNT; i++) {
      const f = this.freq[i];
      const lx = this.home[i * 3] + Math.sin(t * f + this.phase[i * 3]) * 1.5;
      const ly = this.home[i * 3 + 1] + Math.sin(t * f * 0.8 + this.phase[i * 3 + 1]) * 0.8;
      const lz = this.home[i * 3 + 2] + Math.cos(t * f + this.phase[i * 3 + 2]) * 1.5;
      if (this.riverside(player.x + lx, player.z + lz)) {
        this.pos[i * 3] = lx;
        this.pos[i * 3 + 1] = ly;
        this.pos[i * 3 + 2] = lz;
      } else {
        this.pos[i * 3 + 1] = -9999; // hide motes that aren't over water
      }
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.pts);
    this.geo.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}

// ---------------- campfire ----------------
function flameTexture() {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 64;
  const x = c.getContext("2d")!;
  // teardrop flame shape with a warm vertical gradient
  const g = x.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, "rgba(255,244,214,0.95)");
  g.addColorStop(0.45, "rgba(255,214,150,0.85)");
  g.addColorStop(1, "rgba(255,196,120,0)");
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(24, 64);
  x.quadraticCurveTo(2, 40, 16, 18);
  x.quadraticCurveTo(24, 2, 24, 0);
  x.quadraticCurveTo(24, 2, 32, 18);
  x.quadraticCurveTo(46, 40, 24, 64);
  x.closePath();
  x.fill();
  return new THREE.CanvasTexture(c);
}

const FIRE_EMBERS = 14;
const FIRE_MAX = 16;

type Fire = {
  group: THREE.Group;
  glow: THREE.Sprite;
  flames: THREE.Sprite[];
  ePts: THREE.Points;
  eGeo: THREE.BufferGeometry;
  ePos: Float32Array;
  eVel: Float32Array;
  eLife: Float32Array;
  mats: THREE.Material[];
  geos: THREE.BufferGeometry[];
  t: number;
};

export class Campfires {
  private scene: THREE.Scene;
  private flameTex = flameTexture();
  private glowTex = glowTexture();
  private fires: Fire[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  add(x: number, y: number, z: number) {
    if (this.fires.length >= FIRE_MAX) this.removeFire(this.fires.shift()!);
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const mats: THREE.Material[] = [];
    const geos: THREE.BufferGeometry[] = [];

    // a small stack of dark logs around the base
    const logMat = new THREE.MeshBasicMaterial({ color: 0x2a2926 });
    mats.push(logMat);
    for (let k = 0; k < 4; k++) {
      const lg = new THREE.BoxGeometry(0.62, 0.14, 0.14);
      geos.push(lg);
      const log = new THREE.Mesh(lg, logMat);
      log.position.y = 0.08;
      log.rotation.y = (k * Math.PI) / 4;
      group.add(log);
    }

    // warm additive glow
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTex,
        color: 0xffd9a0,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    glow.scale.setScalar(3);
    glow.position.y = 0.5;
    group.add(glow);

    // a few flickering flame billboards
    const flames: THREE.Sprite[] = [];
    for (let j = 0; j < 3; j++) {
      const f = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.flameTex,
          color: 0xffe0a0,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        })
      );
      f.center.set(0.5, 0); // grow upward from the base
      f.position.set((j - 1) * 0.13, 0.18, 0);
      f.scale.set(0.5, 0.85, 1);
      flames.push(f);
      group.add(f);
    }

    // rising embers
    const ePos = new Float32Array(FIRE_EMBERS * 3);
    const eVel = new Float32Array(FIRE_EMBERS * 3);
    const eLife = new Float32Array(FIRE_EMBERS);
    for (let i = 0; i < FIRE_EMBERS; i++) this.seedEmber(ePos, eVel, eLife, i, true);
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
    const eMat = new THREE.PointsMaterial({
      color: 0xffcf8c,
      size: 0.12,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    mats.push(eMat);
    const ePts = new THREE.Points(eGeo, eMat);
    ePts.frustumCulled = false;
    group.add(ePts);

    this.scene.add(group);
    this.fires.push({ group, glow, flames, ePts, eGeo, ePos, eVel, eLife, mats, geos, t: 0 });
  }

  private seedEmber(
    pos: Float32Array,
    vel: Float32Array,
    life: Float32Array,
    i: number,
    spread: boolean
  ) {
    pos[i * 3] = (Math.random() - 0.5) * 0.2;
    pos[i * 3 + 1] = 0.2 + (spread ? Math.random() * 0.8 : 0);
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    vel[i * 3] = (Math.random() - 0.5) * 0.4;
    vel[i * 3 + 1] = 0.8 + Math.random() * 1.4;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    life[i] = 0.6 + Math.random() * 1.1;
  }

  update(dt: number, light: number) {
    const night = Math.max(0, Math.min(1, (0.6 - light) / 0.2));
    for (const fire of this.fires) {
      fire.t += dt;
      const t = fire.t;
      fire.flames.forEach((f, j) => {
        const fl = 0.7 + 0.3 * Math.sin(t * 12 + j * 2) + 0.1 * Math.sin(t * 23 + j);
        f.scale.set(0.46 + 0.08 * Math.sin(t * 9 + j), 0.7 + 0.4 * fl, 1);
        (f.material as THREE.SpriteMaterial).opacity = 0.7 + 0.3 * Math.abs(Math.sin(t * 15 + j * 3));
        f.position.x = (j - 1) * 0.13 + Math.sin(t * 7 + j) * 0.03;
      });
      fire.glow.scale.setScalar(2.6 + 0.5 * Math.sin(t * 8) + 0.4);
      (fire.glow.material as THREE.SpriteMaterial).opacity =
        0.4 + 0.2 * Math.abs(Math.sin(t * 10)) + night * 0.35;
      for (let i = 0; i < FIRE_EMBERS; i++) {
        fire.eLife[i] -= dt;
        if (fire.eLife[i] <= 0) {
          this.seedEmber(fire.ePos, fire.eVel, fire.eLife, i, false);
        } else {
          fire.ePos[i * 3] += fire.eVel[i * 3] * dt;
          fire.ePos[i * 3 + 1] += fire.eVel[i * 3 + 1] * dt;
          fire.ePos[i * 3 + 2] += fire.eVel[i * 3 + 2] * dt;
        }
      }
      fire.eGeo.attributes.position.needsUpdate = true;
    }
  }

  private removeFire(fire: Fire) {
    this.scene.remove(fire.group);
    fire.eGeo.dispose();
    for (const g of fire.geos) g.dispose();
    for (const m of fire.mats) m.dispose();
    fire.flames.forEach((f) => (f.material as THREE.SpriteMaterial).dispose());
    (fire.glow.material as THREE.SpriteMaterial).dispose();
  }

  dispose() {
    for (const fire of this.fires) this.removeFire(fire);
    this.fires = [];
    this.flameTex.dispose();
    this.glowTex.dispose();
  }
}
