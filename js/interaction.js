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
cv.addEventListener('keydown', e => {
  const step = 80 / cam.tz, keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if (e.key === '+' || e.key === '=') zoomAt(1.25);
  else if (e.key === '-' || e.key === '_') zoomAt(0.8);
  else if (e.key === '0') showWholeVillage();
  else if (e.key === 'Escape') { if (sceneAt) closeScene(); else select(null); }
  else if (keys[e.key]) { cam.follow = false; syncFocus(); cam.tx += keys[e.key][0]; cam.ty += keys[e.key][1]; clampT(); userMoved = true; }
  else return;
  e.preventDefault();
});
$('zin').onclick = () => zoomAt(1.35); $('zout').onclick = () => zoomAt(1 / 1.35); function showWholeVillage() { resetView(); cam.tz = fitZ(); clampT(); }          // the first view may crop a narrow screen to keep people readable; this one never does
$('zfit').onclick = showWholeVillage;
