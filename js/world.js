// ================================================================ dynamic world
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
