import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { height, paved, biome } from './world';
import { useStory } from './state';

// One height function drives the render mesh, the Rapier trimesh collider, the water-depth texture and the foliage.
function grid(x0, x1, z0, z1, step, hide) {
  const nx = Math.round((x1 - x0) / step) + 1, nz = Math.round((z1 - z0) / step) + 1;
  const pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), pav = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, z = z0 + j * step, k = j * nx + i;
    let h = height(x, z);
    const sl = Math.hypot(height(x + 1, z) - height(x - 1, z), height(x, z + 1) - height(x, z - 1)) / 2;
    const c = biome(x, z, h, sl);
    if (hide && Math.abs(x) <= hide.x && z <= hide.z0 && z >= hide.z1) h -= 9;       // far mesh sinks under the detailed one
    pos.set([x, h, z], k * 3); col.set(c, k * 3); pav[k] = paved(x, z);
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let t = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.set([a, c, b, b, c, d], t); t += 6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aPave', new THREE.BufferAttribute(pav, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  return g;
}
const vs = `attribute vec3 aCol; attribute float aPave; varying vec3 vCol; varying float vPave; varying vec2 vXZ;
void main(){ vCol = aCol; vPave = aPave; vXZ = position.xz; }`;
const fs = `varying vec3 vCol; varying float vPave; varying vec2 vXZ; uniform float uTrust;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec3 col = vCol;
  vec2 cell = vec2(vXZ.x*.9 + floor(vXZ.y*.9)*.5, vXZ.y*.9), f = fract(cell);
  float mortar = 1. - step(.07,f.x)*step(.07,f.y);
  vec3 stone = mix(vec3(.55,.52,.47), vec3(.70,.66,.60), h(floor(cell)));
  col = mix(col, mix(stone, vec3(.16,.15,.15), mortar), smoothstep(.2,.6,vPave));
  float r = n(vXZ*.18)*.6 + n(vXZ*.7)*.4;                       // ink rot recedes where trust has reached
  float heal = smoothstep(r-.08, r+.08, uTrust*1.3);
  vec3 grey = vec3(dot(col, vec3(.3,.59,.11))) * mix(.45, .6, n(vXZ*2.));
  csm_DiffuseColor = vec4(mix(grey, col, heal), 1.);
}`;
export function Terrain() {
  const near = useMemo(() => grid(-60, 60, -154, 92, 1), []);
  const far = useMemo(() => grid(-172, 172, -282, 210, 4, { x: 56, z0: 96, z1: -158 }), []);
  const mats = useRef([]);
  useFrame((_, dt) => mats.current.forEach(m => { if (m) m.uniforms.uTrust.value += (useStory.getState().trust / 100 - m.uniforms.uTrust.value) * (1 - Math.exp(-dt * 2)); }));
  const mat = i => <CustomShaderMaterial ref={el => (mats.current[i] = el)} baseMaterial={THREE.MeshStandardMaterial} vertexShader={vs} fragmentShader={fs} uniforms={{ uTrust: { value: 0 } }} roughness={1} />;
  return (<>
    <RigidBody type="fixed" colliders="trimesh"><mesh geometry={near} receiveShadow userData={{ noShadow: true }}>{mat(0)}</mesh></RigidBody>
    <mesh geometry={far} userData={{ noShadow: true }}>{mat(1)}</mesh>
  </>);
}
