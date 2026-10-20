import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { Buddy } from './Buddy';
import { camState, useStory, talk } from './state';
import { playCutscene } from './cutscene';

const INTRO = { length: 5, keys: { px: [[0, 12], [5, 6]], py: [[0, 7], [5, 3]], pz: [[0, 15], [5, 9]], lx: [[0, 0], [5, 0]], ly: [[0, 1], [5, 1.2]], lz: [[0, 0], [5, 0]] } };
const SAIL = { length: 4, keys: { px: [[0, 6], [4, 14]], py: [[0, 3], [4, 9]], pz: [[0, 9], [4, 24]], lx: [[0, 0], [4, 6]], ly: [[0, 1.2], [4, 1]], lz: [[0, 0], [4, 10]] } };

export function Prologue() {
  const tide = useRef(), boat = useRef(), started = useRef(false);
  useEffect(() => {
    if (started.current) return; started.current = true;
    (async () => {
      const S = useStory.getState();
      await playCutscene('intro', INTRO);
      await talk([
        { who: 'Pip', text: 'Sprout! You made it. Listen closely, my memory is… patchy.' },
        { who: 'Pip', text: 'Verdane’s Ledger is rotting. Someone changed the numbers, then someone changed the people who check the numbers.' },
        { who: 'Pip', text: 'This seed is the last honest thing I could carry out. We must plant it where the Ledger began: Ashmarket.' },
      ]);
      useStory.setState({ tide: 1, trust: 15 });
      await talk([
        { who: '', text: 'A grey tide creeps up the shore. The colours of the island begin to fade.' },
        { who: 'Pip', text: 'It’s here already. Quick, the boat!' },
      ]);
      await playCutscene('sail', SAIL);
      S.addTrust(0);
      useStory.setState({ scene: 'ashmarket', trust: 10 });
    })();
  }, []);
  useFrame((s, dt) => {
    s.camera.position.copy(camState.pos); s.camera.lookAt(camState.look);
    const T = useStory.getState().tide;
    if (tide.current) { const k = tide.current.scale.x + (T * 1.3 + .2 - tide.current.scale.x) * Math.min(1, dt * .8); tide.current.scale.set(k, k, k); }
    if (boat.current) boat.current.position.x = 4.6 + camState.prog * (useStory.getState().tide ? 9 : 0);
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.6, 0]}><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#5aa6d6" roughness={.3} /></mesh>
      <mesh position={[0, -.5, 0]}><cylinderGeometry args={[5, 5, 1, 48]} /><meshStandardMaterial color="#8fcf6b" roughness={.9} /></mesh>
      <mesh position={[0, -2, 0]}><cylinderGeometry args={[5.1, 3, 2, 48]} /><meshStandardMaterial color="#c79a6b" roughness={.95} /></mesh>
      <mesh position={[-2, .6, -1]}><cylinderGeometry args={[.2, .28, 1.2, 10]} /><meshStandardMaterial color="#8a6444" /></mesh>
      <mesh position={[-2, 1.9, -1]}><sphereGeometry args={[1.2, 20, 14]} /><meshStandardMaterial color="#58b04d" /></mesh>
      <Float speed={2} floatIntensity={.4}><mesh position={[1.2, 1.6, -1.5]}><sphereGeometry args={[.22, 16, 12]} /><meshStandardMaterial color="#f0b030" emissive="#f0b030" emissiveIntensity={.8} /></mesh></Float>
      <Sparkles count={30} scale={[8, 3, 8]} position={[0, 2, 0]} size={3} color="#ffd36e" />
      <group position={[1, 0, 1.6]} rotation={[0, -.5, 0]}><Buddy type="pip" /></group>
      <mesh ref={boat} position={[4.6, .1, 3]} rotation={[0, .4, 0]}><boxGeometry args={[1.8, .5, .9]} /><meshStandardMaterial color="#a87a4a" /></mesh>
      <mesh ref={tide} position={[0, .05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[.2, .2, .2]}>
        <ringGeometry args={[6, 20, 64]} /><meshBasicMaterial color="#6b7276" transparent opacity={.75} />
      </mesh>
      <ambientLight intensity={.8} /><directionalLight position={[8, 12, 6]} intensity={1.6} />
    </group>
  );
}
