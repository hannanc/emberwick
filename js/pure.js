// Pure helpers: no DOM, no canvas, no page state, so node can load and test them (tests/js/pure.test.js).
// Loaded first; every later script shares these globals.
const VIA = {   // the four roads leave the square to the Cottages, Garden, Dock and Shrine; every other place branches off one of them
  Bakery: 'Cottages', Workshop: 'Cottages', Oracle: 'Bakery', Woods: 'Garden', Tavern: 'Shrine', Quarry: 'Tavern',
  Library: 'Shrine', Hospital: 'Library', Cemetery: 'Hospital', Meadow: 'Shrine', 'East Lane': 'Meadow', 'Far Lane': 'East Lane' };
const viaDepth = p => { let d = 0; for (let q = p; VIA[q] && d < 9; q = VIA[q]) d++; return d; };   // places reached by a branch off another place's path, not straight from the Square
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 7; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 2654435761); return h >>> 0; }
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
function rgbOf(c) {   // '#rgb', '#rrggbb' or 'rgb(r,g,b)' to [r, g, b]; unknown strings read as mid grey
  c = String(c || ''); let m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) return [...m[1]].map(x => parseInt(x + x, 16));
  if ((m = /^#([0-9a-f]{6})/i.exec(c))) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  if ((m = /^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c))) return [+m[1], +m[2], +m[3]];
  return [136, 136, 136];
}
const hexOf = rgb => '#' + rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
const shade = (c, k) => hexOf(rgbOf(c).map(v => k <= 1 ? v * k : v + (255 - v) * (k - 1)));   // k < 1 darker, k > 1 lighter (towards white)
const mix = (c1, c2, k) => { const a = rgbOf(c1), b = rgbOf(c2); return hexOf(a.map((v, i) => lerp(v, b[i], k))); };
const rgbaOf = (c, a) => { const [r, g, b] = rgbOf(c); return `rgba(${r},${g},${b},${a})`; };
const lumaOf = c => { const [r, g, b] = rgbOf(c); return (.3 * r + .59 * g + .11 * b) / 255; };
function distSeg(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1; let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L; t = clamp(t, 0, 1); return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy); }
function inLake(x, y) { return ((x - 20) / 15.5) ** 2 + ((y - 25) / 5.4) ** 2 < 1; }
const SKY = [[0, [72, 84, 140]], [4.6, [72, 84, 140]], [6, [190, 140, 150]], [7, [255, 212, 176]], [8.5, [255, 255, 255]], [17, [255, 255, 255]],
             [18.5, [255, 210, 168]], [19.75, [228, 160, 156]], [21, [112, 108, 166]], [22.4, [72, 84, 140]], [24, [72, 84, 140]]];
function sky(minute, w) {
  const h = (minute / 60) % 24; let i = 0; while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1], k = (h - h0) / (h1 - h0 || 1);
  let c = c0.map((v, j) => lerp(v, c1[j], k));
  const wm = /storm/.test(w) ? [160, 170, 190] : /rain|overcast/.test(w) ? [212, 218, 228] : /haze/.test(w) ? [255, 238, 210] : /mist/.test(w) ? [232, 236, 240] : null;
  if (wm) c = c.map((v, j) => v * wm[j] / 255);
  const lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  return { c: c.map(Math.round), light: clamp((0.86 - lum) * 1.9, 0, 1) };
}
const LOOK = {   // hand-made people; everyone else is derived from the name hash and the job in look(). Anything set here wins over the derived look.
  Mira: { hair: 'braid', accent: 'apron', apron: '#f7f3ea', flour: 1 },
  Tobias: { hair: 'bald+beard', beard: '#b9b9b0', accent: 'apron', apron: '#8a5a32', leather: 1 },
  Isolde: { hair: 'long', accent: 'scarf', scarf: '#b8404f', glasses: 1, book: '#2f5a6a' },
  Bram: { hair: 'short', beard: '#2b1b10', sleeves: 1, accent: 'apron', apron: '#3a2e28', towel: 1 },
  Wren: { hair: 'short', cap: '#2f5e5b', boot: '#c89a2a', net: 1 },
  Hesper: { hair: 'bun', accent: 'shawl', shawl: '#d9a0b4' },
  Ansel: { hair: 'neat', accent: 'waistcoat', glasses: 1, ledger: '#7a3b2e' },
  Odile: { hair: 'short', kerchief: '#b8503a', sleeves: 1, accent: 'apron', apron: '#8c8a84', leather: 1, tool: 'mallet' },
  Garrick: { hair: 'short', beard: null, accent: null, cloak: '#5a4a32', satchel: '#7a5a34', leather: 0, tool: 'axe' },
};
const SKIN = ['#f0c9a0', '#f0c9a0', '#e8b98c', '#d9a678', '#c58c5f', '#9a6a45'], LOOKS = {};
const JOB_KINDS = [[/baker/, 'baker'], [/tavern|brewer|innkeep|publican/, 'tavern'], [/fisher/, 'fisher'], [/librar|scribe|clerk/, 'scribe'], [/bank|treasur|merchant/, 'banker'],
  [/mason|quarr/, 'mason'], [/wood ?cutter|carpent|joiner|wright|lumber/, 'wood'], [/shrine|priest/, 'shrine'], [/garden|herbal|farm|beekeep/, 'garden']];
function jobKind(job) {   // what work a job phrase means for dress: baker, tavern, fisher, scribe, banker, mason, wood, garden, shrine, or 'none' (children and anyone without a trade)
  const j = (job || '').toLowerCase(); for (const [re, k] of JOB_KINDS) if (re.test(j)) return k; return 'none';
}
function look(a) {   // cached per name, life stage and kind of work, so a newcomer who is given a job changes into its clothes
  const kind = a.age < 18 ? 'none' : jobKind(a.job), key = a.name + (a.age < 18 ? 'k' : '') + '|' + kind; if (LOOKS[key]) return LOOKS[key];
  const h = hash(a.name), f = a.sex === 'f', kid = a.age < 18, L = { skin: SKIN[h % 6] };
  L.hair = f ? (kid ? ['long', 'braid', 'short'][(h >>> 3) % 3] : ['long', 'bun', 'braid', 'short'][(h >>> 3) % 4]) : !kid && a.age >= 55 && (h >>> 3) % 3 === 0 ? 'bald+beard' : 'short';   // only the old go bald
  if (!f && !kid && (h >>> 6) % 3 === 0 && L.hair !== 'bald+beard') L.beard = a.hair;
  if (L.hair === 'bald+beard') L.beard = a.hair;
  const pick = (arr, s) => arr[(h >>> s) % arr.length];
  if (kind === 'baker') Object.assign(L, { accent: 'apron', apron: '#f7f3ea', flour: 1 });
  else if (kind === 'tavern') Object.assign(L, { accent: 'apron', apron: '#3a2e28', towel: 1, sleeves: 1 });
  else if (kind === 'fisher') { Object.assign(L, { boot: '#c89a2a', net: 1 }); if (!f && (h >>> 12) % 2) L.cap = '#2f5e5b'; }
  else if (kind === 'scribe') Object.assign(L, { glasses: 1, book: pick(['#2f5a6a', '#5a3a6a', '#3a5a3a'], 12) });
  else if (kind === 'banker') Object.assign(L, { hair: f ? L.hair : 'neat', accent: 'waistcoat', glasses: 1, ledger: '#7a3b2e' });
  else if (kind === 'mason') Object.assign(L, { kerchief: pick(['#b8503a', '#4a6a8a', '#8a6a3a'], 12), sleeves: 1, accent: 'apron', apron: '#8c8a84', leather: 1, tool: 'mallet' });
  else if (kind === 'wood') Object.assign(L, { accent: 'apron', apron: '#8a5a32', leather: 1, tool: 'axe' });
  else if (kind === 'garden') Object.assign(L, { cap: '#d9c07a', accent: 'apron', apron: '#9ab077' });
  else if (kind === 'shrine') Object.assign(L, f ? { hair: 'bun', accent: 'shawl', shawl: pick(['#d9a0b4', '#b6c7a4', '#c9b6e0'], 12) } : {});
  else {   // no trade: a scarf, a shawl or a cap, never an apron
    const ac = (h >>> 9) % 5;
    if (ac === 2) { L.accent = 'scarf'; L.scarf = pick(['#b8404f', '#e0a23a', '#4a8fc2', '#6fa04a'], 12); }
    else if (ac === 3 && f && !kid) { L.accent = 'shawl'; L.shawl = pick(['#d9a0b4', '#b6c7a4', '#c9b6e0'], 12); }
    else if (ac === 4 && !f && !kid && (h >>> 15) % 2) L.cap = pick(['#7a5a3a', '#4f6b8a', '#6b4f4f'], 12);
  }
  return LOOKS[key] = { ...L, ...(LOOK[a.name] || {}) };
}
function browPoints(brow, d, cx, ey, S) {   // one brow as { outer, inner } points; d = -1 left eye, 1 right. Both eyes mirror: stern (-1) drops the inner ends, worried (1) lifts them
  const bx = cx + d * .3 * S, by = ey - 2.5 * S - (brow === 1 ? .3 * S : 0), tilt = brow * 1.1 * S;
  return { outer: [bx + d * 1.6 * S, by + tilt * .45], inner: [bx - d * 1.5 * S, by - tilt] };
}

// ---- the body: proportions per life stage, in figure units (1 unit = S px, S = FIG x stage x height factor); y runs up from the soles
const BODY = {   // r head radius, chin / sh (shoulder line) / hem (tunic hem, where the legs begin) heights, shW / hemW half widths, size = the stage's share of an adult
  adult: { r: 4.7, chin: 26.8, sh: 25.2, hem: 12.6, shW: 5.8, hemW: 6.4, size: 1 },
  kid: { r: 5.6, chin: 21.8, sh: 20.3, hem: 10.2, shW: 5.2, hemW: 5.8, size: .84 },     // bigger head, shorter torso
  baby: { r: 8, chin: 15.6, sh: 14.4, hem: 6.4, shW: 4.8, hemW: 5.4, size: .62 },       // bigger still
};
const stageOf = age => age < 6 ? 'baby' : age < 18 ? 'kid' : 'adult';
const BUILD = {   // founders get fixed builds (hf: height factor, wf: width factor); everyone else gets one from the name hash
  Bram: { hf: 1.03, wf: 1.1 }, Wren: { hf: 1.07, wf: .9 }, Isolde: { hf: .96, wf: .92 }, Odile: { hf: 1, wf: 1.08 },
  Mira: { hf: .98, wf: 1.04 }, Tobias: { hf: 1.02, wf: 1.07 }, Hesper: { hf: .94, wf: .94 },
};
const hairColor = a => a.age > 50 ? mix(a.hair || '#555555', '#d4d2c8', clamp((a.age - 50) / 25, 0, 1) * .92) : a.hair;   // grey creeps in from about 50
function build(a) {   // { hf, wf }: about +-8% height and +-10% width; children vary less; elders are a little shorter (they also stoop)
  const h = hash(a.name), kid = a.age < 18, fx = BUILD[a.name];
  let hf = fx ? fx.hf : 1 + (((h >>> 5) % 17) - 8) / 100 * (kid ? .5 : 1), wf = fx ? fx.wf : 1 + (((h >>> 10) % 21) - 10) / 100 * (kid ? .5 : 1);
  if (a.age >= 65) hf *= .96;
  return { hf, wf };
}
function figMetrics(a, fig) {   // the figure's size on the map in px: S (one unit), stage body table, build, and where the head and the top of it are above the feet
  const st = stageOf(a.age), B = BODY[st], b = build(a), S = fig * B.size * b.hf;
  return { S, B, stage: st, hf: b.hf, wf: b.wf, headY: (B.chin + B.r) * S, top: (B.chin + 2 * B.r) * S };
}
const walkSpeed = a => 2 * (a.hungry >= 2 ? .75 : 1) * (a.sick ? .7 : 1) * (a.age >= 65 ? .85 : 1) * (a.age < 6 ? .8 : 1);   // tiles a second
const strideLen = a => 1.25 * BODY[stageOf(a.age)].size * build(a).hf;   // tiles for one full step cycle (two steps): the feet follow the ground, not the clock
// ---- where people stand: sitters take the benches, everyone else lines up at the place
const SEATS = { Square: [[17.1, 13.21], [17.7, 13.21], [23.0, 13.21], [23.6, 13.21]] };   // the Square's two benches (drawn at 17.4 and 23.3, y 12.9), two seats each; y is where the feet reach the ground
function placeLayout(here, xy, stand, seats, poseFn) {   // here: the agents at one place; returns name -> { x, y, seat } in tiles
  const out = {}, up = []; let si = 0;
  for (const a of here) { if (seats && si < seats.length && poseFn(a) === 'sit') { out[a.name] = { x: seats[si][0], y: seats[si][1], seat: true }; si++; } else up.push(a); }
  up.forEach((a, i) => { out[a.name] = { x: xy[0] + (i - (up.length - 1) / 2) * 1.15, y: xy[1] + stand + (i % 2) * .35, seat: false }; });
  return out;
}
const MOOD_KIND = {};      // mood word -> how the face shows it, worked out once per word
function moodKind(m) {
  m = (m || '').toLowerCase(); if (MOOD_KIND[m]) return MOOD_KIND[m];
  const k = /joy|jovial|cheer|glad|content|happy|hopeful|amus|warm|grateful|giddy|playful|relieved|proud|delight|merry|eager|fond|pleased|affection|wry|smug/.test(m) ? { mouth: 'smile', brow: 0 }
    : /sad|grie|mourn|wistful|weary|tired|melanchol|lonely|sorrow|heavy|gloom|bereft|guilt|sore|drained|numb/.test(m) ? { mouth: 'frown', brow: 1 }
    : /irritable|sour|angry|annoyed|grumpy|stern|resolute|determined|stubborn|edgy|fierce|bitter|defiant/.test(m) ? { mouth: 'flat', brow: -1 }
    : /wary|uneasy|fretful|anxious|nervous|worried|afraid|suspic|watchful|tense|restless|jumpy|troubled/.test(m) ? { mouth: 'flat', brow: 1 }
    : { mouth: 'soft', brow: 0 };
  if (/afraid|terrif|shock|startl|surpris|alarm|fright|panic|horrif|dread/.test(m)) k.wide = true;   // eyes wide open: whites showing
  return MOOD_KIND[m] = k;
}
const POSE = {};     // activity text -> what the body does, worked out once per phrase
function poseOf(a) {
  const k = a.activity || ''; if (POSE[k] !== undefined) return POSE[k];
  const m = k.toLowerCase();
  return POSE[k] = /\bladl|\bpouring|\bwiping|\bsweeping|\bkneading|\bhammer|\bplan(e|ing)\b|\bsaw(ing)?\b|\bchop|\bchip|\bhaul|\bdigging|\bmending|\brepair|\bstacking|\bscrub|\bpolish|\bcoiling|\braking|\bweeding|\bplanting|\bcarving|\bmeasuring|\blifting|\bsorting/.test(m) ? 'work'
    : /\bsip|\bdrink|\bale\b|\bcup\b|\bmug\b|\btea\b|\btoast/.test(m) ? 'drink'
    : /\beat|\bchewing|\btasting|\bnibbl|\bmunch|\bsupper|\bbreakfast|\blunch|\bstew\b|\bbowl\b|\bcrust|\bmeal/.test(m) ? 'eat'
    : /\bsit(ting|s)?\b|\bseated|\bresting|\brests\b|\bnapp?(ing|s)?\b|\bdoz(ing|es)?\b|\blounging|\bperched|\bslumped|\bbench\b|\bstool\b/.test(m) ? 'sit'
    : 'stand';
}
function weatherIcon(w, m) {
  const night = m < 6 * 60 || m >= 20.5 * 60, dawn = m >= 6 * 60 && m < 7.5 * 60, dusk = m >= 18.5 * 60 && m < 20.5 * 60;
  return /storm/.test(w) ? '⛈' : /rain/.test(w) ? '☂' : /mist|haze/.test(w) ? '≋' : /overcast/.test(w) ? '☁' : /windy/.test(w) ? '🍃' : night ? '☾' : dawn ? '🌅' : dusk ? '🌇' : '☀';
}

// ---- extracted so they can be tested without a canvas or the page's globals
function wrapText(text, maxW, width) {   // greedy word wrap; width(s) measures a string
  const lines = []; let cur = '';
  for (const w of text.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (width(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
const hitsAny = (r, occ) => occ.some(o => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y);
function labelRejected(r, o, vw, vh, occ) {   // off screen, outside the margin when o.edge, or on top of an earlier label unless o.force
  return r.x + r.w < 0 || r.x > vw || r.y > vh || r.y + r.h < 0 || !!(o.edge && (r.x < 2 || r.x + r.w > vw - 2 || r.y < 2 || r.y + r.h > vh - 2)) || (!o.force && hitsAny(r, occ));
}
function placeNear(places, wx, wy) {   // which place a point (in tiles) belongs to: the Square's ellipse, else the nearest place within 2.3 tiles
  if (((wx - 20.4) / 5.8) ** 2 + ((wy - 13) / 3.4) ** 2 < 1) return 'Square';
  let best = null, bd = 2.3;
  for (const [n, [x, y]] of Object.entries(places)) { if (n === 'Square') continue; const d = Math.hypot(wx - x, wy - y - 0.5); if (d < bd) { bd = d; best = n; } }
  return best;
}
function villagerNear(st, pos, wx, wy, z, T = 32, fig = 1.35) {   // the villager under a point in world pixels, or null, nearest by the middle of each body (nobody can be picked at night)
  if (!st || st.phase === 'night') return null;
  const rad = Math.max(18 * fig, 16 / z); let best = null, bd = rad;
  for (const a of st.agents) { const p = pos[a.name]; if (!p) continue; const d = Math.hypot(p.x * T - wx, p.y * T - figMetrics(a, fig).top / 2 - wy); if (d < bd) { bd = d; best = a.name; } }
  return best;
}
function sceneData(st, name, radius) {   // who is in a place, what was said there in the last 90 minutes, what stands nearby
  const [px, py] = st.places[name], nowMin = st.day * 1440 + st.minute;
  return {
    here: st.agents.filter(a => a.place === name),
    talk: (st.events || []).filter(e => e.kind === 'turn' && e.place === name && e.say && nowMin - (e.day * 1440 + e.minute) <= 90).slice(-6),
    built: (st.structures || []).filter(s => s.done && Math.hypot(s.x - px, s.y - py) <= (radius || 5)),
  };
}
if (typeof module !== 'undefined') module.exports = { hairColor, SEATS, placeLayout, jobKind, LOOK, BODY, stageOf, build, figMetrics, walkSpeed, strideLen, browPoints, rgbOf, hexOf, shade, mix, rgbaOf, lumaOf, hhmm, clamp, lerp, rng, hash, distSeg, inLake, sky, viaDepth, VIA, look, moodKind, poseOf, weatherIcon, wrapText, hitsAny, labelRejected, placeNear, villagerNear, sceneData };
