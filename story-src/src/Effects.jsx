import { useEffect, useState } from 'react';
import { EffectComposer, Bloom, Vignette, HueSaturation, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useStory } from './state';

// The world's colour grade IS the trust meter: grey, grainy and dark at 0, bright and glowing at 100.
export function Effects() {
  const trust = useStory(s => s.trust);
  const [v, setV] = useState(trust);
  useEffect(() => {
    const id = setInterval(() => setV(x => Math.abs(x - trust) < .5 ? trust : x + (trust - x) * .12), 60);
    return () => clearInterval(id);
  }, [trust]);
  const t = v / 100;
  return (
    <EffectComposer multisampling={0}>
      <HueSaturation saturation={-.85 + t * .95} />
      <Bloom intensity={.15 + t * .55} luminanceThreshold={.85} mipmapBlur />
      <Vignette offset={.25} darkness={.95 - t * .55} />
      <Noise opacity={.22 - t * .17} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  );
}
