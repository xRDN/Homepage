import { useEffect } from 'react';
import { useStory } from './state';
import { PAGES } from './story';

export function UI() {
  const { page, done, card, captions, ended, toggleCaptions, go, next } = useStory();
  const P = PAGES[page], ready = !P.ask || done[page], isCh = page >= 4;
  useEffect(() => {
    const h = e => { if (e.code === 'ArrowRight' || e.code === 'Enter') useStory.getState().next(); if (e.code === 'ArrowLeft') useStory.getState().go(useStory.getState().page - 1); };
    addEventListener('keydown', h); return () => removeEventListener('keydown', h);
  }, []);
  return (
    <div className="ui">
      <a className="back" href="../">← Island</a>
      <button className={'cc' + (captions ? ' on' : '')} onClick={toggleCaptions} aria-pressed={captions} title="Narration text">CC</button>
      {card && <div className="titlecard"><h1>{card}</h1></div>}
      {captions && <div className="narr"><p key={page}>{P.cap}</p>{P.ask && !done[page] && <small>{P.ask}</small>}</div>}
      <div className="nav">
        <button className="btn alt" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous page">◀</button>
        <div className="dots">{PAGES.map((_, i) => <i key={i} className={i === page ? 'cur' : done[i] ? 'done' : i < 4 ? 'pro' : ''} />)}</div>
        <button className={'btn' + (ready ? ' go' : '')} onClick={next}>{page === PAGES.length - 1 ? 'Finish' : 'Continue'} ▶</button>
      </div>
      {isCh && !captions && P.ask && !done[page] && <div className="askdot" title={P.ask}>👆</div>}
      {ended && <div className="end card">
        <h2>Gear 1 of 5</h2><p>To be continued</p>
        <a className="btn" href="../">Back to the island</a>
        <button className="btn alt" onClick={() => location.reload()}>Read again</button>
      </div>}
    </div>
  );
}
