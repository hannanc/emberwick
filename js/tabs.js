// ================================================================ panels: built, goals, Oracle, prayers, chronicle, header
function renderBuilt() {
  const key = JSON.stringify(st.structures); if (key === builtKey) return; builtKey = key;
  const box = $('built'); box.replaceChildren();
  const going = st.structures.filter(s => !s.done).reverse(), done = st.structures.filter(s => s.done).reverse();
  $('nbuilt').hidden = !st.structures.length; $('nbuilt').textContent = st.structures.length;
  if (!st.structures.length) { box.append(el('div', 'empty', 'Nothing has been built yet. Villagers gather wood at the Woods and stone at the Quarry, trade for what they lack, and build houses, stalls, boats, beehives, a mill, statues, sheds and watchtowers.')); return; }
  const card = s => {
    const c = el('div', 'card'); c.style.borderLeftColor = colorOf(s.owner);
    c.append(el('h3', '', projName(s)), el('div', 'sub', `at the ${s.site} · ${s.done ? 'finished' : s.repair ? `damaged by the ${s.repair}` : 'started'} on day ${s.day}` + (s.helpers.length ? ` · ${s.owner === 'Village' ? 'built by' : 'helped by'} ${s.helpers.join(', ')}` : '')));
    if (s.done) c.append(el('p', '', cap(s.perk) + '.'));
    else { c.append(el('p', '', `Still needs ${s.needs}.`)); const b = el('div', 'bar'), i = el('i'); i.style.width = Math.round(s.progress * 100) + '%'; b.append(i); c.append(b); b.title = Math.round(s.progress * 100) + '% done'; }
    c.onclick = () => { cam.follow = false; cam.tx = s.x * T; cam.ty = s.y * T - 30; cam.tz = Math.max(cam.tz, defaultZ() * 1.6); clampT(); userMoved = true; syncFocus(); };
    c.style.cursor = 'pointer'; c.title = 'Show on the map'; return c;
  };
  if (going.length) { box.append(el('div', 'sec', `Being built · ${going.length}`)); going.forEach(s => box.append(card(s))); }
  if (done.length) { box.append(el('div', 'sec', `Finished · ${done.length}`)); done.forEach(s => box.append(card(s))); }
}
let goalsKey = '';
function renderGoals() {
  const G = st.goals; if (!G) return;
  const key = JSON.stringify(G); if (key === goalsKey) return; goalsKey = key;
  $('ngoal').hidden = !G.stranger;
  const box = $('goals'); box.replaceChildren();
  if (G.stranger) {
    const S2 = G.stranger, c = el('div', 'card'); c.style.borderLeftColor = S2.color;
    const v = Object.entries(S2.votes), yes = v.filter(([, x]) => x === 'welcome').map(([n]) => n), no = v.filter(([, x]) => x === 'turn_away').map(([n]) => n);
    c.append(el('h3', '', `${S2.name}, ${S2.job}, asks to join`), el('div', 'sub', `${S2.sex === 'f' ? '♀' : '♂'} ${S2.age} · waiting at the Square · brings ${Object.entries(S2.brings).map(([i, q]) => `${q} ${i}`).join(', ')}`),
      el('p', 'q', '“' + S2.pitch + '”'));
    if (S2.traits) { const k = el('div', 'kv'); k.append(el('b', '', 'Comes across as — '), S2.traits); c.append(k); }
    const met = Object.keys(S2.met || {}); c.append(el('p', '', `Met them: ${met.join(', ') || 'nobody yet'}. Welcome: ${yes.join(', ') || 'nobody yet'} · Turn away: ${no.join(', ') || 'nobody yet'}. The village decides tonight.`));
    const whys = Object.entries(S2.reasons || {}).filter(([, w]) => w);
    if (whys.length) { const k = el('div', 'kv'); k.append(el('b', '', 'Why they voted')); c.append(k); for (const [n, w] of whys) c.append(el('p', '', `${n} (${S2.votes[n] === 'welcome' ? 'welcome' : 'turn away'}): ${w}`)); }
    if ((S2.qa || []).length) { const k = el('div', 'kv'); k.append(el('b', '', 'Questioned')); c.append(k); for (const q of S2.qa) c.append(el('p', '', `${q.who}: “${q.q}” — ${S2.name}: “${q.a}”`)); }
    if ((S2.talk || []).length) { const k = el('div', 'kv'); k.append(el('b', '', 'What the village is saying')); c.append(k); for (const t of S2.talk.slice(-6)) c.append(el('p', 'q', `${t.who}: “${t.text}”`)); }
    box.append(el('div', 'sec', 'At the gate'), c);
  }
  if (!G.stranger) {                                     // invite one now, to watch the village weigh them up
    const c = el('div', 'card'); c.style.borderLeftColor = '#8a6a44';
    const note = el('div', 'sub', 'Someone with a trade the village lacks walks into the Square; the villagers meet them, talk it over and vote.');
    const invite = (label, kind) => { const b = el('button', 'btn', label); b.onclick = async () => { b.disabled = true; b.textContent = 'Someone is coming up the road…';
      try { const r = await (await fetch('/api/stranger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) })).json(); note.textContent = r.ok ? 'They have arrived at the Square.' : r.note; } catch (e) { note.textContent = 'That did not go through.'; }
      b.disabled = false; b.textContent = label; }; return b; };
    const acts = el('div', 'acts'); acts.append(invite('Invite a stranger', 'any'), invite('Invite a troublemaker', 'trouble'));
    c.append(el('h3', '', 'Nobody at the gate'), note, acts); box.append(el('div', 'sec', 'At the gate'), c);
  }
  box.append(el('div', 'sec', 'The village\'s goals'));
  const gc = el('div', 'card'); gc.style.borderLeftColor = '#a98cf0';
  gc.append(el('h3', '', 'What the Oracle is working towards'), el('div', 'sub', G.next ? 'Next: ' + G.next.replace(/^\d+\.\s*/, '') : 'Every goal is met'));
  const ol = el('ol', 'goals');
  for (const line of G.agenda) { const m = /^\d+\. \[(DONE|TO DO)\] (.*)$/.exec(line) || [0, 'TO DO', line]; const li = el('li', m[1] === 'DONE' ? 'done' : '', (m[1] === 'DONE' ? '✓ ' : '○ ') + m[2]); ol.append(li); }
  gc.append(ol); box.append(gc);
  box.append(el('div', 'sec', 'The story'));
  const sc = el('div', 'card'); sc.style.borderLeftColor = '#7fe0c8';
  if (G.arc) sc.append(el('h3', '', G.arc.title), el('div', 'sub', `Part ${G.arc.stage} of 4`), el('p', '', st.news));
  else sc.append(el('h3', '', 'A new story begins tonight'), el('div', 'sub', 'The chronicler is choosing the next thread'));
  if (G.arcs.length) { const pl = el('div', 'kv'); pl.append(el('b', '', 'Told so far — '), G.arcs.map(a => `${a.title} (day ${a.day}, ${a.reward})`).join(' · ')); sc.append(pl); }
  box.append(sc);
  box.append(el('div', 'sec', 'Built together'));
  for (const P of G.projects) {
    const c = el('div', 'card'); c.style.borderLeftColor = P.status === 'done' ? '#9fc98a' : P.status === 'building' ? '#e8bd5f' : '#555';
    c.append(el('h3', '', cap(P.name)), el('div', 'sub', `at the ${P.site} · ${P.status === 'done' ? 'finished' : P.status === 'building' ? 'being built now' : 'planned'}` +
      (P.key === 'bank' && P.status === 'done' ? (G.banker ? ` · run by ${G.banker}` : ' · waiting for a banker') : '')), el('p', '', cap(P.perk) + '.'));
    if (P.status === 'building') { c.append(el('p', '', `Still needs ${P.needs}.`)); const b = el('div', 'bar'), i = el('i'); i.style.width = Math.round(P.progress * 100) + '%'; b.append(i); c.append(b); }
    if (P.by.length) c.append(el('div', 'sub', 'Given by ' + P.by.map(([n, q]) => `${n} (${q})`).join(', ')));
    box.append(c);
  }
}
let oracleKey = null;
function renderOracle() {
  const O = st.oracle; $('nor').hidden = O.state !== 'ready';
  const key = O.state + O.wait + O.log.length + O.model; if (key === oracleKey) return; oracleKey = key;
  const box = $('oracle'); box.replaceChildren();
  const head = el('div', 'card'); head.style.borderLeftColor = '#a98cf0';
  const top = el('div', 'top'), id = el('div'); id.append(el('h3', '', 'The Oracle'), el('div', 'sub', O.state === 'asleep' ? 'No backend available' : 'Last answered by ' + (O.model || '—')));
  top.append(id, el('span', 'pill ' + O.state, O.state === 'ready' ? 'Awake' : O.state === 'resting' ? `Resting · ${O.wait} min` : 'Asleep')); head.append(top);
  head.append(el('p', '', O.state === 'ready' ? 'The first villager to walk to the standing stones and ask will be answered. One petition an hour.'
    : O.state === 'resting' ? `It will answer again in about ${O.wait} minute${O.wait === 1 ? '' : 's'}.`
    : 'It needs an Anthropic or xAI API key, or the local colibri server running, before it can speak (see the README).'));
  box.append(head);
  if (O.log.length) box.append(el('div', 'sec', 'Petitions'));
  for (const c of O.log) {
    const d = el('div', 'card'); d.style.borderLeftColor = colorOf(c.who);
    const top = el('div', 'top'), id = el('div'); id.append(el('h3', '', `${c.who} asked`), el('div', 'sub', `Day ${c.day} · ${hhmm(c.minute)}`)); top.append(avatar(c.who), id); d.append(top);
    d.append(el('p', 'q', '“' + c.question + '”'), el('p', 'sp', '“' + c.speech + '”'));
    c.answer.split(/\n+/).forEach(x => d.append(el('p', '', x)));
    if (c.plan.length) { const ol = el('ol'); c.plan.forEach(x => ol.append(el('li', '', x))); d.append(ol); }
    box.append(d);
  }
}
let prayKey = '';
function renderPrayers() {
  const P = st.prayers || [], Wi = st.wishes || [];
  $('npray').hidden = !P.length; $('npray').textContent = P.length;
  const key = JSON.stringify([P, Wi.map(w => w.at)]); if (key === prayKey) return; prayKey = key;
  const box = $('prayers'); box.replaceChildren();
  const head = el('div', 'card'); head.style.borderLeftColor = '#8fe3c8';
  head.append(el('h3', '', 'The Old Oak Shrine'), el('p', '', 'Each villager may pray once a day. At nightfall the heavens grant one wish to one villager, and only if it is reasonable. A granted wish is capped at 5 goods and 10 coins, and/or the missing materials for one building under way.'));
  box.append(head);
  box.append(el('div', 'sec', st.phase === 'night' ? `Tonight's prayers · ${P.length}` : `Prayers today · ${P.length}`));
  if (!P.length) box.append(el('div', 'empty', 'Nobody has prayed yet today.'));
  for (const p of P.slice().reverse()) {
    const c = el('div', 'card'); c.style.borderLeftColor = colorOf(p.who);
    const top = el('div', 'top'), id = el('div'); id.append(el('h3', '', p.who), el('div', 'sub', `Day ${p.day} · ${hhmm(p.minute)}`)); top.append(avatar(p.who), id);
    c.append(top, el('p', 'q', '“' + p.wish + '”')); box.append(c);
  }
  if (Wi.length) box.append(el('div', 'sec', 'Wishes granted'));
  for (const w of Wi) {
    const c = el('div', 'card'); c.style.borderLeftColor = colorOf(w.who);
    const top = el('div', 'top'), id = el('div'); id.append(el('h3', '', `${w.who}'s wish`), el('div', 'sub', `Night of day ${w.day}`)); top.append(avatar(w.who), id);
    c.append(top, el('p', 'q', '“' + w.wish + '”'), el('p', 'bl', w.blessing));
    if (w.gifts.length) { const g = el('div', 'inv gift'); w.gifts.forEach(x => g.append(el('span', '', x))); c.append(g); }
    if (w.reason) c.append(el('p', 'why', w.reason));
    box.append(c);
  }
}
let chronKey = '';
function renderChron() {
  const key = st.chronicle.map(c => c.day).join(); if (key === chronKey) return; chronKey = key;
  const box = $('chron'); box.replaceChildren();
  if (!st.chronicle.length) box.append(el('div', 'empty', 'The first chronicle is written when night falls on day 1.'));
  for (const c of st.chronicle) { const d = el('article', 'chr'); d.append(el('h3', '', `Day ${c.day} — ${c.title}`), el('div', 'w', cap(c.weather))); c.body.split(/\n+/).forEach(p => d.append(el('p', '', p))); box.append(d); }
}
function renderHeader() {
  const c = $('clock'); c.firstChild.textContent = weatherIcon(st.weather, st.minute);
  const span = c.lastChild, fd = st.fair && st.fair.day ? st.fair.day - st.day : null;
  span.replaceChildren(el('b', '', `Day ${st.day}`), ` · ${hhmm(st.minute)} · ${cap(st.weather)}`);
  if (fd === 0) span.append(' · ', el('b', 'fairnow', '🎪 Fair today'));
  else if (fd > 0 && fd <= 7) span.append(` · 🎪 Fair in ${fd} day${fd > 1 ? 's' : ''}`);
  const s = $('status'); s.className = st.status === 'running' ? '' : 'off';
  s.lastChild.textContent = st.status === 'running' ? 'Live' : cap(st.status);
  s.title = `Villagers: ${st.models.actor} · Narrator: ${st.models.narrator}`;
  const n = $('news'); n.hidden = !st.news; if (n.textContent !== st.news) n.textContent = st.news;
  const now = Date.now() / 1000 + skew, v = st.voice, wi = (st.wishes || [])[0], b = $('banner');
  const voiceOn = v && now - v.at < 45, wishOn = !voiceOn && wi && now - wi.at < 90;
  const k = voiceOn ? 'v' + v.at : wishOn ? 'w' + wi.at : '';
  if (k && b.dataset.k !== k) {
    b.dataset.k = k;
    if (voiceOn) b.replaceChildren(el('small', '', 'A voice from the sky'), '“' + v.text + '”');
    else b.replaceChildren(el('small', '', `✦ A wish is granted to ${wi.who}`), wi.blessing);
  }
  b.classList.toggle('on', !!k);
}
$('news').onclick = () => $('news').classList.toggle('open');
