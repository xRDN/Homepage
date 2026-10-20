import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { useStory } from './state';

// Ink rot creeps away where "trust" has reached it: noisy ash and ink turns to grass.
const vs = `varying vec2 vXZ; void main(){ vXZ = position.xy; }`;
const fs = `
varying vec2 vXZ; uniform float uTrust; uniform float uTime;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  float r = n(vXZ*.35)*.6 + n(vXZ*1.4)*.4;
  float heal = smoothstep(r-.08, r+.08, uTrust*1.25);
  vec3 rot = mix(vec3(.30,.31,.30), vec3(.12,.12,.15), n(vXZ*3.+uTime*.05)*.6);
  vec3 grass = mix(vec3(.45,.74,.36), vec3(.58,.82,.42), n(vXZ*2.));
  csm_DiffuseColor = vec4(mix(rot, grass, heal), 1.);
}`;
export function Ground({ size = 40 }) {
  const m = useRef();
  useFrame((s, dt) => {
    const u = m.current && m.current.uniforms; if (!u) return;
    u.uTrust.value = THREE.MathUtils.lerp(u.uTrust.value, useStory.getState().trust / 100, 1 - Math.exp(-dt * 2));
    u.uTime.value = s.clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <CustomShaderMaterial ref={m} baseMaterial={THREE.MeshStandardMaterial} vertexShader={vs} fragmentShader={fs}
        uniforms={{ uTrust: { value: 0 }, uTime: { value: 0 } }} roughness={1} />
    </mesh>
  );
}
