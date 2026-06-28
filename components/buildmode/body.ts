/**
 * First-person player body — a blocky, monochrome avatar you can see on
 * yourself, Minecraft-style:
 *   • world-space legs + hips that appear when you glance down
 *   • camera-attached arms (a "viewmodel") that stay in view
 * Limbs animate by state: idle, walking, running (stride scales with speed),
 * and swimming (body goes prone, arms windmill, legs flutter). Charcoal boxes
 * with crisp edge outlines to match the voxel world.
 */

import * as THREE from "three";

export type BodyState = {
  pos: THREE.Vector3;
  yaw: number;
  pitch: number;
  vx: number;
  vz: number;
  onGround: boolean;
  inWater: boolean;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function torchGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 48;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(24, 24, 1, 24, 24, 24);
  g.addColorStop(0, "rgba(255,240,200,0.95)");
  g.addColorStop(0.5, "rgba(255,225,160,0.35)");
  g.addColorStop(1, "rgba(255,225,160,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 48, 48);
  return new THREE.CanvasTexture(c);
}

export class PlayerBody {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  readonly group = new THREE.Group(); // world-space lower body
  readonly arms = new THREE.Group(); // camera-space viewmodel

  private legL: THREE.Group;
  private legR: THREE.Group;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private hammer!: THREE.Group; // held in the right hand by default
  private torchItem!: THREE.Group; // alternate held item (toggled with 0)
  private fireStick!: THREE.Group; // flaming stick that burns blocks
  private fireFlame?: THREE.Mesh;
  private fireGlow?: THREE.Sprite;
  private torchGlowTex?: THREE.Texture;
  private flameT = 0;

  private geos: THREE.BufferGeometry[] = [];
  private mats: THREE.Material[] = [];
  // per-instance so React strict-mode remounts never reuse a disposed material
  private edgeMat = new THREE.LineBasicMaterial({
    color: 0x141414,
    transparent: true,
    opacity: 0.35,
  });

  private phase = 0;
  private legAmp = 0;
  private armAmp = 0;
  private prone = 0; // 0 upright → 1 swimming flat
  private bob = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    // pivoted limb: box hanging from its top so rotation.x swings at the joint
    const limb = (w: number, h: number, d: number, color: number) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(0, -h / 2, 0);
      const mat = new THREE.MeshBasicMaterial({ color });
      mat.userData.base = mat.color.clone(); // remembered for day/night tint
      const mesh = new THREE.Mesh(g, mat);
      const eg = new THREE.EdgesGeometry(g);
      const edges = new THREE.LineSegments(eg, this.edgeMat);
      const grp = new THREE.Group();
      grp.add(mesh, edges);
      this.geos.push(g, eg);
      this.mats.push(mat);
      return grp;
    };

    // centered box (pivot at its middle) — for props like the hammer
    const block = (w: number, h: number, d: number, color: number) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshBasicMaterial({ color });
      mat.userData.base = mat.color.clone();
      const mesh = new THREE.Mesh(g, mat);
      const eg = new THREE.EdgesGeometry(g);
      const edges = new THREE.LineSegments(eg, this.edgeMat);
      const grp = new THREE.Group();
      grp.add(mesh, edges);
      this.geos.push(g, eg);
      this.mats.push(mat);
      return grp;
    };

    // ---- world-space lower body (feet at group origin = player.pos.y) ----
    // hips/torso stub, kept below eye height so it only shows when looking down
    const torso = limb(0.52, 0.62, 0.3, 0x3f3f3f);
    torso.position.y = 1.18; // hangs down to ~0.56 (waist)
    this.legL = limb(0.2, 0.92, 0.24, 0x383838);
    this.legR = limb(0.2, 0.92, 0.24, 0x464646);
    this.legL.position.set(-0.13, 0.95, 0);
    this.legR.position.set(0.13, 0.95, 0);
    this.group.add(torso, this.legL, this.legR);
    this.group.rotation.order = "YXZ";
    this.group.visible = false;
    scene.add(this.group);

    // ---- camera-attached arms (always visible, like an FPS hand) ----
    // small + pushed back so they sit in the lower corners, not filling the view
    this.armL = limb(0.08, 0.22, 0.08, 0x484848);
    this.armR = limb(0.08, 0.22, 0.08, 0x515151);
    this.armL.position.set(-0.52, -0.58, -1.0);
    this.armR.position.set(0.52, -0.58, -1.0);
    this.armL.rotation.order = "YXZ";
    this.armR.rotation.order = "YXZ";
    this.armL.rotation.z = -0.2;
    this.armR.rotation.z = 0.2;

    // ---- blocky hammer held in the right hand ----
    const hammer = new THREE.Group();
    const handle = block(0.035, 0.34, 0.035, 0x6a6a6a); // shaft
    const head = block(0.14, 0.1, 0.12, 0x2e2e2e); // heavy head
    head.position.y = 0.18; // sits at the top of the shaft
    hammer.add(handle, head);
    // grip at the hand end of the arm, angled so the head reads "up & forward"
    hammer.position.set(0, -0.22, -0.03);
    hammer.rotation.x = 1.0;
    this.armR.add(hammer);
    this.hammer = hammer;

    // ---- alternate held item: a torch (toggled with the 0 key) ----
    const torchItem = new THREE.Group();
    const shaftGeo = new THREE.BoxGeometry(0.04, 0.28, 0.04);
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x4a4438 });
    shaftMat.userData.base = shaftMat.color.clone(); // shaft dims at night
    const shaftEg = new THREE.EdgesGeometry(shaftGeo);
    this.geos.push(shaftGeo, shaftEg);
    this.mats.push(shaftMat);
    torchItem.add(
      new THREE.Mesh(shaftGeo, shaftMat),
      new THREE.LineSegments(shaftEg, this.edgeMat)
    );
    // flame tip — no `base`, so setLight leaves it glowing in the dark
    const tipGeo = new THREE.BoxGeometry(0.06, 0.08, 0.06);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
    this.geos.push(tipGeo);
    this.mats.push(tipMat);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.18;
    torchItem.add(tip);
    // warm additive halo around the flame so it reads as a lit torch
    this.torchGlowTex = torchGlowTexture();
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.torchGlowTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    glow.scale.setScalar(0.5);
    glow.position.y = 0.2;
    torchItem.add(glow);
    this.mats.push(glow.material as THREE.Material);
    torchItem.position.set(0, -0.22, -0.03);
    torchItem.rotation.x = 1.0;
    torchItem.visible = false;
    this.armR.add(torchItem);
    this.torchItem = torchItem;

    // ---- third held item: a flaming stick (burns blocks) ----
    const fireStick = new THREE.Group();
    const fsGeo = new THREE.BoxGeometry(0.035, 0.42, 0.035);
    const fsMat = new THREE.MeshBasicMaterial({ color: 0x3a342a });
    fsMat.userData.base = fsMat.color.clone();
    const fsEg = new THREE.EdgesGeometry(fsGeo);
    this.geos.push(fsGeo, fsEg);
    this.mats.push(fsMat);
    fireStick.add(
      new THREE.Mesh(fsGeo, fsMat),
      new THREE.LineSegments(fsEg, this.edgeMat)
    );
    const flGeo = new THREE.BoxGeometry(0.09, 0.14, 0.09);
    const flMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0 }); // glows (no base)
    this.geos.push(flGeo);
    this.mats.push(flMat);
    const flame = new THREE.Mesh(flGeo, flMat);
    flame.position.y = 0.26;
    fireStick.add(flame);
    this.fireFlame = flame;
    const fGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.torchGlowTex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      })
    );
    fGlow.scale.setScalar(0.75);
    fGlow.position.y = 0.28;
    fireStick.add(fGlow);
    this.mats.push(fGlow.material as THREE.Material);
    this.fireGlow = fGlow;
    fireStick.position.set(0, -0.2, -0.04);
    fireStick.rotation.x = 0.7; // brandished forward
    fireStick.visible = false;
    this.armR.add(fireStick);
    this.fireStick = fireStick;

    this.arms.add(this.armL, this.armR);
    this.camera.add(this.arms);
    // children of the camera only render if the camera is in the scene graph
    if (!this.camera.parent) scene.add(this.camera);
  }

  setVisible(v: boolean) {
    this.arms.visible = v;
    if (!v) this.group.visible = false;
  }

  // swap the right-hand item between hammer, torch, and flaming stick
  setHandItem(item: "hammer" | "torch" | "firestick") {
    if (this.hammer) this.hammer.visible = item === "hammer";
    if (this.torchItem) this.torchItem.visible = item === "torch";
    if (this.fireStick) this.fireStick.visible = item === "firestick";
  }

  // scale every limb's colour by the day/night light level
  setLight(l: number) {
    for (const m of this.mats) {
      const mm = m as THREE.MeshBasicMaterial;
      const b = mm.userData.base as THREE.Color | undefined;
      if (b) mm.color.setRGB(b.r * l, b.g * l, b.b * l);
    }
  }

  update(dt: number, st: BodyState) {
    // flicker the flaming stick when it's out
    if (this.fireStick?.visible && this.fireFlame && this.fireGlow) {
      this.flameT += dt;
      const fl = 0.8 + 0.2 * Math.sin(this.flameT * 14) + 0.1 * Math.sin(this.flameT * 27);
      this.fireFlame.scale.set(0.85 + 0.1 * Math.sin(this.flameT * 11), fl, 1);
      (this.fireGlow.material as THREE.SpriteMaterial).opacity = 0.7 + 0.3 * Math.abs(Math.sin(this.flameT * 9));
      this.fireGlow.scale.setScalar(0.7 + 0.12 * fl);
    }

    const speed = Math.hypot(st.vx, st.vz);
    const moving = speed > 0.4;
    const swimming = st.inWater && !st.onGround;

    // advance the gait — faster when running, brisk flutter when swimming
    const rate = swimming ? 9 : moving ? 5 + speed * 1.3 : 2.4;
    this.phase += dt * rate;

    // ease animation amplitudes so transitions are smooth
    const stride = Math.min(1, speed / 5.6); // 0..1 of full speed
    const k = Math.min(1, dt * 8);
    this.legAmp = lerp(this.legAmp, moving ? 0.5 + stride * 0.5 : 0.04, k);
    this.armAmp = lerp(this.armAmp, swimming ? 1.1 : moving ? 0.4 + stride * 0.4 : 0.06, k);
    this.prone = lerp(this.prone, swimming ? 1 : 0, Math.min(1, dt * 6));
    this.bob = lerp(this.bob, moving && !swimming ? 1 : 0, k);

    const sw = Math.sin(this.phase);

    // ---- world body: follow the player, face yaw, go prone when swimming ----
    this.group.position.copy(st.pos);
    this.group.rotation.y = st.yaw;
    this.group.rotation.x = -this.prone * 1.15; // lie flat in water
    // visible when looking down (or swimming), like Minecraft's own legs
    this.group.visible = st.pitch < -0.12 || this.prone > 0.05;

    const legPhase = swimming ? this.phase * 1.4 : this.phase;
    const legSwing = Math.sin(legPhase);
    this.legL.rotation.x = legSwing * this.legAmp;
    this.legR.rotation.x = -legSwing * this.legAmp;

    // ---- viewmodel arms ----
    this.arms.position.y = -0.02 + (this.bob ? Math.sin(this.phase * 2) * 0.02 : 0);
    if (swimming) {
      // alternating windmill crawl
      this.armL.rotation.x = -1.0 + Math.sin(this.phase) * this.armAmp;
      this.armR.rotation.x = -1.0 + Math.sin(this.phase + Math.PI) * this.armAmp;
    } else {
      // forward-pointing arms that swing opposite to the legs
      const base = -1.15;
      this.armL.rotation.x = base - sw * this.armAmp;
      this.armR.rotation.x = base + sw * this.armAmp;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.camera.remove(this.arms);
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    this.edgeMat.dispose();
    this.torchGlowTex?.dispose();
  }
}
