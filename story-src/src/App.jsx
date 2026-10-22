import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KeyboardControls, PerformanceMonitor, AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { playerPos, useStory } from './state';
import { Sky, skyColors } from './Sky';
import { Prologue } from './Prologue';
import { Ashmarket } from './Ashmarket';
import { Effects } from './Effects';
import { UI } from './UI';

const KEYS = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] }, { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] }, { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] }, { name: 'interact', keys: ['KeyE'] },
  { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] }, { name: 'camL', keys: ['KeyQ'] }, { name: 'camR', keys: ['KeyR'] },
];
const WARM = new THREE.Color('#fff1cf'), DIM = new THREE.Color('#b8bcbf'), LDIR = new THREE.Vector3(.55, .7, .15).normalize();
function Atmosphere() {
  const L = useRef(), lite = useStory(s => s.lite), scene = useStory(s => s.scene);
  useFrame((state, dt) => {
    const t = useStory.getState().trust / 100, k = 1 - Math.exp(-dt * 2), sc = state.scene;
    sc.fog = sc.fog || new THREE.Fog('#9aa0a4', 25, 140);           // aerial perspective: the haze matches the sky's horizon
    sc.fog.color.lerp(skyColors(t).hor, k);
    sc.fog.near += (25 + t * 40 - sc.fog.near) * k; sc.fog.far += (140 + t * 320 - sc.fog.far) * k;
    const l = L.current; if (!l) return;
    const px = scene === 'ashmarket' ? playerPos.x : 0, pz = scene === 'ashmarket' ? playerPos.z : 0;   // shadows follow the player
    l.position.set(px + LDIR.x * 30, LDIR.y * 30, pz + LDIR.z * 30); l.target.position.set(px, 0, pz); l.target.updateMatrixWorld();
    l.color.copy(DIM).lerp(WARM, t); l.intensity = .9 + t * 1.4;
  });
  return (<>
    <Sky />
    <hemisphereLight args={['#cfe3ff', '#8a7a6a', .55]} />
    <directionalLight ref={L} castShadow={!lite} shadow-mapSize={[2048, 2048]} shadow-bias={-.0004}
      shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-near={1} shadow-camera-far={90} />
    <Environment resolution={128} environmentIntensity={.6}>
      <Lightformer intensity={2.2} position={[0, 8, -12]} scale={[18, 8, 1]} />
      <Lightformer intensity={1} position={[-8, 3, 6]} scale={[6, 6, 1]} />
    </Environment>
  </>);
}
export default function App() {
  const scene = useStory(s => s.scene), lite = useStory(s => s.lite);
  useEffect(() => { document.title = 'The Long Spring · Story mode'; }, []);
  return (
    <>
      <KeyboardControls map={KEYS}>
        <Canvas shadows={!lite} flat dpr={[1, lite ? 1 : 1.75]} camera={{ fov: 55, position: [12, 7, 15], far: 1500 }} gl={{ antialias: !!lite }}>
          <PerformanceMonitor onDecline={() => useStory.setState({ lite: true })} />
          <AdaptiveDpr pixelated={false} />
          <Suspense fallback={null}>
            <Atmosphere />
            {scene === 'prologue' && <Prologue />}
            {scene === 'ashmarket' && <Physics gravity={[0, -20, 0]}><Ashmarket /></Physics>}
          </Suspense>
          {!lite && <Effects />}
        </Canvas>
      </KeyboardControls>
      <UI />
    </>
  );
}
