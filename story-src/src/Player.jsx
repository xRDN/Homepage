import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Buddy } from './Buddy';
import { avatar, playerPos, useStory } from './state';

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const tmp = new THREE.Vector3();
export function Player({ start = [0, 1.5, 14] }) {
  const body = useRef(), model = useRef(), yaw = useRef(Math.PI);
  const [, get] = useKeyboardControls();
  useFrame(({ camera }, dt) => {
    const b = body.current; if (!b) return;
    const s = useStory.getState(), busy = s.dialog || s.choice || s.ended, k = get(), v = b.linvel();
    let mx = busy ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0), mz = busy ? 0 : (k.back ? 1 : 0) - (k.forward ? 1 : 0);
    const l = Math.hypot(mx, mz);
    if (l > 0) { mx /= l; mz /= l; yaw.current += wrap(Math.atan2(mx, mz) - yaw.current) * Math.min(1, dt * 12); }
    const jump = !busy && k.jump && Math.abs(v.y) < .1;
    b.setLinvel({ x: mx * 5, y: jump ? 8 : v.y, z: mz * 5 }, true);
    const p = b.translation();
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
