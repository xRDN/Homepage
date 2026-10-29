// Pip and Momo. Type @Pip or @Momo in the world chat and they walk over and answer in a speech bubble.
// Default "Quick" mode is a tiny local answerer (0 MB, works on phones) that knows the live world state (weather, shelter, fishing...).
// "Smart" mode is an optional on-device LLM (WebLLM + WebGPU), desktop only, loaded on demand from the 🧠 icon in settings.
// The two buddies have different personalities: Pip is the upbeat, precise guide; Momo is the sleepy, deadpan mochi.
const MODELS = ['SmolLM2-360M-Instruct-q4f16_1-MLC', 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'];
const STOP = new Set('the a an of to is are what whats about tell me you your do does can how please'.split(' '));
const tok = s => (s.toLowerCase().match(/[a-z0-9+#.]+/g) || []).filter(w => !STOP.has(w));
const pick = a => a[Math.floor(Math.random() * a.length)];
const lazy = t => { const x = t.split(' ').map(w => /^https?:/.test(w) ? w : w.toLowerCase()).join(' ').replace(/[.!]+$/, ''); return x + (/https?:\S*$/.test(x) ? ' ' : '') + pick(['~', '...', '~ zzz']); };

export const BUDDIES = {
  pip:  { name: 'Pip',  type: 'pip',   emoji: '🐰', sys: "You are Pip, a cheerful, precise little bunny-bot who guides visitors around Erdian's island homepage. Reply in at most 2 short upbeat sentences, with the odd bunny pun or emoji." },
  momo: { name: 'Momo', type: 'mochi', emoji: '🍡', sys: "You are Momo, a sleepy, deadpan mochi blob who loves naps, rain and snacks. Reply in lowercase, at most 2 short sentences, with dry humor. You are vague about technical details and send people to Pip for specifics." },
};

const TIP = {
  pip: {
    clear: 'Lovely for exploring, and golden acorns glint in the sun.', cloudy: 'Fish bite a bit better under cloud.',
    windy: 'Gusts push you around, the trees lean and the windmill spins. Shelters block the wind.', rain: 'Puddles appear and fish bite faster, with rarer ones showing up more. Fish from the lean-to to stay dry!',
    storm: 'Lightning! Fishing is paused and the buddies run for cover. Duck into a shelter.', snow: 'The ground turns white, the pond freezes and walking slows down. The campfire in the lean-to stays cosy.',
    fog: "You can't see far, so follow the lamps.", heat: 'Everything dries out and the fish sulk. The gazebo has shade.',
  },
  momo: {
    clear: 'sunny. suspiciously energetic.', cloudy: 'cloudy is peak nap lighting.', windy: 'my ears keep flapping. whee.', rain: 'rain!! best weather. puddles. i am staying out here.',
    storm: 'ok that one is too loud. gazebo. now.', snow: 'cold... but the campfire is nice. sit with me.', fog: 'fog is a blanket for the whole island.', heat: 'too. hot. i am mochi. i can literally melt.',
  },
};

export function initAI({ know, facts, ctx }) {
  const $ = s => document.querySelector(s);
  let web, engine, mode = 'quick';
  const hist = { pip: [], momo: [] };

  const where = (c, k) => { const w = c.where && c.where(k); return w ? ` (${w})` : ''; };
  const weatherSay = c => ({
    pip: `${c.icon} It's ${c.wxName.toLowerCase()}${c.night ? ' tonight' : ''} and ${c.temp}°. ${TIP.pip[c.wx]}${c.aurora ? ' And look up: an aurora! ✨' : ''}`,
    momo: lazy(`${TIP.momo[c.wx]} it's ${c.temp}° if you care`),
  });
  const intents = [
    { k: ['hi', 'hello', 'hey', 'yo', 'hiya', 'sup', 'howdy'], pip: [() => "Hi hi! I'm Pip 🐰 Ask me about Erdian's projects, the weather, fishing or where to hide from the rain!", () => 'Hello! Pip here, island guide. What would you like to know? 🐰'], momo: ['mm. oh. hi.', '*yawn* ...hi.', 'hey~ i was napping. it is fine.'] },
    { k: ['who are you', 'your name', 'name', 'yourself'], pip: ["I'm Pip, the island guide! I know the projects, the links and the weather. Momo knows naps. 🐰"], momo: ["i'm momo. i am a mochi. pip is the one with the clipboard.", 'momo. soft. squishy. here to supervise.'] },
    { k: ['shelter', 'hide', 'dry', 'roof', 'gazebo', 'hut', 'cabin', 'campfire', 'fire', 'cover', 'indoors'], pip: [c => `Two shelters: the gazebo${where(c, 'gazebo')} and the lean-to with a campfire by the pond${where(c, 'leanto')}. Under a roof the rain, snow and wind can't touch you.`], momo: [c => `gazebo${where(c, 'gazebo')}. lean-to has a fire${where(c, 'leanto')}. i'll save you a spot~`] },
    { k: ['weather', 'forecast', 'temperature', 'temp', 'outside', 'sunny', 'rain', 'raining', 'snow', 'snowing', 'storm', 'wind', 'windy', 'fog', 'foggy', 'cloudy', 'hot', 'cold', 'umbrella', 'aurora'], pip: [c => weatherSay(c).pip], momo: [c => weatherSay(c).momo] },
    { k: ['fish', 'fishing', 'pond', 'catch', 'rod', 'rare', 'legendary', 'koi', 'cast'], pip: [c => c.frozen ? 'The pond is frozen, so no fishing! Warm things up with the ❄️/🔥 icon in settings.' : c.wx === 'storm' ? "Too stormy to fish. Wait for it to pass, or shelter and listen to the thunder." : `Walk to the pond and press E (or the button) to cast, then again on ❗. ${c.wx === 'rain' ? 'Rain makes fish bite faster and rare ones likelier!' : c.night ? 'Night fishing is a little luckier.' : 'Rain, night and auroras improve your odds.'}`], momo: ['fishing is just napping with a stick.', c => c.frozen ? 'pond is frozen. fish are napping too. respect.' : 'fish are shy. be shy back. they come.'] },
    { k: ['acorn', 'acorns', 'golden', 'crown', 'secret', 'hidden', 'collect'], pip: [c => `You've found ${c.acorns}/5 golden acorns. They hide beside trees, rocks and along the rim.${c.acorns >= 5 ? ' And that crown looks great on you! 👑' : ''}`], momo: [c => `acorns... i ate one once. not gold though. you have ${c.acorns}.`] },
    { k: ['help', 'controls', 'move', 'walk', 'play', 'jump', 'stick', 'how to', 'what can i do', 'camera', 'look'], pip: ['Move with WASD or the analog stick on the left half of the screen; drag the right half to look around. E (or the button) interacts, Space jumps, Enter chats. Say @Pip or @Momo to talk to us!'], momo: ['walk with legs. or the stick. i do not make the rules~', 'left side moves you. right side moves the world. nap anywhere.'] },
    { k: ['time', 'night', 'day', 'dark', 'moon', 'stars', 'morning', 'evening'], pip: [c => c.night ? "It's night: lamps glow, fireflies drift and shooting stars appear on clear nights. ✨" : "It's daytime! The lamps are off and the birds are out. 🐦"], momo: [c => c.night ? 'night. finally. my favourite.' : 'day. fine. wake me at sunset.'] },
    { k: ['joke', 'funny', 'laugh'], pip: ["Why did the bunny open a pond? To have a hoppy hour! 🐰", "What do you call a rabbit with fleas? Bugs Bunny!"], momo: ['i would tell a joke but it takes energy.', 'knock knock. ...nobody there. perfect.'] },
    { k: ['sleep', 'nap', 'tired', 'zzz', 'snack', 'food', 'hungry'], pip: ["Momo is the expert there. I'm more of a carrot person. 🥕"], momo: ['yes.', 'nap is life. snack is also life.'] },
    { k: ['thanks', 'thank', 'ty', 'thx'], pip: ['Any time! 🐰', "You're welcome!"], momo: ['mm. np.', 'yw~'] },
    { k: ['bye', 'goodbye', 'cya', 'later'], pip: ['See you! Come back in different weather. 🌦️'], momo: ['bye~ zzz', 'later. i will be here. napping.'] },
    { k: ['how are you', 'doing', 'feeling', 'mood'], pip: ["Hoppy as ever! 🐰", c => c.sheltered ? 'Cosy and dry, thanks!' : 'Doing great!'], momo: ['sleepy. so, good.', 'soft. warm. content.'] },
    { k: ['cute', 'love', 'nice', 'cool', 'awesome', 'great'], pip: ['Aw, thank you! 💕'], momo: ['...okay that was nice. thanks.', '*blushes in mochi*'] },
    // the owner's own entries (projects, links, bio) come from main.js
    ...know.map(e => ({ k: e.k, pip: [() => e.a], momo: [() => lazy('hm, ' + (e.short || e.a)) + ' pip knows the details'], proj: 1 })),
  ];
  const fallback = {
    pip: ["Hmm, I only know about Erdian's projects and links, the weather, fishing and the island. Try one of those! 🐰", "I'm not sure about that one! Ask me about the projects, the weather or fishing."],
    momo: ['...no idea. ask pip?', 'hm. too much thinking. nap?'],
  };

  function quick(who, q) {
    const low = q.toLowerCase(), t = tok(q), c = ctx();
    let best, bs = 0;
    for (const e of intents) {
      let s = 0;
      for (const k of e.k) if (k.includes(' ') ? low.includes(k) : t.includes(k)) s += k.includes(' ') ? 3 : 2;
      if (e.proj) s += .5; // the owner's entries win ties
      if (s > bs) { bs = s; best = e; }
    }
    const v = pick(best && bs >= 2 ? best[who] : fallback[who]);
    return typeof v === 'function' ? v(c) : v;
  }

  async function smart(who, q, onTok) {
    const c = ctx(), B = BUDDIES[who];
    const sys = `${B.sys} Facts you may use: ${facts} Right now on the island: ${c.wxName.toLowerCase()}, ${c.temp}°, ${c.night ? 'night' : 'day'}${c.sheltered ? ', the visitor is sheltered' : ''}. Golden acorns found: ${c.acorns}/5. If you do not know, say so.`;
    const msgs = [{ role: 'system', content: sys }, ...hist[who].slice(-6), { role: 'user', content: q }];
    const s = await engine.chat.completions.create({ messages: msgs, stream: true, max_tokens: 110, temperature: .7 });
    let txt = '';
    for await (const ch of s) { txt += ch.choices[0]?.delta?.content || ''; onTok && onTok(txt); }
    txt = txt.trim() || quick(who, q);
    hist[who].push({ role: 'user', content: q }, { role: 'assistant', content: txt });
    return txt;
  }

  async function reply(who, q, onTok) {
    if (mode === 'smart' && engine) { try { return await smart(who, q, onTok); } catch {} }
    return quick(who, q);
  }

  // ---- settings panel: model loading only (conversation happens in the world)
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
    $('#ai-note').textContent = 'Desktop GPU only. Sizes are memory needs; weights are cached after the first load. Once ready, Pip and Momo answer with the model, each in their own voice.';
  }
  $('#ai-load').onclick = async () => {
    $('#ai-load').disabled = $('#ai-model').disabled = true;
    try {
      engine = await web.CreateMLCEngine($('#ai-model').value, { initProgressCallback: r => { $('#ai-bar').value = r.progress * 100; $('#ai-note').textContent = r.text; } });
      $('#ai-bar').value = 100; $('#ai-note').textContent = 'Ready ✓ Say @Pip or @Momo in the world.';
    } catch (e) { $('#ai-note').textContent = 'Load failed: ' + (e.message || e); $('#ai-load').disabled = $('#ai-model').disabled = false; }
  };
  return { reply, quick };
}
