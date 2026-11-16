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
function placeAt(sx, sy) { if (!st) return null; const [wx, wy] = toWorld(sx, sy).map(v => v / T); return placeNear(st.places, wx, wy); }
function focusPlace(name, fly = true) {
  if (!st || !st.places[name]) return;
  if (selected) select(null);
  sceneAt = name; sceneKey = '';
  if (fly) { const [x, y] = st.places[name]; cam.follow = false; userMoved = true; cam.tz = clamp(vw / ((SCENE_ZOOM[name] || 10) * T), fitZ(), maxZ()); cam.tx = x * T - (vw > 760 ? 176 : 0) / cam.tz; cam.ty = (y + (name === 'Square' ? 1 : 0.4)) * T; clampT(); syncFocus(); }   // the place sits right of the card, not under it
  renderScene(true);
}
function closeScene() { sceneAt = null; sceneRect = null; $('scene').hidden = true; }
// A cut-away of the room for the scene card: the Tavern, Library and Bakery, with whoever is there drawn in it by person().
const INTERIOR_W = 314, INTERIOR_H = 112;
const INTERIORS = {
  Tavern(g, r) {   // plank wall, a window, a shelf of casks, a hanging lamp and the bar with mugs
    g.fillStyle = '#5a3d27'; g.fillRect(0, 0, INTERIOR_W, 98); for (let x = 0; x < INTERIOR_W; x += 22) { g.fillStyle = x % 44 ? 'rgba(0,0,0,.14)' : 'rgba(255,200,140,.05)'; g.fillRect(x, 0, 22, 98); }
    g.fillStyle = '#2a3a52'; g.fillRect(238, 14, 44, 38); g.fillStyle = '#7fa6d0'; g.fillRect(241, 17, 17.5, 32); g.fillRect(261.5, 17, 17.5, 32); g.strokeStyle = '#3a2616'; g.lineWidth = 3; g.strokeRect(238, 14, 44, 38);
    g.fillStyle = '#3a2616'; g.fillRect(14, 26, 120, 5);   // the cask shelf
    for (let i = 0; i < 4; i++) { const x = 30 + i * 28; g.fillStyle = '#8a5a30'; g.beginPath(); g.ellipse(x, 17, 11, 10, 0, 0, 7); g.fill(); g.strokeStyle = '#3a2616'; g.lineWidth = 1.5; g.stroke(); for (const d of [-5, 5]) { g.beginPath(); g.moveTo(x + d, 8); g.lineTo(x + d, 26); g.stroke(); } g.fillStyle = '#c9a860'; g.fillRect(x - 1.5, 14, 3, 4); }
    g.strokeStyle = '#2a1c10'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(180, 0); g.lineTo(180, 22); g.stroke(); g.fillStyle = '#f2d48a'; g.beginPath(); g.arc(180, 28, 6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,210,120,.18)'; g.beginPath(); g.arc(180, 28, 26, 0, 7); g.fill();
    g.fillStyle = '#6a4326'; g.fillRect(0, 98, INTERIOR_W, 14);
    r.front = () => { g.fillStyle = '#7a4f2c'; g.fillRect(8, 74, 150, 38); g.fillStyle = '#a06b3a'; g.fillRect(4, 70, 158, 7); for (const x of [30, 70, 120]) { g.fillStyle = '#e8d8a8'; g.fillRect(x, 60, 7, 10); g.fillStyle = '#fff6dc'; g.fillRect(x, 60, 7, 3); } };
    r.spots = [[184, 100], [214, 98], [244, 100], [274, 98], [170, 100], [300, 100]];
  },
  Library(g, r) {   // two tall bookcases, a window and a reading table
    g.fillStyle = '#4a3a2e'; g.fillRect(0, 0, INTERIOR_W, 98); g.fillStyle = '#2a2a38'; g.fillRect(0, 98, INTERIOR_W, 14);
    const q = rng(55), cols = ['#8c3a3a', '#3a5a8c', '#3f7a4a', '#c9a24a', '#6a3a7a', '#d8cdb0', '#a8562e'];
    for (const x0 of [8, 196]) { g.fillStyle = '#2e2018'; g.fillRect(x0, 6, 110, 92); for (let row = 0; row < 4; row++) { const y = 12 + row * 21; g.fillStyle = '#4a3322'; g.fillRect(x0 + 3, y + 17, 104, 3);
      for (let x = x0 + 6; x < x0 + 104;) { const w = 3 + q() * 4, h = 11 + q() * 6; g.fillStyle = cols[Math.floor(q() * cols.length)]; g.fillRect(x, y + 17 - h, w, h); x += w + .6; } } }
    g.fillStyle = '#8aa6c6'; g.fillRect(138, 14, 44, 44); g.strokeStyle = '#2e2018'; g.lineWidth = 3; g.strokeRect(138, 14, 44, 44); g.beginPath(); g.moveTo(160, 14); g.lineTo(160, 58); g.moveTo(138, 36); g.lineTo(182, 36); g.stroke();
    r.front = () => { g.fillStyle = '#6a4a2e'; g.fillRect(128, 80, 64, 5); g.fillRect(132, 85, 4, 27); g.fillRect(184, 85, 4, 27); g.fillStyle = '#8c3a3a'; g.fillRect(142, 75, 14, 5); g.fillStyle = '#f2ead6'; g.fillRect(164, 76, 12, 4); };
    r.spots = [[40, 100], [78, 98], [226, 100], [262, 98], [296, 100], [18, 98]];
  },
  Bakery(g, r) {   // brick wall, a glowing oven, a shelf of loaves and a floury counter
    g.fillStyle = '#9a6a4a'; g.fillRect(0, 0, INTERIOR_W, 98); for (let y = 0; y < 98; y += 10) for (let x = (y / 10) % 2 ? -12 : 0; x < INTERIOR_W; x += 24) { g.strokeStyle = 'rgba(60,30,18,.28)'; g.lineWidth = 1; g.strokeRect(x, y, 24, 10); }
    g.fillStyle = '#4a3a30'; g.fillRect(0, 98, INTERIOR_W, 14);
    g.fillStyle = '#6a5a52'; g.beginPath(); g.roundRect(196, 28, 100, 72, [50, 50, 0, 0]); g.fill(); g.fillStyle = '#1e1410'; g.beginPath(); g.roundRect(214, 50, 64, 50, [32, 32, 0, 0]); g.fill();
    const fire = g.createRadialGradient(246, 92, 2, 246, 88, 36); fire.addColorStop(0, '#ffe08a'); fire.addColorStop(.5, '#f0802a'); fire.addColorStop(1, 'rgba(160,40,10,0)'); g.fillStyle = fire; g.beginPath(); g.roundRect(214, 50, 64, 50, [32, 32, 0, 0]); g.fill();
    g.fillStyle = '#3a2616'; g.fillRect(14, 30, 100, 4); for (let i = 0; i < 5; i++) { g.fillStyle = '#d9a35a'; g.beginPath(); g.ellipse(28 + i * 20, 26, 8, 5, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,70,20,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(25 + i * 20, 23); g.lineTo(27 + i * 20, 28); g.moveTo(30 + i * 20, 23); g.lineTo(32 + i * 20, 28); g.stroke(); }
    r.front = () => { g.fillStyle = '#7a5230'; g.fillRect(8, 78, 118, 34); g.fillStyle = '#e6c488'; g.fillRect(4, 74, 126, 6); g.fillStyle = 'rgba(255,255,255,.7)'; for (const x of [30, 62, 96]) { g.beginPath(); g.ellipse(x, 73, 6, 1.6, 0, 0, 7); g.fill(); } };
    r.spots = [[148, 100], [176, 98], [14, 100], [300, 100], [160, 100], [136, 98]];
  },
};
function interiorStrip(name, here) {   // a canvas for a place that has a room, or null
  if (!INTERIORS[name]) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), c = document.createElement('canvas'); c.className = 'sc-room'; c.width = INTERIOR_W * dpr; c.height = INTERIOR_H * dpr;
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', `Inside ${PLACE_NAME[name] || name}${here.length ? `: ${here.map(a => a.name).join(', ')}` : ''}`);
  const g = c.getContext('2d'), r = {}; g.scale(dpr, dpr); INTERIORS[name](g, r);
  const k = 1.7, drawn = here.slice(0, r.spots.length); g.save(); g.beginPath(); g.rect(0, 0, INTERIOR_W, INTERIOR_H); g.clip();
  drawn.forEach((a, i) => { const [sx, sy] = r.spots[i]; g.save(); g.translate(sx, sy); g.scale(k, k); person(a, { x: 0, y: 0, face: sx < INTERIOR_W / 2 ? 1 : -1, walking: false, route: [] }, 0, g); g.restore(); });
  r.front(); g.restore();
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, INTERIOR_W, 3); if (st.phase === 'night' || st.minute >= 1140) { g.fillStyle = `rgba(20,24,60,${st.phase === 'night' ? .4 : .18})`; g.fillRect(0, 0, INTERIOR_W, INTERIOR_H); }
  return c;
}
function renderScene(force) {
  const box = $('scene'); if (!sceneAt || !st || !st.places[sceneAt]) { box.hidden = true; return; }
  const name = sceneAt, { here, talk, built } = sceneData(st, name, SCENE_R[name]);
  const key = [name, st.day, st.minute, st.phase, here.map(a => a.name + a.activity + a.say + a.mood + a.thought).join('|'), talk.length && talk[talk.length - 1].id, built.length].join('~');
  if (!force && key === sceneKey) return; sceneKey = key; box.hidden = false;
  const head = el('div', 'sc-head'), sel = el('select'); sel.setAttribute('aria-label', 'Visit a place');
  for (const n of Object.keys(st.places)) { const o = new Option(PLACE_NAME[n] || n, n); o.selected = n === name; sel.append(o); }
  sel.onchange = () => focusPlace(sel.value);
  const x = el('button', 'sc-x', '✕'); x.setAttribute('aria-label', 'Close'); x.onclick = closeScene; head.append(sel, x);
  const room = interiorStrip(name, here), parts = room ? [head, room, el('p', 'sc-desc', PLACE_DESC[name] || '')] : [head, el('p', 'sc-desc', PLACE_DESC[name] || '')];
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
