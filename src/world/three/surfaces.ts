import * as T from "three";

export type Surface =
  | "meadow"
  | "rock"
  | "stone"
  | "wood"
  | "slate"
  | "path"
  | "metal";

// Small, repeatable maps are generated locally: no asset downloads or network requests.
function noise(x: number, y: number, cells: number): number {
  const hash = (a: number, b: number) => {
    const n =
      Math.sin(
        (((a % cells) + cells) % cells) * 127.1 +
          (((b % cells) + cells) % cells) * 311.7,
      ) * 43758.5453;
    return n - Math.floor(n);
  };
  const px = x * cells,
    py = y * cells,
    ix = Math.floor(px),
    iy = Math.floor(py);
  const fx = px - ix,
    fy = py - iy,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), sx),
    T.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx),
    sy,
  );
}

function surfaceMaps(kind: Surface) {
  const size = 256,
    color = new Uint8Array(size * size * 4),
    relief = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const broad = noise(u, v, 4),
        medium = noise(u, v, 16),
        fine = noise(u, v, 64);
      let height = broad * 0.45 + medium * 0.35 + fine * 0.2,
        shade = 0.64 + height * 0.36;
      if (kind === "rock") {
        const strata = Math.sin(v * Math.PI * 24 + broad * 3);
        height = medium * 0.5 + fine * 0.25 + strata * 0.12 + 0.13;
        shade = 0.52 + height * 0.48;
      } else if (kind === "wood") {
        const grain = Math.sin(u * Math.PI * 64 + broad * 9 + medium * 2);
        height = 0.45 + grain * 0.12 + fine * 0.15;
        shade = 0.58 + height * 0.42;
      } else if (kind === "stone" || kind === "slate") {
        const rows = kind === "stone" ? 6 : 8,
          columns = kind === "stone" ? 4 : 6;
        const row = Math.floor(v * rows),
          a = (u * columns + (row % 2) * 0.5) % 1,
          b = (v * rows) % 1;
        const seam = a < 0.035 || b < 0.05;
        height = seam ? 0.08 : 0.58 + medium * 0.23 + fine * 0.12;
        shade = seam ? 0.34 : 0.62 + medium * 0.28 + fine * 0.1;
      } else if (kind === "path") {
        height = medium * 0.55 + fine * 0.45;
        shade = 0.68 + height * 0.32;
      }
      const index = (y * size + x) * 4;
      color[index] = Math.round(shade * 255);
      color[index + 1] = Math.round(shade * 255);
      color[index + 2] = Math.round(
        shade * (kind === "meadow" ? 0.9 : 0.98) * 255,
      );
      color[index + 3] = 255;
      relief[index] =
        relief[index + 1] =
        relief[index + 2] =
          Math.round(T.MathUtils.clamp(height, 0, 1) * 255);
      relief[index + 3] = 255;
    }
  function texture(data: Uint8Array, colorSpace: string = T.NoColorSpace) {
    const map = new T.DataTexture(data, size, size);
    map.colorSpace = colorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.magFilter = T.LinearFilter;
    map.minFilter = T.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = 4;
    map.needsUpdate = true;
    return map;
  }
  return { map: texture(color, T.SRGBColorSpace), bumpMap: texture(relief) };
}

// A palette belongs to one disposable model; textures can be shared inside that model.
export function createSurfacePalette() {
  const maps = new Map<Surface, ReturnType<typeof surfaceMaps>>(),
    materials = new Map<string, T.MeshStandardMaterial>();
  return (kind: Surface, color: T.ColorRepresentation) => {
    const key = `${kind}:${new T.Color(color).getHexString()}`;
    let result = materials.get(key);
    if (!result) {
      let textures = maps.get(kind);
      if (!textures && kind !== "metal") {
        textures = surfaceMaps(kind);
        maps.set(kind, textures);
      }
      result = new T.MeshStandardMaterial({
        color,
        ...textures,
        roughness: kind === "metal" ? 0.48 : kind === "slate" ? 0.72 : 0.92,
        metalness: kind === "metal" ? 0.85 : 0,
        bumpScale: kind === "rock" ? 0.14 : kind === "wood" ? 0.035 : 0.045,
        envMapIntensity: kind === "metal" ? 1 : 0.35,
      });
      materials.set(key, result);
    }
    return result;
  };
}

export function worldUV(geometry: T.BufferGeometry, size = 3) {
  const p = geometry.getAttribute("position"),
    n = geometry.getAttribute("normal"),
    uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)),
      ny = Math.abs(n.getY(i)),
      nz = Math.abs(n.getZ(i));
    uv[i * 2] = (nx > ny && nx > nz ? p.getZ(i) : p.getX(i)) / size;
    uv[i * 2 + 1] = (ny >= nx && ny >= nz ? p.getZ(i) : p.getY(i)) / size;
  }
  geometry.setAttribute("uv", new T.BufferAttribute(uv, 2));
  return geometry;
}
