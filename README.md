# Emberwick

A tiny village that lives on your server. Six villagers, each played by a local
LLM through [Ollama](https://ollama.com), walk around an animated map, talk to
each other, form memories and hold grudges. Every night a larger model writes a
chronicle of the day and invents the twist that greets the village next morning.

Open it in a browser, watch, and whisper thoughts into their heads.

- **No dependencies**: one Python file (standard library only) and one HTML file.
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

## Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `EMBERWICK_PORT` / `EMBERWICK_BIND` | `8377` / `0.0.0.0` | Where the page is served |
| `EMBERWICK_ACTOR` | `lfm3:latest` | Model that plays the villagers |
| `EMBERWICK_NARRATOR` | `gemma4:26b` | Model that writes the nightly chronicle (falls back to the actor) |
| `EMBERWICK_TURN_SECONDS` | `20` | Real seconds between villager turns; a village day is 192 turns |
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
