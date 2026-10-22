import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor, AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { rig, useStory, vis } from './state';
import { Sky, skyColors } from './Sky';
import { Book } from './Book';
import { Effects } from './Effects';
import { UI } from './UI';

const WARM = new THREE.Color('#fff1cf'), DIM = new THREE.Color('#b8bcbf');
// The sky, fog and key light from the 3D game, reused behind the paper layers. A soft key light from the front-left
// gives the cut-paper layers their shadows; `dark` dims it for the archive.
function Atmosphere() {
  const L = useRef(), H = useRef(), lite = useStory(s => s.lite);
  useFrame(state => {
    const t = vis.trust, sc = state.scene;
    sc.fog = sc.fog || new THREE.Fog('#9aa0a4', 40, 200);
    sc.fog.color.copy(skyColors(t).hor); sc.fog.near = 40; sc.fog.far = 140 + t * 280;
    const l = L.current; if (!l) return;
    l.position.set(rig.x - 7, 12, 14); l.target.position.set(rig.x, 3, 0); l.target.updateMatrixWorld();
    l.color.copy(DIM).lerp(WARM, t); l.intensity = (.8 + t * 1.2) * (1 - vis.dark * .9);
    if (H.current) H.current.intensity = (.6 + t * .2) * (1 - vis.dark * .85);
  });
  return (<>
    <Sky />
    <hemisphereLight ref={H} args={['#cfe3ff', '#8a7a6a', .6]} />
    <directionalLight ref={L} castShadow={!lite} shadow-mapSize={[2048, 2048]} shadow-bias={-.0005}
      shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={11} shadow-camera-bottom={-5} shadow-camera-near={1} shadow-camera-far={50} />
    <Environment resolution={64} environmentIntensity={.35}><Lightformer intensity={2} position={[0, 8, 10]} scale={[18, 6, 1]} /></Environment>
  </>);
}
export default function App() {
  const lite = useStory(s => s.lite);
  useEffect(() => { document.title = 'The Long Spring · Story mode'; }, []);
  return (
    <>
      <Canvas shadows={!lite} flat dpr={[1, lite ? 1 : 1.75]} camera={{ fov: 38, position: [0, 3.8, 17], far: 1500 }} gl={{ antialias: !!lite }}>
        <PerformanceMonitor onDecline={() => useStory.setState({ lite: true })} />
        <AdaptiveDpr pixelated={false} />
        <Suspense fallback={null}><Atmosphere /><Book /></Suspense>
        {!lite && <Effects />}
      </Canvas>
      <UI />
    </>
  );
}
