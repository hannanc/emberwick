# Plan: an inner village (IFS mode)

Status: design reviewed against the code; not started. The daily loop in
"What parts do all day" is a proposal and needs confirming before step 1.

## Idea

Instead of six invented villagers, the village is one person's inner world,
modelled on Internal Family Systems (IFS). Each villager is a *part*:

- **Managers**: act ahead of time to keep daily life safe and orderly
  (planner, critic, caretaker).
- **Firefighters**: act after something hurts (distraction, anger, numbing).
- **Exiles**: carry the vulnerable feelings the others protect.

The user is the **Self**, not a villager. They visit, listen, and ask
questions. The stance is curiosity and compassion, so the UI rewards asking
over commanding.

The user describes each part in their own words. The tool decides what type
of part it is, and each type gets a predefined prompt.

## Why this over shared avatars

A shared village of avatars built from many people's agent memories means
hosting other people's personal data, with consent, deletion and abuse
problems. An IFS village is one person's, runs locally, and needs no
moderation. A "public face" export for shared villages can come later as an
opt-in, separate mode.

## What carries over, and what does not

Emberwick's cast, memories, feelings about each other, nightly reflection and
narrator all carry over. Its economy does not: most of the turn prompt in
`agent_turn()` is about gathering, trading, building and eating, and the
Oracle, the steward, prayers and the nightly omen are built on that. None of
it means anything for a part, so IFS mode switches it off:

- inventory, work, trade offers, builds and hunger,
- prayers and granted wishes,
- the Oracle and the steward (also for privacy, see Safety).

IFS mode is a mode of the same program, not a fork: `EMBERWICK_MODE=ifs`, with
its own database file (`emberwick-ifs.db`) so the classic village keeps
working untouched. The twelve `CAST[...]` lookups go through one accessor that
returns either the classic cast or the loaded parts.

## What parts do all day (proposal, to confirm)

- **Morning.** Instead of a surprising village event, the day starts with one
  ordinary trigger from daily life ("a deadline moved up", "a friend has not
  replied"). The narrator writes it the night before; the user can replace it
  with their own.
- **Turns.** A part's turn is what it is today minus the economy: a private
  thought, something said aloud, a place to go, an activity and a mood. There
  are no other actions at first.
- **Reactions.** Managers respond to the trigger by planning and controlling.
  When an exile is stirred, the firefighters that guard it take the next
  turns (the same priority `pick_agent()` already gives to a villager who was
  just spoken to).
- **Night.** Each part reflects, as now. The chronicle becomes a short account
  of which parts were active and what they were protecting.

Parts do not "heal" on a schedule. The tool shows and lets the user listen; it
does not simulate therapy progress.

## Design

1. **Setup: describe, don't configure.** The user describes each part in
   their own words ("a voice that says I should have done more by now"). They
   do not pick a role or fill in fields. The user's own agent may offer a
   first draft of descriptions, but that happens outside this tool and the
   user always reviews and edits.
2. **Classification.** One call per description to a local model (the larger
   narrator model, JSON constrained by a schema) returns:
   - `role`: `manager` | `firefighter` | `exile` | `unclear`
   - `why`: one sentence the user can read ("it acts to prevent criticism, so
     it looks like a manager")
   - the extracted fields listed under "Parts schema".

   There is no confidence score: small models report "high" almost always.
   Instead the role and the reason are always shown, and changing the role is
   one click. On `unclear` the tool asks one follow-up question ("does it act
   before something goes wrong, or after it already hurts?") instead of
   guessing. A role is the part's *current* role: the user can re-classify
   or change it at any time.
3. **Linking pass.** Classifying one description at a time cannot see which
   protector guards which exile, and that link is the core structure in IFS.
   Once the parts are entered, one more call proposes the links, and the user
   confirms or edits them. Confirmed links seed each part's `feelings` about
   the others.
4. **Predefined prompts.** One hand-written template per role in the code
   (manager, firefighter, exile), not generated and not editable from the UI.
   `persona()` picks the template by role and fills its slots from the
   extracted fields. Each template fixes:
   - what the part does each turn (managers plan and control ahead of time,
     firefighters react and over-correct, exiles stay quiet and guarded),
   - how it relates to the Self: it may be guarded, wary or slow to trust,
     but is never abusive or contemptuous toward the user. Curiosity and
     openness are the Self's qualities, not something parts are forced into.
   - where it spends time and what it must not do (the exile template stays
     gentle and never produces graphic content).
5. **Parts schema** (JSON, validated, length-capped):
   - all parts: `name`, `role`, `description` (the user's original words),
     `speech_style`, `typical_phrase`, `appearance` (the colours the map
     needs), `note` (free text, for a part that blends roles);
   - managers and firefighters: `job` (what it does), `fears` (what it thinks
     would happen if it stopped), `guards` (names of exiles, from the linking
     pass); firefighters also `trigger`;
   - exiles: `carries` (the feeling or belief), `needs`.

   The user's parts are saved under `parts/`, which is git-ignored together
   with the IFS database. The example village lives in `examples/` so it can
   be committed.
6. **Places.** IFS mode has its own place list, each tagged routine, reactive
   or quiet, so managers keep to routine places, firefighters go where the
   trigger is, and exiles stay somewhere quiet. The narrator describes the
   "weather" of the inner world.
7. **Talking as the Self.** The current whisper cannot be reused as it is: it
   tells the villager "you feel compelled to act on it now", and the reply is
   said to whoever is standing nearby, not to the user. IFS mode gets a
   separate ask-and-answer channel:
   - the user picks a part and asks a question,
   - the part's next turn is framed as "the Self is here with you and asks…",
     with no compulsion, and it may decline to answer,
   - the answer is addressed to the Self and shown in a conversation panel.

   The village-wide "great voice from the sky" is removed in this mode.
8. **Models.** The larger narrator model does setup and the chronicle. Small
   models give shallow parts, so the user must be able to correct them.

## Safety (must have before anyone else uses it)

- **Not therapy.** State this in the README and the UI. Real IFS work with
  trauma belongs with a trained therapist.
- **Exiles are optional** and kept gentle. No graphic trauma content.
- **Pause / stop** control that ends a scene at any time. It is always
  visible, because the automatic check below will miss things.
- **Crisis handling.** Checked on what the user types (descriptions,
  questions) and on what the models write (speech, thoughts, reflections, the
  chronicle). Two layers: a fixed phrase list that always runs and needs no
  model, and a check by the larger model on user input. Neither is reliable
  on its own. On a hit the simulation pauses, role-play is hidden, and crisis
  resources are shown; the resources text is configurable per country.
- **No unbounded drift.** The nightly step that rewrites each villager's
  self-description is unbounded today. In IFS mode the role template is
  re-asserted every turn, the rewritten text passes the same output check,
  and the user can read and reset any part's self-description. Whether exiles
  get this step at all is an open question.
- **Local only.** IFS mode binds to `127.0.0.1` by default (the classic
  default is `0.0.0.0` with no login). The Oracle is off, because it sends the
  whole village state to an outside API, and here that state is the user's
  inner life. There is a one-step delete that removes the IFS database
  (state, event log, chronicle) and `parts/`.
- **Untrusted text.** Schema validation checks shape, not content, and
  quoting text in a prompt does not stop a small model from following it. So
  only the short extracted fields go into per-turn prompts; the original
  description is kept for the user and never sent in a turn. The fixed list
  of actions and the output schema limit what a derailed part can do. This
  reduces the risk; it does not remove it.

## First steps

1. Confirm the daily loop above.
2. Add the mode flag, the separate database and the cast accessor, and strip
   the economy from the turn prompt in IFS mode.
3. Write the three role templates and a hand-written example village of three
   parts, one per role. Run it on the actor model and judge whether a manager
   and a firefighter read as distinct. This is the riskiest assumption, so it
   comes before the classifier and the setup page. If they do not, try the
   larger model for every turn, or fewer parts.
4. Add the Self ask-and-answer channel, the pause control and the crisis stop
   on input and output. Exiles stay developer-only until this is in.
5. Add the classifier, the follow-up question and the linking pass, and test
   them against a set of sample descriptions.
6. Add the setup page: describe a part, see the proposed role and why, confirm
   or change it, save.
7. README: not therapy, local only, how to delete everything.

## Open questions

- Does the user set the morning trigger, or the narrator, or either?
- Do exiles get the nightly self-description step at all?
- Can the village map be reused with renamed places, or does the inner world
  need its own art?
- How long does classification take with the narrator model on a 4-core CPU?
  Setup is interactive, so the user is waiting.
- How many parts fit before turns get too slow on a 4-core CPU?
- Should parts have a persistent visual identity (procedural sprite from
  traits)?
- Is a "public face" export for shared villages worth building at all?
