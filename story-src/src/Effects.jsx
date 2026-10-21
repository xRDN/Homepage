import { useEffect, useState } from 'react';
import { EffectComposer, Bloom, Vignette, HueSaturation, Noise, N8AO, TiltShift2, ToneMapping, SMAA } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useStory } from './state';

// Ambient occlusion grounds every prop, tilt-shift turns the street into a toy diorama, bloom lights the lamps and windows,
// and the colour grade IS the trust meter: grey, grainy and dark at 0, bright and glowing at 100.
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
      <N8AO aoRadius={1.6} intensity={2.4} distanceFalloff={1} />
      <Bloom intensity={.2 + t * .7} luminanceThreshold={.8} mipmapBlur />
      <TiltShift2 blur={.16} />
      <HueSaturation saturation={-.85 + t * .95} />
      <Vignette offset={.25} darkness={.95 - t * .55} />
      <Noise opacity={.22 - t * .17} blendFunction={BlendFunction.SOFT_LIGHT} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
