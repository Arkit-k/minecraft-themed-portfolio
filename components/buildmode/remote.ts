/**
 * Other players, rendered in the shared world. Each remote player is a small
 * blocky third-person avatar (head / torso / swinging limbs) with a floating
 * nameplate showing where in the world they're connecting from ("Kolkata, IN").
 *
 * Positions arrive a couple of times a second over the presence API; we lerp
 * toward the latest target every frame so movement looks smooth, and swing the
 * limbs when the avatar is actually travelling. Avatars are created/removed as
 * players join and drop off, and everything is disposed on teardown.
 */

import * as THREE from "three";
import type { Presence } from "@/lib/presenceStore";

const CHARCOAL = 0x2b2b2b;
const EDGE = 0x9a9a9a;

type Remote = {
  group: THREE.Group;
  yawPivot: THREE.Group; // rotates the body to face travel/look direction
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  label: THREE.Sprite;
  labelTex: THREE.CanvasTexture;
  labelMat: THREE.SpriteMaterial;
  target: THREE.Vector3;
  targetYaw: number;
  speed: number; // smoothed, drives the walk cycle
  loc: string;
  mats: THREE.Material[];
  geos: THREE.BufferGeometry[];
  phase: number;
};

function labelTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  const pad = 24;
  const font = "600 34px ui-sans-serif, system-ui, sans-serif";
  const tmp = c.getContext("2d")!;
  tmp.font = font;
  const w = Math.ceil(tmp.measureText(text).width) + pad * 2;
  const h = 64;
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.font = font;
  // pill background
  const r = h / 2;
  x.fillStyle = "rgba(20,20,20,0.82)";
  x.beginPath();
  x.moveTo(r, 0);
  x.arcTo(w, 0, w, h, r);
  x.arcTo(w, h, 0, h, r);
  x.arcTo(0, h, 0, 0, r);
  x.arcTo(0, 0, w, 0, r);
  x.closePath();
  x.fill();
  x.fillStyle = "#f4f4f2";
  x.textBaseline = "middle";
  x.textAlign = "center";
  x.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class RemotePlayers {
  private scene: THREE.Scene;
  private players = new Map<string, Remote>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private box(
    mats: THREE.Material[],
    geos: THREE.BufferGeometry[],
    w: number,
    h: number,
    d: number,
    color = CHARCOAL
  ): THREE.Mesh {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.MeshBasicMaterial({ color });
    geos.push(g);
    mats.push(m);
    const mesh = new THREE.Mesh(g, m);
    // crisp voxel edges so the flat charcoal reads as a solid form
    const eg = new THREE.EdgesGeometry(g);
    const em = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.5 });
    geos.push(eg);
    mats.push(em);
    mesh.add(new THREE.LineSegments(eg, em));
    return mesh;
  }

  private make(p: Presence): Remote {
    const group = new THREE.Group();
    const yawPivot = new THREE.Group();
    group.add(yawPivot);
    const mats: THREE.Material[] = [];
    const geos: THREE.BufferGeometry[] = [];

    // torso + head sit on the pivot (feet at group origin, ~1.8 tall)
    const torso = this.box(mats, geos, 0.5, 0.7, 0.28);
    torso.position.y = 1.15;
    const head = this.box(mats, geos, 0.5, 0.5, 0.5);
    head.position.y = 1.72;
    const armL = this.box(mats, geos, 0.16, 0.62, 0.16);
    armL.position.set(-0.35, 1.28, 0);
    const armR = this.box(mats, geos, 0.16, 0.62, 0.16);
    armR.position.set(0.35, 1.28, 0);
    const legL = this.box(mats, geos, 0.18, 0.7, 0.18);
    legL.position.set(-0.13, 0.62, 0);
    const legR = this.box(mats, geos, 0.18, 0.7, 0.18);
    legR.position.set(0.13, 0.62, 0);
    // shift limb pivots to the shoulder/hip so they swing naturally
    for (const [limb, py] of [
      [armL, 1.28],
      [armR, 1.28],
      [legL, 0.62],
      [legR, 0.62],
    ] as const) {
      limb.geometry.translate(0, -((limb === armL || limb === armR ? 0.62 : 0.7) / 2), 0);
      limb.position.y = py + (limb === armL || limb === armR ? 0.62 : 0.7) / 2;
    }
    yawPivot.add(torso, head, armL, armR, legL, legR);

    // nameplate
    const labelTex = labelTexture(p.loc);
    const labelMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const label = new THREE.Sprite(labelMat);
    const aspect = labelTex.image.width / labelTex.image.height;
    label.scale.set(0.7 * aspect, 0.7, 1);
    label.position.y = 2.5;
    label.renderOrder = 999;
    group.add(label);

    group.position.set(p.x, p.y, p.z);
    yawPivot.rotation.y = p.yaw;
    this.scene.add(group);

    return {
      group,
      yawPivot,
      armL,
      armR,
      legL,
      legR,
      label,
      labelTex,
      labelMat,
      target: new THREE.Vector3(p.x, p.y, p.z),
      targetYaw: p.yaw,
      speed: 0,
      loc: p.loc,
      mats,
      geos,
      phase: 0,
    };
  }

  /** reconcile against the latest roster from the server */
  sync(list: Presence[]) {
    const seen = new Set<string>();
    for (const p of list) {
      seen.add(p.id);
      const r = this.players.get(p.id);
      if (!r) {
        this.players.set(p.id, this.make(p));
      } else {
        r.target.set(p.x, p.y, p.z);
        r.targetYaw = p.yaw;
        if (p.loc !== r.loc) {
          r.loc = p.loc;
          r.labelTex.dispose();
          r.labelTex = labelTexture(p.loc);
          r.labelMat.map = r.labelTex;
          const aspect = r.labelTex.image.width / r.labelTex.image.height;
          r.label.scale.set(0.7 * aspect, 0.7, 1);
          r.labelMat.needsUpdate = true;
        }
      }
    }
    // drop players no longer present
    for (const [id, r] of this.players) {
      if (!seen.has(id)) {
        this.disposeOne(r);
        this.players.delete(id);
      }
    }
  }

  update(dt: number) {
    const k = 1 - Math.pow(0.001, dt); // smoothing toward target
    for (const r of this.players.values()) {
      const prev = r.group.position.x + r.group.position.z;
      r.group.position.lerp(r.target, k);
      // shortest-arc yaw lerp
      let dyaw = r.targetYaw - r.yawPivot.rotation.y;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      r.yawPivot.rotation.y += dyaw * k;

      // estimate speed from how far we just moved → drives limb swing
      const moved = Math.abs(r.group.position.x + r.group.position.z - prev);
      r.speed += (moved / Math.max(dt, 1e-3) - r.speed) * 0.2;
      const walking = Math.min(1, r.speed / 4);
      r.phase += dt * (6 + r.speed * 1.5);
      const swing = Math.sin(r.phase) * 0.9 * walking;
      const bob = 0.02 * Math.sin(r.phase * 2) * walking;
      r.armL.rotation.x = swing;
      r.armR.rotation.x = -swing;
      r.legL.rotation.x = -swing;
      r.legR.rotation.x = swing;
      r.yawPivot.position.y = bob;
    }
  }

  count() {
    return this.players.size;
  }

  /** the location labels of everyone currently visible */
  locations() {
    return [...this.players.values()].map((r) => r.loc);
  }

  private disposeOne(r: Remote) {
    this.scene.remove(r.group);
    for (const g of r.geos) g.dispose();
    for (const m of r.mats) m.dispose();
    r.labelTex.dispose();
    r.labelMat.dispose();
  }

  clear() {
    for (const r of this.players.values()) this.disposeOne(r);
    this.players.clear();
  }

  dispose() {
    this.clear();
  }
}
