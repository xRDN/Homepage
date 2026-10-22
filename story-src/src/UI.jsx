import { useEffect, useState } from 'react';
import { useStory } from './state';
import { BEATS, objective } from './quest';
import { chirp } from './audio';

const PANELS = [
  { art: '🏛️📖🙂🙂🙂', cap: 'Verdane kept every coin in one honest book.' },
  { art: '🪙✏️📖', cap: 'Then someone learned a number could be changed for a price.' },
  { art: '🌫️😶😶😶', cap: 'The people who check the numbers were changed too, and the country went grey.' },
  { art: '🐰📜', cap: 'Only one true page is left. You carry it.' },
];
function Storybook() {
  const [i, setI] = useState(0), captions = useStory(s => s.captions);
  const go = () => (i + 1 < PANELS.length ? setI(i + 1) : useStory.setState({ scene: 'prologue' }));
  useEffect(() => { chirp(3); const t = setTimeout(go, 4200); return () => clearTimeout(t); }, [i]);
  useEffect(() => { const h = e => { if (['Space', 'Enter', 'KeyE'].includes(e.code)) go(); }; addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [i]);
  return (
    <div className="book" onClick={go}>
      <div className="art">{PANELS[i].art}</div>
      {captions && <p>{PANELS[i].cap}</p>}
      <small>{i + 1} / {PANELS.length} · click or press Space</small>
      <button className="skip" onClick={e => { e.stopPropagation(); useStory.setState({ scene: 'prologue' }); }}>Skip</button>
    </div>
  );
}
export function UI() {
  const { card, prompt, ended, got, gears, captions, pip, scene, stage, toggleCaptions } = useStory();
  const goal = useStory(s => (scene === 'ashmarket' ? (objective(s) || {}).text : ''));
  const [legend, setLegend] = useState(true);
  useEffect(() => { if (scene === 'ashmarket') { const t = setTimeout(() => setLegend(false), 14000); return () => clearTimeout(t); } }, [scene]);
  return (
    <div className="ui">
      <a className="back" href="../">← Island</a>
      <button className={'cc' + (captions ? ' on' : '')} onClick={toggleCaptions} aria-pressed={captions} title="Captions and objective text">CC</button>
      {scene === 'storybook' && <Storybook />}
      {card && <div className="titlecard"><h1>{card}</h1></div>}
      {scene === 'ashmarket' && <div className="hud">
        <div className="beats">{BEATS.map((b, i) => <i key={i} className={ended || i < stage ? 'done' : i === stage ? 'cur' : ''}>{b}</i>)}</div>
        <div className="row"><span>{got.map((g, i) => <i key={i} className={g ? 'on' : ''}>📜</i>)}</span><span>⚙️ {gears}/5</span></div>
        {captions && goal && <p className="goal">{goal}</p>}
      </div>}
      {scene === 'ashmarket' && legend && <div className="legend">WASD move · Shift sprint · Space jump · drag to look · Q / R turn · E interact</div>}
      <div id="arrow" style={{ display: 'none' }}><b>⬆</b><small /></div>
      {prompt && <div className="prompt">{prompt}</div>}
      {captions && pip.cap && <div className="caption">{pip.cap}</div>}
      {ended && <div className="end card">
        <h2>Gear 1 of 5</h2>
        <p>To be continued</p>
        <a className="btn" href="../">Back to the island</a>
        <button className="btn alt" onClick={() => location.reload()}>Replay</button>
      </div>}
    </div>
  );
}
