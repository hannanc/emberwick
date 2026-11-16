# Plan: graphics and front-end improvements from the Fable review

Status: ready to execute. Written for an agent working in this repo. Do the phases in order; each phase ends in
one or more commits (listed). Source: a read-only review of the live map (16 headless screenshots at several
times, weather states, zooms and a phone width) plus a reading of `index.html` and the state API. Everything
marked *(inference)* was not reproduced; check it before fixing it.

This plan builds on `docs/graphics-plan.md` (the first graphics pass). Reuse its **Workflow** section (preview
server that proxies the live API read-only, screenshot hygiene, process hygiene) and its **Definition of done**.
Where this plan differs, the differences are in *Ground rules* below.

## Ground rules

- **Line numbers are from the review and will drift.** Find code by function name: `label`, `layoutBubble`,
  `drawBubble`, `drawOverlay`, `person`, `house`, `slotTarget`, `buildScenery`, `frame`, `sky`, `weatherIcon`,
  `select`, `focusPlace`, `renderScene`, `poll`, `defaultZ`.
- **The live server reads `index.html` from disk on every page load.** Work on a copy until a phase passes its
  checks, then copy it over. Never POST to the live API from a preview.
- **Unlike the first plan, some phases touch other files:** Phase G edits `emberwick.py` (gzip, an incremental
  state endpoint, a static-file route) and adds a `js/` folder; Phase B adds node tests. Those phases say so.
  The Python tests (`.venv/bin/python -m pytest`) must keep passing after every commit, and Phase G adds new ones.
- **Respect `REDUCE`** (`prefers-reduced-motion`), keep the performance budget (a new effect costs at most about
  1 ms per frame at default zoom; prefer drawing static things into `scenery`), use `rng(seed)` and never
  `Math.random()` in scenery, keep world units in tiles (`T = 32`), and keep the house style (compact functions,
  aligned trailing comments).
- **Screenshot lessons learned (they save an hour):**
  - Headless Chromium is flaky for large windows. Use `--window-size=1200,700`, `timeout 140`, and retry once.
    Always set `--virtual-time-budget` to 8000-12000.
  - `?freeze=` makes the page redraw **every frame**, which is slow in headless mode. Phase B fixes this; until
    then avoid it unless you need exact reproducibility.
  - The snap browser can only write screenshots inside `/home`. A new, uniquely named directory under `$HOME`
    works. Never delete files you did not create.
  - Never use `pkill -f` or `pgrep -f` with a pattern that also appears in your own command line (it kills the
    shell running it). Use the exact-match recipe from the first plan, or a bracket pattern like `[p]review.py`.
  - Run only one browser at a time. Read every screenshot with the Read tool and compare with a "before" shot.

## At a glance

| # | Item | Phase | Size |
|---|---|---|---|
| 1 | Bubble text overflows its box (letter-spacing leak) | A | quick |
| 2 | Off-screen speakers get a bubble pinned to a corner | A | quick |
| 3 | Selecting a villager blanks the whisper dropdown | A | quick |
| 4 | Sunrise/sunset glow shines through rain | A | quick |
| 5 | Windy icon is a tofu box; no dusk icon | A | quick |
| 6 | Place labels over villagers' heads; labels clipped at the map edge; reset view crops the village | A | quick |
| 7 | Scene card hides bubbles | A | quick |
| 8 | Scene card fills the map on mobile | A (fix) / H (redesign) | medium |
| 9 | Page does not signal readiness; `?freeze` redraws every frame | B | quick |
| 10 | Dusk and mist grading too orange/grey; windows not lit by clock | C | quick |
| 11 | Night bubbles glare; no lanterns | C | quick |
| 12 | Label clutter (every structure labelled) | D | quick |
| 13 | Side panel: news block too tall; tab overflow invisible | D | quick |
| 14 | 60 fps redraw forever; per-frame waste | E | quick |
| 15 | Structures redrawn every frame (gradients, reflections) | E | medium |
| 16 | Slow first paint (`distPaths` checks), 27 MB scenery at SS 1.5 | E | quick/medium |
| 17 | Villagers never sit, eat, drink, work or sleep as the feed says | F | medium |
| 18 | Villagers indistinguishable at whole-village zoom | F | quick |
| 19 | Houses are clones | F | medium |
| 20 | Stalls and stacks ignore real inventory; no fishing float | F | medium |
| 21 | Meadow flat and lots invisible; Cemetery thin | F | medium |
| 22 | Full 130 KB state every 2.5 s, uncompressed | G | quick (gzip) / medium (cursor) |
| 23 | One 1,600-line script | G | medium |
| 24 | No JS tests | G | medium |
| 25 | Scene card is a text list; no interiors | H | large |
| 26 | Scene card on phones should be a bottom sheet | H | medium |
| 27 | Canvas not keyboard-navigable | H | quick |

## Phase A: visible bugs (one commit per numbered group)

Take a *before* shot for each. Fix, shoot *after*, read both.

1. **Bubble overflow.** `label()` sets `ctx.letterSpacing` and returns early (before its reset), so the place
   labels' 0.8px leaks into bubble text; "watched" runs past the border in the Square, Dock and storm shots.
   *(The leak is confirmed in code; that it causes the overflow is an inference.)* Set `ctx.letterSpacing='0px'`
   at the top of `layoutBubble` and `drawBubble` and before any early return in `label()`.
   Commit: "Stop letter-spacing leaking from place labels into speech bubbles".
2. **Off-screen bubbles.** `layoutBubble` clamps to the viewport whatever the anchor, so a speaker in the Woods
   gets a bubble in the top-left of the Square. Skip bubbles whose anchor is more than about 40 px off-screen
   (in `drawOverlay`). Commit: "Hide speech bubbles for speakers who are off-screen".
3. **Whisper select.** `select()` sets `$('to').value = name`, but the options are `speak:Name` and
   `thought:Name`, so the select goes blank. Set it to `speak:` + name when that option exists, else leave it.
   Also reset it correctly in `syncFocus`. Commit: "Keep the whisper target in sync when a villager is selected".
4. **Rain glow.** The sunrise/sunset glow exclusion is `/storm|steady|overcast/`; add `rain`. Commit:
   "No golden glow through rain".
5. **Weather icons.** The windy glyph renders as a box on Linux and the sun icon persists until 20:30. Replace
   the glyphs in `weatherIcon` with small inline SVGs (or glyphs present in common fonts) and add a dusk/moon
   icon for 19:00-06:00. Commit: "Reliable weather icons, with a dusk icon".
6. **Label hygiene.** Villager bodies are never added to `occ`, so "THE GILDED NEWT" crosses faces. Push a body
   rectangle per villager before the place-name loop. Reject *partially* clipped place labels (not only fully
   off-screen ones). Fix `defaultZ()` so "Show the whole village" really fits the village at 1200 px width (it
   currently crops both ends). Commit: "Place labels give way to villagers and the map edge; fit the whole village".
7. **Scene card vs bubbles.** Add the card's rectangle to `occ`, and shift the `focusPlace` fly-to target right
   by half the card width so the place is not hidden behind it. Commit: "Keep bubbles and the focused place clear of the scene card".
8. **Mobile scene card (stop-gap).** Under 900 px: max-height 40%, scroll inside, move the zoom buttons clear of
   it, and hide map labels behind it. (The proper redesign is Phase H.) Commit: "Contain the scene card on small screens".

Acceptance: before/after shots for 1, 2, 4, 6, 7 at 1200x700 plus one at 400x800; no `Uncaught`; `node --check` passes.

## Phase B: make screenshots and checks reliable (do before C-H)

9. **Ready signal.** After `buildScenery()` and the first frame, set `document.title = 'ready'` and
   `document.documentElement.dataset.ready = '1'`. When `FROZEN` is set, draw **one** frame and stop the rAF loop
   instead of redrawing every frame. Document in the first plan's Workflow how to wait for it.
   Commit: "Signal readiness and render once in freeze mode".
- **Also (no item number): node check in the Python tests.** `tests/test_emberwick.py::test_the_page_script_parses` already syntax-checks
    the script; extend it to every file under `js/` once Phase G lands.

Acceptance: two runs of the same `?freeze=` URL give identical PNG bytes; the shot never shows the loading screen.

## Phase C: light and atmosphere

10. **Dusk and mist grading** (about 10 lines in `frame()`). At 18:45-19:30 the multiply tint, two soft-light
    fills and a screen fill turn everything orange-red (Bram and Wren lose their colours, statues go pink).
    Draw soft-light once, drop the screen alpha from about .22 to .1, and switch windows on **by clock** from
    about 17:45 instead of by `S.light`. In mist (about 20:15 in the review) halve the band alpha and cap glow
    alpha so the Hospital does not blow out to white.
11. **Night.** Dim the cream speech-bubble fill (about 85% brightness when `S.light > .5`, or multiply by the sky
    colour). Give each villager outdoors after dusk a small lantern glow by pushing into `wins` from `person()`.

Acceptance: shots at 06:30, 12:00, 18:45, 20:15 (mist), 21:30 before/after; villagers' colours still tell them
apart at dusk; windows lit at 18:00. Commits: "Gentler dusk and mist grading, windows lit by the clock";
"Softer night bubbles and villager lanterns".

## Phase D: label clutter and the side panel

12. **Owner labels on demand.** From z >= 0.7 every structure is labelled (eight "X's stall" labels ring the
    Square; house labels land on neighbours' roofs). Show owner labels only on hover, for the selected owner's
    things, or at z >= 1.6. Mark ownership otherwise with an owner-coloured door or pennant (a few lines in the
    structure drawing). Commit: "Owner labels only when asked for; owner-coloured doors".
13. **Side panel** (about 10 lines of CSS). At 700 px tall the Village news block takes about 200 px, leaving 220
    for the feed. Apply the existing mobile 2-line clamp with tap-to-expand at all sizes. The tab bar scrolls with
    a hidden scrollbar (Oracle, Prayers, Chronicle invisible at 400 px): add a right-edge fade or shorter labels.
    Commit: "Clamp the village news and show that the tab bar scrolls".

Acceptance: Square shot no longer ringed by stall labels; 400x800 shot shows the tab fade; `REDUCE` unaffected.

## Phase E: performance

14. **Idle frame rate.** `busy = !REDUCE || ...` means the 100 ms throttle only ever applies to reduced-motion
    users; everyone else redraws at 60 fps forever. Cap ambient animation at 30 fps when nobody walks and the
    camera is still (about 5 lines). Batch the 30 separately stroked wave arcs (each builds an `rng()`), and stop
    calling `windows.concat(wins)` twice per frame.
15. **Cache structures** (about 40 lines). Houses create a new linear gradient each frame; boats and towers draw
    twice for reflections. Cache each structure as a sprite canvas keyed by type, colour and state (done, damaged,
    progress band), and invalidate on change. This also pays for Phase F's extra house detail.
16. **First paint.** `buildScenery` runs about 4,400 `distPaths` checks over every path segment on a 6.8-megapixel
    canvas. Bucket the segments in a coarse grid. Offer `SS = 1` on small or low-memory devices (the scenery
    canvas is about 3552x1920, 27 MB RGBA, at SS 1.5).
    Measure with the `?fps=1` overlay from the first plan; record before/after in the commit message.

Acceptance: average frame time at default zoom not worse than baseline + 2 ms (and clearly better when idle);
shot parity with the "before" images (pixel-compare the static views). Commits: "Cap idle redraws at 30 fps and
batch waves"; "Cache structure sprites"; "Faster scenery build".

## Phase F: life in the world

17. **Activity-driven poses** (50-70 lines, the biggest "alive" gain). `person()` has only stand, walk and seven
    place props, while the feed says "sipping ale", "sitting in the shade", "eating bread", "ladling stew".
    Parse `a.activity` into **sit** (shorter legs, lower y; snap to benches and stumps), **eat/drink** (hand-to-
    mouth bob with a mug or loaf), **work** (tool swing) and **sleep**. Sitting needs seat spots in `slotTarget`
    (benches in the Square, stools in the Tavern). Keep it cheap: a regex on the activity string, no per-frame
    allocations.
18. **Distinguish at a distance.** At whole-village zoom villagers are about 17 px and told apart only by colour;
    draw a small colour pip above the head when z < 0.8 (about 5 lines).
19. **House variety** (about 30 lines). Every owned house is the same `house(...)` with only the roof colour
    changing. Vary by `hash(owner + id)`: width, three wall tints, door colour, an optional second window,
    flower box, fence, and a woodpile when the owner holds wood. Needs Phase E's sprite cache first.
20. **State-driven props** (30-50 lines in `drawStruct`). Stalls show the owner's inventory (bread, fish, herbs)
    instead of the same four fruits; wood and stone stacks by the Workshop and Quarry scaled to village stock; a
    bobbing float when someone fishes at the Dock.
21. **Meadow and Cemetery** (about 55 lines). The Meadow is a flat pale rectangle with one cart and the six new
    lots are invisible: add stake-and-string outlines for free lots, hay rows and three or four grazing sheep
    (`buildScenery` plus the dynamic layer). The Cemetery is a thin grey box with its label on the gate: add a
    thicker wall with posts, a gravel path and flower patches, and move the label.

Acceptance per item: before/after shots at the relevant zoom, plus a day and a night shot; `REDUCE` freezes the
new animations; poses never put a villager on top of another or through a wall (check the Tavern, Square and Dock).
Commits (one each): "Sit, eat, work and sleep poses from what the villager is doing"; "Colour pips for villagers at
a distance"; "Varied houses"; "Stalls and stacks that show real stock"; "Meadow and Cemetery detail".

## Phase G: front-end architecture (touches `emberwick.py`)

22. **Polling.** `poll()` fetches the whole `/api/state` every 2.5 s: 130 KB uncompressed (37 KB gzipped), about
    184 MB per hour per open tab. Breakdown: events 34 KB (80), chronicle 30 KB, oracle 22 KB, agents 16 KB,
    structures 10 KB, goals 8 KB.
    - **(a) gzip**, about 8 lines in `Handler.send` of `emberwick.py`: compress when the client sends
      `Accept-Encoding: gzip` and the body is over about 1 KB. Put the choice in a small pure function
      (`gzip_if_accepted(body, accept)`) and **add pytest tests** for it. Commit: "Compress API responses".
    - **(b) cursor**, about 25 lines server (`do_GET`, `state_json`) and 20 client: accept
      `/api/state?since=<last event id>&chron=<latest chronicle day>`, return only newer events and omit the
      chronicle and Oracle history when unchanged; the client merges `st.events = old.concat(new).slice(-80)`.
      Fall back to a full fetch when ids go backwards (a restart). Add pytest tests for the endpoint's shape.
      Target: a typical poll under 10 KB gzipped (about 90% less in total). Commit: "Send only what changed
      since the last poll".
    - Server-sent events are **not** worth it here.
23. **Split the script.** It is already sectioned by banner comments: setup, camera, scenery, light and weather,
    dynamic world, labels and bubbles, frame and effects, interaction, scenes, side panel, voices. Add one
    whitelisted static route in `do_GET` (`/js/<name>.js`, a regex such as `^/js/[a-z0-9_-]+\.js$`, read from a
    `js/` folder, `text/javascript`, about 8 lines). Move each section into its own file loaded by ordered
    `<script src>` tags sharing globals, with **no code changes**. Do not use ES modules yet (the shared mutable
    globals `st`, `cam`, `pos`, `selected`, `ctx` make that a medium, regression-prone job). Verify with
    pixel-identical before/after shots and `node --check` on each file.
    Commit: "Split the page script into files".
24. **JS tests.** Move the pure helpers (`hhmm`, `clamp`, `lerp`, `rng`, `hash`, `distSeg`, `inLake`, `sky`,
    `viaDepth`, `look`, `weatherIcon`, `wrap` with a stub `measureText`, label rejection, `placeAt`, `villagerAt`
    given `st` and `cam`, and the scene filters extracted into `sceneData(st, name)`) into `js/pure.js`, ending
    with `if (typeof module !== 'undefined') module.exports = {...}`. Add `tests/js/pure.test.js` using
    `node --test` and `node:assert`, with a fixture saved from `/api/state` (small, with no personal data), and a
    pytest wrapper that runs it when `node` exists. About 60 lines; it would have caught the whisper-select
    mismatch (item 3). Commit: "Unit tests for the page's pure helpers".

Acceptance: the Python tests, the node tests and screenshot parity all pass; bandwidth measured before/after with
`curl -H 'Accept-Encoding: gzip'`.

## Phase H: the scene card and accessibility

25. **Interiors** (large, about 120 lines for three). A 316x110 canvas strip at the top of the scene card with a
    cut-away (bar and casks for the Tavern, shelves for the Library, an oven for the Bakery) and the present
    villagers drawn by `person()`. `person()` draws to the global `ctx`, so first give it a context parameter
    (a small refactor of its callers; check shot parity). Commits: "person() draws to any context"; "Cut-away
    interiors in the scene card".
26. **Phones.** Under 900 px render the scene card as a side-panel tab or a bottom sheet instead of over the
    map (about 30 lines). Supersedes the stop-gap in item 8.
27. **Keyboard.** The canvas has pan, zoom and Escape but no way to pick a villager or place: add Tab and `[`/`]`
    cycling plus Enter to open the scene (about 12 lines). Keep focus styling visible.

Acceptance: Tavern, Library and Bakery scenes shot with people present; a keyboard-only run through the villagers;
`REDUCE` respected. Commit: "Keyboard selection of villagers and places".

## Not worth doing

Seasons or falling-leaf systems (the palette is baked into the scenery and windy leaves exist); WebGL or real
shadows; more fireflies, stars or ducks (ambient life is already dense); a fancier loading screen (it shows for
under a second); camera easing changes (already smooth); smoothing the path junctions (the kinks at the Cottages
forks are minor); server-sent events.

## Out of scope here (tracked separately)

Back-end engineering (more tests around the Oracle, strangers and the fair; moving prompts into files; splitting
`emberwick.py` into modules) is not part of this plan.

## Definition of done

As in `docs/graphics-plan.md`, plus: `.venv/bin/python -m pytest` passes; for phases touching Python, new tests
cover the change; the working tree is committed after every phase; push only when asked.
