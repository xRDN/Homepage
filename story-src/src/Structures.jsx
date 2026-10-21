import { RigidBody } from '@react-three/rapier';

const Stone = ({ p, s, c = '#a8987e' }) => (
  <RigidBody type="fixed" position={p} colliders="cuboid"><mesh castShadow receiveShadow><boxGeometry args={s} /><meshStandardMaterial color={c} roughness={.9} /></mesh></RigidBody>
);
// Masonry quay: a vertical sea wall and a paved lip around the island, hiding the steep terrain shore.
export function Quay({ x, z, r }) {
  return (<>
    <mesh position={[x, -.9, z]}><cylinderGeometry args={[r + 1, r + 1.15, 1.8, 72, 1, true]} /><meshStandardMaterial color="#9a8f7c" roughness={.95} side={2} /></mesh>
    <mesh position={[x, .015, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r - .6, r + 1, 72]} /><meshStandardMaterial color="#b2a58d" roughness={.9} /></mesh>
  </>);
}
// Walkable stone bridge across a canal: deck, parapets and two piers into the water.
export function Bridge({ x, z, len, w = 4 }) {
  return (<>
    <Stone p={[x, -.15, z]} s={[w, .3, len + 1.4]} />
    {[-1, 1].map(s => <Stone key={s} p={[x + s * (w / 2 - .12), .5, z]} s={[.24, .9, len + 1.4]} c="#8a7a66" />)}
    {[-1, 1].map(s => <mesh key={s} position={[x, -1.6, z + s * len * .3]} castShadow><boxGeometry args={[w - .6, 2.6, .7]} /><meshStandardMaterial color="#8a7a66" roughness={.95} /></mesh>)}
  </>);
}
