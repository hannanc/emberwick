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

test('the adult body is about four heads tall with legs about a third of the height', () => {
  const B = P.BODY.adult, head = 2 * B.r, total = B.chin + 2 * B.r;
  assert.ok(total / head > 3.7 && total / head < 4.3, 'four heads tall');
  assert.ok(B.hem / total > .3 && B.hem / total < .38, 'legs about a third');
  assert.ok(B.chin < B.sh + 2 && B.chin > B.sh, 'a short neck between the shoulders and the chin');
  assert.ok(P.BODY.kid.r * 2 / (P.BODY.kid.chin + 2 * P.BODY.kid.r) > head / total, 'children have bigger heads');
  assert.ok(P.BODY.baby.r * 2 / (P.BODY.baby.chin + 2 * P.BODY.baby.r) > P.BODY.kid.r * 2 / (P.BODY.kid.chin + 2 * P.BODY.kid.r), 'babies bigger still');
  assert.equal(P.stageOf(3), 'baby'); assert.equal(P.stageOf(10), 'kid'); assert.equal(P.stageOf(18), 'adult');
});
test('builds: founders are fixed, everyone else stays within about 8% height and 10% width, elders are shorter', () => {
  assert.ok(P.build({ name: 'Bram', age: 40 }).wf > 1.05 && P.build({ name: 'Wren', age: 25 }).hf > 1.05 && P.build({ name: 'Isolde', age: 30 }).wf < .95);
  const names = Array.from({ length: 80 }, (_, i) => 'Villager' + i), bs = names.map(n => P.build({ name: n, age: 30 }));
  assert.ok(bs.every(b => b.hf >= .92 - 1e-9 && b.hf <= 1.08 + 1e-9 && b.wf >= .9 - 1e-9 && b.wf <= 1.1 + 1e-9)); assert.ok(new Set(bs.map(b => b.hf)).size > 8);
  assert.deepEqual(P.build({ name: 'Zed', age: 30 }), P.build({ name: 'Zed', age: 30 }));
  assert.ok(P.build({ name: 'Zed', age: 80 }).hf < P.build({ name: 'Zed', age: 30 }).hf);
  const kid = P.build({ name: 'Zed', age: 9 }); assert.ok(Math.abs(kid.hf - 1) <= .04 + 1e-9);
});
test('figure metrics follow the height factor, so labels and bubbles can follow it', () => {
  const tall = P.figMetrics({ name: 'Wren', age: 25 }, .85), short = P.figMetrics({ name: 'Isolde', age: 30 }, .85), kid = P.figMetrics({ name: 'Zed', age: 8 }, .85);
  assert.ok(tall.top > short.top && kid.top < short.top); assert.ok(tall.headY < tall.top && tall.headY > tall.top * .8);
  const door = 25; assert.ok(Math.abs(P.figMetrics({ name: 'Mira', age: 34 }, .85).top / door - 1.2) < .15, 'an adult stands about 1.2 doors tall');
});
test('walking pace is slow enough to read as walking, slower when hungry, sick or old; strides follow body size', () => {
  const adult = { name: 'Zed', age: 30 };
  assert.ok(P.walkSpeed(adult) <= 2.5 && P.walkSpeed(adult) >= 1.5);
  assert.ok(P.walkSpeed({ ...adult, hungry: 3 }) < P.walkSpeed(adult) && P.walkSpeed({ ...adult, sick: true }) < P.walkSpeed(adult) && P.walkSpeed({ ...adult, age: 80 }) < P.walkSpeed(adult));
  assert.ok(P.strideLen({ name: 'Zed', age: 8 }) < P.strideLen(adult));
  assert.ok(P.walkSpeed(adult) / P.strideLen(adult) < 2, 'under two full step cycles a second');
});
test('only fright opens the eyes wide', () => {
  assert.ok(P.moodKind('terrified').wide && P.moodKind('startled').wide); assert.ok(!P.moodKind('content').wide && !P.moodKind('stern').wide);
});
test('jobs map to kinds of work', () => {
  assert.equal(P.jobKind('the baker'), 'baker'); assert.equal(P.jobKind('the tavern keeper'), 'tavern'); assert.equal(P.jobKind('the brewer'), 'tavern');
  assert.equal(P.jobKind('the stonemason'), 'mason'); assert.equal(P.jobKind('the woodcutter'), 'wood'); assert.equal(P.jobKind('the scribe'), 'scribe');
  assert.equal(P.jobKind('the herbalist and shrine-keeper'), 'shrine'); assert.equal(P.jobKind('the gardener'), 'garden'); assert.equal(P.jobKind('a child of the village'), 'none'); assert.equal(P.jobKind(undefined), 'none');
});
test('hand-made looks: Ansel, Odile and Garrick dress for who they are, and the founders keep their outfits', () => {
  const ansel = P.look({ name: 'Ansel', age: 44, sex: 'm', job: 'the banker', hair: '#c9a25a' }), odile = P.look({ name: 'Odile', age: 34, sex: 'f', job: 'the stonemason', hair: '#8a6a3a' });
  const garrick = P.look({ name: 'Garrick', age: 41, sex: 'm', job: 'the woodcutter', hair: '#5a2d1a' });
  assert.equal(ansel.accent, 'waistcoat'); assert.ok(ansel.glasses && ansel.ledger && ansel.hair === 'neat');
  assert.ok(odile.kerchief && odile.sleeves && odile.tool === 'mallet' && odile.accent === 'apron');
  assert.ok(garrick.cloak && garrick.satchel && !garrick.beard && !garrick.accent);
  const bram = P.look({ name: 'Bram', age: 47, sex: 'm', job: 'the tavern keeper', hair: '#2b1b10' }); assert.ok(bram.towel && bram.apron === '#3a2e28');
  assert.ok(P.look({ name: 'Wren', age: 25, sex: 'm', job: 'the fisher', hair: '#c4572e' }).boot);
  assert.ok(P.look({ name: 'Isolde', age: 33, sex: 'f', job: 'the librarian', hair: '#22203a' }).glasses);
  assert.ok(P.look({ name: 'Mira', age: 40, sex: 'f', job: 'the baker', hair: '#5a2d1a' }).flour);
});
test('newcomers dress for their work; nobody without a trade gets an apron; baldness is for the old', () => {
  const nw = (name, job, age = 35, sex = 'm') => P.look({ name, age, sex, job, hair: '#555' });
  assert.equal(nw('Newman', 'the baker').accent, 'apron'); assert.equal(nw('Newman', 'the woodcutter').tool, 'axe'); assert.ok(nw('Newman', 'the fisher').net);
  let bald = 0, apron = 0;
  for (let i = 0; i < 300; i++) {
    const idle = P.look({ name: 'Idle' + i, age: 30 + i % 24, sex: i % 2 ? 'm' : 'f', job: 'a young wanderer', hair: '#555' }); if (idle.hair === 'bald+beard') bald++; if (idle.accent === 'apron') apron++;
    const old = P.look({ name: 'Old' + i, age: 60 + i % 20, sex: 'm', job: 'a young wanderer', hair: '#ccc' }); if (old.hair === 'bald+beard') bald += 0;
  }
  assert.equal(bald, 0, 'nobody under 55 is bald'); assert.equal(apron, 0, 'no apron without a trade');
  assert.ok(Array.from({ length: 60 }, (_, i) => P.look({ name: 'Elder' + i, age: 70, sex: 'm', job: '', hair: '#ccc' }).hair).includes('bald+beard'));
  const kid = P.look({ name: 'Kidd', age: 9, sex: 'f', job: 'the baker', hair: '#555' }); assert.ok(!kid.accent || kid.accent !== 'apron');
  assert.ok(P.look({ name: 'Kidd', age: 30, sex: 'f', job: 'the baker', hair: '#555' }) !== P.look({ name: 'Kidd', age: 9, sex: 'f', job: 'the baker', hair: '#555' }), 'life stage and job are part of the cache key');
});
test('poses: sitting means sitting, waiting is standing', () => {
  assert.equal(P.poseOf({ activity: 'sitting on the bench, resting her feet' }), 'sit'); assert.equal(P.poseOf({ activity: 'napping in the sun' }), 'sit');
  assert.equal(P.poseOf({ activity: 'waiting by the well' }), 'stand'); assert.equal(P.poseOf({ activity: 'restless and pacing' }), 'stand');
  assert.equal(P.poseOf({ activity: 'hammering a barrel hoop' }), 'work'); assert.equal(P.poseOf({ activity: 'sipping ale from a mug' }), 'drink'); assert.equal(P.poseOf({ activity: 'eating bread slowly' }), 'eat');
});
test('sitters take the bench seats, the rest line up', () => {
  const mk = (n, activity) => ({ name: n, activity }), here = [mk('A', 'sitting'), mk('B', 'standing'), mk('C', 'resting'), mk('D', 'sitting'), mk('E', 'sitting'), mk('F', 'sitting')];
  const L = P.placeLayout(here, [20, 12], 1.4, P.SEATS.Square, P.poseOf);
  assert.ok(L.A.seat && L.C.seat && L.D.seat && L.E.seat); assert.ok(!L.B.seat && !L.F.seat, 'only four seats; the fifth sitter stands');
  assert.deepEqual([L.A.x, L.A.y], P.SEATS.Square[0]); assert.ok(L.B.y > 12);
  const none = P.placeLayout(here, [5, 5], 1.9, undefined, P.poseOf); assert.ok(Object.values(none).every(v => !v.seat), 'no benches, no seats (a stool is drawn instead)');
});
test('hair greys with age from about fifty', () => {
  assert.equal(P.hairColor({ age: 40, hair: '#2b1b10' }), '#2b1b10'); const mid = P.hairColor({ age: 62, hair: '#2b1b10' }), old = P.hairColor({ age: 80, hair: '#2b1b10' });
  assert.ok(P.lumaOf(mid) > P.lumaOf('#2b1b10') && P.lumaOf(old) > P.lumaOf(mid) && P.lumaOf(old) > .7);
});
test('affinity: partners, talkers and friends', () => {
  const A = { name: 'A', partner: 'B' }, B = { name: 'B', partner: 'A' }, C = { name: 'C', say_to: 'D', say_at: 1000, close: { D: 'acquaintance', E: 'friend' } }, D = { name: 'D' }, E = { name: 'E' };
  assert.equal(P.affinity(A, B, 0), 3); assert.equal(P.affinity(C, D, 1030), 2); assert.equal(P.affinity(C, D, 1500), 0, 'a conversation that ended is forgotten');
  assert.equal(P.affinity(C, E, 0), 1); assert.equal(P.affinity(D, A, 0), 0);
});
test('layout: friends and talkers stand closer, a crowd forms a loose arc facing in, nobody stands on a seated person', () => {
  const mk = n => ({ name: n, activity: 'standing' }), here = ['A', 'B', 'C', 'D', 'E'].map(mk), aff = (a, b) => (a.name + b.name === 'AB' || a.name + b.name === 'BA' ? 3 : 0);
  const L = P.placeLayout(here, [20, 12], 1.4, undefined, P.poseOf, aff), gap = (a, b) => Math.abs(L[a].x - L[b].x);
  assert.ok(gap('A', 'B') < gap('B', 'C') - .2, 'partners closer than strangers'); assert.equal(L.A.face, 1); assert.equal(L.B.face, -1);
  const xs = Object.values(L).map(v => v.x), mid = (Math.min(...xs) + Math.max(...xs)) / 2; assert.ok(Math.abs(mid - 20) < .01, 'centred on the place');
  const plain = P.placeLayout(here, [20, 12], 1.4, undefined, P.poseOf), ends = [plain.A, plain.E], midp = plain.C;
  assert.ok(ends.every(e => e.face !== 0) && midp.face === 0 && ends[0].face === 1 && ends[1].face === -1 && ends[0].y > midp.y - .01, 'arc: ends face in');
  const s = P.placeLayout([{ name: 'S', activity: 'sitting' }, mk('T'), mk('U')], [20, 12], 1.4, P.SEATS.Square, P.poseOf), seat = s.S;
  for (const n of ['T', 'U']) assert.ok(Math.abs(s[n].x - seat.x) >= 1 || s[n].y - seat.y >= .8 - 1e-9, 'clear of the sitter');
  assert.deepEqual(P.placeLayout([mk('Solo')], [5, 5], 1.9, undefined, P.poseOf).Solo, { x: 5, y: 6.9, seat: false, face: 0 });
});
test('tired moods yawn late in the day', () => { assert.ok(P.moodKind('weary').tired && P.moodKind('drained').tired); assert.ok(!P.moodKind('jovial').tired); });
test('arms are two bones: the elbow sits at the right distances and bends outwards and down', () => {
  const S = 1, d1 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const d of [-1, 1]) for (const hand of [[d * .8, 10], [-3, -4], [d * 4, 2], [0, 6]]) {
    const { elbow, wrist } = P.armPoints(d, S, 0, 0, hand); assert.ok(Math.abs(d1([0, 0], elbow) - P.ARM_UP) < 1e-6 && Math.abs(d1(elbow, wrist) - P.ARM_LO) < 1e-6);
  }
  const hang = P.armPoints(1, 1, 0, 0, [.8, 10]); assert.ok(hang.elbow[0] > .3 && hang.elbow[0] < 2, 'a slight bend outwards at the elbow');
  const mouth = P.armPoints(1, 1, 0, 0, [-4, -4]); assert.ok(mouth.elbow[1] > 0, 'hand to the mouth: the elbow drops below the shoulder');
  const far = P.armPoints(1, 1, 0, 0, [0, 30]); assert.ok(Math.abs(far.wrist[1] - (P.ARM_UP + P.ARM_LO)) < .02, 'out of reach is pulled in to full length');
});
test('heavy loads show on the back, by the good; light loads do not', () => {
  assert.equal(P.loadOf({ carry: 120, inv: { coins: 400, ale: 106, bread: 10 } }).kind, 'keg'); assert.equal(P.loadOf({ carry: 120, inv: { stone: 120 } }).kind, 'sack');
  assert.equal(P.loadOf({ carry: 120, inv: { herbs: 100 } }).kind, 'basket'); assert.equal(P.loadOf({ carry: 120, inv: { wood: 95 } }).kind, 'bundle');
  assert.equal(P.loadOf({ carry: 200, inv: { bread: 118, coins: 5000 } }), null, 'coins never weigh anything'); assert.equal(P.loadOf({ name: 'x' }), null);
});
test('grief is its own face and body', () => { assert.ok(P.moodKind('grieving').grief && P.moodKind('bereft').grief); assert.ok(!P.moodKind('weary').grief); });
test('mouth colour: lipstick red on light skin, a shade of the skin on dark skin', () => {
  const light = P.look({ name: 'Lightone', age: 30, sex: 'f', job: '', hair: '#555' }), dark = Array.from({ length: 40 }, (_, i) => P.look({ name: 'Tone' + i, age: 30, sex: 'f', job: '', hair: '#555' })).find(l => l.skin === '#9a6a45');
  const red = c => P.rgbOf(c)[0] - P.rgbOf(c)[1]; assert.ok(dark, 'a dark skin turns up'); assert.ok(P.rgbOf(dark.mouthC)[0] < 100, 'dark skin: a dark, quiet mouth'); assert.ok(red(dark.mouthC) < 80);
  const fair = Array.from({ length: 40 }, (_, i) => P.look({ name: 'Fair' + i, age: 30, sex: 'f', job: '', hair: '#555' })).find(l => l.skin === '#f0c9a0'); assert.ok(fair && P.rgbOf(fair.mouthC)[0] > 110);
});
