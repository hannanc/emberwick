const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const P = require(path.join(__dirname, '..', '..', 'js', 'pure.js'));
const st = require('./state.fixture.json');

test('hhmm pads hours and minutes', () => { assert.equal(P.hhmm(0), '00:00'); assert.equal(P.hhmm(605), '10:05'); assert.equal(P.hhmm(1439), '23:59'); });
test('clamp and lerp', () => {
  assert.equal(P.clamp(5, 0, 3), 3); assert.equal(P.clamp(-1, 0, 3), 0); assert.equal(P.clamp(2, 0, 3), 2);
  assert.equal(P.lerp(10, 20, .25), 12.5);
});
test('rng is seeded and in [0, 1)', () => {
  const a = P.rng(7), b = P.rng(7), xs = Array.from({ length: 50 }, a);
  assert.deepEqual(xs, Array.from({ length: 50 }, b)); assert.ok(xs.every(v => v >= 0 && v < 1));
  assert.notEqual(P.rng(8)(), P.rng(7)());
});
test('hash is stable and unsigned', () => { assert.equal(P.hash('Mira'), P.hash('Mira')); assert.notEqual(P.hash('Mira'), P.hash('Bram')); assert.ok(P.hash('x') >= 0); });
test('distSeg measures to the nearest point of a segment', () => {
  assert.equal(P.distSeg(5, 3, [0, 0], [10, 0]), 3);
  assert.equal(P.distSeg(-3, 4, [0, 0], [10, 0]), 5);
  assert.equal(P.distSeg(1, 1, [2, 2], [2, 2]), Math.SQRT2);
});
test('inLake', () => { assert.ok(P.inLake(20, 25)); assert.ok(!P.inLake(20, 5)); });
test('viaDepth counts the hops from the Square', () => { assert.equal(P.viaDepth('Dock'), 0); assert.equal(P.viaDepth('Bakery'), 1); assert.equal(P.viaDepth('Oracle'), 2); });
test('sky is dark at midnight, bright at noon, and weather dims it', () => {
  assert.ok(P.sky(0, 'clear').light > .8); assert.equal(P.sky(12 * 60, 'clear').light, 0);
  assert.ok(P.sky(12 * 60, 'storm').c[0] < P.sky(12 * 60, 'clear').c[0]);
});
test('moods become faces', () => {
  assert.equal(P.moodKind('Joyful').mouth, 'smile'); assert.equal(P.moodKind('grieving').mouth, 'frown');
  assert.equal(P.moodKind('angry').brow, -1); assert.equal(P.moodKind('').mouth, 'soft');
});
test('activities become poses', () => {
  assert.equal(P.poseOf({ activity: 'sipping ale' }), 'drink'); assert.equal(P.poseOf({ activity: 'eating stew' }), 'eat');
  assert.equal(P.poseOf({ activity: 'sitting by the fire' }), 'sit'); assert.equal(P.poseOf({ activity: 'gazing at clouds' }), 'stand');
  assert.equal(P.poseOf({ activity: 'hammering a plank' }), 'work');
});
test('look is stable per villager and differs for children', () => {
  const a = { name: 'Zed', sex: 'm', age: 30, hair: '#222' };
  assert.equal(P.look(a), P.look(a)); assert.notEqual(P.look(a), P.look({ ...a, age: 9 }));
  assert.equal(P.look({ name: 'Mira', sex: 'f', age: 40 }).accent, 'apron');
});
test('weatherIcon follows weather first, then time of day', () => {
  assert.equal(P.weatherIcon('storm', 720), '⛈'); assert.equal(P.weatherIcon('clear', 720), '☀'); assert.equal(P.weatherIcon('clear', 60), '☾');
});
test('wrapText wraps by a stub measure', () => {
  const w = s => s.length * 10;
  assert.deepEqual(P.wrapText('aa bb cc dd', 50, w), ['aa bb', 'cc dd']);
  assert.deepEqual(P.wrapText('word', 5, w), ['word']);
  assert.deepEqual(P.wrapText('', 50, w), []);
});
test('labels are rejected off screen, over others, or past the edge margin', () => {
  const occ = [{ x: 0, y: 0, w: 50, h: 20 }], r = (x, y) => ({ x, y, w: 40, h: 15 });
  assert.equal(P.labelRejected(r(100, 100), {}, 400, 300, occ), false);
  assert.equal(P.labelRejected(r(10, 5), {}, 400, 300, occ), true);
  assert.equal(P.labelRejected(r(10, 5), { force: true }, 400, 300, occ), false);
  assert.equal(P.labelRejected(r(-100, 100), {}, 400, 300, occ), true);
  assert.equal(P.labelRejected(r(1, 100), { edge: true }, 400, 300, occ), true);
});
test('placeNear finds the Square, the nearest place, or nothing', () => {
  const [sx, sy] = [20.4, 13];
  assert.equal(P.placeNear(st.places, sx, sy), 'Square');
  const [x, y] = st.places.Tavern; assert.equal(P.placeNear(st.places, x, y + .5), 'Tavern');
  assert.equal(P.placeNear(st.places, 0, 0), null);
});
test('villagerNear picks the closest figure and nobody at night', () => {
  const pos = { Mira: { x: 5, y: 5 }, Bram: { x: 9, y: 5 } };
  const s = { phase: 'day', agents: [{ name: 'Mira' }, { name: 'Bram' }] };
  assert.equal(P.villagerNear(s, pos, 5 * 32 + 3, 5 * 32 - 20, 1), 'Mira');
  assert.equal(P.villagerNear(s, pos, 9 * 32, 5 * 32 - 20, 1), 'Bram');
  assert.equal(P.villagerNear(s, pos, 7 * 32, 5 * 32 - 20, 1), null);
  assert.equal(P.villagerNear({ ...s, phase: 'night' }, pos, 5 * 32, 5 * 32 - 20, 1), null);
});
test('sceneData selects who is in a place, recent talk, and what stands nearby', () => {
  const d = P.sceneData(st, 'Tavern', 5);
  assert.deepEqual(d.here.map(a => a.place), d.here.map(() => 'Tavern')); assert.ok(d.here.length >= 1);
  assert.ok(d.talk.length <= 6 && d.talk.every(e => e.place === 'Tavern'));
  assert.ok(P.sceneData({ ...st, events: [{ kind: 'turn', place: 'Tavern', say: 'old', day: 1, minute: 0 }] }, 'Tavern').talk.length === 0);
  assert.ok(P.sceneData(st, 'Dock').here.every(a => a.place === 'Dock'));
});

test('brows mirror each other and tilt the right way', () => {
  for (const brow of [-1, 0, 1]) {
    const L = P.browPoints(brow, -1, 10, 20, 1), R = P.browPoints(brow, 1, 30, 20, 1);
    assert.ok(Math.abs((L.inner[1] - L.outer[1]) - (R.inner[1] - R.outer[1])) < 1e-9);   // same slope on both eyes
    assert.ok(L.inner[0] > L.outer[0] && R.inner[0] < R.outer[0]);                       // inner ends point at the nose
  }
  const stern = P.browPoints(-1, -1, 0, 0, 1), worried = P.browPoints(1, 1, 0, 0, 1), calm = P.browPoints(0, 1, 0, 0, 1);
  assert.ok(stern.inner[1] > stern.outer[1]);       // y grows downwards: inner end lower than outer = stern
  assert.ok(worried.inner[1] < worried.outer[1]);   // inner end higher = worried
  assert.equal(calm.inner[1], calm.outer[1]);
});
test('colour helpers', () => {
  assert.equal(P.hexOf(P.rgbOf('#fff')), '#ffffff'); assert.equal(P.shade('#808080', .5), '#404040'); assert.equal(P.shade('#000000', 2), '#ffffff'.replace(/f/g, 'f'));
  assert.equal(P.mix('#000000', '#ffffff', .5), '#808080'); assert.deepEqual(P.rgbOf('nonsense'), [136, 136, 136]);
  assert.equal(P.rgbaOf('#ff0000', .5), 'rgba(255,0,0,0.5)'); assert.ok(P.lumaOf('#fff') > .99);
});
