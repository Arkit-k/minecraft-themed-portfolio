/**
 * Atmosphere for the voxel world: a soft sun, drifting blocky clouds, and a few
 * birds wheeling overhead — plus an in-world billboard. All monochrome and
 * fog-exempt so they read against the pale sky. The sky group follows the
 * camera so it stays "infinitely far" in the endless world.
 */

import * as THREE from "three";
import { World, AIR } from "./world";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function sunTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,252,0.98)");
  g.addColorStop(0.55, "rgba(250,248,242,0.85)");
  g.addColorStop(1, "rgba(250,248,242,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  x.beginPath();
  x.arc(32, 32, 22, 0, Math.PI * 2);
  x.strokeStyle = "rgba(34,34,34,0.16)";
  x.lineWidth = 2;
  x.stroke();
  return new THREE.CanvasTexture(c);
}

function birdTexture(frame: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const x = c.getContext("2d")!;
  x.strokeStyle = "#222";
  x.lineWidth = 2;
  x.beginPath();
  if (frame === 0) {
    x.moveTo(2, 10);
    x.lineTo(8, 5);
    x.lineTo(14, 10);
  } else {
    x.moveTo(2, 6);
    x.lineTo(8, 10);
    x.lineTo(14, 6);
  }
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function moonTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, "rgba(245,246,250,0.98)");
  g.addColorStop(0.6, "rgba(214,218,228,0.8)");
  g.addColorStop(1, "rgba(214,218,228,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  // a couple of craters
  x.fillStyle = "rgba(120,124,134,0.45)";
  x.beginPath();
  x.arc(26, 28, 4, 0, Math.PI * 2);
  x.arc(40, 38, 3, 0, Math.PI * 2);
  x.arc(36, 22, 2, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(c);
}

// day–night sky/fog colour keyframes (monochrome with warm dawn/dusk)
const C_NIGHT = new THREE.Color(0x171922);
const C_DAWN = new THREE.Color(0xd7c4a9);
const C_DAY = new THREE.Color(0xeeece6);
const C_DUSK = new THREE.Color(0xd4bfa1);
const SKY_STOPS: [number, THREE.Color][] = [
  [0.0, C_NIGHT],
  [0.2, C_DAWN],
  [0.3, C_DAY],
  [0.68, C_DAY],
  [0.78, C_DUSK],
  [0.9, C_NIGHT],
  [1.0, C_NIGHT],
];
const smoothstep = (t: number) => t * t * (3 - 2 * t);
function skyColorAt(t: number, out: THREE.Color) {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [t0, c0] = SKY_STOPS[i];
    const [t1, c1] = SKY_STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      out.copy(c0).lerp(c1, smoothstep((t - t0) / (t1 - t0 || 1)));
      return;
    }
  }
  out.copy(C_NIGHT);
}
const DAY_LENGTH = 480; // seconds for one full day–night cycle (~8 min)

type Bird = {
  sprite: THREE.Sprite;
  a: number;
  r: number;
  y: number;
  spd: number;
  flap: number;
};

export function createSky(scene: THREE.Scene) {
  const group = new THREE.Group();
  scene.add(group);

  // sun
  const sunTex = sunTexture();
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sunTex,
      fog: false,
      transparent: true,
      depthWrite: false, // don't block other transparents…
      depthTest: true, // …but DO get occluded by terrain/trees in front
    })
  );
  sun.scale.set(34, 34, 1);
  group.add(sun);

  // moon (opposite the sun)
  const moonTex = moonTexture();
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: moonTex,
      fog: false,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    })
  );
  moon.scale.set(26, 26, 1);
  group.add(moon);

  // stars — a dome of points that fades in at night
  const starGeo = new THREE.BufferGeometry();
  const SN = 280;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    let x = Math.random() * 2 - 1;
    let y = Math.random() * 2 - 1;
    let z = Math.random() * 2 - 1;
    const L = Math.hypot(x, y, z) || 1;
    x /= L;
    y /= L;
    z /= L;
    y = Math.abs(y) * 0.9 + 0.06; // upper dome
    sp[i * 3] = x * 210;
    sp[i * 3 + 1] = y * 210;
    sp[i * 3 + 2] = z * 210;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  // clouds (clusters of white boxes)
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xd7d4cb, fog: false });
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(rand(6, 13), rand(3, 5), rand(6, 13)),
        cloudMat
      );
      m.position.set(rand(-7, 7), rand(-2, 2), rand(-7, 7));
      cl.add(m);
    }
    cl.position.set(rand(-180, 180), rand(55, 82), rand(-180, 180));
    cl.userData.spd = rand(1.2, 3.2);
    group.add(cl);
    clouds.push(cl);
  }

  // birds wheeling overhead
  const texA = birdTexture(0);
  const texB = birdTexture(1);
  const birds: Bird[] = [];
  for (let i = 0; i < 6; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texA, fog: false, transparent: true, depthWrite: false })
    );
    sprite.scale.set(3, 3, 1);
    group.add(sprite);
    birds.push({
      sprite,
      a: Math.random() * Math.PI * 2,
      r: rand(28, 70),
      y: rand(26, 46),
      spd: rand(0.12, 0.32),
      flap: Math.random() * 10,
    });
  }

  // planes drifting overhead, each trailing a contrail
  const planeMat = new THREE.MeshBasicMaterial({ color: 0xcfccc3, fog: false });
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0xe9e7df,
    fog: false,
    transparent: true,
    opacity: 0.3,
  });
  const planes: { g: THREE.Group; spd: number }[] = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 0.7), planeMat);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 6), planeMat);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 2.4), planeMat);
    tail.position.x = -1.8;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.18), planeMat);
    fin.position.set(-1.8, 0.5, 0);
    const trail = new THREE.Mesh(new THREE.BoxGeometry(16, 0.22, 0.22), trailMat);
    trail.position.x = -10; // streak behind the tail
    g.add(fus, wing, tail, fin, trail);
    g.position.set(rand(-180, 180), rand(70, 92), rand(-160, 160));
    g.scale.setScalar(rand(0.8, 1.3));
    group.add(g);
    planes.push({ g, spd: rand(10, 16) });
  }

  let tod = 0.3; // time of day 0..1 — start mid-morning
  let light = 1; // 0.4 (night) .. 1 (noon)
  const skyC = new THREE.Color();
  const atm = new THREE.Color(1, 1, 1); // per-planet atmosphere tint
  const setAtmosphere = (r: number, g: number, b: number) => atm.setRGB(r, g, b);

  const update = (dt: number, camera: THREE.Camera) => {
    group.position.copy(camera.position);

    // advance the clock and place the sun/moon on their arc
    tod = (tod + dt / DAY_LENGTH) % 1;
    const sunAng = (tod - 0.25) * Math.PI * 2;
    const up = Math.sin(sunAng);
    light = 0.4 + 0.6 * Math.max(0, up);
    sun.position.set(Math.cos(sunAng) * 150, up * 120, -90);
    sun.visible = up > -0.08;
    const mAng = sunAng + Math.PI;
    const mUp = Math.sin(mAng);
    moon.position.set(Math.cos(mAng) * 150, mUp * 120, -90);
    moon.visible = mUp > -0.08;

    // stars fade in once it's dark
    starMat.opacity = THREE.MathUtils.clamp((0.58 - light) / 0.16, 0, 1) * 0.9;
    stars.visible = starMat.opacity > 0.01;

    // tint the sky + fog by time of day, then by the planet's atmosphere
    skyColorAt(tod, skyC);
    skyC.multiply(atm);
    if (scene.background instanceof THREE.Color) scene.background.copy(skyC);
    if (scene.fog) scene.fog.color.copy(skyC);

    // clouds dim and birds roost as night falls
    const cl = 0.28 + 0.72 * light;
    cloudMat.color.setRGB(0.84 * cl, 0.83 * cl, 0.8 * cl);
    const birdsOut = light > 0.62;
    for (const cloud of clouds) {
      cloud.position.x += (cloud.userData.spd as number) * dt;
      if (cloud.position.x > 200) cloud.position.x = -200;
    }
    for (const b of birds) {
      b.sprite.visible = birdsOut;
      if (!birdsOut) continue;
      b.a += b.spd * dt;
      b.sprite.position.set(Math.cos(b.a) * b.r, b.y + Math.sin(b.a * 2) * 2, Math.sin(b.a) * b.r);
      b.flap += dt * 12;
      b.sprite.material.map = Math.sin(b.flap) > 0 ? texA : texB;
    }
    for (const p of planes) {
      p.g.visible = light > 0.5; // grounded after dark
      if (!p.g.visible) continue;
      p.g.position.x += p.spd * dt;
      if (p.g.position.x > 210) {
        p.g.position.x = -210;
        p.g.position.z = rand(-160, 160);
      }
    }
  };

  const dispose = () => {
    scene.remove(group);
    sunTex.dispose();
    moonTex.dispose();
    starGeo.dispose();
    starMat.dispose();
    texA.dispose();
    texB.dispose();
    cloudMat.dispose();
    planeMat.dispose();
    trailMat.dispose();
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  };

  // step through morning → day → evening → night (clock resumes from there)
  const PHASES: [number, string][] = [
    [0.24, "Morning"],
    [0.5, "Day"],
    [0.76, "Evening"],
    [0.0, "Night"],
  ];
  let phaseIdx = 1;
  const cycleTime = () => {
    phaseIdx = (phaseIdx + 1) % PHASES.length;
    tod = PHASES[phaseIdx][0];
    return PHASES[phaseIdx][1];
  };

  return { update, dispose, getLight: () => light, cycleTime, setAtmosphere };
}

function billboardTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 360;
  const x = c.getContext("2d")!;
  x.fillStyle = "#efece4";
  x.fillRect(0, 0, 1024, 360);
  x.strokeStyle = "#222";
  x.lineWidth = 10;
  x.strokeRect(14, 14, 996, 332);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#222";
  x.font = "bold 122px Georgia, 'Times New Roman', serif";
  x.fillText("ARKIT KARMOKAR", 512, 138);
  x.fillStyle = "#4a4a4a";
  x.font = "46px Arial, sans-serif";
  x.fillText("FULL STACK DEVELOPER", 512, 248);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export function createBillboard(
  world: World,
  x: number,
  z: number,
  faceX = 0,
  faceZ = 0
) {
  const group = new THREE.Group();
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const groundY = world.surfaceY(cx, cz); // top solid block
  const postH = 3;
  const boardW = 10;
  const boardH = 3.4;
  const gy = groundY + 1; // posts sit on the ground

  // carve a clean square clearing so trees/hills never intersect the sign
  const cw = Math.ceil(boardW / 2);
  const topY = gy + postH + boardH + 1;
  for (let yy = gy; yy <= topY; yy++)
    for (let xx = cx - cw; xx <= cx + cw; xx++)
      for (let zz = cz - cw; zz <= cz + cw; zz++)
        if (world.get(xx, yy, zz) !== AIR) world.carve(xx, yy, zz);

  const postMat = new THREE.MeshBasicMaterial({ color: 0x3a3a38 });
  const addPost = (px: number) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, postH + boardH, 0.4),
      postMat
    );
    m.position.set(px, gy + (postH + boardH) / 2, 0);
    group.add(m);
  };
  addPost(-boardW / 2 + 0.7);
  addPost(boardW / 2 - 0.7);

  const tex = billboardTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), mat);
  front.position.set(0, gy + postH + boardH / 2, 0.06);
  group.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), mat);
  back.rotation.y = Math.PI;
  back.position.set(0, gy + postH + boardH / 2, -0.06);
  group.add(back);

  group.position.set(x, 0, z);
  group.rotation.y = Math.atan2(faceX - x, faceZ - z); // face the target
  return group;
}
