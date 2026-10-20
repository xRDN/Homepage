import { Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KeyboardControls, PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import { useStory } from './state';
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
  useFrame(({ scene, gl }, dt) => {
    const t = useStory.getState().trust / 100, k = 1 - Math.exp(-dt * 2);
    const c = GREY.clone().lerp(SKY, t);
    scene.background = scene.background || new THREE.Color();
    scene.background.lerp(c, k);
    scene.fog = scene.fog || new THREE.Fog(c, 12, 40);
    scene.fog.color.copy(scene.background); scene.fog.near += (12 + t * 20 - scene.fog.near) * k; scene.fog.far += (40 + t * 45 - scene.fog.far) * k;
  });
  const t = useStory(s => s.trust) / 100;
  return (<>
    <ambientLight intensity={.5 + t * .4} />
    <directionalLight position={[10, 15, 8]} intensity={.9 + t * .9} color={DIM.clone().lerp(WARM, t)} />
  </>);
}
export default function App() {
  const scene = useStory(s => s.scene), lite = useStory(s => s.lite);
  useEffect(() => { document.title = 'The Long Spring · Story mode'; }, []);
  return (
    <>
      <KeyboardControls map={KEYS}>
        <Canvas dpr={[1, lite ? 1 : 1.75]} camera={{ fov: 55, position: [12, 7, 15] }} gl={{ antialias: !lite }}>
          <PerformanceMonitor onDecline={() => useStory.setState({ lite: true })} />
          <AdaptiveDpr pixelated={false} />
          <Atmosphere />
          <Suspense fallback={null}>
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
