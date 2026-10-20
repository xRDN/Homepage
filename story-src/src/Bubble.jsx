import { Html } from '@react-three/drei';
import { useStory } from './state';
export const Bubble = ({ y = 2.4, icons }) => icons
  ? <Html position={[0, y, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}><div className="bub">{icons}</div></Html> : null;
export function PipBubble({ y = 2.3 }) { const icons = useStory(s => s.pip.icons); return <Bubble y={y} icons={icons} />; }
