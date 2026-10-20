import { useEffect } from 'react';
import { useStory } from './state';

export function UI() {
  const { dialog, objective, prompt, choice, ended, got, scene, next, resolveBoard } = useStory();
  useEffect(() => {
    const h = e => { if (useStory.getState().dialog && ['Enter', 'Space', 'KeyE'].includes(e.code)) { e.preventDefault(); useStory.getState().next(); } };
    addEventListener('keydown', h); return () => removeEventListener('keydown', h);
  }, []);
  const line = dialog && dialog.lines[dialog.i];
  return (
    <div className="ui">
      <a className="back" href="../">← Island</a>
      {scene === 'ashmarket' && <div className="hud">
        {objective && <p>🎯 {objective}</p>}
        <p>📜 {got.filter(Boolean).length}/3 ledger pages</p>
        <small>WASD move · Space jump · E interact · push the carts</small>
      </div>}
      {prompt && !dialog && <div className="prompt">{prompt}</div>}
      {line && <div className="dialog" onClick={next}>
        {line.who && <b>{line.who}</b>}<p>{line.text}</p><small>Space / E / click</small>
      </div>}
      {choice === 'board' && <div className="choice card">
        <h3>How do you post them?</h3>
        <button className="btn" onClick={() => resolveBoard('numbers')}>Publish the numbers</button>
        <button className="btn alt" onClick={() => resolveBoard('shame')}>Publish the clerk’s name too</button>
      </div>}
      {ended && <div className="end card">
        <h2>The Heartroot has its first leaf 🌱</h2>
        <p>To be continued: Chapter 2, <b>The Hollow Courts</b>.</p>
        <a className="btn" href="../">Back to the island</a>
        <button className="btn alt" onClick={() => location.reload()}>Replay</button>
      </div>}
    </div>
  );
}
