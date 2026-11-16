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
const LOOK = {   // hand-made founders; everyone else is derived from hash(name) in look()
  Mira: { hair: 'braid', accent: 'apron', apron: '#f7f3ea' },
  Tobias: { hair: 'bald+beard', beard: '#b9b9b0', accent: 'apron', apron: '#8a5a32', leather: 1 },
  Isolde: { hair: 'long', accent: 'scarf', scarf: '#b8404f' },
  Bram: { hair: 'short', beard: '#2b1b10', sleeves: 1 },
  Wren: { hair: 'short', cap: '#2f5e5b' },
  Hesper: { hair: 'bun', accent: 'shawl', shawl: '#d9a0b4' },
};
const SKIN = ['#f0c9a0', '#f0c9a0', '#e8b98c', '#d9a678', '#c58c5f', '#9a6a45'], LOOKS = {};
function look(a) {   // cached per name and life stage
  const key = a.name + (a.age < 18 ? 'k' : ''); if (LOOKS[key]) return LOOKS[key];
  const h = hash(a.name), f = a.sex === 'f', kid = a.age < 18, L = { skin: SKIN[h % 6], ...(LOOK[a.name] || {}) };
  if (!LOOK[a.name]) {
    L.hair = f ? (kid ? ['long', 'braid', 'short'][(h >> 3) % 3] : ['long', 'bun', 'braid', 'short'][(h >> 3) % 4]) : kid || a.age < 40 || (h >> 3) % 4 ? 'short' : 'bald+beard';
    if (!f && !kid && (h >> 6) % 3 === 0 && L.hair !== 'bald+beard') L.beard = a.hair;
    if (L.hair === 'bald+beard') L.beard = a.hair;
    const ac = (h >> 9) % 5;
    if (ac === 1 && !kid) { L.accent = 'apron'; L.apron = ['#f7f3ea', '#8a5a32', '#c9b88a'][(h >> 12) % 3]; } else if (ac === 2) { L.accent = 'scarf'; L.scarf = ['#b8404f', '#e0a23a', '#4a8fc2', '#6fa04a'][(h >> 12) % 4]; }
    else if (ac === 3 && f && !kid) { L.accent = 'shawl'; L.shawl = ['#d9a0b4', '#b6c7a4', '#c9b6e0'][(h >> 12) % 3]; }
    else if (ac === 4 && !f && !kid && (h >> 15) % 2) L.cap = ['#7a5a3a', '#4f6b8a', '#6b4f4f'][(h >> 12) % 3];
  }
  return LOOKS[key] = L;
}
function browPoints(brow, d, cx, ey, S) {   // one brow as { outer, inner } points; d = -1 left eye, 1 right. Both eyes mirror: stern (-1) drops the inner ends, worried (1) lifts them
  const bx = cx + d * .3 * S, by = ey - 2.5 * S - (brow === 1 ? .3 * S : 0), tilt = brow * 1.1 * S;
  return { outer: [bx + d * 1.6 * S, by + tilt * .45], inner: [bx - d * 1.5 * S, by - tilt] };
}
const MOOD_KIND = {};      // mood word -> how the face shows it, worked out once per word
function moodKind(m) {
  m = (m || '').toLowerCase(); if (MOOD_KIND[m]) return MOOD_KIND[m];
  const k = /joy|jovial|cheer|glad|content|happy|hopeful|amus|warm|grateful|giddy|playful|relieved|proud|delight|merry|eager|fond|pleased|affection|wry|smug/.test(m) ? { mouth: 'smile', brow: 0 }
    : /sad|grie|mourn|wistful|weary|tired|melanchol|lonely|sorrow|heavy|gloom|bereft|guilt|sore|drained|numb/.test(m) ? { mouth: 'frown', brow: 1 }
    : /irritable|sour|angry|annoyed|grumpy|stern|resolute|determined|stubborn|edgy|fierce|bitter|defiant/.test(m) ? { mouth: 'flat', brow: -1 }
    : /wary|uneasy|fretful|anxious|nervous|worried|afraid|suspic|watchful|tense|restless|jumpy|troubled/.test(m) ? { mouth: 'flat', brow: 1 }
    : { mouth: 'soft', brow: 0 };
  return MOOD_KIND[m] = k;
}
const POSE = {};     // activity text -> what the body does, worked out once per phrase
function poseOf(a) {
  const k = a.activity || ''; if (POSE[k] !== undefined) return POSE[k];
  const m = k.toLowerCase();
  return POSE[k] = /\bladl|\bpouring|\bwiping|\bsweeping|\bkneading|\bhammer|\bplan(e|ing)\b|\bsaw(ing)?\b|\bchop|\bchip|\bhaul|\bdigging|\bmending|\brepair|\bstacking|\bscrub|\bpolish|\bcoiling|\braking|\bweeding|\bplanting|\bcarving|\bmeasuring|\blifting|\bsorting/.test(m) ? 'work'
    : /\bsip|\bdrink|\bale\b|\bcup\b|\bmug\b|\btea\b|\btoast/.test(m) ? 'drink'
    : /\beat|\bchewing|\btasting|\bnibbl|\bmunch|\bsupper|\bbreakfast|\blunch|\bstew\b|\bbowl\b|\bcrust|\bmeal/.test(m) ? 'eat'
    : /\bsit|\bseated|\brest|\bnap|\bdoz|\bwaiting|\blounging|\bperched|\bslumped/.test(m) ? 'sit'
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
function villagerNear(st, pos, wx, wy, z, T = 32, fig = 1.35) {   // the villager under a point in world pixels, or null (nobody can be picked at night)
  if (!st || st.phase === 'night') return null;
  const rad = Math.max(18 * fig, 16 / z); let best = null, bd = rad;
  for (const a of st.agents) { const p = pos[a.name]; if (!p) continue; const d = Math.hypot(p.x * T - wx, p.y * T - 18 * fig - wy); if (d < bd) { bd = d; best = a.name; } }
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
if (typeof module !== 'undefined') module.exports = { browPoints, rgbOf, hexOf, shade, mix, rgbaOf, lumaOf, hhmm, clamp, lerp, rng, hash, distSeg, inLake, sky, viaDepth, VIA, look, moodKind, poseOf, weatherIcon, wrapText, hitsAny, labelRejected, placeNear, villagerNear, sceneData };
