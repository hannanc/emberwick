// ================================================================ scenes: stand in a place
const PLACE_DESC = {
  Square: 'The village square: the old stone well, the stalls, the merchant, the bank steps and the benches.', Bakery: "Mira's bakery, warm and smelling of bread.",
  Garden: 'The herb garden, with its beehives and the mill.', Tavern: 'The Gilded Newt: ale, stew and the village\u2019s gossip.', Shrine: 'The shrine under the Old Oak, where wishes are made.',
  Library: 'The small stone library, shelves and ledgers.', Dock: 'The wooden dock on the lake, with the boats and watchtowers.', Workshop: "Tobias's carpentry workshop.",
  Cottages: 'Cottage Row, where the village lives.', Woods: 'The Woods, where timber is cut.', Quarry: 'The stone Quarry.', Oracle: 'The ring of standing stones where the Oracle dwells.',
  Meadow: 'The open Meadow, new ground for farms and homes.', Hospital: 'The little whitewashed Hospital, where the sick are treated with herbs.', Cemetery: 'The quiet Cemetery by the lake, where the village buries its dead.' };
const SCENE_ZOOM = { Square: 15, Dock: 14, Cottages: 15, Meadow: 12, Garden: 11, Tavern: 10, Woods: 12, Quarry: 10, Shrine: 9, Cemetery: 9, Library: 8, Bakery: 8, Workshop: 8, Hospital: 8, Oracle: 8 };   // tiles of map across the screen
const SCENE_R = { Square: 6.5, Cottages: 14, Dock: 9, Meadow: 7, Garden: 4.5, Woods: 8, Quarry: 6 };                                                                                  // how far round a place counts as "here"
let sceneAt = null, sceneKey = '', sceneRect = null, sceneRectAt = -1e9;
function placeAt(sx, sy) {
  if (!st) return null; const [wx, wy] = toWorld(sx, sy).map(v => v / T);
  if (((wx - 20.4) / 5.8) ** 2 + ((wy - 13) / 3.4) ** 2 < 1) return 'Square';
  let best = null, bd = 2.3;
  for (const [n, [x, y]] of Object.entries(st.places)) { if (n === 'Square') continue; const d = Math.hypot(wx - x, wy - y - 0.5); if (d < bd) { bd = d; best = n; } }
  return best;
}
function focusPlace(name, fly = true) {
  if (!st || !st.places[name]) return;
  if (selected) select(null);
  sceneAt = name; sceneKey = '';
  if (fly) { const [x, y] = st.places[name]; cam.follow = false; userMoved = true; cam.tz = clamp(vw / ((SCENE_ZOOM[name] || 10) * T), fitZ(), maxZ()); cam.tx = x * T - (vw > 760 ? 176 : 0) / cam.tz; cam.ty = (y + (name === 'Square' ? 1 : 0.4)) * T; clampT(); syncFocus(); }   // the place sits right of the card, not under it
  renderScene(true);
}
function closeScene() { sceneAt = null; sceneRect = null; $('scene').hidden = true; }
function renderScene(force) {
  const box = $('scene'); if (!sceneAt || !st || !st.places[sceneAt]) { box.hidden = true; return; }
  const name = sceneAt, [px, py] = st.places[name], here = st.agents.filter(a => a.place === name), nowMin = st.day * 1440 + st.minute;
  const talk = (st.events || []).filter(e => e.kind === 'turn' && e.place === name && e.say && nowMin - (e.day * 1440 + e.minute) <= 90).slice(-6);
  const built = (st.structures || []).filter(s => s.done && Math.hypot(s.x - px, s.y - py) <= (SCENE_R[name] || 5));
  const key = [name, st.day, st.minute, st.phase, here.map(a => a.name + a.activity + a.say + a.mood + a.thought).join('|'), talk.length && talk[talk.length - 1].id, built.length].join('~');
  if (!force && key === sceneKey) return; sceneKey = key; box.hidden = false;
  const head = el('div', 'sc-head'), sel = el('select'); sel.setAttribute('aria-label', 'Visit a place');
  for (const n of Object.keys(st.places)) { const o = new Option(PLACE_NAME[n] || n, n); o.selected = n === name; sel.append(o); }
  sel.onchange = () => focusPlace(sel.value);
  const x = el('button', 'sc-x', '✕'); x.setAttribute('aria-label', 'Close'); x.onclick = closeScene; head.append(sel, x);
  const parts = [head, el('p', 'sc-desc', PLACE_DESC[name] || '')];
  parts.push(el('h4', null, here.length ? `Here now · ${here.length}` : 'Here now'));
  if (!here.length) parts.push(el('div', 'sc-empty', st.phase === 'night' ? 'Dark and quiet.' : 'Nobody is here.'));
  for (const a of here) {
    const row = el('div', 'sc-row'), who = el('div', 'sc-who'), dot = el('i'), nm = el('b', null, a.name);
    dot.style.background = a.color; nm.onclick = () => select(a.name, true); who.append(dot, nm, el('span', null, a.activity || ''));
    if (a.mood) who.append(el('span', 'sc-mood', a.mood));
    row.append(who);
    if (a.say && (st.now || 0) - a.say_at < 300) row.append(el('div', 'sc-say', `\u201c${a.say}\u201d`));
    if (a.thought && st.phase !== 'night') row.append(el('div', 'sc-think', a.thought));
    parts.push(row);
  }
  if (talk.length) {
    parts.push(el('h4', null, 'The talk here'));
    for (const e of talk) { const l = el('div', 'sc-line'); l.append(el('time', null, hhmm(e.minute)), el('b', null, e.who), el('em', null, e.to ? ` \u2192 ${e.to}: ` : ': '), document.createTextNode(`\u201c${e.say}\u201d`)); parts.push(l); }
  }
  if (built.length) { parts.push(el('h4', null, 'Built nearby')); parts.push(el('div', 'sc-built', [...new Set(built.map(projName))].join(' \u00b7 '))); }
  box.replaceChildren(...parts);
}
$('zscene').onclick = () => { if (sceneAt) closeScene(); else focusPlace('Square'); };

function setWhisperTarget(name) {     // the whisper select holds 'speak:Name' / 'thought:Name', never a bare name
  const sel = $('to'), how = sel.value.startsWith('thought:') ? 'thought' : 'speak', want = name ? `${how}:${name}` : '';
  sel.value = [...sel.options].some(o => o.value === want) ? want : ''; msgHint();
}
function select(name, focus) {
  selected = name || null; setWhisperTarget(selected);
  if (selected && focus) { cam.follow = true; cam.tz = Math.max(cam.tz, Math.min(maxZ(), defaultZ() * 1.7)); userMoved = true; }
  if (!selected) cam.follow = false;
  syncFocus(); renderPeople(true); renderFeed(true);
  if (selected) { const c = $('card-' + selected); if (c && $('people').classList.contains('on')) c.scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' }); }
}
function syncFocus() {
  const f = $('focus'); f.classList.toggle('on', !!selected); if (!selected) return;
  f.querySelector('i').style.background = colorOf(selected); f.querySelector('span').textContent = selected;
  $('follow').setAttribute('aria-pressed', String(!!cam.follow));
}
$('follow').onclick = () => { cam.follow = !cam.follow; if (cam.follow) { cam.tz = Math.max(cam.tz, defaultZ() * 1.4); userMoved = true; } syncFocus(); };
$('unsel').onclick = () => select(null);
