// ================================================================ side panel
const SYS = {
  whisper: e => e.speak ? ['❝', 'you', `You spoke to ${e.who}`, e.text] : ['✉', 'you', `You planted a thought in ${e.who}`, e.text],
  voice: e => ['✶', 'you', 'Your voice boomed from the sky', e.text],
  oracle_ask: e => ['?', 'or', `${e.who} asks the Oracle`, e.text],
  oracle: e => ['◈', 'or', `The Oracle answers ${e.who}`, e.text],
  oracle_fail: e => ['!', 'or', `${e.who} called on the Oracle`, e.text, true],
  steward: e => ['☾', 'or', `The Oracle sends ${e.who} a dream`, e.text + (e.plan && e.plan.length ? ` (${e.plan.length}-step plan)` : '')],
  steward_fail: e => ['!', 'or', `${e.who}'s dream faded`, e.text, true],
  news: e => ['✎', 'you', 'News', e.text, true],
  prayer: e => ['✧', 'pr', `${e.who} prays at the Old Oak Shrine`, e.text],
  wish: e => ['✦', 'pr', `A wish is granted to ${e.who}`, e.text + (e.gifts && e.gifts.length ? ` (${e.gifts.join(', ')})` : ''), true],
  wish_none: e => ['✧', 'pr', 'The heavens stay silent', e.text, true],
  sick: e => ['✚', 'lf', `${e.who} falls ill`, e.text, true],
  fair: e => ['🎪', 'pr', 'The midsummer fair', e.text, true],
  debt: e => ['⚖', 'you', `The city merchant and ${e.who}`, e.text, true],
  family: e => ['♥', 'lf', 'Love and family', e.text, true],
  newcomer: e => ['⛺', 'lf', e.text && /arrived/.test(e.text) ? 'A stranger at the Square' : 'The village decides', e.text, true],
  vote: e => ['✋', 'you', `${e.who} votes`, e.text],
  will: e => ['✒', 'lf', `${e.who}'s last wishes`, e.text, true],
  stranger: e => ['⛺', 'lf', `${e.who} answers ${e.to}`, (e.q ? `Asked “${e.q}”: ` : '') + '“' + e.text + '”'],
  project: e => ['⌂', 'pr', 'The village builds together', e.text, true],
  arc: e => ['❦', 'or', 'The village story', e.text, true],
  birth: e => ['✿', 'lf', `${e.who} is born`, e.text, true],
  death: e => ['✝', 'lf', `${e.who} has died`, e.text, true],
  disaster: e => ['⚠', 'dz', cap(e.name || 'disaster') + ' strikes Emberwick', e.text, true],
};
function avatar(name, cls = 'av') {
  const b = el('button', cls, name.charAt(0)); b.style.background = colorOf(name); b.title = 'Show ' + name + ' on the map';
  b.onclick = () => select(name, true); return b;
}
function evMatch(e) {
  if (filter === 'talk') return e.kind === 'turn' && e.say;
  if (filter === 'work') return e.kind === 'turn' && e.did;
  if (filter === 'oracle') return e.kind !== 'turn';
  if (filter === 'who') return e.who === selected || e.to === selected;
  return true;
}
function evEl(e) {
  const d = el('div', 'ev'); d.dataset.id = e.id;
  if (e.kind === 'turn') {
    const body = el('div'), hd = el('div', 'hd'), l = el('div'), who = el('button', 'who', e.who);
    who.style.color = colorOf(e.who); who.onclick = () => select(e.who, true);
    l.append(who, ' ', el('span', 'act', e.activity)); if (e.deep) l.append(el('span', 'deep', '✦ deep thought'));
    hd.append(l, el('span', 'meta', `${hhmm(e.minute)} · ${e.place}`)); body.append(hd);
    if (e.say) { const s = el('div', 'say'); if (e.to) s.append(el('span', 'to', 'to ' + e.to)); s.append('“' + e.say + '”'); body.append(s); }
    if (e.did) body.append(el('div', 'did', '⚒ ' + e.who + ' ' + e.did));
    if (e.thought) body.append(el('div', 'th', e.thought));
    if (e.to_place) body.append(el('div', 'walk', '→ heads to the ' + e.to_place));
    d.append(avatar(e.who), body);
  } else {
    const [icon, kind, lead, text, plain] = (SYS[e.kind] || (x => ['·', 'you', cap(x.kind || 'Event'), x.text, true]))(e);
    d.classList.add('sys', kind);
    const body = el('div'), hd = el('div', 'hd'); hd.append(el('span', 'lbl', lead), el('span', 'meta', hhmm(e.minute)));
    body.append(hd, el('div', 'body', plain ? text : '“' + text + '”')); d.append(el('div', 'av', icon), body);
  }
  return d;
}
let feedKey = '', seenTop = 0;
function renderChips() {
  const box = $('chips'), opts = [['all', 'All'], ['talk', 'Talk'], ['work', 'Work & trade'], ['oracle', 'Prayers, Oracle & you']];
  if (selected) opts.push(['who', 'Only ' + selected]); else if (filter === 'who') filter = 'all';
  box.replaceChildren(...opts.map(([k, txt]) => { const b = el('button', 'chip' + (filter === k ? ' on' : ''), txt); b.setAttribute('aria-pressed', filter === k); b.onclick = () => { filter = k; renderFeed(true); $('feed').scrollTop = 0; }; return b; }));
}
function renderFeed(force) {
  const last = st.events.length ? st.events[st.events.length - 1].id : 0, key = `${last}|${filter}|${selected}`;
  if (key === feedKey && !force) return;
  const box = $('feed'), list = $('feedlist'), reading = box.scrollTop > 60, before = list.scrollHeight, onlyNew = key.split('|').slice(1).join() === feedKey.split('|').slice(1).join();
  feedKey = key; renderChips();
  const evs = st.events.filter(evMatch).reverse(), out = []; let day = null;
  for (const e of evs) { if (e.day !== day) { day = e.day; out.push(el('div', 'dayrule', 'Day ' + day)); } out.push(evEl(e)); }
  if (!evs.length) out.push(el('div', 'empty', filter === 'who' ? `Nothing from ${selected} in the recent log.` : 'Nothing like that yet.'));
  list.replaceChildren(...out);
  if (reading && onlyNew) { box.scrollTop += list.scrollHeight - before; if (last > seenTop) $('newpill').classList.add('on'); }
  else seenTop = last;
}
$('feed').addEventListener('scroll', () => { if ($('feed').scrollTop < 40) { $('newpill').classList.remove('on'); seenTop = st ? (st.events.at(-1) || {}).id || 0 : 0; } });
$('newpill').onclick = () => $('feed').scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });

let peopleKey = ''; const openMore = new Set();
function renderPeople(force) {
  const key = JSON.stringify(st.agents) + selected; if (key === peopleKey && !force) return; peopleKey = key;
  const box = $('people'), keep = box.scrollTop; box.replaceChildren();
  for (const a of st.agents) {
    const c = el('div', 'card' + (selected === a.name ? ' sel' : '')); c.style.borderLeftColor = a.color; c.id = 'card-' + a.name;
    const top = el('div', 'top'), id = el('div'); id.append(el('h3', '', a.name), el('div', 'sub', `${a.sex === 'f' ? '♀' : '♂'} ${a.age}, ${a.job}${a.expecting ? ' · expecting' : ''}${a.ribbons && a.ribbons.length ? ' · 🎀 ' + a.ribbons.length : ''}`));
    if (a.ribbons && a.ribbons.length) id.lastChild.title = 'Fair ribbons: ' + a.ribbons.join('; ');
    top.append(avatar(a.name), id, el('span', 'mood', a.mood)); top.lastChild.title = 'Mood: ' + a.mood; c.append(top);
    c.append(el('p', '', `At the ${a.place}, ${a.activity}.`));
    const bits = [a.newcomer ? 'came to Emberwick as a stranger' : '', a.partner ? `sweetheart of ${a.partner}` : '', a.bank || a.loan ? `bank: ${a.bank} saved${a.loan ? `, owes ${a.loan}` : ''}` : ''].filter(Boolean);
    if (bits.length) c.append(el('p', 'fam', cap(bits.join(' · ')) + '.'));
    if (a.family) c.append(el('p', 'fam', cap(a.family.replace(/\byour\b/g, 'their').replace(/\byou are\b/g, 'is').replace(/\byou have\b/g, 'has')) + '.'));
    const inv = el('div', 'inv'), items = Object.entries(a.inv).filter(([, q]) => q);
    items.forEach(([k, q]) => { const o = k !== 'coins' && a.carry && q > a.carry, s = el('span', o ? 'over' : '', `${q} ${k}`); if (o) s.title = `Over the carrying limit of ${a.carry}; a quarter of the surplus is lost each night`; inv.append(s); }); a.owns.forEach(o => inv.append(el('span', 'own', '⌂ ' + o)));
    if (!items.length && !a.owns.length) inv.append(el('span', '', 'empty-handed'));
    c.append(inv);
    if (a.thought) c.append(el('p', 'q', '“' + a.thought + '”'));
    const extra = [['Traits', a.traits], ['Closeness', Object.entries(a.close || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')], ['Feelings', Object.entries(a.feelings).map(([k, v]) => `${k}: ${v}`).join(' · ')], ['Life story', a.story], ['Never forgotten', (a.legacy || []).slice(-5).join(' · ')], ['Growing', a.growth], ['Last night', a.reflection]].filter(([, v]) => v);
    if (extra.length || a.plan.length) {
      const det = el('details'); det.open = openMore.has(a.name); det.ontoggle = () => det.open ? openMore.add(a.name) : openMore.delete(a.name);
      det.append(el('summary', '', a.plan.length ? `More · following the Oracle's ${a.plan.length}-step counsel` : 'More about ' + a.name));
      for (const [k, v] of extra) { const p = el('div', 'kv'); p.append(el('b', '', k + ' — '), v); det.append(p); }
      if (a.plan.length) { const p = el('div', 'kv'); p.append(el('b', '', "The Oracle's counsel")); const ol = el('ol'); a.plan.forEach(x => ol.append(el('li', '', x))); det.append(p, ol); }
      c.append(det);
    }
    const acts = el('div', 'acts'), show = el('button', 'btn', 'Show on map'), wh = el('button', 'btn', 'Whisper…');
    show.onclick = () => select(a.name, true); wh.onclick = () => { select(a.name, false); $('msg').focus(); };
    acts.append(show, wh); c.append(acts); box.append(c);
  }
  box.scrollTop = keep;
}
let builtKey = '';
const WCOL = { coins: '#e8bd5f', goods: '#7bb0d8', buildings: '#9fc98a' };
let popKey = '', popSort = { k: 'worth', d: -1 };
function renderPop() {
  const key = JSON.stringify([st.agents.map(a => [a.name, a.age, a.worth, a.expecting, a.hungry, a.sick, a.job, (a.ribbons || []).length]), st.dead, popSort]);
  if (key === popKey) return; popKey = key;
  const box = $('pop'), keep = box.scrollTop; box.replaceChildren();
  const A = st.agents, n = A.length, kids = A.filter(a => a.age < 18).length, dead = st.dead || [];
  $('npop').hidden = !n; $('npop').textContent = n;
  const avg = n ? Math.round(A.reduce((s, a) => s + a.age, 0) / n) : 0, total = A.reduce((s, a) => s + a.worth.total, 0);
  const tiles = el('div', 'tiles');
  for (const [v, l] of [[n, 'living'], [`${A.filter(a => a.sex === 'f').length} / ${A.filter(a => a.sex === 'm').length}`, 'women / men'],
                        [kids, kids === 1 ? 'child' : 'children'], [A.filter(a => a.expecting).length, 'expecting'],
                        [avg, 'average age'], [total.toLocaleString(), 'village worth']]) {
    const t = el('div', 'tile'); t.append(el('b', '', String(v)), el('span', '', l)); tiles.append(t);
  }
  box.append(tiles);
  const val = { name: a => a.name, age: a => a.age, worth: a => a.worth.total };
  const rows = A.slice().sort((x, y) => { const a = val[popSort.k](x), b = val[popSort.k](y); return (a < b ? -1 : a > b ? 1 : 0) * popSort.d; });
  const max = Math.max(1, ...A.map(a => a.worth.total));
  const tb = el('table', 'ptab'), head = el('tr');
  for (const [k, l, num] of [['name', 'Villager'], ['age', 'Age', 1], ['worth', 'Net worth', 1]]) {
    const th = el('th', num ? 'num' : '', l + (popSort.k === k ? (popSort.d < 0 ? ' ↓' : ' ↑') : ''));
    if (popSort.k === k) th.setAttribute('aria-sort', popSort.d < 0 ? 'descending' : 'ascending');
    th.onclick = () => { popSort = popSort.k === k ? { k, d: -popSort.d } : { k, d: k === 'name' ? 1 : -1 }; renderPop(); };
    head.append(th);
  }
  const th = el('thead'); th.append(head); tb.append(th);
  const body = el('tbody');
  for (const a of rows) {
    const tr = el('tr', 'row'), c1 = el('td'), who = el('div', 'who'), txt = el('div'), nm = el('div');
    nm.append(el('span', 'nm', a.name), document.createTextNode(' ' + (a.sex === 'f' ? '♀' : '♂')));
    if (a.expecting) nm.append(el('span', 'tag', 'expecting'));
    if (a.hungry >= 2) nm.append(el('span', 'tag warn', `hungry ${a.hungry} nights`));
    if (a.sick) nm.append(el('span', 'tag warn', 'sick'));
    if (a.ribbons && a.ribbons.length) { const r = el('span', 'tag rib', '🎀 ' + a.ribbons.length); r.title = a.ribbons.join('; '); nm.append(r); }
    txt.append(nm, el('div', 'jb', a.job + (a.parents && a.parents.length ? ` · child of ${a.parents.join(' & ')}` : '')));
    who.append(avatar(a.name), txt); c1.append(who);
    const c3 = el('td', 'num'), w = a.worth, bar = el('div', 'wbar');
    c3.append(el('div', '', w.total.toLocaleString()));
    bar.style.width = Math.max(8, Math.round(100 * w.total / max)) + '%'; bar.style.marginLeft = 'auto';
    for (const k of ['coins', 'goods', 'buildings']) { const i = el('i'); i.style.width = (w.total ? 100 * w[k] / w.total : 0) + '%'; i.style.background = WCOL[k]; bar.append(i); }
    bar.title = `${w.coins} coins · ${w.goods} in goods · ${w.buildings} in buildings`; c3.append(bar); c3.title = bar.title;
    tr.append(c1, el('td', 'num', String(a.age)), c3);
    tr.onclick = () => select(a.name, true);
    body.append(tr);
  }
  tb.append(body); box.append(tb);
  const key2 = el('div', 'wkey');
  for (const k of ['coins', 'goods', 'buildings']) { const s = el('span'), i = el('i'); i.style.background = WCOL[k]; s.append(i, document.createTextNode(k)); key2.append(s); }
  box.append(key2, el('div', 'wkey', 'Net worth is in coins: goods at the merchant\'s prices, buildings at their materials plus 1 coin per turn of work.'));
  if (dead.length) {
    const g = el('div', 'gone'); g.append(el('h4', '', 'Remembered'));
    for (const d of dead.slice().reverse()) g.append(el('div', '', `${d.name} ${d.sex === 'f' ? '♀' : '♂'}, ${d.job}, died on day ${d.day} aged ${d.age} (${d.cause})`));
    box.append(g);
  }
  box.scrollTop = keep;
}
