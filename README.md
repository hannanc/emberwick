# Emberwick

A tiny village that lives on your server. Six villagers, each played by a local
LLM through [Ollama](https://ollama.com), walk around an animated map, talk to
each other, form memories and hold grudges. Every night a larger model writes a
chronicle of the day and invents the twist that greets the village next morning.

Open it in a browser, watch, and whisper thoughts into their heads.

They also have an economy. Each villager carries coins and goods, gathers wood at
the Woods, stone at the Quarry and food at their workplace, trades with whoever
is standing next to them, and must eat every night. With enough materials and
work they build things that appear on the map: houses, market stalls, boats,
beehives, a windmill, statues, sheds, watchtowers and farms on the Meadow. Some of
these pay off, for example a stall earns its owner coins every morning and a farm
bakes them bread. Everyone starts with a house of their own.

If a [colibri](https://github.com/JustVugg/colibri) server is running locally, a
steward thread checks in every 90 minutes, finds the villager most stuck (no
food, a stalled build, no plan) and has the Oracle send them a dream with a
concrete plan. It runs beside the village, so turns keep going while it thinks.

- **No required dependencies**: one Python file (standard library only) and one HTML file.
- **Runs on CPU**: built on a 4-core i7 with a 1 GB model at about 22 tokens/s.
- **Persistent**: the world lives in a SQLite file and keeps going while you are away.
- **Polite**: pauses while Ollama is busy serving a different model.

## Run

```sh
ollama pull lfm3          # or any small chat model
python3 emberwick.py      # then open http://<server>:8377/
```

To keep it running, copy `emberwick.service` to `~/.config/systemd/user/`,
adjust the paths, and run `systemctl --user enable --now emberwick`.

## The Oracle (optional)

A ring of standing stones in the corner of the map houses the Oracle, played by
Claude Opus through the Anthropic API (or Grok through xAI). Once an hour (real time) one villager may
walk there and bring it a problem that is too hard for a small local model: a
plan, a sum, a scheme, something to be written. The Oracle sees the whole
village state, does the thinking, and hands back a spoken reply, a full answer
and a step-by-step plan that the villager then follows.

It stays asleep until the server has the SDK and a key:

```sh
python3 -m venv .venv && .venv/bin/pip install anthropic
mkdir -p ~/.config/emberwick
echo 'ANTHROPIC_API_KEY=sk-ant-...' > ~/.config/emberwick/oracle.env   # and/or XAI_API_KEY=xai-...
chmod 600 ~/.config/emberwick/oracle.env
```

Run the service with `.venv/bin/python` and `EnvironmentFile=` pointing at that
file. Each consultation is one API call, so at most 24 a day.

## Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `EMBERWICK_PORT` / `EMBERWICK_BIND` | `8377` / `0.0.0.0` | Where the page is served |
| `EMBERWICK_ACTOR` | `lfm3:latest` | Model that plays the villagers |
| `EMBERWICK_NARRATOR` | `gemma4:26b` | Model that writes the nightly chronicle (falls back to the actor) |
| `EMBERWICK_DEEP_MODEL` | same as the narrator | Bigger model for key moments (whispers, offers, a fresh Oracle plan, an occasional conversation reply) and the nightly reflection |
| `EMBERWICK_DEEP_EVERY` | `4` | At most one conversation reply in this many turns uses the bigger model |
| `EMBERWICK_TURN_SECONDS` | `20` | Real seconds between villager turns; a village day is 192 turns |
| `EMBERWICK_ORACLE_MODEL` | `claude-opus-5-5` | Model that plays the Oracle |
| `EMBERWICK_ORACLE_XAI_MODEL` | newest Grok the key lists | Model used when the Oracle runs on xAI |
| `EMBERWICK_ORACLE_PROVIDER` | `auto` | `anthropic`, `xai`, or `auto` (try Claude first, then Grok) |
| `EMBERWICK_ORACLE_COOLDOWN` | `3600` | Real seconds between consultations |
| `EMBERWICK_COLIBRI_URL` / `EMBERWICK_COLIBRI_MODEL` | `http://127.0.0.1:8000` / first listed | Local [colibri](https://github.com/JustVugg/colibri) server, used as the Oracle's last resort and by the steward |
| `EMBERWICK_STEWARD_EVERY` | `5400` | Real seconds between steward passes (`0` turns it off): colibri sends the most stuck villager a dream with a plan |
| `EMBERWICK_YIELD` | `1` | Pause while Ollama has other models loaded |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama API |

The page has no login. Anyone who can reach the port can watch and whisper, so
keep it on a network you trust.

## How it works

Each turn one villager receives the time, weather, who is nearby, the day's news,
their recent memories, their feelings about the others and anything just said to
them, and answers with a thought, an action, a destination and a line of speech
(JSON constrained by a schema). At 22:00 everyone goes home, each villager
reflects on their day and updates how they feel about the others, and the
narrator writes the chronicle and tomorrow's omen. Delete `emberwick.db` to
start a new world.
