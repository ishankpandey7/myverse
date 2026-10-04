import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createSurfacePalette, worldUV } from "./surfaces.ts";
import { makeBeaconLight } from "./atmosphere.ts";
import type { Surface } from "./surfaces";
import { LAND, TREES, walkable } from "../navigation.ts";
import { toWorld } from "./coordinates.ts";
import { OUTFITS, SKINS, PLOTS, projectProgress } from "../../game.ts";
import type { Avatar, Save, RewardId } from "../../game";
import { BEACON, FRAGMENTS, FRAGMENT_IDS } from "../../starfall.ts";

export const material = (color: T.ColorRepresentation, glow = false) =>
  new T.MeshStandardMaterial({
    color,
    roughness: 0.76,
    ...(glow ? { emissive: color, emissiveIntensity: 0.8 } : {}),
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
) =>
  piece(
    parent,
    new RoundedBoxGeometry(w, h, d, 2, Math.min(0.045, w / 5, h / 5, d / 5)),
    color,
    x,
    y,
    z,
    glow,
  );
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
) => piece(parent, new T.SphereGeometry(r, 24, 16), color, x, y, z, glow);

function surface<M extends T.Mesh>(object: M, kind: Surface) {
  object.userData.surface = kind;
  return object;
}

function finishModel(root: T.Group) {
  const palette = createSurfacePalette(),
    replaced = new Set<T.Material>();
  root.traverse((object) => {
    if (!(object instanceof T.Mesh) || !object.userData.surface) return;
    const previous = object.material as T.MeshStandardMaterial;
    object.material = palette(object.userData.surface, previous.color);
    replaced.add(previous);
    if (object.geometry.type === "RoundedBoxGeometry")
      worldUV(object.geometry, 1.4);
  });
  replaced.forEach((m) => m.dispose());
  return root;
}

export function disposeObject(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
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
  materials.forEach((m) => {
    for (const value of Object.values(m))
      if (value instanceof T.Texture) textures.add(value);
    if (m instanceof T.ShaderMaterial)
      for (const uniform of Object.values(m.uniforms))
        if (uniform.value instanceof T.Texture) textures.add(uniform.value);
    m.dispose();
  });
  textures.forEach((texture) => texture.dispose());
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
  surface(roof, "slate");
  // Actual overlapping slates catch light at grazing angles; one instanced draw.
  const half = width / 2,
    slope = Math.atan2(rise, half),
    length = Math.hypot(half, rise);
  const rows = 10,
    columns = Math.ceil(depth / 0.28);
  const tiles = surface(
    new T.InstancedMesh(
      new T.BoxGeometry(length / rows + 0.035, 0.035, depth / columns + 0.025),
      material(color),
      rows * columns * 2,
    ),
    "slate",
  );
  const matrix = new T.Matrix4();
  let index = 0;
  for (const side of [-1, 1])
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const t = (row + 0.5) / rows;
        matrix.compose(
          new T.Vector3(
            side * half * (1 - t),
            y + rise * t + 0.05,
            -depth / 2 + ((col + 0.5) * depth) / columns,
          ),
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 0, 1),
            -side * slope,
          ),
          new T.Vector3(1, 1, 1),
        );
        tiles.setMatrixAt(index++, matrix);
        tiles.setColorAt(
          index - 1,
          new T.Color().setScalar(0.72 + ((row * 13 + col * 7) % 11) * 0.025),
        );
      }
  tiles.castShadow = tiles.receiveShadow = true;
  parent.add(tiles);
  const ridge = surface(
    cylinder(
      parent,
      "#6d7976",
      0,
      y + rise + 0.1,
      0,
      0.09,
      0.09,
      depth + 0.1,
      16,
    ),
    "metal",
  );
  ridge.rotation.x = Math.PI / 2;
  return roof;
}

function facetedIsland(
  parent: T.Object3D,
  outline: { x: number; z: number }[],
  depth: number,
  color: string,
) {
  const vertices: number[] = [],
    colors: number[] = [],
    uvs: number[] = [];
  const addFace = (a: T.Vector3, b: T.Vector3, c: T.Vector3, tint: string) => {
    const normal = new T.Vector3().crossVectors(
      b.clone().sub(a),
      c.clone().sub(a),
    );
    for (const p of [a, b, c]) {
      vertices.push(p.x, p.y, p.z);
      uvs.push(
        (Math.abs(normal.x) > Math.abs(normal.z) ? p.z : p.x) / 3,
        p.y / 3,
      );
    }
    const shade = new T.Color(tint);
    for (let i = 0; i < 3; i++) colors.push(shade.r, shade.g, shade.b);
  };
  const stone = ["#79847e", "#7c817c", "#6b7775", "#818782", "#737e7d"];
  // Shared rings retain the exact walking outline while adding eroded rock ledges.
  const rings = [0, 0.1, 0.23, 0.43, 0.65, 0.87, 1.1].map((level, ring) =>
    outline.map((p, i) => {
      const shrink =
        ring === 0
          ? 1
          : 1 - level * 0.31 + Math.sin(i * 2.4 + ring * 1.9) * 0.025;
      return new T.Vector3(
        p.x * shrink,
        ring === 0 ? 0 : -depth * level + Math.sin(i * 2.1 + ring) * 0.18,
        p.z * shrink,
      );
    }),
  );
  for (let ring = 0; ring < rings.length - 1; ring++)
    for (let i = 0; i < outline.length; i++) {
      const next = (i + 1) % outline.length;
      addFace(
        rings[ring][i],
        rings[ring][next],
        rings[ring + 1][i],
        stone[(i + ring) % stone.length],
      );
      addFace(
        rings[ring][next],
        rings[ring + 1][next],
        rings[ring + 1][i],
        stone[(i + ring + 1) % stone.length],
      );
    }
  const lower = rings[rings.length - 1];
  for (let i = 0; i < outline.length; i++)
    addFace(
      lower[i],
      lower[(i + 1) % outline.length],
      new T.Vector3(0, -depth * 1.65, 0),
      stone[i % stone.length],
    );
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const rockMaterial = createSurfacePalette()("rock", "#a9aaa4");
  rockMaterial.vertexColors = true;
  rockMaterial.side = T.DoubleSide;
  const rock = new T.Mesh(geo, rockMaterial);
  rock.castShadow = true;
  rock.receiveShadow = true;
  rock.name = "island-cliff";
  parent.add(rock);
  const shape = new T.Shape();
  outline.forEach((p, i) =>
    i ? shape.lineTo(p.x, -p.z) : shape.moveTo(p.x, -p.z),
  );
  shape.closePath();
  const ground = piece(parent, new T.ShapeGeometry(shape), color);
  ground.material.dispose();
  ground.material = createSurfacePalette()("meadow", color);
  const positions = ground.geometry.getAttribute("position"),
    uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = positions.getX(i) / 4;
    uv[i * 2 + 1] = positions.getY(i) / 4;
  }
  ground.geometry.setAttribute("uv", new T.BufferAttribute(uv, 2));
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
  worldUV(geo, 1.5);
  const path = surface(piece(parent, geo, "#b1a58b"), "path");
  (path.material as T.MeshStandardMaterial).side = T.DoubleSide;
  return path;
}

function pine(parent: T.Object3D, x: number, z: number, scale: number) {
  const tree = new T.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  parent.add(tree);
  surface(cylinder(tree, "#75634b", 0, 1.7, 0, 0.035, 0.14, 3.4, 12), "wood");
  const verts: number[] = [];
  // Branch fans, not stacked cones: their gaps give each tree an irregular silhouette.
  for (let i = 0; i < 12; i++) {
    const along = i / 12,
      width = 0.32 * Math.sin((along + 0.1) * Math.PI);
    for (const side of [-1, 1])
      verts.push(
        along,
        0.03,
        0,
        along - 0.12,
        -0.03,
        side * width,
        along + 0.24,
        0.07,
        side * width * 0.3,
      );
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  geometry.computeVertexNormals();
  const foliageMaterial = material("#3b5945");
  foliageMaterial.side = T.DoubleSide;
  const needles = new T.InstancedMesh(geometry, foliageMaterial, 80),
    matrix = new T.Matrix4();
  let count = 0;
  for (let tier = 0; tier < 10; tier++)
    for (let branch = 0; branch < 8; branch++) {
      const angle = (branch * Math.PI) / 4 + tier * 1.73 + x * 0.2,
        radius = 1.25 * (1 - tier / 11);
      const rotation = new T.Quaternion().setFromEuler(
        new T.Euler(0, angle, -0.16 + Math.sin(branch * 3.1 + tier) * 0.12),
      );
      matrix.compose(
        new T.Vector3(
          Math.cos(angle) * 0.045,
          0.8 + tier * 0.27,
          -Math.sin(angle) * 0.045,
        ),
        rotation,
        new T.Vector3(radius, 1, radius),
      );
      needles.setMatrixAt(count, matrix);
      needles.setColorAt(
        count++,
        new T.Color(
          ["#70907a", "#8caa83", "#4d6b57", "#adc096"][(branch + tier) % 4],
        ),
      );
    }
  needles.castShadow = needles.receiveShadow = true;
  tree.add(needles);
}

export function makeTerrain() {
  const group = new T.Group(),
    top = facetedIsland(group, LAND.map(toWorld), 4.3, "#768364");
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
  const bladeVertices: number[] = [];
  for (let blade = 0; blade < 3; blade++) {
    const angle = blade * 2.4,
      x = Math.cos(angle),
      z = Math.sin(angle);
    const points = [
      new T.Vector3(-x * 0.025, 0, -z * 0.025),
      new T.Vector3(x * 0.025, 0, z * 0.025),
      new T.Vector3(-x * 0.012, 0.15, -z * 0.012),
      new T.Vector3(x * 0.025, 0.15, z * 0.025),
      new T.Vector3(x * 0.07, 0.3 - blade * 0.025, z * 0.07),
    ];
    for (const i of [0, 1, 2, 1, 3, 2, 2, 3, 4])
      bladeVertices.push(...points[i].toArray());
  }
  const bladeGeometry = new T.BufferGeometry();
  bladeGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(bladeVertices, 3),
  );
  bladeGeometry.computeVertexNormals();
  const grass = new T.InstancedMesh(bladeGeometry, material("#6e8050"), 700),
    matrix = new T.Matrix4();
  let count = 0;
  (grass.material as T.MeshStandardMaterial).side = T.DoubleSide;
  for (let i = 0; i < 2400 && count < 700; i++) {
    const point = { x: 160 + ((i * 137) % 1060), y: 275 + ((i * 89) % 440) };
    if (!walkable(point) || (point.y < 510 && point.x > 370 && point.x < 1050))
      continue;
    const p = toWorld(point);
    matrix.compose(
      new T.Vector3(p.x, 0.01, p.z),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), i),
      new T.Vector3(1, 0.7 + (i % 5) * 0.17, 1),
    );
    grass.setMatrixAt(count++, matrix);
  }
  grass.count = count;
  grass.receiveShadow = true;
  group.add(grass);
  // Surface stones and a broken shoreline add scale without changing collision rules.
  const stones = surface(
    new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 1),
      material("#899188"),
      120,
    ),
    "rock",
  );
  for (let i = 0; i < 120; i++) {
    const angle = i * 2.39996,
      shore = i < 48;
    const point = shore
      ? { x: 840 + Math.cos(angle) * 118, y: 620 + Math.sin(angle) * 65 }
      : { x: 160 + ((i * 137) % 1060), y: 295 + ((i * 113) % 440) };
    const p = toWorld(point),
      size = shore ? 0.13 + (i % 4) * 0.025 : 0.06 + (i % 5) * 0.025;
    matrix.compose(
      new T.Vector3(p.x, 0.02, p.z),
      new T.Quaternion().setFromEuler(new T.Euler(i, i * 0.7, i * 0.3)),
      new T.Vector3(size * 1.6, size * 0.75, size),
    );
    if (!shore && !walkable(point)) matrix.makeScale(0, 0, 0);
    stones.setMatrixAt(i, matrix);
  }
  stones.receiveShadow = stones.castShadow = true;
  group.add(stones);
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
  finishModel(group);
  // Paths remain double-sided after palette assignment.
  group.traverse((mesh) => {
    if (mesh instanceof T.Mesh && mesh.userData.surface === "path")
      (mesh.material as T.MeshStandardMaterial).side = T.DoubleSide;
  });
  return { group, top };
}

function windowPane(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  angle = 0,
) {
  const group = new T.Group();
  group.position.set(x, y, z);
  group.rotation.y = angle;
  parent.add(group);
  surface(
    box(group, "#4c4439", 0, 0, 0, width + 0.15, height + 0.15, 0.11),
    "wood",
  );
  box(group, "#bd9e67", 0, 0, 0.06, width, height, 0.025, true);
  for (const side of [-1, 1]) {
    surface(
      box(
        group,
        "#796647",
        (side * width) / 2,
        0,
        0.1,
        0.065,
        height + 0.12,
        0.07,
      ),
      "wood",
    );
    surface(
      box(
        group,
        "#796647",
        0,
        (side * height) / 2,
        0.1,
        width + 0.12,
        0.065,
        0.07,
      ),
      "wood",
    );
  }
  surface(box(group, "#4c463c", 0, 0, 0.11, 0.045, height, 0.055), "wood");
  surface(box(group, "#4c463c", 0, -0.05, 0.11, width, 0.045, 0.055), "wood");
  surface(
    box(group, "#948573", 0, -height / 2 - 0.11, 0.04, width + 0.3, 0.12, 0.3),
    "stone",
  );
  return group;
}

function beam(
  parent: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  width = 0.09,
  color = "#675644",
) {
  const center = a.clone().add(b).multiplyScalar(0.5),
    mesh = surface(
      box(
        parent,
        color,
        center.x,
        center.y,
        center.z,
        width,
        a.distanceTo(b),
        width,
      ),
      "wood",
    );
  mesh.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return mesh;
}

export function makeHome() {
  const home = new T.Group(),
    p = toWorld({ x: 490, y: 420 });
  home.position.set(p.x, 0, p.z);
  surface(box(home, "#9c9786", 0, 0.16, 0, 4, 0.32, 2.8), "stone");
  surface(box(home, "#d3c6ac", 0, 1.45, 0, 3.5, 2.6, 2.3), "stone");
  surface(box(home, "#969381", 0, 0.5, 1.3, 2.6, 0.25, 0.55), "stone");
  surface(box(home, "#a9a08a", 0, 0.3, 1.57, 2.8, 0.18, 0.38), "stone");
  pitchedRoof(home, "#43515c", 4, 1.35, 2.9, 2.75);
  surface(box(home, "#a79982", 1.05, 3.65, -0.42, 0.42, 1.9, 0.46), "stone");
  surface(box(home, "#69695f", 1.05, 4.59, -0.42, 0.55, 0.13, 0.59), "stone");
  box(home, "#333c3b", 1.05, 4.66, -0.42, 0.28, 0.02, 0.29);
  // Timber corners, lintels and gable trusses make the cottage read from every angle.
  for (const x of [-1.72, 1.72])
    for (const z of [-1.13, 1.13])
      surface(box(home, "#675542", x, 1.51, z, 0.14, 2.6, 0.14), "wood");
  for (const z of [-1.17, 1.17]) {
    surface(box(home, "#675542", 0, 2.62, z, 3.6, 0.14, 0.14), "wood");
    surface(box(home, "#675542", 0, 0.7, z, 3.6, 0.12, 0.12), "wood");
    beam(
      home,
      new T.Vector3(-1.7, 2.78, z * 1.26),
      new T.Vector3(0, 3.95, z * 1.26),
    );
    beam(
      home,
      new T.Vector3(1.7, 2.78, z * 1.26),
      new T.Vector3(0, 3.95, z * 1.26),
    );
    beam(
      home,
      new T.Vector3(0, 2.78, z * 1.26),
      new T.Vector3(0, 3.95, z * 1.26),
    );
  }
  surface(box(home, "#554737", 0.4, 1.08, 1.2, 0.72, 1.8, 0.14), "wood");
  windowPane(home, 0.4, 1.57, 1.29, 0.43, 0.53);
  surface(sphere(home, "#b5a176", 0.62, 1.02, 1.31, 0.035), "metal");
  for (const x of [-1.12, 1.16]) windowPane(home, x, 1.65, 1.2, 0.62, 0.82);
  for (const x of [-1.76, 1.76])
    windowPane(
      home,
      x,
      1.65,
      -0.1,
      0.68,
      0.9,
      x > 0 ? Math.PI / 2 : -Math.PI / 2,
    );
  windowPane(home, -0.6, 1.65, -1.2, 0.7, 0.85, Math.PI);
  for (const x of [-1.6, 1.65]) {
    surface(box(home, "#786550", x, 0.34, 1.26, 0.72, 0.4, 0.45), "wood");
    for (let i = 0; i < 6; i++) {
      const leaf = sphere(
        home,
        ["#657750", "#859369", "#586f55"][i % 3],
        x + Math.sin(i * 2.4) * 0.2,
        0.62 + (i % 2) * 0.12,
        1.26 + Math.cos(i * 2.4) * 0.12,
        0.18,
      );
      leaf.scale.y = 0.7;
    }
  }
  const porchLight = new T.PointLight("#edb76a", 1.2, 4, 2);
  porchLight.position.set(0.4, 1.75, 1.8);
  home.add(porchLight);
  return finishModel(home);
}

export function makeObservatory() {
  const group = new T.Group(),
    p = toWorld({ x: 975, y: 381 });
  group.position.set(p.x, 0, p.z);
  surface(cylinder(group, "#a0a397", 0, 0.18, 0, 1.6, 1.65, 0.36, 48), "stone");
  surface(cylinder(group, "#c0bbaa", 0, 1.6, 0, 1.28, 1.4, 2.7, 48), "stone");
  surface(
    cylinder(group, "#5a817c", 0, 3.02, 0, 1.43, 1.43, 0.15, 64),
    "metal",
  );
  surface(
    piece(
      group,
      new T.SphereGeometry(1.43, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      "#477e78",
      0,
      3.1,
      0,
    ),
    "metal",
  );
  const rim = surface(
    piece(
      group,
      new T.TorusGeometry(1.46, 0.055, 6, 30),
      "#a08c60",
      0,
      3.13,
      0,
    ),
    "metal",
  );
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6,
      points: T.Vector3[] = [];
    for (let n = 0; n <= 20; n++) {
      const phi = ((n / 20) * Math.PI) / 2;
      points.push(
        new T.Vector3(
          Math.sin(phi) * Math.cos(angle) * 1.445,
          3.1 + Math.cos(phi) * 1.445,
          Math.sin(phi) * Math.sin(angle) * 1.445,
        ),
      );
    }
    surface(
      piece(
        group,
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 20, 0.018, 5, false),
        "#ac9f76",
      ),
      "metal",
    );
  }
  for (const y of [0.62, 2.65])
    surface(
      cylinder(
        group,
        "#969b8c",
        0,
        y,
        0,
        1.44 - y * 0.043,
        1.44 - y * 0.043,
        0.09,
        48,
      ),
      "stone",
    );
  const telescope = new T.Group();
  telescope.position.set(0.55, 3.9, 0.2);
  telescope.rotation.z = -0.6;
  group.add(telescope);
  surface(
    cylinder(telescope, "#bda16a", 0, 0.65, 0, 0.18, 0.26, 1.9, 24),
    "metal",
  );
  for (const y of [0.1, 1, 1.58])
    surface(
      cylinder(telescope, "#595e5a", 0, y, 0, 0.28, 0.28, 0.1, 24),
      "metal",
    );
  surface(
    cylinder(telescope, "#b8a77c", 0, 1.58, 0, 0.34, 0.34, 0.3, 24),
    "metal",
  );
  cylinder(telescope, "#294c60", 0, 1.745, 0, 0.27, 0.27, 0.04, 24);
  surface(box(group, "#605841", 0, 1.1, 1.39, 0.72, 1.76, 0.12), "wood");
  windowPane(group, 0, 1.51, 1.47, 0.43, 0.65);
  for (const angle of [-0.8, 0.8, 2, -2.5])
    windowPane(
      group,
      Math.sin(angle) * 1.34,
      1.85,
      Math.cos(angle) * 1.34,
      0.37,
      0.74,
      angle,
    );
  return finishModel(group);
}

export function makeWorkshop(save: Save, projectId: string) {
  const group = new T.Group(),
    p = toWorld({ x: 720, y: 410 });
  group.position.set(p.x, 0, p.z);
  const project = save.projects.find((p) => p.id === projectId),
    stage = project ? projectProgress(save, project).stage : 0;
  group.userData = { projectId: project?.id ?? "", stage };
  group.name = "living-workshop";
  surface(box(group, "#a2a38f", 0, 0.16, 0, 2.8, 0.32, 2.05), "stone");
  box(group, "#355b70", 0, 0.34, 0, 2.5, 0.02, 1.8);
  for (const x of [-1.15, 1.15])
    for (const z of [-0.8, 0.8])
      surface(box(group, "#a7936d", x, 1.6, z, 0.15, 2.6, 0.15), "wood");
  for (const z of [-0.8, 0.8])
    surface(box(group, "#a7936d", 0, 2.85, z, 2.45, 0.14, 0.14), "wood");
  for (const x of [-1.15, 1.15])
    for (const z of [-0.8, 0.8])
      beam(
        group,
        new T.Vector3(x, 2.25, z),
        new T.Vector3(x * 0.65, 2.8, z),
        0.075,
        "#8c7858",
      );
  if (stage >= 1) {
    for (const x of [-1.1, 1.1]) {
      surface(box(group, "#bcae90", x, 1.4, 0, 0.13, 2.15, 1.8), "wood");
      windowPane(
        group,
        x * 1.07,
        1.7,
        0,
        0.62,
        0.75,
        x > 0 ? Math.PI / 2 : -Math.PI / 2,
      );
    }
    surface(box(group, "#b2a587", 0, 1.4, -0.8, 2.2, 2.15, 0.15), "wood");
  }
  if (stage >= 2) {
    surface(box(group, "#c6b58f", 0, 1.4, 0.82, 2.2, 2.15, 0.15), "wood");
    surface(box(group, "#72644a", 0, 1.05, 0.91, 0.65, 1.45, 0.1), "wood");
    windowPane(group, 0, 1.43, 1, 0.42, 0.55);
    pitchedRoof(group, "#476b63", 2.9, 1, 2.3, 2.75);
  }
  if (stage === 3) {
    cylinder(group, "#cfc09b", 0.9, 3.9, 0, 0.025, 0.025, 1.5, 6);
    box(group, "#e9bd71", 1.2, 4.4, 0, 0.6, 0.36, 0.035);
    for (const x of [-1.6, 1.6]) sphere(group, "#adca97", x, 0.35, 0.8, 0.38);
  }
  // Tools and rolled plans make an unfinished build feel intentional.
  surface(box(group, "#9d845c", -1.72, 0.62, 0.3, 0.7, 1.1, 0.9), "wood");
  for (const y of [0.25, 1])
    surface(box(group, "#535e59", -1.72, y, 0.77, 0.75, 0.07, 0.04), "metal");
  cylinder(group, "#f0d8a3", -1.73, 1.23, 0.3, 0.06, 0.06, 0.7, 8).rotation.z =
    Math.PI / 2;
  return finishModel(group);
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
  let light: ReturnType<typeof makeBeaconLight> | undefined;
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
    light = makeBeaconLight(p.x, p.z);
    group.add(light);
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
  return { group, targets, light };
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
