import { useStory } from './state';

export function UI() {
  const { card, prompt, ended, got, gears, captions, pip, scene, toggleCaptions } = useStory();
  return (
    <div className="ui">
      <a className="back" href="../">← Island</a>
      <button className={'cc' + (captions ? ' on' : '')} onClick={toggleCaptions} aria-pressed={captions} title="Captions">CC</button>
      {card && <div className="titlecard"><h1>{card}</h1></div>}
      {scene === 'ashmarket' && <div className="hud">
        <span>{got.map((g, i) => <i key={i} className={g ? 'on' : ''}>📜</i>)}</span>
        <span>⚙️ {gears}/5</span>
      </div>}
      {prompt && <div className="prompt">E</div>}
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
