import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { ISLANDS, height, fbm } from './world';
import { useStory } from './state';

const rnd = (a, b) => a + Math.random() * (b - a);
const vs = `uniform float uTime; varying float vH;
void main(){
  float w = sin(uTime*2. + instanceMatrix[3][0]*.6 + instanceMatrix[3][2]*.4);
  csm_Position.x += w*.14*position.y; csm_Position.z += cos(uTime*1.7 + instanceMatrix[3][2])*.09*position.y; vH = position.y/.8;
}`;
const fs = `uniform float uTrust; varying float vH;
void main(){ vec3 g = mix(vec3(.16,.42,.12), vec3(.62,.82,.3), vH); csm_DiffuseColor = vec4(mix(vec3(dot(g,vec3(.33)))*.5, g, uTrust), 1.); }`;
// Wind-swayed grass (instanced, custom shader) on every island shore, and instanced pines on the hills around the lake.
function Grass() {
  const mesh = useRef(), mat = useRef(), N = 14000;
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.06, 0, 0, .06, 0, 0, 0, .8, 0]), 3)); g.computeVertexNormals(); return g; }, []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D(); let n = 0;
    while (n < N) {
      const i = ISLANDS[n % ISLANDS.length], a = rnd(0, 6.283), d = rnd(i.r * .6, i.r - .8);
      o.position.set(i.x + Math.cos(a) * d, 0, i.z + Math.sin(a) * d); o.rotation.set(0, rnd(0, 6.283), 0); o.scale.setScalar(rnd(.7, 1.5)); o.updateMatrix();
      mesh.current.setMatrixAt(n++, o.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => { const m = mat.current; if (m) { m.uniforms.uTime.value = clock.elapsedTime; m.uniforms.uTrust.value += (useStory.getState().trust / 100 - m.uniforms.uTrust.value) * .05; } });
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, N]} frustumCulled={false} userData={{ noShadow: true }}>
      <CustomShaderMaterial ref={mat} baseMaterial={THREE.MeshStandardMaterial} vertexShader={vs} fragmentShader={fs} side={THREE.DoubleSide} roughness={.9} uniforms={{ uTime: { value: 0 }, uTrust: { value: 0 } }} />
    </instancedMesh>
  );
}
function Pines() {
  const pts = useMemo(() => {
    const out = [];
    for (let k = 0; k < 4000 && out.length < 380; k++) {
      const x = rnd(-165, 165), z = rnd(-270, 200), h = height(x, z);
      if (h < 1.5 || h > 24 || Math.abs(x) < 46 && z < 90 && z > -158) continue;
      if (Math.hypot(height(x + 1, z) - h, height(x, z + 1) - h) > .7) continue;
      out.push([x, h, z, rnd(.8, 1.8), fbm(x * .1, z * .1)]);
    }
    return out;
  }, []);
  const leaf = useRef();
  useFrame(() => { if (leaf.current) leaf.current.color.setRGB(.12 + .08 * useStory.getState().trust / 100, .22 + .22 * useStory.getState().trust / 100, .12); });
  return (<>
    <Instances limit={400}><cylinderGeometry args={[.25, .35, 2.2, 6]} /><meshStandardMaterial color="#5a3d2a" />
      {pts.map(([x, h, z, s], i) => <Instance key={i} position={[x, h + 1.1 * s, z]} scale={s} />)}</Instances>
    <Instances limit={400}><coneGeometry args={[1.8, 5.5, 7]} /><meshStandardMaterial ref={leaf} color="#2f6a2a" roughness={.9} />
      {pts.map(([x, h, z, s, c], i) => <Instance key={i} position={[x, h + 4.2 * s, z]} scale={[s, s * (.9 + c * .5), s]} />)}</Instances>
  </>);
}
export function Flora() { return (<><Grass /><Pines /></>); }
