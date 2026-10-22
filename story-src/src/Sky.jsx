import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStory, vis } from './state';

export const SUN = new THREE.Vector3(.25, .36, -.9).normalize();
const ZEN0 = new THREE.Color('#6f767c'), ZEN1 = new THREE.Color('#3f86d6'), HOR0 = new THREE.Color('#9aa0a4'), HOR1 = new THREE.Color('#bfe0f5');
export const skyColors = t => ({ zen: ZEN0.clone().lerp(ZEN1, t), hor: HOR0.clone().lerp(HOR1, t) });
const vs = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const fs = `varying vec3 vDir; uniform vec3 uZen, uHor, uSun; uniform float uTime, uTrust;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.;a*=.5;}return s;}
void main(){
  float y = max(vDir.y, 0.);
  vec3 col = mix(uHor, uZen, pow(y, .5));
  float sd = max(dot(vDir, uSun), 0.);
  col += vec3(1., .86, .62) * (pow(sd, 600.) * 4. + pow(sd, 10.) * .3) * uTrust;
  vec2 cp = vDir.xz / (vDir.y + .2) * .5 + vec2(uTime * .01, 0.);
  float c = fbm(cp * 1.4);
  float cov = smoothstep(.48 - .12 * (1. - uTrust), .85, c) * smoothstep(0., .22, vDir.y);
  vec3 cc = mix(vec3(.42), vec3(1.), uTrust) * (.8 + .2 * smoothstep(.4, .9, c));
  col = mix(col, cc, cov * .9);
  col = mix(col, uHor, pow(1. - y, 5.) * .85);
  gl_FragColor = vec4(col, 1.);
}`;
// Procedural sky dome: gradient, sun glow, drifting clouds and horizon haze that matches the fog. Overcast grey at low trust.
export function Sky() {
  const g = useRef(), m = useRef();
  const u = useMemo(() => ({ uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: SUN }, uTime: { value: 0 }, uTrust: { value: 0 } }), []);
  const sun = useRef();
  useEffect(() => { useStory.setState({ sunMesh: sun.current }); return () => useStory.setState({ sunMesh: null }); }, []);
  useFrame(({ camera, clock }) => {
    const t = vis.trust, c = skyColors(t);
    g.current.position.copy(camera.position);
    u.uZen.value.copy(c.zen); u.uHor.value.copy(c.hor); u.uTime.value = clock.elapsedTime; u.uTrust.value = t;
    sun.current.scale.setScalar(.2 + t);
  });
  return (<group ref={g}>
    <mesh renderOrder={-10}><sphereGeometry args={[600, 48, 24]} /><shaderMaterial ref={m} side={THREE.BackSide} depthWrite={false} vertexShader={vs} fragmentShader={fs} uniforms={u} /></mesh>
    <mesh ref={sun} position={SUN.clone().multiplyScalar(520)}><sphereGeometry args={[14, 16, 12]} /><meshBasicMaterial color="#fff2cf" fog={false} transparent depthWrite={false} /></mesh>
  </group>);
}
