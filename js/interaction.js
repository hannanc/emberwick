// ================================================================ map interaction
const ptrs = new Map(); let drag = null, pinch = null;
function villagerAt(sx, sy) { const [wx, wy] = toWorld(sx, sy); return villagerNear(st, pos, wx, wy, cam.z, T, FIG); }
function dismissHint() { $('hint').classList.add('gone'); store.set('ew-hint', '1'); }
if (store.get('ew-hint')) $('hint').classList.add('gone'); else setTimeout(dismissHint, 12000);
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (ptrs.size === 1) drag = { sx: e.offsetX, sy: e.offsetY, cx: cam.tx, cy: cam.ty, moved: false };
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; drag = null; }
});
cv.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
  if (pinch && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    zoomAt(d / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, true); pinch.d = d; return;
  }
  if (drag) {
    const dx = e.offsetX - drag.sx, dy = e.offsetY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; cam.follow = false; syncFocus(); cv.classList.add('drag'); userMoved = true; dismissHint(); }
    if (drag.moved) { cam.tx = drag.cx - dx / cam.tz; cam.ty = drag.cy - dy / cam.tz; clampT(); cam.x = cam.tx; cam.y = cam.ty; }
    return;
  }
  if (e.pointerType === 'mouse') { const h = villagerAt(e.offsetX, e.offsetY); if (h !== hover) { hover = h; cv.classList.toggle('hot', !!h); } }
});
const endPtr = e => {
  ptrs.delete(e.pointerId);
  if (drag && !drag.moved && e.type === 'pointerup') {
    const v = villagerAt(e.offsetX, e.offsetY), pl = v ? null : placeAt(e.offsetX, e.offsetY);
    if (pl) focusPlace(pl); else select(v, false);
  }
  if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null;
  cv.classList.remove('drag');
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => { if (hover) { hover = null; cv.classList.remove('hot'); } });
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-(e.deltaMode ? e.deltaY * 16 : e.deltaY) * 0.0016), e.offsetX, e.offsetY); }, { passive: false });
cv.addEventListener('dblclick', e => zoomAt(1.8, e.offsetX, e.offsetY));
let kfocus = null;   // keyboard focus on the map: { kind: 'villager' | 'place', name }
function kbdItems() { return st ? [...(st.phase === 'night' ? [] : st.agents.filter(a => pos[a.name]).map(a => ({ kind: 'villager', name: a.name }))), ...Object.keys(st.places).map(n => ({ kind: 'place', name: n }))] : []; }
function kbdPoint(k) { if (k.kind === 'villager') { const p = pos[k.name]; return p ? [p.x * T, p.y * T] : null; } const q = st.places[k.name]; return q ? [q[0] * T, q[1] * T] : null; }
function kbdMove(dir, wrap) {   // step to the next or previous villager or place; false when a Tab runs off either end (so focus can leave the map)
  const items = kbdItems(); if (!items.length) return false;
  let i = kfocus ? items.findIndex(k => k.kind === kfocus.kind && k.name === kfocus.name) : -1;
  i = i < 0 ? (dir > 0 ? 0 : items.length - 1) : i + dir;
  if (i < 0 || i >= items.length) { if (!wrap) { kfocus = null; return false; } i = (i + items.length) % items.length; }
  kfocus = items[i]; const pt = kbdPoint(kfocus);
  if (pt) { const [sx, sy] = toScreen(pt[0], pt[1]); if (sx < 60 || sx > vw - 60 || sy < 60 || sy > vh - 60) { cam.follow = false; syncFocus(); cam.tx = pt[0]; cam.ty = pt[1]; clampT(); userMoved = true; } }
  $('kbd').textContent = kfocus.kind === 'villager' ? `${kfocus.name}, ${(st.agents.find(a => a.name === kfocus.name) || {}).activity || 'in the village'}. Press Enter to select.` : `${PLACE_NAME[kfocus.name] || kfocus.name}. Press Enter to visit.`;
  return true;
}
function drawKbdFocus() {   // a gold ring and a forced name label on whatever the keyboard has reached
  if (!kfocus || document.activeElement !== cv || !st) return;
  const pt = kbdPoint(kfocus); if (!pt) return; const [sx, sy] = toScreen(pt[0], pt[1]), z = cam.z, v = kfocus.kind === 'villager';
  ctx.save(); ctx.beginPath(); if (v) ctx.ellipse(sx, sy - 2 * z, 17 * z * FIG / .85, 7 * z * FIG / .85, 0, 0, 7); else ctx.arc(sx, sy, Math.max(22, 30 * z), 0, 7);
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(14,16,20,.8)'; ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd36b'; ctx.stroke(); ctx.restore();
  label(kfocus.kind === 'place' ? (PLACE_NAME[kfocus.name] || kfocus.name) : kfocus.name, sx, v ? sy - (figMetrics(st.agents.find(q => q.name === kfocus.name) || { age: 30, name: kfocus.name }, FIG).top + 9) * z - 8 : sy - Math.max(22, 30 * z) - 8, { color: '#ffd36b', size: 13, force: true });
}
cv.addEventListener('pointerdown', () => { kfocus = null; }, true);
cv.addEventListener('blur', () => { kfocus = null; });
cv.addEventListener('keydown', e => {
  const step = 80 / cam.tz, keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (e.key === '+' || e.key === '=') zoomAt(1.25);
  else if (e.key === '-' || e.key === '_') zoomAt(0.8);
  else if (e.key === '0') showWholeVillage();
  else if (e.key === 'Escape') { kfocus = null; if (sceneAt) closeScene(); else select(null); }
  else if (e.key === ']' || e.key === '[') kbdMove(e.key === ']' ? 1 : -1, true);
  else if (e.key === 'Tab') { if (!e.ctrlKey && !e.altKey && !e.metaKey && kbdMove(e.shiftKey ? -1 : 1, false)) { /* handled: the ring moved */ } else return; }
  else if (e.key === 'Enter' && kfocus) { const k = kfocus; if (k.kind === 'place') focusPlace(k.name); else select(k.name, true); }
  else if (keys[e.key]) { cam.follow = false; syncFocus(); cam.tx += keys[e.key][0]; cam.ty += keys[e.key][1]; clampT(); userMoved = true; }
  else return;
  e.preventDefault();
});
$('zin').onclick = () => zoomAt(1.35); $('zout').onclick = () => zoomAt(1 / 1.35); function showWholeVillage() { resetView(); cam.tz = fitZ(); clampT(); }          // the first view may crop a narrow screen to keep people readable; this one never does
$('zfit').onclick = showWholeVillage;
