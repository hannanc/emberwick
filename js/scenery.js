// ================================================================ scenery
function door(p) { const [x, y] = st.places[p]; return [x, y + (STAND[p] || 1.9) - 0.5]; }
let pathGrid = null;     // the path segments filed by 4x4-tile cell (each also in the cells within 2 tiles), so a lookup tests a few segments, not all of them
function buildPathGrid() {
  pathGrid = new Map();
  for (const pts of Object.values(pathPts)) for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], x0 = Math.floor((Math.min(a[0], b[0]) - 2) / 4), x1 = Math.floor((Math.max(a[0], b[0]) + 2) / 4), y0 = Math.floor((Math.min(a[1], b[1]) - 2) / 4), y1 = Math.floor((Math.max(a[1], b[1]) + 2) / 4);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const k = cx * 1000 + cy; if (!pathGrid.has(k)) pathGrid.set(k, []); pathGrid.get(k).push([a, b]); }
  }
}
function distPaths(x, y) {      // exact below 2 tiles, which is all the callers ask about (they compare with 0.55 to 1.4); anything farther just comes back large
  if (!pathGrid) buildPathGrid();
  const segs = pathGrid.get(Math.floor(x / 4) * 1000 + Math.floor(y / 4)); if (!segs) return 1e9;
  let d = 1e9; for (const [a, b] of segs) d = Math.min(d, distSeg(x, y, a, b)); return d;
}
function nearPlace(x, y, dx = 3.4, dy = 3.2) { return Object.values(st.places).some(([px, py]) => Math.abs(x - px) < dx && Math.abs(y - py) < dy); }
function inMeadow(x, y) { const m = st.places.Meadow; return !!m && Math.abs(x - m[0]) < 5.6 && Math.abs(y - m[1]) < 7.2; }

function buildPaths() {      // gentle curves from the Square to every door, sampled so villagers can walk them
  pathPts = {}; pathGrid = null;
  for (const p of Object.keys(st.places).sort((x, y) => viaDepth(x) - viaDepth(y))) {   // hubs before their branches, however deep
    if (p === 'Square') continue;
    const a = VIA[p] && st.places[VIA[p]] ? door(VIA[p]) : SQ, b = door(p), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const bend = ((hash(p) % 1000) / 1000 - 0.5) * 0.34 * L, cx = (a[0] + b[0]) / 2 - dy / L * bend, cy = (a[1] + b[1]) / 2 + dx / L * bend;
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]); }
    pathPts[p] = VIA[p] && pathPts[VIA[p]] ? pathPts[VIA[p]].concat(pts.slice(1)) : pts;
  }
}

function shadow(g, X, Y, rx, ry, a = .22) { g.fillStyle = `rgba(10,20,8,${a})`; g.beginPath(); g.ellipse(X + rx * .18, Y + ry * .4, rx, ry, 0, 0, 7); g.fill(); }
function house(g, x, y, w, h, wall, roof, o = {}) {
  const X = x * T, Y = y * T, w2 = w * T / 2, hh = h * T, pitch = T * (o.pitch || 1.1);
  shadow(g, X + 6, Y + 2, w2 * 1.12, 10);
  g.fillStyle = wall; g.fillRect(X - w2, Y - hh, w2 * 2, hh);
  const lg = g.createLinearGradient(X - w2, 0, X + w2, 0); lg.addColorStop(0, 'rgba(255,255,255,.10)'); lg.addColorStop(1, 'rgba(0,0,0,.16)');
  g.fillStyle = lg; g.fillRect(X - w2, Y - hh, w2 * 2, hh);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X - w2, Y - 4, w2 * 2, 4); g.fillRect(X - w2, Y - hh, w2 * 2, 7);
  if (o.chimney) { const cx = X + w2 * 0.45; g.fillStyle = '#6b5a50'; g.fillRect(cx, Y - hh - T * 1.25, 11, T * 0.95); g.fillStyle = '#4f423a'; g.fillRect(cx - 2, Y - hh - T * 1.25, 15, 4); (o.chim || chimneys).push([cx + 5.5, Y - hh - T * 1.25 - 2]); }
  g.fillStyle = roof; g.beginPath(); g.moveTo(X - w2 - 8, Y - hh); g.lineTo(X, Y - hh - pitch); g.lineTo(X + w2 + 8, Y - hh); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(X - w2 - 8, Y - hh); g.lineTo(X, Y - hh - pitch); g.lineTo(X, Y - hh); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(X, Y - hh - pitch); g.lineTo(X + w2 + 8, Y - hh); g.lineTo(X, Y - hh); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X - w2 - 8, Y - hh); g.lineTo(X, Y - hh - pitch); g.lineTo(X + w2 + 8, Y - hh); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(X - 9, Y - 25, 18, 25, [7, 7, 0, 0]); g.fill();
  g.fillStyle = o.door || '#4a3222'; g.beginPath(); g.roundRect(X - 7, Y - 23, 14, 23, [6, 6, 0, 0]); g.fill();
  g.fillStyle = '#d8b56a'; g.fillRect(X + 3, Y - 11, 2, 2);
  for (const wx of (o.win || [-0.55, 0.55])) {
    const a = X + wx * w2 - 7, b = Y - hh + 14;
    g.fillStyle = '#e9dfc8'; g.fillRect(a - 2, b - 2, 18, 17);
    g.fillStyle = '#2e4357'; g.fillRect(a, b, 14, 13);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(a, b, 6, 5);
    g.fillStyle = '#e9dfc8'; g.fillRect(a + 6, b, 2, 13); g.fillRect(a, b + 6, 14, 1.5);
    if (o.shutters) { g.fillStyle = o.shutters; g.fillRect(a - 6, b - 2, 4, 17); g.fillRect(a + 16, b - 2, 4, 17); }
    (o.wins || windows).push([a + 7, b + 6.5]);
  }
  if (o.sign) { g.fillStyle = '#4a3222'; g.fillRect(X + w2 + 1, Y - hh + 6, 10, 2); g.fillStyle = o.sign; g.fillRect(X + w2 + 4, Y - hh + 9, 12, 12); }
}
function bench(g, x, y) {
  const X = x * T, Y = y * T; shadow(g, X, Y + 9, 22, 5);
  g.fillStyle = '#4c3520'; g.fillRect(X - 17, Y + 3, 3, 7); g.fillRect(X + 14, Y + 3, 3, 7); g.fillRect(X - 18, Y - 9, 2, 10); g.fillRect(X + 16, Y - 9, 2, 10);
  g.fillStyle = '#85603a'; g.fillRect(X - 20, Y - 9, 40, 4); g.fillStyle = '#6f4e2f'; g.fillRect(X - 20, Y - 2, 40, 5);
  g.fillStyle = 'rgba(255,235,190,.18)'; g.fillRect(X - 20, Y - 9, 40, 1.2); g.fillRect(X - 20, Y - 2, 40, 1.2);
}
function noticeBoard(g, x, y) {
  const X = x * T, Y = y * T; shadow(g, X, Y + 6, 20, 4);
  g.fillStyle = '#5b4228'; g.fillRect(X - 16, Y - 26, 3, 32); g.fillRect(X + 13, Y - 26, 3, 32);
  g.fillStyle = '#8a6a43'; g.fillRect(X - 18, Y - 30, 36, 22); g.fillStyle = '#a88458'; g.fillRect(X - 16, Y - 28, 32, 18);
  for (const [c, dx, dy, w, h] of [['#f4efe0', -13, -26, 9, 7], ['#efe2b8', -1, -27, 8, 8], ['#e9d6c4', 8, -25, 7, 6], ['#dfe8d2', -12, -17, 7, 6]]) {
    g.fillStyle = c; g.fillRect(X + dx, Y + dy, w, h); g.fillStyle = '#b24a3a'; g.fillRect(X + dx + w / 2 - 1, Y + dy, 2, 2);
  }
  g.fillStyle = '#4c3520'; g.beginPath(); g.moveTo(X - 21, Y - 30); g.lineTo(X, Y - 39); g.lineTo(X + 21, Y - 30); g.closePath(); g.fill();
}
function barrels(g, x, y) {
  const X = x * T, Y = y * T; shadow(g, X, Y + 8, 26, 5);
  for (const [dx, dy, k] of [[-10, 0, 1], [9, 1, .92], [0, -7, .85]]) {
    const bx = X + dx, by = Y + dy; g.fillStyle = '#7a5532'; g.beginPath(); g.roundRect(bx - 8 * k, by - 14 * k, 16 * k, 20 * k, 5); g.fill();
    g.fillStyle = '#4a3a2a'; g.fillRect(bx - 8 * k, by - 8 * k, 16 * k, 2); g.fillRect(bx - 8 * k, by, 16 * k, 2);
    g.fillStyle = '#9a7248'; g.beginPath(); g.ellipse(bx, by - 14 * k, 8 * k, 3 * k, 0, 0, 7); g.fill();
  }
}
const pigeons = [];
function drawLogs(x, y, n) {      // a pyramid of log ends
  const X = x * T, Y = y * T; shadow(ctx, X + 6, Y + 2, 20, 5); let i = 0;
  for (let row = 0; row < 4 && i < n; row++) for (let k = 0; k < 4 - row && i < n; k++, i++) { const cx = X + (k - (3 - row) / 2) * 9, cy = Y - 4 - row * 7.4; ctx.fillStyle = '#7a5532'; ctx.beginPath(); ctx.arc(cx, cy, 4.4, 0, 7); ctx.fill(); ctx.fillStyle = '#c99a62'; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill(); }
}
function drawStones(x, y, n) {    // cut blocks, two rows deep
  const X = x * T, Y = y * T; shadow(ctx, X, Y + 2, 24, 5);
  for (let i = 0; i < n; i++) { const row = i < 6 ? 0 : 1, k = row ? i - 6 : i, bx = X - 17 + k * 7 + row * 3.5, by = Y - 6 - row * 7; ctx.fillStyle = (i % 3 ? '#a9aaa6' : '#b9b8b2'); ctx.strokeStyle = 'rgba(40,40,40,.45)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.roundRect(bx, by, 7, 6.4, 1); ctx.fill(); ctx.stroke(); }
}
const MEADOW_LOTS = [[46.2, 11.1], [49, 11.1], [51.8, 11.1], [46.2, 13.7], [49, 13.7], [51.8, 13.7]];    // the free house lots on the Meadow (as in emberwick.py)
function drawLots() {      // a free lot is marked out with four stakes and a string
  for (const [lx, ly] of MEADOW_LOTS) {
    if (st.structures.some(q => q.type === 'house' && Math.abs(q.x - lx) < .3 && Math.abs(q.y - ly) < .3)) continue;
    const X = lx * T, Y = ly * T, hw = 1.25 * T, hh = .7 * T; ctx.strokeStyle = 'rgba(245,238,215,.7)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.strokeRect(X - hw, Y - hh, hw * 2, hh * 2); ctx.setLineDash([]);
    for (const [sx, sy] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) { ctx.fillStyle = '#8a6a44'; ctx.fillRect(sx + X - 1.5, sy + Y - 9, 3, 11); ctx.fillStyle = '#d9604a'; ctx.fillRect(sx + X - 1.5, sy + Y - 9, 3, 3); }
  }
}
const SHEEP = [[47.2, 8.7, 0], [50.6, 8.5, 1.7], [47.6, 16.2, 3.1], [51, 16.4, 4.6]];
function drawSheep(t) {    // a few sheep grazing and drifting about the Meadow
  SHEEP.map(([hx, hy, ph], i) => { const k = REDUCE ? 0 : t / 1000, x = (hx + Math.sin(k / 9 + ph) * 1.1) * T, y = (hy + Math.cos(k / 11 + ph * 1.3) * .35) * T, face = Math.cos(k / 9 + ph) >= 0 ? 1 : -1; return { x, y, face, i, ph }; }).sort((a, b) => a.y - b.y).forEach(({ x, y, face, i, ph }) => {
    const graze = REDUCE ? 0 : Math.max(0, Math.sin(t / 700 + ph * 2)) * 3.5; shadow(ctx, x, y + 2, 11, 3);
    ctx.fillStyle = '#3a3029'; for (const dx of [-6, -2, 3, 7]) ctx.fillRect(x + dx - .8, y - 4, 1.8, 5);
    ctx.fillStyle = '#efeadf'; ctx.strokeStyle = 'rgba(80,70,55,.4)'; ctx.lineWidth = 1; for (const [dx, dy, r] of [[-5, -9, 5], [0, -11, 5.6], [5, -9, 5], [0, -6, 6]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#4a4038'; ctx.beginPath(); ctx.ellipse(x + face * 9, y - 7 + graze, 3.4, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ddd6c8'; ctx.beginPath(); ctx.ellipse(x + face * 7, y - 10 + graze * .6, 1.6, 2.2, face * .5, 0, 7); ctx.fill();
  });
}
function stepPigeons(dt, t) {
  const sq = [20.4 * T, 13 * T];
  if (!pigeons.length) { const r = rng(91); for (let i = 0; i < 6; i++) { const a = r() * 6.28, k = Math.sqrt(r()) * .8; pigeons.push({ x: sq[0] + Math.cos(a) * 5.2 * T * k, y: sq[1] + Math.sin(a) * 3 * T * k, face: r() < .5 ? -1 : 1, wait: r() * 2, ph: r() * 6, fly: 0, tx: 0, ty: 0, vx: 0, vy: 0 }); } }
  if (FROZEN != null) return;                            // a frozen frame keeps the pigeons where they start, so shots are identical
  for (const p of pigeons) {
    let near = 1e9, nx = 0, ny = 0;
    for (const a of st.agents) { const q = pos[a.name]; if (!q || a.place !== 'Square') continue; const d = Math.hypot(q.x * T - p.x, q.y * T - p.y); if (d < near) { near = d; nx = q.x * T; ny = q.y * T; } }
    if (p.fly > 0) { p.fly -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    else if (near < 1.3 * T) { const an = Math.atan2(p.y - ny, p.x - nx) + (Math.random() - .5) * 1.4; p.fly = .55 + Math.random() * .4; p.vx = Math.cos(an) * 150; p.vy = Math.sin(an) * 80; p.face = p.vx < 0 ? -1 : 1; p.wait = 1 + Math.random() * 2; }
    else if (p.wait > 0) p.wait -= dt;
    else {
      if (!p.tx) { p.tx = p.x + (Math.random() - .5) * 60; p.ty = p.y + (Math.random() - .5) * 30; }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      if (d < 3) { p.tx = 0; p.wait = .8 + Math.random() * 2.6; } else { p.x += dx / d * 24 * dt; p.y += dy / d * 24 * dt; p.face = dx < 0 ? -1 : 1; }
    }
    const ex = (p.x - sq[0]) / (5.3 * T), ey = (p.y - sq[1]) / (3.0 * T), e = ex * ex + ey * ey;   // stay on the cobbles
    if (e > 1) { p.x = sq[0] + (p.x - sq[0]) / Math.sqrt(e); p.y = sq[1] + (p.y - sq[1]) / Math.sqrt(e); p.tx = 0; }
  }
}
function drawPigeons(t) {
  for (const p of [...pigeons].sort((a, b) => a.y - b.y)) {
    const air = p.fly > 0, lift = air ? -9 - Math.sin(p.fly * 14) * 2 : 0, peck = !air && p.wait > 0 && Math.sin(t / 120 + p.ph) > .35;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 3, 6, 2, 0, 0, 7); ctx.fill();
    ctx.translate(0, lift);
    ctx.fillStyle = '#9097a1'; ctx.beginPath(); ctx.ellipse(0, -4, 6.5, 4, -.12, 0, 7); ctx.fill();
    ctx.fillStyle = '#6e7480'; ctx.beginPath(); ctx.ellipse(-1.5, -4, 4.2, 2.4, -.2, 0, 7); ctx.fill();
    if (air) { const f = Math.sin(p.fly * 22) * 5; ctx.fillStyle = '#7c828c'; ctx.beginPath(); ctx.ellipse(-1, -6 - f, 7, 2.2, -.5 - f * .05, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#4f8a86'; ctx.beginPath(); ctx.ellipse(4, -6, 2.4, 2.2, 0, 0, 7); ctx.fill();
    const hy = peck ? -1.5 : -8; ctx.fillStyle = '#8b929c'; ctx.beginPath(); ctx.arc(6.4, hy, 2.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8b04a'; ctx.beginPath(); ctx.moveTo(8.4, hy - .5); ctx.lineTo(10.6, hy + (peck ? 1 : .2)); ctx.lineTo(8.4, hy + .8); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(6.9, hy - 1, 1, 1);
    ctx.restore();
  }
}
function tree(g, x, y, s, r) {
  const X = x * T, Y = y * T, hue = 118 + (r() - .5) * 26, l = 26 + r() * 8;
  shadow(g, X + 4 * s, Y, 15 * s, 5.5 * s, .26);
  g.fillStyle = '#5a4030'; g.fillRect(X - 3 * s, Y - 14 * s, 6 * s, 16 * s);
  for (const [dx, dy, rr, dl] of [[0, -25, 16, 0], [-9, -19, 11, -3], [9, -20, 11, -1], [1, -32, 11, 4]]) {
    g.fillStyle = `hsl(${hue},${40 + dl}%,${l + dl}%)`; g.beginPath(); g.arc(X + dx * s, Y + dy * s, rr * s, 0, 7); g.fill();
  }
  g.fillStyle = 'rgba(255,255,220,.10)'; g.beginPath(); g.arc(X - 5 * s, Y - 31 * s, 7 * s, 0, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,.10)'; g.beginPath(); g.arc(X + 6 * s, Y - 18 * s, 9 * s, 0, 7); g.fill();
}
function pine(g, x, y, s, r) {
  const X = x * T, Y = y * T, l = 20 + r() * 7;
  shadow(g, X + 4 * s, Y, 13 * s, 5 * s, .26);
  g.fillStyle = '#4e3826'; g.fillRect(X - 2.5 * s, Y - 10 * s, 5 * s, 12 * s);
  for (const [b, w, h] of [[-6, 15, 20], [-16, 12, 18], [-25, 8.5, 16]]) {
    const yb = Y + b * s;
    g.fillStyle = `hsl(145,34%,${l}%)`; g.beginPath(); g.moveTo(X - w * s, yb); g.lineTo(X + w * s, yb); g.lineTo(X, yb - h * s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,230,.08)'; g.beginPath(); g.moveTo(X - w * s, yb); g.lineTo(X, yb); g.lineTo(X, yb - h * s); g.closePath(); g.fill();
  }
}
function buildScenery() {
  const s = document.createElement('canvas'); s.width = Math.round((WW + 2 * M) * SS); s.height = Math.round((WH + 2 * M) * SS);
  const g = s.getContext('2d'), r = rng(7);
  g.setTransform(SS, 0, 0, SS, M * SS, M * SS);
  windows.length = 0; chimneys.length = 0;
  // ground: two octaves of soft colour noise, upscaled smoothly so no tile grid shows
  for (const [cell, alpha] of [[56, 1], [18, .45]]) {
    const n = document.createElement('canvas'), nw = Math.ceil((WW + 2 * M) / cell) + 1, nh = Math.ceil((WH + 2 * M) / cell) + 1; n.width = nw; n.height = nh;
    const ng = n.getContext('2d');
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { const v = r(); ng.fillStyle = `hsl(${94 + v * 18},${33 + v * 10}%,${33 + v * 9}%)`; ng.fillRect(x, y, 1, 1); }
    g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(n, -M, -M, nw * cell, nh * cell); g.globalAlpha = 1;
  }
  for (const [gx0, gy0, gx1, gy1, rx, ry, rw, rh] of [                                // forest floor darkens past the village edge
    [-M, 0, T, 0, -M, -M, M + T, WH + 2 * M], [WW + M, 0, WW - T, 0, WW - T, -M, M + T, WH + 2 * M],
    [0, -M, 0, T, -M, -M, WW + 2 * M, M + T], [0, WH + M, 0, WH - T, -M, WH - T, WW + 2 * M, M + T]]) {
    const lg = g.createLinearGradient(gx0, gy0, gx1, gy1); lg.addColorStop(0, 'rgba(12,30,14,.55)'); lg.addColorStop(1, 'rgba(12,30,14,0)');
    g.fillStyle = lg; g.fillRect(rx, ry, rw, rh);
  }
  // lake
  g.fillStyle = '#b9a879'; g.beginPath(); g.ellipse(20 * T, 25 * T, 16.1 * T, 6 * T, 0, 0, 7); g.fill();
  g.fillStyle = '#cdbd8f'; g.beginPath(); g.ellipse(20 * T, 25 * T, 15.8 * T, 5.7 * T, 0, 0, 7); g.fill();
  const lk = g.createRadialGradient(20 * T, 26.5 * T, T, 20 * T, 25 * T, 15.5 * T); lk.addColorStop(0, '#24597d'); lk.addColorStop(.7, '#3577a0'); lk.addColorStop(1, '#4a92b5');
  g.fillStyle = lk; g.beginPath(); g.ellipse(20 * T, 25 * T, 15.5 * T, 5.4 * T, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.beginPath(); g.ellipse(20 * T, 25 * T, 15.25 * T, 5.15 * T, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
  for (let i = 0; i < 26; i++) {                                                        // reeds along the shore
    const a = Math.PI * (1.08 + r() * 0.84), x = 20 * T + Math.cos(a) * 15.2 * T, y = 25 * T + Math.sin(a) * 5.25 * T;
    if (Math.abs(x - 20 * T) < 2.6 * T) continue;
    g.strokeStyle = r() < .5 ? '#4f7a3a' : '#628c45'; g.lineWidth = 1.6; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 3, y); g.quadraticCurveTo(x + k * 4, y - 8, x + k * 6 + 2, y - 14); g.stroke(); }
  }
  // paths
  g.lineCap = 'round'; g.lineJoin = 'round';
  const stroke = (pts) => { g.beginPath(); g.moveTo(pts[0][0] * T, pts[0][1] * T); for (const p of pts.slice(1)) g.lineTo(p[0] * T, p[1] * T); g.stroke(); };
  for (const [w, c] of [[25, 'rgba(60,50,30,.25)'], [22, '#a18c62'], [17, '#c6b388'], [6, 'rgba(255,248,225,.13)']]) { g.strokeStyle = c; g.lineWidth = w; for (const pts of Object.values(pathPts)) stroke(pts); }
  for (const pts of Object.values(pathPts)) for (let i = 0; i < 26; i++) {
    const k = r() * (pts.length - 1), j = Math.floor(k), f = k - j, p = pts[j], q = pts[Math.min(j + 1, pts.length - 1)];
    g.fillStyle = r() < .5 ? 'rgba(120,100,70,.45)' : 'rgba(240,230,200,.35)'; g.beginPath(); g.ellipse(lerp(p[0], q[0], f) * T + (r() - .5) * 12, lerp(p[1], q[1], f) * T + (r() - .5) * 12, 1.8, 1.3, 0, 0, 7); g.fill();
  }
  // square: cobbled plaza
  const [sx, sy] = [20.4 * T, 13.0 * T];                 // the big square: room for shops, the well and a crowd
  g.fillStyle = '#9f8a60'; g.beginPath(); g.ellipse(sx, sy, 5.75 * T, 3.35 * T, 0, 0, 7); g.fill();
  g.fillStyle = '#c6b388'; g.beginPath(); g.ellipse(sx, sy, 5.6 * T, 3.2 * T, 0, 0, 7); g.fill();
  for (let ring = 1; ring <= 9; ring++) for (let i = 0, n = ring * 9; i < n; i++) {
    const a = i / n * Math.PI * 2 + ring, rx = ring * 0.6 * T, ry = ring * 0.345 * T;
    g.fillStyle = (i + ring) % 3 ? 'rgba(120,100,70,.16)' : 'rgba(255,248,225,.14)'; g.beginPath(); g.roundRect(sx + Math.cos(a) * rx - 5, sy + Math.sin(a) * ry - 3.5, 10, 7, 2.5); g.fill();
  }
  // grass tufts and wildflowers
  for (let i = 0; i < 2600; i++) {
    const x = -M / T + r() * (W + 2 * M / T), y = -M / T + r() * (H + 2 * M / T);
    if (inLake(x, y + 0.2) || (((x - 20.4) / 5.8) ** 2 + ((y - 13) / 3.4) ** 2 < 1) || distPaths(x, y) < 0.55) continue;
    const X = x * T, Y = y * T; g.strokeStyle = r() < .5 ? 'rgba(160,200,110,.32)' : 'rgba(20,50,20,.22)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(X - 2.5, Y - 4); g.lineTo(X, Y); g.lineTo(X + 2.5, Y - 4.5); g.moveTo(X, Y); g.lineTo(X + .5, Y - 5.5); g.stroke();
  }
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * H; if (inLake(x, y) || distPaths(x, y) < 0.7) continue;
    const c = ['#f4e36b', '#f6f2ea', '#e98bb0', '#b9a2f5'][i % 4];
    for (let k = 0; k < 5; k++) { g.fillStyle = c; g.beginPath(); g.arc(x * T + (r() - .5) * 18, y * T + (r() - .5) * 12, 1.8, 0, 7); g.fill(); }
  }
  // trees, buildings and landmarks, drawn back to front
  const items = [], P = st.places;
  for (let i = 0; i < 900 && items.length < 140; i++) {
    const x = 0.6 + r() * (W - 1.2), y = 1.4 + r() * (H - 2.4);
    if (inLake(x, y + 0.6) || distPaths(x, y) < 1.4 || nearPlace(x, y) || inMeadow(x, y) || (((x - 20.4) / 6.6) ** 2 + ((y - 13) / 4.2) ** 2 < 1)
        || (x > 26 && x < 30.5 && y > 6.6 && y < 11.4)) continue;   // the square, and the fairground lot beside it
    const k = 0.8 + r() * 0.5, pn = r() < .28; items.push([y, () => (pn ? pine : tree)(g, x, y, k, r)]);
  }
  for (let i = 0; i < 900; i++) {                                                     // dense forest past the edges
    const x = -M / T + 0.4 + r() * (W + 2 * M / T - 0.8), y = -M / T + 1 + r() * (H + 2 * M / T - 1);
    const out = x < 0.2 || x > W - 0.2 || y < 0.9 || y > H + 0.2; if (!out || inLake(x, y + 0.8)) continue;
    const k = 0.9 + r() * 0.6, pn = r() < .55; items.push([y, () => (pn ? pine : tree)(g, x, y, k, r)]);
  }
  // the Square's furniture, seen close up: two benches, a notice board and some barrels
  items.push([12.8, () => bench(g, 17.4, 12.9)]); items.push([12.9, () => bench(g, 23.3, 12.9)]);
  items.push([9.7, () => noticeBoard(g, 20.4, 9.7)]); items.push([14.3, () => barrels(g, 15.3, 14.2)]);
  items.push([P.Bakery[1], () => house(g, P.Bakery[0], P.Bakery[1], 3.4, 1.7, '#ead9b4', '#b5432e', { chimney: 1, sign: '#e0a23a' })]);
  items.push([P.Tavern[1], () => house(g, P.Tavern[0], P.Tavern[1], 4.4, 1.9, '#8a6a4a', '#3f6b46', { win: [-0.7, -0.35, 0.35, 0.7], sign: '#d8b13c', chimney: 1 })]);
  items.push([P.Library[1], () => house(g, P.Library[0], P.Library[1], 3.2, 2.3, '#9aa3ad', '#4a5670', { pitch: 1.5 })]);
  items.push([P.Workshop[1], () => { house(g, P.Workshop[0], P.Workshop[1], 3.8, 1.6, '#9c7648', '#6a4a2e'); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#b08a5a' : '#9c7a4e'; g.fillRect((P.Workshop[0] + 2.3) * T, (P.Workshop[1] - 0.2 - i * 0.22) * T, 34, 6); } }]);
  for (const [dx, dy, c] of [[-1.2, -1.6, '#b0503a'], [0.9, 0, '#a2603a'], [-1.3, 1.9, '#8f4a3a']])
    items.push([P.Cottages[1] + dy, () => house(g, P.Cottages[0] + dx, P.Cottages[1] + dy, 2.2, 1.2, '#e2d2b0', c, { win: [0.55], pitch: 0.9 })]);
  items.push([P.Shrine[1], () => { tree(g, P.Shrine[0], P.Shrine[1], 2.4, rng(11)); const X = (P.Shrine[0] - 1.6) * T, Y = (P.Shrine[1] - 0.2) * T; shadow(g, X + 8, Y + 24, 12, 4); g.fillStyle = '#a9aaa6'; g.beginPath(); g.roundRect(X, Y, 16, 24, [6, 6, 1, 1]); g.fill(); g.fillStyle = '#e3b95a'; g.fillRect(X + 5, Y + 6, 6, 6); windows.push([X + 8, Y + 9, .5]); }]);
  const [fx, fy] = P.Woods;
  for (let i = 0; i < 15; i++) { const x = fx + (r() - .5) * 7.5, y = fy - 1.6 + r() * 2.6, k = 0.9 + r() * 0.6, pn = r() < .6; items.push([y, () => (pn ? pine : tree)(g, x, y, k, r)]); }
  items.push([fy + 1.2, () => { for (const [a, b] of [[-1.6, 1.1], [1.4, 1.3], [0.2, 0.9]]) { shadow(g, (fx + a) * T, (fy + b) * T + 3, 9, 3); g.fillStyle = '#7a5a3a'; g.beginPath(); g.ellipse((fx + a) * T, (fy + b) * T, 8, 5, 0, 0, 7); g.fill(); g.fillStyle = '#c9a56a'; g.beginPath(); g.ellipse((fx + a) * T, (fy + b) * T - 2, 7, 4, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(122,90,58,.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse((fx + a) * T, (fy + b) * T - 2, 3.5, 2, 0, 0, 7); g.stroke(); } }]);
  const [ox, oy] = P.Oracle;
  items.push([oy + 0.9, () => {
    g.fillStyle = 'rgba(60,50,90,.35)'; g.beginPath(); g.ellipse(ox * T, (oy + 0.3) * T, 2.3 * T, 1.15 * T, 0, 0, 7); g.fill();
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.05 + i * 0.15) + Math.PI, sx = ox * T + Math.cos(a) * 2 * T, sy = (oy + 0.3) * T + Math.sin(a) * 1 * T, h = 30 + (i % 3) * 9;
      shadow(g, sx + 3, sy + 1, 9, 4, .3);
      g.fillStyle = '#8b8f99'; g.beginPath(); g.roundRect(sx - 7, sy - h, 14, h, 5); g.fill(); g.fillStyle = '#6d717b'; g.beginPath(); g.roundRect(sx + 1, sy - h + 3, 6, h - 4, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(sx - 5, sy - h + 5, 2, h - 10); g.fillStyle = 'rgba(90,140,80,.5)'; g.fillRect(sx - 7, sy - 6, 14, 4); }
    g.fillStyle = '#5d6069'; g.beginPath(); g.ellipse(ox * T, (oy + 0.35) * T, 15, 8, 0, 0, 7); g.fill();
  }]);
  const [qx, qy] = P.Quarry;
  items.push([qy + 0.8, () => {
    shadow(g, qx * T, (qy + 0.8) * T, 2.4 * T, 10);
    g.fillStyle = '#6f7378'; g.beginPath(); g.moveTo((qx - 2.3) * T, (qy + 0.8) * T); g.lineTo((qx - 1.9) * T, (qy - 1.2) * T); g.lineTo((qx - 0.4) * T, (qy - 2) * T); g.lineTo((qx + 1.2) * T, (qy - 1.5) * T); g.lineTo((qx + 2.2) * T, (qy + 0.8) * T); g.closePath(); g.fill();
    g.fillStyle = '#8e9297'; g.beginPath(); g.moveTo((qx - 1.5) * T, (qy + 0.8) * T); g.lineTo((qx - 1.2) * T, (qy - 0.7) * T); g.lineTo((qx + 0.3) * T, (qy - 1.3) * T); g.lineTo((qx + 1.3) * T, (qy + 0.8) * T); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.moveTo((qx - 1.9) * T, (qy - 1.2) * T); g.lineTo((qx - 0.4) * T, (qy - 2) * T); g.lineTo((qx - 1.2) * T, (qy - 0.7) * T); g.closePath(); g.fill();
    g.fillStyle = '#55595e'; g.fillRect((qx - 0.5) * T, (qy - 0.1) * T, 30, 29);
    for (const [a, b, w] of [[-2.2, 1.1, 16], [1.6, 1.2, 20], [0.9, 1.5, 12]]) { g.fillStyle = '#a3a7ab'; g.fillRect((qx + a) * T, (qy + b) * T, w, w * 0.7); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect((qx + a) * T, (qy + b) * T + w * 0.5, w, w * 0.2); }
  }]);
  if (P.Hospital) items.push([P.Hospital[1], () => {
    const [hx, hy] = P.Hospital; house(g, hx, hy, 3.6, 1.8, '#eeeae0', '#8a9aa8', { win: [-0.6, 0, 0.6], pitch: 0.8 });
    const X = hx * T, Y = (hy - 2.75) * T; g.fillStyle = '#f7f3ea'; g.beginPath(); g.arc(X, Y, 9, 0, 7); g.fill();
    g.fillStyle = '#c8463c'; g.fillRect(X - 2.5, Y - 6.5, 5, 13); g.fillRect(X - 6.5, Y - 2.5, 13, 5);
  }]);
  if (P.Cemetery) items.push([P.Cemetery[1] - 1.3, () => {
    const [cx, cy] = P.Cemetery; tree(g, cx + 3.4, cy - 0.9, 1.3, rng(77));   // an old yew by the gate
  }]);
  const lamp = (x, y) => items.push([y, () => { const X = x * T, Y = y * T; shadow(g, X + 2, Y, 5, 2); g.fillStyle = '#3d3a36'; g.fillRect(X - 1.5, Y - 30, 3, 30); g.fillStyle = '#2f2c28'; g.fillRect(X - 5, Y - 38, 10, 9); g.fillStyle = '#f2d48a'; g.fillRect(X - 3, Y - 36, 6, 5); windows.push([X, Y - 33.5, .9]); }]);
  lamp(15.2, 11.6); lamp(25.6, 11.6); lamp(15.2, 14.8); lamp(25.6, 14.8); lamp(P.Tavern[0] - 2.8, P.Tavern[1] + 0.3); lamp(P.Dock[0] - 2, P.Dock[1] + 0.5);
  items.sort((a, b) => a[0] - b[0]).forEach(i => i[1]());
  // garden
  const [gx, gy] = P.Garden;
  g.fillStyle = 'rgba(80,60,35,.25)'; g.fillRect((gx - 2.6) * T, (gy - 1.9) * T, 5.2 * T, 2.9 * T);
  g.strokeStyle = '#7a5a3a'; g.lineWidth = 3; g.strokeRect((gx - 2.6) * T, (gy - 1.9) * T, 5.2 * T, 2.9 * T);
  for (let i = 0; i < 4; i++) { g.fillStyle = '#6b4a30'; g.beginPath(); g.roundRect((gx - 2.3) * T, (gy - 1.6 + i * 0.65) * T, 4.6 * T, 9, 4); g.fill(); for (let j = 0; j < 12; j++) { const X = (gx - 2.1 + j * 0.38) * T, Y = (gy - 1.52 + i * 0.65) * T; g.fillStyle = '#3f7a35'; g.beginPath(); g.arc(X, Y + 1, 4.5, 0, 7); g.fill(); g.fillStyle = ['#6fbf5a', '#b06fd0', '#f0d24a', '#e86a6a'][(i + j) % 4]; g.beginPath(); g.arc(X, Y - 1, 3.2, 0, 7); g.fill(); } }
  // meadow: mown ground, a split-rail fence and a hay cart, waiting for farms
  if (P.Meadow) {
    const [mx, my] = P.Meadow, x0 = (mx - 5.2) * T, y0 = (my - 6.6) * T, mw = 10.4 * T, mh = 13.4 * T;
    g.fillStyle = 'rgba(190,200,110,.16)'; g.beginPath(); g.roundRect(x0, y0, mw, mh, 26); g.fill();
    g.save(); g.beginPath(); g.roundRect(x0, y0, mw, mh, 26); g.clip(); for (let yy = y0 + 18; yy < y0 + mh; yy += 36) { g.fillStyle = 'rgba(235,225,140,.10)'; g.fillRect(x0, yy, mw, 18); } g.restore();   // mown stripes
    for (const [bx, by] of [[mx - 4.1, my + 5.6], [mx - 3.3, my + 5.8], [mx + 3.9, my - 5.4]]) { const X = bx * T, Y = by * T; shadow(g, X, Y + 4, 12, 4); g.fillStyle = '#d9b85a'; g.beginPath(); g.ellipse(X, Y - 6, 11, 9, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(120,85,30,.55)'; g.lineWidth = 1; g.stroke(); g.beginPath(); g.moveTo(X - 9, Y - 8); g.lineTo(X + 9, Y - 4); g.moveTo(X - 8, Y - 3); g.lineTo(X + 8, Y - 10); g.stroke(); }   // round haybales
    g.strokeStyle = '#7a5a3a'; g.lineWidth = 2.5;
    for (const yy of [y0 + 4, y0 + 12]) { g.beginPath(); g.moveTo(x0 + 10, yy); g.lineTo(x0 + mw - 10, yy); g.stroke(); }
    for (let x = x0 + 10; x <= x0 + mw - 10; x += 36) { g.fillStyle = '#5a4030'; g.fillRect(x - 2, y0 - 2, 4, 18); }
    for (let i = 0; i < 70; i++) { const X = x0 + 20 + r() * (mw - 40), Y = y0 + 30 + r() * (mh - 50); g.fillStyle = r() < .5 ? 'rgba(240,226,140,.5)' : 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(X, Y, 1.6, 0, 7); g.fill(); }
    const cx = (mx + 2.6) * T, cy = (my + 0.6) * T;
    shadow(g, cx, cy + 4, 20, 6); g.fillStyle = '#8a6a44'; g.fillRect(cx - 16, cy - 12, 32, 12);
    g.fillStyle = '#e2c46a'; g.beginPath(); g.ellipse(cx, cy - 14, 15, 8, 0, 0, 7); g.fill();
    g.fillStyle = '#4a3222'; for (const dx of [-10, 10]) { g.beginPath(); g.arc(cx + dx, cy + 1, 5, 0, 7); g.fill(); }
  }
  // cemetery ground: mown grass inside a low stone wall, with a gate facing the path
  if (P.Cemetery) {
    const [cx, cy] = P.Cemetery, x0 = (cx - 3) * T, y0 = (cy - 1.5) * T, w = 6 * T, h = 2.7 * T;
    g.fillStyle = 'rgba(120,150,90,.28)'; g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.fill();
    const wall = () => { g.beginPath(); g.moveTo(x0 + w / 2 - 14, y0 + h); g.lineTo(x0, y0 + h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0 + w / 2 + 14, y0 + h); };
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(40,40,36,.35)'; g.lineWidth = 8; g.save(); g.translate(0, 2); wall(); g.stroke(); g.restore();
    g.strokeStyle = '#8c8a84'; g.lineWidth = 6; wall(); g.stroke(); g.strokeStyle = '#b5b2aa'; g.lineWidth = 2; g.save(); g.translate(0, -1.5); wall(); g.stroke(); g.restore();   // a wall with a pale cap and a shadow
    for (const [px, py] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]]) { g.fillStyle = '#77756f'; g.fillRect(px - 4, py - 7, 8, 12); g.fillStyle = '#a19e96'; g.fillRect(px - 4, py - 8, 8, 3); }
    g.fillStyle = '#6d6b66'; for (const dx of [-16, 12]) { g.fillRect(x0 + w / 2 + dx, y0 + h - 12, 5, 16); g.fillStyle = '#9a978f'; g.fillRect(x0 + w / 2 + dx, y0 + h - 13, 5, 3); g.fillStyle = '#6d6b66'; }
    const rc = rng(404); for (let i = 0; i < 26; i++) { g.fillStyle = ['#cbbf9c', '#b8ac8a', '#d8cfb2'][i % 3]; g.beginPath(); g.ellipse(x0 + w / 2 + (rc() - .5) * 22, y0 + h + 2 + rc() * 34, 2.2 + rc() * 1.6, 1.4 + rc(), 0, 0, 7); g.fill(); }   // gravel from the gate
    for (const [px, py] of [[x0 + 12, y0 + 10], [x0 + w - 14, y0 + 12], [x0 + 16, y0 + h - 8], [x0 + w - 18, y0 + h - 10]]) for (let i = 0; i < 5; i++) { g.fillStyle = ['#f4e36b', '#e98bb0', '#f6f2ea', '#c58cf0', '#f09a5a'][(i + Math.floor(px)) % 5]; g.beginPath(); g.arc(px + (rc() - .5) * 14, py + (rc() - .5) * 8, 1.7, 0, 7); g.fill(); }   // flower patches in the corners
  }
  // well
  const [wx, wy] = P.Square;
  shadow(g, wx * T, wy * T + 4, 26, 9);
  g.fillStyle = '#7d7f7c'; g.beginPath(); g.ellipse(wx * T, wy * T + 2, 20, 12, 0, 0, 7); g.fill();
  g.fillStyle = '#9a9c98'; g.beginPath(); g.ellipse(wx * T, wy * T, 20, 12, 0, 0, 7); g.fill();
  g.fillStyle = '#1b2731'; g.beginPath(); g.ellipse(wx * T, wy * T, 13, 7, 0, 0, 7); g.fill();
  g.fillStyle = '#5a4030'; g.fillRect(wx * T - 20, wy * T - 34, 4, 34); g.fillRect(wx * T + 16, wy * T - 34, 4, 34); g.fillRect(wx * T - 18, wy * T - 26, 36, 2.5);
  g.fillStyle = '#8a3f2e'; g.beginPath(); g.moveTo(wx * T - 28, wy * T - 32); g.lineTo(wx * T, wy * T - 50); g.lineTo(wx * T + 28, wy * T - 32); g.fill();
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(wx * T - 28, wy * T - 32); g.lineTo(wx * T, wy * T - 50); g.lineTo(wx * T, wy * T - 32); g.fill();
  // dock + boat
  const [dx, dy] = P.Dock;
  shadow(g, dx * T, (dy + 3.1) * T, 1.9 * T, 8, .3);
  g.fillStyle = '#8a6a44'; g.fillRect((dx - 1.7) * T, (dy + 0.5) * T, 3.4 * T, 2.6 * T);
  g.strokeStyle = '#6a4e30'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo((dx - 1.7) * T, (dy + 0.5 + i * 0.3) * T); g.lineTo((dx + 1.7) * T, (dy + 0.5 + i * 0.3) * T); g.stroke(); }
  g.fillStyle = '#5a3f26'; for (const px of [-1.7, 1.55]) for (const py of [1.4, 3.0]) g.fillRect((dx + px) * T, (dy + py) * T, 5, 8);
  g.fillStyle = '#6b4a30'; g.beginPath(); g.ellipse((dx + 3.2) * T, (dy + 2.5) * T, 34, 11, -0.15, 0, 7); g.fill();
  g.fillStyle = '#c9a56a'; g.beginPath(); g.ellipse((dx + 3.2) * T, (dy + 2.45) * T, 26, 7, -0.15, 0, 7); g.fill();
  scenery = s;
}
