import { useEffect, useMemo, useRef } from 'react';
import { RigidBody, InstancedRigidBodies, useRopeJoint } from '@react-three/rapier';
import { useStory } from './state';

const rnd = (a, b) => a + Math.random() * (b - a);
// Visible physics, all real Rapier bodies: a coin chest that bursts when a toll gate is jammed,
// the gate splintering into debris, crate pyramids and barrels to topple, lanterns that swing on rope joints.
export function Chest({ i, x }) {
  const open = useStory(s => s.gates[i]), coins = useRef(), N = 24;
  const inst = useMemo(() => Array.from({ length: N }, (_, k) => ({ key: `c${i}-${k}`, position: [x + rnd(-.4, .4), .25 + Math.floor(k / 8) * .13, 39 + rnd(-.3, .3)], rotation: [Math.PI / 2, 0, 0] })), [i, x]);
  useEffect(() => { if (open && coins.current) coins.current.forEach(b => b.setLinvel({ x: rnd(-3, 3), y: rnd(4, 8), z: rnd(-4, 3) }, true)); }, [open]);
  return (<>
    <RigidBody type="fixed" position={[x, 0, 39]} colliders="cuboid">
      <mesh position={[0, .05, 0]}><boxGeometry args={[1.4, .1, 1.2]} /><meshStandardMaterial color="#7a5a3a" /></mesh>
      {[-.55, .55].map(z => <mesh key={z} position={[0, .3, z]}><boxGeometry args={[1.4, .5, .1]} /><meshStandardMaterial color="#7a5a3a" /></mesh>)}
      {[-.65, .65].map(a => <mesh key={a} position={[a, .3, 0]}><boxGeometry args={[.1, .5, 1.2]} /><meshStandardMaterial color="#7a5a3a" /></mesh>)}
    </RigidBody>
    <InstancedRigidBodies ref={coins} instances={inst} colliders="ball">
      <instancedMesh args={[undefined, undefined, N]} castShadow><cylinderGeometry args={[.12, .12, .03, 12]} /><meshStandardMaterial color="#f0b030" metalness={.8} roughness={.3} /></instancedMesh>
    </InstancedRigidBodies>
  </>);
}
export function Debris({ x }) {
  const bits = useMemo(() => Array.from({ length: 7 }, () => ({ p: [x + rnd(-1.5, 1.5), 1 + rnd(0, .8), 36], v: [rnd(-4, 4), rnd(3, 6), rnd(-3, 3)], a: [rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)] })), [x]);
  return bits.map((b, k) => (
    <RigidBody key={k} position={b.p} colliders="cuboid" linearVelocity={b.v} angularVelocity={b.a}>
      <mesh castShadow><boxGeometry args={[.4, .3, .3]} /><meshStandardMaterial color={k % 2 ? '#c0504d' : '#e8e0d0'} /></mesh>
    </RigidBody>));
}
export function Pyramid({ x, z }) {
  const rows = [[-1, 0, 1], [-.5, .5], [0]];
  return rows.flatMap((r, y) => r.map((dx, i) => (
    <RigidBody key={y + '-' + i} position={[x + dx * 1.05, .5 + y * 1.02, z]} colliders="cuboid" friction={.9}>
      <mesh castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={['#b8905a', '#a8804a', '#c8a06a'][(y + i) % 3]} roughness={.85} /></mesh>
    </RigidBody>)));
}
export function Barrel({ p }) {
  return (<RigidBody position={p} colliders="hull" friction={.7} angularDamping={.3}>
    <mesh castShadow receiveShadow><cylinderGeometry args={[.45, .45, 1, 14]} /><meshStandardMaterial color="#8a5a3a" roughness={.8} /></mesh>
    <mesh position={[0, .25, 0]}><cylinderGeometry args={[.47, .47, .08, 14]} /><meshStandardMaterial color="#3a3a46" /></mesh>
  </RigidBody>);
}
function Lamp({ p }) {
  const a = useRef(), b = useRef();
  useRopeJoint(a, b, [[0, 0, 0], [0, .3, 0], 2.4]);
  return (<>
    <RigidBody ref={a} type="fixed" position={p} colliders={false}><mesh><sphereGeometry args={[.06]} /><meshBasicMaterial color="#222" /></mesh></RigidBody>
    <RigidBody ref={b} position={[p[0], p[1] - 2.4, p[2]]} colliders="ball" angularDamping={1} linearDamping={.3}>
      <mesh castShadow><sphereGeometry args={[.28, 16, 12]} /><meshStandardMaterial color="#ffd36e" emissive="#ffb347" emissiveIntensity={1.8} /></mesh>
    </RigidBody>
  </>);
}
export function Lamps() {
  return [48, 40, -50].flatMap(z => [
    <mesh key={'c' + z} position={[0, 4.2, z]}><boxGeometry args={[15.2, .06, .06]} /><meshStandardMaterial color="#222" /></mesh>,
    ...[-4, 0, 4].map(x => <Lamp key={z + '_' + x} p={[x, 4.2, z]} />),
  ]);
}
