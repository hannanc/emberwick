# Plan: an inner village (IFS mode)

Status: idea / not started.

## Idea

Instead of six invented villagers, the village is one person's inner world,
modelled on Internal Family Systems (IFS). Each villager is a *part*:

- **Managers**: keep daily life orderly (planner, critic, caretaker).
- **Firefighters**: react when something hurts (distraction, anger, numbing).
- **Exiles**: carry the vulnerable feelings the others protect.

The user is the **Self**, not a villager. They visit, listen, and whisper
questions. The stance is curiosity and compassion, so the UI should reward
asking over commanding.

Emberwick already has what this needs: a small cast, memories, feelings about
each other, a nightly reflection and a narrator. The nightly chronicle becomes
a reflection on which parts were active and what they were protecting.

## Why this over shared avatars

A shared village of avatars built from many people's agent memories means
hosting other people's personal data, with consent, deletion and abuse
problems. An IFS village is one person's, runs locally, and needs no
moderation. A "public face" export for shared villages can come later as an
opt-in, separate mode.

## Design

1. **Setup.** The user's own agent drafts the parts from what it knows. The
   user reviews and edits before anything is saved.
2. **Parts schema** (JSON, validated, length-capped, loaded from `parts/`):
   `name`, `role` (manager | firefighter | exile), `protects`, `fears`,
   `speech_style`, `typical_phrase`, `appearance`.
3. **Village.** Managers stay near daily-routine places, firefighters react to
   triggers, exiles stay in quiet places. The narrator describes the "weather"
   of the inner world.
4. **Self.** Whispers are framed as questions to a part ("what are you afraid
   of?"). Parts answer in character.
5. **Models.** Use the larger narrator model for setup and the chronicle.
   Small models give shallow parts, so the user must be able to correct them.

## Safety (must have before anyone else uses it)

- **Not therapy.** State this in the README and the UI. Real IFS work with
  trauma belongs with a trained therapist.
- **Exiles are optional** and kept gentle. No graphic trauma content.
- **Pause / stop** control that ends a scene at any time.
- **Crisis handling.** If the text suggests self-harm, stop role-play and show
  crisis resources instead of continuing the story.
- **Local only.** Data stays in the local SQLite file, the port must not be
  exposed, and there is a one-step delete.
- **Untrusted text.** Parts files are validated against the schema so persona
  text cannot override instructions.

## First steps

1. Define the parts schema and a loader for `parts/*.json`.
2. Add one hand-written example village.
3. Write the prompt an agent uses to draft parts for its user to review.
4. Add the Self-whisper framing, pause control and crisis stop.
5. Test with the actor model and tune.

## Open questions

- How many parts fit before turns get too slow on a 4-core CPU?
- Should parts have a persistent visual identity (procedural sprite from
  traits)?
- Is a "public face" export for shared villages worth building at all?
