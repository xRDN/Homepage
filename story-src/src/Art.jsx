import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material';
import { Buddy } from './Buddy';
import { chirp } from './audio';
import { ptr, vis } from './state';
import { now, ripBuf, ripple } from './ripples';

export const PW = 22;                                   // distance between pages
const clamp = THREE.MathUtils.clamp;
export const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rectPts = (w, h) => [[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
const circPts = (r, n = 22) => Array.from({ length: n }, (_, k) => [Math.cos(k / n * 6.2832) * r, Math.sin(k / n * 6.2832) * r]);

// Cut-paper primitive: a flat shape with a little thickness so layers cast soft shadows on the layers behind.
export function Poly({ pts, color, p = [0, 0, 0], depth = .08, emissive = 0, shadow = true, onClick, opacity }) {
  const geo = useMemo(() => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false }), [pts, depth]);
  return <mesh geometry={geo} position={p} castShadow={shadow} receiveShadow onClick={onClick}>
    <meshStandardMaterial color={color} roughness={1} emissive={color} emissiveIntensity={emissive} transparent={opacity != null} opacity={opacity ?? 1} /></mesh>;
}
export function Rect({ w, h, ...r }) { const pts = useMemo(() => rectPts(w, h), [w, h]); return <Poly pts={pts} {...r} />; }
export function Disc({ r, ...o }) { const pts = useMemo(() => circPts(r), [r]); return <Poly pts={pts} {...o} />; }
export function Hills({ z = -6, w = 50, base = 2, amp = 1.2, color = '#8bbf6a', seed = 1 }) {
  const pts = useMemo(() => { const a = []; for (let i = 0; i <= 50; i++) { const t = i / 50; a.push([-w / 2 + t * w, base + Math.sin(t * 9 + seed) * amp + Math.sin(t * 23 + seed * 3) * amp * .3]); } a.push([w / 2, -8], [-w / 2, -8]); return a; }, [w, base, amp, seed]);
  return <Poly pts={pts} color={color} p={[0, 0, z]} depth={.15} />;
}
export function Cloud({ p, s = 1 }) {
  return <group position={p} scale={s}>{[[-1, 0, 1], [0, .4, 1.3], [1.1, 0, 1], [2, -.1, .7]].map(([x, y, r], k) =>
    <mesh key={k} position={[x, y, 0]}><circleGeometry args={[r * .9, 20]} /><meshBasicMaterial color="#fff" transparent opacity={.92} fog={false} /></mesh>)}</group>;
}
export function House({ p, w = 2.8, h = 2.4, wall = '#e3cfa8', roof = '#b5523b' }) {
  const tri = useMemo(() => [[-w / 2 - .3, 0], [w / 2 + .3, 0], [0, h * .6]], [w, h]);
  return (<group position={p}>
    <Rect w={w} h={h} color={wall} /><Poly pts={tri} color={roof} p={[0, h, .02]} />
    <Rect w={.7} h={1.2} color="#6b4a35" p={[0, 0, .09]} shadow={false} />
    <Rect w={.6} h={.6} color="#ffe3a3" emissive={.6} p={[-w * .28, h * .55, .09]} shadow={false} /><Rect w={.6} h={.6} color="#ffe3a3" emissive={.6} p={[w * .28, h * .55, .09]} shadow={false} />
  </group>);
}
export function Tree({ p, s = 1, c = '#5f9f4a' }) {
  return <group position={p} scale={s}><Rect w={.3} h={1.2} color="#6b4a35" /><Disc r={1.1} color={c} p={[0, 2, .04]} /><Disc r={.8} color={c} p={[.6, 2.6, .08]} /></group>;
}
export function Tower({ p }) {
  const tri = useMemo(() => [[-1.4, 0], [1.4, 0], [0, 1.8]], []);
  return <group position={p}><Rect w={2.2} h={6} color="#c9b08a" /><Poly pts={tri} color="#8b4a3a" p={[0, 6, .02]} /><Disc r={.8} color="#fff4d8" p={[0, 4.4, .1]} /></group>;
}
export function BookArt({ p, s = 1, glow }) {
  return (<group position={p} scale={s}>
    {[-1, 1].map(k => <mesh key={k} position={[k * .85, .1, 0]} rotation={[-.35, k * -.18, k * .06]} castShadow><boxGeometry args={[1.6, .12, 2]} /><meshStandardMaterial color="#fff4d8" emissive="#ffd36e" emissiveIntensity={glow ? .5 : 0} /></mesh>)}
    <mesh position={[0, -.05, 0]}><boxGeometry args={[3.5, .1, 2.2]} /><meshStandardMaterial color="#8a4a3a" /></mesh>
  </group>);
}
export function Shelf({ p, w = 6, h = 5, seed = 1 }) {
  const books = useMemo(() => { const r = mulberry(seed), out = []; for (let row = 0; row < 3; row++) { let x = -w / 2 + .2; while (x < w / 2 - .3) { const bw = .25 + r() * .25, bh = .8 + r() * .4; out.push([x + bw / 2, .25 + row * h / 3.1, bw, bh, ['#7a4a3a', '#4a6a7a', '#8a7a3a', '#5a4a6a'][Math.floor(r() * 4)]]); x += bw + .03; } } return out; }, [w, h, seed]);
  return <group position={p}><Rect w={w} h={h} color="#6b4a35" />{books.map(([x, y, bw, bh, c], k) => <Rect key={k} w={bw} h={bh} color={c} p={[x, y, .1]} shadow={false} />)}</group>;
}
export const Tap = ({ p }) => <group position={p}><Html center style={{ pointerEvents: 'none' }}><div className="bub tap">👆</div></Html></group>;
const pointer = on => () => { document.body.style.cursor = on ? 'pointer' : ''; };
export const hover = { onPointerOver: pointer(true), onPointerOut: pointer(false) };

// A puppet in the Live2D spirit: it breathes, blinks, turns its head toward your cursor and hops when poked.
export function Puppet({ type = 'slime', p = [0, 0, 0], s = 1, flip = false, onClick }) {
  const body = useRef(), eyes = useRef([]), hop = useRef(0), blink = useRef({ t: 2 + Math.random() * 3, v: 0 }), off = useMemo(() => Math.random() * 6, []);
  useEffect(() => { eyes.current = []; body.current.traverse(o => o.userData && o.userData.eye && eyes.current.push(o)); }, [type]);
  useFrame(({ clock }, dt) => {
    const b = body.current; if (!b) return; const t = clock.elapsedTime + off;
    const lx = clamp((ptr.wx - p[0]) * .05, -.5, .5), ly = clamp((ptr.wy - p[1] - 1) * .04, -.25, .25), base = flip ? -.45 : .45;
    b.rotation.y += (base + lx - b.rotation.y) * Math.min(1, dt * 6); b.rotation.x += (-ly - b.rotation.x) * Math.min(1, dt * 6);
    b.scale.set(1 - Math.sin(t * 2.2) * .015, 1 + Math.sin(t * 2.2) * .03, 1);
    hop.current = Math.max(0, hop.current - dt * 2); b.position.y = Math.sin(hop.current * Math.PI) * .9;
    const k = blink.current; k.t -= dt; if (k.t < 0) { k.v = 1; k.t = 2 + Math.random() * 3; } k.v = Math.max(0, k.v - dt * 7);
    eyes.current.forEach(e => { e.scale.y = 1 - k.v * .9; });
  });
  return <group position={p} scale={s} onClick={e => { e.stopPropagation(); hop.current = 1; chirp(1); onClick && onClick(e); }} {...hover}><group ref={body}><Buddy type={type} /></group></group>;
}

// Paper river along the front of every page: ripples follow the cursor and clicks (ring buffer in ripples.js).
const vs = `uniform float uTime; uniform vec4 uRip[16]; varying vec2 vW; varying float vH;
float H(vec2 p){ float h = sin(p.x*.5+uTime*.8)*.03 + sin(p.y*.9-uTime*.6)*.03;
  for(int i=0;i<16;i++){ vec4 r=uRip[i]; float age=uTime-r.z; if(age<0.||age>5.) continue;
    float d=distance(p,r.xy), rad=age*3.5, w=exp(-pow((d-rad)*.9,2.)); h += sin((d-rad)*6.)*w*r.w*exp(-age*.7)/(1.+d*.15); } return h; }
void main(){ vec2 p = position.xz; float h = H(p); vW = p; vH = h; float e = .25;
  csm_Normal = normalize(vec3(-(H(p+vec2(e,0.))-H(p-vec2(e,0.)))/(2.*e), 1., -(H(p+vec2(0.,e))-H(p-vec2(0.,e)))/(2.*e)));
  csm_Position = position + vec3(0., h, 0.); }`;
const fs = `uniform float uTrust; varying vec2 vW; varying float vH;
void main(){ float k = smoothstep(1., 15., vW.y);
  vec3 far = mix(vec3(.30,.36,.40), vec3(.14,.50,.70), uTrust), near = mix(vec3(.55,.62,.60), vec3(.38,.78,.82), uTrust);
  vec3 col = mix(far, near, k); col = mix(col, vec3(1.), smoothstep(.04,.2,vH)*.35);
  csm_DiffuseColor = vec4(col, .93); }`;
export function PaperWater() {
  const m = useRef();
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(300, 14, 300, 28); g.rotateX(-Math.PI / 2); g.translate(90, 0, 8); return g; }, []);
  const u = useMemo(() => ({ uTime: { value: 0 }, uTrust: { value: 0 }, uRip: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, -100, 0)) } }), []);
  const amb = useRef(0);
  useFrame((_, dt) => {
    const x = m.current && m.current.uniforms; if (!x) return;
    x.uTime.value = now(); x.uTrust.value = vis.trust; ripBuf.forEach((r, i) => x.uRip.value[i].set(r[0], r[1], r[2], r[3]));
    if ((amb.current -= dt) < 0) { amb.current = .8 + Math.random(); ripple(ptr.wx + (Math.random() - .5) * 18, 3 + Math.random() * 10, .04); }
  });
  return <mesh geometry={geo} position={[0, .15, 0]} receiveShadow>
    <CustomShaderMaterial ref={m} baseMaterial={THREE.MeshPhysicalMaterial} vertexShader={vs} fragmentShader={fs} uniforms={u} roughness={.08} clearcoat={1} transparent /></mesh>;
}
