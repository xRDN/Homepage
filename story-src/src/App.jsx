import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KeyboardControls, PerformanceMonitor, AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { playerPos, useStory } from './state';
import { Prologue } from './Prologue';
import { Ashmarket } from './Ashmarket';
import { Effects } from './Effects';
import { UI } from './UI';

const KEYS = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] }, { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] }, { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] }, { name: 'interact', keys: ['KeyE'] },
];
const GREY = new THREE.Color('#8a9094'), SKY = new THREE.Color('#8ecdf0'), WARM = new THREE.Color('#fff1cf'), DIM = new THREE.Color('#b8bcbf');
function Atmosphere() {
  const L = useRef(), lite = useStory(s => s.lite), scene = useStory(s => s.scene);
  useFrame((state, dt) => {
    const t = useStory.getState().trust / 100, k = 1 - Math.exp(-dt * 2), sc = state.scene;
    const c = GREY.clone().lerp(SKY, t);
    sc.background = sc.background || new THREE.Color();
    sc.background.lerp(c, k);
    sc.fog = sc.fog || new THREE.Fog(c, 12, 40);
    sc.fog.color.copy(sc.background); sc.fog.near += (14 + t * 22 - sc.fog.near) * k; sc.fog.far += (48 + t * 50 - sc.fog.far) * k;
    const l = L.current; if (!l) return;
    const px = scene === 'ashmarket' ? playerPos.x : 0, pz = scene === 'ashmarket' ? playerPos.z : 0;   // shadows follow the player
    l.position.set(px + 12, 22, pz + 8); l.target.position.set(px, 0, pz); l.target.updateMatrixWorld();
    l.color.copy(DIM).lerp(WARM, t); l.intensity = .9 + t * 1.3;
  });
  return (<>
    <hemisphereLight args={['#cfe3ff', '#8a7a6a', .55]} />
    <directionalLight ref={L} castShadow={!lite} shadow-mapSize={[2048, 2048]} shadow-bias={-.0004}
      shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={26} shadow-camera-bottom={-26} shadow-camera-near={1} shadow-camera-far={70} />
    <Environment resolution={128} environmentIntensity={.5}>
      <Lightformer intensity={2} position={[0, 6, -9]} scale={[14, 6, 1]} />
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
        <Canvas shadows={!lite} flat dpr={[1, lite ? 1 : 1.75]} camera={{ fov: 55, position: [12, 7, 15] }} gl={{ antialias: !!lite }}>
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
