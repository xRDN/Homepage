const KINDS = {
  slime: { c: '#4fc4b0' },
  mochi: { c: '#ffa6c9', ears: 1, blush: '#f0568f' },
  bot: { c: '#e8eef2', glow: '#6ff3ff', bot: 1 },
  pip: { c: '#ffc2d9', glow: '#ff7fb0', bot: 1 },
};
const dark = <meshStandardMaterial color="#2d2140" roughness={.3} />;
export function Buddy({ type = 'slime' }) {
  const K = KINDS[type] || KINDS.slime, blush = K.blush || '#ff9ec0';
  const eyes = (y, z, sp, cx, cy, cz) => [-1, 1].map(s => (
    <group key={s}>
      <mesh position={[s * sp, y, z]}><sphereGeometry args={[.075, 16, 12]} />
        {K.glow ? <meshStandardMaterial color={K.glow} emissive={K.glow} emissiveIntensity={1.2} /> : dark}</mesh>
      <mesh position={[s * cx, cy, cz]} scale={[1, 1, .4]}><sphereGeometry args={[.09, 12, 10]} /><meshStandardMaterial color={blush} roughness={.9} /></mesh>
    </group>
  ));
  if (!K.bot) return (
    <group>
      <mesh position={[0, .48, 0]} scale={[1.05, .88, 1.05]}><sphereGeometry args={[.55, 32, 24]} /><meshStandardMaterial color={K.c} roughness={.25} /></mesh>
      {eyes(.52, .55, .18, .32, .38, .47)}
      <mesh position={[0, .43, .56]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.05, .014, 8, 16, Math.PI]} />{dark}</mesh>
      {K.ears
        ? [-1, 1].map(s => <mesh key={s} position={[s * .3, .98, 0]} rotation={[0, 0, -s * .35]}><coneGeometry args={[.15, .32, 16]} /><meshStandardMaterial color={K.c} roughness={.4} /></mesh>)
        : <mesh position={[.06, 1, 0]} scale={[1, .45, .6]} rotation={[0, 0, -.5]}><sphereGeometry args={[.16, 12, 10]} /><meshStandardMaterial color="#8fe08a" /></mesh>}
    </group>
  );
  return (
    <group>
      <mesh position={[0, .5, 0]} scale={[1.08, .92, 1.02]}><sphereGeometry args={[.5, 32, 24]} /><meshStandardMaterial color={K.c} roughness={.35} /></mesh>
      <mesh position={[0, .55, .3]} scale={[1, .72, .62]}><sphereGeometry args={[.4, 24, 16]} /><meshStandardMaterial color="#33414a" roughness={.2} /></mesh>
      {eyes(.58, .56, .15, .27, .48, .49)}
      <mesh position={[0, .5, .55]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.05, .014, 8, 16, Math.PI]} /><meshStandardMaterial color={K.glow} emissive={K.glow} emissiveIntensity={1.2} /></mesh>
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[s * .22, 1.18, -.02]} rotation={[0, 0, -s * .18]}><capsuleGeometry args={[.1, .4, 6, 12]} /><meshStandardMaterial color={K.c} roughness={.35} /></mesh>
          <mesh position={[s * .22, 1.18, .05]} rotation={[0, 0, -s * .18]}><capsuleGeometry args={[.05, .28, 6, 8]} /><meshStandardMaterial color={blush} roughness={.9} /></mesh>
          <mesh position={[s * .5, .35, .12]}><sphereGeometry args={[.1, 14, 10]} /><meshStandardMaterial color={K.c} roughness={.35} /></mesh>
        </group>
      ))}
    </group>
  );
}
