/**
 * Riverside grass — little pixel-art tufts (two crossed alpha-cut planes) planted
 * on grass/sand right by the water, swaying in the wind. Not blocks: real foliage
 * that grows along the shoreline. Tufts spawn near the player on suitable cells
 * and recycle when far, so the banks always look planted without tracking the map.
 */

import * as THREE from "three";
import { World, GRASS, SAND, AIR, WATER } from "./world";

const TARGET = 80;
const NEAR = 3;
const FAR = 28;
const DESPAWN = 38;

function grassTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, 16, 16);
  const shades = ["#26261f", "#33332a", "#3f3f34"];
  // a clump of upright blades of varying height
  const blades = [2, 4, 5, 7, 8, 10, 11, 13];
  for (const bx of blades) {
    const h = 6 + Math.floor(Math.random() * 8);
    const lean = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1;
    x.fillStyle = shades[Math.floor(Math.random() * shades.length)];
    for (let i = 0; i < h; i++) {
      const px = bx + Math.round((lean * i) / h);
      x.fillRect(Math.max(0, Math.min(15, px)), 15 - i, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

type Tuft = { mesh: THREE.Group; x: number; z: number; phase: number };

export class Foliage {
  private scene: THREE.Scene;
  private world: World;
  private tex = grassTexture();
  private mat: THREE.MeshBasicMaterial;
  private geo: THREE.PlaneGeometry;
  private tufts: Tuft[] = [];
  private cells = new Set<string>();
  private t = 0;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    this.geo = new THREE.PlaneGeometry(0.85, 0.7);
    this.geo.translate(0, 0.35, 0); // pivot at the base so it sways from the ground
    this.mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
  }

  private riverside(gx: number, gz: number) {
    for (const [ox, oz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const sy = this.world.surfaceY(gx + ox, gz + oz);
      if (this.world.get(gx + ox, sy + 1, gz + oz) === WATER) return true;
    }
    return false;
  }

  private makeTuft(x: number, y: number, z: number) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(this.geo, this.mat);
    const b = new THREE.Mesh(this.geo, this.mat);
    b.rotation.y = Math.PI / 2; // crossed planes read as 3D from any angle
    g.add(a, b);
    g.position.set(x, y, z);
    g.scale.setScalar(0.8 + Math.random() * 0.5);
    this.scene.add(g);
    return g;
  }

  setLight(l: number) {
    this.mat.color.setRGB(l, l, l); // dims with the world at night
  }

  update(dt: number, player: THREE.Vector3) {
    this.t += dt;

    // recycle tufts that fall too far behind
    for (let i = this.tufts.length - 1; i >= 0; i--) {
      const t = this.tufts[i];
      if (Math.hypot(t.x + 0.5 - player.x, t.z + 0.5 - player.z) > DESPAWN) {
        this.scene.remove(t.mesh);
        this.cells.delete(`${t.x},${t.z}`);
        this.tufts.splice(i, 1);
      }
    }

    // plant a few new tufts on shoreline grass/sand each frame
    let tries = 0;
    while (this.tufts.length < TARGET && tries < 6) {
      tries++;
      const a = Math.random() * Math.PI * 2;
      const r = NEAR + Math.random() * (FAR - NEAR);
      const gx = Math.floor(player.x + Math.cos(a) * r);
      const gz = Math.floor(player.z + Math.sin(a) * r);
      const key = `${gx},${gz}`;
      if (this.cells.has(key)) continue;
      const sy = this.world.surfaceY(gx, gz);
      const top = this.world.get(gx, sy, gz);
      if (
        (top === GRASS || top === SAND) &&
        this.world.get(gx, sy + 1, gz) === AIR &&
        this.riverside(gx, gz)
      ) {
        const mesh = this.makeTuft(gx + 0.5, sy + 1, gz + 0.5);
        this.cells.add(key);
        this.tufts.push({ mesh, x: gx, z: gz, phase: Math.random() * 6.28 });
      }
    }

    // wind sway
    for (const t of this.tufts) {
      t.mesh.rotation.z = Math.sin(this.t * 1.6 + t.phase) * 0.13;
    }
  }

  dispose() {
    for (const t of this.tufts) this.scene.remove(t.mesh);
    this.tufts = [];
    this.cells.clear();
    this.geo.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}
