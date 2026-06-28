"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  World, AIR, WATER, TORCH, PALETTE, BLOCK_NAMES, PLANETS, Planet, launchCentersNear,
} from "./world";
import { SpaceScene, PLANET_THEME } from "./space";
import {
  buildChunkGeometry, createAtlasTexture, setSnowCover, setBlockTint, setColored,
} from "./mesh";
import { Player } from "./player";
import { PlayerBody } from "./body";
import { Weather, WeatherMode } from "./weather";
import { Critters } from "./critters";
import { Footprints, Splashes, TorchGlow, Fireflies, Campfires } from "./effects";
import { Foliage } from "./foliage";
import { Minimap } from "./minimap";
import { BotManager } from "./bots";
import { createSky, createBillboard } from "./sky";

const ENEMY_COUNT = 5;
const RADIUS = 6; // chunk render radius around the player
const TORCH_FOG = new THREE.Color(0x5a5048); // fog lifts toward this with a torch

const SAVE_KEY = "buildmode.world.v2";
const SKY = 0xeeece6; // near-white, slight warm

type Save = {
  edits: number[][];
  player: { pos: [number, number, number]; yaw: number; pitch: number };
};

function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as Save) : null;
  } catch {
    return null;
  }
}

export function BuildMode({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<"mine" | "build">("build");
  const [mode, setMode] = useState<"build" | "fight">("build");
  const [health, setHealth] = useState(100);
  const [enemies, setEnemies] = useState(0);
  const [kills, setKills] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [dead, setDead] = useState(false);
  const [flash, setFlash] = useState(0);
  const [timePhase, setTimePhase] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [flight, setFlight] = useState<"play" | "boarding" | "ascending" | "space">("play");
  const [nearRocket, setNearRocket] = useState(false);
  const [arrival, setArrival] = useState<string | null>(null);
  const launchGoRef = useRef<() => void>(() => {});
  const pickDestRef = useRef<(i: number) => void>(() => {});
  const abortFlightRef = useRef<() => void>(() => {});
  const fadeRef = useRef<HTMLDivElement>(null);
  const lightningRef = useRef<HTMLDivElement>(null);
  const killsRef = useRef(0);
  const deathsRef = useRef(0);
  const respawnRef = useRef<() => void>(() => {});
  const selectedRef = useRef(0);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const bigMapRef = useRef<HTMLCanvasElement>(null);
  const toolRef = useRef<"mine" | "build">("build");
  const exitRef = useRef(onExit);
  const toggleModeRef = useRef<() => void>(() => {});
  exitRef.current = onExit;

  const flipTool = () => {
    const next = toolRef.current === "build" ? "mine" : "build";
    toolRef.current = next;
    setTool(next);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      setError("WebGL isn't available in this browser.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    const canvas = renderer.domElement;
    canvas.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 30, (RADIUS - 0.5) * 16);
    const camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );

    const atlas = createAtlasTexture();
    const material = new THREE.MeshBasicMaterial({
      map: atlas,
      vertexColors: true,
    });
    // translucent pass for the sea — its own texture so we can scroll it
    // vertically each frame for a flowing-water look (sea ripples + waterfalls)
    const waterAtlas = createAtlasTexture();
    waterAtlas.wrapT = THREE.RepeatWrapping;
    const waterMaterial = new THREE.MeshBasicMaterial({
      map: waterAtlas,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const world = new World();
    const save = loadSave();
    if (save?.edits) world.applyEdits(save.edits);

    const player = new Player();
    player.spawn(world);
    if (save?.player) {
      player.pos.fromArray(save.player.pos);
      player.yaw = save.player.yaw;
      player.pitch = save.player.pitch;
    }

    // visible first-person body (arms always, legs when you look down)
    const body = new PlayerBody(scene, camera);
    const bodyInWater = () =>
      world.get(
        Math.floor(player.pos.x),
        Math.floor(player.pos.y + 0.9),
        Math.floor(player.pos.z)
      ) === WATER ||
      world.get(
        Math.floor(player.pos.x),
        Math.floor(player.pos.y + 0.1),
        Math.floor(player.pos.z)
      ) === WATER;

    // weather (rain low, snow high) and ambient wildlife
    const weather = new Weather(scene);
    const critters = new Critters(scene, world);
    const footprints = new Footprints(scene, world);
    const splashes = new Splashes(scene);
    const burns = new Splashes(scene, 0xffb060); // warm embers when burning blocks
    const torches = new TorchGlow(scene);
    if (save?.edits)
      for (const [ex, ey, ez, et] of save.edits)
        if (et === TORCH) torches.add(ex, ey, ez);
    const fireflies = new Fireflies(scene, world);
    const campfires = new Campfires(scene);
    const foliage = new Foliage(scene, world);
    const minimap = minimapRef.current ? new Minimap(minimapRef.current, world) : null;
    minimap?.setBig(bigMapRef.current);
    let bigMapOpen = false;

    // ---- space mode ----
    const space = new SpaceScene();
    let phase: "play" | "boarding" | "ascending" | "space" = "play";
    let ascentT = 0;
    let nearRocketLocal = false;
    let fadeT = 0;
    let fadeTarget = 0;
    let atm: [number, number, number] = PLANETS[0].atmosphere; // sky/light tint
    let arrivalTimer = 0 as unknown as ReturnType<typeof setTimeout>;

    const enterBoarding = () => {
      if (phase !== "play") return;
      phase = "boarding";
      setFlight("boarding");
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
    const startAscent = () => {
      if (phase !== "boarding") return;
      phase = "ascending";
      setFlight("ascending");
      ascentT = 0;
    };
    const pickDest = (i: number) => {
      if (phase !== "space") return;
      space.selectPlanet(i);
      canvas.requestPointerLock(); // re-acquire control for the landing
    };
    const abortFlight = () => {
      phase = "play";
      setFlight("play");
      fadeTarget = 0;
      canvas.requestPointerLock();
    };
    launchGoRef.current = startAscent;
    pickDestRef.current = pickDest;
    abortFlightRef.current = abortFlight;
    let wasInWater = false;

    // ---- infinite chunk streaming ----
    const chunkMeshes = new Map<string, THREE.Mesh>(); // opaque terrain
    const waterMeshes = new Map<string, THREE.Mesh>(); // translucent sea
    const dropMesh = (map: Map<string, THREE.Mesh>, key: string) => {
      const m = map.get(key);
      if (m) {
        scene.remove(m);
        m.geometry.dispose();
        map.delete(key);
      }
    };
    const buildOne = (cx: number, cz: number) => {
      const key = `${cx},${cz}`;
      dropMesh(chunkMeshes, key);
      dropMesh(waterMeshes, key);
      const { opaque, water } = buildChunkGeometry(world, cx, cz);
      if (opaque) {
        const m = new THREE.Mesh(opaque, material);
        chunkMeshes.set(key, m);
        scene.add(m);
      }
      if (water) {
        const wm = new THREE.Mesh(water, waterMaterial);
        wm.renderOrder = 1; // draw after opaque so blending is correct
        waterMeshes.set(key, wm);
        scene.add(wm);
      }
    };
    const isLoaded = (key: string) =>
      chunkMeshes.has(key) || waterMeshes.has(key);
    // when snow accumulates or melts, re-skin loaded chunks a few per frame
    let resnowQueue: string[] = [];
    const resnowAll = () => {
      resnowQueue = Array.from(
        new Set([...chunkMeshes.keys(), ...waterMeshes.keys()])
      );
    };
    const rebuildDirty = () => {
      for (const key of world.takeDirty()) {
        if (!isLoaded(key)) continue; // only remesh loaded chunks
        const [cx, cz] = key.split(",").map(Number);
        buildOne(cx, cz);
      }
    };
    let evictTick = 0;
    const updateChunks = () => {
      const pcx = Math.floor(player.pos.x / 16);
      const pcz = Math.floor(player.pos.z / 16);
      // unload chunks beyond the radius (both layers)
      const loaded = new Set([...chunkMeshes.keys(), ...waterMeshes.keys()]);
      for (const key of loaded) {
        const [cx, cz] = key.split(",").map(Number);
        if (Math.abs(cx - pcx) > RADIUS + 1 || Math.abs(cz - pcz) > RADIUS + 1) {
          dropMesh(chunkMeshes, key);
          dropMesh(waterMeshes, key);
        }
      }
      // build the nearest missing chunks (a few per frame so it streams in)
      const missing: [number, number, number][] = [];
      for (let dx = -RADIUS; dx <= RADIUS; dx++)
        for (let dz = -RADIUS; dz <= RADIUS; dz++) {
          if (dx * dx + dz * dz > RADIUS * RADIUS) continue;
          const cx = pcx + dx;
          const cz = pcz + dz;
          if (!isLoaded(`${cx},${cz}`)) missing.push([dx * dx + dz * dz, cx, cz]);
        }
      missing.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < 2 && i < missing.length; i++) buildOne(missing[i][1], missing[i][2]);
      // throttled re-skin after a snow toggle so it doesn't hitch
      for (let i = 0; i < 3 && resnowQueue.length; i++) {
        const key = resnowQueue.shift()!;
        if (isLoaded(key)) {
          const [cx, cz] = key.split(",").map(Number);
          buildOne(cx, cz);
        }
      }
      // periodically free chunk data well outside the view
      if (++evictTick % 90 === 0) {
        const keep = new Set<string>();
        for (let dx = -RADIUS - 3; dx <= RADIUS + 3; dx++)
          for (let dz = -RADIUS - 3; dz <= RADIUS + 3; dz++)
            keep.add(`${pcx + dx},${pcz + dz}`);
        world.evict(keep);
      }
    };

    // targeted-block highlight
    const hl = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.003, 1.003, 1.003)),
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.5 })
    );
    hl.visible = false;
    scene.add(hl);

    // ---- combat ----
    const bots = new BotManager(scene, world);
    bots.spawn(ENEMY_COUNT, player.pos);
    bots.setVisible(false);
    const modeRef = { current: "build" as "build" | "fight" };
    const healthRef = { current: 100 };
    let flashUntil = 0;

    // a brief shot tracer
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const tracer = new THREE.Line(
      tracerGeo,
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.6 })
    );
    tracer.visible = false;
    scene.add(tracer);
    let tracerUntil = 0;
    let flashOn = false;

    const respawnEnemies = () => {
      bots.spawn(ENEMY_COUNT, player.pos);
      bots.setVisible(modeRef.current === "fight");
      setEnemies(bots.aliveCount);
    };
    const toggleMode = () => {
      const next = modeRef.current === "fight" ? "build" : "fight";
      modeRef.current = next;
      setMode(next);
      if (next === "fight") {
        if (bots.aliveCount === 0) respawnEnemies();
        bots.setVisible(true);
        setEnemies(bots.aliveCount);
      } else {
        bots.setVisible(false);
      }
    };
    toggleModeRef.current = toggleMode;

    // ---- sky + billboards (a ring around spawn, all facing the player) ----
    const sky = createSky(scene);
    sky.setAtmosphere(atm[0], atm[1], atm[2]); // home atmosphere to start
    setBlockTint(atm[0], atm[1], atm[2]);
    setColored(PLANETS[0].colored); // home (Terra) is black & white
    const billboardSpots: [number, number][] = [
      [0, -13],
      [13, 4],
      [-13, 4],
      [9, 16],
      [-9, 16],
      [0, 20],
    ];
    const billboards = billboardSpots.map(([bx, bz]) => {
      const g = createBillboard(world, bx, bz, 0, 0);
      scene.add(g);
      return g;
    });

    // ---- elimination / respawn ----
    const deadRef = { current: false };
    const respawnPlayer = () => {
      player.spawn(world);
      healthRef.current = 100;
      setHealth(100);
      respawnEnemies();
      deadRef.current = false;
      setDead(false);
    };
    respawnRef.current = respawnPlayer;

    // ---- input ----
    const input = { f: false, b: false, l: false, r: false, jump: false, sprint: false };
    const setKey = (code: string, down: boolean) => {
      switch (code) {
        case "ShiftLeft":
        case "ShiftRight":
          input.sprint = down;
          break;
        case "KeyW":
        case "ArrowUp":
          input.f = down;
          break;
        case "KeyS":
        case "ArrowDown":
          input.b = down;
          break;
        case "KeyA":
        case "ArrowLeft":
          input.l = down;
          break;
        case "KeyD":
        case "ArrowRight":
          input.r = down;
          break;
        case "Space":
          input.jump = down;
          break;
      }
    };
    // right-hand tool cycled with 0: hammer (build) → torch (place) → firestick (burn)
    let handTool: "hammer" | "torch" | "firestick" = "hammer";
    const selectIndex = (i: number) => {
      const n = ((i % PALETTE.length) + PALETTE.length) % PALETTE.length;
      selectedRef.current = n;
      setSelected(n);
    };
    let phaseTimer = 0 as unknown as ReturnType<typeof setTimeout>;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") return; // browser releases pointer lock
      setKey(e.code, true);
      if (e.code === "KeyE") flipTool();
      if (e.code === "KeyT") {
        const name = sky.cycleTime();
        setTimePhase(name);
        clearTimeout(phaseTimer);
        phaseTimer = setTimeout(() => setTimePhase(null), 1600);
      }
      if (e.code === "KeyM") {
        bigMapOpen = !bigMapOpen;
        minimap?.setOpen(bigMapOpen);
        setMapOpen(bigMapOpen);
      }
      if (e.code === "KeyH") {
        // drop a campfire on the ground a couple steps ahead
        const fx = -Math.sin(player.yaw);
        const fz = -Math.cos(player.yaw);
        const gx = Math.floor(player.pos.x + fx * 2);
        const gz = Math.floor(player.pos.z + fz * 2);
        campfires.add(gx + 0.5, world.surfaceY(gx, gz) + 1, gz + 0.5);
      }
      if (e.code === "KeyF") toggleMode();
      if (e.code === "KeyR" && modeRef.current === "fight") respawnEnemies();
      if (e.code === "KeyL") {
        if (phase === "play") {
          if (nearRocketLocal) enterBoarding(); // board only at a launch centre
        } else abortFlight();
        return;
      }
      if (phase !== "play") {
        // number keys pick a destination while in space
        if (phase === "space" && (e.code.startsWith("Digit") || e.code.startsWith("Numpad"))) {
          const d = parseInt(e.code.replace(/^(Digit|Numpad)/, ""), 10);
          if (!Number.isNaN(d) && d >= 1) pickDest(d - 1);
        }
        return; // build keys are inert during flight
      }
      if (e.code === "Digit0" || e.code === "Numpad0") {
        // cycle the held tool: hammer → torch → firestick → hammer
        handTool =
          handTool === "hammer" ? "torch" : handTool === "torch" ? "firestick" : "hammer";
        body.setHandItem(handTool);
      } else if (e.code.startsWith("Digit") || e.code.startsWith("Numpad")) {
        const d = parseInt(e.code.replace(/^(Digit|Numpad)/, ""), 10);
        if (!Number.isNaN(d) && d >= 1 && d <= 9) selectIndex(d - 1);
      }
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
        e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => setKey(e.code, false);
    const onWheel = (e: WheelEvent) => {
      if (document.pointerLockElement !== canvas) return;
      e.preventDefault();
      selectIndex(selectedRef.current + (e.deltaY > 0 ? 1 : -1));
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      if (phase === "play") player.look(e.movementX, e.movementY);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (deadRef.current) return; // can't act while eliminated
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }
      if (modeRef.current === "fight") {
        if (e.button !== 0) return; // left-click fires
        const origin = camera.position.clone();
        const dir = player.forward().normalize();
        const res = bots.shoot(origin, dir);
        // tracer from just below the camera to the hit (or far along the ray)
        const end = res ? res.point : origin.clone().add(dir.clone().multiplyScalar(60));
        const start = origin.clone().add(dir.clone().multiplyScalar(0.4));
        start.y -= 0.15;
        tracerGeo.setFromPoints([start, end]);
        tracer.visible = true;
        tracerUntil = performance.now() + 70;
        if (res?.killed) {
          setEnemies(bots.aliveCount);
          killsRef.current += 1;
          setKills(killsRef.current);
        }
        return;
      }
      const r = player.raycast(world);
      if (!r) return;

      if (handTool === "firestick") {
        // burn the targeted block to ash — anything except water (or air)
        const hb = world.get(r.hit[0], r.hit[1], r.hit[2]);
        if (hb !== AIR && hb !== WATER) {
          world.set(r.hit[0], r.hit[1], r.hit[2], AIR);
          queueRemote(r.hit[0], r.hit[1], r.hit[2], AIR);
          torches.remove(r.hit[0], r.hit[1], r.hit[2]);
          burns.splashAt(r.hit[0] + 0.5, r.hit[1] + 0.5, r.hit[2] + 0.5);
          rebuildDirty();
          scheduleSave();
        }
        return;
      }
      if (handTool === "torch") {
        // plant a torch where you're aiming
        if (player.placeBlocks(r.place)) {
          world.set(r.place[0], r.place[1], r.place[2], TORCH);
          queueRemote(r.place[0], r.place[1], r.place[2], TORCH);
          torches.add(r.place[0], r.place[1], r.place[2]);
          rebuildDirty();
          scheduleSave();
        }
        return;
      }

      // hammer: build / mine the currently selected block
      const wantBuild =
        e.button === 0 ? toolRef.current === "build" : toolRef.current !== "build";
      if (wantBuild) {
        if (player.placeBlocks(r.place)) {
          const t = PALETTE[selectedRef.current];
          world.set(r.place[0], r.place[1], r.place[2], t);
          queueRemote(r.place[0], r.place[1], r.place[2], t);
          if (t === TORCH) torches.add(r.place[0], r.place[1], r.place[2]);
        }
      } else {
        world.set(r.hit[0], r.hit[1], r.hit[2], AIR);
        queueRemote(r.hit[0], r.hit[1], r.hit[2], AIR);
        torches.remove(r.hit[0], r.hit[1], r.hit[2]); // no-op if not a torch
      }
      rebuildDirty();
      scheduleSave();
    };
    const onContext = (e: Event) => e.preventDefault();
    const onLockChange = () => setLocked(document.pointerLockElement === canvas);
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      space.setAspect(window.innerWidth / window.innerHeight);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContext);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("resize", onResize);

    // ---- save (throttled) ----
    let saveTimer = 0 as unknown as ReturnType<typeof setTimeout>;
    const doSave = () => {
      try {
        const data: Save = {
          edits: world.serializeEdits(),
          player: {
            pos: player.pos.toArray() as [number, number, number],
            yaw: player.yaw,
            pitch: player.pitch,
          },
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        /* ignore quota errors */
      }
    };
    const scheduleSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(doSave, 700);
    };

    // ---- shared world backend (best-effort; falls back to local on failure) ----
    const pendingRemote: number[][] = [];
    let remoteTimer = 0 as unknown as ReturnType<typeof setTimeout>;
    const flushRemote = () => {
      if (!pendingRemote.length) return;
      const batch = pendingRemote.splice(0, pendingRemote.length);
      fetch("/api/world", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ edits: batch }),
      }).catch(() => {
        pendingRemote.unshift(...batch); // retry on next flush
      });
    };
    const scheduleRemote = () => {
      clearTimeout(remoteTimer);
      remoteTimer = setTimeout(flushRemote, 900);
    };
    const queueRemote = (x: number, y: number, z: number, t: number) => {
      pendingRemote.push([x, y, z, t]);
      scheduleRemote();
    };
    // load the shared world on enter
    fetch("/api/world")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.edits) && d.edits.length) {
          world.applyEdits(d.edits);
          rebuildDirty();
        }
      })
      .catch(() => {});
    // periodically merge edits other players have made
    const pollRemote = () => {
      fetch("/api/world")
        .then((r) => r.json())
        .then((d) => {
          if (!Array.isArray(d?.edits)) return;
          const changed: number[][] = [];
          for (const e of d.edits) {
            const [x, y, z, t] = e;
            if (world.edits.get(`${x},${y},${z}`) !== t) changed.push(e);
          }
          if (changed.length) {
            world.applyEdits(changed);
            rebuildDirty();
          }
        })
        .catch(() => {});
    };
    const pollTimer = setInterval(pollRemote, 6000);

    // ---- loop ----
    let raf = 0;
    // ---- weather schedule + ground accumulation ----
    // each planet has its own weather pool; spells cycle through it with clear gaps.
    const EP_MS = 4 * 60 * 1000; // a weather spell lasts ~4 min
    const W_GAP_MS = 80 * 1000; // clear gap between spells
    const W_CYCLE = EP_MS + W_GAP_MS;
    let weatherPool: string[] = PLANETS[0].weather;
    let wClock = 0;
    let wetness = 0; // 0..1 wet ground (rain)
    let snowCover = 0; // 0..1 snow on the ground
    let snowOn = false; // is the snow re-skin currently applied
    let thunderT = 3; // seconds to next lightning strike
    let lightning = 0; // 0..1 flash
    setSnowCover(false); // reset the module flag in case of a remount

    // ---- land on a new planet: reseed the world in place and rebuild ----
    const travelTo = (planet: Planet) => {
      // always finish the jump even if a step errors, so we never get stuck in space
      try {
        for (const key of [...chunkMeshes.keys()]) dropMesh(chunkMeshes, key);
        for (const key of [...waterMeshes.keys()]) dropMesh(waterMeshes, key);
        world.reseed(planet);
        atm = planet.atmosphere;
        sky.setAtmosphere(atm[0], atm[1], atm[2]);
        setBlockTint(atm[0], atm[1], atm[2]); // recolour the blocks for this world
        setColored(planet.colored); // monochrome on home, colour on alien worlds
        weatherPool = planet.weather;
        wClock = 0;
        setSnowCover(false);
        snowOn = false;
        wetness = 0;
        snowCover = 0;
        wasInWater = false;
        torches.clear();
        player.spawn(world);
        player.vel.set(0, 0, 0);
        updateChunks();
      } catch (err) {
        console.error("travelTo failed:", err);
      }
      phase = "play";
      setFlight("play");
      fadeT = 1; // snap to black, then fade in on the new surface
      fadeTarget = 0;
      setArrival(`Now entering ${planet.name}`);
      clearTimeout(arrivalTimer);
      arrivalTimer = setTimeout(() => setArrival(null), 2600);
    };

    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 60;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.1);

      // crossfade overlay (launch / landing)
      fadeT += (fadeTarget - fadeT) * Math.min(1, dt * 4);
      if (fadeRef.current) fadeRef.current.style.opacity = String(fadeT.toFixed(3));

      // ---- boarding: stand in the cockpit, world frozen behind the UI ----
      if (phase === "boarding") {
        player.syncCamera(camera);
        renderer.render(scene, camera);
        return;
      }
      // ---- ascending: the rocket lifts off the planet, fading to space ----
      if (phase === "ascending") {
        ascentT += dt;
        player.syncCamera(camera);
        camera.position.y += ascentT * ascentT * 22; // accelerating climb
        camera.rotation.x = -0.45; // tip up toward the sky
        sky.update(dt, camera);
        fadeTarget = Math.min(1, ascentT / 0.9);
        renderer.render(scene, camera);
        if (ascentT > 1.3) {
          phase = "space";
          setFlight("space");
          space.reset();
        }
        return;
      }
      // ---- space: fly the solar system, then land ----
      if (phase === "space") {
        fadeTarget = 0; // reveal the stars
        const res = space.update(dt);
        renderer.render(space.scene, space.camera);
        if (res.arrived && res.planet) travelTo(res.planet);
        return;
      }

      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 6) {
        player.update(STEP, world, input);
        acc -= STEP;
        steps++;
      }
      // fall damage from hard landings → flash + possible respawn
      if (player.fallDamage > 0) {
        healthRef.current = Math.max(0, healthRef.current - player.fallDamage);
        setHealth(healthRef.current);
        player.fallDamage = 0;
        flashUntil = now + 220;
        if (!flashOn) {
          flashOn = true;
          setFlash(1);
        }
        if (healthRef.current <= 0 && !deadRef.current) respawnPlayer();
      }
      player.syncCamera(camera);
      // launch centres around you → map markers + boarding prompt
      const centers = launchCentersNear(player.pos.x, player.pos.z, 150);
      minimap?.setMarkers(centers);
      let nd = Infinity;
      for (const c of centers) {
        const d = Math.hypot(c.x - player.pos.x, c.z - player.pos.z);
        if (d < nd) nd = d;
      }
      const near = nd < 7;
      if (near !== nearRocketLocal) {
        nearRocketLocal = near;
        setNearRocket(near);
      }
      body.update(dt, {
        pos: player.pos,
        yaw: player.yaw,
        pitch: player.pitch,
        vx: player.vel.x,
        vz: player.vel.z,
        onGround: player.onGround,
        inWater: bodyInWater(),
      });
      updateChunks();
      sky.update(dt, camera);
      // advance the schedule: clear gap, then a spell from this planet's pool
      wClock += dt * 1000;
      const epNum = Math.floor(wClock / W_CYCLE);
      const tIn = wClock % W_CYCLE;
      const wmode: WeatherMode =
        tIn < W_GAP_MS || weatherPool.length === 0
          ? "clear"
          : (weatherPool[epNum % weatherPool.length] as WeatherMode);
      weather.setMode(wmode);
      weather.update(dt, camera);

      // ground accumulation — rainy spells wet the land, snow whitens it
      const raining = wmode === "rain" || wmode === "thunder" || wmode === "typhoon";
      const snowing = wmode === "snow";
      wetness += ((raining ? 1 : 0) - wetness) * Math.min(1, dt * (raining ? 0.5 : 0.12));
      const snowRate = snowing ? 0.4 : raining ? 0.5 : 0.05; // rain melts snow faster
      snowCover += ((snowing ? 1 : 0) - snowCover) * Math.min(1, dt * snowRate);

      // thunder → quick lightning flashes
      if (wmode === "thunder") {
        thunderT -= dt;
        if (thunderT <= 0) {
          lightning = 1;
          thunderT = 2 + Math.random() * 5;
        }
      }
      lightning = Math.max(0, lightning - dt * 3.5);
      if (lightningRef.current)
        lightningRef.current.style.opacity = (lightning * 0.55).toFixed(3);
      const lt = sky.getLight(); // day/night brightness (0.4 night .. 1 noon)
      // holding a torch or flaming stick lifts the gloom so you can see
      const holdingTorch = handTool === "torch" || handTool === "firestick";
      const view = holdingTorch ? Math.min(1, lt + (1 - lt) * 0.6) : lt;
      const wet = (1 - wetness * 0.3) * view; // wet darkens, night dims
      // block hue comes from baked vertex colours; here we only apply brightness
      material.color.setRGB(wet, wet, wet);
      waterMaterial.color.setRGB(view, view, view);
      body.setLight(view); // entities darken with the world at night
      critters.setLight(view);
      foliage.setLight(view);
      if (holdingTorch && scene.fog instanceof THREE.Fog)
        scene.fog.color.lerp(TORCH_FOG, (1 - lt) * 0.5); // see into the fog
      torches.update(dt, player.pos, lt); // pools use the true darkness
      fireflies.update(dt, player.pos, lt); // motes drift at night
      campfires.update(dt, lt); // animate campfire flames + embers
      foliage.update(dt, player.pos); // grass tufts grow along the water
      minimap?.update(dt, player.pos, player.yaw); // top-left map
      // toggle the snow re-skin with hysteresis, then re-mesh loaded chunks
      if (!snowOn && snowCover > 0.55) {
        snowOn = true;
        setSnowCover(true);
        resnowAll();
      } else if (snowOn && snowCover < 0.3) {
        snowOn = false;
        setSnowCover(false);
        resnowAll();
      }

      critters.update(dt, player.pos);
      // footprints in snow/sand, and a splash when you plunge into water
      footprints.update(dt, player.pos, player.onGround, snowOn);
      const nowWater = bodyInWater();
      if (nowWater && !wasInWater)
        splashes.splashAt(player.pos.x, player.pos.y + 0.2, player.pos.z);
      wasInWater = nowWater;
      splashes.update(dt);
      waterAtlas.offset.y -= dt * 0.3; // make the water flow

      if (modeRef.current === "fight") {
        if (!deadRef.current) {
          const dmg = bots.update(dt, camera.position);
          if (dmg > 0) {
            healthRef.current = Math.max(0, healthRef.current - dmg);
            setHealth(healthRef.current);
            flashUntil = now + 220;
            if (!flashOn) {
              flashOn = true;
              setFlash(1);
            }
            if (healthRef.current <= 0) {
              deadRef.current = true;
              setDead(true);
              deathsRef.current += 1;
              setDeaths(deathsRef.current);
              if (document.pointerLockElement === canvas) document.exitPointerLock();
            }
          }
        }
        hl.visible = false;
      } else {
        const r = player.raycast(world);
        if (r) {
          hl.visible = true;
          hl.position.set(r.hit[0] + 0.5, r.hit[1] + 0.5, r.hit[2] + 0.5);
        } else {
          hl.visible = false;
        }
      }

      if (tracer.visible && now > tracerUntil) tracer.visible = false;
      if (flashOn && now > flashUntil) {
        flashOn = false;
        setFlash(0);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    setError(null);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(saveTimer);
      clearTimeout(phaseTimer);
      doSave();
      clearTimeout(remoteTimer);
      flushRemote();
      clearInterval(pollTimer);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContext);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("resize", onResize);
      chunkMeshes.forEach((m) => m.geometry.dispose());
      waterMeshes.forEach((m) => m.geometry.dispose());
      body.dispose();
      weather.dispose();
      critters.dispose();
      footprints.dispose();
      splashes.dispose();
      burns.dispose();
      torches.dispose();
      fireflies.dispose();
      campfires.dispose();
      foliage.dispose();
      minimap?.dispose();
      space.dispose();
      clearTimeout(arrivalTimer);
      setSnowCover(false);
      bots.dispose();
      sky.dispose();
      for (const b of billboards) {
        scene.remove(b);
        b.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          const mat = (m as THREE.Mesh).material as THREE.Material | undefined;
          if (mat) mat.dispose();
        });
      }
      tracerGeo.dispose();
      (tracer.material as THREE.Material).dispose();
      hl.geometry.dispose();
      (hl.material as THREE.Material).dispose();
      material.dispose();
      waterMaterial.dispose();
      atlas.dispose();
      waterAtlas.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) container.removeChild(canvas);
    };
  }, []);

  const relock = () => {
    const c = mountRef.current?.querySelector("canvas");
    (c as HTMLCanvasElement | null)?.requestPointerLock();
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#eeece6]">
      <div ref={mountRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 grid place-items-center text-charcoal">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* crosshair */}
      {locked && !error && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-4 w-px bg-charcoal/70" />
          <div className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-charcoal/70" />
        </div>
      )}

      {/* mode toggle — Build vs Fight */}
      {!error && (
        <button
          onClick={() => toggleModeRef.current()}
          className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-charcoal/30 bg-cream/80 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-charcoal backdrop-blur-md"
        >
          Mode: {mode === "fight" ? "Fight" : "Build"}
          <span className="ml-1 rounded border border-charcoal/25 px-1 text-[10px] text-gray-soft">F</span>
        </button>
      )}

      {/* tool indicator — build mode only */}
      {!error && mode === "build" && (
        <button
          onClick={flipTool}
          className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-charcoal/30 bg-cream/80 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-charcoal backdrop-blur-md"
        >
          <span
            className={`inline-block h-2 w-2 rounded-[2px] ${
              tool === "build" ? "bg-charcoal" : "border border-charcoal bg-transparent"
            }`}
          />
          Left-click: {tool === "build" ? "Build" : "Mine"}
          <span className="ml-1 rounded border border-charcoal/25 px-1 text-[10px] text-gray-soft">E</span>
        </button>
      )}

      {/* combat HUD */}
      {!error && mode === "fight" && (
        <>
          <div className="pointer-events-none absolute bottom-6 left-6 w-48">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.2em] text-charcoal/70">
              <span>Health</span>
              <span>{Math.round(health)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border border-charcoal/30 bg-cream/60">
              <div
                className="h-full bg-charcoal transition-[width] duration-150"
                style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
              />
            </div>
          </div>
          <div className="pointer-events-none absolute right-6 top-16 flex gap-6 text-right text-charcoal">
            <div>
              <div className="font-serif text-3xl leading-none">{kills}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-charcoal/60">
                {kills === 1 ? "Kill" : "Kills"}
              </div>
            </div>
            <div>
              <div className="font-serif text-3xl leading-none">{enemies}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-charcoal/60">
                {enemies === 0 ? "Cleared · R" : enemies === 1 ? "Enemy" : "Enemies"}
              </div>
            </div>
          </div>
          {/* simple gun viewmodel */}
          <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
            <div className="h-10 w-3 bg-charcoal/80" />
            <div className="-mt-1 ml-[-10px] h-4 w-7 bg-charcoal" />
          </div>
        </>
      )}

      {/* damage flash */}
      {flash > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: "inset 0 0 160px 40px rgba(34,34,34,0.55)",
          }}
        />
      )}

      {/* hotbar */}
      {!error && mode === "build" && flight === "play" && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {PALETTE.map((t, i) => (
            <div
              key={t}
              className={`flex h-12 w-12 flex-col items-center justify-center rounded border text-[9px] uppercase tracking-wide ${
                i === selected
                  ? "border-charcoal bg-charcoal/10 text-charcoal"
                  : "border-charcoal/25 bg-cream/70 text-gray-soft"
              }`}
            >
              <span className="text-[13px] leading-none text-charcoal/80">{i < 9 ? i + 1 : "·"}</span>
              <span className="mt-1 leading-none">{BLOCK_NAMES[t]}</span>
            </div>
          ))}
        </div>
      )}

      {/* eliminated overlay */}
      {dead && !error && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-cream/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="font-serif text-4xl text-charcoal">Eliminated</p>
            <p className="max-w-xs text-sm leading-relaxed text-gray-soft">
              The bots took you down. Deaths: {deaths} · Kills: {kills}
            </p>
            <button
              onClick={() => respawnRef.current()}
              className="rounded-full border border-charcoal bg-charcoal px-6 py-2 text-sm text-cream transition-colors hover:bg-graphite"
            >
              Respawn
            </button>
          </div>
        </div>
      )}

      {/* pause / start menu when not locked */}
      {!locked && !error && !dead && flight === "play" && (
        <div className="absolute inset-0 grid place-items-center bg-cream/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="font-serif text-2xl text-charcoal">Build Mode</p>
            <p className="max-w-sm text-sm leading-relaxed text-gray-soft">
              Click to play. <b>WASD</b> move · <b>Shift</b> sprint · <b>Space</b> jump ·
              <b>Mouse</b> look · <b>Esc</b> to pause.
              <br />
              <b>Build:</b> <b>E</b> Build/Mine · <b>1–9</b> block · <b>0</b> hammer/torch/fire-stick · <b>H</b> campfire · <b>T</b> time · <b>M</b> map · <b>L</b> launch.
              <br />
              <b>Fight:</b> press <b>F</b> · left-click shoots the bots · hide behind blocks ·
              <b> R</b> respawns enemies.
            </p>
            <div className="flex gap-3">
              <button
                onClick={relock}
                className="rounded-full border border-charcoal bg-charcoal px-5 py-2 text-sm text-cream transition-colors hover:bg-graphite"
              >
                Play
              </button>
              <button
                onClick={() => exitRef.current()}
                className="rounded-full border border-charcoal/30 px-5 py-2 text-sm text-charcoal transition-colors hover:border-charcoal"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* minimap — top-left, always mounted so the ref is ready */}
      <canvas
        ref={minimapRef}
        className={`pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-charcoal/25 bg-cream/40 shadow-sm backdrop-blur-sm transition-opacity duration-300 ${
          locked && !error ? "opacity-90" : "opacity-0"
        }`}
      />

      {/* full-screen map (M) — always mounted so the ref is ready, toggled by CSS */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-charcoal/45 backdrop-blur-sm transition-opacity duration-200 ${
          mapOpen && !error ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={bigMapRef}
            style={{ imageRendering: "pixelated", width: "70vmin", height: "70vmin" }}
            className="rounded-lg border border-charcoal/30 bg-cream/30 shadow-xl"
          />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-cream/90">
            {[
              ["#b7c2c6", "Water"],
              ["#525c46", "Forest"],
              ["#74746f", "Mountain"],
              ["#eef0ea", "Snow"],
              ["#b9863f", "Building"],
              ["#54544f", "Road"],
            ].map(([c, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: c }}
                />
                {label}
              </span>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-cream/60">
            Press M to close
          </p>
        </div>
      </div>

      {/* exit affordance while playing */}
      {locked && !error && (
        <div className="pointer-events-none absolute right-4 top-4 text-[11px] uppercase tracking-[0.2em] text-charcoal/50">
          Esc to pause
        </div>
      )}

      {/* time-of-day toast when cycling with T */}
      {timePhase && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full border border-charcoal/25 bg-cream/80 px-4 py-1 text-xs uppercase tracking-[0.22em] text-charcoal backdrop-blur-md">
          {timePhase}
        </div>
      )}

      {/* prompt when standing on a launch centre */}
      {nearRocket && flight === "play" && locked && !error && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full border border-charcoal/30 bg-cream/85 px-5 py-2 text-xs uppercase tracking-[0.2em] text-charcoal backdrop-blur-md">
          🚀 Press <b>L</b> to board the rocket
        </div>
      )}

      {/* cockpit — press LAUNCH to lift off */}
      {flight === "boarding" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-charcoal/55 backdrop-blur-sm">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: "inset 0 0 240px 80px rgba(0,0,0,0.75)" }}
          />
          <p className="font-instrument text-4xl tracking-tight text-cream">Rocket Ready</p>
          <button
            onClick={() => launchGoRef.current()}
            className="mt-7 rounded-full bg-[#e08743] px-10 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-charcoal shadow-lg transition-transform hover:scale-105"
          >
            🚀 Launch
          </button>
          <button
            onClick={() => abortFlightRef.current()}
            className="mt-4 text-[11px] uppercase tracking-[0.22em] text-cream/60 hover:text-cream"
          >
            Cancel
          </button>
        </div>
      )}

      {/* space — choose a destination planet */}
      {flight === "space" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: "inset 0 0 240px 80px rgba(0,0,0,0.7)" }}
          />
          <div className="text-center text-cream">
            <p className="font-instrument text-3xl tracking-tight">Choose a destination</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-cream/70">
              Click a planet (or press 1–{PLANETS.length}) · L to abort
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            {PLANETS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => pickDestRef.current(i)}
                className={`flex w-28 flex-col items-center gap-2 rounded-xl border bg-black/50 px-4 py-4 text-cream backdrop-blur-sm transition-transform hover:scale-110 ${
                  i === 0
                    ? "border-[#7fd0a0]/80 ring-1 ring-[#7fd0a0]/50"
                    : "border-cream/30 hover:border-cream/70"
                }`}
              >
                <span
                  className="h-11 w-11 rounded-full shadow-inner"
                  style={{ backgroundColor: PLANET_THEME[p.name] ?? "#9a9a9a" }}
                />
                <span className="text-xs uppercase tracking-[0.18em]">
                  {i + 1}. {p.name}
                </span>
                {i === 0 && (
                  <span className="text-[9px] uppercase tracking-[0.18em] text-[#7fd0a0]">
                    🏠 Home
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* lightning flash (thunder) */}
      <div
        ref={lightningRef}
        className="pointer-events-none absolute inset-0 z-30 bg-white"
        style={{ opacity: 0 }}
      />

      {/* launch / landing crossfade */}
      <div
        ref={fadeRef}
        className="pointer-events-none absolute inset-0 z-40 bg-black"
        style={{ opacity: 0 }}
      />

      {/* "Now entering <planet>" toast */}
      {arrival && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-charcoal/25 bg-cream/90 px-6 py-2 text-sm uppercase tracking-[0.22em] text-charcoal backdrop-blur-md">
          {arrival}
        </div>
      )}
    </div>
  );
}

export default BuildMode;
