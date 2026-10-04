import * as T from "three";

export function makePlanet() {
  const group = new T.Group();
  group.position.set(0, 4, -18);
  const width = 512,
    height = 256,
    pixels = new Uint8Array(width * height * 4);
  const warm = new T.Color("#b8a38e"),
    cool = new T.Color("#737f97"),
    cloud = new T.Color();
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = (x / width) * Math.PI * 2,
        v = y / height;
      const warp =
        Math.sin(u * 4 + v * 22) * 0.009 + Math.cos(u * 7 - v * 17) * 0.006;
      const bands =
        0.5 +
        Math.sin((v + warp) * 73) * 0.26 +
        Math.sin((v + warp) * 191) * 0.12;
      cloud
        .copy(cool)
        .lerp(warm, T.MathUtils.clamp(bands, 0, 1))
        .convertLinearToSRGB();
      const index = (y * width + x) * 4;
      pixels[index] = cloud.r * 255;
      pixels[index + 1] = cloud.g * 255;
      pixels[index + 2] = cloud.b * 255;
      pixels[index + 3] = 255;
    }
  const map = new T.DataTexture(pixels, width, height);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = T.RepeatWrapping;
  map.magFilter = T.LinearFilter;
  map.needsUpdate = true;
  const globe = new T.Mesh(
    new T.SphereGeometry(3.2, 64, 40),
    new T.MeshStandardMaterial({
      map,
      roughness: 0.96,
      emissive: "#394257",
      emissiveIntensity: 0.12,
    }),
  );
  globe.rotation.z = 0.15;
  group.add(globe);
  const ringPixels = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const radial = i / 255,
      band =
        0.64 + Math.sin(radial * 180) * 0.15 + Math.sin(radial * 57) * 0.13;
    const gap = radial > 0.58 && radial < 0.63;
    ringPixels.set(
      [177 * band, 160 * band, 135 * band, gap ? 20 : 190 + band * 60],
      i * 4,
    );
  }
  const ringMap = new T.DataTexture(ringPixels, 256, 1);
  ringMap.colorSpace = T.SRGBColorSpace;
  ringMap.magFilter = T.LinearFilter;
  ringMap.minFilter = T.LinearMipmapLinearFilter;
  ringMap.generateMipmaps = true;
  ringMap.needsUpdate = true;
  const ringGeometry = new T.RingGeometry(3.85, 6, 128),
    positions = ringGeometry.getAttribute("position"),
    uv = ringGeometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (Math.hypot(positions.getX(i), positions.getY(i)) - 3.85) / 2.15,
      0.5,
    );
  const ring = new T.Mesh(
    ringGeometry,
    new T.MeshBasicMaterial({
      map: ringMap,
      side: T.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  );
  ring.rotation.set(1.16, 0.4, 0);
  group.add(ring);
  return group;
}
