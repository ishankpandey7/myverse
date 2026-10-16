import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Bake only unnamed, static surfaces. Named models, interactive meshes and
// instanced/animated foliage keep their own identity and transforms.
export function batchStaticSurfaces(root: T.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, T.Mesh[]>();
  root.traverse((object) => {
    if (
      !(object instanceof T.Mesh) ||
      object instanceof T.InstancedMesh ||
      object.name ||
      !object.userData.surface ||
      Array.isArray(object.material)
    )
      return;
    const attributes = Object.keys(object.geometry.attributes).sort().join(",");
    const key = `${object.material.uuid}:${object.userData.surface}:${attributes}:${object.castShadow}:${object.receiveShadow}`;
    const batch = batches.get(key);
    if (batch) batch.push(object);
    else batches.set(key, [object]);
  });
  const retired = new Set<T.BufferGeometry>();
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const pieces = meshes.map((mesh) => {
      const geometry = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      return geometry.applyMatrix4(
        new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
      );
    });
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) continue;
    const first = meshes[0],
      merged = new T.Mesh(geometry, first.material);
    merged.userData.surface = first.userData.surface;
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    root.add(merged);
    for (const mesh of meshes) {
      retired.add(mesh.geometry);
      mesh.removeFromParent();
    }
  }
  // A geometry may also belong to a retained named/instanced object.
  root.traverse((object) => {
    if (object instanceof T.Mesh) retired.delete(object.geometry);
  });
  retired.forEach((geometry) => geometry.dispose());
  return root;
}
