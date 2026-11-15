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
bakes them bread. Everyone starts with a house of their own. Now and then the weather
turns on them: lightning, floods, gales and tremors damage buildings at dawn, and
a damaged building stops paying off until someone repairs it (or rebuilds it, if
it was destroyed). Goods spoil and clutter piles up, so hoarding costs
something, and a travelling merchant at the Square buys surplus for a limited purse
of coins each day.

They also live and die. Three women and three men grow a year older every four
village days and know it. A woman and a man who both want it can have a child,
born two nights later and named by the mother; toddlers go everywhere with her
and are fed from their parents' food, take their own turns from 6 and grow up at
18. Villagers fall ill now and then and can be cured with herbs at the Hospital;
old age, untreated illness and long hunger can kill, and the dead are buried in
the Cemetery, where the others can mourn them. Heirs inherit goods and buildings.
The Population tab lists everyone with their age and net worth.

Every so often the village holds its midsummer fair at the Square: contests for
the best bread, the biggest catch, the finest craft and the best tale, judged by
the narrator that night, with coins and a ribbon for each winner. The merchant
Bram secretly owes turns up at the first one to collect.

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

## Voices (optional)

Pick **Hear everyone** or **Hear only <villager>** under the clock and the
villagers speak their lines aloud, each with their own voice (the Oracle too).
With [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) on the server the
voices are natural, with a soft room echo that depends on where the speaker
stands; without Kokoro the browser's own speech is used.

```sh
.venv/bin/pip install kokoro-onnx
mkdir -p ~/.local/share/emberwick/kokoro && cd ~/.local/share/emberwick/kokoro
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx   # or the smaller, more metallic kokoro-v1.0.int8.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

Speech is only made when someone is listening (under 1 GB of RAM once loaded,
and roughly a line's length of CPU time per line), and each line is cached.
`EMBERWICK_TTS_MODEL` picks the model file in that folder.

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
| `EMBERWICK_DISASTERS` | `1` | Multiplies the chance of a dawn disaster (lightning, flood, gale, tremor; about one night in eight by default). `0` turns them off |
| `EMBERWICK_CARRY` | `80` | Most of each good a villager can carry (+80 per shed they own). Each night 10% of fish and 5% of bread rot, and a quarter of anything over the limit is lost |
| `EMBERWICK_MERCHANT_PURSE` | `40` | Coins the merchant at the Square spends on goods each day (at most 15 per sale, one sale per villager a day) |
| `EMBERWICK_OWN_LIMIT` | `2` | Most buildings of one type a villager may own (older extras are kept) |
| `EMBERWICK_LIFE` | `1` | Ageing, children, illness and death (`0` turns the life cycle off) |
| `EMBERWICK_YEAR_DAYS` | `4` | Village days per year of age |
| `EMBERWICK_MAX_PEOPLE` | `12` | Most living villagers (and babies on the way) |
| `EMBERWICK_TTS` / `EMBERWICK_TTS_DIR` | `1` / `~/.local/share/emberwick/kokoro` | Spoken voices with Kokoro, if `kokoro-onnx` is installed and the model files are in the folder |
| `EMBERWICK_TTS_THREADS` | `3` | CPU threads used for speech, leaving the rest to Ollama |
| `EMBERWICK_FAIR_EVERY` | `28` | Village days between midsummer fairs |
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

## Cloud models

Set `EMBERWICK_ACTOR` (or `EMBERWICK_NARRATOR` / `EMBERWICK_DEEP_MODEL`) to a name starting with `claude-`, for example
`claude-haiku-5-5`, to run that role on the Anthropic API instead of Ollama. The key comes from `ANTHROPIC_API_KEY`
(the service reads `~/.config/emberwick/oracle.env`). Every call's tokens are counted per day and model in the `usage`
table and shown under `usage` in `/api/state`, with a cost estimate (see `PRICES` in `emberwick.py`).

## The Oracle's purpose

The Oracle is the village's steward. Every consultation includes a standing agenda computed from the live state
(everyone fed and healthy, buildings finished and repaired, every adult housed with an income, a mill and sheds, nobody
penniless, debts cleared and the fair well entered, a growing village), each milestone marked DONE or TO DO, and its
counsel must advance the first unmet one. See `steward_agenda()` in `emberwick.py`.

## Growing the village

- **Shared projects.** The village builds big things together: the bank, a granary, a common kitchen, a harbour market,
  a fairground wheel and a festival hall, each with a perk for everyone. Villagers hand over surplus with the
  `contribute` action at the project's site. The Oracle can also call for facilities when they are needed: a
  schoolhouse once there are children, and new lanes of house lots (East Lane, Far Lane) when the lots run out. Each
  lane widens the map to the east.
- **The bank** opens only once the village has a banker: savings earn interest, and small loans are repaid automatically.
- **Newcomers.** Every few days a stranger with a trade the village lacks (a banker first, then for example a
  stonemason) and four random personality traits, some of them flaws, asks to join. Each adult votes during the day,
  weighing food, house lots and the stranger's personality against their own, and the majority decides at night.
- **Relationships.** Warmth between villagers grows with gifts, trades, help and conversation. Close adults within 20
  years of age can court, and couples are shown on the Villagers tab.
- **Stories.** The nightly chronicler runs four-morning story arcs that end in a real reward (coins, food, healing, or
  help with the current project), shaped by what the villagers did about them.
- **Goals tab.** Shows the Oracle's milestones, the story so far, the projects and any stranger at the gate.

Token usage for every model, the Oracle included, is in the `usage` table and under `usage` in `/api/state`.
Set `EMBERWICK_PRICES='{"model": [in, out]}'` to correct the cost estimate.
