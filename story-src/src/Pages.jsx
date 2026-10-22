import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, InstancedRigidBodies } from '@react-three/rapier';
import { Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Hills, Cloud, Rect, Disc, Poly, House, Tree, Tower, Shelf, BookArt, Puppet, Tap, hover, PW } from './Art';
import { Bubble } from './Bubble';
import { useStory, ptr } from './state';
import { chime, pop } from './audio';

const rnd = (a, b) => a + Math.random() * (b - a);
const st = () => useStory.getState();
function Backdrop({ seed = 1 }) {
  return (<>
    <Hills z={-9} base={3.4} amp={1.6} color="#a7cf86" seed={seed} /><Hills z={-6} base={2.2} amp={1.1} color="#7fb06a" seed={seed + 2} />
    <Cloud p={[-6, 8.6, -11]} s={1.4} /><Cloud p={[6, 9.6, -12]} s={1} />
    <Rect w={50} h={3} color="#6fa85a" p={[0, -2.4, .2]} />
  </>);
}

// ---------- prologue ----------
function Honest({ i }) {
  return (<group position={[i * PW, 0, 0]}>
    <Backdrop seed={1} /><Tower p={[-1.5, .6, -5]} />
    {[[-8, '#e8d3a8', '#b5523b'], [-5, '#d9b99a', '#7a5a4a'], [5.5, '#e3cfa8', '#9a5a3a'], [8.8, '#cfd9b0', '#6b4a5a']].map(([x, w, r], k) => <House key={k} p={[x, .6, -2.5 - (k % 2)]} wall={w} roof={r} />)}
    <Tree p={[-10, .6, -1]} /><Tree p={[10.5, .6, -1.5]} s={1.2} />
    <BookArt p={[0, 1.2, 1.5]} glow />
    <Puppet type="mochi" p={[-3.4, .6, 2]} /><Puppet type="slime" p={[3.4, .6, 2]} flip /><Puppet type="pip" p={[-1.3, .6, 3.2]} s={.9} />
    <Sparkles count={40} scale={[16, 6, 4]} position={[0, 4, 1]} size={4} color="#ffd36e" />
  </group>);
}
function Changed({ i }) {
  const [n, setN] = useState(3), coin = useRef();
  useEffect(() => { const t = setInterval(() => setN(v => (v === 3 ? 9 : 3)), 1800); return () => clearInterval(t); }, []);
  useFrame((_, dt) => { if (coin.current) coin.current.rotation.y += dt * 3; });
  return (<group position={[i * PW, 0, 0]}>
    <Rect w={26} h={13} color="#d9c2a0" p={[0, -1, -4]} /><Rect w={4.5} h={4.8} color="#a9d8f2" p={[-7.5, 4.6, -3.9]} emissive={.5} />
    <Rect w={14} h={.5} color="#7a5a3a" p={[0, 2.2, 0]} /><Rect w={.6} h={1.6} color="#6b4a35" p={[-6, .6, 0]} /><Rect w={.6} h={1.6} color="#6b4a35" p={[6, .6, 0]} />
    <BookArt p={[-.5, 2.9, .3]} s={1.1} />
    <Html position={[-.5, 4.6, .8]} center style={{ pointerEvents: 'none' }}><div className="bignum">{n}</div></Html>
    <Html position={[1.6, 3.8, .8]} center style={{ pointerEvents: 'none' }}><div className="bub tap">✏️</div></Html>
    <group position={[5, 3.5, .3]}>
      <mesh scale={[1.3, 1, 1]} castShadow><sphereGeometry args={[.9, 24, 16]} /><meshStandardMaterial color="#e0a82e" roughness={.5} /></mesh>
      {[-.35, .35].map(x => <mesh key={x} position={[x, .55, .7]}><sphereGeometry args={[.16, 10, 8]} /><meshStandardMaterial color="#fff4d8" /></mesh>)}
    </group>
    <mesh ref={coin} position={[3.3, 2.75, .6]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[.3, .3, .06, 16]} /><meshStandardMaterial color="#f0b030" metalness={.8} roughness={.3} /></mesh>
    <Puppet type="pip" p={[-7.5, .6, 2.2]} s={.9} />
  </group>);
}
function Grey({ i }) {
  const active = useStory(s => s.page === i), g = useRef(0), blobs = useRef([]);
  const spec = useMemo(() => [[-8, 3, 1.4], [-3, 5.5, 1], [2.5, 2.4, 1.6], [7.5, 5, 1.2], [9, 2, .9], [-6, 6.5, .8]], []);
  useFrame((_, dt) => { g.current = THREE.MathUtils.clamp(g.current + (active ? dt : -dt) * .5, 0, 1); blobs.current.forEach((b, k) => b && b.scale.setScalar(Math.max(.001, g.current * (.6 + k * .12) * spec[k][2]))); });
  return (<group position={[i * PW, 0, 0]}>
    <Backdrop seed={4} />
    {[[-8, '#c9c2b0', '#6a5a52'], [-4.8, '#bdb6a6', '#5a5a62'], [5.3, '#c9c2b0', '#5a5256'], [8.6, '#bdb6a6', '#62585a']].map(([x, w, r], k) => <House key={k} p={[x, .6, -2.5 - (k % 2)]} wall={w} roof={r} />)}
    <Tower p={[-1.5, .6, -5]} />
    {spec.map(([x, y], k) => <group key={k} position={[x, y, 1.9 + k * .02]} ref={el => (blobs.current[k] = el)}><mesh><circleGeometry args={[1.2, 24]} /><meshBasicMaterial color="#15151c" transparent opacity={.85} /></mesh></group>)}
    <Puppet type="mochi" p={[-3, .6, 2.4]} /><Puppet type="slime" p={[3, .6, 2.4]} flip /><Puppet type="bot" p={[0, .6, 3.2]} s={.9} />
    {[-3, 3, 0].map((x, k) => <group key={k} position={[x, 0, k === 2 ? .8 : 0]}><Bubble y={2.8} icons="😶" /></group>)}
  </group>);
}
function Last({ i }) {
  const leaf = useRef();
  useFrame(({ clock }) => { if (leaf.current) { leaf.current.position.y = 3.6 + Math.sin(clock.elapsedTime * 2) * .2; leaf.current.rotation.y = Math.sin(clock.elapsedTime) * .4; } });
  return (<group position={[i * PW, 0, 0]}>
    <Backdrop seed={2} />
    <Puppet type="pip" p={[-1, .6, 2.6]} s={1.9} />
    <mesh ref={leaf} position={[2.6, 3.6, 3]} castShadow><planeGeometry args={[1.2, 1.6]} /><meshStandardMaterial color="#fff4d8" emissive="#ffd36e" emissiveIntensity={.9} side={THREE.DoubleSide} /></mesh>
    <Sparkles count={30} scale={[5, 4, 3]} position={[2.6, 3.6, 3]} size={5} color="#ffd36e" />
  </group>);
}

// ---------- chapter 1 ----------
function Toll({ i }) {
  const x = i * PW, S = useStory(s => s.step), loaf = useRef(), arm = useRef(), coins = useRef(), hop = useRef(0);
  const n = Math.min(S.loaf || 0, 3), open = !!S.lever, XS = [-8.5, -5.3, -1.9, 1.5], POSTS = [-4.4, -1, 2.4];
  const inst = useMemo(() => Array.from({ length: 24 }, (_, k) => ({ key: 'c' + k, position: [x + 9.4 + (k % 4) * .15, 1 + Math.floor(k / 4) * .16, .3], rotation: [Math.PI / 2, 0, 0] })), [x]);
  useFrame((_, dt) => {
    hop.current = Math.max(0, hop.current - dt * 2.2);
    const l = loaf.current; l.position.x += (XS[n] - l.position.x) * Math.min(1, dt * 5); l.position.y = .95 + Math.sin(hop.current * Math.PI) * 1.1; l.scale.setScalar(1 - n * .22);
    arm.current.rotation.z += ((open ? 1.35 : 0) - arm.current.rotation.z) * Math.min(1, dt * 4);
  });
  useEffect(() => { if (open && coins.current) coins.current.forEach(b => b.setLinvel({ x: -2 - Math.random() * 3, y: 5 + Math.random() * 4, z: Math.random() * 1.5 }, true)); }, [open]);
  const take = () => { if (n < 3) { st().bump('loaf'); hop.current = 1; pop(); } };
  const pull = () => { if (n >= 3 && !open) { st().bump('lever'); chime(); st().finish(i); } };
  return (<group position={[x, 0, 0]}>
    <Backdrop seed={3} /><House p={[-9.5, .6, -3]} wall="#cfd9b0" roof="#9a5a3a" /><House p={[9, .6, -4]} wall="#e3cfa8" roof="#7a5a4a" />
    <Puppet type="mochi" p={[-10, .6, 1.6]} />
    {POSTS.map((px, k) => <group key={k} position={[px, .6, 0]}>
      <Rect w={.45} h={2.4} color="#c0504d" /><Puppet type="bot" p={[.9, 0, .6]} s={.75} flip />{n > k && <Bubble y={2.9} icons="🪙" />}</group>)}
    <mesh ref={loaf} position={[XS[0], .95, 1.2]} castShadow onClick={take} {...hover}><capsuleGeometry args={[.4, .6, 6, 12]} /><meshStandardMaterial color="#d9a05b" roughness={.8} /></mesh>
    {n < 3 && <Tap p={[XS[n], 2.6, 1.2]} />}
    <Rect w={.5} h={2.4} color="#8a7a66" p={[5, .6, .1]} /><group ref={arm} position={[5, 2.5, .2]}><mesh position={[1.6, 0, 0]} castShadow><boxGeometry args={[3.2, .3, .3]} /><meshStandardMaterial color="#c0504d" /></mesh></group>
    <group position={[4, .6, .8]} onClick={pull} {...hover}><Rect w={.3} h={1.2} color="#7a5a3a" /><Disc r={.28} color="#f0b030" p={[0, 1.3, .1]} /></group>
    {n >= 3 && !open && <Tap p={[4, 2.8, .8]} />}
    <Rect w={1.5} h={.7} color="#7a5a3a" p={[9.4, .6, .3]} />
    <InstancedRigidBodies ref={coins} instances={inst} colliders="ball"><instancedMesh args={[undefined, undefined, 24]} castShadow><cylinderGeometry args={[.12, .12, .03, 12]} /><meshStandardMaterial color="#f0b030" metalness={.8} roughness={.3} /></instancedMesh></InstancedRigidBodies>
  </group>);
}
function Leaf({ p, base, onTake, show = true }) {
  const m = useRef(), mat = useRef(), [taken, setTaken] = useState(false);
  useFrame((_, dt) => {
    if (!m.current) return;
    if (taken) { m.current.position.x += (base + 9 - m.current.position.x) * Math.min(1, dt * 3); m.current.position.y += (9 - m.current.position.y) * Math.min(1, dt * 3); m.current.scale.setScalar(Math.max(.001, m.current.scale.x - dt * .9)); return; }
    const d = Math.hypot(ptr.wx - (base + p[0]), ptr.wy - p[1]); mat.current.emissiveIntensity = THREE.MathUtils.clamp(1.6 - d * .45, .08, 1.6);
  });
  if (!show) return null;
  return <mesh ref={m} position={[base + p[0], p[1], p[2] ?? 1.2]} rotation={[0, 0, .15]} castShadow {...hover} onClick={() => { if (!taken) { setTaken(true); onTake && onTake(); pop(); } }}>
    <planeGeometry args={[.9, 1.2]} /><meshStandardMaterial ref={mat} color="#fff4d8" emissive="#ffd36e" emissiveIntensity={.1} side={THREE.DoubleSide} /></mesh>;
}
function Archive({ i }) {
  const x = i * PW, active = useStory(s => s.page === i), light = useRef(), orb = useRef();
  useFrame(() => {
    if (light.current) { light.current.position.set(ptr.wx - x, ptr.wy, 2.8); light.current.intensity = active ? 40 : 0; }
    if (orb.current) { orb.current.position.set(ptr.wx - x, ptr.wy, 2.8); orb.current.visible = active; }
  });
  const take = () => { const S = st(); S.bump('found'); if ((S.step.found || 0) + 1 >= 3) S.finish(i); };
  return (<group position={[x, 0, 0]}>
    <Rect w={26} h={13} color="#4a3a30" p={[0, -1, -4]} />
    {[-7.5, -1.2, 5.2].map((sx, k) => <Shelf key={k} p={[sx, .6, -2]} w={6} h={5.6} seed={k + 3} />)}
    <Rect w={26} h={.8} color="#3a2c24" p={[0, -.2, .5]} />
    <Leaf p={[-7, 4.4]} base={0} onTake={take} /><Leaf p={[-.5, 3.2]} base={0} onTake={take} /><Leaf p={[6.2, 5.2]} base={0} onTake={take} />
    <pointLight ref={light} color="#ffcf80" distance={12} decay={2} />
    <mesh ref={orb}><sphereGeometry args={[.2, 12, 10]} /><meshBasicMaterial color="#ffe3a3" /></mesh>
    <Puppet type="pip" p={[-10, .6, 2.4]} s={.9} />
  </group>);
}
function Hat({ k, p }) {
  const r = useRef(), popped = useStory(s => !!s.step['hat' + k]);
  useEffect(() => { if (popped && r.current) { r.current.setLinvel({ x: rnd(-3, 3), y: rnd(3, 6.5), z: rnd(.5, 2.5) }, true); r.current.setAngvel({ x: rnd(-4, 4), y: rnd(-4, 4), z: rnd(-5, 5) }, true); pop(); } }, [popped]);
  return (<RigidBody ref={r} type={popped ? 'dynamic' : 'fixed'} position={p} colliders="hull" restitution={.3}>
    <mesh castShadow {...hover} onClick={() => !popped && st().bump('hat' + k)}><coneGeometry args={[.4, .55, 10]} /><meshStandardMaterial color="#3a3a46" roughness={.7} /></mesh>
    <mesh position={[0, -.28, 0]}><cylinderGeometry args={[.62, .62, .08, 14]} /><meshStandardMaterial color="#3a3a46" /></mesh>
  </RigidBody>);
}
function Hats({ i }) {
  const x = i * PW, count = useStory(s => Object.keys(s.step).filter(k => k.startsWith('hat')).length), cascade = useRef(false);
  useEffect(() => {
    if (count >= 8 && !cascade.current) { cascade.current = true; for (let k = 0; k < 40; k++) setTimeout(() => !st().step['hat' + k] && st().bump('hat' + k), 150 * k); }
    if (count >= 8) st().finish(i);
  }, [count]);
  return (<group position={[x, 0, 0]}>
    <Rect w={18} h={8} color="#c9b79a" p={[0, .6, -1]} />
    {Array.from({ length: 40 }, (_, k) => <Hat key={k} k={k} p={[x - 5.6 + (k % 8) * 1.6, 1.9 + Math.floor(k / 8) * 1.25, .3]} />)}
    {count === 0 && <Tap p={[-5.6, 3.4, 1]} />}
    {count >= 40 && <Bubble y={7} icons="👻" />}
    <Puppet type="pip" p={[-10, .6, 2.4]} s={.9} />
  </group>);
}
const CT = [3, 1, 2], CCOL = [-5, 0, 5];
function CountPage({ k, done }) {
  const m = useRef();
  useFrame((_, dt) => { const tx = done ? CCOL[k] : -3 + k * 3, ty = done ? 4.6 : 1.6; m.current.position.x += (tx - m.current.position.x) * Math.min(1, dt * 4); m.current.position.y += (ty - m.current.position.y) * Math.min(1, dt * 4); });
  return <group ref={m} position={[-3 + k * 3, 1.6, 1.4]} {...hover} onClick={() => { if (!done) { st().bump('fix' + k); pop(); } }}>
    <mesh castShadow><planeGeometry args={[1.1, 1.5]} /><meshStandardMaterial color="#fff4d8" emissive="#ffd36e" emissiveIntensity={.5} side={THREE.DoubleSide} /></mesh>
    <Html position={[0, 0, .1]} center style={{ pointerEvents: 'none' }}><div className="pips">{'●'.repeat(CT[k])}</div></Html></group>;
}
function Counting({ i }) {
  const x = i * PW, S = useStory(s => s.step), F = [9, 7, 8];
  const fixedN = [0, 1, 2].filter(k => S['fix' + k]).length;
  useEffect(() => { if (fixedN >= 3) { chime(); st().finish(i); } }, [fixedN]);
  return (<group position={[x, 0, 0]}>
    <Rect w={26} h={13} color="#d9c2a0" p={[0, -1, -4]} />
    <Rect w={16} h={6.5} color={fixedN >= 3 ? '#dbeccf' : '#efe2c4'} p={[0, 2.4, -1]} emissive={fixedN >= 3 ? .3 : 0} />
    {CCOL.map((cx, k) => <Html key={k} position={[cx, 6.4, -.6]} center style={{ pointerEvents: 'none' }}><div className={'pips ' + (S['fix' + k] ? 'ok' : 'bad')}>{'🪙'.repeat(S['fix' + k] ? CT[k] : F[k])}</div></Html>)}
    <Rect w={12} h={.5} color="#7a5a3a" p={[0, .8, 1]} />
    {[0, 1, 2].map(k => <CountPage key={k} k={k} done={!!S['fix' + k]} />)}
    {fixedN === 0 && <Tap p={[-3, 3, 1.4]} />}
    <Puppet type="mochi" p={[-10, .6, 2.4]} s={.9} />
  </group>);
}
function Square({ i }) {
  const x = i * PW, stamp = useStory(s => s.stamp), crank = useStory(s => !!s.step.crank), gears = useStory(s => s.gears), hands = useRef(), gear = useRef(), wheel = useRef(), hold = useRef(false), prog = useRef(0), stampY = useRef([0, 0]);
  const n = stamp === 'numbers' ? 14 : stamp ? 5 : 0, TYPES = ['mochi', 'slime', 'bot', 'pip'];
  useEffect(() => { const up = () => { hold.current = false; }; addEventListener('pointerup', up); return () => removeEventListener('pointerup', up); }, []);
  useFrame((_, dt) => {
    if (hold.current && !gears && crank) { prog.current += dt / 2.2; wheel.current.rotation.z -= dt * 7; if (prog.current >= 1) { useStory.setState({ gears: 1 }); chime(); st().finish(i, 14); } }
    if (gears && gear.current) { gear.current.position.y = Math.max(3.6, gear.current.position.y - dt * 6); gear.current.rotation.z += dt * 2; hands.current.rotation.z -= dt * .8; }
  });
  const pick = kind => { if (stamp) return; useStory.setState({ stamp: kind }); pop(); setTimeout(() => st().bump('crank'), 2600); };
  return (<group position={[x, 0, 0]}>
    <Backdrop seed={5} />
    <Rect w={3} h={8} color="#c9b08a" p={[8.5, .6, -1.5]} /><Disc r={1.1} color="#fff4d8" p={[8.5, 7, -1.3]} />
    <group ref={hands} position={[8.5, 7, -1.1]}><Rect w={.12} h={.9} color="#3a3a46" /></group>
    <Disc r={.32} color="#6b5f52" p={[8.5, 3.6, -1.3]} />
    <group ref={gear} position={[8.5, 10, -1.2]} visible={gears > 0}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.32, .32, .12, 10]} /><meshStandardMaterial color="#f0b030" emissive="#f0b030" emissiveIntensity={.5} /></mesh></group>
    <Rect w={5} h={3.6} color="#a87a4a" p={[2.4, 1.6, -1.2]} />
    {stamp && [0, 1, 2].map(k => <Rect key={k} w={.9} h={1.2} color="#fff4d8" p={[1 + k * 1.4, 2.4, -1.05]} shadow={false} />)}
    {[[-8.5, 'numbers', '🔢'], [-6, 'portrait', '🔢🧑']].map(([sx, kind, icon], k) => <group key={k} position={[sx, .6, 1.5]} onClick={() => pick(kind)} {...hover}>
      <Rect w={1.4} h={1} color="#c9b79a" /><mesh position={[0, 1.4, 0]} castShadow><boxGeometry args={[.9, .5, .9]} /><meshStandardMaterial color="#c0504d" /></mesh>
      <Html position={[0, 2.5, 0]} center style={{ pointerEvents: 'none' }}><div className="bub">{icon}</div></Html></group>)}
    {!stamp && <Tap p={[-8.5, 3.4, 1.5]} />}
    {Array.from({ length: n }, (_, k) => <Walker key={k} k={k} n={n} type={TYPES[k % 4]} />)}
    {stamp && crank && !gears && <group position={[5.6, 1.9, 1]} onPointerDown={() => { hold.current = true; }} {...hover}>
      <group ref={wheel}><Disc r={.8} color="#7a5a3a" /><mesh position={[.55, 0, .2]}><sphereGeometry args={[.18, 10, 8]} /><meshStandardMaterial color="#f0b030" /></mesh></group></group>}
    {stamp && crank && !gears && <Tap p={[5.6, 3.6, 1]} />}
    {gears > 0 && <Sparkles count={50} scale={[6, 7, 3]} position={[6, 5, 1]} size={5} color="#ffd36e" />}
  </group>);
}
function Walker({ k, n, type }) {
  const g = useRef(), tx = 2.4 + (k - (n - 1) / 2) * .62, tz = 2.4 + (k % 2) * .7;
  useFrame(({ clock }, dt) => { const t = clock.elapsedTime - k * .18 - 2.8; if (t < 0) return; g.current.position.x += (tx - g.current.position.x) * Math.min(1, dt * 1.6); g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 3 + k)) * .05; });
  return <group ref={g} position={[-11 - k * .3, 0, tz]}><Puppet type={type} p={[0, .6, 0]} s={.6} /></group>;
}
export const PAGE_VIEWS = [Honest, Changed, Grey, Last, Toll, Archive, Hats, Counting, Square];
