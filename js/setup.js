// ================================================================ setup
const T = 32, H = 24, WH = H * T, M = 8 * T, SQ = [20, 13.4];
let W = 58, WW = W * T;                                   // grows east as the village opens new lanes
const SERIF = getComputedStyle(document.documentElement).getPropertyValue('--serif'), SANS = getComputedStyle(document.documentElement).getPropertyValue('--sans');
const $ = id => document.getElementById(id);
const DEBUG = Object.fromEntries(new URLSearchParams(location.search));   // ?t=HH:MM &w=weather &cam=x,y,z &sel=Name &tab=id &freeze=ms (screenshots)
const SS = DEBUG.ss ? +DEBUG.ss || 1.5 : (navigator.deviceMemory && navigator.deviceMemory <= 2 ? 1 : 1.5);   // scenery resolution: 1.5x, or 1x on very low-memory devices (?ss=1 forces it)
if ('err' in DEBUG) addEventListener('error', e => {   // ?err shows script errors on the page (for headless screenshots)
  const d = document.createElement('pre'); d.style.cssText = 'position:fixed;top:0;left:0;z-index:99;background:#fff;color:#000;font:12px monospace;max-width:60vw;white-space:pre-wrap;margin:0';
  d.textContent = e.message + ' @ line ' + e.lineno + ':' + e.colno; document.body.append(d); });
const FROZEN = DEBUG.freeze != null && DEBUG.freeze !== '' && isFinite(+DEBUG.freeze) ? +DEBUG.freeze : null;
const cv = $('c'), ctx = cv.getContext('2d'), stage = $('stage');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STAND = { Oracle: 1.7, Dock: 1.2, Square: 1.4, Garden: 1.7, Shrine: 1.6, Cottages: 1.9, Meadow: 1.9, Hospital: 1.6, Cemetery: 1.9 };
const VIA = {   // the four roads leave the square to the Cottages, Garden, Dock and Shrine; every other place branches off one of them
  Bakery: 'Cottages', Workshop: 'Cottages', Oracle: 'Bakery', Woods: 'Garden', Tavern: 'Shrine', Quarry: 'Tavern',
  Library: 'Shrine', Hospital: 'Library', Cemetery: 'Hospital', Meadow: 'Shrine', 'East Lane': 'Meadow', 'Far Lane': 'East Lane' };
const viaDepth = p => { let d = 0; for (let q = p; VIA[q] && d < 9; q = VIA[q]) d++; return d; };   // places reached by a branch off another place's path, not straight from the Square
const PLACE_NAME = { Tavern: 'The Gilded Newt', Shrine: 'Old Oak Shrine' };
let st = null, selected = null, hover = null, skew = 0, filter = 'all', scenery = null, pathPts = {};
const pos = {};               // name -> {x, y, route:[[x,y]...], place, walking}
const windows = [];           // static window / lamp lights in world px
const chimneys = [];          // static chimney tops in world px [x, y]; moving ones are collected per frame in smokes
let smokes = [], millAng = 0, millSp = .77;

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 7; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 2654435761); return h >>> 0; }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const colorOf = n => n === 'Village' ? '#e8bd5f' : (st && st.agents.find(a => a.name === n) || {}).color || '#bbb';
const projName = s => s.owner === 'Village' ? cap(((st.goals && st.goals.projects || []).find(p => p.key === s.type) || {}).name || s.type) : `${s.owner}'s ${s.type}`;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
