import * as T from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { toWorld } from "./coordinates.ts";

export function makeReflectivePond() {
  const outline = Array.from({ length: 96 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 96,
      erosion = 1 + Math.sin(angle * 5) * 0.025 + Math.cos(angle * 9) * 0.013;
    return new T.Vector2(
      Math.cos(angle) * 2.42 * erosion,
      Math.sin(angle) * 1.29 * erosion,
    );
  });
  const geometry = new T.ShapeGeometry(new T.Shape(outline));
  const pond = new Reflector(geometry, {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.003,
    shader: {
      name: "MoonhollowPond",
      uniforms: {
        color: { value: new T.Color("#28463d") },
        tDiffuse: { value: null },
        textureMatrix: { value: new T.Matrix4() },
        time: { value: 0 },
        reflection: { value: 1 },
        daylight: { value: 1 },
      },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vReflection; varying vec3 vWorld; varying vec2 vLocal;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){vLocal=position.xy/vec2(2.42,1.29);vWorld=(modelMatrix*vec4(position,1.)).xyz;vReflection=textureMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform sampler2D tDiffuse;uniform float time;uniform float reflection;uniform float daylight;
        varying vec4 vReflection;varying vec3 vWorld;varying vec2 vLocal;
        #include <common>
        #include <logdepthbuf_pars_fragment>
        void main(){
          #include <logdepthbuf_fragment>
          float a=sin(vWorld.x*13.+vWorld.z*8.+time*.85),b=cos(vWorld.z*17.-vWorld.x*4.-time*.65);
          vec2 uv=vReflection.xy/vReflection.w+vec2(a,b)*.0018;
          vec3 mirror=texture2D(tDiffuse,clamp(uv,.001,.999)).rgb;
          float edge=smoothstep(.56,1.,length(vLocal));
          vec3 bed=mix(vec3(.035,.105,.085),vec3(.18,.21,.12),edge);
          vec3 view=normalize(cameraPosition-vWorld);float fresnel=pow(1.-abs(view.y),3.);
          vec3 water=mix(bed,mirror,(.3+fresnel*.55)*reflection);
          vec3 normal=normalize(vec3(a*.06,1.,b*.05));
          float light=pow(max(0.,dot(normal,normalize(normalize(vec3(-12.,22.,10.))+view))),150.);
          water+=vec3(.8,.76,.61)*light*.7*daylight;
          float shore=smoothstep(.90,.99,length(vLocal))*(.5+.5*sin(length(vLocal)*180.-time*1.3));
          water=mix(water,vec3(.42,.46,.35),shore*.11);
          gl_FragColor=vec4(water,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  const point = toWorld({ x: 840, y: 620 });
  pond.name = "reflective-pond";
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(point.x, 0.065, point.z);
  pond.getRenderTarget().texture.userData.managedByWorld = true;
  const reflect = pond.onBeforeRender.bind(pond);
  const waterMaterial = pond.material as T.ShaderMaterial;
  let eco = false,
    frame = 0,
    refresh = true;
  pond.onBeforeRender = (...args) => {
    if (!eco && (refresh || frame % 2 === 0)) {
      refresh = false;
      reflect(...args);
    }
  };
  return {
    object: pond,
    update(time: number) {
      frame++;
      waterMaterial.uniforms.time.value = time;
    },
    sky(day: boolean) {
      refresh = true;
      waterMaterial.uniforms.daylight.value = day ? 1 : 0.2;
    },
    eco(value: boolean) {
      eco = value;
      refresh = true;
      waterMaterial.uniforms.reflection.value = value ? 0 : 1;
    },
    // The scene owns geometry/material; only the reflection target is separately owned.
    dispose() {
      pond.getRenderTarget().dispose();
    },
  };
}
