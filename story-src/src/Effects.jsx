import { EffectComposer, Bloom, Vignette, HueSaturation, Noise, ToneMapping, SMAA } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useEffect, useState } from 'react';
import { useStory } from './state';

// Grey, grainy and dark when the country has lost its colour; paper grain and warm bloom as it returns.
export function Effects() {
  const trust = useStory(s => s.trust);
  const [v, setV] = useState(trust);
  useEffect(() => { const id = setInterval(() => setV(x => Math.abs(x - trust) < .5 ? trust : x + (trust - x) * .1), 60); return () => clearInterval(id); }, [trust]);
  const t = v / 100;
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={.2 + t * .5} luminanceThreshold={.85} mipmapBlur />
      <HueSaturation saturation={-.8 + t * .9} />
      <Vignette offset={.25} darkness={.9 - t * .5} />
      <Noise opacity={.2 - t * .1} blendFunction={BlendFunction.SOFT_LIGHT} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
