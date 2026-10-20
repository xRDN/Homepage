import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { Float, Sparkles, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Buddy } from './Buddy';
import { Bubble, PipBubble } from './Bubble';
import { Ground } from './Ground';
import { Player, useInteract } from './Player';
import { playerPos, useStory, pipSay, card } from './state';
import { chime, pop } from './audio';

// Five beats along one long street (z runs from +52 at the start to -68 at the Clock):
// 1 toll street · 2 under-archive · 3 ghost payroll rooftops · 4 counting house · 5 the square.
const TARGET = [3, 1, 2], SLOT_X = [-6, 0, 6], SLOT_Z = -38, BOARD = [8, -58], STAMPS = [[-8, -54], [-4, -54]];
const PAGES = [[-11, .9, 21.5], [-10, 2.8, 11], [7, 5.4, -21.5]];
const near = (x, z, r) => Math.hypot(playerPos.x - x, playerPos.z - z) < r;

const Box = ({ p, s, c = '#8b7e70' }) => (
  <RigidBody type="fixed" position={p} colliders="cuboid"><mesh><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={.9} /></mesh></RigidBody>
);
const Crate = ({ p, name }) => (
  <RigidBody name={name} position={p} colliders="cuboid" friction={.8} linearDamping={2.5} angularDamping={4} enabledRotations={[false, true, false]}>
    <mesh><boxGeometry args={name === 'cart' ? [1.6, .8, 1.1] : [1, 1, 1]} /><meshStandardMaterial color={name === 'cart' ? '#a87a4a' : '#b8905a'} roughness={.8} /></mesh>
  </RigidBody>
);
function Gate({ i, x }) {
  const open = useStory(s => s.gates[i]);
  const jam = () => {
    const S = useStory.getState(); if (S.gates[i]) return;
    const g = [...S.gates]; g[i] = true; S.progress({ gates: g }); S.addTrust(5); pop(); pipSay('🪙✋', 'Pip: that toll is stopped.', 2200);
  };
  return (<>
    {!open && <Box p={[x, .7, 36]} s={[4, 1.4, .4]} c="#c0504d" />}
    <RigidBody type="fixed" colliders={false} position={[x, .8, 37.2]}>
      <CuboidCollider args={[1.8, .8, .7]} sensor onIntersectionEnter={e => e.other.rigidBodyObject?.name === 'cart' && jam()} />
    </RigidBody>
  </>);
}
function Ink({ p, r = 2 }) {
  const slow = d => e => e.other.rigidBodyObject?.name === 'player' && useStory.setState(s => ({ slow: Math.max(0, s.slow + d) }));
  return (<>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p[0], .03, p[1]]}><circleGeometry args={[r, 32]} /><meshStandardMaterial color="#17171e" roughness={.25} metalness={.2} /></mesh>
    <RigidBody type="fixed" colliders={false} position={[p[0], .3, p[1]]}><CylinderCollider args={[.6, r]} sensor onIntersectionEnter={slow(1)} onIntersectionExit={slow(-1)} /></RigidBody>
  </>);
}
function Page({ id, p }) {
  const got = useStory(s => s.got[id]);
  useFrame(() => {
    const S = useStory.getState();
    if (S.got[id] || Math.hypot(playerPos.x - p[0], playerPos.z - p[2]) > 1.4 || Math.abs(playerPos.y + 1 - p[1]) > 2.2) return;
    const g = [...S.got]; g[id] = true; S.progress({ got: g }); S.addTrust(8); pop(); pipSay('📜✨', 'Pip: a true page!', 2200);
  });
  if (got) return null;
  return (
    <Float speed={3} floatIntensity={.5}><group position={p}>
      <mesh rotation={[0, .5, 0]}><planeGeometry args={[.7, .95]} /><meshStandardMaterial color="#fff4cf" emissive="#ffd36e" emissiveIntensity={.8} side={THREE.DoubleSide} /></mesh>
      <Sparkles count={10} scale={1.6} size={3} color="#ffd36e" />
    </group></Float>
  );
}
// Beat 1 prop: a loaf walks past three coin-takers and shrinks to a crumb. No words needed.
function LoafDemo() {
  const loaf = useRef();
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 9) / 9, k = Math.min(3, Math.floor(t * 4));
    loaf.current.position.set(0, .9, -t * 8); loaf.current.scale.setScalar(1 - k * .25);
  });
  return (
    <group position={[-13, 0, 46]}>
      <mesh ref={loaf}><capsuleGeometry args={[.3, .4, 6, 10]} /><meshStandardMaterial color="#d9a05b" /></mesh>
      {[2, 4, 6].map(z => <group key={z} position={[1.2, 0, -z]}>
        <mesh position={[0, .6, 0]}><boxGeometry args={[.4, 1.2, .4]} /><meshStandardMaterial color="#c0504d" /></mesh><Bubble y={1.8} icons="🪙" /></group>)}
      <mesh position={[-1.4, .5, 0]}><boxGeometry args={[2, 1, 1]} /><meshStandardMaterial color="#c9a36a" /></mesh>
      <mesh position={[-1.4, 1.9, 0]}><boxGeometry args={[2.4, .15, 1.4]} /><meshStandardMaterial color="#e8a0b8" /></mesh>
      <group position={[-1.4, 0, -1.2]} rotation={[0, Math.PI, 0]}><Buddy type="mochi" /><Bubble icons="🍞" y={2} /></group>
    </group>
  );
}
// Beat 3 prop: a wall of 40 empty hats, the ghost payroll.
function HatWall() {
  const hats = useMemo(() => Array.from({ length: 40 }, (_, i) => [7 - 4.5 + (i % 8) * 1.28, 5.5 + Math.floor(i / 8) * .72]), []);
  return (<>
    <Box p={[7, 6.5, -25]} s={[10, 4, .3]} c="#a89a86" />
    {hats.map(([x, y], i) => <group key={i} position={[x, y, -24.75]}>
      <mesh position={[0, .12, 0]}><coneGeometry args={[.22, .3, 10]} /><meshStandardMaterial color="#3a3a46" /></mesh>
      <mesh><cylinderGeometry args={[.36, .36, .05, 12]} /><meshStandardMaterial color="#3a3a46" /></mesh></group>)}
  </>);
}
// Beat 4: pedestals show a target of coin pips; E cycles which page (1 to 3 pips) sits in each slot.
function Slots() {
  const slots = useStory(s => s.slots), solved = useStory(s => s.solved);
  return (<>
    <Box p={[0, 2, -45.6]} s={[14, 3, .3]} c={solved ? '#d8e8c8' : '#9a8a7a'} />
    {SLOT_X.map((x, i) => (<group key={i}>
      <mesh position={[x, .4, SLOT_Z]}><cylinderGeometry args={[.9, 1, .8, 20]} /><meshStandardMaterial color={slots[i] === TARGET[i] ? '#8fcf6b' : '#c9b79a'} /></mesh>
      <Html position={[x, 3, SLOT_Z]} center style={{ pointerEvents: 'none' }}><div className="bub">{'🪙'.repeat(TARGET[i])}</div></Html>
      <Html position={[x, 1.6, SLOT_Z]} center style={{ pointerEvents: 'none' }}><div className="bub">{slots[i] ? '📜' + '●'.repeat(slots[i]) : '▢'}</div></Html>
    </group>))}
  </>);
}
function Clock() {
  const hand = useRef(), gear = useRef(), landed = useRef(false), gears = useStory(s => s.gears);
  useFrame((_, dt) => {
    const g = useStory.getState().gears;
    if (g > 0 && gear.current) {
      gear.current.position.y = Math.max(2.4, gear.current.position.y - dt * 5); gear.current.rotation.z += dt * 2;
      if (gear.current.position.y <= 2.4 && !landed.current) { landed.current = true; chime(); }
    }
    if (g > 0 && hand.current) hand.current.rotation.z -= dt * .8;
  });
  return (
    <group position={[0, 0, -64]}>
      <mesh position={[0, 3.5, 0]}><boxGeometry args={[3, 7, 3]} /><meshStandardMaterial color="#9a8a7a" roughness={.9} /></mesh>
      <mesh position={[0, 5.6, 1.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.2, 1.2, .1, 32]} /><meshStandardMaterial color="#f4ecd8" /></mesh>
      <group ref={hand} position={[0, 5.6, 1.65]}><mesh position={[0, .45, 0]}><boxGeometry args={[.1, .9, .06]} /><meshStandardMaterial color="#3a3a46" /></mesh></group>
      {[-1.2, -.6, 0, .6, 1.2].map((x, i) => <mesh key={i} position={[x, 2.4, 1.55]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.22, .05, 8, 16]} /><meshStandardMaterial color={i === 0 && gears ? '#f0b030' : '#6b5f52'} /></mesh>)}
      <group ref={gear} position={[-1.2, 9, 1.7]} visible={gears > 0}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.32, .32, .12, 10]} /><meshStandardMaterial color="#f0b030" emissive="#f0b030" emissiveIntensity={.5} /></mesh></group>
    </group>
  );
}
function Crowd() {
  const stamp = useStory(s => s.stamp), n = stamp === 'numbers' ? 16 : stamp ? 6 : 0, refs = useRef([]);
  const spec = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ a: (i / 15) * Math.PI, r: 2.6 + (i % 3) * .9, c: ['#e8a0b8', '#8fcf6b', '#f2c94c', '#6cb4e0', '#c7a8ff'][i % 5] })), []);
  useFrame(({ clock }, dt) => refs.current.forEach((m, i) => {
    if (!m) return; const s = spec[i], on = i < n; m.visible = on; if (!on) return;
    const k = 1 - Math.exp(-dt * 1.5), tx = BOARD[0] + Math.cos(s.a) * s.r, tz = BOARD[1] + 1 + Math.sin(s.a) * s.r;
    m.position.x += (tx - m.position.x) * k; m.position.z += (tz - m.position.z) * k; m.position.y = .5 + Math.abs(Math.sin(clock.elapsedTime * 3 + i)) * .05;
  }));
  return spec.map((s, i) => <mesh key={i} ref={el => (refs.current[i] = el)} position={[0, .5, -48]} visible={false}><capsuleGeometry args={[.3, .5, 6, 10]} /><meshStandardMaterial color={s.c} /></mesh>);
}
function hint(S) {
  if (S.ended) return null;
  if (S.stage === 0) return S.gates[0] ? [5, 40] : [-5, 40];
  if (S.stage === 1) return !S.got[0] ? [-11, 21.5] : [-10, 11];
  if (S.stage === 2) return [7, -20];
  if (S.stage === 3) return [0, -37];
  return S.stamp ? null : [-6, -54];
}
// Pip follows you; after 20s without progress he hops toward the next objective, after 45s sparkles mark it.
function Pip() {
  const g = useRef(), sp = useRef(), lastHint = useRef(0);
  useFrame(({ clock }, dt) => {
    const S = useStory.getState(), idle = (performance.now() - S.last) / 1000, h = idle > 20 ? hint(S) : null, t = clock.elapsedTime;
    let tx = playerPos.x - 1.6, tz = playerPos.z + 1.2;
    if (h) {
      const dx = h[0] - playerPos.x, dz = h[1] - playerPos.z, l = Math.hypot(dx, dz) || 1;
      tx = playerPos.x + dx / l * 3; tz = playerPos.z + dz / l * 3; g.current.rotation.y = Math.atan2(dx, dz);
      if (t - lastHint.current > 6) { lastHint.current = t; pipSay('➡️', 'Pip points the way.', 2400); }
    }
    const k = 1 - Math.exp(-dt * 3);
    g.current.position.x += (tx - g.current.position.x) * k; g.current.position.z += (tz - g.current.position.z) * k;
    g.current.position.y = playerPos.y * .5 + .1 + Math.abs(Math.sin(t * (h ? 6 : 3))) * (h ? .35 : .08);
    sp.current.visible = !!h && idle > 45; if (h) sp.current.position.set(h[0], 1, h[1]);
  });
  return (<>
    <group ref={g} position={[0, .1, 50]}><Buddy type="pip" /><PipBubble /></group>
    <group ref={sp} visible={false}><Sparkles count={25} scale={[3, 3, 3]} size={5} color="#ffd36e" /></group>
  </>);
}

export function Ashmarket() {
  const lite = useStory(s => s.lite), solved = useStory(s => s.solved);
  useEffect(() => { card('I · Ashmarket', 3000); }, []);
  const interact = useCallback(() => {
    const S = useStory.getState(); if (S.ended) return;
    if (S.stage >= 3 && !S.solved) for (let i = 0; i < 3; i++) if (near(SLOT_X[i], SLOT_Z, 2)) {
      const s = [...S.slots]; s[i] = (s[i] + 1) % 4; S.progress({ slots: s }); pop();
      if (s.every((v, j) => v === TARGET[j])) { S.progress({ solved: true }); S.addTrust(12); chime(); pipSay('⚖️✔️', 'Pip: every column agrees.', 2400); }
      return;
    }
    if (S.stage === 4 && !S.stamp) {
      const kind = near(STAMPS[0][0], STAMPS[0][1], 1.8) ? 'numbers' : near(STAMPS[1][0], STAMPS[1][1], 1.8) ? 'portrait' : null;
      if (!kind) return;
      S.progress({ stamp: kind }); S.addTrust(kind === 'numbers' ? 34 : 22); pop(); pipSay('🧾', 'The pages go up on the board.', 2400);
      setTimeout(() => useStory.getState().progress({ gears: 1 }), 3500);
      setTimeout(() => useStory.setState({ ended: true }), 9000);
    }
  }, []);
  useInteract(interact);
  useFrame(() => {
    const S = useStory.getState();
    let st = S.stage;
    if (st === 0 && (S.gates[0] || S.gates[1])) st = 1;
    if (st === 1 && S.got[0] && S.got[1]) st = 2;
    if (st === 2 && S.got[2]) st = 3;
    if (st === 3 && S.solved) st = 4;
    if (st !== S.stage) S.progress({ stage: st });
    const slotNear = S.stage >= 3 && !S.solved && SLOT_X.some(x => near(x, SLOT_Z, 2));
    const stampNear = S.stage === 4 && !S.stamp && STAMPS.some(([x, z]) => near(x, z, 1.8));
    const pr = slotNear || stampNear ? 'E' : '';
    if (pr !== S.prompt) useStory.setState({ prompt: pr });
  });
  return (
    <group>
      <group position={[0, 0, -7]}><Ground w={44} h={130} /></group>
      <RigidBody type="fixed"><CuboidCollider args={[22, .5, 65]} position={[0, -.5, -7]} /></RigidBody>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[22, 3, .5]} position={[0, 3, 57]} /><CuboidCollider args={[22, 3, .5]} position={[0, 3, -71]} />
        <CuboidCollider args={[.5, 3, 65]} position={[22, 3, -7]} /><CuboidCollider args={[.5, 3, 65]} position={[-22, 3, -7]} />
      </RigidBody>

      {/* beat 1: toll street */}
      <Box p={[-14, 1, 36]} s={[14, 2, .5]} /><Box p={[0, 1, 36]} s={[6, 2, .5]} /><Box p={[14, 1, 36]} s={[14, 2, .5]} />
      <Gate i={0} x={-5} /><Gate i={1} x={5} />
      {[[-5, .5, 46], [5, .5, 46], [0, .5, 43]].map((p, i) => <Crate key={i} p={p} name="cart" />)}
      <LoafDemo />

      {/* beat 2: under-archive, a zig-zag of shelves with ink pools */}
      <Box p={[-8.25, 1.25, 28]} s={[12.5, 2.5, .6]} c="#7a5a3a" /><Box p={[8.25, 1.25, 28]} s={[12.5, 2.5, .6]} c="#7a5a3a" />
      <Box p={[-8.25, 1.25, 8]} s={[12.5, 2.5, .6]} c="#7a5a3a" /><Box p={[8.25, 1.25, 8]} s={[12.5, 2.5, .6]} c="#7a5a3a" />
      <Box p={[-14.5, 1.25, 18]} s={[.6, 2.5, 20]} c="#7a5a3a" /><Box p={[14.5, 1.25, 18]} s={[.6, 2.5, 20]} c="#7a5a3a" />
      <Box p={[-4, 1.25, 24]} s={[20, 2.5, .6]} c="#8a6a4a" /><Box p={[4, 1.25, 19]} s={[20, 2.5, .6]} c="#8a6a4a" /><Box p={[-4, 1.25, 14]} s={[20, 2.5, .6]} c="#8a6a4a" />
      <Ink p={[10, 26]} /><Ink p={[-10, 21.5]} r={1.6} /><Ink p={[10, 16.5]} /><Ink p={[-6, 11]} r={1.6} />
      <Box p={[-10, 1.1, 11]} s={[4, 2.2, 4]} c="#a89a86" />
      <Crate p={[3, .5, 11]} name="crate" /><Crate p={[5, .5, 10.4]} name="crate" />

      {/* beat 3: rooftops to the ghost payroll */}
      <Box p={[0, .5, 5]} s={[3, 1, 2]} c="#b9a58c" /><Box p={[0, 1, 3]} s={[3, 2, 2]} c="#b9a58c" />
      <Box p={[0, 1.5, -.5]} s={[5, 3, 5]} c="#c9b79a" /><Box p={[0, 1.75, -8]} s={[5, 3.5, 5]} c="#b9a58c" />
      <Box p={[7, 2, -14]} s={[5, 4, 5]} c="#c9b79a" /><Box p={[7, 2.25, -22]} s={[5, 4.5, 5]} c="#b9a58c" />
      <HatWall />

      {/* beat 4: counting house */}
      <Box p={[-7.25, 1.25, -30]} s={[10.5, 2.5, .6]} c="#8a7a6a" /><Box p={[7.25, 1.25, -30]} s={[10.5, 2.5, .6]} c="#8a7a6a" />
      <Box p={[-7.25, 1.25, -46]} s={[10.5, 2.5, .6]} c="#8a7a6a" /><Box p={[7.25, 1.25, -46]} s={[10.5, 2.5, .6]} c="#8a7a6a" />
      <Box p={[-12.5, 1.25, -38]} s={[.6, 2.5, 16]} c="#8a7a6a" /><Box p={[12.5, 1.25, -38]} s={[.6, 2.5, 16]} c="#8a7a6a" />
      {!solved && <Box p={[0, 1.25, -46]} s={[4, 2.5, .6]} c="#c0504d" />}
      <Slots />

      {/* beat 5: the square */}
      <Clock />
      <group position={[BOARD[0], 0, BOARD[1]]}>
        <mesh position={[0, 1.2, 0]}><boxGeometry args={[3, 2, .2]} /><meshStandardMaterial color="#a87a4a" /></mesh>
        <mesh position={[0, 1.2, .12]}><planeGeometry args={[2.6, 1.6]} /><meshStandardMaterial color="#fff4cf" /></mesh>
      </group>
      {STAMPS.map(([x, z], i) => <group key={i} position={[x, 0, z]}>
        <mesh position={[0, .3, 0]}><cylinderGeometry args={[.9, 1, .6, 20]} /><meshStandardMaterial color="#c9b79a" /></mesh>
        <Html position={[0, 1.6, 0]} center style={{ pointerEvents: 'none' }}><div className="bub">{i ? '🔢🧑' : '🔢'}</div></Html></group>)}
      <Crowd />

      {PAGES.map((p, i) => <Page key={i} id={i} p={p} />)}
      <Sparkles count={80} scale={[40, 8, 120]} position={[0, 4, -7]} size={2} speed={.3} color="#aab0b4" />
      <Pip />
      <Player />
      {!lite && <ContactShadows position={[0, .02, 0]} opacity={.35} scale={44} blur={2.2} far={4} resolution={512} />}
    </group>
  );
}
