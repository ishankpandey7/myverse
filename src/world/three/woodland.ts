import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function makeWoodlandTree(seed: number) {
  const tree = new T.Group();
  tree.name = "woodland-tree";
  let randomState = Math.abs(seed) + 1;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  const broadleaf = seed % 3 === 0,
    height = 3.6 + random() * 1.25;
  const wood: T.BufferGeometry[] = [],
    tips: { point: T.Vector3; angle: number; radius: number }[] = [];
  const branch = (a: T.Vector3, b: T.Vector3, radius: number, taper = 0.3) => {
    const geometry = new T.CylinderGeometry(
      radius * taper,
      radius,
      a.distanceTo(b),
      7,
      1,
    );
    geometry.applyMatrix4(
      new T.Matrix4().compose(
        a.clone().add(b).multiplyScalar(0.5),
        new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          b.clone().sub(a).normalize(),
        ),
        new T.Vector3(1, 1, 1),
      ),
    );
    wood.push(geometry);
  };
  const lean = (random() - 0.5) * 0.25;
  branch(new T.Vector3(), new T.Vector3(lean, height, 0.12), 0.13, 0.06);
  for (let i = 0; i < 30; i++) {
    const t = i / 30,
      angle = i * 2.39996 + random() * 0.35;
    const y = 0.9 + t * (height - 1.15);
    const radius = broadleaf
      ? 0.45 + Math.sin(t * Math.PI) * 1.08
      : 1.7 * (1 - t) + 0.12;
    const start = new T.Vector3(lean * t, y, 0.12 * t);
    const end = new T.Vector3(
      Math.cos(angle) * radius,
      y + (broadleaf ? 0.5 : -0.18) + random() * 0.35,
      Math.sin(angle) * radius,
    );
    branch(start, end, 0.045 * (1 - t) + 0.012, 0.12);
    for (let j = 0; j < 3; j++) {
      const along = 0.45 + j * 0.22,
        at = start.clone().lerp(end, along);
      const turn = angle + (j % 2 ? 0.7 : -0.7);
      const tip = at
        .clone()
        .add(new T.Vector3(Math.cos(turn) * 0.32, 0.14, Math.sin(turn) * 0.32));
      branch(at, tip, 0.014, 0.1);
      tips.push({ point: tip, angle: turn, radius: broadleaf ? 0.32 : 0.21 });
    }
  }
  // Roots anchor the trunk into uneven ground; trunks and twigs share one draw call.
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 0.4;
    branch(
      new T.Vector3(Math.cos(angle) * 0.42, 0.015, Math.sin(angle) * 0.42),
      new T.Vector3(0, 0.3, 0),
      0.035,
      2,
    );
  }
  const bark = new T.Mesh(
    mergeGeometries(wood),
    new T.MeshStandardMaterial({ color: "#958474", roughness: 0.96 }),
  );
  wood.forEach((g) => g.dispose());
  bark.userData.surface = "bark";
  bark.castShadow = bark.receiveShadow = true;
  tree.add(bark);

  const leaf = new T.BufferGeometry(),
    verts: number[] = [],
    indices: number[] = [];
  const length = broadleaf ? 0.26 : 0.34,
    width = broadleaf ? 0.09 : 0.035;
  verts.push(
    0,
    0,
    0,
    -width,
    length / 3,
    0.022,
    width,
    length / 3,
    0.022,
    -width,
    (length * 2) / 3,
    0.022,
    width,
    (length * 2) / 3,
    0.022,
    0,
    length,
    0,
  );
  indices.push(0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5);
  leaf.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  leaf.setIndex(indices);
  leaf.computeVertexNormals();
  const wind = { value: 0 },
    leavesMaterial = new T.MeshStandardMaterial({
      color: "#aeb592",
      roughness: 0.87,
      side: T.DoubleSide,
    });
  leavesMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.woodlandTime = wind;
    shader.vertexShader =
      "uniform float woodlandTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      transformed.x += sin(woodlandTime * 1.35 + instanceMatrix[3].x * 2.1 + instanceMatrix[3].y) * transformed.y * .24;
      transformed.z += cos(woodlandTime + instanceMatrix[3].z * 2.7) * transformed.y * .13;`,
      );
  };
  const perTip = broadleaf ? 20 : 24,
    foliage = new T.InstancedMesh(leaf, leavesMaterial, tips.length * perTip);
  const matrix = new T.Matrix4(),
    colors = broadleaf
      ? ["#647f3f", "#718a4a", "#8f9c62", "#557546"]
      : ["#5e7053", "#6f8156", "#819369", "#4b6550"];
  let index = 0;
  for (const tip of tips)
    for (let i = 0; i < perTip; i++) {
      const angle = random() * Math.PI * 2,
        spread = random() * tip.radius;
      const position = tip.point
        .clone()
        .add(
          new T.Vector3(
            Math.cos(angle) * spread,
            (random() - 0.3) * tip.radius,
            Math.sin(angle) * spread,
          ),
        );
      const rotation = new T.Quaternion().setFromEuler(
        new T.Euler(
          (random() - 0.5) * 2.4,
          angle,
          broadleaf ? (random() - 0.5) * 2.8 : tip.angle + Math.PI / 2,
        ),
      );
      const size = 0.7 + random() * 0.7;
      matrix.compose(position, rotation, new T.Vector3(size, size, size));
      foliage.setMatrixAt(index, matrix);
      foliage.setColorAt(
        index++,
        new T.Color(colors[Math.floor(random() * colors.length)]),
      );
    }
  foliage.castShadow = foliage.receiveShadow = true;
  foliage.name = broadleaf ? "broadleaf-crown" : "conifer-crown";
  tree.add(foliage);
  tree.userData.wind = wind;
  return tree;
}
