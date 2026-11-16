// ================================================================ frame
// ================================================================ event effects
const fx = [], structPos = {}; let fxUpTo = null, lastT = 0, shake = 0;
const STRUCT_H = { house: 58, shed: 38, stall: 52, boat: 62, tower: 100, beehive: 22, mill: 90, statue: 56, farm: 26, bank: 70, granary: 84, kitchen: 62, market: 56, hall: 96, school: 80, lane1: 40, lane2: 40, wheel: 120 };
function fxEvents() {   // turn events that arrive after the page loaded into short-lived effects
  const evs = st.events || [], real = evs.filter(e => e.id < 9e6), age = +DEBUG.xage || 0, t0 = lastT - age;
  if (fxUpTo === null) fxUpTo = Math.max(0, ...real.map(e => e.id));
  const sById = {}; for (const s of st.structures) sById[s.id] = s;
  for (const e of evs) {
    if (e.id <= fxUpTo) continue; fxUpTo = Math.max(fxUpTo, e.id); if (e.id >= 9e6) fxUpTo = Math.max(fxUpTo, 0);
    if (e.kind === 'disaster') { if (e.name === 'tremor') { if (!REDUCE) fx.push({ k: 'tremor', t0 }); } else for (const id of e.hit || []) { const p = sById[id] || structPos[id]; if (p) fx.push({ k: e.name, x: p.x * T, y: p.y * T, t0, id, seed: id }); } }
    else if (e.kind === 'birth') { const c = st.places.Cottages; fx.push({ k: 'birth', x: c[0] * T, y: (c[1] + 1) * T, t0 }); }
    else if (e.kind === 'family') { const m = /^(\w+) and (\w+) decided/.exec(e.text || ''); if (m) fx.push({ k: 'family', a: m[1], b: m[2], t0 }); }
    else if (e.kind === 'turn' && /^finished (building|repairing)/.test(e.did || '')) { const s = st.structures.find(q => e.did.includes(`${q.owner}'s ${q.type}`)); if (s) fx.push({ k: 'dust', x: s.x * T, y: s.y * T, t0 }); }
  }
  for (const s of st.structures) structPos[s.id] = { x: s.x, y: s.y };
}
function flame(g, x, y, t, sz, seed) {   // one flickering tongue of fire
  const fl = REDUCE ? 1 : 1 + Math.sin(t / 90 + seed * 2.3) * .22 + Math.sin(t / 47 + seed) * .12;
  for (const [c, k] of [['#e8541f', 1], ['#f6a12b', .68], ['#ffe27a', .36]]) { g.fillStyle = c; g.beginPath(); g.moveTo(x - 6 * sz * k, y); g.quadraticCurveTo(x - 7 * sz * k, y - 12 * sz * k * fl, x + Math.sin(t / 130 + seed) * 2 * sz, y - 24 * sz * k * fl); g.quadraticCurveTo(x + 7 * sz * k, y - 12 * sz * k * fl, x + 6 * sz * k, y); g.closePath(); g.fill(); }
}
function heart(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r); g.bezierCurveTo(x - r * 2, y - r * .2, x - r * .8, y - r * 1.6, x, y - r * .5); g.bezierCurveTo(x + r * .8, y - r * 1.6, x + r * 2, y - r * .2, x, y + r); g.fill(); }
function drawFx(t, wind, under) {   // under: ground effects (floods) drawn before buildings and people
  for (let n = fx.length - 1; n >= 0; n--) {
    const f = fx[n], a = t - f.t0, g = ctx, dur = { lightning: 20000, flood: 30000, gale: 8000, tremor: 400, birth: 6000, family: 5000, dust: 3000 }[f.k];
    if (a > dur || a < -1000) { fx.splice(n, 1); continue; } if ((f.k === 'flood') !== !!under) continue; const k = a / dur, fade = Math.min(1, a / 1500, (dur - a) / (dur * .2));
    if (f.k === 'lightning') {   // the building burns for twenty seconds
      g.save(); g.globalAlpha = Math.min(1, fade * 1.4); const h = (STRUCT_H[(st.structures.find(q => q.id === f.id) || {}).type] || 50) * .55;
      for (let i = 0; i < 5; i++) flame(g, f.x + (i - 2) * 11 + Math.sin(i * 2.1 + f.seed) * 4, f.y - 8 - (i % 2) * h * .5, t, 1 + (i % 3 === 1 ? .3 : 0), i + f.seed); g.restore();
      smoke(f.x + 4, f.y - h * 2.1, t, f.seed, wind, 1.5); glow(f.x, f.y - 22, 70, .25 * fade, '255,150,60');
    } else if (f.k === 'flood') {   // water spreads around the building
      const r = 1 + Math.min(1, a / 3000) * .35; g.save(); g.globalAlpha = fade * .8; g.fillStyle = 'rgba(70,140,200,.5)'; g.beginPath(); g.ellipse(f.x, f.y + 6, 70 * r, 26 * r, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(230,245,255,.55)'; g.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const q = ((REDUCE ? .3 : t / 2200) + i / 3) % 1; g.globalAlpha = fade * (1 - q) * .8; g.beginPath(); g.ellipse(f.x + (i - 1) * 24, f.y + 6, (10 + q * 28) * r, (4 + q * 10) * r, 0, 0, 7); g.stroke(); } g.restore();
    } else if (f.k === 'gale') {   // debris tears off and blows away
      g.save(); for (let i = 0; i < 14; i++) { const q = (k * 1.4 + i * .07) % 1, x = f.x + (i - 7) * 4 + q * (150 + i * 12), y = f.y - 20 - (i % 4) * 9 - Math.sin(q * 6 + i) * 14 + q * 10;
        g.globalAlpha = Math.min(1, (1 - k) * 2) * (1 - q * .6); g.save(); g.translate(x, y); g.rotate((REDUCE ? 0 : t / 120) + i); g.fillStyle = ['#8a6238', '#c9a56a', '#d8ccb0', '#6b4a30'][i % 4]; g.fillRect(-4, -1.4, 8, 2.8); g.restore(); } g.restore();
    } else if (f.k === 'birth') {
      g.save(); for (let i = 0; i < 9; i++) { const q = (k * 1.2 + i / 9) % 1, x = f.x + Math.sin(i * 2.7) * 38, y = f.y - 12 - q * 44 - (i % 3) * 6; g.globalAlpha = Math.sin(q * Math.PI) * fade; g.fillStyle = i % 2 ? '#fff3b0' : '#ffd1e6'; g.fillRect(x - 1, y - 4, 2, 8); g.fillRect(x - 4, y - 1, 8, 2); }
      g.globalAlpha = fade; heart(g, f.x + 4, f.y - 30 - k * 48, 5 + Math.sin(a / 200), '#f48fb1'); g.restore();
    } else if (f.k === 'family') {
      const A = pos[f.a], B = pos[f.b], pa = st.agents.find(q => q.name === f.a), pb = st.agents.find(q => q.name === f.b); if (!A || !B || !pa || !pb || pa.place !== pb.place) continue;
      g.save(); g.globalAlpha = fade; for (let i = 0; i < 2; i++) { const q = (k * 1.5 + i * .45) % 1; heart(g, (A.x + B.x) / 2 * T + (i ? 8 : -8) + Math.sin(q * 7 + i) * 4, (A.y + B.y) / 2 * T - 44 - q * 30, 3.4, i ? '#f48fb1' : '#ef7f9f'); } g.restore();
    } else if (f.k === 'dust') {   // a burst of golden dust where something was finished
      g.save(); for (let i = 0; i < 18; i++) { const an = i * 2.4, sp = 18 + (i % 5) * 9, q = Math.min(1, k * 1.1); g.globalAlpha = (1 - k) * .9; g.fillStyle = i % 3 ? '#f6d36b' : '#fff0b0'; g.beginPath(); g.arc(f.x + Math.cos(an) * sp * q * 1.6, f.y - 20 - Math.abs(Math.sin(an)) * sp * q * 1.8 + q * q * 20, 2.2 - k, 0, 7); g.fill(); } g.restore();
    }
  }
}
function speakerSpot() {   // where the voice being played comes from: [x, headY, feetY, scale, side, colour] in world px, or null
  if (!hear.now) return null; const who = hear.now.who;
  if (who === 'The Oracle') { const [ox, oy] = st.places.Oracle; return [ox * T, oy * T - 26, oy * T + 12, 1.9, 1, '#a98cf0']; }
  const a = st.agents.find(q => q.name === who), p = pos[who]; if (!a || !p) return null;
  const m = figMetrics(a, FIG); return [p.x * T, p.y * T - m.headY, p.y * T, m.S, p.face < 0 ? -1 : 1, a.color];
}
function drawSpeaking(t) {   // a pulsing ring at the feet and three sound-wave arcs beside the head of whoever is being heard
  const sp = speakerSpot(); if (!sp) return; const [x, hy, by, S, side, col] = sp, k = REDUCE ? .4 : (t / 800) % 1, g = ctx;
  g.save(); g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = .55; g.beginPath(); g.ellipse(x, by + 1, 14 * S, 6 * S, 0, 0, 7); g.stroke();
  g.strokeStyle = '#ffe08a'; g.lineWidth = 2.4; g.globalAlpha = (1 - k) * .85; g.beginPath(); g.ellipse(x, by + 1, (14 + k * 12) * S, (6 + k * 5) * S, 0, 0, 7); g.stroke();
  for (let i = 0; i < 3; i++) { g.globalAlpha = REDUCE ? .8 - i * .2 : Math.max(.12, 1 - Math.abs(i - k * 3) / 1.6) * .95; g.strokeStyle = '#fff6d0'; g.lineWidth = 2.2; const r = (8 + i * 5.5) * (S > 1.5 ? 1.5 : 1), ox = x + side * (11 * S + 2);
    g.beginPath(); if (side > 0) g.arc(ox - r * .5, hy, r, -.85, .85); else g.arc(ox + r * .5, hy, r, Math.PI - .85, Math.PI + .85); g.stroke(); }
  g.restore();
}
function shakeOffset(t) { const f = fx.find(q => q.k === 'tremor'); if (!f) return [0, 0]; const a = t - f.t0, m = Math.max(0, 1 - a / 400) * 5; return [Math.sin(a / 22) * m, Math.cos(a / 17) * m * .7]; }
function smoke(x, y, t, seed, wind, k = 1) {   // a curl of chimney smoke: five puffs rising and fading
  for (let i = 0; i < 5; i++) { const q = ((REDUCE ? .4 : t / 2400) + i / 5 + seed * .37) % 1, drift = wind ? q * 40 : Math.sin(q * 5 + i + seed) * 6; ctx.fillStyle = `rgba(232,232,232,${.38 * k * (1 - q)})`; ctx.beginPath(); ctx.arc(x + drift, y - q * 46, 5 + q * 9, 0, 7); ctx.fill(); }
}
const WAVES = Array.from({ length: 30 }, (_, i) => {      // the lake's drifting wave arcs: their numbers never change, so they are worked out once
  const r4 = rng(i * 53 + 11), p = REDUCE ? 0 : 9000 + r4() * 5000, o = REDUCE ? 0 : r4(), x0 = r4() * 30 * T, y = (19.7 + r4() * 5) * T, wd = 10 + r4() * 18, sp = .004 + r4() * .006;
  return { p, o, x0, y, wd, sp };
});
let mistTex = null, vigKey = '', vigGr = null;
function mistSprite() {   // one soft, wide, flat blob drawn once; the mist bands are scaled copies of it
  if (mistTex) return mistTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); g.scale(1, .25);
  for (const [cx, cy, r] of [[256, 256, 250], [130, 240, 150], [390, 270, 160]]) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(228,234,240,.75)'); gr.addColorStop(.55, 'rgba(228,234,240,.32)'); gr.addColorStop(1, 'rgba(228,234,240,0)'); g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
  return mistTex = c;
}
let prev = performance.now();
function frame(t) {
  if (FROZEN == null && ((!busy && t - lastDraw < 100) || (!moving && t - lastDraw < 33))) { requestAnimationFrame(frame); return; }   // nothing moving: ambient animation at 30 fps (reduced motion: every 100 ms) instead of 60
  const t0 = DEBUG.fps ? performance.now() : 0; lastDraw = t;
  const dt = Math.min(0.1, (t - prev) / 1000); prev = t; if (FROZEN != null) t = FROZEN; lastT = t;
  if (st && scenery) {
    const asleep = st.phase === 'night';
    for (const a of st.agents) {                         // walk along routes
      const p = pos[a.name]; let left = walkSpeed(a) * dt; p.walking = false;   // the hungry, the sick and the old go slower
      while (p.route.length && left > 0) {
        const [tx, ty] = p.route[0], d = Math.hypot(tx - p.x, ty - p.y), ox = p.x;
        if (d <= left) { p.x = tx; p.y = ty; p.route.shift(); left -= d; p.phase = (p.phase || 0) + d / strideLen(a); } else { p.x += (tx - p.x) / d * left; p.y += (ty - p.y) / d * left; p.phase = (p.phase || 0) + left / strideLen(a); left = 0; }   // the step cycle follows the distance walked
        p.walking = true; if (Math.abs(p.x - ox) > 1e-4) p.face = Math.sign(p.x - ox);   // remember which way they last moved
      }
    }
    if (cam.follow && selected && pos[selected]) { cam.tx = pos[selected].x * T; cam.ty = pos[selected].y * T - 20; clampT(); }
    const k = 1 - Math.pow(0.0004, dt); cam.x = lerp(cam.x, cam.tx, k); cam.y = lerp(cam.y, cam.ty, k); cam.z = lerp(cam.z, cam.tz, k);
    { const tgt = REDUCE || st.phase === 'night' ? 0 : /storm/.test(st.weather) ? 2.6 : /windy/.test(st.weather) ? 2 : /rain/.test(st.weather) ? .5 : .77;   // sails turn faster in wind and stop at night
      millSp = lerp(millSp, tgt, 1 - Math.pow(.2, dt)); millAng = FROZEN != null ? FROZEN / 1300 : REDUCE ? .4 : millAng + millSp * dt; }
    const z = cam.z, vx0 = cam.x - vw / 2 / z, vx1 = cam.x + vw / 2 / z, vy0 = cam.y - vh / 2 / z, vy1 = cam.y + vh / 2 / z, lakeVis = vy1 > 19.4 * T && vx1 > 4 * T && vx0 < 36 * T;   // what is on screen, in world px
    const vis = (x, y, mx, up, dn) => x > vx0 - mx && x < vx1 + mx && y > vy0 - dn && y < vy1 + up;   // is a thing with this margin (px) on screen?
    const w = st.weather, S = sky(st.minute, w), rain = /rain|storm/.test(w), wind = /windy|storm/.test(w);
    const hrL = st.minute / 60, lampMist = /mist/.test(w) ? .6 : 1,                                         // lamps and windows come on by the clock, not only when the sky is dark
      lamp = Math.max(S.light, hrL >= 17.75 && hrL < 22 ? clamp((hrL - 17.75) / 1.25, 0, 1) * .6 : 0, hrL >= 5 && hrL < 7.25 ? clamp((7.25 - hrL) / 1.5, 0, 1) * .6 : 0);
    lampNow = lamp;   // the figures read this to carry a lit lantern
    bubbleTone = 1 - .2 * clamp(lamp, 0, 1);

    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#16241a'; ctx.fillRect(0, 0, cv.width, cv.height);
    const [shx0, shy0] = shakeOffset(t);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z + shx0), dpr * (vh / 2 - cam.y * z + shy0));
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(scenery, -M, -M, WW + 2 * M, WH + 2 * M);
    if (z > 1 && st.phase !== 'night' && !/storm|rain/.test(st.weather) && vis(20.4 * T, 13 * T, 220, 120, 120)) { stepPigeons(dt, t); drawPigeons(t); }

    if (!REDUCE && S.light < .6 && !rain) for (let i = 0; i < 3; i++) {   // drifting cloud shadows
      const cx = ((t / (wind ? 30 : 70) + i * 700) % (WW + 2 * M + 1000)) - M - 500, cy = 120 + i * 260 + Math.sin(i * 3) * 80;
      if (!cloudGr) { cloudGr = ctx.createRadialGradient(0, 0, 20 / 380, 0, 0, 1); cloudGr.addColorStop(0, 'rgba(10,20,30,.10)'); cloudGr.addColorStop(1, 'rgba(10,20,30,0)'); }
      if (cx > vx0 - 380 && cx < vx1 + 380) { ctx.save(); ctx.translate(cx, cy); ctx.scale(380, 380); ctx.fillStyle = cloudGr; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); }
    }
    if (lakeVis) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(20 * T, 25 * T, 15.4 * T, 5.3 * T, 0, 0, 7); ctx.clip();   // everything on the water stays inside the lake
    ctx.lineCap = 'round'; ctx.lineWidth = 1.8;                                                        // drifting wave arcs that fade in and out
    for (const wv of WAVES) {
      const ph = REDUCE ? .5 : (t / wv.p + wv.o) % 1, y = wv.y, wd = wv.wd, xx = 5 * T + (wv.x0 + (REDUCE ? 0 : t * wv.sp)) % (30 * T); ctx.strokeStyle = `rgba(255,255,255,${.3 * Math.sin(ph * Math.PI)})`; ctx.beginPath(); ctx.moveTo(xx - wd, y); ctx.quadraticCurveTo(xx, y - 3.5, xx + wd, y); ctx.stroke();
    }
    ctx.strokeStyle = `rgba(255,255,255,${wind ? .5 : .28})`; ctx.lineWidth = wind ? 2.4 : 1.6; ctx.setLineDash([9, 13]); ctx.lineDashOffset = REDUCE ? 0 : -t / 90;   // shore foam
    ctx.beginPath(); ctx.ellipse(20 * T, 25 * T, 15.1 * T, 5.03 * T, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = .26; for (const s of st.structures) if (s.done && (s.type === 'boat' || s.type === 'tower')) {   // wobbly reflections of boats and towers
      ctx.save(); ctx.translate(0, s.y * T + 4); ctx.transform(1, 0, REDUCE ? 0 : Math.sin(t / 700 + s.id) * .05, -.6, 0, 0); ctx.translate(0, -(s.y * T + 4)); drawStruct(s, t, []); ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.restore();
    if (S.light < .5 && !rain) for (let i = 0; i < 4; i++) {                                           // ducks paddling in slow loops, with little V wakes
      const [cx, cy, rx, ry] = [[10, 22.6, 2.6, .8], [26.5, 22.4, 2.4, .7], [14.5, 23.5, 2.2, .6], [31, 22.8, 1.8, .6]][i], sp = (i % 2 ? -1 : 1) * (.00011 + i * .00002), a = REDUCE ? i * 2 : t * sp + i * 1.9;
      const x = (cx + Math.cos(a) * rx) * T, y = (cy + Math.sin(a) * ry) * T, dir = Math.sign(-Math.sin(a) * sp) || 1, bob = REDUCE ? 0 : Math.sin(t / 500 + i) * .6;
      if (!inLake(x / T, y / T - .5)) continue;
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - dir * 5, y + 1); ctx.lineTo(x - dir * 17, y - 3); ctx.moveTo(x - dir * 5, y + 1); ctx.lineTo(x - dir * 17, y + 5); ctx.stroke();
      shadow(ctx, x, y + 2, 7, 2.2, .2); ctx.fillStyle = i % 2 ? '#a77f4f' : '#f2ede0'; ctx.beginPath(); ctx.ellipse(x, y - 1 + bob, 6.5, 3.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = i % 2 ? '#8a6238' : '#ddd5c2'; ctx.beginPath(); ctx.ellipse(x - dir * 2.4, y - 1.4 + bob, 3, 1.9, -.2 * dir, 0, 7); ctx.fill();   // wing
      ctx.fillStyle = '#2f7a4a'; ctx.beginPath(); ctx.arc(x + dir * 5.4, y - 4.6 + bob, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = '#e8a23a'; ctx.beginPath(); ctx.moveTo(x + dir * 7.4, y - 4.8 + bob); ctx.lineTo(x + dir * 10, y - 4 + bob); ctx.lineTo(x + dir * 7.4, y - 3.4 + bob); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(x + dir * 5.8 - .5, y - 5.4 + bob, 1.2, 1.2);
    }
    if (!REDUCE) { const k = Math.floor(t / 10000), tt = t % 10000;                                   // a fish jumps about every ten seconds
      if (tt < 1700) { const r5 = rng(k * 17 + 5), fx0 = (8 + r5() * 24) * T, fy0 = (21.2 + r5() * 2.6) * T, dx = (r5() < .5 ? -1 : 1) * 26;
        const ring = (cx, cy, age) => { if (age > 0 && age < 1000) { ctx.strokeStyle = `rgba(235,245,255,${.55 * (1 - age / 1000)})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(cx, cy, 2 + age / 90, 1 + age / 240, 0, 0, 7); ctx.stroke(); } };
        if (inLake(fx0 / T, fy0 / T) && inLake(fx0 / T + dx / T, fy0 / T)) {
          ring(fx0, fy0, tt); ring(fx0, fy0, tt - 160); ring(fx0 + dx, fy0, tt - 700); ring(fx0 + dx, fy0, tt - 860);
          if (tt < 700) { const q = tt / 700, fx = fx0 + dx * q, fy = fy0 - Math.sin(q * Math.PI) * 15;
            ctx.save(); ctx.translate(fx, fy); ctx.scale(Math.sign(dx), 1); ctx.rotate(Math.cos(q * Math.PI) * -.9); ctx.fillStyle = '#c9d6df'; ctx.strokeStyle = 'rgba(20,40,60,.5)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.2, 0, 0, 7); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#9fb3c1'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-8, -2.4); ctx.lineTo(-8, 2.4); ctx.closePath(); ctx.fill(); ctx.restore(); }
        } }
    }
    }
    if (lakeVis && rain && !REDUCE) for (let i = 0; i < 14; i++) {                                                 // rain rings on the lake
      const ph = ((t / 1400) + i * 0.37) % 1, r2 = rng(i * 31 + Math.floor((t / 1400) + i * 0.37)), x = (6 + r2() * 28) * T, y = (20.6 + r2() * 4) * T;
      if (!inLake(x / T, y / T)) continue; ctx.strokeStyle = `rgba(220,235,255,${.45 * (1 - ph)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, 2 + ph * 12, 1 + ph * 4, 0, 0, 7); ctx.stroke();
    }

    if (st.places.Meadow && vis(st.places.Meadow[0] * T, st.places.Meadow[1] * T, 260, 260, 260)) { drawLots(); if (z > .5) drawSheep(t); }
    const order = st.agents.slice().sort((a, b) => pos[a.name].y - pos[b.name].y), wins = [], things = [];
    for (const s of st.structures) if (vis(s.x * T, s.y * T, 130, 60, 160)) things.push([s.y, () => drawStruct(s, t, wins)]);   // off-screen things are skipped
    { const stock = { wood: 0, stone: 0 }; for (const q of st.agents) { stock.wood += q.inv.wood; stock.stone += q.inv.stone; }
      const wk = st.places.Workshop, qu = st.places.Quarry;
      if (wk && stock.wood > 0 && vis(wk[0] * T, wk[1] * T, 120, 60, 80)) things.push([wk[1] + .6, () => drawLogs(wk[0] + 3.6, wk[1] + .6, Math.min(10, Math.ceil(stock.wood / 3)))]);
      if (qu && stock.stone > 0 && vis(qu[0] * T, qu[1] * T, 120, 60, 80)) things.push([qu[1] + .6, () => drawStones(qu[0] + 3, qu[1] + .6, Math.min(12, Math.ceil(stock.stone / 25)))]); }   // the village's wood and stone, piled where they are worked
    if (!asleep) for (const a of order) if (vis(pos[a.name].x * T, pos[a.name].y * T, 70, 40, 100)) things.push([pos[a.name].y, () => { person(a, pos[a.name], t); const p = pos[a.name]; if (lamp > .3 && !INDOOR.has(a.place)) wins.push(p.lampAt ? [p.lampAt[0], p.lampAt[1], .45, '255,190,110'] : [p.x * T + (p.face || 1) * 9 * FIG / 1.35, p.y * T - 22 * FIG / 1.35, .45, '255,190,110']); }]);   // a villager out after dusk carries a small lantern glow
    const sg = st.goals && st.goals.stranger;
    if (!asleep && sg) { const sp = { x: st.places.Square[0] - 3.2, y: st.places.Square[1] + 2.6, walking: false, route: [], face: 1 };   // the stranger, waiting with a bundle
      things.push([sp.y, () => { person({ name: sg.name, age: sg.age, sex: sg.sex, hair: sg.hair, color: sg.color, place: 'Square', say_to: '', say_at: 0 }, sp, t);
        const g = ctx; g.fillStyle = '#8a6a44'; g.beginPath(); g.ellipse(sp.x * T + 12, sp.y * T - 4, 6, 5, 0, 0, 7); g.fill(); }]); }
    drawFx(t, wind, true); smokes.length = 0; things.sort((a, b) => a[0] - b[0]).forEach(d => d[1]());
    drawFx(t, wind, false); drawSpeaking(t);
    const hr0 = st.minute / 60, hearth = hr0 >= 5 && hr0 < 9.5 || hr0 >= 17 && hr0 < 22.5, calm = !/storm|steady/.test(w);   // chimneys: bakery and tavern always, houses at breakfast and supper
    chimneys.forEach(([x, y], i) => { if (vis(x, y, 70, 90, 30)) smoke(x, y, t, i, wind); }); if (hearth && calm) smokes.forEach(([x, y], i) => { if (vis(x, y, 70, 90, 30)) smoke(x, y, t, i + 3, wind, .8); });
    if (S.light < .3 && !rain && hr0 >= 7 && hr0 < 19) {                                               // butterflies over the Garden and Meadow, birds crossing at midday
      const cols = ['#f2c14e', '#e98bb0', '#8fb8f0', '#f6f2ea', '#c58cf0'];
      for (let i = 0; i < 6; i++) { const [px, py] = i < 3 ? st.places.Garden : st.places.Meadow, ft = REDUCE ? 4000 : t, x = px * T + Math.sin(ft / 1900 + i * 2.1) * 2.6 * T + Math.sin(ft / 650 + i) * 9, y = (py + (i < 3 ? 0.4 : -0.5)) * T + Math.cos(ft / 1500 + i * 1.7) * 1.3 * T - 24 + Math.sin(ft / 330 + i) * 4, fl = REDUCE ? 1 : Math.abs(Math.sin(t / 85 + i * 1.3)) * 4.2 + .8;
        if (!vis(x, y, 20, 40, 60)) continue; shadow(ctx, x, y + 30, 4, 1.5, .12); ctx.fillStyle = cols[(i * 2) % 5]; ctx.strokeStyle = 'rgba(40,30,20,.5)'; ctx.lineWidth = .7;
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + d * fl * .6, y - 1, fl, 3, d * .4, 0, 7); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#2a2018'; ctx.fillRect(x - .6, y - 3, 1.2, 6); }
      const ph = ((t + 6000) % 40000) / 40000 / .38;
      if (!REDUCE && ph < 1) { const kf = Math.floor((t + 6000) / 40000), fy = (3 + (kf % 3) * 4.5) * T, fx = -160 + ph * (WW + 320);
        [[0, 0], [-17, -9], [-17, 9], [-34, -18], [-34, 18]].forEach(([dx, dy], j) => { const bx = fx + dx, by = fy + dy + Math.sin(t / 900 + j) * 3, wv = Math.sin(t / 150 + j * .9) * 4.5; if (!vis(bx, by, 30, 30, 90)) return;
          ctx.fillStyle = 'rgba(10,20,8,.13)'; ctx.beginPath(); ctx.ellipse(bx + 20, by + 70, 7, 2.4, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(32,30,34,.9)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(bx - 8, by - wv); ctx.quadraticCurveTo(bx - 3, by - 2 - wv * .3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 2 - wv * .3, bx + 8, by - wv); ctx.stroke(); });
      }
    }

    if (st.fair && st.fair.today && st.places.Square && !asleep) {                                     // fair day: bunting and lanterns over the Square
      const [qx, qy] = st.places.Square, cols = ['#d9534a', '#e8bd5f', '#4f9fd8', '#7bc46a', '#c77ad8', '#f2f0e6'];
      for (let k = 0; k < 6; k++) {
        const a0 = k / 6 * Math.PI * 2, a1 = (k + 1) / 6 * Math.PI * 2, R = 3.1;
        const x0 = (qx + Math.cos(a0) * R) * T, y0 = (qy + 0.9 + Math.sin(a0) * R * 0.62) * T - 34, x1 = (qx + Math.cos(a1) * R) * T, y1 = (qy + 0.9 + Math.sin(a1) * R * 0.62) * T - 34;
        ctx.fillStyle = '#5a4030'; ctx.fillRect(x0 - 1.5, y0, 3, 34);
        const sag = 12, sway = REDUCE ? 0 : Math.sin(t / 700 + k) * 1.5;
        ctx.strokeStyle = 'rgba(60,45,30,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); ctx.stroke();
        for (let i = 1; i < 8; i++) {
          const u = i / 8, x = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * (x0 + x1) / 2 + u * u * x1, y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * ((y0 + y1) / 2 + sag) + u * u * y1;
          ctx.fillStyle = cols[(i + k) % cols.length]; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x + sway, y + 9); ctx.closePath(); ctx.fill();
        }
        wins.push([x0, y0 - 3, .5, '255,190,110']);                                            // lanterns glow at dusk
        ctx.fillStyle = '#f3b65a'; ctx.beginPath(); ctx.arc(x0, y0 - 3, 3.2, 0, 7); ctx.fill();
      }
    }
    if (st.places.Cemetery) {                                                                          // a headstone per grave
      const [cx, cy] = st.places.Cemetery;
      (st.dead || []).slice(0, 24).forEach((d, i) => {
        const X = (cx - 2.5 + (i % 8) * 0.7) * T, Y = (cy - 0.85 + Math.floor(i / 8) * 0.75) * T;
        shadow(ctx, X, Y + 1, 6, 2, .3); ctx.fillStyle = '#a4a39d'; ctx.beginPath(); ctx.roundRect(X - 5, Y - 12, 10, 13, [5, 5, 1, 1]); ctx.fill();
        ctx.fillStyle = '#7f7e78'; ctx.fillRect(X - 0.8, Y - 9.5, 1.6, 6); ctx.fillRect(X - 3, Y - 7.8, 6, 1.6);
        ctx.fillStyle = ['#f4e36b', '#e98bb0', '#f6f2ea'][i % 3]; ctx.beginPath(); ctx.arc(X + 4, Y + 1, 1.7, 0, 7); ctx.fill();
      });
    }
    const [shx, shy] = st.places.Shrine, candles = [];                                                 // a candle per prayer today
    (st.prayers || []).slice(0, 8).forEach((p, i) => {
      const X = (shx - 2.25 + (i % 4) * 0.3) * T, Y = (shy + 0.75 + Math.floor(i / 4) * 0.28) * T, fl = REDUCE ? 0 : Math.sin(t / 140 + i * 2) * 0.8;
      ctx.fillStyle = '#efe6cf'; ctx.fillRect(X - 2, Y - 8, 4, 8); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.ellipse(X + fl * 0.3, Y - 10.5, 1.8, 3 + fl * 0.4, 0, 0, 7); ctx.fill();
      candles.push([X, Y - 10, .55, '255,200,110']);
    });
    if (st.places.Cemetery) {                                                                          // a candle on each fresh grave until the morning after the death
      const [cx, cy] = st.places.Cemetery, now = st.day * 1440 + st.minute;
      for (const e of st.events || []) if (e.kind === 'death') { const ab = e.day * 1440 + e.minute, until = (Math.floor((ab - 360) / 1440) + 1) * 1440 + 360, i = (st.dead || []).slice(0, 24).findIndex(d => d.name === e.who);
        if (i < 0 || now < ab - 5 || now >= until) continue; const X = (cx - 2.5 + (i % 8) * 0.7) * T - 7, Y = (cy - 0.85 + Math.floor(i / 8) * 0.75) * T + 2, fl = REDUCE ? 0 : Math.sin(t / 140 + i * 2) * 0.8;
        ctx.fillStyle = '#efe6cf'; ctx.fillRect(X - 1.5, Y - 6, 3, 6); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.ellipse(X + fl * .3, Y - 8.5, 1.6, 2.8 + fl * .4, 0, 0, 7); ctx.fill(); candles.push([X, Y - 8, .6, '255,200,110']); }
    }
    const O = st.oracle, [ox, oy] = st.places.Oracle, fx = ox * T, fy = (oy + 0.2) * T;               // the Oracle's flame
    if (O.state !== 'asleep') {
      const kk = O.state === 'ready' ? 1 : 0.35, r = (16 + Math.sin(t / 350) * 4) * kk + 6;
      glow(fx, fy - 10, r * 2.6, 0.85 * kk + 0.1, '190,160,255');
      ctx.fillStyle = `rgba(240,225,255,${0.5 + 0.5 * kk})`; ctx.beginPath(); ctx.ellipse(fx, fy - 10 - Math.sin(t / 500) * 2, 4 * kk + 2, 7 * kk + 3, 0, 0, 7); ctx.fill();
    }

    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);                                                   // time of day and weather grade
    if (S.c.some(v => v < 254)) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${S.c})`; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.globalCompositeOperation = 'source-over';
    if (/mist/.test(w)) {                                                                              // mist: a thin veil plus slow drifting bands, thickest over the lake
      ctx.fillStyle = 'rgba(226,232,238,.06)'; ctx.fillRect(0, 0, cv.width, cv.height); const spr = mistSprite();
      for (let i = 0; i < 4; i++) {
        const bw = (1500 + i * 260) * z, bh = (320 + (i % 2) * 130) * z, wx = ((REDUCE ? i * 650 : t / (110 + i * 35) + i * 830) % (WW + 2 * M + 1600)) - M - 800, wy = [5, 11.5, 20.5, 23][i] * T;
        ctx.globalAlpha = i > 1 ? .36 : .28; ctx.drawImage(spr, ((wx - cam.x) * z + vw / 2 - bw / 2) * dpr, ((wy - cam.y) * z + vh / 2 - bh / 2) * dpr, bw * dpr, bh * dpr);
      }
      ctx.globalAlpha = 1;
    }
    const hr = st.minute / 60, gk = hr >= 5.5 && hr <= 8 ? Math.sin((hr - 5.5) / 2.5 * Math.PI) : hr >= 17.5 && hr <= 20.5 ? Math.sin((hr - 17.5) / 3 * Math.PI) : 0;
    if (gk > 0.02 && !/storm|rain|steady|overcast/.test(w)) {                                               // sunrise from the east edge, sunset from the west
      const east = hr < 12, cx = east ? cv.width : 0, cy = cv.height * .38, R = Math.max(cv.width, cv.height) * .95, gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(255,${east ? 196 : 130},${east ? 120 : 70},${.9 * gk})`); gr.addColorStop(.5, `rgba(255,${east ? 170 : 110},${east ? 100 : 80},${.4 * gk})`); gr.addColorStop(1, 'rgba(255,150,90,0)');
      ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height);   // once: twice turned everyone orange-red
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .1; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (/haze/.test(w)) { ctx.fillStyle = 'rgba(255,200,120,.1)'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.restore();

    if (lamp > 0.05) {                                                                                 // warm lights come on
      const allWin = windows.concat(wins);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fk = i => REDUCE ? 1 : .92 + .08 * Math.sin(t / 170 + i * 1.7);                                // lamps and windows flicker a little
      allWin.forEach(([x, y, s = 1, col], i) => { if (vis(x, y, 60, 60, 60)) glow(x, y, 46 * s + 8, lamp * 0.55 * s * fk(i) * lampMist, col); });
      for (const [x, y, s, col] of candles) if (vis(x, y, 40, 40, 40)) glow(x, y, 26, Math.max(.15, lamp) * s * lampMist, col);
      if (O.state === 'ready') glow(fx, fy - 10, 70, lamp * 0.5 * lampMist, '190,160,255');
      if (S.light > 0.55 && !rain) {                                                                   // fireflies
        const fl = S.light - 0.55;
        for (let i = 0; i < 22; i++) { const base = [st.places.Garden, st.places.Woods, st.places.Shrine][i % 3], x = (base[0] + Math.sin(t / 2100 + i * 1.7) * 2.6) * T, y = (base[1] + 0.6 + Math.cos(t / 1700 + i * 2.3) * 1.3) * T, a = fl * (0.6 + 0.4 * Math.sin(t / 260 + i * 5)); if (vis(x, y, 20, 20, 20)) glow(x, y, 9, a * 1.6, '220,255,140'); }
      }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = Math.min(1, lamp * 1.3);
      allWin.forEach(([x, y, s = 1, col], i) => { if (s >= 1 && vis(x, y, 20, 20, 20)) { ctx.globalAlpha = Math.min(1, lamp * 1.3) * fk(i); ctx.fillStyle = 'rgb(255,222,150)'; ctx.fillRect(x - 7, y - 6.5, 14, 13); } });
      ctx.restore();
      if (S.light > 0.6 && lakeVis) {                                                                             // the lake is the night sky: a moon streak and a few stars
        const m = clamp((S.light - 0.6) / 0.3, 0, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) { const yy = (20.35 + i * 0.46) * T, ww = (22 - i * 2) * (0.75 + 0.25 * (REDUCE ? 1 : Math.sin(t / 700 + i * 2.1))), xx = 27.5 * T + (REDUCE ? 0 : Math.sin(t / 1300 + i * 1.3) * 5); ctx.strokeStyle = `rgba(200,220,255,${.5 * m * (1 - i * .07)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xx - ww, yy); ctx.lineTo(xx + ww, yy); ctx.stroke(); }
        const r2 = rng(1234); for (let i = 0; i < 16; i++) { const x = (6 + r2() * 28) * T, y = (19.8 + r2() * 4.6) * T, a = (REDUCE ? .6 : .5 + .5 * Math.sin(t / 420 + i * 2.7)) * m * .8; if (inLake(x / T, y / T) && inLake(x / T, y / T - .6)) { glow(x, y, 7, a, '200,220,255'); ctx.fillStyle = `rgba(235,245,255,${a})`; ctx.fillRect(x - 1, y - 1, 2, 2); } }
        ctx.restore();
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    { const key = vw + 'x' + vh; if (key !== vigKey) { vigKey = key; const R = Math.hypot(vw, vh) / 2; vigGr = ctx.createRadialGradient(vw / 2, vh / 2, R * .55, vw / 2, vh / 2, R); vigGr.addColorStop(0, 'rgba(6,10,8,0)'); vigGr.addColorStop(1, 'rgba(6,10,8,1)'); }
      ctx.globalAlpha = .13 + .14 * S.light; ctx.fillStyle = vigGr; ctx.fillRect(0, 0, vw, vh); ctx.globalAlpha = 1; }   // soft vignette, stronger at night
    if (rain) {                                                                                        // rain streaks
      const n = Math.min(320, Math.round(vw * vh / (/steady|storm/.test(w) ? 5200 : 11000))) * (REDUCE ? .4 : 1), slant = wind ? 9 : 4;
      ctx.strokeStyle = 'rgba(205,222,255,.42)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = (i * 97.3 + (REDUCE ? 0 : t * 0.25)) % (vw + 40) - 20, y = (i * 53.7 + (REDUCE ? 0 : t * 0.95)) % (vh + 30) - 15; ctx.moveTo(x, y); ctx.lineTo(x - slant, y + 15); }
      ctx.stroke();
    }
    if (/windy/.test(w) && !REDUCE) for (let i = 0; i < 18; i++) {                                     // blown leaves
      const x = (i * 211 + t * (0.12 + (i % 4) * 0.03)) % (vw + 60) - 30, y = (i * 137 + Math.sin(t / 600 + i) * 30 + t * 0.02) % vh;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t / 300 + i); ctx.fillStyle = ['#c9963a', '#9cb24a', '#b5643a'][i % 3]; ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    if (/storm/.test(w) && !REDUCE && (t % 9000) < 150) {                                                // lightning: a jagged bolt for ~150 ms, a flash, and a bright rim on the nearest building
      const ph = (t % 9000) / 150, r3 = rng(Math.floor(t / 9000) * 7 + 3), tx = (8 + r3() * 24) * T, ty = (20.4 + r3() * 2.4) * T, [ex, ey] = toScreen(tx, ty), sx0 = ex + (r3() - .5) * 300;
      if (ph < .75) { ctx.fillStyle = `rgba(235,240,255,${.32 * (1 - ph)})`; ctx.fillRect(0, 0, vw, vh); }
      const pts = [[sx0, -10]]; for (let i = 1; i < 7; i++) pts.push([lerp(sx0, ex, i / 7) + (r3() - .5) * 90 * (1 - i / 8), lerp(-10, ey, i / 7) + (r3() - .5) * 22]); pts.push([ex, ey]);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = `rgba(170,190,255,${.35 * (1 - ph)})`; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = `rgba(250,252,255,${1 - ph * .7})`; ctx.lineWidth = 2.6; ctx.stroke();
      let best = null, bd = 1e9; for (const s of st.structures) { const d = Math.hypot(s.x * T - tx, s.y * T - ty); if (s.done && d < bd) { bd = d; best = s; } }
      if (best) { const [bx2, by2] = toScreen(best.x * T, best.y * T - 22); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(bx2, by2, 70 * z + 20, .7 * (1 - ph), '200,215,255'); ctx.restore(); }
    }
    drawOverlay(t, asleep, order); drewFrame = vw > 1 && vh > 1;          // a frame drawn before the canvas had its size does not count
    moving = !!selected || hover != null || fx.length > 0 || !!hear.now || cam.follow || drag != null || ptrs.size > 0 || st.agents.some(a => pos[a.name].walking) || Math.abs(cam.x - cam.tx) > .3 || Math.abs(cam.y - cam.ty) > .3 || Math.abs(cam.z - cam.tz) > .002;
    busy = !REDUCE || moving;
    if (DEBUG.fps) {   // ?fps=1: average JS time per frame over the last 60 frames, top right
      frameMs.push(performance.now() - t0); if (frameMs.length > 60) frameMs.shift(); const avg = frameMs.reduce((a, b) => a + b, 0) / frameMs.length;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(vw - 148, 8, 140, 22); ctx.fillStyle = '#9f9'; ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.fillText(avg.toFixed(2) + ' ms / frame', vw - 140, 23);
    }
  }
  if (drewFrame) markReady();
  if (FROZEN != null && drewFrame && ++frozenFrames >= 6) { halted = true; return; }   // a frozen frame is final: a few identical frames so it is on screen when a headless shot is taken, then stop
  requestAnimationFrame(frame);
}
let drewFrame = false, readyMarked = false, halted = false, frozenFrames = 0;
function redrawFrozen() { if (halted) { halted = false; drewFrame = false; frozenFrames = 0; frame(lastDraw); } }   // resizing clears the canvas, so a halted frozen frame is drawn again at once (not on the next frame, which a shot may miss)
function markReady() {      // the first real frame is on screen: scripts and headless shots can wait for this (never the loading screen)
  if (readyMarked) return; readyMarked = true;
  document.documentElement.dataset.ready = '1';
  if (FROZEN != null || DEBUG.ready != null) document.title = 'ready';          // only for debugging: do not rename the tab for viewers
}
requestAnimationFrame(frame);
