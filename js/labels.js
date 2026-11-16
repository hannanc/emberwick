// ================================================================ screen-space labels & bubbles
let occ = [], bubbleTone = 1;     // bubbleTone: the cream of a speech bubble dims a little as the lamps come on
const hits = r => hitsAny(r, occ);
function label(text, sx, sy, o = {}) {
  const size = o.size || 12, font = `${o.weight || 600} ${size}px ${SANS}`;
  ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = o.spacing || '0px';
  const w = ctx.measureText(text).width + 8, r = { x: sx - w / 2, y: sy - size, w, h: size + 5 };
  if (labelRejected(r, o, vw, vh, occ)) { if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; return false; }   // never leave the spacing set on an early exit
  occ.push(r);
  ctx.globalAlpha = o.alpha ?? 1; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(14,16,20,.82)'; ctx.strokeText(text, sx, sy);
  ctx.fillStyle = o.color || '#fff'; ctx.fillText(text, sx, sy); ctx.globalAlpha = 1;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return true;
}
function wrap(text, maxW) { return wrapText(text, maxW, t => ctx.measureText(t).width); }
function layoutBubble(text, name, color, ax, ay, alpha) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const small = vw < 520, fs = small ? 13 : 14, lh = Math.round(fs * 1.36), maxW = small ? 170 : 240, maxL = small ? 3 : 4;
  ctx.font = `${fs}px ${SERIF}`; let lines = wrap(text, maxW);
  if (lines.length > maxL) { lines = lines.slice(0, maxL); lines[maxL - 1] = lines[maxL - 1].replace(/\s*\S*$/, '') + '…'; }
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)); ctx.font = `600 11px ${SANS}`;
  const w = Math.ceil(Math.max(tw, ctx.measureText(name).width + 14)) + 22, h = lines.length * lh + 30;
  let best = null;
  place: for (const k of [0, 1, 2, 3]) for (const dx of [0, -0.62, 0.62]) {
    const r = { x: clamp(ax - w / 2 + dx * w, 6, vw - w - 6), y: clamp(ay - 14 - h - k * (h * 0.6 + 6), 6, vh - h - 6), w, h };
    if (!hits(r)) { best = r; break place; }
  }
  if (!best) best = { x: clamp(ax - w / 2, 6, vw - w - 6), y: clamp(ay - 14 - h, 6, vh - h - 6), w, h };
  occ.push(best); return Object.assign(best, { lines, fs, lh, name, color, ax, ay, alpha });
}
function drawBubble(b) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.globalAlpha = b.alpha; ctx.lineJoin = 'round';
  const bottom = b.y + b.h, tx = clamp(b.ax, b.x + 16, b.x + b.w - 16), gap = b.ay - bottom;
  if (gap > 20) { ctx.strokeStyle = b.color; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(tx, bottom + 6); ctx.lineTo(b.ax, b.ay - 4); ctx.stroke(); ctx.setLineDash([]); }
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
  ctx.fillStyle = `rgba(${Math.round(252 * bubbleTone)},${Math.round(249 * bubbleTone)},${Math.round(240 * bubbleTone)},.97)`; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill();
  ctx.shadowColor = 'transparent';
  if (gap > -4) { ctx.beginPath(); ctx.moveTo(tx - 7, bottom - 1); ctx.lineTo(tx, bottom + 8); ctx.lineTo(tx + 7, bottom - 1); ctx.fill(); }
  ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10); ctx.stroke();
  ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x + 15, b.y + 14, 4, 0, 7); ctx.fill();
  ctx.textAlign = 'left'; ctx.font = `600 11px ${SANS}`; ctx.fillStyle = '#5b4d36'; ctx.fillText(b.name, b.x + 24, b.y + 18);
  ctx.font = `${b.fs}px ${SERIF}`; ctx.fillStyle = '#231d14'; b.lines.forEach((l, i) => ctx.fillText(l, b.x + 11, b.y + 24 + (i + 1) * b.lh - 4));
  ctx.globalAlpha = 1;
}
function drawOverlay(t, asleep, order) {
  occ = [];
  if (sceneAt && !$('scene').hidden) {                   // the scene card is part of the overlay: bubbles and labels keep off it
    if (!sceneRect || t - sceneRectAt > 500) { const b = $('scene').getBoundingClientRect(), c = cv.getBoundingClientRect(); sceneRect = { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height }; sceneRectAt = t; }
    occ.push(sceneRect);
  }
  const now = Date.now() / 1000 + skew, z = cam.z, bubbles = [];
  if (!asleep) {
    const latest = {};                                    // one bubble per place: whoever spoke last
    for (const a of order) if (a.say && now - a.say_at < 26 && (!latest[a.place] || a.say_at > latest[a.place].say_at)) latest[a.place] = a;
    const hs = hear.now && st.agents.find(q => q.name === hear.now.who && q.say);   // whoever is being heard keeps a bubble, opaque and on top
    if (hs) latest[hs.place] = hs;
    const speakers = Object.values(latest).sort((a, b) => (b.name === selected) - (a.name === selected) || b.say_at - a.say_at);
    const onScreen = (sx, sy) => sx > -40 && sx < vw + 40 && sy > -40 && sy < vh + 40;     // a speaker out of view gets no bubble pinned to a corner
    for (const a of speakers) { const p = pos[a.name], [sx, sy] = toScreen(p.x * T, p.y * T - 40 * FIG); if (!onScreen(sx, sy)) continue; bubbles.push(layoutBubble(a.say, a.name, a.color, sx, sy, clamp((26 - (now - a.say_at)) / 4, 0, 1))); }
    if (st.oracle.speech && now - st.oracle.at < 60) { const [ox, oy] = st.places.Oracle, [sx, sy] = toScreen(ox * T, oy * T - 34); if (onScreen(sx, sy)) bubbles.push(layoutBubble(st.oracle.speech, 'The Oracle', '#a98cf0', sx, sy, clamp((60 - (now - st.oracle.at)) / 5, 0, 1))); }
    for (const a of order) {                             // villager names: below the feet, else above the head
      const p = pos[a.name], [sx, sy] = toScreen(p.x * T, p.y * T), sel = a.name === selected, o = { color: sel ? '#e8bd5f' : '#fff', size: sel ? 13 : 12, force: sel };
      let ly = sy + 15, ok = label(a.name, sx, ly, o);
      if (!ok) { ly = sy - 42 * FIG * z - 6; ok = label(a.name, sx, ly, { ...o, force: true, alpha: .9 }); }
      if (ok && a.expecting) { ctx.font = `600 ${o.size}px ${SANS}`; const hx = sx + ctx.measureText(a.name).width / 2 + 9, hy = ly - o.size * .38; ctx.fillStyle = '#f48fb1'; ctx.beginPath(); ctx.moveTo(hx, hy + 3.6); ctx.bezierCurveTo(hx - 7, hy - 1, hx - 3.4, hy - 6, hx, hy - 2.4); ctx.bezierCurveTo(hx + 3.4, hy - 6, hx + 7, hy - 1, hx, hy + 3.6); ctx.fill(); }   // a tiny heart for an expecting mother
    }
  } else {
    const [cx, cy] = st.places.Cottages;
    for (let i = 0; i < 3; i++) { const k = ((t / 2600) + i / 3) % 1, [sx, sy] = toScreen((cx + 0.6 + k) * T, (cy - 2 - k * 2.2) * T); label('z', sx, sy, { color: `rgba(255,255,255,${1 - k})`, size: 14 + k * 12, force: true }); }
  }
  if (!asleep) for (const a of order) { const p = pos[a.name]; if (!p) continue; const [bx, by] = toScreen(p.x * T, p.y * T); occ.push({ x: bx - 9 * FIG * z, y: by - 42 * FIG * z, w: 18 * FIG * z, h: 44 * FIG * z }); }   // people are in the way too: labels give way to them
  for (const s of st.structures) {                       // building-site labels, when there is room
    if (!(s.owner === selected || z >= 1.6 || (z >= 0.7 && (s.owner === 'Village' || !s.done)))) continue;     // owners' names only for the selected villager or close up; landmarks and building sites always
    const [sx, sy] = toScreen(s.x * T, s.y * T);
    label(s.done ? projName(s) : `${projName(s)} · ${s.repair ? 'damaged · ' : ''}${Math.round(s.progress * 100)}%`, sx, sy + (s.done ? 20 : 29) * z + 8, { size: 11, weight: 500, color: s.done ? '#e2dac6' : '#f3e2b6' });
  }
  if (st.places.Cemetery && z >= 1.4) {                 // names on the headstones, close up
    const [cx, cy] = st.places.Cemetery;
    (st.dead || []).slice(0, 24).forEach((d, i) => { const [sx, sy] = toScreen((cx - 2.5 + (i % 8) * 0.7) * T, (cy - 0.85 + Math.floor(i / 8) * 0.75) * T); label(d.name, sx, sy + 10 * z + 6, { size: 9.5, weight: 500, color: '#d8d4c6' }); });
  }
  for (const [name, [x, y]] of Object.entries(st.places)) {   // place names last: they give way to everything else
    const off = name === 'Dock' ? 3.5 : name === 'Garden' ? 1.45 : name === 'Square' ? -1.9 : name === 'Cottages' ? 2.95 : name === 'Cemetery' ? 2.3 : 0.75;
    const [sx, sy] = toScreen(x * T, (y + off) * T);
    label((PLACE_NAME[name] || name).toUpperCase(), sx, sy, { size: z < 0.5 ? 10 : 11, weight: 700, spacing: '0.8px', color: '#f6efdc', alpha: .95, edge: true });   // a place name cut by the map edge is worse than none
  }
  if (hear.now) {   // heard and off-screen: an arrow at the edge pointing their way, with their initial
    const sp = speakerSpot(); if (sp) { const [sx, sy] = toScreen(sp[0], sp[1] + 14 * sp[3]);
      if (sx < 10 || sx > vw - 10 || sy < 10 || sy > vh - 10) {
        const cx = vw / 2, cy = vh / 2, dx = sx - cx, dy = sy - cy, m = 26, k = Math.min((vw / 2 - m) / Math.abs(dx || 1e-6), (vh / 2 - m) / Math.abs(dy || 1e-6)), ex = cx + dx * k, ey = cy + dy * k, an = Math.atan2(dy, dx), ini = hear.now.who === 'The Oracle' ? 'O' : hear.now.who[0];
        ctx.save(); ctx.translate(ex, ey); ctx.fillStyle = sp[5]; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill(); ctx.stroke();
        ctx.rotate(an); ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(14, -6); ctx.lineTo(14, 6); ctx.closePath(); ctx.fillStyle = '#fff6d0'; ctx.fill(); ctx.rotate(-an);
        ctx.fillStyle = '#fff'; ctx.font = `700 13px ${SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ini, 0, 1); ctx.textBaseline = 'alphabetic'; ctx.restore(); } }
  }
  if (hear.now) { const i = bubbles.findIndex(b => b.name === hear.now.who); if (i >= 0) { const [b] = bubbles.splice(i, 1); b.alpha = 1; bubbles.push(b); } }
  bubbles.forEach(drawBubble);
  drawKbdFocus();
}
