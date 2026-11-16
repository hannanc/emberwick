// ================================================================ dynamic world
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
const PROPS = { Woods: 'axe', Dock: 'rod', Garden: 'basket', Bakery: 'loaf', Library: 'book', Quarry: 'pick', Cemetery: 'flowers' };
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
function drawFace(g, o) {   // eyes with whites and pupils, brows, a nose and a mouth that follows the mood and moves when speaking
  const { a, S, hx, hy, r, f, t, talking, hurt, baby, beard, skin, h } = o, k = moodKind(a.mood), af = Math.abs(f);
  const ex = hx + f * 2.6 * S, es = 2.15 * S * (1 - .3 * af), ey = hy + .3 * S, blink = !REDUCE && ((t / 1000 + h % 5) % 4.3) < .13;
  const ew = (baby ? 1.7 : 1.45) * S, eh = (blink ? .25 : (baby ? 1.7 : 1.35)) * S;
  for (const d of [-1, 1]) {
    const cx = ex + d * es;
    g.fillStyle = '#f7f2e8'; g.beginPath(); g.ellipse(cx, ey, ew, eh, 0, 0, 7); g.fill();
    if (!blink) { g.fillStyle = '#1f1812'; g.beginPath(); g.arc(cx + f * .5 * S, ey + .1 * S, .8 * S, 0, 7); g.fill(); }
    if (!baby && !hurt) {   // brows: inner ends down when stern, up when worried
      const bx = cx + d * .3 * S, by = ey - 2.5 * S - (k.brow === 1 ? .3 * S : 0), tilt = k.brow * 1.1 * S;
      g.strokeStyle = a.hair && a.age >= 60 ? '#cfcfc8' : 'rgba(40,28,20,.8)'; g.lineWidth = 1 * S; g.beginPath(); g.moveTo(bx - d * 1.5 * S, by + tilt * (d < 0 ? 1 : 1) * -d * .5 + tilt * .35); g.lineTo(bx + d * 1.6 * S, by - tilt * .55); g.stroke();
    }
  }
  const nx = hx + f * 3.4 * S, ny = hy + 2.2 * S; g.strokeStyle = 'rgba(120,70,50,.45)'; g.lineWidth = .9; g.beginPath(); g.moveTo(nx - f * .2 * S, ny - .8 * S); g.lineTo(nx + (f || .4) * .8 * S, ny + .6 * S); g.stroke();   // a nose, turned the way they face
  const mx = hx + f * 2.2 * S, my = hy + 4 * S;
  if (talking) { const open = .5 + .5 * Math.sin(t / 85 + h); g.fillStyle = '#5a2a22'; g.beginPath(); g.ellipse(mx, my + .2 * S, (1.5 - .3 * af) * S, (.5 + open * 1.5) * S, 0, 0, 7); g.fill(); }
  else if (!beard && !hurt) {
    g.strokeStyle = 'rgba(130,55,45,.8)'; g.lineWidth = 1; g.beginPath();
    if (k.mouth === 'smile') g.arc(mx, my - 1.3 * S, 2.2 * S, .18 * Math.PI, .82 * Math.PI);
    else if (k.mouth === 'frown') g.arc(mx, my + 2.6 * S, 2 * S, 1.2 * Math.PI, 1.8 * Math.PI);
    else if (k.mouth === 'soft') g.arc(mx, my - .5 * S, 1.8 * S, .2 * Math.PI, .8 * Math.PI);
    else { g.moveTo(mx - 1.7 * S, my + .5 * S); g.lineTo(mx + 1.7 * S, my + .5 * S); }
    g.stroke();
  }
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
function person(a, p, t) {
  const S = 1.35 * (a.age < 6 ? .62 : a.age < 18 ? .84 : 1), x = p.x * T, base = p.y * T, step = p.walking ? Math.sin(t / 95) : 0, h = hash(a.name), g = ctx, L = look(a);
  const standing = !p.walking && !p.route.length, pose = standing ? poseOf(a) : 'walk', sit = pose === 'sit';
  const breath = p.walking || REDUCE ? 0 : Math.sin(t / 900 + h % 100) * 0.5, y = base - (p.walking ? Math.abs(step) * 2.5 : 0) + breath + (sit ? 3.2 * S : 0);
  const now = Date.now() / 1000 + skew, old = a.age >= 65, baby = a.age < 6, hurt = a.sick;
  let f = p.face || 0;   // which way the face points: -1 left, 0 front, 1 right
  if (!p.walking) {
    f = 0; const o = a.say_to && now - a.say_at < 26 && st.agents.find(q => q.name === a.say_to), op = o && o.place === a.place && pos[o.name];
    if (op && Math.abs(op.x - p.x) > .05) f = Math.sign(op.x - p.x);
    else if (!REDUCE) { const ph = t / 1000 + h % 7; if (ph % 6 < .9) f = (Math.floor(ph / 6) + h) & 1 ? 1 : -1; }   // now and then a glance to the side
  }
  const lean = old ? 1.5 * S * (f || p.face || 1) : 0, hx = x + lean + f * .5 * S, hy = y - 26 * S, r = (baby ? 8.2 : a.age < 18 ? 6.4 : 5.7) * S, skin = hurt ? '#e2dac2' : L.skin, line = 'rgba(30,22,16,.4)', ST = baby ? 1 : a.age < 18 ? 1.04 : 1.14;      // ST: grown-ups are drawn a little taller
  const prop = !p.walking && !p.route.length && PROPS[a.place], hairC = a.hair;
  shadow(g, x - 2, base + 1, 11 * S, 4 * S, .3);
  if (selected === a.name) { const k = 1 + Math.sin(t / 300) * 0.08; g.strokeStyle = '#e8bd5f'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, base + 1, 17 * S * k, 7.5 * S * k, 0, 0, 7); g.stroke(); }
  else if (hover === a.name) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, base + 1, 15 * S, 6.5 * S, 0, 0, 7); g.stroke(); }
  if (hurt) { const k = REDUCE ? .6 : .5 + .3 * Math.sin(t / 700 + h % 9); g.fillStyle = `rgba(140,215,120,${.16 * k})`; g.beginPath(); g.ellipse(x, base - 15 * S, 15 * S, 25 * S, 0, 0, 7); g.fill(); g.fillStyle = `rgba(140,215,120,${.2 * k})`; g.beginPath(); g.ellipse(x, base + 1, 13 * S, 5 * S, 0, 0, 7); g.fill(); }   // a faint green aura while ill
  g.lineWidth = 1.3; g.lineJoin = 'round'; g.lineCap = 'round';
  g.save(); g.translate(0, base); g.scale(1, ST); g.translate(0, -base);      // the figure itself, stretched up from the feet
  if (old) { const sx = x - (f || p.face || 1) * 10.5 * S; g.strokeStyle = '#6b4a2e'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(sx + (f || 1) * 1.6 * S, y - 12 * S + 0); g.lineTo(sx, y - 11 * S); g.lineTo(sx, base + .5); g.stroke(); g.lineWidth = 1.3; }   // walking stick
  if (L.hair === 'long') { g.fillStyle = hairC; g.strokeStyle = line; g.beginPath(); g.roundRect(hx - r - .9 * S, hy - r * .55, 2 * r + 1.8 * S, 15 * S, [r, r, 3 * S, 3 * S]); g.fill(); g.stroke(); }   // hair falling behind the shoulders
  g.fillStyle = L.leather ? '#4a3626' : '#3a3029';                                                               // legs and feet
  if (!sit) { g.fillRect(x - 5 * S + step * 1.5, y - 7 * S, 3.6 * S, 6 * S); g.fillRect(x + 1.4 * S - step * 1.5, y - 7 * S, 3.6 * S, 6 * S); }
  else { const dr = f || p.face || 1, x0 = dr > 0 ? x - 1.5 * S : x - 9 * S; g.fillRect(x0, y - 4.8 * S, 10.5 * S, 3.4 * S); g.fillRect(dr > 0 ? x + 5.6 * S : x - 8.9 * S, y - 4.8 * S, 3.4 * S, 7.2 * S); }   // seated: thighs forward, shins down
  g.fillStyle = '#241c17'; if (!sit) for (const [dx, st2] of [[-3.2, 1], [3.2, -1]]) { g.beginPath(); g.ellipse(x + dx * S + st2 * step * 1.5 + f * 1.2 * S, y - .6 * S, 2.7 * S, 1.6 * S, 0, 0, 7); g.fill(); }
  else { const dr = f || p.face || 1; g.beginPath(); g.ellipse(x + dr * 8 * S, y + 2.2 * S, 2.7 * S, 1.6 * S, 0, 0, 7); g.fill(); }
  const dress = a.sex === 'f' && a.age >= 6, hem = dress ? 7.8 : 6.4, bot = dress ? 3.6 : 4.6;   // tapered torso: shoulders wider than waist
  const torso = () => { g.beginPath(); g.moveTo(x - 6.6 * S, y - 21.4 * S); g.lineTo(x + 6.6 * S, y - 21.4 * S); g.quadraticCurveTo(x + 9.2 * S, y - 21.2 * S, x + 8.6 * S, y - 18 * S);
    g.lineTo(x + 6.2 * S, y - 9 * S); g.lineTo(x + hem * S, y - bot * S); g.lineTo(x - hem * S, y - bot * S); g.lineTo(x - 6.2 * S, y - 9 * S); g.lineTo(x - 8.6 * S, y - 18 * S); g.quadraticCurveTo(x - 9.2 * S, y - 21.2 * S, x - 6.6 * S, y - 21.4 * S); g.closePath(); };
  const arm = (d, hand) => {   // d = -1 left, 1 right; hand = [dx, dy] of the hand from the shoulder
    const sx = x + d * 8.2 * S, sy = y - 19.4 * S, ex = sx + hand[0] * S, ey = sy + hand[1] * S;
    g.strokeStyle = line; g.lineWidth = 3.9 * S + 1.3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = a.color; g.lineWidth = 3.9 * S; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    if (L.sleeves) { g.strokeStyle = skin; g.lineWidth = 3.3 * S; g.beginPath(); g.moveTo(sx + (ex - sx) * .45, sy + (ey - sy) * .45); g.lineTo(ex, ey); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(sx + (ex - sx) * .42 - 1.5 * S, sy + (ey - sy) * .45); g.lineTo(sx + (ex - sx) * .42 + 1.5 * S, sy + (ey - sy) * .45); g.stroke(); }
    g.fillStyle = skin; g.beginPath(); g.arc(ex, ey + .6 * S, 1.9 * S, 0, 7); g.fill(); return [ex, ey + .6 * S];
  };
  g.fillStyle = a.color; torso(); g.fill();
  g.save(); torso(); g.clip(); { const tg = g.createLinearGradient(x - 9 * S, 0, x + 9 * S, 0); tg.addColorStop(0, 'rgba(255,255,255,.16)'); tg.addColorStop(.55, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = tg; g.fillRect(x - 10 * S, y - 23 * S, 20 * S, 22 * S); }
  if (L.accent === 'apron') {   // apron over the lower body, with straps
    g.fillStyle = L.apron; g.beginPath(); g.roundRect(x - 5.2 * S, y - 16.5 * S, 10.4 * S, 13 * S, 2 * S); g.fill(); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + .5 * S, y - 16.5 * S, 5 * S, 13 * S);
    g.strokeStyle = L.leather ? '#5a3a1c' : 'rgba(150,140,120,.8)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x - 3.6 * S, y - 16.5 * S); g.lineTo(x - 5 * S, y - 21.4 * S); g.moveTo(x + 3.6 * S, y - 16.5 * S); g.lineTo(x + 5 * S, y - 21.4 * S); g.stroke();
    g.fillStyle = L.leather ? '#6e4624' : 'rgba(0,0,0,.1)'; g.fillRect(x - 3 * S, y - 12.5 * S, 6 * S, 3.4 * S);
  }
  g.restore(); g.strokeStyle = line; g.lineWidth = 1.3; torso(); g.stroke();
  const wl = [step * 1.2 - 1.2, 8.8 - step * 2.2], wr = [-step * 1.2 + 1.2, 8.8 + step * 2.2];   // arms swing against the legs
  if (prop === 'book') { wl[0] = 3.5; wl[1] = 6; wr[0] = -3.5; wr[1] = 6; }
  const talking = standing && !!a.say && now - a.say_at < 5.5, sw = REDUCE ? .4 : Math.sin(t / 190 + h);
  if (standing && !prop && (pose === 'eat' || pose === 'drink')) { const k = REDUCE ? .7 : (Math.sin(t / 520 + h) + 1) / 2; wr[0] += (-5.4 + (f || 1) * 2.4 - wr[0]) * k; wr[1] += (-2.8 - wr[1]) * k; }   // the hand goes to the mouth and back
  else if (standing && !prop && pose === 'work') { wr[0] = 3.5 + sw * 3; wr[1] = 3.5 + (sw + 1) * 3.6 - 6; }                  // the working arm swings
  else if (standing && !prop && talking) { wl[0] = -2.6 + sw * 2.2; wl[1] = 5.5 + Math.sin(t / 240 + h) * 3; }              // a hand gestures while they speak
  arm(-1, wl); const [hx2, hy2] = arm(1, wr);
  if (standing && !prop && pose === 'drink') { g.fillStyle = '#b98a50'; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(hx2 - 2.4 * S, hy2 - 3.6 * S, 4.8 * S, 5 * S, 1 * S); g.fill(); g.stroke(); g.fillStyle = '#f4efe0'; g.fillRect(hx2 - 2.4 * S, hy2 - 3.9 * S, 4.8 * S, 1.3 * S); }       // a mug
  else if (standing && !prop && pose === 'eat') { g.fillStyle = '#d9a35a'; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.ellipse(hx2, hy2 - 1 * S, 3 * S, 1.9 * S, -.2, 0, 7); g.fill(); g.stroke(); }   // a piece of bread
  else if (standing && !prop && pose === 'work') { const up = -(sw + 1) * .5; g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(hx2, hy2 + 1.5 * S); g.lineTo(hx2 + (f || 1) * 2.4 * S, hy2 - (6 + up * 2) * S); g.stroke(); g.fillStyle = '#9aa0a6'; g.beginPath(); g.roundRect(hx2 + (f || 1) * 2.4 * S - 2.6 * S, hy2 - (7.4 + up * 2) * S, 5.2 * S, 2.2 * S, .6 * S); g.fill(); }   // a tool in the swinging hand
  if (L.accent === 'shawl') {   // shawl draped over the shoulders, point at the chest
    g.fillStyle = L.shawl; g.strokeStyle = line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 9.6 * S, y - 19.6 * S); g.quadraticCurveTo(x - 7 * S, y - 22.6 * S, x, y - 22.4 * S); g.quadraticCurveTo(x + 7 * S, y - 22.6 * S, x + 9.6 * S, y - 19.6 * S);
    g.lineTo(x + 6.4 * S, y - 13 * S); g.lineTo(x, y - 8.5 * S); g.lineTo(x - 6.4 * S, y - 13 * S); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - 5.6 * S + i * 2.8 * S, y - 13 * S + Math.abs(i - 2) * -1.3 * S - 1.6 * S + 3.4 * S, .8 * S, 0, 7); g.fill(); }
  }
  if (L.accent === 'scarf') { g.fillStyle = L.scarf; g.strokeStyle = line; g.lineWidth = 1.1; g.beginPath(); g.roundRect(x - 6.2 * S, y - 22.4 * S, 12.4 * S, 3.6 * S, 1.8 * S); g.fill(); g.stroke(); g.beginPath(); g.roundRect(x + 2 * S, y - 20 * S, 3.2 * S, 7 * S, 1.2 * S); g.fill(); g.stroke(); }   // scarf with a hanging tail
  // head: back of the braid / bun first, then face, then hair in front
  if (L.hair === 'braid') { g.fillStyle = hairC; g.strokeStyle = line; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(hx - 6.6 * S - i * .15 * S, hy + (5 + i * 3.2) * S, 2.3 * S, 2.1 * S, 0, 0, 7); g.fill(); g.stroke(); } g.fillStyle = '#e0a23a'; g.beginPath(); g.arc(hx - 7.1 * S, hy + 17.6 * S, 1.3 * S, 0, 7); g.fill(); }
  g.strokeStyle = line; g.lineWidth = 1.3; g.fillStyle = skin; g.beginPath(); g.arc(hx, hy, r, 0, 7); g.fill(); g.stroke();
  if (hurt) { g.fillStyle = 'rgba(150,200,130,.16)'; g.beginPath(); g.arc(hx, hy, r - .7, 0, 7); g.fill(); }
  const er = (baby ? 1.5 : 1.25) * S, ex = hx + f * 3 * S, es = 2.5 * S * (1 - .3 * Math.abs(f)), ey = hy + .9 * S;   // eyes follow the facing direction
  if (L.hair === 'bald+beard') { g.fillStyle = hairC; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(hx + d * (r - .5 * S), hy - 1.2 * S, 1.8 * S, 3.4 * S, 0, 0, 7); g.fill(); } }
  else {
    g.fillStyle = hairC; g.beginPath(); g.arc(hx, hy - 1.5 * S, r + .4 * S, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    if (L.hair === 'long' || L.hair === 'braid') { g.beginPath(); g.ellipse(hx + (f > 0 ? -1 : 1) * r * .65, hy - 2.4 * S, r * .38, 2.8 * S, 0, 0, 7); g.fill(); }   // fringe swept to one side
    if (L.hair === 'bun') { g.strokeStyle = line; g.lineWidth = 1.1; g.beginPath(); g.arc(hx, hy - r - 1.3 * S, 3.6 * S, 0, 7); g.fill(); g.stroke(); }
  }
  if (L.beard && a.age >= 18) { g.fillStyle = L.beard; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - r * .98, hy + 1.6 * S); g.quadraticCurveTo(hx - r * 1.05, hy + r + 2.4 * S, hx, hy + r + 2.8 * S); g.quadraticCurveTo(hx + r * 1.05, hy + r + 2.4 * S, hx + r * .98, hy + 1.6 * S); g.quadraticCurveTo(hx, hy + 3.4 * S, hx - r * .98, hy + 1.6 * S); g.fill(); g.stroke(); }
  drawFace(g, { a, S, hx, hy, r, f, t, talking, hurt, baby, beard: !!(L.beard && a.age >= 18), skin, h });
  if (L.cap && a.age >= 6) {   // cap with a brim towards the facing direction
    g.fillStyle = L.cap; g.strokeStyle = line; g.lineWidth = 1.1; g.beginPath(); g.arc(hx, hy - 1.2 * S, r + .8 * S, Math.PI * 1.0, Math.PI * 2); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(hx - r - 1.2 * S + f * 2.5 * S, hy - 2.4 * S, 2 * r + 2.4 * S, 2.4 * S, 1.2 * S); g.fill(); g.stroke();
  }
  if (prop) {   // what they hold, only while standing at that place
    const px = hx2, py = hy2; g.lineWidth = 1.2; g.strokeStyle = line;
    if (prop === 'axe') { g.strokeStyle = '#6b4a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - .5 * S, py + 4 * S); g.lineTo(px + 3 * S, py - 12 * S); g.stroke(); g.fillStyle = '#aeb4ba'; g.beginPath(); g.moveTo(px + 2.4 * S, py - 12.4 * S); g.lineTo(px + 8 * S, py - 13.4 * S); g.lineTo(px + 7 * S, py - 7.4 * S); g.lineTo(px + 3.4 * S, py - 8.4 * S); g.closePath(); g.fill(); g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
    else if (prop === 'rod') { g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px - 1 * S, py + 2 * S); g.lineTo(px + 15 * S, py - 20 * S); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .8; g.beginPath(); g.moveTo(px + 15 * S, py - 20 * S); g.lineTo(px + 17 * S, py - 6 * S); g.stroke(); g.fillStyle = '#d9604a'; g.beginPath(); g.arc(px + 17 * S, py - 5 * S, 1.2 * S, 0, 7); g.fill(); }
    else if (prop === 'basket') { g.fillStyle = '#6fbf5a'; g.beginPath(); g.arc(px - 1.5 * S, py - .5 * S, 2 * S, 0, 7); g.arc(px + 2 * S, py - 1 * S, 2 * S, 0, 7); g.fill(); g.fillStyle = '#b98a50'; g.beginPath(); g.roundRect(px - 5 * S, py + .4 * S, 10 * S, 5.4 * S, [0, 0, 3 * S, 3 * S]); g.fill(); g.stroke(); g.strokeStyle = 'rgba(80,50,20,.5)'; g.beginPath(); g.moveTo(px - 4 * S, py + 3 * S); g.lineTo(px + 4 * S, py + 3 * S); g.stroke(); }
    else if (prop === 'loaf') { g.fillStyle = '#d9a35a'; g.beginPath(); g.ellipse(px, py + 1 * S, 5.2 * S, 2.8 * S, -.15, 0, 7); g.fill(); g.stroke(); g.strokeStyle = 'rgba(120,70,20,.7)'; g.beginPath(); for (const d of [-2.2, 0, 2.2]) { g.moveTo(px + d * S - .8 * S, py + .2 * S); g.lineTo(px + d * S + .8 * S, py + 1.8 * S); } g.stroke(); }
    else if (prop === 'book') { g.fillStyle = '#8c3a3a'; g.beginPath(); g.roundRect(x - 4.8 * S, y - 13.5 * S, 9.6 * S, 6.6 * S, 1 * S); g.fill(); g.stroke(); g.fillStyle = '#f2ead6'; g.fillRect(x - 4 * S, y - 12.7 * S, 7.8 * S, 1 * S); g.fillStyle = skin; g.beginPath(); g.arc(x - 4.8 * S, y - 10 * S, 1.9 * S, 0, 7); g.arc(x + 4.8 * S, y - 10 * S, 1.9 * S, 0, 7); g.fill(); }
    else if (prop === 'pick') { g.strokeStyle = '#6b4a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - .5 * S, py + 4 * S); g.lineTo(px + 3.5 * S, py - 11 * S); g.stroke(); g.strokeStyle = '#9aa0a6'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(px - 3 * S, py - 11 * S); g.quadraticCurveTo(px + 3.5 * S, py - 15 * S, px + 10 * S, py - 10 * S); g.stroke(); }
    else if (prop === 'flowers') { g.strokeStyle = '#4f8a3c'; g.lineWidth = 1.2; g.beginPath(); for (const d of [-2, 0, 2]) { g.moveTo(px + d * .5 * S, py + 1 * S); g.lineTo(px + d * S, py - 5 * S); } g.stroke(); ['#f4e36b', '#e98bb0', '#f6f2ea'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(px + (i - 1) * 2 * S, py - 5.6 * S - (i % 2) * S, 1.6 * S, 0, 7); g.fill(); }); }
  }
  g.restore();
  if (cam.z < 0.8) { const pr = 3.2 / Math.max(cam.z, .3); g.fillStyle = a.color; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.2 / Math.max(cam.z, .3); g.beginPath(); g.arc(hx, hy - r - 5 * S - pr, pr, 0, 7); g.fill(); g.stroke(); }   // zoomed out, a colour pip over the head says who is who
  if (hurt && !REDUCE && (t / 1000) % 5 < 1.8) {   // a faint green "≈" above the head now and then
    const k = ((t / 1000) % 5) / 1.8, ox = hx, oy = hy - r - 6 * S - k * 5; g.strokeStyle = `rgba(190,235,170,${1 - k * .8})`; g.lineWidth = 1.6;
    for (const d of [0, 3]) { g.beginPath(); g.moveTo(ox - 4, oy + d - 1); g.quadraticCurveTo(ox - 2, oy + d - 3.5, ox, oy + d - 1); g.quadraticCurveTo(ox + 2, oy + d + 1.5, ox + 4, oy + d - 1); g.stroke(); }
  }
}
function drawStruct(s, t, wins) {
  const X = s.x * T, Y = s.y * T, c = colorOf(s.owner), g = ctx;
  if (!s.done && s.repair) {   // damaged: the finished building, faded, with a hole in the roof and soot, then the scaffolding over it
    g.save(); g.globalAlpha = .62; drawStruct({ ...s, done: true, damaged: true }, t, []); g.globalAlpha = 1;
    const H = STRUCT_H[s.type] || 50, r5 = rng(s.id * 5 + 1);
    g.fillStyle = 'rgba(20,14,10,.85)'; g.beginPath(); g.moveTo(X - 11, Y - H + 4); g.lineTo(X - 6, Y - H + 13); g.lineTo(X - 1, Y - H + 6); g.lineTo(X + 5, Y - H + 15); g.lineTo(X + 11, Y - H + 5); g.lineTo(X + 8, Y - H - 3); g.lineTo(X - 8, Y - H - 3); g.closePath(); g.fill();
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(10,8,6,${.28 + r5() * .2})`; g.beginPath(); g.ellipse(X + (r5() - .5) * 40, Y - 8 - r5() * H * .6, 5 + r5() * 7, 3 + r5() * 5, 0, 0, 7); g.fill(); }
    g.restore();
  }
  if (!s.done) {
    const w = s.type === 'beehive' || s.type === 'statue' ? 26 : 46, h = 30 + 50 * s.progress;
    g.fillStyle = 'rgba(120,95,60,.55)'; g.beginPath(); g.ellipse(X, Y, w, 10, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(200,180,140,.5)'; for (let i = 0; i < 5; i++) g.fillRect(X - w + 8 + i * (w * 2 - 16) / 5, Y - 3 - (i % 2) * 3, 10, 4);
    g.strokeStyle = '#c9a56a'; g.lineWidth = 3;
    for (const dx of [-w + 6, w - 6]) { g.beginPath(); g.moveTo(X + dx, Y); g.lineTo(X + dx, Y - h); g.stroke(); }
    for (let yy = 14; yy < h; yy += 16) { g.beginPath(); g.moveTo(X - w + 6, Y - yy); g.lineTo(X + w - 6, Y - yy - 8); g.stroke(); }
    g.fillStyle = 'rgba(18,21,26,.85)'; g.beginPath(); g.roundRect(X - 25, Y + 8, 50, 7, 3.5); g.fill();
    g.fillStyle = s.repair ? '#d9604a' : '#e8bd5f'; g.beginPath(); g.roundRect(X - 25, Y + 8, Math.max(4, 50 * s.progress), 7, 3.5); g.fill();
    return;
  }
  if (s.type === 'house') {     // no two alike: size, walls, windows, door and shutters by who owns it, then a flower box, a fence or a woodpile
    const hv = hash(s.owner + ':' + s.id), wdt = 2.2 + (hv % 5) * .13, hgt = 1.26 + ((hv >> 3) % 4) * .06, win = hv % 3 === 0 ? [-0.55, 0.55] : hv % 3 === 1 ? [0.55] : [-0.55];
    house(g, s.x, s.y, wdt, hgt, ['#e6d6b2', '#eadcc4', '#dccfae', '#e3d9c8', '#d9c7a4'][hv % 5], c, { win, pitch: .88 + ((hv >> 5) % 5) * .05, wins, chimney: hv % 4 ? 1 : 0, chim: s.damaged ? [] : smokes,
      door: ['#4a3222', '#5a3a2a', '#3b4a3a', '#6a3a2e'][(hv >> 7) % 4], shutters: hv % 2 ? ['#4f6f55', '#6a4a3a', '#3f5a7a'][(hv >> 9) % 3] : '' });
    const w2 = wdt * T / 2, hh = hgt * T, owner = st.agents.find(q => q.name === s.owner);
    if ((hv >> 11) % 3 === 0) { const fx = X + win[0] * w2 - 9, fy = Y - hh + 29; g.fillStyle = '#7a5a3a'; g.fillRect(fx, fy, 18, 4); ['#e98bb0', '#f4e36b', '#f6f2ea', '#c58cf0'].forEach((fc, i) => { g.fillStyle = fc; g.beginPath(); g.arc(fx + 3 + i * 4, fy - 1.5, 2, 0, 7); g.fill(); }); }          // a flower box under the window
    if ((hv >> 13) % 2 === 0) { g.fillStyle = '#cdbf9b'; for (let i = 0; i < 5; i++) g.fillRect(X + w2 + 7 + i * 6, Y - 9, 2.6, 9); g.fillRect(X + w2 + 6, Y - 7, 28, 1.6); g.fillRect(X + w2 + 6, Y - 3.5, 28, 1.6); }                              // a little picket fence beside it
    if (owner && owner.inv.wood >= 6 && (hv >> 15) % 2 === 0) { g.fillStyle = '#7a5532'; for (const [dx, dy] of [[0, 0], [8, 0], [16, 0], [4, -6], [12, -6]]) { g.beginPath(); g.arc(X - w2 - 24 + dx, Y - 4 + dy, 3.8, 0, 7); g.fill(); } g.fillStyle = '#c99a62'; for (const [dx, dy] of [[0, 0], [8, 0], [16, 0], [4, -6], [12, -6]]) { g.beginPath(); g.arc(X - w2 - 24 + dx, Y - 4 + dy, 1.6, 0, 7); g.fill(); } }   // a woodpile when they hold wood
  }
  else if (s.type === 'shed') house(g, s.x, s.y, 2, 1, '#9c7648', '#5a4030', { win: [], pitch: 0.7, wins });
  else if (s.type === 'stall') {
    shadow(g, X, Y + 2, 30, 7);
    g.fillStyle = '#6a4a2e'; g.fillRect(X - 26, Y - 40, 4, 40); g.fillRect(X + 22, Y - 40, 4, 40);
    g.fillStyle = '#a2794a'; g.fillRect(X - 28, Y - 18, 56, 12);
    for (let i = 0; i < 6; i++) { const fl = REDUCE ? 0 : Math.sin(t / 420 + i * .9 + s.x) * (/windy|storm/.test(st.weather) ? 2.6 : .9); g.fillStyle = i % 2 ? '#f4efe2' : c; g.beginPath(); g.roundRect(X - 30 + i * 10, Y - 50, 10, 14 + fl, [0, 0, 5, 5]); g.fill(); }   // awning flutters
    g.fillStyle = '#c98a45'; g.strokeStyle = 'rgba(60,35,15,.5)'; g.lineWidth = .8; for (const dx of [-24, 24]) { g.beginPath(); g.ellipse(X + dx, Y - 20, 4.4, 2.6, 0, 0, 7); g.fill(); g.stroke(); }   // loaves at the ends of the counter
    const own = st.agents.find(q => q.name === s.owner), kinds = own ? ['bread', 'fish', 'herbs', 'ale'].filter(k => own.inv[k] > 0) : [], goods = [];
    for (const k of kinds) for (let n = 0; n < Math.min(2, 1 + Math.floor(own.inv[k] / 40)) && goods.length < 5; n++) goods.push(k);          // up to five things, more of what they hold most of
    if (!own) for (let i = 0; i < 4; i++) { g.fillStyle = ['#e0a23a', '#c0392b', '#6fbf5a', '#f4e36b'][i]; g.beginPath(); g.arc(X - 18 + i * 12, Y - 21, 4, 0, 7); g.fill(); }
    goods.forEach((k, i) => {
      const gx = X - 20 + i * (40 / Math.max(goods.length - 1, 1)) * (goods.length > 1 ? 1 : 0) + (goods.length === 1 ? 20 : 0), gy = Y - 21; g.lineWidth = .8; g.strokeStyle = 'rgba(60,35,15,.5)';
      if (k === 'bread') { g.fillStyle = '#d9a35a'; g.beginPath(); g.ellipse(gx, gy, 5.4, 3.2, -.15, 0, 7); g.fill(); g.stroke(); }
      else if (k === 'fish') { g.fillStyle = '#b8c6d2'; g.beginPath(); g.ellipse(gx, gy, 5.2, 2.6, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(gx + 4.6, gy); g.lineTo(gx + 8, gy - 2.6); g.lineTo(gx + 8, gy + 2.6); g.closePath(); g.fill(); g.fillStyle = '#2a3a4a'; g.fillRect(gx - 3.4, gy - 1, 1.2, 1.2); }
      else if (k === 'herbs') { g.strokeStyle = '#4f8a3c'; g.lineWidth = 1.2; g.beginPath(); for (const d of [-2.4, 0, 2.4]) { g.moveTo(gx + d * .4, gy + 2); g.lineTo(gx + d, gy - 5); } g.stroke(); g.fillStyle = '#6fbf5a'; for (const d of [-2.4, 0, 2.4]) { g.beginPath(); g.arc(gx + d, gy - 5.5, 1.8, 0, 7); g.fill(); } }
      else { g.fillStyle = '#9a6a38'; g.beginPath(); g.roundRect(gx - 3.2, gy - 5, 6.4, 8, 1.2); g.fill(); g.stroke(); g.fillStyle = '#f4efe0'; g.fillRect(gx - 3.2, gy - 5.6, 6.4, 1.8); }
    });
  } else if (s.type === 'boat') {
    const b = REDUCE ? 0 : Math.sin(t / 1100 + s.id) * 1.5, rk = REDUCE ? 0 : Math.sin(t / 1500 + s.id * 2) * .03;
    g.save(); g.translate(X, Y + 6 + b); g.rotate(rk); g.translate(-X, -(Y + 6 + b));   // rock gently on the swell
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(X, Y + 6 + b, 38, 6, 0, 0, 7); g.stroke();
    g.fillStyle = '#6b4a30'; g.beginPath(); g.moveTo(X - 34, Y - 8 + b); g.lineTo(X + 34, Y - 8 + b); g.lineTo(X + 24, Y + 6 + b); g.lineTo(X - 24, Y + 6 + b); g.closePath(); g.fill();
    g.fillStyle = '#4a3222'; g.fillRect(X - 2, Y - 62 + b, 4, 56);
    g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(X + 3, Y - 60 + b); g.lineTo(X + 32, Y - 14 + b); g.lineTo(X + 3, Y - 14 + b); g.closePath(); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(X - 3, Y - 54 + b); g.lineTo(X - 22, Y - 14 + b); g.lineTo(X - 3, Y - 14 + b); g.closePath(); g.fill();
    g.restore();
  } else if (s.type === 'tower') {
    shadow(g, X, Y + 2, 22, 7);
    g.fillStyle = '#8e9297'; g.fillRect(X - 13, Y - 86, 26, 86); g.fillStyle = '#74787d'; g.fillRect(X + 4, Y - 86, 9, 86);
    g.fillStyle = '#6f7378'; for (let i = 0; i < 3; i++) g.fillRect(X - 17 + i * 13, Y - 98, 8, 12); g.fillRect(X - 17, Y - 88, 34, 6);
    g.fillStyle = '#31475c'; g.fillRect(X - 5, Y - 72, 10, 12); wins.push([X, Y - 66]);
    g.fillStyle = '#4a3222'; g.fillRect(X - 1, Y - 119, 2, 23);
    { const am = REDUCE ? 0 : /windy|storm/.test(st.weather) ? 1.9 : 1, ph = t / 230 + s.x, top = [], bot = []; g.fillStyle = c;   // a flag whose cloth ripples in the wind
      for (let k = 0; k <= 6; k++) { const u = k / 6, wv = Math.sin(ph - k * .9) * am * 3 * u; top.push([X + 1 + u * 19, Y - 118 + wv + u * 3]); bot.push([X + 1 + u * 19, Y - 106 + wv - u * 3]); }
      g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); bot.reverse().forEach(([x, y]) => g.lineTo(x, y)); g.closePath(); g.fill(); }
  } else if (s.type === 'beehive') {
    for (const dx of [-12, 10]) { shadow(g, X + dx, Y + 1, 11, 4); for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? '#c9952c' : '#e3b23c'; g.beginPath(); g.ellipse(X + dx, Y - 5 - i * 6, 10 - i * 2, 5, 0, 0, 7); g.fill(); } }
    if (st.phase !== 'night') for (let i = 0; i < 5; i++) { const bt = REDUCE ? 1000 : t, bx = X + Math.sin(bt / 300 + i * 2) * 18, by = Y - 22 + Math.cos(bt / 240 + i * 1.3) * 9; g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(bx - .5, by - 2, 1.6, 1.1, Math.sin(bt / 40 + i) * .6, 0, 7); g.fill(); g.fillStyle = '#2b2410'; g.beginPath(); g.ellipse(bx, by, 2.1, 1.4, 0, 0, 7); g.fill(); g.fillStyle = '#e3b23c'; g.fillRect(bx - .4, by - 1.2, .9, 2.4); }
  } else if (s.type === 'mill') {
    shadow(g, X, Y + 2, 30, 8);
    g.fillStyle = '#d8ccb0'; g.beginPath(); g.moveTo(X - 24, Y); g.lineTo(X - 14, Y - 74); g.lineTo(X + 14, Y - 74); g.lineTo(X + 24, Y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y - 74); g.lineTo(X + 14, Y - 74); g.lineTo(X + 24, Y); g.closePath(); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(X - 18, Y - 74); g.lineTo(X, Y - 96); g.lineTo(X + 18, Y - 74); g.fill();
    g.fillStyle = '#4a3222'; g.fillRect(X - 6, Y - 20, 12, 20); wins.push([X, Y - 44]); g.fillStyle = '#31475c'; g.fillRect(X - 6, Y - 50, 12, 12);
    g.save(); g.translate(X, Y - 70); g.rotate(millAng);
    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.fillStyle = '#5a4030'; g.fillRect(-2, 0, 4, 50); g.fillStyle = 'rgba(244,239,226,.92)'; g.fillRect(2, 10, 13, 38); }
    g.restore(); g.fillStyle = '#4a3222'; g.beginPath(); g.arc(X, Y - 70, 5, 0, 7); g.fill();
  } else if (s.type === 'farm') {
    g.fillStyle = '#7a5a34'; g.beginPath(); g.roundRect(X - 46, Y - 30, 92, 34, 6); g.fill();
    for (let i = 0; i < 5; i++) {
      g.fillStyle = '#5e4428'; g.fillRect(X - 42, Y - 26 + i * 6.5, 84, 3);
      for (let j = 0; j < 14; j++) { const sway = Math.sin(t / 700 + j * 0.6 + i) * (/windy|storm/.test(st.weather) ? 2.4 : 1.2), rp = .3 + (s.id * 37 % 70) / 100 + (st.minute > 1020 ? .05 : 0); g.strokeStyle = `hsl(${lerp(100, 46, Math.min(1, rp))} ${(i + j) % 3 ? 62 : 58}% ${(i + j) % 3 ? 52 : 44}%)`; g.lineWidth = 1.6;   // greener when young, golden when ripe
        g.beginPath(); g.moveTo(X - 40 + j * 6, Y - 24 + i * 6.5); g.lineTo(X - 40 + j * 6 + sway, Y - 31 + i * 6.5); g.stroke(); }
    }
    g.fillStyle = '#5a4030'; g.fillRect(X + 34, Y - 52, 3, 30); g.fillRect(X + 26, Y - 44, 19, 3);   // scarecrow in the owner's colour
    g.fillStyle = c; g.fillRect(X + 30, Y - 46, 11, 13); g.fillStyle = '#e2c46a'; g.beginPath(); g.arc(X + 35.5, Y - 51, 5, 0, 7); g.fill();
  } else if (s.type === 'bank') {                         // stone front, columns, a gold coin over the door
    house(g, s.x, s.y, 3.1, 1.55, '#d8d2c4', '#6f6250', { win: [-0.62, 0.62], pitch: 0.65, wins });
    g.fillStyle = '#efe9dc'; for (const dx of [-0.36, -0.14, 0.14, 0.36]) g.fillRect(X + dx * 3.1 * T - 3, Y - 1.55 * T + 6, 6, 1.55 * T - 8);
    g.fillStyle = '#e8bd5f'; g.strokeStyle = '#8a6a20'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y - 1.55 * T - 0.32 * T, 7, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#8a6a20'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('¤', X, Y - 1.55 * T - 0.32 * T + .5);
  } else if (s.type === 'granary') {                      // tall barn with sacks at the door
    house(g, s.x, s.y, 2.8, 2.0, '#c8a46a', '#8a4a2a', { win: [0], pitch: 1.0, wins });
    for (const [dx, c2] of [[-30, '#e6d6a8'], [-21, '#d9c690'], [24, '#e6d6a8']]) { g.fillStyle = c2; g.beginPath(); g.ellipse(X + dx, Y - 6, 6, 7, 0, 0, 7); g.fill(); }
  } else if (s.type === 'kitchen') {                      // long low kitchen with a busy chimney
    house(g, s.x, s.y, 2.7, 1.3, '#e6d2b0', '#9a4a32', { win: [-0.6, 0.6], pitch: 0.85, wins, chimney: 1, chim: smokes });
  } else if (s.type === 'market') {                       // open hall with striped awnings
    house(g, s.x, s.y, 3.2, 1.1, '#b8956a', '#3f6f8a', { win: [], pitch: 0.6, wins });
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4efe2' : '#3f6f8a'; g.beginPath(); g.roundRect(X - 1.6 * T + i * 0.4 * T, Y - 1.1 * T, 0.4 * T, 10, [0, 0, 4, 4]); g.fill(); }
  } else if (s.type === 'hall') {                         // the biggest roof in the village, with a flag
    house(g, s.x, s.y, 3.6, 1.9, '#e9dcc0', '#7a3a5a', { win: [-0.66, 0, 0.66], pitch: 1.25, wins });
    g.fillStyle = '#4a3222'; g.fillRect(X - 1, Y - 1.9 * T - 1.25 * T - 26, 2, 28);
    const fl = REDUCE ? 0 : Math.sin(t / 260) * 2; g.fillStyle = '#e8bd5f'; g.beginPath(); g.moveTo(X + 1, Y - 1.9 * T - 1.25 * T - 26); g.lineTo(X + 20, Y - 1.9 * T - 1.25 * T - 21 + fl); g.lineTo(X + 1, Y - 1.9 * T - 1.25 * T - 15); g.fill();
  } else if (s.type === 'wheel') {                        // the fairground wheel: A-frame legs, a turning rim, swinging cabins
    const R = 1.45 * T, cx = X, cy = Y - R - 14, ang = REDUCE ? 0 : t / 9000, cols = ['#d9604a', '#e8bd5f', '#4a8fc2', '#6fbf5a', '#b9a2f5', '#e98bb0', '#f4efe2', '#e0a23a'];
    shadow(g, X, Y + 2, R * 0.9, 8);
    g.strokeStyle = '#6b4a30'; g.lineWidth = 4; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * R * 0.62, Y); g.lineTo(cx, cy); g.stroke(); }
    g.strokeStyle = '#d8d2c4'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(216,210,196,.8)'; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = ang + i * Math.PI / 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = ang + i * Math.PI / 4, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      g.strokeStyle = '#4a3222'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + 5); g.stroke();
      g.fillStyle = cols[i]; g.beginPath(); g.roundRect(px - 6, py + 4, 12, 9, [2, 2, 4, 4]); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px - 4, py + 6, 8, 2.5); }
    g.fillStyle = '#e8bd5f'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
    g.fillStyle = '#8a6a44'; g.fillRect(X - 14, Y - 6, 28, 6);
  } else if (s.type === 'school') {                       // a schoolhouse with a little bell tower
    house(g, s.x, s.y, 3.0, 1.5, '#e7c9a0', '#3f5f8a', { win: [-0.6, 0.6], pitch: 0.95, wins });
    g.fillStyle = '#e7c9a0'; g.fillRect(X - 7, Y - 1.5 * T - 0.95 * T - 14, 14, 16); g.fillStyle = '#3f5f8a'; g.beginPath(); g.moveTo(X - 10, Y - 1.5 * T - 0.95 * T - 14); g.lineTo(X, Y - 1.5 * T - 0.95 * T - 26); g.lineTo(X + 10, Y - 1.5 * T - 0.95 * T - 14); g.fill();
    g.fillStyle = '#d8b13c'; g.beginPath(); g.arc(X, Y - 1.5 * T - 0.95 * T - 5, 3.5, 0, 7); g.fill();
  } else if (s.type === 'statue') {
    shadow(g, X, Y + 2, 18, 6);
    g.fillStyle = '#7d8186'; g.fillRect(X - 14, Y - 14, 28, 14);
    g.fillStyle = '#b4b8bc'; g.beginPath(); g.roundRect(X - 8, Y - 44, 16, 30, 6); g.fill(); g.beginPath(); g.arc(X, Y - 51, 8, 0, 7); g.fill();
    g.fillStyle = '#7fe0c8'; g.beginPath(); g.arc(X, Y - 30, 3 + Math.sin(t / 500), 0, 7); g.fill(); wins.push([X, Y - 30, .5, '127,224,200']);
  }
}

function slotTarget(a) {
  const mates = st.agents.filter(o => o.place === a.place).map(o => o.name), i = mates.indexOf(a.name);
  const [x, y] = st.places[a.place] || st.places.Square;
  return [x + (i - (mates.length - 1) / 2) * 1.15, y + (STAND[a.place] || 1.9) + (i % 2) * 0.35];
}
function syncPositions() {
  for (const a of st.agents) {
    const [tx, ty] = slotTarget(a), p = pos[a.name];
    if (!p) { pos[a.name] = { x: tx, y: ty, route: [], place: a.place, walking: false }; continue; }
    const end = p.route.length ? p.route[p.route.length - 1] : [p.x, p.y];
    if (Math.hypot(end[0] - tx, end[1] - ty) < 0.05) continue;
    const route = [];
    if (p.place !== a.place) {                       // follow the drawn paths through the Square, skipping any shared stretch
      const A = pathPts[p.place] || [], B = pathPts[a.place] || [];
      let k = 0; while (k < A.length && k < B.length && A[k] === B[k]) k++;
      route.push(...A.slice(Math.max(k - 1, 0)).reverse(), ...B.slice(k));
    }
    route.push([tx, ty]); p.route = route; p.place = a.place;
  }
}
