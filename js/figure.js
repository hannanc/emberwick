// ================================================================ the villager figure
// person() draws one villager onto any 2d context (the map by default, a scene card's interior strip otherwise).
// Everything is laid out in figure units: 1 unit = S px, S = FIG x life stage x this person's height; y runs up from the soles (see BODY in pure.js).
const PROPS = { Woods: 'axe', Dock: 'rod', Garden: 'basket', Bakery: 'loaf', Library: 'book', Quarry: 'pick', Cemetery: 'flowers' };
const TROUSERS = ['#5b4a3a', '#4a5058', '#6a5a46', '#3f4a5a'], BOOT = '#2b211a';

function drawFace(g, o) {   // small dark eyes with a highlight (whites only for babies and for fright), mood brows, a nose, a mouth that follows the mood and moves when speaking
  const { a, hx, hy, f, t, talking, hurt, baby, beard, h, z } = o, S = o.u, k = moodKind(a.mood), af = Math.abs(f), wide = baby || k.wide;
  const ex = hx + f * 2.6 * S, es = 2.1 * S * (1 - .3 * af), ey = hy + .6 * S, blink = !REDUCE && ((t / 1000 + h % 5) % 4.3) < .13;
  const lid = hurt ? .55 : 1;   // a sick person's eyelids droop
  for (const d of [-1, 1]) {
    const cx = ex + d * es;
    if (z < 1.5) { g.fillStyle = '#2a1f19'; g.beginPath(); g.arc(cx, ey, .95 * S, 0, 7); g.fill(); }   // zoomed out: two dots
    else if (wide) {
      const ew = (baby ? 1.7 : 1.5) * S, eh = (blink ? .25 : baby ? 1.7 : 1.6) * S;
      g.fillStyle = '#f7f2e8'; g.beginPath(); g.ellipse(cx, ey, ew, eh, 0, 0, 7); g.fill();
      if (!blink) { g.fillStyle = '#1f1812'; g.beginPath(); g.arc(cx + f * .5 * S, ey + .1 * S, .8 * S, 0, 7); g.fill(); }
    } else {
      const eh = blink ? .2 * S : 1.25 * S * lid; g.fillStyle = '#2a1f19'; g.beginPath(); g.ellipse(cx + f * .35 * S, ey + (1.25 * S - eh) * .5, .95 * S, eh, 0, 0, 7); g.fill();
      if (!blink && !hurt) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(cx + f * .35 * S + .35 * S, ey - .45 * S, .32 * S, 0, 7); g.fill(); }
    }
    if (hurt && z >= 1.5 && !blink) { g.strokeStyle = shade(o.skin, .7); g.lineWidth = .8 * S + .1; g.beginPath(); g.moveTo(cx - 1.2 * S, ey - .55 * S); g.lineTo(cx + 1.2 * S, ey - .55 * S); g.stroke(); }   // the drooped lid
    if (!baby && z >= 1) {   // brows, mirrored: inner ends (towards the nose) drop when stern, rise when worried; drawn in a darker shade of the hair
      const { outer, inner } = browPoints(k.brow, d, cx, ey - .3 * S, S);
      g.strokeStyle = shade(hairColor(a) || '#3a2a1c', a.age >= 60 ? .8 : .55); g.lineWidth = .95 * S + .15; g.beginPath(); g.moveTo(outer[0], outer[1]); g.lineTo(inner[0], inner[1]); g.stroke();
    }
  }
  if (z < 1) return;
  if (o.glasses) { g.strokeStyle = '#3a2e28'; g.lineWidth = .75 * S + .1; g.beginPath(); for (const d of [-1, 1]) { const cx = ex + d * es; g.moveTo(cx + 1.9 * S, ey); g.arc(cx, ey, 1.9 * S, 0, 7); } g.moveTo(ex - es + 1.9 * S, ey); g.lineTo(ex + es - 1.9 * S, ey); g.stroke(); }   // small round glasses
  if (o.flour && z >= 1.5) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(hx + (f || -1) * 3.6 * S, hy + 2.6 * S, 1 * S, .7 * S, .4, 0, 7); g.fill(); }   // a smudge of flour on the cheek
  if (z >= 1.5) { const nx = hx + f * 3.4 * S, ny = hy + 2.4 * S; g.strokeStyle = 'rgba(120,70,50,.45)'; g.lineWidth = .9; g.beginPath(); g.moveTo(nx - f * .2 * S, ny - .8 * S); g.lineTo(nx + (f || .4) * .8 * S, ny + .6 * S); g.stroke(); }   // a nose, turned the way they face
  const mx = hx + f * 2.2 * S, my = hy + 4 * S;
  if (talking) { const open = .5 + .5 * Math.sin(t / 85 + h); g.fillStyle = '#5a2a22'; g.beginPath(); g.ellipse(mx, my + .2 * S, (1.5 - .3 * af) * S, (.5 + open * 1.5) * S, 0, 0, 7); g.fill(); }
  else if (!beard) {
    g.strokeStyle = 'rgba(130,55,45,.8)'; g.lineWidth = 1; g.beginPath();
    if (k.mouth === 'smile') g.arc(mx, my - 1.3 * S, 2.2 * S, .18 * Math.PI, .82 * Math.PI);
    else if (k.mouth === 'frown') g.arc(mx, my + 2.6 * S, 2 * S, 1.2 * Math.PI, 1.8 * Math.PI);
    else if (k.mouth === 'soft') g.arc(mx, my - .5 * S, 1.8 * S, .2 * Math.PI, .8 * Math.PI);
    else { g.moveTo(mx - 1.7 * S, my + .5 * S); g.lineTo(mx + 1.7 * S, my + .5 * S); }
    g.stroke();
  }
}

function hairCap(c, hx, hy, r, u) {   // the hair in front: a cap on the top of the head with a hairline that leaves the forehead bare, shaped per style
  const { g, L, a, h, f, line } = c, ps = L.hair === 'neat' ? 1 : h & 1 ? 1 : -1, R = r + .4 * u, long = L.hair === 'long' || L.hair === 'braid', bun = L.hair === 'bun';
  const tl = long ? .1 : -.12, tx = long ? .96 : .93;   // long hair comes lower at the temples, over the ears
  if (L.kerchief) { const kd = -(f || c.dir); g.fillStyle = L.kerchief; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy - .1 * u, r + .8 * u, Math.PI * .96, Math.PI * 2.04); g.quadraticCurveTo(hx + .7 * r, hy - .62 * r, hx, hy - .66 * r); g.quadraticCurveTo(hx - .7 * r, hy - .62 * r, hx - r - .8 * u, hy - .1 * u); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(hx + kd * (r + .4 * u), hy - .5 * u); g.lineTo(hx + kd * (r + 4.2 * u), hy - 2 * u); g.lineTo(hx + kd * (r + 3.4 * u), hy + 1.6 * u); g.closePath(); g.fill(); g.stroke(); return; }   // a kerchief tied at the back, hiding the hair
  g.fillStyle = c.hairC; g.strokeStyle = line; g.lineWidth = 1;
  g.beginPath(); g.moveTo(hx - tx * r, hy + tl * r); g.arc(hx, hy - .15 * u, R, Math.PI * (1 + .06), Math.PI * (2 - .06)); g.lineTo(hx + tx * r, hy + tl * r);
  if (bun) { g.quadraticCurveTo(hx + .8 * r, hy - .55 * r, hx, hy - .6 * r); g.quadraticCurveTo(hx - .8 * r, hy - .55 * r, hx - tx * r, hy + tl * r); }   // pulled back from the forehead
  else if (long) { g.quadraticCurveTo(hx + .8 * r, hy - .4 * r, hx + ps * .1 * r, hy - .62 * r); g.quadraticCurveTo(hx - .7 * r, hy - .35 * r, hx - tx * r, hy + tl * r); }   // a parted fringe falling to each side
  else { g.quadraticCurveTo(hx + .88 * r, hy - .5 * r, hx + ps * .3 * r, hy - .58 * r); g.quadraticCurveTo(hx - .6 * r, hy - .52 * r, hx - tx * r, hy + tl * r); }   // short: a side-swept fringe
  g.closePath(); g.fill(); g.globalAlpha = .55; g.stroke(); g.globalAlpha = 1;
  if (bun) { g.fillStyle = c.hairC; g.strokeStyle = line; g.lineWidth = 1.1; g.beginPath(); g.arc(hx, hy - r - 1.3 * u, 3.4 * u, 0, 7); g.fill(); g.stroke(); }
}

// One arm, shoulder to wrist and a hand. `hand` is where the hand goes, [dx, dy] in units from the shoulder (y down). Returns the hand's centre in px.
function drawArm(c, d, hand) {
  const { g, S, x, sleeve, skin, line, B } = c, sx = x + d * (B.shW + 1) * S, sy = c.Y(B.sh - 1.8);
  const ex = sx + hand[0] * S, ey = sy + hand[1] * S;
  g.lineCap = 'round';
  g.strokeStyle = line; g.lineWidth = 3.6 * S + 1.3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = sleeve; g.lineWidth = 3.6 * S; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
  if (c.L.sleeves) { g.strokeStyle = skin; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(sx + (ex - sx) * .45, sy + (ey - sy) * .45); g.lineTo(ex, ey); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(sx + (ex - sx) * .42 - 1.5 * S, sy + (ey - sy) * .45); g.lineTo(sx + (ex - sx) * .42 + 1.5 * S, sy + (ey - sy) * .45); g.stroke(); }
  g.fillStyle = skin; g.beginPath(); g.arc(ex, ey + .6 * S, 1.9 * S, 0, 7); g.fill(); return [ex, ey + .6 * S];
}

function drawLegs(c) {   // trousers to the knee, socks, boots; a skirt hides the thighs. Walking swings them with the distance travelled.
  const { g, S, x, B, p, f, line } = c, gy = c.gy;
  const G = v => gy - v * S, dir = f || p.face || 1;
  for (const d of [-1, 1]) {
    let hipX, hipV, kneeX, kneeV, ankX, ankV;
    if (c.sit) {   // front view of someone seated: thighs forward (foreshortened), shins straight down
      hipX = d * 2.4; hipV = B.hem - c.drop + .8; kneeX = d * 3.4; kneeV = hipV - 1.8; ankX = d * 3.9; ankV = 2.4;
    } else {
      const ph = c.step * d, lift = c.walking ? Math.max(0, Math.cos(c.cyc * 6.2832) * d) * 1.5 : 0;
      hipX = d * 2.3; hipV = B.hem + 1; ankX = d * 2.3 + ph * 2.8; ankV = 2.4 + lift; kneeX = (hipX + ankX) / 2 + dir * .5; kneeV = lerp(hipV, ankV, .55);
    }
    for (const [fill, w, x1, v1, x2, v2] of [[c.trouser, 3.6, hipX, hipV, kneeX, kneeV], [c.sock, 3, kneeX, kneeV, ankX, ankV]]) {
            g.strokeStyle = line; g.lineWidth = w * S + 1.3; g.beginPath(); g.moveTo(x + x1 * S, G(v1)); g.lineTo(x + x2 * S, G(v2)); g.stroke();
      g.strokeStyle = fill; g.lineWidth = w * S; g.beginPath(); g.moveTo(x + x1 * S, G(v1)); g.lineTo(x + x2 * S, G(v2)); g.stroke();
    }
    g.fillStyle = c.L.boot || BOOT; g.beginPath(); g.ellipse(x + (ankX + dir * .9) * S, G(ankV - 1.1), 2.6 * S, 1.6 * S, 0, 0, 7); g.fill();
  }
}

function drawCloakBack(c) {   // a travel cloak hanging behind the shoulders, wider than the body
  const { g, S, x, B, L, line } = c, Y = c.Y, hw = B.hemW + 3.4;
  g.fillStyle = L.cloak; g.strokeStyle = line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - (B.shW + 1.6) * S, Y(B.sh - .4)); g.lineTo(x + (B.shW + 1.6) * S, Y(B.sh - .4));
  g.lineTo(x + hw * S, Y(B.hem - 3.5)); g.quadraticCurveTo(x, Y(B.hem - 5), x - hw * S, Y(B.hem - 3.5)); g.closePath(); g.fill(); g.stroke();
}
function drawGear(c) {   // what hangs on the body, drawn over the torso and under the arms; small things only when zoomed in
  const { g, S, x, B, L, line, z } = c, Y = c.Y, hip = B.hem + 2.4;
  if (L.cloak) { g.fillStyle = shade(L.cloak, 1.15); g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(x - (B.shW + .6) * S, Y(B.sh + 1.2), 2 * (B.shW + .6) * S, 3.6 * S, 1.6 * S); g.fill(); g.stroke(); g.fillStyle = '#e8bd5f'; g.beginPath(); g.arc(x, Y(B.sh - .6), .9 * S, 0, 7); g.fill(); }   // the cloak's collar and clasp
  if (z <= 1) return;
  if (L.towel) { g.fillStyle = '#efe9da'; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.moveTo(x - (B.shW + .2) * S, Y(B.sh + .4)); g.lineTo(x - (B.shW - 3.4) * S, Y(B.sh + .4)); g.lineTo(x - (B.shW - 3.2) * S, Y(B.sh - 7.4)); g.lineTo(x - (B.shW + .2) * S, Y(B.sh - 7.8)); g.closePath(); g.fill(); g.stroke(); }   // a cloth over the shoulder
  if (L.satchel) {
    g.strokeStyle = shade(L.satchel, .75); g.lineWidth = 1.5 * S; g.beginPath(); g.moveTo(x + B.shW * .7 * S, Y(B.sh)); g.lineTo(x - B.hemW * .9 * S, Y(hip + .8)); g.stroke();
    g.fillStyle = L.satchel; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(x - (B.hemW + 2.4) * S, Y(hip + 1), 5 * S, 4.6 * S, 1 * S); g.fill(); g.stroke(); g.fillStyle = shade(L.satchel, .8); g.fillRect(x - (B.hemW + 2.2) * S, Y(hip + 1), 4.6 * S, 1.5 * S);
  }
  if (L.tool) {   // a mallet or hatchet hanging from the belt
    const bx = x + (B.hemW + .4) * S; g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, Y(hip + 1)); g.lineTo(bx + .6 * S, Y(hip - 5)); g.stroke();
    g.fillStyle = '#9aa0a6'; g.strokeStyle = line; g.lineWidth = .9; g.beginPath(); if (L.tool === 'axe') { g.moveTo(bx + .6 * S, Y(hip - 3.4)); g.lineTo(bx + 3.4 * S, Y(hip - 2.4)); g.lineTo(bx + 3.4 * S, Y(hip - 5.6)); g.lineTo(bx + .6 * S, Y(hip - 4.8)); g.closePath(); } else g.roundRect(bx - 1.8 * S, Y(hip - 4.8), 4.8 * S, 2.6 * S, .6 * S); g.fill(); g.stroke();
  }
  if (L.net) {   // a coil of net at the hip
    const nx = x - (B.hemW + 1.6) * S, ny = Y(hip - 1.4); g.fillStyle = '#b8a47a'; g.strokeStyle = 'rgba(70,52,30,.7)'; g.lineWidth = .8; g.beginPath(); g.ellipse(nx, ny, 3.2 * S, 2.8 * S, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(nx - 2.4 * S, ny - .8 * S); g.lineTo(nx + 2.4 * S, ny + .8 * S); g.moveTo(nx - 2.4 * S, ny + .8 * S); g.lineTo(nx + 2.4 * S, ny - .8 * S); g.moveTo(nx, ny - 2.6 * S); g.lineTo(nx, ny + 2.6 * S); g.stroke();
  }
}
function drawBlanket(c) {   // someone ill is wrapped in a striped blanket over the shoulders
  const { g, S, x, B, line } = c, Y = c.Y, col = '#c9a86a'; g.fillStyle = col; g.strokeStyle = line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - (B.shW + 2.4) * S, Y(B.sh - .8)); g.quadraticCurveTo(x - 6 * S, Y(B.sh + 1.4), x, Y(B.sh + 1.2)); g.quadraticCurveTo(x + 6 * S, Y(B.sh + 1.4), x + (B.shW + 2.4) * S, Y(B.sh - .8));
  g.lineTo(x + (B.shW + 1.6) * S, Y(B.sh - 8)); g.quadraticCurveTo(x, Y(B.sh - 9.6), x - (B.shW + 1.6) * S, Y(B.sh - 8)); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#a0603a'; g.lineWidth = 1.1; for (const v of [-3.4, -5.6]) { g.beginPath(); g.moveTo(x - (B.shW + 1.9) * S, Y(B.sh + v + .2)); g.quadraticCurveTo(x, Y(B.sh + v - 1.1), x + (B.shW + 1.9) * S, Y(B.sh + v + .2)); g.stroke(); }
}
function drawBook(c) {   // a ledger or a book tucked under the left arm
  const { g, S, x, B, L, line } = c, col = L.ledger || L.book; if (!col || c.z <= 1 || c.prop === 'book') return;
  g.save(); g.translate(x - (B.shW + .4) * S, c.Y(B.sh - 8.2)); g.rotate(-.12); g.fillStyle = col; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(-1.9 * S, -3 * S, 3.8 * S, 6 * S, .6 * S); g.fill(); g.stroke();
  g.fillStyle = '#f2ead6'; g.fillRect(1.1 * S, -2.6 * S, .8 * S, 5.2 * S); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-1.2 * S, -2 * S, .8 * S, 4 * S); g.restore();
}

function drawTorso(c) {   // the tunic or dress as a path (reused for the clip and the outline)
  const { g, S, x, B } = c, Y = c.Y, sh = B.sh, hem = c.dress ? B.hem - 3.8 : B.hem, wv = B.hem + (sh - B.hem) * .4, ww = B.shW * (c.dress ? .78 : .9), hw = B.hemW + (c.dress ? 1.8 : 0);
  g.beginPath(); g.moveTo(x - B.shW * S, Y(sh)); g.lineTo(x + B.shW * S, Y(sh)); g.quadraticCurveTo(x + (B.shW + 1.9) * S, Y(sh - .1), x + (B.shW + 1.5) * S, Y(sh - 2.6));
  g.lineTo(x + ww * S, Y(wv)); if (c.dress) g.quadraticCurveTo(x + (ww + .6) * S, Y(wv - 2), x + hw * S, Y(hem)); else g.lineTo(x + hw * S, Y(hem));
  g.lineTo(x - hw * S, Y(hem)); if (c.dress) g.quadraticCurveTo(x - (ww + .6) * S, Y(wv - 2), x - ww * S, Y(wv)); else g.lineTo(x - ww * S, Y(wv));
  g.lineTo(x - (B.shW + 1.5) * S, Y(sh - 2.6)); g.quadraticCurveTo(x - (B.shW + 1.9) * S, Y(sh - .1), x - B.shW * S, Y(sh)); g.closePath();
}

function person(a, p, t, g = ctx) {
  const m = figMetrics(a, FIG), S = m.S, B = m.B, h = hash(a.name), L = look(a), x = p.x * T, base = p.y * T;
  const standing = !p.walking && !p.route.length, pose = standing ? poseOf(a) : 'walk', sit = pose === 'sit', walking = !standing;
  const cyc = p.phase || 0, step = walking ? Math.sin(cyc * 6.2832) : 0, drop = sit ? 2.4 * B.size : 0;
  const breath = walking || REDUCE ? 0 : Math.sin(t / 900 + h % 100) * .6 * S, bob = walking ? Math.abs(Math.cos(cyc * 6.2832)) * 1.1 * S : 0;
  const gy = base - bob, y = gy + breath + drop * S;   // gy: the ground under the soles (the legs), y: the body, lower when seated
  const now = Date.now() / 1000 + skew, old = a.age >= 65, baby = a.age < 6, hurt = a.sick;
  let f = p.face || 0;   // which way the face points: -1 left, 0 front, 1 right
  if (!walking) {
    f = 0; const o = a.say_to && now - a.say_at < 26 && st.agents.find(q => q.name === a.say_to), op = o && o.place === a.place && pos[o.name];
    if (op && Math.abs(op.x - p.x) > .05) f = Math.sign(op.x - p.x);
    else if (!REDUCE) { const ph = t / 1000 + h % 7; if (ph % 6 < .9) f = (Math.floor(ph / 6) + h) & 1 ? 1 : -1; }   // now and then a glance to the side
  }
  const dir = f || p.face || 1, lean = old ? 1.4 * S * dir : 0, r = B.r * S, hx = x + lean + f * .5 * S, hy = y - (B.chin + B.r) * S + (old ? .9 * S : 0), u = r / 5.7;
  const skin = hurt ? mix(L.skin, '#f6eee4', .16) : L.skin, line = 'rgba(30,22,16,.4)', hairC = hairColor(a), prop = standing && PROPS[a.place];
  const onBench = sit && a.place === 'Square' && SEATS.Square.some(q => Math.abs(q[0] - p.x) < .05 && Math.abs(q[1] - p.y) < .05), dress = a.sex === 'f' && a.age >= 6, z = g === ctx ? cam.z : 3;   // z: how close we are looking (scene cards are always close)
  const c = { g, a, p, h, z, dir, prop, onBench, hairC, S, B, L, x, y, gy, f, t, skin, line, drop, sit, step, cyc, walking, dress, sleeve: a.color, trouser: TROUSERS[(h >>> 16) % 4], sock: dress ? '#c4b8a0' : mix(TROUSERS[(h >>> 16) % 4], '#c9bda3', .3), Y: v => y - v * S };
  shadow(g, x - 2, base + 1, 11 * S, 4 * S, .3);
  if (selected === a.name) { const k = 1 + Math.sin(t / 300) * 0.08; g.strokeStyle = '#e8bd5f'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, base + 1, 17 * S * k, 7.5 * S * k, 0, 0, 7); g.stroke(); }
  else if (hover === a.name) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, base + 1, 15 * S, 6.5 * S, 0, 0, 7); g.stroke(); }
  if (hurt) { const k = REDUCE ? .6 : .5 + .3 * Math.sin(t / 700 + h % 9); g.fillStyle = `rgba(140,215,120,${.1 * k})`; g.beginPath(); g.ellipse(x, base - 15 * S, 15 * S, 25 * S, 0, 0, 7); g.fill(); g.fillStyle = `rgba(140,215,120,${.14 * k})`; g.beginPath(); g.ellipse(x, base + 1, 13 * S, 5 * S, 0, 0, 7); g.fill(); }   // a faint green aura while ill
  g.lineWidth = 1.3; g.lineJoin = 'round'; g.lineCap = 'round';
  g.save();   // the figure itself: broader or slighter about its middle, leaning forward a little as it walks
  if (m.wf !== 1 || walking) { g.translate(x, base); if (m.wf !== 1) g.scale(m.wf, 1); if (walking) g.rotate(.06 * dir); g.translate(-x, -base); }
  if (L.hair === 'long') { g.fillStyle = hairC; g.strokeStyle = line; g.beginPath(); g.roundRect(hx - r - .9 * u, hy - r * .55, 2 * r + 1.8 * u, 13 * S, [r, r, 3 * S, 3 * S]); g.fill(); g.stroke(); }   // hair falling behind the shoulders
  if (sit && !c.onBench) { g.fillStyle = '#8a6a44'; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(x - 5.6 * S, gy - (B.hem - drop - .4) * S, 11.2 * S, (B.hem - drop - .4) * S, 1 * S); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,235,190,.25)'; g.fillRect(x - 5.2 * S, gy - (B.hem - drop - .4) * S, 10.4 * S, 1.2 * S); g.lineWidth = 1.3; }   // a stool under anyone seated away from a bench
  drawLegs(c);
  if (L.cloak) drawCloakBack(c);
  g.fillStyle = shade(skin, .86); g.fillRect(x + lean * .5 - 1.7 * S, y - (B.chin + .8) * S, 3.4 * S, (B.chin + .8 - B.sh + 1.4) * S);   // neck
  if (old) { const sd = -dir, sx = x + sd * (B.shW + 1.8) * S; g.strokeStyle = '#6b4a2e'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(sx + sd * .8 * S, gy); g.lineTo(sx, y - (B.hem + 1) * S); g.stroke(); g.lineWidth = 1.3; c.stick = sd; }   // walking stick, held in the hand on that side and ending at the ground
  g.fillStyle = a.color; drawTorso(c); g.fill();
  g.save(); drawTorso(c); g.clip(); { const tg = g.createLinearGradient(x - 9 * S, 0, x + 9 * S, 0); tg.addColorStop(0, 'rgba(255,255,255,.16)'); tg.addColorStop(.55, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = tg; g.fillRect(x - 10 * S, y - (B.sh + 1) * S, 20 * S, (B.sh + 1) * S); }
  if (L.accent === 'apron') {   // apron over the lower body, with straps
    const top = B.sh - 4.2, bot = (dress ? B.hem - 3.8 : B.hem) - .4, aw = B.shW * .85;
    g.fillStyle = L.apron; g.beginPath(); g.roundRect(x - aw * S, y - top * S, 2 * aw * S, (top - bot) * S, 2 * S); g.fill(); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + .5 * S, y - top * S, aw * S, (top - bot) * S);
    g.strokeStyle = L.leather ? '#5a3a1c' : 'rgba(150,140,120,.8)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x - aw * .6 * S, y - top * S); g.lineTo(x - (aw - .2) * S, y - B.sh * S); g.moveTo(x + aw * .6 * S, y - top * S); g.lineTo(x + (aw - .2) * S, y - B.sh * S); g.stroke();
    g.fillStyle = L.leather ? '#6e4624' : 'rgba(0,0,0,.1)'; g.fillRect(x - aw * .5 * S, y - (top - 3.6) * S, aw * S, 3.2 * S);
    if (L.flour && z > 1) { g.fillStyle = 'rgba(255,255,255,.7)'; for (const [fx, fv, fr] of [[-2.6, .22, 1.3], [1.8, .5, 1], [3, .12, .8], [-.5, .7, .9]]) { g.beginPath(); g.ellipse(x + fx * S, y - (top + (bot - top) * fv) * S, fr * S, fr * .7 * S, .3, 0, 7); g.fill(); } g.fillStyle = 'rgba(120,100,70,.18)'; g.fillRect(x - aw * S, y - bot * S - 1.2 * S, 2 * aw * S, 1.2 * S); }   // flour dusting the apron
  }
  if (L.accent === 'waistcoat') {   // a dark waistcoat with a V and buttons
    const vc = shade(a.color, .42), sh = B.sh, hm = B.hem; g.fillStyle = vc; g.beginPath(); g.moveTo(x - 5.6 * S, y - (sh + .5) * S); g.lineTo(x - 1.1 * S, y - (sh + .5) * S); g.lineTo(x, y - (sh - 5) * S); g.lineTo(x + 1.1 * S, y - (sh + .5) * S); g.lineTo(x + 5.6 * S, y - (sh + .5) * S); g.lineTo(x + 5.6 * S, y - (hm - .5) * S); g.lineTo(x - 5.6 * S, y - (hm - .5) * S); g.closePath(); g.fill();
    if (z > 1) { g.fillStyle = '#e8d8a0'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x, y - (sh - 6.4 - i * 2.6) * S, .6 * S + .1, 0, 7); g.fill(); } }
  }
  g.restore(); g.strokeStyle = line; g.lineWidth = 1.3; drawTorso(c); g.stroke();
  drawGear(c); if (hurt) drawBlanket(c);
  const rest = d => [d * .9, 9.4];   // arms hang a little away from the body
  const wl = rest(-1), wr = rest(1);
  if (walking) { wl[1] -= step * 2.2; wr[1] += step * 2.2; wl[0] += step * 1.2; wr[0] -= step * 1.2; }   // arms swing against the legs
  if (prop === 'book') { wl[0] = 2.6; wl[1] = 7.4; wr[0] = -2.6; wr[1] = 7.4; }
  if (c.stick) { const hd = c.stick; (hd < 0 ? wl : wr)[0] = hd * 1.4; (hd < 0 ? wl : wr)[1] = 10.4; }
  const talking = standing && !!a.say && now - a.say_at < 5.5, sw = REDUCE ? .4 : Math.sin(t / 190 + h);
  if (standing && !prop && (pose === 'eat' || pose === 'drink')) { const k = REDUCE ? .7 : (Math.sin(t / 520 + h) + 1) / 2; wr[0] += (-5.2 + dir * 1.6 - wr[0]) * k; wr[1] += (-4.2 - wr[1]) * k; }   // the hand goes to the mouth and back
  else if (standing && !prop && pose === 'work') { wr[0] = 3.2 + sw * 3; wr[1] = -2.5 + (sw + 1) * 3.6; }                  // the working arm swings
  else if (standing && !prop && talking && !c.stick) { wl[0] = -2.2 + sw * 2.2; wl[1] = 4.5 + Math.sin(t / 240 + h) * 3; }              // a hand gestures while they speak
  drawArm(c, -1, wl); drawBook(c); const [hx2, hy2] = drawArm(c, 1, wr);
  if (standing && !prop && pose === 'drink') { g.fillStyle = '#b98a50'; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.roundRect(hx2 - 2.4 * S, hy2 - 3.6 * S, 4.8 * S, 5 * S, 1 * S); g.fill(); g.stroke(); g.fillStyle = '#f4efe0'; g.fillRect(hx2 - 2.4 * S, hy2 - 3.9 * S, 4.8 * S, 1.3 * S); }       // a mug
  else if (standing && !prop && pose === 'eat') { g.fillStyle = '#d9a35a'; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.ellipse(hx2, hy2 - 1 * S, 3 * S, 1.9 * S, -.2, 0, 7); g.fill(); g.stroke(); }   // a piece of bread
  else if (standing && !prop && pose === 'work') { const up = -(sw + 1) * .5; g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.7; g.beginPath(); g.moveTo(hx2, hy2 + 1.5 * S); g.lineTo(hx2 + dir * 2.4 * S, hy2 - (6 + up * 2) * S); g.stroke(); g.fillStyle = '#9aa0a6'; g.beginPath(); g.roundRect(hx2 + dir * 2.4 * S - 2.6 * S, hy2 - (7.4 + up * 2) * S, 5.2 * S, 2.2 * S, .6 * S); g.fill(); }   // a tool in the swinging hand
  if (L.accent === 'shawl') {   // shawl draped over the shoulders, point at the chest
    const Y = c.Y; g.fillStyle = L.shawl; g.strokeStyle = line; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - (B.shW + 2.6) * S, Y(B.sh - 1.2)); g.quadraticCurveTo(x - 6 * S, Y(B.sh + 1.2), x, Y(B.sh + 1)); g.quadraticCurveTo(x + 6 * S, Y(B.sh + 1.2), x + (B.shW + 2.6) * S, Y(B.sh - 1.2));
    g.lineTo(x + 5.6 * S, Y(B.sh - 7.6)); g.lineTo(x, Y(B.sh - 11.5)); g.lineTo(x - 5.6 * S, Y(B.sh - 7.6)); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x - 4.8 * S + i * 2.4 * S, Y(B.sh - 7.8 + Math.abs(i - 2) * 1.3), .8 * S, 0, 7); g.fill(); }
  }
  if (L.accent === 'scarf') { const Y = c.Y; g.fillStyle = L.scarf; g.strokeStyle = line; g.lineWidth = 1.1; g.beginPath(); g.roundRect(x - 5.8 * S, Y(B.sh + 1.6), 11.6 * S, 3.4 * S, 1.7 * S); g.fill(); g.stroke(); g.beginPath(); g.roundRect(x + 1.8 * S, Y(B.sh - .4), 3 * S, 6.4 * S, 1.2 * S); g.fill(); g.stroke(); }   // scarf with a hanging tail
  // head: back of the braid / bun first, then face, then hair in front
  if (L.hair === 'braid') { g.fillStyle = hairC; g.strokeStyle = line; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(hx - r - .9 * u - i * .15 * u, hy + (5 + i * 3.2) * u, 2.3 * u, 2.1 * u, 0, 0, 7); g.fill(); g.stroke(); } g.fillStyle = '#e0a23a'; g.beginPath(); g.arc(hx - r - 1.4 * u, hy + 17.6 * u, 1.3 * u, 0, 7); g.fill(); }
  g.strokeStyle = line; g.lineWidth = 1.3; g.fillStyle = skin; g.beginPath(); if (a.age < 18) g.ellipse(hx, hy, r * 1.05, r, 0, 0, 7); else g.arc(hx, hy, r, 0, 7); g.fill(); g.stroke();   // children's faces are rounder
  if (z >= 1.5 && (hurt || a.age < 18)) { g.fillStyle = hurt ? 'rgba(235,110,110,.4)' : 'rgba(235,130,130,.22)'; for (const d of [-1, 1]) { g.beginPath(); g.arc(hx + (f * 1.4 + d * 3.3) * u, hy + 2.5 * u, (hurt ? 1.35 : 1.2) * u, 0, 7); g.fill(); } }   // flushed cheeks when ill; a faint blush on children
  if (old && z >= 1.5) { g.strokeStyle = shade(skin, .72); g.globalAlpha = .55; g.lineWidth = .8; g.beginPath(); for (const d of [-1, 1]) { const cx0 = hx + (f * 1.6 + d * 3.1) * u; g.moveTo(cx0 - d * .2 * u, hy + 1.6 * u); g.quadraticCurveTo(cx0 + d * .9 * u, hy + 3.2 * u, cx0 - d * .1 * u, hy + 4.4 * u); } g.stroke(); g.globalAlpha = 1; }   // two short cheek lines
  if (L.hair === 'bald+beard') { g.fillStyle = hairC; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(hx + d * (r - .5 * u), hy - 1.2 * u, 1.8 * u, 3.4 * u, 0, 0, 7); g.fill(); } }
  else hairCap(c, hx, hy, r, u);
  if (L.beard && a.age >= 18) { g.fillStyle = L.beard; g.strokeStyle = line; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - r * .98, hy + 1.6 * u); g.quadraticCurveTo(hx - r * 1.05, hy + r + 2.4 * u, hx, hy + r + 2.8 * u); g.quadraticCurveTo(hx + r * 1.05, hy + r + 2.4 * u, hx + r * .98, hy + 1.6 * u); g.quadraticCurveTo(hx, hy + 3.4 * u, hx - r * .98, hy + 1.6 * u); g.fill(); g.stroke(); }
  drawFace(g, { a, u, hx, hy, r, f, t, z, talking, hurt, baby, skin, glasses: L.glasses && z > 1, flour: L.flour, beard: !!(L.beard && a.age >= 18), h });
  if (L.cap && a.age >= 6) {   // cap with a brim towards the facing direction
    g.fillStyle = L.cap; g.strokeStyle = line; g.lineWidth = 1.1; g.beginPath(); g.arc(hx, hy - 1.2 * u, r + .8 * u, Math.PI * 1.0, Math.PI * 2); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(hx - r - 1.2 * u + f * 2.5 * u, hy - 2.4 * u, 2 * r + 2.4 * u, 2.4 * u, 1.2 * u); g.fill(); g.stroke();
  }
  if (prop) {   // what they hold, only while standing at that place
    const px = hx2, py = hy2; g.lineWidth = 1.2; g.strokeStyle = line;
    if (prop === 'axe') { g.strokeStyle = '#6b4a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - .5 * S, py + 4 * S); g.lineTo(px + 3 * S, py - 12 * S); g.stroke(); g.fillStyle = '#aeb4ba'; g.beginPath(); g.moveTo(px + 2.4 * S, py - 12.4 * S); g.lineTo(px + 8 * S, py - 13.4 * S); g.lineTo(px + 7 * S, py - 7.4 * S); g.lineTo(px + 3.4 * S, py - 8.4 * S); g.closePath(); g.fill(); g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
    else if (prop === 'rod') { g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px - 1 * S, py + 2 * S); g.lineTo(px + 15 * S, py - 20 * S); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .8; g.beginPath(); g.moveTo(px + 15 * S, py - 20 * S); g.lineTo(px + 17 * S, py - 6 * S); g.stroke(); g.fillStyle = '#d9604a'; g.beginPath(); g.arc(px + 17 * S, py - 5 * S, 1.2 * S, 0, 7); g.fill(); }
    else if (prop === 'basket') { g.fillStyle = '#6fbf5a'; g.beginPath(); g.arc(px - 1.5 * S, py - .5 * S, 2 * S, 0, 7); g.arc(px + 2 * S, py - 1 * S, 2 * S, 0, 7); g.fill(); g.fillStyle = '#b98a50'; g.beginPath(); g.roundRect(px - 5 * S, py + .4 * S, 10 * S, 5.4 * S, [0, 0, 3 * S, 3 * S]); g.fill(); g.stroke(); g.strokeStyle = 'rgba(80,50,20,.5)'; g.beginPath(); g.moveTo(px - 4 * S, py + 3 * S); g.lineTo(px + 4 * S, py + 3 * S); g.stroke(); }
    else if (prop === 'loaf') { g.fillStyle = '#d9a35a'; g.beginPath(); g.ellipse(px, py + 1 * S, 5.2 * S, 2.8 * S, -.15, 0, 7); g.fill(); g.stroke(); g.strokeStyle = 'rgba(120,70,20,.7)'; g.beginPath(); for (const d of [-2.2, 0, 2.2]) { g.moveTo(px + d * S - .8 * S, py + .2 * S); g.lineTo(px + d * S + .8 * S, py + 1.8 * S); } g.stroke(); }
    else if (prop === 'book') { const bt = B.hem + 6.4; g.fillStyle = '#8c3a3a'; g.beginPath(); g.roundRect(x - 4.8 * S, c.Y(bt), 9.6 * S, 6.6 * S, 1 * S); g.fill(); g.stroke(); g.fillStyle = '#f2ead6'; g.fillRect(x - 4 * S, c.Y(bt - .8), 7.8 * S, 1 * S); g.fillStyle = skin; g.beginPath(); g.arc(x - 4.8 * S, c.Y(bt - 3.4), 1.9 * S, 0, 7); g.arc(x + 4.8 * S, c.Y(bt - 3.4), 1.9 * S, 0, 7); g.fill(); }
    else if (prop === 'pick') { g.strokeStyle = '#6b4a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(px - .5 * S, py + 4 * S); g.lineTo(px + 3.5 * S, py - 11 * S); g.stroke(); g.strokeStyle = '#9aa0a6'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(px - 3 * S, py - 11 * S); g.quadraticCurveTo(px + 3.5 * S, py - 15 * S, px + 10 * S, py - 10 * S); g.stroke(); }
    else if (prop === 'flowers') { g.strokeStyle = '#4f8a3c'; g.lineWidth = 1.2; g.beginPath(); for (const d of [-2, 0, 2]) { g.moveTo(px + d * .5 * S, py + 1 * S); g.lineTo(px + d * S, py - 5 * S); } g.stroke(); ['#f4e36b', '#e98bb0', '#f6f2ea'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(px + (i - 1) * 2 * S, py - 5.6 * S - (i % 2) * S, 1.6 * S, 0, 7); g.fill(); }); }
  }
  g.restore();
  if (cam.z < 0.8 && g === ctx) { const pr = 3.2 / Math.max(cam.z, .3); g.fillStyle = a.color; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.2 / Math.max(cam.z, .3); g.beginPath(); g.arc(hx, hy - r - 5 * u - pr, pr, 0, 7); g.fill(); g.stroke(); }   // zoomed out, a colour pip over the head says who is who
  if (hurt && !REDUCE && (t / 1000) % 5 < 1.8) {   // a faint green "≈" above the head now and then
    const k = ((t / 1000) % 5) / 1.8, ox = hx, oy = hy - r - 6 * u - k * 5; g.strokeStyle = `rgba(190,235,170,${1 - k * .8})`; g.lineWidth = 1.6;
    for (const d of [0, 3]) { g.beginPath(); g.moveTo(ox - 4, oy + d - 1); g.quadraticCurveTo(ox - 2, oy + d - 3.5, ox, oy + d - 1); g.quadraticCurveTo(ox + 2, oy + d + 1.5, ox + 4, oy + d - 1); g.stroke(); }
  }
}
