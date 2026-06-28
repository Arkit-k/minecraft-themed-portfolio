/**
 * Ambient wildlife around the player — blocky, monochrome, low-poly:
 *   • fish   — drift through the sea, tails wagging; turn at walls / the surface
 *   • animals — small quadrupeds wandering the land, legs cycling as they walk
 * Entities spawn near the player and despawn when far, so the world always
 * feels inhabited without tracking the whole map. Local convention: each
 * creature's forward is +Z, so group.rotation.y = heading aims it correctly.
 */

import * as THREE from "three";
import { World, WATER, AIR, SEA_LEVEL, WOOD, LEAF } from "./world";

const FISH_TARGET = 8;
const ANIMAL_TARGET = 8;
const SPAWN_MIN = 12;
const SPAWN_MAX = 32;
const DESPAWN = 48;

type Fish = {
  kind: "fish";
  g: THREE.Group;
  tail: THREE.Group;
  x: number;
  y: number;
  z: number;
  a: number; // heading
  sp: number;
  ph: number;
  turn: number;
};
type Animal = {
  kind: "animal";
  g: THREE.Group;
  legs: THREE.Group[];
  x: number;
  z: number;
  a: number;
  sp: number;
  ph: number;
  next: number; // seconds until next heading change
};

export class Critters {
  private scene: THREE.Scene;
  private world: World;
  private fish: Fish[] = [];
  private animals: Animal[] = [];
  private edge = new THREE.LineBasicMaterial({
    color: 0x141414,
    transparent: true,
    opacity: 0.35,
  });
  private visible = true;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
  }

  private box(w: number, h: number, d: number, color: number, pivotTop = false) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (pivotTop) g.translate(0, -h / 2, 0);
    const mat = new THREE.MeshBasicMaterial({ color });
    mat.userData.base = mat.color.clone(); // for day/night tint
    const mesh = new THREE.Mesh(g, mat);
    const eg = new THREE.EdgesGeometry(g);
    const grp = new THREE.Group();
    grp.add(mesh, new THREE.LineSegments(eg, this.edge));
    return grp;
  }

  // free a creature's geometries + materials (shared edge material is kept)
  private freeGroup(group: THREE.Group) {
    group.traverse((o) => {
      const m = o as THREE.Mesh & { material?: THREE.Material };
      if (m.geometry) m.geometry.dispose();
      if (m.material && m.material !== this.edge) m.material.dispose();
    });
  }

  // ---------- builders ----------
  private makeFish(): Fish {
    const g = new THREE.Group();
    const body = this.box(0.16, 0.22, 0.44, 0x3a3a3a);
    const tail = new THREE.Group();
    const fin = this.box(0.05, 0.18, 0.16, 0x2c2c2c);
    fin.position.z = -0.1;
    tail.add(fin);
    tail.position.z = -0.22;
    g.add(body, tail);
    this.scene.add(g);
    return { kind: "fish", g, tail, x: 0, y: 0, z: 0, a: 0, sp: 1.4, ph: 0, turn: 0 };
  }

  private makeAnimal(monkey = false): Animal {
    const g = new THREE.Group();
    const shade = monkey
      ? 0x2e2a26 // monkeys are dark
      : 0x343434 + Math.floor(Math.random() * 0x16) * 0x010101; // grey variety
    const body = this.box(0.4, 0.32, 0.7, shade);
    body.position.y = 0.46;
    const head = this.box(0.28, 0.26, 0.26, shade);
    head.position.set(0, monkey ? 0.62 : 0.56, 0.42);
    const legs: THREE.Group[] = [];
    const lp: [number, number][] = [
      [-0.14, 0.24],
      [0.14, 0.24],
      [-0.14, -0.24],
      [0.14, -0.24],
    ];
    for (const [lx, lz] of lp) {
      const leg = this.box(0.12, 0.32, 0.12, 0x2a2a2a, true);
      leg.position.set(lx, 0.32, lz);
      legs.push(leg);
      g.add(leg);
    }
    g.add(body, head);
    if (monkey) {
      const tail = this.box(0.08, 0.34, 0.08, shade, true);
      tail.position.set(0, 0.55, -0.4);
      tail.rotation.x = -1.1; // curls up behind
      g.add(tail);
      g.scale.setScalar(0.62); // monkeys are small
    } else {
      g.scale.setScalar(0.85 + Math.random() * 0.6); // size variety
    }
    this.scene.add(g);
    return {
      kind: "animal",
      g,
      legs,
      x: 0,
      z: 0,
      a: 0,
      sp: monkey ? 2.2 : 1.2 + Math.random() * 0.8,
      ph: 0,
      next: 0,
    };
  }

  // is this spot inside woods? (trees within a couple of blocks)
  private forested(gx: number, gz: number) {
    for (const [ox, oz] of [
      [0, 0],
      [2, 2],
      [-2, -2],
      [2, -2],
      [-2, 2],
    ]) {
      const x = gx + ox;
      const z = gz + oz;
      const sy = this.world.surfaceY(x, z);
      for (let y = sy + 1; y < Math.min(64, sy + 7); y++) {
        const b = this.world.get(x, y, z);
        if (b === WOOD || b === LEAF) return true;
      }
    }
    return false;
  }

  // ---------- spawn placement ----------
  private waterSpot(px: number, pz: number) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      const gx = Math.floor(px + Math.cos(a) * r);
      const gz = Math.floor(pz + Math.sin(a) * r);
      const floor = this.world.surfaceY(gx, gz);
      if (this.world.get(gx, floor + 1, gz) !== WATER) continue; // dry here
      const top = SEA_LEVEL;
      const y = floor + 1 + Math.random() * Math.max(0.5, top - floor - 1.5);
      return { x: gx + 0.5, y, z: gz + 0.5 };
    }
    return null;
  }

  private landSpot(px: number, pz: number) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      const gx = Math.floor(px + Math.cos(a) * r);
      const gz = Math.floor(pz + Math.sin(a) * r);
      const s = this.world.surfaceY(gx, gz);
      if (this.world.get(gx, s + 1, gz) !== AIR) continue; // underwater / blocked
      // reject steep ground so animals don't spawn on cliffs
      const slope =
        Math.abs(this.world.surfaceY(gx + 1, gz) - s) +
        Math.abs(this.world.surfaceY(gx, gz + 1) - s);
      if (slope > 3) continue;
      return { x: gx + 0.5, y: s + 1, z: gz + 0.5 };
    }
    return null;
  }

  setVisible(v: boolean) {
    this.visible = v;
    for (const f of this.fish) f.g.visible = v;
    for (const a of this.animals) a.g.visible = v;
  }

  // dim every creature by the day/night light level
  setLight(l: number) {
    const apply = (grp: THREE.Group) =>
      grp.traverse((o) => {
        const mm = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
        const b = mm?.userData?.base as THREE.Color | undefined;
        if (b) mm!.color.setRGB(b.r * l, b.g * l, b.b * l);
      });
    for (const f of this.fish) apply(f.g);
    for (const a of this.animals) apply(a.g);
  }

  // ---------- per-frame ----------
  update(dt: number, player: THREE.Vector3) {
    const w = this.world;

    // cull the far ones
    const cull = <T extends { g: THREE.Group; x: number; z: number }>(arr: T[]) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const e = arr[i];
        if (Math.hypot(e.x - player.x, e.z - player.z) > DESPAWN) {
          this.scene.remove(e.g);
          this.freeGroup(e.g);
          arr.splice(i, 1);
        }
      }
    };
    cull(this.fish);
    cull(this.animals);

    // top up populations (one of each per frame at most)
    if (this.fish.length < FISH_TARGET) {
      const s = this.waterSpot(player.x, player.z);
      if (s) {
        const f = this.makeFish();
        f.x = s.x;
        f.y = s.y;
        f.z = s.z;
        f.a = Math.random() * Math.PI * 2;
        f.g.visible = this.visible;
        this.fish.push(f);
      }
    }
    if (this.animals.length < ANIMAL_TARGET) {
      const s = this.landSpot(player.x, player.z);
      if (s) {
        // monkeys mostly in the woods, other wildlife in the open
        const monkey = this.forested(Math.floor(s.x), Math.floor(s.z)) && Math.random() < 0.7;
        const an = this.makeAnimal(monkey);
        an.x = s.x;
        an.z = s.z;
        an.a = Math.random() * Math.PI * 2;
        an.g.position.set(s.x, s.y, s.z);
        an.g.visible = this.visible;
        this.animals.push(an);
      }
    }

    // fish: swim, wag, turn away from walls and the surface
    for (const f of this.fish) {
      f.ph += dt * 6;
      f.turn -= dt;
      const dx = Math.sin(f.a);
      const dz = Math.cos(f.a);
      const nx = f.x + dx * f.sp * dt;
      const nz = f.z + dz * f.sp * dt;
      const cell = w.get(Math.floor(nx), Math.floor(f.y), Math.floor(nz));
      if (cell === WATER) {
        f.x = nx;
        f.z = nz;
      } else if (f.turn <= 0) {
        f.a += Math.PI * (0.5 + Math.random()); // bounce off
        f.turn = 0.5;
      }
      // keep within the water column vertically
      const floor = w.surfaceY(Math.floor(f.x), Math.floor(f.z));
      f.y = Math.max(floor + 0.6, Math.min(SEA_LEVEL - 0.4, f.y + Math.sin(f.ph * 0.5) * 0.4 * dt));
      f.g.position.set(f.x, f.y, f.z);
      f.g.rotation.y = f.a;
      f.tail.rotation.y = Math.sin(f.ph) * 0.5;
    }

    // animals: wander the surface, legs cycling
    for (const an of this.animals) {
      an.next -= dt;
      if (an.next <= 0) {
        an.a += (Math.random() - 0.5) * 1.6;
        an.next = 1.5 + Math.random() * 2.5;
      }
      an.ph += dt * (4 + an.sp);
      const dx = Math.sin(an.a);
      const dz = Math.cos(an.a);
      const nx = an.x + dx * an.sp * dt;
      const nz = an.z + dz * an.sp * dt;
      const s = w.surfaceY(Math.floor(nx), Math.floor(nz));
      const blocked = w.get(Math.floor(nx), s + 1, Math.floor(nz)) !== AIR; // water/wall
      const step = Math.abs(s - (an.g.position.y - 1));
      if (!blocked && step < 1.6) {
        an.x = nx;
        an.z = nz;
        an.g.position.set(an.x, s + 1, an.z);
      } else {
        an.a += Math.PI * (0.4 + Math.random() * 0.4);
      }
      an.g.rotation.y = an.a;
      const sw = Math.sin(an.ph) * 0.5;
      an.legs[0].rotation.x = sw;
      an.legs[3].rotation.x = sw;
      an.legs[1].rotation.x = -sw;
      an.legs[2].rotation.x = -sw;
    }
  }

  dispose() {
    for (const f of this.fish) {
      this.scene.remove(f.g);
      this.freeGroup(f.g);
    }
    for (const a of this.animals) {
      this.scene.remove(a.g);
      this.freeGroup(a.g);
    }
    this.edge.dispose();
  }
}
