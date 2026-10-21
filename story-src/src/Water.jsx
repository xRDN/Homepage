import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { height, LAKE, WATER_Y } from './world';
import { playerPos, useStory } from './state';
import { now, ripBuf, ripple } from './ripples';

// Lake water: ripple rings from anything that splashes (data in ripples.js), analytic normals, depth colour and shore foam
// from a baked height texture of the lake bed.
const vs = `uniform float uTime; uniform vec4 uRip[16]; varying vec2 vW; varying float vH;
float H(vec2 p){
  float h = sin(p.x*.35+uTime*.8)*.04 + sin(p.y*.28-uTime*.6)*.04 + sin((p.x+p.y)*.7+uTime*1.3)*.015;
  for(int i=0;i<16;i++){ vec4 r=uRip[i]; float age=uTime-r.z; if(age<0.||age>5.) continue;
    float d=distance(p,r.xy), rad=age*3.5, w=exp(-pow((d-rad)*.9,2.));
    h += sin((d-rad)*6.)*w*r.w*exp(-age*.7)/(1.+d*.15); }
  return h;
}
void main(){
  vec2 p = position.xz; float h = H(p); vW = p; vH = h; float e = .25;
  csm_Normal = normalize(vec3(-(H(p+vec2(e,0.))-H(p-vec2(e,0.)))/(2.*e), 1., -(H(p+vec2(0.,e))-H(p-vec2(0.,e)))/(2.*e)));
  csm_Position = position + vec3(0., h, 0.);
}`;
const fs = `uniform sampler2D uBed; uniform float uTrust; varying vec2 vW; varying float vH;
void main(){
  vec2 uv = (vW - vec2(${LAKE.x0}., ${LAKE.z0}.)) / vec2(${LAKE.x1 - LAKE.x0}., ${LAKE.z1 - LAKE.z0}.);
  float bed = texture2D(uBed, uv).r * 7. - 6.;
  float depth = max(0., ${WATER_Y} - bed);
  vec3 shallow = mix(vec3(.45,.60,.58), vec3(.40,.85,.80), uTrust), deep = mix(vec3(.10,.15,.18), vec3(.04,.33,.55), uTrust);
  vec3 col = mix(shallow, deep, smoothstep(.2, 3.2, depth));
  float foam = smoothstep(.55, .0, depth) * (.6 + .4*sin(vW.x*6.+vW.y*5.+vH*40.));
  col = mix(col, vec3(1.), clamp(foam, 0., 1.)*.7 + smoothstep(.05, .2, vH)*.25);
  csm_DiffuseColor = vec4(col, mix(.55, .94, smoothstep(0., 1., depth)));
}`;
function bedTexture() {
  const W = 128, Hh = 300, data = new Uint8Array(W * Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const x = LAKE.x0 + (i + .5) / W * (LAKE.x1 - LAKE.x0), z = LAKE.z0 + (j + .5) / Hh * (LAKE.z1 - LAKE.z0);
    data[j * W + i] = Math.round(Math.min(1, Math.max(0, (height(x, z) + 6) / 7)) * 255);
  }
  const t = new THREE.DataTexture(data, W, Hh, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
export function Water() {
  const m = useRef(), amb = useRef(0);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(LAKE.x1 - LAKE.x0, LAKE.z1 - LAKE.z0, 150, 350); g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (LAKE.z0 + LAKE.z1) / 2); return g;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uTrust: { value: 0 }, uBed: { value: bedTexture() }, uRip: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, -100, 0)) } }), []);
  useFrame((_, dt) => {
    const u = m.current && m.current.uniforms; if (!u) return;
    u.uTime.value = now(); u.uTrust.value += (useStory.getState().trust / 100 - u.uTrust.value) * (1 - Math.exp(-dt * 2));
    ripBuf.forEach((r, i) => u.uRip.value[i].set(r[0], r[1], r[2], r[3]));
    if ((amb.current -= dt) < 0) { amb.current = .7 + Math.random() * .8; ripple(playerPos.x + (Math.random() - .5) * 50, playerPos.z + (Math.random() - .5) * 50, .05); }   // fish and drips
  });
  return (
    <mesh geometry={geo} position={[0, WATER_Y, 0]} userData={{ noShadow: true }}>
      <CustomShaderMaterial ref={m} baseMaterial={THREE.MeshPhysicalMaterial} vertexShader={vs} fragmentShader={fs} uniforms={uniforms}
        roughness={.06} metalness={0} clearcoat={1} clearcoatRoughness={.05} envMapIntensity={1.4} transparent depthWrite={false} />
    </mesh>
  );
}
