// ================================================================ voices: hear everyone, one villager, or nobody
const hear = { mode: store.get('hear') || 'off', upTo: null, queue: [], now: null, blocked: false, wait: false, timer: 0, dog: 0 };
function hearOptions() {
  const sel = $('hear'), names = st.agents.filter(a => a.age >= 6).map(a => a.name);
  const want = ['off', 'all', ...names], have = [...sel.options].map(o => o.value);
  if (want.join() !== have.join()) {
    while (sel.options.length > 2) sel.remove(2);
    for (const n of names) sel.add(new Option('Hear only ' + n, n));
  }
  if (!want.includes(hear.mode)) hear.mode = 'off';
  sel.value = hear.mode;
}
function wants(e) {
  if (hear.mode === 'off') return false;
  const speech = (e.kind === 'turn' && e.say) || (e.kind === 'oracle' && e.text);
  return !!speech && (hear.mode === 'all' || e.who === hear.mode);
}
function hearEvents() {
  hearOptions();
  const ids = st.events.map(e => e.id);
  if (hear.upTo === null) { hear.upTo = Math.max(0, ...ids); return; }   // never replay what was said before you arrived
  for (const e of st.events) {
    if (e.id <= hear.upTo) continue;
    hear.upTo = e.id;
    if (!wants(e)) continue;
    const item = { e, who: e.kind === 'oracle' ? 'The Oracle' : e.who, text: e.kind === 'oracle' ? e.text : e.say };
    if (st.tts) { item.audio = new Audio(`/api/tts/${e.id}.wav`); item.audio.preload = 'auto'; }   // start making it now
    hear.queue.push(item);
  }
  while (hear.queue.length > 4) hear.queue.shift();       // stay close to the present
  if (!hear.now && !hear.wait) nextLine();
}
function showHearing() {
  const h = $('hearing'); h.replaceChildren();
  if (hear.now) h.append(el('b', '', hear.now.who), ' speaking');
  else if (hear.mode !== 'off') h.append(hear.mode === 'all' ? 'listening to everyone' : 'listening to ' + hear.mode);
  $('unmute').hidden = !hear.blocked;
}
// room echo: a generated impulse response per kind of place, so voices sound like they are somewhere
const room = { ctx: null, irs: {} };
const ROOMS = { indoor: [1.0, 0.24, 3200], outdoor: [0.5, 0.1, 5200], stones: [2.6, 0.32, 2600] };   // seconds, wet, low-pass Hz
const INDOOR = new Set(['Tavern', 'Library', 'Bakery', 'Hospital', 'Workshop']);
function audioCtx() {                                     // call from a click or change, so the browser lets it run
  if (room.ctx === null) { try { room.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { room.ctx = false; } }
  if (room.ctx && room.ctx.state === 'suspended') room.ctx.resume().catch(() => {});
  return room.ctx;
}
function impulse(ac, secs) {
  if (room.irs[secs]) return room.irs[secs];
  const n = Math.round(ac.sampleRate * secs), b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  return room.irs[secs] = b;
}
function withRoom(audio, place) {                         // dry voice plus a soft, filtered echo; untouched if audio is locked
  const ac = room.ctx;
  if (!ac || ac.state !== 'running') return;
  try {
    const [secs, wet, lp] = ROOMS[place === 'Oracle' ? 'stones' : INDOOR.has(place) ? 'indoor' : 'outdoor'];
    const src = ac.createMediaElementSource(audio), conv = ac.createConvolver(), f = ac.createBiquadFilter(), w = ac.createGain();
    conv.buffer = impulse(ac, secs); f.type = 'lowpass'; f.frequency.value = lp; w.gain.value = wet;
    src.connect(ac.destination); src.connect(conv).connect(f).connect(w).connect(ac.destination);
  } catch (e) {}
}
function stopSound() {                                     // silence whatever is playing, so two voices can never overlap
  if (hear.now && hear.now.audio) { try { hear.now.audio.onended = hear.now.audio.onerror = null; hear.now.audio.pause(); } catch (e) {} }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  clearTimeout(hear.timer); clearTimeout(hear.dog);
}
function nextLine() {
  if (hear.now) return;                                    // one voice at a time: never start while one is still going
  hear.wait = false;
  hear.now = hear.queue.shift() || null; showHearing();
  if (!hear.now) return;
  const it = hear.now;
  let over = false, fell = false;
  const done = () => {                                     // runs once per line, however it ends
    if (over) return; over = true; clearTimeout(hear.dog);
    if (it.audio) it.audio.onended = it.audio.onerror = null;
    if (hear.now !== it) return;
    hear.now = null; hear.wait = true; showHearing();      // a short breath between speakers
    hear.timer = setTimeout(nextLine, 450);
  };
  const fallback = () => {                                 // the browser voice takes over at most once, after the file's sound is stopped
    if (over || fell) return; fell = true;
    if (it.audio) { try { it.audio.pause(); } catch (e) {} }
    speakFallback(it, done);
  };
  hear.dog = setTimeout(() => { if (hear.now === it) { stopSound(); done(); } }, 90000);   // never stall on a line that hangs
  if (!it.audio) return fallback();
  if (!it.roomed) { it.roomed = true; withRoom(it.audio, it.e.kind === 'oracle' ? 'Oracle' : it.e.place); }
  it.audio.onended = done;
  it.audio.onerror = fallback;
  it.audio.play().catch(err => {
    if (over) return;
    if (err && err.name === 'NotAllowedError') { clearTimeout(hear.dog); hear.blocked = true; hear.queue.unshift(it); hear.now = null; showHearing(); }
    else fallback();
  });
}
function speakFallback(it, done) {                         // the browser's own voice when the server has none
  if (!('speechSynthesis' in window)) return done();
  const a = st.agents.find(x => x.name === it.e.who) || { sex: 'm', age: 500 }, u = new SpeechSynthesisUtterance(it.text);
  const en = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  const fem = en.filter(v => /female|zira|susan|hazel|libby|sonia|jenny|aria|emma|samantha|victoria|karen|moira|tessa|fiona|serena|kate/i.test(v.name));
  const pool = (a.sex === 'f' ? fem : en.filter(v => !fem.includes(v))).length ? (a.sex === 'f' ? fem : en.filter(v => !fem.includes(v))) : en;
  const h = [...(it.e.who || 'x')].reduce((s, c) => s * 31 + c.charCodeAt(0) >>> 0, 7);
  if (pool.length) u.voice = pool[h % pool.length];
  u.pitch = it.e.kind === 'oracle' ? 0.6 : a.age < 18 ? 1.45 : 0.85 + (h % 30) / 100;
  u.rate = a.age >= 65 ? 0.88 : a.age < 18 ? 1.08 : 1;
  u.onend = u.onerror = done;
  speechSynthesis.speak(u);
}
function setHear(mode) {
  if (mode !== 'off') audioCtx();
  hear.mode = mode; store.set('hear', mode);
  hear.queue = []; hear.blocked = false;
  stopSound();
  hear.now = null; hear.wait = false; hear.upTo = st ? Math.max(0, ...st.events.map(e => e.id)) : null;
  showHearing();
}
$('hear').addEventListener('change', e => setHear(e.target.value));
$('unmute').addEventListener('click', () => { audioCtx(); hear.blocked = false; nextLine(); });
addEventListener('pointerdown', () => { if (hear.mode !== 'off') audioCtx(); }, { once: true });   // a saved sound mode gets its echo on the first click
