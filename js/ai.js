// Ask Pip. Default "Quick" mode is a tiny local answerer (0 MB, works on phones).
// "Smart" mode is an optional on-device LLM (WebLLM + WebGPU), desktop only, loaded on demand.
const MODELS = ['SmolLM2-360M-Instruct-q4f16_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'];
const STOP = new Set('the a an of to is are what whats about tell me you your do does can how please'.split(' '));
const tok = s => (s.toLowerCase().match(/[a-z0-9+#.]+/g) || []).filter(w => !STOP.has(w));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initAI({ system, know, chips }) {
  const $ = s => document.querySelector(s);
  let web, engine, busy = false, mode = 'quick';
  const log = (who, t) => { const d = document.createElement('p'); d.className = 'm ' + who; d.textContent = t; $('#ai-log').append(d); $('#ai-log').scrollTop = 1e9; return d; };
  const fallback = "Hmm, I only know about Erdian's projects and links. Try one of the chips! 🐰";

  function answer(q) {
    const low = q.toLowerCase(), t = tok(q);
    let best, bs = 0;
    for (const e of know) {
      let s = 0;
      for (const k of e.k) if (k.includes(' ') ? low.includes(k) : t.includes(k)) s += k.includes(' ') ? 3 : 2;
      if (s > bs) { bs = s; best = e; }
    }
    return best ? best.a : fallback;
  }
  const type = (el, txt) => new Promise(ok => {
    if (reduce) { el.textContent = txt; return ok(); }
    let i = 0;
    const id = setInterval(() => { el.textContent = txt.slice(0, ++i); $('#ai-log').scrollTop = 1e9; if (i >= txt.length) { clearInterval(id); ok(); } }, 14);
  });

  async function ask(q) {
    if (busy || !q) return;
    busy = true; log('me', q);
    const out = log('pip', '…');
    try {
      if (mode === 'smart' && engine) {
        const s = await engine.chat.completions.create({ messages: [{ role: 'system', content: system }, { role: 'user', content: q }], stream: true, max_tokens: 200, temperature: .6 });
        let txt = '';
        for await (const c of s) { txt += c.choices[0]?.delta?.content || ''; out.textContent = txt; $('#ai-log').scrollTop = 1e9; }
      } else if (mode === 'smart') out.textContent = 'Load the model first, or switch back to ⚡ Quick.';
      else await type(out, answer(q));
    } catch { out.textContent = '…my brain hiccuped, try again?'; }
    busy = false;
  }
  $('#ai-chat').onsubmit = e => { e.preventDefault(); const q = $('#ai-q').value.trim(); $('#ai-q').value = ''; ask(q); };
  $('#ai-chips').innerHTML = chips.map(c => `<button type="button">${c}</button>`).join('');
  $('#ai-chips').onclick = e => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); };

  const capable = !!navigator.gpu && !matchMedia('(pointer: coarse)').matches;
  if (!capable) { $('#ai-t-smart').disabled = true; $('#ai-t-smart').title = 'Needs a desktop browser with WebGPU'; }
  const setMode = m => {
    mode = m;
    $('#ai-t-quick').classList.toggle('on', m === 'quick'); $('#ai-t-smart').classList.toggle('on', m === 'smart');
    $('#ai-smart').classList.toggle('hidden', m !== 'smart');
    if (m === 'smart') prep();
  };
  $('#ai-t-quick').onclick = () => setMode('quick');
  $('#ai-t-smart').onclick = () => setMode('smart');

  async function prep() {
    if (web) return;
    try { web = await import('https://esm.run/@mlc-ai/web-llm'); }
    catch { $('#ai-note').textContent = 'Could not fetch the model runtime.'; return; }
    const list = web.prebuiltAppConfig.model_list;
    $('#ai-model').innerHTML = MODELS.map(id => list.find(m => m.model_id === id)).filter(Boolean)
      .map(m => `<option value="${m.model_id}">${m.model_id.replace(/-q4.*/, '')} · ~${Math.round(m.vram_required_MB)} MB</option>`).join('');
    $('#ai-load').disabled = false;
    $('#ai-note').textContent = 'Desktop GPU only. Sizes are memory needs; weights are cached after the first load. The 3D scene pauses while this panel is open.';
  }
  $('#ai-load').onclick = async () => {
    $('#ai-load').disabled = $('#ai-model').disabled = true;
    try {
      engine = await web.CreateMLCEngine($('#ai-model').value, { initProgressCallback: r => { $('#ai-bar').value = r.progress * 100; $('#ai-note').textContent = r.text; } });
      $('#ai-bar').value = 100; $('#ai-note').textContent = 'Ready ✓';
    } catch (e) { $('#ai-note').textContent = 'Load failed: ' + (e.message || e); $('#ai-load').disabled = $('#ai-model').disabled = false; }
  };
  log('pip', "Hi! I'm Pip 🐰 Ask me about Erdian's projects, or tap a chip.");
}
