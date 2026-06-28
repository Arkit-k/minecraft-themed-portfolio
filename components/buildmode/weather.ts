/**
 * Weather — a moving cube of falling particles centered on the camera, so it
 * always surrounds the player. Driven by a mode set from the scheduler:
 *   • "rain"  — fast, thin, light-gray streaks
 *   • "snow"  — slow, drifting, near-white flakes
 *   • "clear" — particles fade out
 * Intensity eases in/out so episodes start and stop softly. Monochrome,
 * unlit, fog-aware. Particles live in camera-local space and wrap bottom→top.
 */

import * as THREE from "three";

const COUNT = 1300;
const R = 22; // horizontal half-extent of the weather box
const H = 18; // vertical half-extent

export type WeatherMode =
  | "clear"
  | "rain"
  | "snow"
  | "sandstorm"
  | "thunder"
  | "typhoon";

const PARAMS = {
  rain: { color: 0x8d8d88, size: 0.07, opacity: 0.55, fall: 24, sway: 0.15, wind: 2 },
  snow: { color: 0xf0eee7, size: 0.13, opacity: 0.85, fall: 3.6, sway: 1.1, wind: 0.6 },
  sandstorm: { color: 0xc6a577, size: 0.11, opacity: 0.6, fall: 3, sway: 0.4, wind: 24 },
  thunder: { color: 0x70706e, size: 0.08, opacity: 0.62, fall: 28, sway: 0.2, wind: 6 },
  typhoon: { color: 0x84847f, size: 0.08, opacity: 0.66, fall: 26, sway: 0.3, wind: 18 },
};

export class Weather {
  private scene: THREE.Scene;
  private points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private mat: THREE.PointsMaterial;
  private pos: Float32Array;
  private vy: Float32Array;
  private type: Exclude<WeatherMode, "clear"> = "rain"; // last active precipitation
  private intensity = 0; // 0..1, eased
  private target = 0;
  private t = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pos = new Float32Array(COUNT * 3);
    this.vy = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      this.pos[i * 3] = (Math.random() * 2 - 1) * R;
      this.pos[i * 3 + 1] = (Math.random() * 2 - 1) * H;
      this.pos[i * 3 + 2] = (Math.random() * 2 - 1) * R;
      this.vy[i] = 0.7 + Math.random() * 0.6;
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({
      color: PARAMS.rain.color,
      size: PARAMS.rain.size,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  setMode(mode: WeatherMode) {
    if (mode === "clear") {
      this.target = 0;
      return;
    }
    this.target = 1;
    if (this.type !== mode) {
      this.type = mode;
      const p = PARAMS[mode];
      this.mat.color.setHex(p.color);
      this.mat.size = p.size;
    }
  }

  update(dt: number, camera: THREE.PerspectiveCamera) {
    this.t += dt;
    this.intensity += (this.target - this.intensity) * Math.min(1, dt * 0.6);
    const vis = this.intensity > 0.01;
    this.points.visible = vis;
    if (!vis) return;

    const p = PARAMS[this.type];
    this.mat.opacity = p.opacity * this.intensity;
    this.points.position.copy(camera.position);
    const snow = this.type === "snow";
    for (let i = 0; i < COUNT; i++) {
      let y = this.pos[i * 3 + 1] - p.fall * this.vy[i] * dt;
      // horizontal wind (drives sandstorms / typhoons sideways) + snow drift
      let x =
        this.pos[i * 3] +
        p.wind * dt +
        (snow ? Math.sin(this.t * 0.8 + i) * p.sway * dt : 0);
      if (y < -H) {
        y += 2 * H;
        x = (Math.random() * 2 - 1) * R;
        this.pos[i * 3 + 2] = (Math.random() * 2 - 1) * R;
      }
      if (x > R) x -= 2 * R;
      else if (x < -R) x += 2 * R;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geo.dispose();
    this.mat.dispose();
  }
}
