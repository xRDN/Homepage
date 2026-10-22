import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { PW, PaperWater } from './Art';
import { PAGE_VIEWS } from './Pages';
import { ptr, rig, useStory, vis } from './state';
import { ripple } from './ripples';

// The camera slides from page to page (the page-turn), leans with your cursor for parallax, and finds where your cursor is
// on the page plane and on the river.
function StageCamera() {
  const cur = useRef(0), v = useMemo(() => new THREE.Vector3(), []), ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.5), []), water = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -.15), []);
  const gl = useThree(s => s.gl);
  useEffect(() => {
    const down = () => { if (ptr.wzw > 1.5 && ptr.wzw < 15) ripple(ptr.wxw, ptr.wzw, .25); };
    gl.domElement.addEventListener('pointerdown', down); return () => gl.domElement.removeEventListener('pointerdown', down);
  }, [gl]);
  useFrame(({ camera, pointer }, dt) => {
    const S = useStory.getState(), dx = S.page * PW - cur.current;
    cur.current += dx * (1 - Math.exp(-dt * 4.2)); rig.x = cur.current;
    camera.position.set(cur.current + pointer.x * .9, 3.8 + pointer.y * .5, 17 + Math.min(Math.abs(dx) * .03, 3));
    camera.lookAt(cur.current + pointer.x * .25, 3.3, 0); camera.updateMatrixWorld();
    ray.setFromCamera(pointer, camera);
    if (ray.ray.intersectPlane(plane, v)) { ptr.wx = v.x; ptr.wy = v.y; }
    if (ray.ray.intersectPlane(water, v)) { if (v.z > 1.5 && v.z < 15 && Math.abs(v.x - ptr.wxw) + Math.abs(v.z - ptr.wzw) > .9) ripple(v.x, v.z, .05); ptr.wxw = v.x; ptr.wzw = v.z; }
    const k = 1 - Math.exp(-dt * 1.5); vis.trust += (S.trust / 100 - vis.trust) * k; vis.dark += (S.dark - vis.dark) * k;
  });
  return null;
}
export function Book() {
  const page = useStory(s => s.page);
  return (
    <Physics gravity={[0, -22, 0]}>
      <StageCamera />
      <RigidBody type="fixed"><CuboidCollider args={[300, .5, 4]} position={[100, .1, 1]} /></RigidBody>
      <PaperWater />
      {PAGE_VIEWS.map((V, i) => Math.abs(page - i) <= 1 && <V key={i} i={i} />)}
    </Physics>
  );
}
