// ================================================================ light & weather
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
const glowGr = {};   // one unit-radius gradient per colour, reused with translate/scale instead of building a new one per glow
const glow = (x, y, r, a, col = '255,200,110') => {
  let gr = glowGr[col]; if (!gr) { gr = glowGr[col] = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(1, `rgba(${col},0)`); }
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.globalAlpha *= Math.min(1, a); ctx.fillStyle = gr; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
};
let cloudGr = null, busy = true, moving = true, lastDraw = -1e9; const frameMs = [];
