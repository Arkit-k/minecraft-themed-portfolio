/**
 * Space Mode scene — the 3D solar system you fly through between worlds. Its own
 * lit THREE scene (separate from the voxel world): a starfield, a sun, and one
 * planet per PLANETS entry arranged in an arc ahead of you. Mouse-look to look
 * around; pick a planet (1-4) to fly toward it; when you arrive, the host swaps
 * the world to that planet. Lightly tinted (it's space, not the editorial page).
 */

import * as THREE from "three";
import { PLANETS, Planet } from "./world";

// per-planet tints so they read apart — Inferno orange, Oceanus blue
const TINTS: Record<string, number> = {
  Terra: 0x7f93a0,
  Inferno: 0xd2772f,
  Oceanus: 0x4a86cf,
  Luna: 0xb4b4b0,
};
const RADII: Record<string, number> = { Terra: 10, Inferno: 8, Oceanus: 9, Luna: 5 };
// theme colours for the HUD (CSS), keyed by planet name
export const PLANET_THEME: Record<string, string> = {
  Terra: "#7f93a0",
  Inferno: "#e08743",
  Oceanus: "#5a93da",
  Luna: "#b4b4b0",
};

function craterTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#b8b8b8";
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    const r = 2 + Math.random() * 9;
    x.fillStyle = `rgba(${60 + Math.random() * 60 | 0},${60 + Math.random() * 60 | 0},${60 + Math.random() * 60 | 0},0.5)`;
    x.beginPath();
    x.arc(Math.random() * 128, Math.random() * 128, r, 0, Math.PI * 2);
    x.fill();
  }
  return new THREE.CanvasTexture(c);
}

function sunTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, "rgba(255,250,235,1)");
  g.addColorStop(0.5, "rgba(255,240,200,0.7)");
  g.addColorStop(1, "rgba(255,240,200,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

type PlanetObj = { mesh: THREE.Mesh; planet: Planet; radius: number };

export class SpaceScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private stars: THREE.Points;
  private starGeo: THREE.BufferGeometry;
  private starMat: THREE.PointsMaterial;
  private sun: THREE.Sprite;
  private sunTex: THREE.Texture;
  private craterTex: THREE.Texture;
  private planets: PlanetObj[] = [];
  private mats: THREE.Material[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private yaw = 0;
  private pitch = 0;
  private target: number | null = null;
  private flyT = 0; // time since a destination was chosen
  private t = 0;

  constructor() {
    this.scene.background = new THREE.Color(0x05060a);
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      4000
    );

    // lights so the planets read as 3D spheres
    this.scene.add(new THREE.AmbientLight(0x33363c));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
    sunLight.position.set(-1, 0.5, 0.4);
    this.scene.add(sunLight);

    // starfield
    const N = 1400;
    const sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      let x = Math.random() * 2 - 1;
      let y = Math.random() * 2 - 1;
      let z = Math.random() * 2 - 1;
      const L = Math.hypot(x, y, z) || 1;
      x /= L;
      y /= L;
      z /= L;
      sp[i * 3] = x * 1200;
      sp[i * 3 + 1] = y * 1200;
      sp[i * 3 + 2] = z * 1200;
    }
    this.starGeo = new THREE.BufferGeometry();
    this.starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false });
    this.stars = new THREE.Points(this.starGeo, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // sun (off to one side, matching the light)
    this.sunTex = sunTexture();
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sunTex, transparent: true, depthWrite: false }));
    this.sun.scale.setScalar(120);
    this.sun.position.set(-700, 350, 280);
    this.scene.add(this.sun);

    // planets in an arc ahead of the player
    this.craterTex = craterTexture();
    PLANETS.forEach((planet, i) => {
      const radius = RADII[planet.name] ?? 7;
      const geo = new THREE.SphereGeometry(radius, 32, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: TINTS[planet.name] ?? 0x9a9a9a,
        map: this.craterTex,
        roughness: 0.95,
        metalness: 0.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const spread = (i - (PLANETS.length - 1) / 2) * 30;
      mesh.position.set(spread, 0, -62); // a clean row ahead of the camera
      this.scene.add(mesh);
      this.geos.push(geo);
      this.mats.push(mat);
      this.planets.push({ mesh, planet, radius });
    });
  }

  reset() {
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.target = null;
  }

  setAspect(a: number) {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }

  /** names for the HUD, in selection order */
  planetNames() {
    return this.planets.map((p) => p.planet.name);
  }

  look(dx: number, dy: number) {
    if (this.target !== null) return; // locked while flying in
    this.yaw -= dx * 0.0022;
    this.pitch -= dy * 0.0022;
    const lim = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  selectPlanet(i: number) {
    if (i >= 0 && i < this.planets.length) {
      this.target = i;
      this.flyT = 0;
    }
  }

  /** advance; returns the planet to land on once we've flown in */
  update(dt: number): { arrived: boolean; planet?: Planet } {
    this.t += dt;
    for (const p of this.planets) p.mesh.rotation.y += dt * 0.08;
    this.stars.rotation.y += dt * 0.005;

    if (this.target === null) {
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      return { arrived: false };
    }

    // fly toward the chosen planet, looking at it
    this.flyT += dt;
    const tp = this.planets[this.target];
    this.camera.lookAt(tp.mesh.position);
    const dir = tp.mesh.position.clone().sub(this.camera.position);
    const dist = dir.length();
    const stop = tp.radius + 6;
    // land once we're close OR after a short flight (guaranteed arrival)
    if (dist > stop && this.flyT < 1.5) {
      dir.normalize();
      this.camera.position.addScaledVector(dir, Math.min(dist - stop, dt * 95));
      return { arrived: false };
    }
    return { arrived: true, planet: tp.planet };
  }

  dispose() {
    this.starGeo.dispose();
    this.starMat.dispose();
    this.sunTex.dispose();
    (this.sun.material as THREE.Material).dispose();
    this.craterTex.dispose();
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}
