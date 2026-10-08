import * as T from "three";
import type { Save } from "../../game";
import { gardenProgress } from "../../growth.ts";
import { toWorld } from "./coordinates.ts";
import { piece, box, sphere } from "./models.ts";

export function makeGarden(save: Save) {
  const root = new T.Group(),
    point = toWorld({ x: 520, y: 605 });
  root.name = "skill-garden";
  root.position.set(point.x, 0, point.z);
  const paths = gardenProgress(save);
  root.userData.stages = paths.map((p) => p.stage);
  const terrace = piece(
    root,
    new T.CylinderGeometry(1.5, 1.55, 0.25, 12),
    "#768578",
    0,
    0.15,
  );
  terrace.scale.z = 0.5;
  const trim = piece(
    root,
    new T.TorusGeometry(1.48, 0.025, 6, 64),
    "#c6bd96",
    0,
    0.3,
  );
  trim.rotation.x = Math.PI / 2;
  trim.scale.y = 0.5;
  const arch = new T.CatmullRomCurve3([
    new T.Vector3(-1.35, 0.3, -0.52),
    new T.Vector3(-1.35, 1.65, -0.52),
    new T.Vector3(-0.8, 2.28, -0.52),
    new T.Vector3(0, 2.5, -0.52),
    new T.Vector3(0.8, 2.28, -0.52),
    new T.Vector3(1.35, 1.65, -0.52),
    new T.Vector3(1.35, 0.3, -0.52),
  ]);
  const frame = piece(
    root,
    new T.TubeGeometry(arch, 40, 0.037, 6, false),
    "#bdab83",
  );
  frame.material.metalness = 0.65;
  for (const x of [-1.35, 1.35])
    box(root, "#abb59a", x, 0.43, -0.52, 0.18, 0.28, 0.18);
  for (let i = 0; i < 3; i++)
    box(root, "#b5b79b", 0, 0.04, 0.89 + i * 0.14, 0.65 - i * 0.1, 0.08, 0.12);
  paths.forEach((path, index) => {
    const pod = new T.Group();
    pod.name = `garden-${path.id}`;
    pod.position.set((index - 1) * 0.89, 0.3, 0.06);
    pod.userData.stage = path.stage;
    root.add(pod);
    piece(
      pod,
      new T.CylinderGeometry(0.34, 0.25, 0.27, 10),
      "#677c70",
      0,
      0.12,
    );
    const lip = piece(
      pod,
      new T.TorusGeometry(0.335, 0.022, 6, 24),
      path.color,
      0,
      0.26,
    );
    lip.rotation.x = Math.PI / 2;
    piece(
      pod,
      new T.CylinderGeometry(0.31, 0.31, 0.025, 12),
      "#293d34",
      0,
      0.27,
    );
    if (path.stage === 0) {
      const seed = sphere(pod, path.color, 0, 0.32, 0, 0.11, true);
      seed.scale.y = 0.6;
      return;
    }
    const leafGeometry = new T.SphereGeometry(0.5, 10, 6);
    const height = path.stage === 1 ? 0.55 : path.stage === 2 ? 1.03 : 1.54;
    const stem = new T.CatmullRomCurve3([
      new T.Vector3(0, 0.28, 0),
      new T.Vector3(-0.06, height * 0.6 + 0.2, 0),
      new T.Vector3(0.01, height + 0.28, 0),
    ]);
    piece(pod, new T.TubeGeometry(stem, 8, 0.024, 5, false), "#90b7a1");
    const leaves = path.stage === 1 ? 2 : path.stage === 2 ? 6 : 8;
    for (let i = 0; i < leaves; i++) {
      const side = i % 2 ? 1 : -1,
        angle = i * 1.7 + index;
      const leaf = piece(
        pod,
        leafGeometry,
        i % 3 === 0 ? path.color : "#8bb99e",
        Math.cos(angle) * 0.17,
        0.4 + (i * height) / (leaves + 1),
        Math.sin(angle) * 0.14,
      );
      leaf.scale.set(path.id === "curiosity" ? 0.16 : 0.25, 0.06, 0.6);
      leaf.rotation.set(side * 0.3, angle, side * 0.6);
    }
    if (path.stage >= 2) {
      const core = piece(
        pod,
        new T.OctahedronGeometry(path.stage === 2 ? 0.12 : 0.16),
        path.color,
        0.01,
        height + 0.35,
        0,
        true,
      );
      core.material.emissiveIntensity = 0.5;
      if (path.stage === 3)
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const petal = piece(
            pod,
            leafGeometry,
            path.color,
            Math.cos(angle) * 0.23,
            height + 0.34,
            Math.sin(angle) * 0.23,
            true,
          );
          petal.scale.set(path.id === "curiosity" ? 0.18 : 0.32, 0.07, 0.66);
          petal.rotation.y = -angle + Math.PI / 2;
          petal.rotation.z = 0.25;
          petal.material.emissiveIntensity = 0.2;
        }
    }
  });
  return root;
}
