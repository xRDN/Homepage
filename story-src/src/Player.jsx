import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Buddy } from './Buddy';
import { avatar, playerPos, useStory } from './state';
import { ripple } from './ripples';
import { height } from './world';

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const tmp = new THREE.Vector3();
export function Player({ start = [0, 1.5, 52] }) {
  const body = useRef(), model = useRef(), yaw = useRef(Math.PI), acc = useRef(0), wet = useRef(false), safe = useRef(new THREE.Vector3(0, 2, 52));
  const [, get] = useKeyboardControls();
  useFrame(({ camera }, dt) => {
    const b = body.current; if (!b) return;
    const s = useStory.getState(), busy = s.ended, k = get(), v = b.linvel();
    let mx = busy ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0), mz = busy ? 0 : (k.back ? 1 : 0) - (k.forward ? 1 : 0);
    const l = Math.hypot(mx, mz), sp = (s.slow > 0 ? 2 : 5) * (b.translation().y < -.2 ? .6 : 1);            // ink pools slow you down
    if (l > 0) { mx /= l; mz /= l; yaw.current += wrap(Math.atan2(mx, mz) - yaw.current) * Math.min(1, dt * 12); useStory.setState({ last: performance.now() }); }
    const jump = !busy && k.jump && Math.abs(v.y) < .1;
    b.setLinvel({ x: mx * sp, y: jump ? 8 : v.y, z: mz * sp }, true);
    const p = b.translation();
    const over = height(p.x, p.z) < -1.2;                                  // over open water (bridge decks, or swimming)
    if (over && p.y > -.5 && l > 0 && (acc.current += dt) > .3) { acc.current = 0; ripple(p.x, p.z, .07); }
    if (!over && p.y > -.2) safe.current.set(p.x, p.y + .6, p.z);
    if (p.y < -.4 && !wet.current) { wet.current = true; ripple(p.x, p.z, .35); }
    if (p.y > -.2) wet.current = false;
    if (p.y < -2.2) { b.setTranslation(safe.current, true); b.setLinvel({ x: 0, y: 0, z: 0 }, true); }   // fell in: back to the last dry spot
    playerPos.set(p.x, p.y, p.z);
    model.current.rotation.y = yaw.current;
    camera.position.lerp(tmp.set(p.x, p.y + 7, p.z + 9), 1 - Math.exp(-dt * 5));
    camera.lookAt(p.x, p.y + 1, p.z);
  });
  return (
    <RigidBody ref={body} name="player" position={start} lockRotations colliders={false} friction={0}>
      <CapsuleCollider args={[.35, .4]} position={[0, .75, 0]} />
      <group ref={model}><Buddy type={avatar} /></group>
    </RigidBody>
  );
}
export function useInteract(fn) {
  const [sub] = useKeyboardControls();
  useEffect(() => sub(s => s.interact, p => { if (p) fn(); }), [sub, fn]);
}
