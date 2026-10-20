import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Float, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Buddy } from './Buddy';
import { Ground } from './Ground';
import { Player, useInteract } from './Player';
import { adv, playerPos, useStory, talk } from './state';

const BOARD = [7, 0, 9], MOMO = [-8, 0, -6], ROOT = [0, 0, 8];
const PAGES = [
  { p: [-10, .9, 9], text: 'A true page! The bakery’s real tax: a third of what the toll-men claimed.' },
  { p: [-13, .9, -12], text: 'Page two. The ghost workers: forty names on the payroll, none of them real.' },
  { p: [11, .9, -13], text: 'Page three, signed by Lord Treasurer Brass himself. We have them all. To the Town Board!' },
];
const HOUSES = [[-14, 6, 5, 4, 3, '#c9b79a'], [14, 5, 5, 4, 3.4, '#b9a58c'], [-15, -8, 4, 5, 3, '#cdbb9d'], [16, -9, 4, 5, 3.6, '#b9a58c'], [-6, 17, 5, 2, 2.6, '#c9b79a']];

const Wall = ({ p, s, c = '#8b7e70' }) => (
  <RigidBody type="fixed" position={p} colliders="cuboid"><mesh><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={.9} /></mesh></RigidBody>
);
function Cart({ p }) {
  return (
    <RigidBody name="cart" position={p} colliders="cuboid" friction={.8} linearDamping={2.5} angularDamping={4} enabledRotations={[false, true, false]}>
      <mesh><boxGeometry args={[1.6, .8, 1.1]} /><meshStandardMaterial color="#a87a4a" roughness={.8} /></mesh>
    </RigidBody>
  );
}
function Gate({ i, x }) {
  const open = useStory(s => s.gates[i]);
  const jam = () => {
    const S = useStory.getState(); if (S.gates[i]) return;
    const g = [...S.gates]; g[i] = true; useStory.setState({ gates: g }); S.addTrust(6);
    S.say(i === 0
      ? [{ who: 'Momo', text: 'You jammed the gate! I haven’t sold bread to the north side in two years!' }]
      : [{ who: 'Pip', text: 'That gate only existed to charge people for walking.' }]);
  };
  return (
    <group>
      {!open && <RigidBody type="fixed" position={[x, .7, -2]} colliders="cuboid">
        <mesh><boxGeometry args={[4, 1.4, .4]} /><meshStandardMaterial color="#c0504d" roughness={.7} /></mesh>
      </RigidBody>}
      <RigidBody type="fixed" colliders={false} position={[x, .8, -1]}>
        <CuboidCollider args={[1.8, .8, .7]} sensor onIntersectionEnter={e => e.other.rigidBodyObject?.name === 'cart' && jam()} />
      </RigidBody>
    </group>
  );
}
function Page({ id, p }) {
  const got = useStory(s => s.got[id]);
  useFrame(() => {
    const S = useStory.getState();
    if (S.got[id] || S.dialog || Math.hypot(playerPos.x - p[0], playerPos.z - p[2]) > 1.4) return;
    const g = [...S.got]; g[id] = true; useStory.setState({ got: g, objective: g.every(Boolean) ? 'Post the pages on the Town Board.' : S.objective });
    S.addTrust(8); S.say([{ who: 'Pip', text: PAGES[id].text }]);
  });
  if (got) return null;
  return (
    <Float speed={3} floatIntensity={.5}>
      <group position={p}>
        <mesh rotation={[0, .5, 0]}><planeGeometry args={[.7, .95]} /><meshStandardMaterial color="#fff4cf" emissive="#ffd36e" emissiveIntensity={.8} side={THREE.DoubleSide} /></mesh>
        <Sparkles count={10} scale={1.6} size={3} color="#ffd36e" />
      </group>
    </Float>
  );
}
function Heartroot() {
  const g = useRef();
  useFrame((_, dt) => {
    const t = .3 + useStory.getState().rootLevel * .7;
    g.current.scale.setScalar(g.current.scale.x + (t - g.current.scale.x) * Math.min(1, dt * 1.5));
  });
  const lvl = useStory(s => s.rootLevel);
  return (
    <group position={ROOT}>
      <group ref={g} scale={.3}>
        <mesh position={[0, .6, 0]}><cylinderGeometry args={[.25, .4, 1.2, 12]} /><meshStandardMaterial color="#8a6444" /></mesh>
        {lvl > 0 && <mesh position={[0, 2, 0]}><sphereGeometry args={[1.3, 20, 14]} /><meshStandardMaterial color="#6cc070" /></mesh>}
      </group>
      {lvl > 0 && <Sparkles count={40} scale={[4, 4, 4]} position={[0, 2, 0]} size={4} color="#bff0a0" />}
    </group>
  );
}
function Follower() {
  const g = useRef();
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, k = 1 - Math.exp(-dt * 3);
    g.current.position.x += (playerPos.x - 1.6 - g.current.position.x) * k;
    g.current.position.z += (playerPos.z + 1.2 - g.current.position.z) * k;
    g.current.position.y = .1 + Math.sin(t * 3) * .05;
  });
  return <group ref={g}><Buddy type="pip" /></group>;
}

export function Ashmarket() {
  const lite = useStory(s => s.lite);
  const interact = useCallback(() => {
    const S = useStory.getState();
    if (S.dialog || S.choice || S.ended || performance.now() - adv.t < 200) return;
    const near = (p, r) => Math.hypot(playerPos.x - p[0], playerPos.z - p[2]) < r;
    if (near(BOARD, 2.8) && !S.boardDone) {
      const n = S.got.filter(Boolean).length;
      if (n < 3) S.say([{ who: 'Pip', text: `The board is empty. We need all three ledger pages (${n}/3).` }]);
      else S.say([{ who: 'Pip', text: 'Once these go up, anyone can read the real numbers, and no one can quietly change them again.' }], () => useStory.setState({ choice: 'board' }));
    } else if (near(MOMO, 2.8)) {
      S.say([{ who: 'Momo', text: S.gates[0] ? 'Take a roll. Free! My first customer in two years.' : 'Three inspectors, three tolls, one loaf of bread. Do the maths, little one.' }]);
    }
  }, []);
  useInteract(interact);
  useFrame(() => {
    const S = useStory.getState(); if (S.dialog || S.choice || S.ended) { if (S.prompt) useStory.setState({ prompt: '' }); return; }
    const near = (p, r) => Math.hypot(playerPos.x - p[0], playerPos.z - p[2]) < r;
    const pr = near(BOARD, 2.8) && !S.boardDone ? (S.got.every(Boolean) ? 'E · Post the pages' : 'E · Town Board') : near(MOMO, 2.8) ? 'E · Talk to Momo' : '';
    if (pr !== S.prompt) useStory.setState({ prompt: pr });
  });
  return (
    <group>
      <Ground />
      <RigidBody type="fixed"><CuboidCollider args={[20, .5, 20]} position={[0, -.5, 0]} /></RigidBody>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[20, 2, .5]} position={[0, 2, 19.5]} /><CuboidCollider args={[20, 2, .5]} position={[0, 2, -19.5]} />
        <CuboidCollider args={[.5, 2, 20]} position={[19.5, 2, 0]} /><CuboidCollider args={[.5, 2, 20]} position={[-19.5, 2, 0]} />
      </RigidBody>
      {/* toll wall with two gates, plus a divider that splits the north into west and east pockets */}
      <Wall p={[-13, 1, -2]} s={[12, 2, .5]} /><Wall p={[0, 1, -2]} s={[6, 2, .5]} /><Wall p={[13, 1, -2]} s={[12, 2, .5]} />
      <Wall p={[0, 1, -10.5]} s={[.5, 2, 17]} />
      <Gate i={0} x={-5} /><Gate i={1} x={5} />
      {[[-5, .5, 5], [5, .5, 5], [0, .5, 3]].map((p, i) => <Cart key={i} p={p} />)}
      {HOUSES.map(([x, z, w, d, h, c], i) => (
        <group key={i}>
          <Wall p={[x, h / 2, z]} s={[w, h, d]} c={c} />
          <mesh position={[x, h + .6, z]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[Math.max(w, d) * .75, 1.4, 4]} /><meshStandardMaterial color="#8b5a4a" roughness={.8} /></mesh>
        </group>
      ))}
      <group position={MOMO}>
        <mesh position={[0, .5, 0]}><boxGeometry args={[2.4, 1, 1]} /><meshStandardMaterial color="#c9a36a" /></mesh>
        <mesh position={[0, 1.9, 0]}><boxGeometry args={[2.8, .15, 1.4]} /><meshStandardMaterial color="#e8a0b8" /></mesh>
        <group position={[0, 0, -1.2]} rotation={[0, Math.PI, 0]}><Buddy type="mochi" /></group>
      </group>
      <group position={BOARD}>
        <mesh position={[0, 1.2, 0]}><boxGeometry args={[2.6, 1.8, .2]} /><meshStandardMaterial color="#a87a4a" /></mesh>
        <mesh position={[0, 1.2, .12]}><planeGeometry args={[2.2, 1.4]} /><meshStandardMaterial color="#fff4cf" /></mesh>
      </group>
      <Heartroot />
      {PAGES.map((pg, i) => <Page key={i} id={i} p={pg.p} />)}
      <Sparkles count={60} scale={[30, 8, 30]} position={[0, 4, 0]} size={2} speed={.3} color="#aab0b4" />
      <Follower />
      <Player />
      {!lite && <ContactShadows position={[0, .02, 0]} opacity={.35} scale={40} blur={2.2} far={4} resolution={512} />}
    </group>
  );
}
