import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import { Instances, Instance, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { useStory } from './state';

const WALL = ['#d9c3a0', '#c9b08a', '#e0cdb0', '#b9a58c', '#d8b99a'], ROOF = ['#8b4a3a', '#7a5a4a', '#6b4a5a', '#9a5a3a'];
// One shared window material: windows glow more as trust returns, so the town "wakes up".
const win = new THREE.MeshStandardMaterial({ color: '#f7d58a', emissive: '#ffb347', emissiveIntensity: .2, roughness: .4 });
export function useTownFx() { useFrame(() => { win.emissiveIntensity = .15 + useStory.getState().trust / 100 * 1.7; }); }

function Windows({ cx, cz, dx, dz, h, s, cols = 2 }) {   // windows on the street-facing side (s = -1 faces -x, +1 faces +x)
  const out = [];
  for (let r = 0; r < Math.max(1, Math.floor(h / 2.6)); r++) for (let c = 0; c < cols; c++)
    out.push(<mesh key={r + '-' + c} material={win} position={[cx + s * (dx / 2 + .02), 1.9 + r * 2.2, cz + (c - (cols - 1) / 2) * (dz / (cols + .4))]} rotation={[0, s * Math.PI / 2, 0]}><planeGeometry args={[.8, 1.1]} /></mesh>);
  return out;
}
export function House({ x, z, dx = 5, dz = 6, h = 4.5, k = 0, smoke }) {
  const s = x > 0 ? -1 : 1, rise = 1.8 + (k % 3) * .4, r = (dz / 2) * Math.SQRT2;
  return (<>
    <RigidBody type="fixed" position={[x, h / 2, z]} colliders="cuboid"><mesh castShadow receiveShadow><boxGeometry args={[dx, h, dz]} /><meshStandardMaterial color={WALL[k % 5]} roughness={.95} /></mesh></RigidBody>
    <mesh position={[x, h + rise / 2, z]} scale={[dx / dz * 1.12, 1, 1.12]} castShadow>
      <coneGeometry args={[r, rise, 4]} onUpdate={g => g.rotateY(Math.PI / 4)} /><meshStandardMaterial color={ROOF[k % 4]} roughness={.8} /></mesh>
    <mesh position={[x + s * (dx / 2 + .02), 1, z]} rotation={[0, s * Math.PI / 2, 0]}><planeGeometry args={[1.1, 2]} /><meshStandardMaterial color="#5a3d2a" /></mesh>
    <Windows cx={x} cz={z} dx={dx} dz={dz} h={h} s={s} />
    <mesh position={[x - s * dx * .25, h + rise * .8, z + dz * .2]} castShadow><boxGeometry args={[.6, 1.4, .6]} /><meshStandardMaterial color="#8a7a6a" /></mesh>
    {smoke && <Sparkles count={7} size={7} scale={[.5, 2.6, .5]} position={[x - s * dx * .25, h + rise * .8 + 1.6, z + dz * .2]} color="#d8d8d8" speed={.4} opacity={.5} />}
  </>);
}
// Dress a walkable block (a rooftop in beat 3) so it reads as a townhouse, not a grey box.
export function Dress({ p, s, k = 0 }) {
  const [x, y, z] = p, [w, h, d] = s, top = y + h / 2;
  return (<>
    {[[0, d / 2], [0, -d / 2]].map(([a, b], i) => <mesh key={i} position={[x, top + .25, z + b]}><boxGeometry args={[w, .5, .15]} /><meshStandardMaterial color="#8a7a6a" /></mesh>)}
    {[w / 2, -w / 2].map((a, i) => <mesh key={i} position={[x + a, top + .25, z]}><boxGeometry args={[.15, .5, d]} /><meshStandardMaterial color="#8a7a6a" /></mesh>)}
    <mesh position={[x - w * .25, top + .9, z - d * .25]} castShadow><boxGeometry args={[.7, 1.6, .7]} /><meshStandardMaterial color={ROOF[k % 4]} /></mesh>
    <Windows cx={x} cz={z} dx={w} dz={d} h={h} s={-1} cols={2} /><Windows cx={x} cz={z} dx={w} dz={d} h={h} s={1} cols={2} />
  </>);
}
function Banner({ p, color }) {
  const m = useRef();
  useFrame(({ clock }) => { if (m.current) m.current.uniforms.uTime.value = clock.elapsedTime; });
  return (<group position={p}>
    <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[.05, .05, 3.6, 8]} /><meshStandardMaterial color="#5a3d2a" /></mesh>
    <mesh position={[.65, 3.1, 0]}><planeGeometry args={[1.2, 1.1, 12, 4]} />
      <CustomShaderMaterial ref={m} baseMaterial={THREE.MeshStandardMaterial} color={color} side={THREE.DoubleSide}
        uniforms={{ uTime: { value: 0 } }} vertexShader={`uniform float uTime; void main(){ csm_Position = position + vec3(0.,0., sin(position.x*5.+uTime*3.+position.y)*.14*(position.x+.6)); }`} /></mesh>
  </group>);
}
function Fountain() {
  const m = useRef();
  useFrame(({ clock }) => { if (m.current) m.current.uniforms.uTime.value = clock.elapsedTime; });
  return (<group position={[0, 0, -54]}>
    <RigidBody type="fixed" colliders={false}><CylinderCollider args={[.4, 2.8]} position={[0, .4, 0]} /></RigidBody>
    <mesh position={[0, .35, 0]} castShadow receiveShadow><cylinderGeometry args={[2.8, 3, .7, 32]} /><meshStandardMaterial color="#b9b0a2" roughness={.9} /></mesh>
    <mesh position={[0, .72, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.5, 48, 0, Math.PI * 2]} />
      <CustomShaderMaterial ref={m} baseMaterial={THREE.MeshStandardMaterial} color="#5aa6d6" roughness={.1} metalness={.1}
        uniforms={{ uTime: { value: 0 } }} vertexShader={`uniform float uTime; void main(){ csm_Position = position + vec3(0.,0., sin(position.x*3.+uTime*2.)*.04 + cos(position.y*3.+uTime*1.7)*.04); }`} /></mesh>
    <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[.25, .4, 1.4, 12]} /><meshStandardMaterial color="#b9b0a2" /></mesh>
    <Sparkles count={30} scale={[1.2, 2, 1.2]} position={[0, 2, 0]} size={3} color="#cfeaff" speed={1.2} />
  </group>);
}
const HOUSES = [
  [-18.5, 50, 5, 6, 5, 0, 1], [18.5, 48, 5, 7, 4.5, 1, 0], [-18.5, 40, 5, 6, 4, 2, 0], [18.5, 41, 5, 6, 5.5, 3, 1],
  [-19, 3, 4, 6, 5, 4, 0], [19, 2, 4, 6, 4, 0, 0], [-17, -6, 5, 6, 5.5, 1, 1], [17, -14, 5, 6, 4.5, 2, 0],
  [-17, -22, 5, 6, 5, 3, 0], [-17.5, -50, 5, 6, 5, 4, 1], [17.5, -48, 5, 6, 4.5, 0, 0], [-17, -62, 5, 6, 5.5, 1, 0], [17, -66, 5, 6, 5, 2, 1],
];
export function Town() {
  useTownFx();
  const posts = useMemo(() => [52, 44, 30, 22, 14, 4, -6, -16, -26, -36, -50, -60].flatMap(z => [[-7.6, z], [7.6, z]]), []);
  return (<>
    {HOUSES.map(([x, z, dx, dz, h, k, smoke], i) => <House key={i} x={x} z={z} dx={dx} dz={dz} h={h} k={k} smoke={!!smoke} />)}
    <Instances limit={32} castShadow><cylinderGeometry args={[.09, .11, 3.4, 8]} /><meshStandardMaterial color="#3a3a46" />
      {posts.map(([x, z], i) => <Instance key={i} position={[x, 1.7, z]} />)}</Instances>
    <Instances limit={32}><sphereGeometry args={[.28, 12, 10]} /><meshStandardMaterial color="#ffe3a3" emissive="#ffb347" emissiveIntensity={1.8} />
      {posts.map(([x, z], i) => <Instance key={i} position={[x, 3.5, z]} />)}</Instances>
    {[[-8.5, 46, '#c0504d'], [8.5, 30, '#4a7fb0'], [-8.5, 12, '#e0a83c'], [8.5, -12, '#c0504d'], [-8.5, -28, '#4a7fb0'], [8.5, -52, '#e0a83c']].map(([x, z, c], i) => <Banner key={i} p={[x, 0, z]} color={c} />)}
    <Fountain />
  </>);
}
