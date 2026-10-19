// Optional on-device assistant (WebLLM + WebGPU). Nothing loads until the visitor presses "Load model".
const MODELS = ['SmolLM2-360M-Instruct-q4f16_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'];
export function initAI({ system }) {
  const $ = s => document.querySelector(s);
  let web, engine, busy = false;
  const log = (who, t) => { const d = document.createElement('p'); d.className = 'm ' + who; d.textContent = t; $('#ai-log').append(d); $('#ai-log').scrollTop = 1e9; return d; };
  async function prep() {
    if (web) return;
    if (!navigator.gpu) { $('#ai-note').textContent = 'This browser has no WebGPU, so the on-device model cannot run here.'; $('#ai-load').disabled = true; return; }
    try { web = await import('https://esm.run/@mlc-ai/web-llm'); }
    catch { $('#ai-note').textContent = 'Could not fetch the model runtime.'; return; }
    const list = web.prebuiltAppConfig.model_list;
    $('#ai-model').innerHTML = MODELS.map(id => list.find(m => m.model_id === id)).filter(Boolean)
      .map(m => `<option value="${m.model_id}">${m.model_id.replace(/-q4.*/, '')} · ~${Math.round(m.vram_required_MB)} MB</option>`).join('');
    $('#ai-load').disabled = false;
    $('#ai-note').textContent = 'Runs fully in your browser. Sizes are the memory each model needs; weights are cached after the first load.';
  }
  $('#ai-load').onclick = async () => {
    $('#ai-load').disabled = $('#ai-model').disabled = true;
    try {
      engine = await web.CreateMLCEngine($('#ai-model').value, { initProgressCallback: r => { $('#ai-bar').value = r.progress * 100; $('#ai-note').textContent = r.text; } });
      $('#ai-bar').value = 100; $('#ai-note').textContent = 'Ready ✓';
      $('#ai-chat').classList.remove('hidden'); $('#ai-q').focus();
    } catch (e) { $('#ai-note').textContent = 'Load failed: ' + (e.message || e); $('#ai-load').disabled = $('#ai-model').disabled = false; }
  };
  $('#ai-chat').onsubmit = async e => {
    e.preventDefault();
    const q = $('#ai-q').value.trim();
    if (busy || !engine || !q) return;
    $('#ai-q').value = ''; log('me', q); busy = true;
    const out = log('pip', '…');
    try {
      const s = await engine.chat.completions.create({ messages: [{ role: 'system', content: system }, { role: 'user', content: q }], stream: true, max_tokens: 220, temperature: .6 });
      let txt = '';
      for await (const c of s) { txt += c.choices[0]?.delta?.content || ''; out.textContent = txt; $('#ai-log').scrollTop = 1e9; }
    } catch { out.textContent = '…my brain hiccuped, try again?'; }
    busy = false;
  };
  return { prep };
}
