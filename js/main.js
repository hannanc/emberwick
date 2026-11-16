// ================================================================ start-up and polling
let debugDone = false;
function debugCam() {
  const c = (DEBUG.cam || '').split(',').map(Number);
  if (vw > 1 && c.length === 3 && c.every(isFinite)) { cam.follow = false; userMoved = true; cam.tx = c[0] * T; cam.ty = c[1] * T; cam.tz = c[2]; clampT(); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; syncFocus(); }
}
function debugOverride() {   // URL parameters: pin time and weather after every poll
  const m = /^(\d{1,2}):(\d{2})$/.exec(DEBUG.t || '');
  if (m) { st.minute = +m[1] * 60 + +m[2]; st.phase = st.minute >= 1320 || st.minute < 360 ? 'night' : 'day'; }
  if (DEBUG.w) st.weather = DEBUG.w;
}
function debugOnce() {       // camera, selection and tab, once after the first poll
  if (debugDone) return; debugDone = true;
  if (FROZEN != null) $('hint').style.display = 'none';   // its fade-out is timed, which would make shots differ
  debugCam();
  if (DEBUG.scene && st.places[DEBUG.scene]) { focusPlace(DEBUG.scene); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  if (DEBUG.sel && st.agents.some(a => a.name === DEBUG.sel)) { selected = DEBUG.sel; setWhisperTarget(selected); syncFocus(); renderPeople(true); renderFeed(true); }
  if (DEBUG.tab) { const b = document.querySelector(`nav button[data-tab="${DEBUG.tab}"]`); if (b) b.click(); }
}
function msgHint() {
  const [how, who] = ($('to').value || ':').split(':');
  $('msg').placeholder = how === 'speak' ? `Say something to ${who}; they will answer you` :
    how === 'thought' ? `A thought that pops into ${who}'s head` : 'A voice from the sky the whole village hears';
}
$('to').addEventListener('change', msgHint);
async function fetchState() {   // ask only for what changed; any surprise falls back to the full state
  const get = async q => (await fetch('/api/state' + q)).json(), old = st;
  if (!old || !old.events || old.chron_day == null || !old.chronicle || !old.oracle || !old.oracle.log) return get('');
  const top = old.events.length ? old.events[old.events.length - 1].id : 0, h = old.hashes || {};
  const q = `?since=${top}&chron=${old.chron_day}&oracle=${old.oracle_id}` + (h.structures ? `&structures=${h.structures}&wishes=${h.wishes}` : '');
  const nw = await get(q);
  if (!nw.partial) return nw;
  const evs = old.events.concat(nw.events);
  if (nw.events.some(e => e.id <= top) || (nw.events.length && nw.events[0].id <= top)) return get('');
  nw.events = evs.slice(-80);
  if (!nw.chronicle) nw.chronicle = old.chronicle;
  if (!nw.oracle.log) nw.oracle.log = old.oracle.log;
  for (const k of ['structures', 'wishes']) if (!nw[k]) { if (!old[k]) return get(''); nw[k] = old[k]; }
  return nw;
}
async function poll() {
  try {
    st = await fetchState(); skew = st.now - Date.now() / 1000;
    debugOverride();
    if (st.world && st.world.w !== W) { W = st.world.w; WW = W * T; scenery = null; if (!userMoved) resetView(true); else clampT(); }   // a new lane: redraw the land
    if (!scenery) { buildPaths(); buildScenery(); const ld = $('loading'); if (ld) { ld.classList.add('gone'); setTimeout(() => ld.remove(), 700); } }
    syncPositions(); fxEvents();
    const able = st.agents.filter(a => a.age >= 6).map(a => a.name), sel = $('to');
    if (sel.dataset.names !== able.join()) {            // rebuild when people are born, grow up or die
      const cur = sel.value; sel.dataset.names = able.join();
      while (sel.children.length > 1) sel.lastChild.remove();
      for (const [how, label] of [['speak', 'Speak to'], ['thought', 'Plant a thought in']]) {
        const g = document.createElement('optgroup'); g.label = label;
        for (const n of able) g.append(new Option(`${label} ${n}`, `${how}:${n}`));
        sel.append(g);
      }
      sel.value = [...sel.options].some(o => o.value === cur) ? cur : '';
      msgHint();
    }
    renderHeader(); renderFeed(); renderPeople(); renderPop(); renderBuilt(); hearEvents(); renderGoals(); renderOracle(); renderPrayers(); renderChron(); syncFocus(); renderScene();
    debugOnce();
  } catch (e) { const s = $('status'); s.className = 'off'; s.lastChild.textContent = 'Connection lost'; }
  setTimeout(poll, 2500);
}
poll();

const navEl = document.querySelector('nav'), navMore = () => navEl.classList.toggle('more', navEl.scrollWidth - navEl.clientWidth - navEl.scrollLeft > 6);
navEl.addEventListener('scroll', navMore, { passive: true }); new ResizeObserver(navMore).observe(navEl); setTimeout(navMore, 300);
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.id === b.dataset.tab));
  if (b.dataset.tab === 'people' && selected) { const c = $('card-' + selected); if (c) c.scrollIntoView({ block: 'nearest' }); }
});
$('to').onchange = () => { selected = $('to').value.split(':')[1] || null; syncFocus(); if (st) { renderPeople(true); renderFeed(true); } };
$('whisper').onsubmit = async ev => {
  ev.preventDefault(); const text = $('msg').value.trim(); if (!text) return;
  const [how, to] = ($('to').value || ':').split(':'), note = $('note');
  try {
    const r = await (await fetch('/api/whisper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, text, how }) })).json();
    note.textContent = r.ok ? (how === 'speak' ? `Sent. ${to} hears your voice and answers on the next turn, usually within a minute.` : to ? `Sent. ${to} takes the next turn and will react within about 20 seconds.` : 'Sent. Each villager reacts on their next turn, one every 15–20 seconds.') : (r.note || 'That did not go through.');
  } catch (e) { note.textContent = 'Could not reach the server.'; }
  clearTimeout(note.timer); note.timer = setTimeout(() => note.textContent = '', 30000);
  $('msg').value = ''; filter = 'all'; feedKey = ''; document.querySelector('[data-tab=feed]').click();
};
