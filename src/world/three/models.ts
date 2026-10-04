import * as T from "three";
import { LAND, TREES, walkable } from "../navigation.ts";
import { toWorld } from "./coordinates.ts";
import { OUTFITS, SKINS, PLOTS, projectProgress } from "../../game.ts";
import type { Avatar, Save, RewardId } from "../../game";
import { BEACON, FRAGMENTS, FRAGMENT_IDS } from "../../starfall.ts";

export const material = (color: T.ColorRepresentation, glow = false) =>
  new T.MeshStandardMaterial({
    color,
    roughness: 0.85,
    flatShading: true,
    ...(glow ? { emissive: color, emissiveIntensity: 2.5 } : {}),
  });
export function piece(
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  color: T.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
  glow = false,
) {
  const object = new T.Mesh(geometry, material(color, glow));
  object.position.set(x, y, z);
  object.castShadow = !glow;
  object.receiveShadow = !glow;
  parent.add(object);
  return object;
}
export const box = (
  parent: T.Object3D,
  color: T.ColorRepresentation,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  glow = false,
) => piece(parent, new T.BoxGeometry(w, h, d), color, x, y, z, glow);
export const cylinder = (
  parent: T.Object3D,
  color: T.ColorRepresentation,
  x: number,
  y: number,
  z: number,
  top: number,
  bottom: number,
  h: number,
  sides = 12,
  glow = false,
) =>
  piece(
    parent,
    new T.CylinderGeometry(top, bottom, h, sides),
    color,
    x,
    y,
    z,
    glow,
  );
export const sphere = (
  parent: T.Object3D,
  color: T.ColorRepresentation,
  x: number,
  y: number,
  z: number,
  r: number,
  glow = false,
) => piece(parent, new T.SphereGeometry(r, 12, 8), color, x, y, z, glow);

export function disposeObject(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  root.traverse((object) => {
    if (object instanceof T.InstancedMesh) object.dispose();
    if (
      object instanceof T.Mesh ||
      object instanceof T.Line ||
      object instanceof T.Points
    ) {
      geometries.add(object.geometry);
      for (const m of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

function pitchedRoof(
  parent: T.Object3D,
  color: string,
  width: number,
  rise: number,
  depth: number,
  y: number,
) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, rise);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const roof = piece(
    parent,
    new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }),
    color,
    0,
    y,
    -depth / 2,
  );
  roof.name = "pitched-roof";
  return roof;
}

function facetedIsland(
  parent: T.Object3D,
  outline: { x: number; z: number }[],
  depth: number,
  color: string,
) {
  const vertices: number[] = [],
    colors: number[] = [];
  const addFace = (a: T.Vector3, b: T.Vector3, c: T.Vector3, tint: string) => {
    for (const p of [a, b, c]) vertices.push(p.x, p.y, p.z);
    const shade = new T.Color(tint);
    for (let i = 0; i < 3; i++) colors.push(shade.r, shade.g, shade.b);
  };
  const stone = ["#415063", "#536373", "#303e55", "#5c6874", "#38475e"];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length],
      drop = depth * (0.6 + (i % 3) * 0.11);
    const at = new T.Vector3(a.x, -0.03, a.z),
      bt = new T.Vector3(b.x, -0.03, b.z);
    const ab = new T.Vector3(a.x * 0.85, -drop, a.z * 0.85),
      bb = new T.Vector3(b.x * 0.85, -depth * 0.7, b.z * 0.85);
    addFace(at, bt, ab, stone[i % stone.length]);
    addFace(bt, bb, ab, stone[(i + 2) % stone.length]);
    addFace(
      ab,
      bb,
      new T.Vector3(0, -depth * 1.65, 0),
      stone[(i + 3) % stone.length],
    );
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const rock = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
      side: T.DoubleSide,
    }),
  );
  rock.castShadow = true;
  parent.add(rock);
  const shape = new T.Shape();
  outline.forEach((p, i) =>
    i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z),
  );
  shape.closePath();
  const ground = piece(parent, new T.ShapeGeometry(shape), color);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

function road(parent: T.Object3D, points: number[][], width = 0.52) {
  const curve = new T.CatmullRomCurve3(
    points.map(([x, y]) => {
      const p = toWorld({ x, y });
      return new T.Vector3(p.x, 0.045, p.z);
    }),
  );
  const verts: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 60; i++) {
    const p = curve.getPoint(i / 60),
      tangent = curve.getTangent(i / 60);
    const side = new T.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width);
    for (const sign of [-1, 1])
      verts.push(p.x + side.x * sign, p.y, p.z + side.z * sign);
    if (i < 60) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const path = piece(parent, geo, "#c6b995");
  (path.material as T.MeshStandardMaterial).side = T.DoubleSide;
  return path;
}

function pine(parent: T.Object3D, x: number, z: number, scale: number) {
  const tree = new T.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  parent.add(tree);
  cylinder(tree, "#685e55", 0, 0.8, 0, 0.11, 0.15, 1.6, 7);
  for (let i = 0; i < 3; i++) {
    const crown = piece(
      tree,
      new T.ConeGeometry(1.0 - i * 0.18, 1.8, 7),
      ["#315650", "#426e61", "#63917a"][i],
      0,
      1.2 + i * 0.65,
      0,
    );
    crown.rotation.y = i * 0.5;
  }
}

export function makeTerrain() {
  const group = new T.Group(),
    top = facetedIsland(group, LAND.map(toWorld), 4.3, "#799983");
  top.name = "walkable-island";
  road(group, [
    [303, 516],
    [430, 499],
    [520, 500],
    [695, 528],
    [815, 492],
    [980, 460],
  ]);
  road(
    group,
    [
      [660, 580],
      [695, 528],
      [740, 617],
    ],
    0.38,
  );
  road(
    group,
    [
      [695, 528],
      [765, 405],
      [824, 376],
    ],
    0.36,
  );
  for (const [x, y, s] of TREES) {
    const p = toWorld({ x, y });
    pine(group, p.x, p.z, s * 0.83);
  }
  // Shared, instanced meadow tufts keep hundreds of plants to one draw call.
  const grass = new T.InstancedMesh(
      new T.ConeGeometry(0.085, 0.32, 3),
      material("#a2bd85"),
      220,
    ),
    matrix = new T.Matrix4();
  let count = 0;
  for (let i = 0; i < 650 && count < 220; i++) {
    const point = { x: 160 + ((i * 137) % 1060), y: 275 + ((i * 89) % 440) };
    if (!walkable(point) || (point.y < 510 && point.x > 370 && point.x < 1050))
      continue;
    const p = toWorld(point);
    matrix.compose(
      new T.Vector3(p.x, 0.12, p.z),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), i),
      new T.Vector3(1, 0.7 + (i % 5) * 0.17, 1),
    );
    grass.setMatrixAt(count++, matrix);
  }
  grass.count = count;
  group.add(grass);
  for (let i = 0; i < 26; i++) {
    const point = { x: 370 + ((i * 61) % 710), y: 325 + ((i * 93) % 365) };
    if (!walkable(point)) continue;
    const p = toWorld(point);
    sphere(group, i % 2 ? "#c8b6d8" : "#ded2a0", p.x, 0.12, p.z, 0.06);
  }
  for (const [x, y] of [
    [430, 509],
    [603, 537],
    [720, 510],
    [891, 479],
    [760, 676],
  ]) {
    const p = toWorld({ x, y });
    cylinder(group, "#555867", p.x, 0.5, p.z, 0.035, 0.045, 1, 7);
    box(group, "#ffd495", p.x, 1.02, p.z, 0.16, 0.26, 0.16, true);
    cylinder(group, "#746b76", p.x, 1.19, p.z, 0, 0.16, 0.15, 4);
  }
  // Background islands provide depth; they are scenery, not advertised destinations.
  for (const [x, y, z, s] of [
    [-21, 1, -15, 0.33],
    [20, 4, -19, 0.4],
    [-18, -4, 13, 0.25],
  ]) {
    const distant = new T.Group();
    distant.position.set(x, y, z);
    distant.scale.setScalar(s);
    facetedIsland(distant, LAND.map(toWorld), 4, "#678985");
    pine(distant, -3, 0, 1);
    pine(distant, 3, -1, 0.8);
    group.add(distant);
  }
  return { group, top };
}

export function makeHome() {
  const home = new T.Group(),
    p = toWorld({ x: 490, y: 420 });
  home.position.set(p.x, 0, p.z);
  box(home, "#b99d7c", 0, 0.16, 0, 4, 0.32, 2.8);
  box(home, "#e3c9a2", 0, 1.45, 0, 3.5, 2.6, 2.3);
  box(home, "#a58d7b", 0, 0.5, 1.3, 2.6, 0.25, 0.55);
  pitchedRoof(home, "#655e8c", 4, 1.35, 2.9, 2.75);
  box(home, "#bfab93", 1.05, 3.65, -0.42, 0.38, 1.9, 0.42);
  box(home, "#5b494d", 0.4, 1.03, 1.18, 0.68, 1.8, 0.12);
  box(home, "#ffd395", 0.4, 1.1, 1.26, 0.47, 1.35, 0.025, true);
  for (const x of [-1.15, 1.15]) {
    box(home, "#6b6370", x, 1.6, 1.17, 0.65, 0.9, 0.12);
    box(home, "#ffd79f", x, 1.6, 1.25, 0.48, 0.72, 0.025, true);
    box(home, "#9c8170", x, 1.6, 1.28, 0.04, 0.8, 0.035);
    box(home, "#9c8170", x, 1.6, 1.28, 0.55, 0.05, 0.035);
  }
  for (const x of [-1.65, 1.7]) {
    sphere(home, "#8eae79", x, 0.35, 1.25, 0.4);
    sphere(home, "#abbc8a", x, 0.55, 1.25, 0.3);
  }
  return home;
}

export function makeObservatory() {
  const group = new T.Group(),
    p = toWorld({ x: 975, y: 381 });
  group.position.set(p.x, 0, p.z);
  cylinder(group, "#b4acbb", 0, 0.18, 0, 1.6, 1.65, 0.36, 20);
  cylinder(group, "#a49bbd", 0, 1.6, 0, 1.28, 1.4, 2.7, 16);
  cylinder(group, "#d4c2bf", 0, 3.02, 0, 1.43, 1.43, 0.15, 24);
  piece(
    group,
    new T.SphereGeometry(1.43, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    "#7f83ac",
    0,
    3.1,
    0,
  );
  const rim = piece(
    group,
    new T.TorusGeometry(1.46, 0.055, 6, 30),
    "#c0b8ce",
    0,
    3.13,
    0,
  );
  rim.rotation.x = Math.PI / 2;
  const telescope = new T.Group();
  telescope.position.set(0.55, 3.9, 0.2);
  telescope.rotation.z = -0.6;
  group.add(telescope);
  cylinder(telescope, "#cbb590", 0, 0.65, 0, 0.18, 0.26, 1.9, 14);
  cylinder(telescope, "#e6d4aa", 0, 1.58, 0, 0.34, 0.34, 0.3, 14);
  cylinder(telescope, "#71c5d4", 0, 1.745, 0, 0.27, 0.27, 0.04, 14, true);
  box(group, "#f8d194", 0, 1.06, 1.35, 0.62, 1.76, 0.07, true);
  for (const angle of [-0.8, 0.8, 2.5]) {
    const pane = box(
      group,
      "#e5cfad",
      Math.sin(angle) * 1.35,
      1.9,
      Math.cos(angle) * 1.35,
      0.3,
      0.6,
      0.07,
      true,
    );
    pane.rotation.y = angle;
  }
  return group;
}

export function makeWorkshop(save: Save, projectId: string) {
  const group = new T.Group(),
    p = toWorld({ x: 720, y: 410 });
  group.position.set(p.x, 0, p.z);
  const project = save.projects.find((p) => p.id === projectId),
    stage = project ? projectProgress(save, project).stage : 0;
  group.userData = { projectId: project?.id ?? "", stage };
  group.name = "living-workshop";
  box(group, "#8e9188", 0, 0.16, 0, 2.8, 0.32, 2.05);
  box(group, "#355b70", 0, 0.34, 0, 2.5, 0.02, 1.8);
  for (const x of [-1.15, 1.15])
    for (const z of [-0.8, 0.8])
      box(group, "#c4a77e", x, 1.6, z, 0.12, 2.6, 0.12);
  for (const z of [-0.8, 0.8])
    box(group, "#c4a77e", 0, 2.85, z, 2.45, 0.14, 0.14);
  if (stage >= 1) {
    for (const x of [-1.1, 1.1]) {
      box(group, "#b7aa90", x, 1.4, 0, 0.13, 2.15, 1.8);
    }
    box(group, "#a7a28f", 0, 1.4, -0.8, 2.2, 2.15, 0.15);
  }
  if (stage >= 2) {
    box(group, "#d0b692", 0, 1.4, 0.82, 2.2, 2.15, 0.15);
    box(group, "#efcd8b", 0, 1.05, 0.91, 0.6, 1.45, 0.03, true);
    pitchedRoof(group, "#478c83", 2.9, 1, 2.3, 2.75);
  }
  if (stage === 3) {
    cylinder(group, "#cfc09b", 0.9, 3.9, 0, 0.025, 0.025, 1.5, 6);
    box(group, "#e9bd71", 1.2, 4.4, 0, 0.6, 0.36, 0.035);
    for (const x of [-1.6, 1.6]) sphere(group, "#adca97", x, 0.35, 0.8, 0.38);
  }
  // Tools and rolled plans make an unfinished build feel intentional.
  box(group, "#ba9874", -1.72, 0.62, 0.3, 0.7, 1.1, 0.9);
  cylinder(group, "#f0d8a3", -1.73, 1.23, 0.3, 0.06, 0.06, 0.7, 8).rotation.z =
    Math.PI / 2;
  return group;
}

export function makeAvatar(avatar: Avatar) {
  const group = new T.Group(),
    outfit = OUTFITS[avatar.outfit];
  const leftLeg = cylinder(
      group,
      "#433b58",
      -0.12,
      0.19,
      0,
      0.08,
      0.09,
      0.38,
      7,
    ),
    rightLeg = cylinder(group, "#433b58", 0.12, 0.19, 0, 0.08, 0.09, 0.38, 7);
  cylinder(group, outfit.coat, 0, 0.54, 0, 0.19, 0.3, 0.55, 8);
  sphere(group, SKINS[avatar.skin], 0, 1.0, 0, 0.24);
  const leftArm = cylinder(
      group,
      outfit.coat,
      -0.29,
      0.65,
      0,
      0.07,
      0.08,
      0.4,
      7,
    ),
    rightArm = cylinder(group, outfit.coat, 0.29, 0.65, 0, 0.07, 0.08, 0.4, 7);
  sphere(group, SKINS[avatar.skin], -0.3, 0.44, 0, 0.075);
  sphere(group, SKINS[avatar.skin], 0.3, 0.44, 0, 0.075);
  box(group, outfit.trim, 0, 0.73, 0.2, 0.14, 0.23, 0.04);
  if (avatar.hat === "wizard") {
    cylinder(group, outfit.trim, 0, 1.2, 0, 0.37, 0.37, 0.055, 16);
    piece(group, new T.ConeGeometry(0.27, 0.65, 12), outfit.hat, 0, 1.52, 0);
  } else if (avatar.hat === "beanie") {
    sphere(group, outfit.hat, 0, 1.13, 0, 0.26);
    sphere(group, outfit.trim, 0, 1.41, 0, 0.075);
  } else {
    const hair = sphere(group, "#54425d", 0, 1.11, -0.025, 0.245);
    hair.scale.y = 0.6;
  }
  const eyeMat = new T.MeshBasicMaterial({ color: "#3d3048" });
  for (const x of [-0.082, 0.082]) {
    const eye = new T.Mesh(new T.SphereGeometry(0.026, 6, 4), eyeMat);
    eye.position.set(x, 1.015, 0.23);
    group.add(eye);
  }
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function makeStory(save: Save) {
  const group = new T.Group(),
    targets: T.Object3D[] = [];
  for (const id of FRAGMENT_IDS) {
    const spot = FRAGMENTS[id],
      p = toWorld(spot),
      found = save.starfall?.fragments.includes(id);
    const gem = piece(
      group,
      new T.OctahedronGeometry(0.24),
      spot.color,
      p.x,
      0.82,
      p.z,
      !found,
    );
    gem.userData.discovery = id;
    targets.push(gem);
    const ring = piece(
      group,
      new T.TorusGeometry(0.38, 0.015, 5, 20),
      spot.color,
      p.x,
      0.04,
      p.z,
      !found,
    );
    ring.rotation.x = Math.PI / 2;
    if (found) {
      (gem.material as T.MeshStandardMaterial).transparent = true;
      (gem.material as T.MeshStandardMaterial).opacity = 0.3;
    }
  }
  const p = toWorld(BEACON),
    lit = !!save.starfall?.beaconLit;
  cylinder(group, "#b4b29e", p.x, 0.18, p.z, 0.85, 0.95, 0.36, 14);
  cylinder(group, "#879997", p.x, 0.48, p.z, 0.5, 0.67, 0.35, 12);
  const gem = piece(
    group,
    new T.OctahedronGeometry(0.4),
    lit ? "#b6f6d4" : "#8c95cb",
    p.x,
    1.4,
    p.z,
    lit,
  );
  gem.userData.discovery = "beacon";
  targets.push(gem);
  if (lit) {
    const beam = new T.Mesh(
      new T.CylinderGeometry(0.13, 0.22, 19, 16, 1, true),
      new T.MeshBasicMaterial({
        color: "#a6f2d2",
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
      }),
    );
    beam.position.set(p.x, 10.6, p.z);
    group.add(beam);
    for (let i = 0; i < 3; i++) {
      const ring = piece(
        group,
        new T.TorusGeometry(0.6 + i * 0.3, 0.025, 6, 30),
        "#baf1d7",
        p.x,
        1.5 + i * 0.6,
        p.z,
        true,
      );
      ring.rotation.x = Math.PI / 2;
    }
    const constellation = new T.Group();
    constellation.name = "origin-constellation";
    group.add(constellation);
    const points = [
      [-5, 7.2, -2],
      [-2.8, 8.6, -3],
      [-0.4, 7.5, -2],
      [1.4, 9.1, -3],
      [3.3, 8, -2],
    ].map(([x, y, z]) => new T.Vector3(p.x + x, y, p.z + z));
    const line = new T.Line(
      new T.BufferGeometry().setFromPoints(points),
      new T.LineBasicMaterial({
        color: "#bcebd5",
        transparent: true,
        opacity: 0.35,
      }),
    );
    constellation.add(line);
    for (const point of points)
      sphere(constellation, "#c1efd6", point.x, point.y, point.z, 0.08, true);
  }
  return { group, targets };
}

export function makeDecorations(save: Save) {
  const group = new T.Group();
  for (const [id, plot] of Object.entries(save.decorations) as [
    RewardId,
    keyof typeof PLOTS,
  ][]) {
    const p = toWorld(PLOTS[plot]);
    if (id === "lantern") {
      cylinder(group, "#8f8491", p.x, 0.6, p.z, 0.045, 0.06, 1.2, 7);
      box(group, "#ffe2a3", p.x, 1.3, p.z, 0.25, 0.4, 0.25, true);
    } else if (id === "crystal") {
      const gem = piece(
        group,
        new T.OctahedronGeometry(0.6),
        "#a6c9f3",
        p.x,
        0.55,
        p.z,
        true,
      );
      gem.scale.y = 1.5;
    } else
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4;
        const x = p.x + Math.cos(angle) * 0.45,
          z = p.z + Math.sin(angle) * 0.45;
        cylinder(group, "#659278", x, 0.18, z, 0.025, 0.025, 0.36, 5);
        sphere(group, "#dabceb", x, 0.39, z, 0.1, true);
      }
  }
  return group;
}
