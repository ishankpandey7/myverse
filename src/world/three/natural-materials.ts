import * as T from "three";

const ASSETS = {
  meadow: { id: "rocky_terrain_02", tint: "#e4e6ce", normal: 0.6 },
  rock: { id: "rock_face_03", tint: "#e1e0d5", normal: 0.8 },
  stone: { id: "stone_wall_02", tint: "#e3ded1", normal: 0.55 },
  bark: { id: "pine_bark", tint: "#d4c6af", normal: 0.85 },
} as const;
type Kind = keyof typeof ASSETS;
type Maps = { map: T.Texture; normalMap: T.Texture; roughnessMap: T.Texture };
type Loader = (url: string) => Promise<T.Texture>;

// Shared photographs belong to this world, not an individual replaceable Workshop.
// Model-local procedural maps remain usable if a local file is unavailable.
export function createNaturalMaterials(
  onChange: () => void,
  load: Loader = (url) => new T.TextureLoader().loadAsync(url),
) {
  let disposed = false,
    loaded = 0,
    failed = 0;
  const maps = new Map<Kind, Maps>(),
    watched = new Map<T.MeshStandardMaterial, Kind>();
  const owned = new Set<T.Texture>(),
    retired = new WeakSet<T.Texture>();
  const applyMaterial = (material: T.MeshStandardMaterial, kind: Kind) => {
    const textures = maps.get(kind);
    if (!textures || material.map === textures.map) return;
    for (const old of [material.map, material.bumpMap])
      if (old && !owned.has(old) && !retired.has(old)) {
        retired.add(old);
        old.dispose();
      }
    Object.assign(material, textures, { bumpMap: null, roughness: 0.98 });
    material.color.set(ASSETS[kind].tint);
    material.normalScale.setScalar(ASSETS[kind].normal);
    material.needsUpdate = true;
  };
  const ready = Promise.all(
    (Object.keys(ASSETS) as Kind[]).map(async (kind) => {
      const results = await Promise.allSettled(
        ["diffuse", "nor_gl", "rough"].map(async (map) => {
          const texture = await load(
            `/textures/natural/${ASSETS[kind].id}_${map}.jpg`,
          );
          texture.wrapS = texture.wrapT = T.RepeatWrapping;
          texture.anisotropy = 4;
          texture.colorSpace =
            map === "diffuse" ? T.SRGBColorSpace : T.NoColorSpace;
          texture.userData.managedByWorld = true;
          return texture;
        }),
      );
      const successful = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      if (disposed || successful.length !== 3) {
        successful.forEach((t) => t.dispose());
        if (!disposed) {
          failed++;
          onChange();
        }
        return;
      }
      successful.forEach((t) => owned.add(t));
      maps.set(kind, {
        map: successful[0],
        normalMap: successful[1],
        roughnessMap: successful[2],
      });
      for (const [material, k] of watched)
        if (k === kind) applyMaterial(material, kind);
      loaded++;
      onChange();
    }),
  );
  return {
    ready,
    get status() {
      return { loaded, failed, total: Object.keys(ASSETS).length };
    },
    apply(root: T.Object3D) {
      if (disposed) return;
      root.traverse((object) => {
        const kind = object.userData.surface as Kind;
        if (
          !(object instanceof T.Mesh) ||
          !Object.hasOwn(ASSETS, kind) ||
          !(object.material instanceof T.MeshStandardMaterial)
        )
          return;
        const material = object.material;
        if (!watched.has(material)) {
          watched.set(material, kind);
          material.addEventListener("dispose", () => watched.delete(material));
        }
        applyMaterial(material, kind);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      watched.clear();
      owned.forEach((t) => t.dispose());
      owned.clear();
      maps.clear();
    },
  };
}
