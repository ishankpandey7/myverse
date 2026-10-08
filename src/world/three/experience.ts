import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makePlanet } from "./celestial";
import { createSurfacePalette } from "./surfaces";
import { makeWaterfallMist } from "./atmosphere";
import { makeGarden } from "./garden";
import { gardenProgress } from "../../growth";
import { PLACES, SPAWN, distance, findPath, moveBy } from "../navigation";
import type { Place, Point } from "../navigation";
import type { Save } from "../../game";
import { BEACON, FRAGMENTS } from "../../starfall";
import type { FragmentId } from "../../starfall";
import { toIsland, toWorld } from "./coordinates";
import { configureFreeCamera, setCameraPan } from "./camera-controls";
import {
  makeTerrain,
  makeHome,
  makeObservatory,
  makeWorkshop,
  makeAvatar,
  makeStory,
  makeDecorations,
  disposeObject,
  sphere,
} from "./models";

type Callbacks = {
  visit: (place: Place) => void;
  discover: (id: FragmentId | "beacon") => void;
  hint: (text: string) => void;
  nearby: (place: Place | null) => void;
  manualCamera: () => void;
  error: (message: string) => void;
};
export function createExperience(
  host: HTMLDivElement,
  initial: Save,
  callbacks: Callbacks,
) {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  const cleanups: (() => void)[] = [];
  function release() {
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    renderer.domElement.remove();
  }
  try {
    return mountExperience(
      host,
      initial,
      callbacks,
      renderer,
      cleanups,
      release,
    );
  } catch (error) {
    release();
    throw error;
  }
}

function mountExperience(
  host: HTMLDivElement,
  initial: Save,
  callbacks: Callbacks,
  renderer: T.WebGLRenderer,
  cleanups: (() => void)[],
  release: () => void,
) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute(
    "aria-label",
    "3D Moonhollow island. Click to walk; drag to orbit 360 degrees. Right-drag, Shift-drag or Pan camera to move the view; scroll or pinch to zoom. WASD or arrow keys to move, E near a building to enter.",
  );
  canvas.dataset.testid = "three-world";
  host.append(canvas);
  const scene = new T.Scene();
  cleanups.push(() => disposeObject(scene));
  // Reflections give copper, glass and water shape, without loading a remote HDR file.
  const environmentScene = new RoomEnvironment(),
    pmrem = new T.PMREMGenerator(renderer);
  let environment: T.WebGLRenderTarget;
  try {
    environment = pmrem.fromScene(environmentScene, 0.06);
  } finally {
    environmentScene.dispose();
    pmrem.dispose();
  }
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.35;
  cleanups.push(() => environment.dispose());
  scene.fog = new T.FogExp2("#141d32", 0.006);
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 160);
  camera.position.set(18, 22, 29);
  const controls = new OrbitControls(camera, canvas);
  cleanups.push(() => controls.dispose());
  controls.target.set(0, -0.8, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 10;
  controls.maxDistance = 60;
  configureFreeCamera(controls);
  controls.zoomToCursor = true;
  controls.update();
  controls.saveState();
  const ambient = new T.HemisphereLight("#b6c9dc", "#626a51", 0.75);
  scene.add(ambient);
  const sun = new T.DirectionalLight("#f4d2a3", 2.8);
  cleanups.push(() => sun.shadow.dispose());
  sun.position.set(-12, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -17;
  sun.shadow.camera.right = 17;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.normalBias = 0.025;
  sun.shadow.bias = -0.00015;
  scene.add(sun);
  const rim = new T.DirectionalLight("#86b7cc", 1.7);
  rim.position.set(16, 10, -18);
  scene.add(rim);
  const underglow = new T.DirectionalLight("#90b9cc", 0.8);
  underglow.position.set(-6, -12, 8);
  scene.add(underglow);
  const { group: terrain, top: ground } = makeTerrain();
  scene.add(terrain, makeHome(), makeObservatory());
  let save = initial,
    projectId = save.projects.find((p) => !p.archived)?.id ?? "";
  let workshop = makeWorkshop(save, projectId),
    avatar = makeAvatar(save.avatar),
    story = makeStory(save),
    decorations = makeDecorations(save);
  scene.add(workshop, avatar.group, story.group, decorations);
  let avatarKey = JSON.stringify(save.avatar),
    storyKey = JSON.stringify(save.starfall),
    decorationKey = JSON.stringify(save.decorations),
    projectKey = JSON.stringify([
      projectId,
      save.projects,
      save.missions.map((m) => [m.id, m.done]),
    ]);
  const position = { ...SPAWN };
  const spawn = toWorld(position);
  avatar.group.position.set(spawn.x, 0, spawn.z);
  // Stars are one GPU draw call, with deterministic locations across the dome.
  const starVertices: number[] = [];
  for (let i = 0; i < 620; i++) {
    const angle = i * 2.39996323,
      r = 34 + (i % 23);
    starVertices.push(
      Math.cos(angle) * r,
      -18 + ((i * 37) % 55),
      Math.sin(angle) * r,
    );
  }
  const starGeometry = new T.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(starVertices, 3),
  );
  const stars = new T.Points(
    starGeometry,
    new T.PointsMaterial({
      color: "#ecdfce",
      size: 0.07,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    }),
  );
  scene.add(stars);
  scene.add(makePlanet());
  const moon = sphere(scene, "#fff0c0", 19, 17, -32, 1.65, true);
  moon.castShadow = false;
  const firefliesGeo = new T.BufferGeometry(),
    firefliesData = new Float32Array(65 * 3);
  for (let i = 0; i < 65; i++) {
    const p = toWorld({
      x: 220 + ((i * 127) % 920),
      y: 340 + ((i * 87) % 360),
    });
    firefliesData.set([p.x, 0.5 + (i % 9) * 0.15, p.z], i * 3);
  }
  firefliesGeo.setAttribute(
    "position",
    new T.BufferAttribute(firefliesData, 3),
  );
  const fireflies = new T.Points(
    firefliesGeo,
    new T.PointsMaterial({
      color: "#dff7a4",
      size: 0.065,
      transparent: true,
      opacity: 0.85,
    }),
  );
  scene.add(fireflies);
  const waterTime = { value: 0 };
  const waterMaterial = new T.MeshPhysicalMaterial({
    color: "#355c5d",
    metalness: 0.18,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.3,
  });
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.time = waterTime;
    shader.vertexShader =
      "uniform float time;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.z += sin(position.x * 5.0 + time) * cos(position.y * 6.0 - time * .6) * .018;",
      );
    shader.fragmentShader =
      "uniform float time;\n" +
      shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\nnormal = normalize(normal + vec3(sin(vViewPosition.x * 7.0 + time) * .045, cos(vViewPosition.y * 9.0 - time) * .045, 0.0));",
      );
  };
  const pond = new T.Mesh(new T.CircleGeometry(2.42, 96), waterMaterial),
    pondPoint = toWorld({ x: 840, y: 620 });
  pond.rotation.x = -Math.PI / 2;
  pond.scale.y = 0.53;
  pond.position.set(pondPoint.x, 0.065, pondPoint.z);
  pond.receiveShadow = true;
  scene.add(pond);
  const fallMaterial = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec2 vUv;uniform float time;void main(){float ribbons=.5+.5*sin(vUv.x*48.0+sin(vUv.y*12.0-time*2.0));float flow=.7+.3*sin(vUv.y*80.0+time*6.0);float fade=smoothstep(0.0,.2,vUv.y)*smoothstep(0.0,.2,vUv.x)*(1.0-smoothstep(.8,1.0,vUv.x));gl_FragColor=vec4(mix(vec3(.16,.35,.4),vec3(.56,.73,.72),ribbons),(.35+ribbons*.4)*flow*fade);}`,
  });
  const fallPoint = toWorld({ x: 950, y: 727 }),
    fall = new T.Mesh(new T.PlaneGeometry(0.68, 8.5, 1, 20), fallMaterial);
  fall.position.set(fallPoint.x, -4.15, fallPoint.z);
  fall.rotation.y = 0.18;
  scene.add(fall);
  const mist = makeWaterfallMist(fallPoint.x, fallPoint.z);
  scene.add(mist.object);
  // A luminous channel connects the actual pond outlet to its fall.
  const outlet = new T.CatmullRomCurve3([
    new T.Vector3(pondPoint.x + 1.5, 0.06, pondPoint.z + 0.4),
    new T.Vector3(fallPoint.x - 0.3, 0.05, fallPoint.z - 0.4),
    new T.Vector3(fallPoint.x, 0.05, fallPoint.z),
  ]);
  const channelMaterial = waterMaterial.clone();
  const channel = new T.Mesh(
    new T.TubeGeometry(outlet, 20, 0.24, 6, false),
    channelMaterial,
  );
  scene.add(channel);
  const pondBed = new T.Mesh(
    new T.CircleGeometry(2.53, 80),
    createSurfacePalette()("rock", "#9a9681"),
  );
  pondBed.rotation.x = -Math.PI / 2;
  pondBed.scale.y = 0.56;
  pondBed.position.set(pondPoint.x, 0.02, pondPoint.z);
  pondBed.receiveShadow = true;
  scene.add(pondBed);
  const composer = new EffectComposer(renderer);
  cleanups.push(() => composer.dispose());
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.2, 0.5, 1.4);
  cleanups.push(() => bloom.dispose());
  composer.addPass(bloom);
  const output = new OutputPass();
  cleanups.push(() => output.dispose());
  composer.addPass(output);
  const destination = new T.Mesh(
    new T.TorusGeometry(0.3, 0.025, 6, 24),
    new T.MeshBasicMaterial({ color: "#f6d59a" }),
  );
  destination.rotation.x = Math.PI / 2;
  destination.visible = false;
  scene.add(destination);
  const routeLine = new T.Line(
    new T.BufferGeometry(),
    new T.LineDashedMaterial({
      color: "#ead3a0",
      dashSize: 0.16,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.6,
    }),
  );
  scene.add(routeLine);
  const hitboxes: T.Object3D[] = [];
  for (const place of Object.keys(PLACES) as Place[]) {
    const p = toWorld({
      x:
        place === "garden"
          ? 520
          : place === "home"
            ? 490
            : place === "workshop"
              ? 720
              : 975,
      y:
        place === "garden"
          ? 605
          : place === "home"
            ? 420
            : place === "workshop"
              ? 410
              : 381,
    });
    const target = new T.Mesh(
      new T.BoxGeometry(
        place === "home" ? 3.8 : 2.8,
        place === "garden" ? 2.7 : 4,
        place === "garden" ? 1.5 : 2.4,
      ),
      new T.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    target.position.set(p.x, place === "garden" ? 1.35 : 2, p.z);
    target.userData.place = place;
    scene.add(target);
    hitboxes.push(target);
  }
  let garden = makeGarden(initial),
    gardenKey = JSON.stringify(garden.userData.stages);
  scene.add(garden);
  let route: Point[] = [],
    arrival: (() => void) | null = null,
    paused = false,
    follow = false,
    eco = false,
    tour = false,
    panning = false,
    dead = false,
    last = 0,
    elapsed = 0,
    frame = 0,
    near: Place | null = null,
    inView = true,
    needsRender = true;
  const keys = new Set<string>(),
    raycaster = new T.Raycaster(),
    pointer = new T.Vector2();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function stop() {
    route = [];
    arrival = null;
    destination.visible = false;
    routeLine.visible = false;
    keys.clear();
  }
  function go(point: Point, callback: (() => void) | null = null) {
    if (paused) return;
    const next = findPath(position, point);
    if (!next.length) {
      callbacks.hint("Choose a spot on your island's grass or paths.");
      return;
    }
    keys.clear();
    route = next;
    arrival = callback;
    const p = toWorld(next.at(-1)!);
    destination.position.set(p.x, 0.08, p.z);
    destination.visible = true;
    routeLine.geometry.dispose();
    routeLine.geometry = new T.BufferGeometry().setFromPoints(
      [position, ...next].map((point) => {
        const p = toWorld(point);
        return new T.Vector3(p.x, 0.09, p.z);
      }),
    );
    routeLine.computeLineDistances();
    routeLine.visible = true;
    canvas.focus({ preventScroll: true });
  }
  function travel(place: Place) {
    callbacks.hint(`Walking to ${PLACES[place].name}…`);
    go(PLACES[place].entrance, () => callbacks.visit(place));
  }
  function discover(id: FragmentId | "beacon") {
    const point = id === "beacon" ? BEACON : FRAGMENTS[id];
    callbacks.hint(
      id === "beacon"
        ? "Returning the fallen light to its beacon…"
        : FRAGMENTS[id].clue,
    );
    if (distance(position, point) < 48) {
      stop();
      callbacks.discover(id);
    } else go(point, () => callbacks.discover(id));
  }
  let down: { x: number; y: number; id: number; cancel: boolean } | null = null;
  const pointers = new Set<number>();
  const pointerDown = (e: PointerEvent) => {
    pointers.add(e.pointerId);
    if (pointers.size > 1) {
      if (down) down.cancel = true;
      manualCamera();
      return;
    }
    canvas.focus({ preventScroll: true });
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, cancel: false };
  };
  const pointerUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    const start = down;
    if (!start || start.id !== e.pointerId) return;
    down = null;
    if (
      e.button !== 0 ||
      start.cancel ||
      paused ||
      panning ||
      e.shiftKey ||
      e.ctrlKey ||
      e.metaKey ||
      Math.hypot(e.clientX - start.x, e.clientY - start.y) > 7
    )
      return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      [...story.targets, ...hitboxes],
      false,
    );
    const obstruction = raycaster.intersectObject(terrain, true)[0];
    if (hits[0] && (!obstruction || hits[0].distance < obstruction.distance)) {
      const data = hits[0].object.userData;
      if (data.discovery) discover(data.discovery);
      else if (data.place) travel(data.place);
      return;
    }
    // The grass is front-facing: inspecting the underside must not pick a hidden path/building.
    const landing = raycaster.intersectObject(ground, false)[0];
    if (landing) go(toIsland(landing.point.x, landing.point.z));
  };
  const pointerCancel = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (down) down.cancel = true;
  };
  function manualCamera() {
    if (!tour && !follow) return;
    tour = false;
    follow = false;
    controls.autoRotate = false;
    callbacks.manualCamera();
  }
  const pointerMove = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) {
      down.cancel = true;
      manualCamera();
    }
  };
  const keyDown = (e: KeyboardEvent) => {
    if (paused || e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key)
    ) {
      e.preventDefault();
      route = [];
      arrival = null;
      destination.visible = false;
      routeLine.visible = false;
      keys.add(key);
    } else if (key === "e" || key === "enter") {
      if (near) {
        e.preventDefault();
        stop();
        callbacks.visit(near);
      }
    } else if (key === "escape") {
      stop();
      callbacks.hint("Taking a little pause.");
    }
  };
  const keyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const blur = () => {
    keys.clear();
    pointers.clear();
    down = null;
  };
  const contextLost = (e: Event) => {
    e.preventDefault();
    callbacks.error(
      "Your browser lost its 3D connection. Classic view keeps your world available.",
    );
  };
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove, { passive: true });
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerCancel);
  canvas.addEventListener("keydown", keyDown);
  canvas.addEventListener("keyup", keyUp);
  canvas.addEventListener("blur", blur);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("wheel", manualCamera, { passive: true });
  window.addEventListener("blur", blur);
  cleanups.push(() => {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerCancel);
    canvas.removeEventListener("keydown", keyDown);
    canvas.removeEventListener("keyup", keyUp);
    canvas.removeEventListener("blur", blur);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("wheel", manualCamera);
    window.removeEventListener("blur", blur);
  });
  let framingScale = 1;
  const resize = () => {
    if (!host.clientWidth || !host.clientHeight) return;
    camera.aspect = host.clientWidth / host.clientHeight;
    const nextScale = Math.max(1, Math.min(2.6, 1.05 / camera.aspect));
    camera.position
      .sub(controls.target)
      .multiplyScalar(nextScale / framingScale)
      .add(controls.target);
    framingScale = nextScale;
    controls.maxDistance = 60 * framingScale;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    composer.setSize(host.clientWidth, host.clientHeight);
    needsRender = true;
  };
  const observer = new ResizeObserver(resize);
  cleanups.push(() => observer.disconnect());
  observer.observe(host);
  resize();
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    needsRender = true;
  });
  cleanups.push(() => visibilityObserver.disconnect());
  visibilityObserver.observe(host);
  function animate(time: number) {
    if (dead) return;
    frame = requestAnimationFrame(animate);
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;
    if (document.hidden || !inView) {
      keys.clear();
      return;
    }
    if (paused && !needsRender) return;
    elapsed += dt;
    needsRender = false;
    const before = { ...position };
    let moving = false;
    if (!paused) {
      let horizontal =
          (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
          (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
        vertical =
          (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
          (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      if (horizontal || vertical) {
        const forward = new T.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new T.Vector3(-forward.z, 0, forward.x),
          vector = right
            .multiplyScalar(horizontal)
            .addScaledVector(forward, -vertical)
            .normalize();
        Object.assign(
          position,
          moveBy(position, vector.x * 180 * dt, vector.z * 180 * dt),
        );
      } else if (route.length) {
        let budget = 190 * dt;
        while (route.length && budget > 0) {
          const goal = route[0],
            remaining = distance(position, goal);
          if (remaining <= budget) {
            Object.assign(position, goal);
            route.shift();
            budget -= remaining;
          } else {
            position.x += ((goal.x - position.x) / remaining) * budget;
            position.y += ((goal.y - position.y) / remaining) * budget;
            budget = 0;
          }
        }
        if (!route.length) {
          destination.visible = false;
          routeLine.visible = false;
          const callback = arrival;
          arrival = null;
          callback?.();
        }
      }
      moving = distance(before, position) > 0.001;
    }
    const p = toWorld(position);
    avatar.group.position.set(
      p.x,
      moving && !reduced.matches ? Math.abs(Math.sin(elapsed * 13)) * 0.055 : 0,
      p.z,
    );
    if (moving) {
      const angle = Math.atan2(position.x - before.x, position.y - before.y);
      avatar.group.rotation.y = T.MathUtils.lerp(
        avatar.group.rotation.y,
        angle,
        0.22,
      );
    }
    const swing = moving && !reduced.matches ? Math.sin(elapsed * 13) * 0.4 : 0;
    avatar.leftLeg.rotation.x = swing;
    avatar.rightLeg.rotation.x = -swing;
    avatar.leftArm.rotation.x = -swing;
    avatar.rightArm.rotation.x = swing;
    if (follow) {
      const target = new T.Vector3(p.x, 0.4, p.z),
        delta = target.sub(controls.target).multiplyScalar(0.055);
      controls.target.add(delta);
      camera.position.add(delta);
    }
    controls.autoRotate = tour && !paused && !reduced.matches;
    controls.autoRotateSpeed = 0.25;
    controls.update(dt);
    waterTime.value = reduced.matches ? 0 : elapsed;
    fallMaterial.uniforms.time.value = reduced.matches ? 0 : elapsed;
    mist.update(reduced.matches ? 0 : elapsed);
    if (story.light)
      story.light.material.uniforms.time.value = reduced.matches ? 0 : elapsed;
    story.targets.forEach((gem, i) => {
      if (!reduced.matches) {
        gem.rotation.y = elapsed * 0.6;
        gem.position.y =
          (gem.userData.discovery === "beacon" ? 1.4 : 0.82) +
          Math.sin(elapsed * 1.5 + i) * 0.1;
      }
    });
    const nextNear =
      (Object.keys(PLACES) as Place[]).find(
        (place) => distance(position, PLACES[place].entrance) < 80,
      ) ?? null;
    if (nextNear !== near) {
      near = nextNear;
      callbacks.nearby(near);
    }
    const state = {
      x: String(Math.round(position.x)),
      y: String(Math.round(position.y)),
      buildStage: String(workshop.userData.stage),
      cameraDistance: controls.getDistance().toFixed(2),
      cameraAzimuth: controls.getAzimuthalAngle().toFixed(3),
      cameraPolar: controls.getPolarAngle().toFixed(3),
      cameraTarget: controls.target
        .toArray()
        .map((v) => v.toFixed(2))
        .join(","),
      dragMode: panning ? "pan" : "rotate",
      gardenStages: gardenKey,
    };
    for (const [key, value] of Object.entries(state))
      if (canvas.dataset[key] !== value) canvas.dataset[key] = value;
    if (eco) renderer.render(scene, camera);
    else composer.render();
  }
  frame = requestAnimationFrame(animate);
  function update(next: Save) {
    save = next;
    needsRender = true;
    const gk = JSON.stringify(gardenProgress(next).map((p) => p.stage));
    if (gk !== gardenKey) {
      scene.remove(garden);
      disposeObject(garden);
      garden = makeGarden(next);
      scene.add(garden);
      gardenKey = gk;
    }
    const ak = JSON.stringify(next.avatar);
    if (ak !== avatarKey) {
      scene.remove(avatar.group);
      disposeObject(avatar.group);
      avatar = makeAvatar(next.avatar);
      scene.add(avatar.group);
      avatarKey = ak;
    }
    const sk = JSON.stringify(next.starfall);
    if (sk !== storyKey) {
      scene.remove(story.group);
      disposeObject(story.group);
      story = makeStory(next);
      scene.add(story.group);
      storyKey = sk;
    }
    const dk = JSON.stringify(next.decorations);
    if (dk !== decorationKey) {
      scene.remove(decorations);
      disposeObject(decorations);
      decorations = makeDecorations(next);
      scene.add(decorations);
      decorationKey = dk;
    }
    const pk = JSON.stringify([
      projectId,
      next.projects,
      next.missions.map((m) => [m.id, m.done]),
    ]);
    if (pk !== projectKey) {
      scene.remove(workshop);
      disposeObject(workshop);
      workshop = makeWorkshop(next, projectId);
      scene.add(workshop);
      projectKey = pk;
    }
  }
  return {
    travel,
    discover,
    stop,
    update,
    setProject(id: string) {
      projectId = id;
      update(save);
    },
    pause(value: boolean) {
      paused = value;
      needsRender = true;
      controls.enabled = !value;
      if (value) stop();
    },
    follow(value: boolean) {
      follow = value;
    },
    tour(value: boolean) {
      tour = value;
    },
    panCamera(value: boolean) {
      stop();
      manualCamera();
      panning = value;
      setCameraPan(controls, value);
      canvas.style.cursor = value ? "move" : "grab";
      callbacks.hint(
        value
          ? "Pan mode: drag to move the view. Switch it off to rotate and click to walk."
          : "Drag to orbit 360°. Right-drag or Shift-drag to pan; scroll or pinch to zoom.",
      );
    },
    zoom(direction: number) {
      if (direction > 0) controls.dollyIn(1 / 1.22);
      else controls.dollyOut(1 / 1.22);
      controls.update();
    },
    reset() {
      follow = false;
      tour = false;
      panning = false;
      setCameraPan(controls, false);
      canvas.style.cursor = "grab";
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.target.set(0, -0.8, 0);
      camera.position
        .set(18, 22, 29)
        .sub(controls.target)
        .multiplyScalar(framingScale)
        .add(controls.target);
      controls.enableDamping = damping;
      controls.update();
      callbacks.hint(
        "Drag to orbit 360°. Right-drag or Shift-drag to pan; scroll or pinch to zoom.",
      );
    },
    sky(day: boolean) {
      ambient.color.set(day ? "#d7e6e3" : "#b6c9dc");
      ambient.intensity = day ? 1.15 : 0.75;
      sun.color.set(day ? "#ffe5b4" : "#f4d2a3");
      sun.intensity = day ? 3.5 : 2.8;
      rim.intensity = day ? 0.9 : 1.7;
      scene.environmentIntensity = day ? 0.55 : 0.35;
      stars.visible = !day;
      waterMaterial.color.set(day ? "#477c74" : "#355c5d");
      channelMaterial.color.copy(waterMaterial.color);
    },
    eco(value: boolean) {
      eco = value;
      mist.object.visible = !value;
      renderer.setPixelRatio(value ? 1 : Math.min(devicePixelRatio, 1.5));
      composer.setPixelRatio(renderer.getPixelRatio());
      renderer.shadowMap.enabled = !value;
      resize();
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(frame);
      release();
    },
  };
}
