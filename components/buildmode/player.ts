/**
 * First-person player: yaw/pitch look (driven by raw mouse deltas under pointer
 * lock), WASD + jump with gravity, AABB-vs-voxel collision resolved per axis,
 * and a voxel DDA raycast for targeting blocks to break/place.
 */

import * as THREE from "three";
import { World, WATER } from "./world";

const HALF_W = 0.3;
const HEIGHT = 1.8;
const EYE = 1.62;
const SPEED = 5.6;
const ACCEL = 12;
const GRAVITY = 26;
const JUMP_V = 8.4;
const REACH = 6;
const SWIM_UP = 4.6; // upward stroke when holding jump in water
const SWIM_SPEED = 0.62; // horizontal speed multiplier while swimming
const WATER_GRAV = 0.16; // fraction of gravity felt underwater
const SINK_MAX = 3; // terminal sink speed in water
const SPRINT_MULT = 1.6; // speed multiplier while sprinting
const BOB_AMP = 0.075; // view-bob amount at full speed
const FALL_SAFE = 4.5; // blocks you can drop without harm
const FALL_DMG = 4; // hp lost per block beyond the safe drop

export type Input = {
  f: boolean;
  b: boolean;
  l: boolean;
  r: boolean;
  jump: boolean;
  sprint: boolean;
};

export type RayResult = {
  hit: [number, number, number];
  place: [number, number, number];
} | null;

export class Player {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  onGround = false;
  fallDamage = 0; // hp the host should subtract after a hard landing
  private maxAirY = 0; // highest point reached while airborne
  private bobT = 0; // view-bob phase
  private bobX = 0;
  private bobY = 0;

  spawn(world: World, x = 0, z = 0) {
    const y = world.surfaceY(Math.floor(x), Math.floor(z)) + 1;
    this.pos.set(x + 0.5, y + 0.01, z + 0.5);
    this.vel.set(0, 0, 0);
    this.maxAirY = this.pos.y; // don't bank a fall from the spawn drop
    this.fallDamage = 0;
  }

  look(dx: number, dy: number, sens = 0.0022) {
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const lim = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  private collides(world: World, p: THREE.Vector3) {
    const x0 = Math.floor(p.x - HALF_W);
    const x1 = Math.floor(p.x + HALF_W);
    const y0 = Math.floor(p.y);
    const y1 = Math.floor(p.y + HEIGHT);
    const z0 = Math.floor(p.z - HALF_W);
    const z1 = Math.floor(p.z + HALF_W);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++)
          if (world.isSolid(x, y, z)) return true;
    return false;
  }

  update(dt: number, world: World, input: Input) {
    // horizontal wish direction from yaw
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (input.f) wish.add(fwd);
    if (input.b) wish.sub(fwd);
    if (input.r) wish.add(right);
    if (input.l) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    // submerged if water sits at the chest or feet — drives swim physics
    const inWater =
      world.get(
        Math.floor(this.pos.x),
        Math.floor(this.pos.y + 0.9),
        Math.floor(this.pos.z)
      ) === WATER ||
      world.get(
        Math.floor(this.pos.x),
        Math.floor(this.pos.y + 0.1),
        Math.floor(this.pos.z)
      ) === WATER;

    const speed = inWater ? SPEED * SWIM_SPEED : SPEED;
    const sprint = input.sprint && !inWater;
    const moveSpeed = sprint ? speed * SPRINT_MULT : speed;
    const desiredX = wish.x * moveSpeed;
    const desiredZ = wish.z * moveSpeed;
    const wasGround = this.onGround;
    const a = Math.min(1, ACCEL * dt);
    this.vel.x += (desiredX - this.vel.x) * a;
    this.vel.z += (desiredZ - this.vel.z) * a;

    if (inWater) {
      this.vel.y -= GRAVITY * WATER_GRAV * dt; // light gravity
      this.vel.y *= 1 - Math.min(1, 4 * dt); // water drag
      if (this.vel.y < -SINK_MAX) this.vel.y = -SINK_MAX;
      if (input.jump) this.vel.y = SWIM_UP; // swim up / break the surface
    } else {
      this.vel.y -= GRAVITY * dt;
      if (input.jump && this.onGround) {
        this.vel.y = JUMP_V;
        this.onGround = false;
      }
    }

    const p = this.pos;
    // X axis
    p.x += this.vel.x * dt;
    if (this.collides(world, p)) {
      p.x -= this.vel.x * dt;
      this.vel.x = 0;
    }
    // Z axis
    p.z += this.vel.z * dt;
    if (this.collides(world, p)) {
      p.z -= this.vel.z * dt;
      this.vel.z = 0;
    }
    // Y axis
    this.onGround = false;
    p.y += this.vel.y * dt;
    if (this.collides(world, p)) {
      if (this.vel.y < 0) this.onGround = true;
      p.y -= this.vel.y * dt;
      this.vel.y = 0;
    }

    // fall damage: track the peak while airborne, score the drop on landing
    if (!this.onGround) {
      this.maxAirY = Math.max(this.maxAirY, p.y);
    } else {
      if (!wasGround && !inWater) {
        const fall = this.maxAirY - p.y;
        if (fall > FALL_SAFE)
          this.fallDamage += Math.round((fall - FALL_SAFE) * FALL_DMG);
      }
      this.maxAirY = p.y;
    }

    // view-bob while moving on the ground; eases back to still otherwise
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 0.6 && !inWater) {
      this.bobT += dt * (6 + hs * 1.4);
      const amp = BOB_AMP * Math.min(1, hs / SPEED);
      this.bobY = Math.abs(Math.sin(this.bobT)) * amp;
      this.bobX = Math.cos(this.bobT) * amp * 0.6;
    } else {
      const k = Math.min(1, dt * 8);
      this.bobY += -this.bobY * k;
      this.bobX += -this.bobX * k;
    }

    if (p.y < -10) this.spawn(world, p.x, p.z); // fell out → respawn nearby
  }

  syncCamera(cam: THREE.PerspectiveCamera) {
    // apply the bob along the view's right axis + world up
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    cam.position.set(
      this.pos.x + rx * this.bobX,
      this.pos.y + EYE + this.bobY,
      this.pos.z + rz * this.bobX
    );
    cam.rotation.order = "YXZ";
    cam.rotation.set(this.pitch, this.yaw, 0);
  }

  forward() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(
      -Math.sin(this.yaw) * cp,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cp
    );
  }

  raycast(world: World): RayResult {
    const o = new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z);
    const d = this.forward().normalize();
    let x = Math.floor(o.x);
    let y = Math.floor(o.y);
    let z = Math.floor(o.z);
    const stepX = d.x > 0 ? 1 : -1;
    const stepY = d.y > 0 ? 1 : -1;
    const stepZ = d.z > 0 ? 1 : -1;
    const tdx = Math.abs(1 / d.x);
    const tdy = Math.abs(1 / d.y);
    const tdz = Math.abs(1 / d.z);
    const fx = o.x - x;
    const fy = o.y - y;
    const fz = o.z - z;
    let tMaxX = d.x === 0 ? Infinity : (d.x > 0 ? 1 - fx : fx) * tdx;
    let tMaxY = d.y === 0 ? Infinity : (d.y > 0 ? 1 - fy : fy) * tdy;
    let tMaxZ = d.z === 0 ? Infinity : (d.z > 0 ? 1 - fz : fz) * tdz;
    let px = x;
    let py = y;
    let pz = z;
    let dist = 0;
    while (dist <= REACH) {
      if (world.isSolid(x, y, z)) return { hit: [x, y, z], place: [px, py, pz] };
      px = x;
      py = y;
      pz = z;
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
    return null;
  }

  /** would placing a block at cell collide with the player's body? */
  placeBlocks(cell: [number, number, number]) {
    const [bx, by, bz] = cell;
    const x0 = Math.floor(this.pos.x - HALF_W);
    const x1 = Math.floor(this.pos.x + HALF_W);
    const y0 = Math.floor(this.pos.y);
    const y1 = Math.floor(this.pos.y + HEIGHT);
    const z0 = Math.floor(this.pos.z - HALF_W);
    const z1 = Math.floor(this.pos.z + HALF_W);
    const overlaps =
      bx >= x0 && bx <= x1 && by >= y0 && by <= y1 && bz >= z0 && bz <= z1;
    return !overlaps;
  }
}
