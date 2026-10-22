import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { Buddy } from './Buddy';
import { avatar, camRig, playerPos, useStory } from './state';
import { ripple } from './ripples';
import { height } from './world';

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const tmp = new THREE.Vector3();
export function Player({ start = [0, 1.5, 52] }) {
  const body = useRef(), model = useRef(), face = useRef(Math.PI), acc = useRef(0), wet = useRef(false), safe = useRef(new THREE.Vector3(0, 2, 52));
  const air = useRef({ ground: 0, buf: -9, prev: false }), gl = useThree(s => s.gl);
  const [, get] = useKeyboardControls();
  useEffect(() => {                                              // drag to orbit, wheel to zoom
    const el = gl.domElement; let drag = null;
    const down = e => { drag = { x: e.clientX, y: e.clientY }; };
    const move = e => { if (!drag) return; camRig.yaw -= (e.clientX - drag.x) * .005; camRig.pitch = clamp(camRig.pitch + (e.clientY - drag.y) * .004, .25, 1.25); drag = { x: e.clientX, y: e.clientY }; };
    const up = () => { drag = null; }, wheel = e => { camRig.dist = clamp(camRig.dist + e.deltaY * .01, 6, 18); };
    el.addEventListener('pointerdown', down); addEventListener('pointermove', move); addEventListener('pointerup', up); el.addEventListener('wheel', wheel, { passive: true });
    return () => { el.removeEventListener('pointerdown', down); removeEventListener('pointermove', move); removeEventListener('pointerup', up); el.removeEventListener('wheel', wheel); };
  }, [gl]);
  useFrame(({ camera, clock }, dt) => {
    const b = body.current; if (!b) return;
    const s = useStory.getState(), busy = s.ended, k = get(), v = b.linvel(), t = clock.elapsedTime, A = air.current;
    if (!busy) camRig.yaw += ((k.camL ? 1 : 0) - (k.camR ? 1 : 0)) * dt * 1.8;
    const sy = Math.sin(camRig.yaw), cy = Math.cos(camRig.yaw);
    const ix = busy ? 0 : (k.right ? 1 : 0) - (k.left ? 1 : 0), iz = busy ? 0 : (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    let mx = cy * ix - sy * iz, mz = -sy * ix - cy * iz;          // movement is relative to the camera
    const l = Math.hypot(mx, mz), sp = (s.slow > 0 ? 2 : 5) * (b.translation().y < -.2 ? .6 : 1) * (k.sprint ? 1.7 : 1);
    if (l > 0) { mx /= l; mz /= l; face.current += wrap(Math.atan2(mx, mz) - face.current) * Math.min(1, dt * 12); useStory.setState({ last: performance.now() }); }
    if (Math.abs(v.y) < .2) A.ground = t;                         // coyote time + jump buffer make jumps forgiving
    const pressed = !busy && k.jump; if (pressed && !A.prev) A.buf = t; A.prev = pressed;
    const jump = t - A.buf < .12 && t - A.ground < .12; if (jump) { A.buf = -9; A.ground = -9; }
    b.setLinvel({ x: mx * sp, y: jump ? 8.5 : v.y, z: mz * sp }, true);
    const p = b.translation();
    const over = height(p.x, p.z) < -1.2;                         // over open water (bridge decks, or swimming)
    if (over && p.y > -.5 && l > 0 && (acc.current += dt) > .3) { acc.current = 0; ripple(p.x, p.z, .07); }
    if (!over && p.y > -.2) safe.current.set(p.x, p.y + .6, p.z);
    if (p.y < -.4 && !wet.current) { wet.current = true; ripple(p.x, p.z, .35); }
    if (p.y > -.2) wet.current = false;
    if (p.y < -2.2) { b.setTranslation(safe.current, true); b.setLinvel({ x: 0, y: 0, z: 0 }, true); }
    playerPos.set(p.x, p.y, p.z);
    model.current.rotation.y = face.current;
    const cp = Math.cos(camRig.pitch), d = camRig.dist;
    camera.position.lerp(tmp.set(p.x + Math.sin(camRig.yaw) * cp * d, p.y + Math.sin(camRig.pitch) * d, p.z + Math.cos(camRig.yaw) * cp * d), 1 - Math.exp(-dt * 6));
    camera.lookAt(p.x, p.y + 1.1, p.z);
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
