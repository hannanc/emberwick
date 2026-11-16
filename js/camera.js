// ================================================================ camera
const cam = { x: WW / 2, y: WH / 2, z: 1, tx: WW / 2, ty: WH / 2, tz: 1, follow: false };
let vw = 1, vh = 1, dpr = 1, userMoved = false;
const fitZ = () => Math.min(vw / WW, vh / WH);
const minZ = () => fitZ() * 0.9;
const maxZ = () => Math.max(3, fitZ() * 4);
function defaultZ() { const f = fitZ(); return f < 0.55 ? Math.min(Math.max(vw / WW, vh / WH), 0.62) : f; }
function clampT() {
  cam.tz = clamp(cam.tz, minZ(), maxZ());
  for (const [k, size, v] of [['tx', WW, vw], ['ty', WH, vh]]) {
    const half = v / 2 / cam.tz, lo = -M + half, hi = size + M - half;
    cam[k] = lo > hi ? size / 2 : clamp(cam[k], lo, hi);
  }
}
function resetView(instant) {
  cam.follow = false; userMoved = false; cam.tz = defaultZ(); cam.tx = WW / 2; cam.ty = WH / 2; clampT();
  if (instant) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
  syncFocus();
}
function resize() {
  const r = stage.getBoundingClientRect(), first = vw === 1;
  vw = Math.max(1, r.width); vh = Math.max(1, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  if (first || !userMoved) resetView(true); else clampT();
  if (first) debugCam();   // the first poll can land before the first resize
  redrawFrozen();
}
new ResizeObserver(resize).observe(stage);
const toScreen = (x, y) => [(x - cam.x) * cam.z + vw / 2, (y - cam.y) * cam.z + vh / 2];
const toWorld = (sx, sy) => [(sx - vw / 2) / cam.z + cam.x, (sy - vh / 2) / cam.z + cam.y];
function zoomAt(f, sx = vw / 2, sy = vh / 2, instant) {
  const wx = (sx - vw / 2) / cam.tz + cam.tx, wy = (sy - vh / 2) / cam.tz + cam.ty;
  cam.tz = clamp(cam.tz * f, minZ(), maxZ());
  if (!cam.follow) { cam.tx = wx - (sx - vw / 2) / cam.tz; cam.ty = wy - (sy - vh / 2) / cam.tz; }
  clampT(); userMoved = true; dismissHint();
  if (instant) { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
}
