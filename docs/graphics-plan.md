# Plan: better graphics for the village map

Status: ready to execute. Written for an agent (e.g. Claude Sonnet) working in
this repo. Do the phases in order; each phase ends in one commit.

## Ground rules (read first, they apply to every task)

- **Everything stays in `index.html`.** One file, plain Canvas 2D, no libraries,
  no images, no build step, no new files in the repo (the preview script below
  lives in your scratch directory). Do not change `emberwick.py` unless a task
  explicitly says so (none currently does).
- **The live server reads `index.html` from disk on every page load.** Every
  save is instantly visible to anyone watching on port 8377. Work on a copy
  (see *Workflow*), and only copy it over `index.html` when a phase passes its
  checks.
- **Respect `REDUCE`** (`prefers-reduced-motion`): every new animation must be
  frozen or heavily damped when `REDUCE` is true, like the existing rain and
  leaves code does.
- **Performance budget:** the map must stay smooth on a modest laptop. A new
  effect may cost at most ~1 ms per frame at the default zoom. Prefer drawing
  static things once into the pre-rendered `scenery` canvas (`buildScenery()`)
  over drawing them every frame in `frame()`.
- **Keep the house style:** compact functions, short trailing `// comments`
  aligned like the existing ones, world units in tiles (`T = 32` px per tile,
  map 58 × 24 tiles), `rng(seed)` for deterministic randomness (never
  `Math.random()` in scenery, or it changes on every reload).
- **Coordinate spaces.** World drawing happens inside `frame()` while the
  world transform is set. Text labels and speech bubbles are screen-space and
  are drawn in `drawOverlay()` via `label()`/`toScreen()`. Never call `label()`
  while the world transform is active.
- **Don't break what exists:** selecting/hovering villagers, Follow, zoom
  buttons, keyboard controls, labels giving way to each other (`occ`), the
  night "z z z", candles, the Oracle flame, graves, damaged/unfinished
  scaffolding with red/gold progress bars, children drawn smaller
  (`a.age < 6` / `< 18` in `person()`).

## Map of the code you will touch (`index.html`)

| Area | Where | Notes |
|---|---|---|
| Constants | `// ===== setup` | `T`, `W`, `H`, `WW`, `WH`, `M` (margin), `SS` (scenery supersample), `REDUCE`, `STAND`, `VIA` |
| Static scenery | `buildScenery()` | ground noise, lake, paths, trees (`tree()`, `pine()`), buildings via `house()`, Woods, Oracle stones, Quarry, Garden, Meadow, Cemetery ground, well, lamps. Rendered once into an offscreen canvas. `windows[]` collects light positions |
| Light model | `SKY`, `sky(minute, weather)` | returns `{c: [r,g,b] multiply tint, light: 0..1 night-ness}` |
| Villagers | `person(a, p, t)` | `a` = agent from `/api/state`, `p` = `pos[name]` `{x, y, walking, route}` |
| Buildings | `drawStruct(s, t, wins)` | per `s.type`: house, shed, stall, boat, tower, beehive, mill, statue, farm; unfinished/damaged = scaffolding |
| Frame | `frame(t)` | walking, camera, scenery blit, cloud shadows, water shimmer, rain rings, smoke, depth-sorted structures + people, graves, candles, Oracle flame, tint, lights, rain, leaves, storm flash, `drawOverlay()` |
| Overlay | `drawOverlay(t, asleep, order)` | bubbles, labels, place names |
| Voices | `hear` object | `hear.now` is the line currently being spoken (`{who, text, e}`), or null |

Agent fields you can use (from `/api/state` → `st.agents[]`): `name, sex, age,
job, color, hair, place, activity, mood, say, say_to, say_at, expecting, sick,
hungry, partner, parents`. Also `st.minute` (0–1439), `st.weather`,
`st.phase` (`day`/`night`), `st.structures[]` (`type, owner, x, y, done,
repair, progress`), `st.dead[]`, `st.events[]` (`kind`: turn, news, disaster,
birth, death, sick, family, …).

## Workflow (set this up once, before Phase 0)

1. **Preview server** that serves your working copy and proxies the live API
   read-only. Save as `$SCRATCH/preview.py` (your scratch directory, not the
   repo):

   ```python
   import sys, urllib.request
   from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
   PAGE, PORT = sys.argv[1], int(sys.argv[2])
   class H(BaseHTTPRequestHandler):
       def log_message(self, *a): pass
       def do_GET(self):
           if self.path.split("?")[0] == "/":
               body, ctype = open(PAGE, "rb").read(), "text/html; charset=utf-8"
           else:
               try:
                   with urllib.request.urlopen("http://127.0.0.1:8377" + self.path, timeout=60) as r:
                       body, ctype = r.read(), r.headers.get("Content-Type", "application/octet-stream")
               except Exception:
                   self.send_response(502); self.end_headers(); return
           self.send_response(200); self.send_header("Content-Type", ctype)
           self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
       def do_POST(self):
           self.send_response(403); self.end_headers()        # never whisper to the live village from a preview
   ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
   ```

   Run: `cp index.html $SCRATCH/work.html` then
   `nohup python3 $SCRATCH/preview.py $SCRATCH/work.html 8390 > $SCRATCH/preview.log 2>&1 &`.
   Edit `$SCRATCH/work.html`; when a phase is done, `cp $SCRATCH/work.html index.html`.

2. **Screenshots** with headless Chromium (installed as a snap):
   - Snap Chromium **cannot write to /tmp**. Make a **new, uniquely named**
     directory such as `~/snap/chromium/common/gfx-shots-<phase>`, write there,
     then `mv` the PNG into your scratch dir. Never delete or reuse other
     directories under `~/snap/chromium/common/` (they belong to other work).
   - Run Chromium through `bash -c '…'` (the login shell is zsh, which does not
     word-split variables the way loops in these examples expect).
   - Command:
     `chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1500,900 --virtual-time-budget=8000 --screenshot=<dir>/<name>.png "http://127.0.0.1:8390/?<debug params>"`
   - Look at every screenshot with the Read tool. Judge it honestly; compare to
     the "before" shot of the same view.
   - JS errors: add `--enable-logging=stderr --v=0` and grep stderr for
     `Uncaught`.

3. **Syntax check** after every edit:
   `python3 -c "import re,sys; s=open(sys.argv[1]).read(); open(sys.argv[2],'w').write('\n'.join(re.findall(r'<script>(.*?)</script>', s, re.S)))" $SCRATCH/work.html $SCRATCH/work.js && node --check $SCRATCH/work.js`

4. **Process hygiene:** stop the preview server by matching the process
   exactly:
   `ps -eo pid,args | awk '$2=="python3" && $3 ~ /preview\.py$/ {print $1}' | xargs -r kill`.
   Do **not** use `pkill -f <pattern>` or `kill $(pgrep -f <pattern>)`: the
   pattern also appears in your own shell's command line, so they can kill the
   shell running them.

## Phase 0 — deterministic screenshots (do this first)

Goal: any view, time and weather reproducible from the URL, so every later
phase can be checked with before/after shots.

Add a small `DEBUG` parser near the top of the script:
`const DEBUG = Object.fromEntries(new URLSearchParams(location.search));`

Support these parameters (all optional, ignored when absent):

| Param | Effect |
|---|---|
| `t=HH:MM` | after each poll, override `st.minute`; set `st.phase` to `night` when ≥ 22:00 or < 06:00 |
| `w=<weather>` | override `st.weather` (e.g. `thunderstorm`, `steady rain`, `windy`, `morning mist`, `golden haze`, `clear and bright`) |
| `cam=x,y,z` | camera centre in tiles and zoom; set `cam.x/tx`, `cam.y/ty`, `cam.z/tz`, `userMoved = true`, and do not let `resetView` override it |
| `sel=<name>` | select that villager on load |
| `tab=<id>` | click that side-panel tab (`feed`, `people`, `pop`, `built`, …) |
| `freeze=<ms>` | pass this fixed value as `t` to all animation code instead of the rAF time, so animated things render identically every shot |

Apply the overrides in `poll()` right after `st = await r.json()`, and the
camera once after the first poll. No visible change when no params are given.

Then take the **baseline set** (keep these PNGs for the whole project):

1. `?cam=20,12,1&t=12:00&w=clear and bright&freeze=1000` (whole village, noon)
2. `?cam=12,11,2.2&t=12:00&w=clear and bright&freeze=1000` (Cottages + Bakery close-up, people visible)
3. `?cam=20,21,1.6&t=19:40&w=clear and bright&freeze=1000` (lake at sunset)
4. `?cam=20,12,1&t=23:00&w=clear and bright&freeze=1000` (night)
5. `?cam=20,12,1&t=12:00&w=thunderstorm&freeze=1000` and `w=morning mist`
6. `?cam=46,20,1.8&t=12:00&freeze=1000` (Hospital + Cemetery)

Acceptance: identical PNG bytes for two runs of the same URL; no console
errors. Commit: "Add URL debug parameters for reproducible map screenshots".

## Phase 1 — villagers that read as people

Today a villager is a coloured square body, a round head and a hair arc. This
is the biggest visual weakness. All work is in `person()` plus a small lookup
table.

1. **Body shape.** Replace the square torso with a tapered torso (shoulders
   wider than waist: a rounded trapezoid), short arms on each side that swing
   opposite to the legs while `p.walking` (reuse `step`), and feet as small
   dark ovals. Keep the overall height so bubbles and labels still line up
   (head centre stays at `y - 27 * S`).
2. **Faces.** Two 1.4 px dark eyes on the head, offset towards the walking
   direction (store the last horizontal movement sign in `pos[name].face`,
   updated in `frame()` when `p.x` changes). When standing and `a.say_to` is
   someone at the same place, face that person.
3. **Distinct looks.** Add `const LOOK = { Mira: {...}, ... }` with, per
   founder: `hair` style (`short`, `long`, `bun`, `braid`, `bald+beard`),
   optional `beard`, and a clothing accent:
   Mira — flour-white apron; Tobias — leather apron, grey beard; Isolde —
   long dark hair, scarf; Bram — beard, rolled sleeves; Wren — short
   red hair, cap; Hesper — white bun, shawl. Village-born villagers get a look
   derived from `hash(name)` and their sex (no beards under 18).
4. **Age.** 65+: slight forward lean (shift head 1.5 px forward) and a walking
   stick on the far side. Under 6: bigger head relative to body.
5. **State cues** (small, tasteful): `a.sick` → slightly paler skin and a tiny
   green-white "≈" above the head once every few seconds; `a.hungry >= 2` →
   slower walk (multiply the walk speed in `frame()` by 0.75 for them);
   `a.expecting` → nothing on the body (keep it neutral), but a tiny pink heart
   next to the name label in `drawOverlay()`.
6. **Idle life.** When not walking: a 1 px breathing bob (`Math.sin(t/900 +
   hash)`), and every ~6 s a short head turn. Frozen under `REDUCE`.
7. **Holding something** by place, only while standing at that place:
   Woods → axe, Dock → fishing rod, Garden → basket, Bakery → loaf, Library →
   book, Quarry → pick, Hospital → none, Cemetery → small flowers. Draw props
   with 3–6 primitives each.

Acceptance: screenshot 2 shows six clearly different people you could tell
apart without colour; walking still animates; selection ring and hover ring
still align with the feet; children still smaller. Commit:
"Give villagers bodies, faces, distinct looks and props".

## Phase 2 — light and atmosphere

1. **Mist that moves.** Replace the flat mist fill with 3–4 wide, soft,
   horizontal bands (radial or linear gradients) drifting slowly across the
   screen, denser near the lake (y > 18 tiles). Keep total opacity similar.
2. **Sunrise/sunset glow.** Between 05:30–08:00 and 17:30–20:30 add a large,
   low-alpha warm radial gradient from the east (morning) or west (evening)
   edge, using `globalCompositeOperation = 'soft-light'` or `'overlay'`, on top
   of the existing multiply tint.
3. **Moon and stars at night.** When `S.light > 0.6`, draw a pale moon
   reflection on the lake (a vertical streak of short horizontal strokes
   that shimmer) and a few twinkling star reflections in the lake only (there
   is no sky in this top-down view; the lake is the sky).
4. **Lightning.** In storms, during the existing flash, draw an actual jagged
   bolt (5–7 segments from the top of the screen to a random point near the
   lake) for ~120 ms, and a brief bright rim on the nearest building.
5. **Vignette.** A subtle radial darkening at the screen edges (screen space,
   ~12 % at corners), stronger at night.
6. **Lamp and window flicker.** Multiply each window/lamp glow alpha by
   `0.92 + 0.08 * sin(t/170 + i*1.7)`; candles already flicker.

Acceptance: shots 3, 4 and 5 look clearly more atmospheric than baseline
without losing legibility of people and labels. Commit:
"Moving mist, dawn and dusk glow, moonlit lake, lightning bolts".

## Phase 3 — a living lake

1. **Waves.** Replace the 9 shimmer strokes with ~30 short wave arcs whose
   positions drift slowly and fade in/out; clip to the lake ellipse
   (`ctx.save(); ctx.beginPath(); ctx.ellipse(...); ctx.clip()`).
2. **Shore foam.** A thin animated white line just inside the shoreline
   (dashed stroke with moving `lineDashOffset`), stronger when windy.
3. **Reflections.** For each finished boat and tower in `st.structures`, draw a
   vertically flipped, 25 % alpha, slightly wavy copy below it (call the same
   drawing code with `ctx.scale(1, -0.6)` and clip to the lake).
4. **Boats bob.** In `drawStruct` for `boat`: offset y by
   `Math.sin(t/1100 + s.id) * 1.5` and rock the mast by a degree or two.
5. **Ducks.** 3–4 small ducks that paddle slowly in loops on the lake by day
   (deterministic paths from `rng`), leaving tiny V-shaped wakes. Hidden at
   night.
6. **Fish jumps.** Every ~10 s (deterministic from `t`), a small arc and
   ripple ring at a random lake point.

Acceptance: shot 3 shows reflections, foam and ducks; animation is smooth.
Commit: "Waves, foam, reflections, bobbing boats, ducks and fish".

## Phase 4 — ambient life and buildings in motion

1. **Windmill sails** rotate (if the mill is drawn static, rotate its 4 sails
   around the hub; faster when windy, stopped at night).
2. **Smoke from every chimney** (Bakery, Tavern, houses with `chimney: 1`):
   generalise the existing Bakery smoke into `smoke(x, y, t, seed)` and call it
   for each chimney position recorded in a new `chimneys[]` array filled by
   `house()` (like `windows[]`). Houses smoke at morning and evening only.
3. **Flags** on towers wave (sine-deformed quad).
4. **Bees** around finished beehives by day, **butterflies** over the Garden
   and Meadow by day, **birds**: a small V-flock crossing the map every
   ~40 s at noon, none at night or in rain.
5. **Market stalls** get colourful awnings that flutter slightly in wind and
   a few goods on the counter.
6. **Farms** show crop rows whose colour depends on progress / time of day.

Acceptance: shot 1 at noon shows birds or butterflies, smoke and moving mill
sails across successive `freeze` values. Commit:
"Chimney smoke, mill sails, flags, bees, butterflies, birds".

## Phase 5 — events you can see

Read `st.events` (newest last) and show short-lived effects for events newer
than the page load (track the max id seen, like `hear.upTo` does):

| Event `kind` | Effect (duration) |
|---|---|
| `disaster` | at each hit structure (`e.hit` ids): lightning → flames and smoke on the building (20 s); flood → a translucent blue water patch around it (30 s); gale → debris particles flying off (8 s); tremor → screen shake 400 ms (skip under `REDUCE`) |
| `birth` | soft sparkles and a small pink heart rising at the Cottages (6 s) |
| `death` | a candle appears on the newest grave and stays lit until morning |
| `sick` | a faint green aura on that villager while `a.sick` is true |
| `family` | two small hearts drifting up between the couple if they are at the same place (5 s) |
| `turn` with `did` starting `finished building`/`finished repairing` | a brief burst of golden dust at the structure (3 s) |

Also make **damaged** buildings (`s.repair` set) look damaged rather than like
fresh scaffolding: draw the finished building at reduced alpha with a broken
roof gap and soot marks, then the scaffolding over it.

Acceptance: verify by temporarily injecting fake events in the preview copy
(push objects into `st.events` from the console script) and taking shots; then
remove the injection. Commit: "Visible disasters, births, deaths and repairs".

## Phase 6 — voices on the map

Tie into the voice player (`hear.now`):

1. While a line is playing, draw a pulsing ring and three small sound-wave arcs
   beside the speaking villager (or around the Oracle stones for the Oracle).
2. Keep that villager's speech bubble on top and fully opaque for the duration.
3. If the speaker is off-screen, show a small arrow at the screen edge pointing
   to them with their initial.

Acceptance: with `?sel=Mira` and a faked `hear.now = {who: 'Mira', ...}` in
the preview, the ring and arcs show. Commit: "Show who is speaking on the map".

## Phase 7 — performance pass

1. Measure: add a hidden `?fps=1` param that draws frame time (ms, 60-frame
   average) in a corner. Record before/after for shots 1 and 3.
2. Cache gradients that don't change per frame; avoid creating new gradient
   objects inside loops where a cached one with `translate()` would do.
3. Skip drawing anything whose bounding box is off-screen (cull in the
   `things` loop and in particle loops).
4. When the tab is hidden, rAF already pauses; additionally, when nothing is
   moving and no effects are active, draw at most every 100 ms.

Acceptance: average frame time at default zoom not worse than baseline + 2 ms.
Commit: "Cull off-screen drawing and cache gradients".

## Definition of done (every phase)

- `node --check` passes on the extracted script; no `Uncaught` in Chromium logs.
- Before/after screenshots for the phase's views were read and look better,
  with people, labels and bubbles still legible in day, night, rain and mist.
- `REDUCE` respected; phone width (`--window-size=390,844`) still usable.
- `index.html` updated from the working copy, committed with a message as
  given, the preview server stopped by PID.
- No changes to `emberwick.py`, the database, or the systemd service; no
  restart needed (the page is read from disk).
