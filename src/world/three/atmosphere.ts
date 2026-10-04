import * as T from "three";

export function makeBeaconLight(x: number, z: number) {
  const light = new T.Mesh(
    new T.CylinderGeometry(0.55, 0.16, 13, 48, 12, true),
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      uniforms: { time: { value: 0 }, tint: { value: new T.Color("#b6f6d4") } },
      vertexShader: `varying vec2 vUv;varying vec3 vPosition;varying vec3 vNormal;void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);vPosition=world.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader: `uniform float time;uniform vec3 tint;varying vec2 vUv;varying vec3 vPosition;varying vec3 vNormal;void main(){float facing=abs(dot(normalize(cameraPosition-vPosition),normalize(vNormal)));float veil=pow(facing,3.0)*pow(1.0-vUv.y,2.4)*smoothstep(0.0,.035,vUv.y);float shimmer=.85+.15*sin(vUv.y*24.0-time*.8+vUv.x*6.283);gl_FragColor=vec4(tint,veil*shimmer*.16);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    }),
  );
  light.position.set(x, 7.9, z);
  light.name = "beacon-light";
  return light;
}

export function makeWaterfallMist(x: number, z: number) {
  const count = 48,
    positions = new Float32Array(count * 3),
    seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996,
      radius = 0.1 + (i % 9) * 0.05;
    positions.set(
      [Math.cos(angle) * radius, (i % 7) * 0.035, Math.sin(angle) * radius],
      i * 3,
    );
    seeds[i] = (i * 0.618034) % 1;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new T.BufferAttribute(seeds, 1));
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const distance = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5),
        index = (y * 64 + x) * 4;
      pixels.set([255, 255, 255, 255 * Math.max(0, 1 - distance) ** 2], index);
    }
  const map = new T.DataTexture(pixels, 64, 64);
  map.colorSpace = T.SRGBColorSpace;
  map.magFilter = T.LinearFilter;
  map.needsUpdate = true;
  const time = { value: 0 },
    material = new T.PointsMaterial({
      map,
      color: "#b1c9c4",
      size: 1.1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.mistTime = time;
    shader.vertexShader =
      "uniform float mistTime; attribute float seed; varying float vMistLife;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      float life=fract(seed+mistTime*.18);vMistLife=life;
      transformed.x+=sin(seed*95.0+mistTime*.3)*life*.9;
      transformed.y+=life*.75;
      transformed.z+=cos(seed*43.0+mistTime*.2)*life*.7;`,
      );
    shader.fragmentShader =
      "varying float vMistLife;\n" +
      shader.fragmentShader.replace(
        "#include <map_particle_fragment>",
        "#include <map_particle_fragment>\ndiffuseColor.a*=sin(vMistLife*3.141593);",
      );
  };
  const mist = new T.Points(geometry, material);
  mist.name = "waterfall-mist";
  mist.position.set(x, -8.1, z);
  mist.frustumCulled = false;
  return {
    object: mist,
    update: (elapsed: number) => {
      time.value = elapsed;
    },
  };
}
