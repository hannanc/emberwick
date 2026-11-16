// ================================================================ light & weather
const glowGr = {};   // one unit-radius gradient per colour, reused with translate/scale instead of building a new one per glow
const glow = (x, y, r, a, col = '255,200,110') => {
  let gr = glowGr[col]; if (!gr) { gr = glowGr[col] = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(1, `rgba(${col},0)`); }
  ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.globalAlpha *= Math.min(1, a); ctx.fillStyle = gr; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
};
let cloudGr = null, busy = true, moving = true, lastDraw = -1e9; const frameMs = [];
