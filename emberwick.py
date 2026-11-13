#!/usr/bin/env python3
"""Emberwick — a tiny village that lives on this server.

Six villagers, each driven by a local Ollama model, walk around, talk, remember
and reflect. Every night a larger model writes the day's chronicle and invents
tomorrow's twist. Standard library only.  Open http://<server>:8377/
"""
import json, os, random, sqlite3, threading, time, urllib.request
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# ---------------------------------------------------------------- settings
PORT = int(os.environ.get("EMBERWICK_PORT", 8377))
BIND = os.environ.get("EMBERWICK_BIND", "0.0.0.0")
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
ACTOR = os.environ.get("EMBERWICK_ACTOR", "lfm3:latest")       # plays the villagers
NARRATOR = os.environ.get("EMBERWICK_NARRATOR", "gemma4:26b")  # writes the nightly chronicle
TURN_SECONDS = float(os.environ.get("EMBERWICK_TURN_SECONDS", 20))  # real seconds per villager turn
MINUTES_PER_TURN = 5          # village minutes per turn
WAKE, SLEEP = 6 * 60, 22 * 60
YIELD = os.environ.get("EMBERWICK_YIELD", "1") == "1"  # pause while Ollama serves other models

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(HERE, "emberwick.db")

PLACES = {  # name: (x, y, description) — tile coordinates on a 40x24 map
    "Square":   (20, 12, "the village square with its old stone well"),
    "Bakery":   (8, 6, "Mira's bakery, warm and smelling of bread"),
    "Garden":   (20, 4, "the herb garden, rows of plants and beehives"),
    "Tavern":   (32, 6, "the Gilded Newt tavern"),
    "Shrine":   (36, 13, "the shrine under the Old Oak"),
    "Library":  (31, 17, "the small stone library"),
    "Dock":     (20, 19, "the wooden dock on the lake"),
    "Workshop": (9, 17, "Tobias's carpentry workshop"),
    "Cottages": (3, 12, "Cottage Row, where everyone lives"),
}

CAST = {
    "Mira": dict(age=34, job="the baker", color="#e0703a", hair="#5a2d1a",
        traits="warm, nosy, superstitious, quick to laugh",
        goal="to win the midsummer fair's baking prize and to find out who keeps leaving wildflowers at your door",
        secret="you burned last year's prize loaf and blamed the oven",
        home="Bakery", feel={"Tobias": "reliable but grumpy", "Bram": "best gossip partner"}),
    "Tobias": dict(age=58, job="the carpenter", color="#7b8f4a", hair="#b9b9b0",
        traits="gruff, proud, sentimental underneath, few words",
        goal="to finish the sailboat you began with your late brother before the midsummer fair",
        secret="you are the one leaving wildflowers at Mira's door and would die of embarrassment if anyone knew",
        home="Workshop", feel={"Mira": "admires her, tongue-tied", "Wren": "reckless but good hands"}),
    "Isolde": dict(age=27, job="the librarian", color="#5b7fd1", hair="#22203a",
        traits="curious, anxious, bookish, dry wit",
        goal="to get someone to read your adventure manuscript and tell you honestly if it is good",
        secret="you write the anonymous adventure serials that everyone in the village reads",
        home="Library", feel={"Hesper": "fascinating, slightly frightening", "Bram": "too loud, kind"}),
    "Bram": dict(age=41, job="the tavern keeper", color="#c9a227", hair="#2b1b10",
        traits="jovial, generous, a shameless gossip, worries in private",
        goal="to keep the Gilded Newt open through the season and pay off what you owe",
        secret="you owe a great deal of money to a merchant from the city who is due to visit",
        home="Tavern", feel={"Mira": "dear friend", "Tobias": "owes me a table repair"}),
    "Wren": dict(age=19, job="the fisher", color="#3aa6a0", hair="#c4572e",
        traits="restless, daring, kind, speaks before thinking",
        goal="to leave Emberwick and see the sea, though you feel guilty about leaving the village behind",
        secret="you saw something large move under the lake and told no one",
        home="Dock", feel={"Tobias": "like a stern uncle", "Hesper": "knows more than she says"}),
    "Hesper": dict(age=73, job="the herbalist and shrine-keeper", color="#9a5fc0", hair="#e8e4da",
        traits="cryptic, sharp, mischievous, patient",
        goal="to find an apprentice worthy of the old knowledge before you grow too old",
        secret="you believe something ancient sleeps under the lake and that it is waking",
        home="Shrine", feel={"Isolde": "clever, could be the one", "Wren": "brave, never listens"}),
}
WEATHER = ["clear and bright", "warm sunshine", "light rain", "morning mist", "windy", "overcast",
           "steady rain", "thunderstorm", "golden haze", "clear and bright", "warm sunshine"]
TWISTS = ["A stranger in a travelling cloak arrived at dawn and is asking questions at the Square.",
          "The well in the Square has run dry overnight.",
          "Every boat at the Dock was found untied and drifting this morning.",
          "A sealed letter with no name on it was found nailed to the Old Oak.",
          "The bees have all left the Garden hives.",
          "A wooden chest washed up at the Dock, locked and humming faintly."]

lock = threading.RLock()
S = {}            # world state, persisted as JSON
status = "starting"

# ---------------------------------------------------------------- storage
def db():
    c = sqlite3.connect(DB, timeout=30)
    c.execute("PRAGMA journal_mode=WAL")
    return c

def init_db():
    with db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, day INT, minute INT, data TEXT)")
        c.execute("CREATE TABLE IF NOT EXISTS chronicle (day INT PRIMARY KEY, title TEXT, body TEXT, weather TEXT)")

def save():
    with db() as c:
        c.execute("INSERT OR REPLACE INTO kv VALUES ('state', ?)", (json.dumps(S),))

def log_event(**e):
    e.update(day=S["day"], minute=S["minute"])
    with db() as c:
        c.execute("INSERT INTO events (day, minute, data) VALUES (?,?,?)", (S["day"], S["minute"], json.dumps(e)))

def new_world():
    first = "Last night several people saw a green light glowing under the lake. The midsummer fair is nine days away."
    S.update(day=1, minute=WAKE, weather="morning mist", news=first, phase="day", chain=0, queue=[], agents={})
    for n, c in CAST.items():
        S["agents"][n] = dict(place=c["home"], activity="starting the day", say="", say_to="", say_at=0,
                              thought="", mood="calm", memories=[f"News this morning: {first}"],
                              today=[], reflections=[], feelings=dict(c["feel"]), pending=None, whisper="")

def load():
    init_db()
    with db() as c:
        row = c.execute("SELECT v FROM kv WHERE k='state'").fetchone()
    if row:
        S.update(json.loads(row[0]))
    else:
        new_world()
        log_event(kind="news", text=S["news"])
        save()

# ---------------------------------------------------------------- model calls
def chat(model, system, user, schema, keep_alive, num_predict=180, temperature=0.9):
    body = {"model": model, "stream": False, "think": False, "format": schema, "keep_alive": keep_alive,
            "options": {"temperature": temperature, "num_predict": num_predict},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    req = urllib.request.Request(OLLAMA + "/api/chat", json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=900) as r:
        return json.loads(json.load(r)["message"]["content"])

def other_models_busy():
    try:
        with urllib.request.urlopen(OLLAMA + "/api/ps", timeout=5) as r:
            names = [m["name"] for m in json.load(r).get("models", [])]
        return [n for n in names if n not in (ACTOR, NARRATOR)]
    except Exception:
        return []

def obj(props):
    return {"type": "object", "properties": props, "required": list(props)}

STR = {"type": "string"}
def clip(s, n):
    s = " ".join(str(s or "").split())
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"

def hhmm(m):
    return f"{m // 60:02d}:{m % 60:02d}"

def persona(n):
    c = CAST[n]
    return (f"You are {n}, {c['age']}, {c['job']} of Emberwick, a small lakeside village. "
            f"Personality: {c['traits']}. Deep down you want {c['goal']}. Your secret: {c['secret']}. "
            "Stay in character and speak in first person. Be concrete and specific. Move things forward: "
            "pursue what you want, react to news, seek people out; do not repeat what you already said or did. "
            "You are a person; never mention AI.")

def remember(n, text, today=True):
    a = S["agents"][n]
    line = f"[{hhmm(S['minute'])}] {text}"
    a["memories"] = (a["memories"] + [line])[-40:]
    if today:
        a["today"] = (a["today"] + [line])[-36:]

def time_hint(m):
    h = m / 60
    if h < 8: return "It is early morning; the village is waking up."
    if h < 12: return "It is the working morning."
    if h < 14: return "It is midday; people often eat at the Tavern or meet in the Square."
    if h < 18: return "It is the afternoon; time for work and errands."
    if h < 21: return "It is evening; people gather at the Tavern or the Square."
    return "It is late; time to head to the Cottages to sleep."

# ---------------------------------------------------------------- a villager's turn
def pick_agent():
    waiting = [n for n, a in S["agents"].items() if a["pending"]]
    if waiting and S["chain"] < 3:
        S["chain"] += 1
        return waiting[0]
    S["chain"] = 0
    if not S["queue"]:
        S["queue"] = random.sample(list(CAST), len(CAST))
    return S["queue"].pop()

def agent_turn():
    with lock:
        n = pick_agent()
        a = S["agents"][n]
        here = [o for o in S["agents"] if o != n and S["agents"][o]["place"] == a["place"]]
        where = {}
        for o, oa in S["agents"].items():
            if o != n:
                where.setdefault(oa["place"], []).append(o)
        pending, whisper = a["pending"], a["whisper"]
        u = [f"It is day {S['day']}, {hhmm(S['minute'])}. Weather: {S['weather']}. {time_hint(S['minute'])}",
             f"You are at the {a['place']} ({PLACES[a['place']][2]}), and were just {a['activity']}.",
             ("Here with you: " + "; ".join(f"{o} ({S['agents'][o]['activity']})" for o in here) + ".") if here
             else "Nobody else is here.",
             "Where the others are: " + "; ".join(f"{p}: {', '.join(v)}" for p, v in where.items()) + ".",
             f"Village news today: {S['news']}",
             "Your recent memories:\n" + "\n".join("- " + m for m in a["memories"][-7:])]
        if a["reflections"]:
            u.append("What you concluded on earlier nights:\n" + "\n".join("- " + r for r in a["reflections"][-2:]))
        if a["feelings"]:
            u.append("How you feel about people: " + "; ".join(f"{k}: {v}" for k, v in a["feelings"].items()) + ".")
        if pending and pending["from"] in here:
            u.append(f'{pending["from"]} just said to you: "{pending["text"]}" Answer them.')
        if whisper:
            u.append(f'A sudden, strangely vivid thought enters your mind, as if whispered: "{whisper}" You feel compelled to act on it.')
        u.append("Decide what you do in the next few minutes. Answer in JSON: "
                 '"thought" = one private sentence; "go_to" = a place name to walk there, or "stay"; '
                 '"activity" = 3 to 8 words for what you are doing, like "kneading rye dough"; '
                 '"say" = one or two sentences you say out loud to someone here, or "" to stay quiet; '
                 '"mood" = one word.')
        schema = obj({"thought": STR, "go_to": {"type": "string", "enum": ["stay"] + list(PLACES)},
                      "activity": STR, "say": STR, "mood": STR})
        system, user = persona(n), "\n".join(u)

    r = chat(ACTOR, system, user, schema, keep_alive=-1)

    with lock:
        a = S["agents"][n]
        a["pending"], a["whisper"] = None, ""
        old = a["place"]
        here = [o for o in S["agents"] if o != n and S["agents"][o]["place"] == old]
        say = clip(r.get("say"), 240)
        a["thought"], a["mood"] = clip(r.get("thought"), 200), clip(r.get("mood"), 20).lower()
        a["activity"] = clip(r.get("activity"), 70).rstrip(".") or "idling"
        if a["activity"][:1].isupper() and not a["activity"].startswith("I "):
            a["activity"] = a["activity"][0].lower() + a["activity"][1:]
        to = ""
        if say and here:
            to = pending["from"] if pending and pending["from"] in here else random.choice(here)
            remember(n, f'At the {old} I said to {to}: "{say}"')
            for o in here:
                remember(o, f'At the {old}, {n} said to {"me" if o == to else to}: "{say}"')
            S["agents"][to]["pending"] = {"from": n, "text": say}
        elif not here:
            say = ""
        a["say"], a["say_to"], a["say_at"] = say, to, time.time() if say else a["say_at"]
        go = r.get("go_to")
        moved = go in PLACES and go != old
        if moved:
            a["place"] = go
            remember(n, f"I left the {old} and walked to the {go}.")
        elif not say:
            remember(n, f"At the {old} I was {a['activity']}.")
        log_event(kind="turn", who=n, place=old, to_place=go if moved else "", activity=a["activity"],
                  say=say, to=to, thought=a["thought"], mood=a["mood"])
        S["minute"] += MINUTES_PER_TURN
        save()

# ---------------------------------------------------------------- night: reflection, chronicle, new day
def night():
    global status
    with lock:
        S["phase"] = "night"
        for a in S["agents"].values():
            a.update(place="Cottages", activity="sleeping", say="", pending=None)
        log_event(kind="night", text="Night falls over Emberwick. The villagers go home to sleep.")
        save()
        day, weather, news = S["day"], S["weather"], S["news"]

    for n in CAST:
        status = f"night — {n} is dreaming"
        with lock:
            today = list(S["agents"][n]["today"])
        others = [o for o in CAST if o != n]
        try:
            r = chat(ACTOR, persona(n),
                     "The day is over and you are in bed. This is what happened to you today:\n"
                     + "\n".join("- " + t for t in today[-30:]) +
                     '\nAnswer in JSON: "reflection" = one or two first-person sentences on what mattered most today '
                     'and what you intend to do tomorrow; "feelings" = how you now feel about each person you dealt '
                     "with today, 3 to 6 words each.",
                     obj({"reflection": STR, "feelings": {"type": "array", "items": obj(
                         {"name": {"type": "string", "enum": others}, "feeling": STR})}}),
                     keep_alive=-1, num_predict=220, temperature=0.7)
        except Exception:
            continue
        with lock:
            a = S["agents"][n]
            a["reflections"] = (a["reflections"] + [f"Day {day}: {clip(r.get('reflection'), 300)}"])[-5:]
            for f in (r.get("feelings") or [])[:5]:
                if f.get("name") in others and f.get("feeling"):
                    a["feelings"][f["name"]] = clip(f["feeling"], 50)
            save()

    status = "night — the chronicler is writing"
    with db() as c:
        rows = [json.loads(d) for (d,) in c.execute("SELECT data FROM events WHERE day=? ORDER BY id", (day,))]
    said = [e for e in rows if e.get("kind") == "turn" and e.get("say")]
    step = max(1, len(said) // 28)
    lines = [f'- {hhmm(e["minute"])} {e["place"]}, {e["who"]} to {e["to"]}: "{clip(e["say"], 150)}"' for e in said[::step]]
    with lock:
        refl = [f"- {n} ({CAST[n]['job']}): {S['agents'][n]['reflections'][-1] if S['agents'][n]['reflections'] else '…'}"
                for n in CAST]
    system = ("You are the chronicler of Emberwick, a small lakeside village. You write a wry, warm, vivid daily "
              "chronicle in the past tense, like a storybook narrator who knows everyone's business.")
    user = (f"Day {day}. Weather: {weather}. News that morning: {news}\n"
            "What each villager concluded at day's end:\n" + "\n".join(refl) +
            "\nThings said during the day:\n" + "\n".join(lines) +
            '\nAnswer in JSON: "title" = 3 to 6 words; "chronicle" = 120 to 170 words in at most two paragraphs, '
            'naming names and quoting at most one line; "omen" = ONE sentence stating a small, concrete, surprising '
            "event that happens in the village tomorrow morning and that the villagers will have to react to "
            "(nobody dies).")
    schema = obj({"title": STR, "chronicle": STR, "omen": STR})
    r = {}
    for model, keep in ((NARRATOR, "0s"), (ACTOR, -1)):
        try:
            r = chat(model, system, user, schema, keep_alive=keep, num_predict=600, temperature=0.8)
            if r.get("chronicle"):
                break
        except Exception:
            r = {}
    title = clip(r.get("title"), 80) or f"Day {day}"
    body = str(r.get("chronicle") or "The chronicler dozed off and wrote nothing tonight.").strip()[:2000]
    omen = clip(r.get("omen"), 260) or random.choice(TWISTS)

    with lock:
        with db() as c:
            c.execute("INSERT OR REPLACE INTO chronicle VALUES (?,?,?,?)", (day, title, body, weather))
        S.update(day=day + 1, minute=WAKE, weather=random.choice(WEATHER), news=omen, phase="day", chain=0)
        log_event(kind="chronicle", text=f"Day {day}: {title}")
        log_event(kind="news", text=omen)
        for n, a in S["agents"].items():
            a.update(today=[], pending=None, activity="waking up", mood="rested")
            remember(n, f"News this morning (day {S['day']}): {omen}")
        save()

def run():
    global status
    while True:
        t0 = time.time()
        try:
            busy = other_models_busy() if YIELD else []
            if busy:
                status = f"paused — Ollama is busy with {busy[0]}"
                time.sleep(15)
                continue
            if S["minute"] >= SLEEP:
                night()
            else:
                status = "running"
                agent_turn()
        except Exception as e:
            status = f"waiting — {type(e).__name__}: {e}"[:160]
            time.sleep(15)
        time.sleep(max(1.0, TURN_SECONDS - (time.time() - t0)))

# ---------------------------------------------------------------- web
def state_json():
    with db() as c:
        ev = [dict(json.loads(d), id=i) for i, d in c.execute("SELECT id, data FROM events ORDER BY id DESC LIMIT 80")]
        chron = [dict(day=d, title=t, body=b, weather=w) for d, t, b, w in
                 c.execute("SELECT day, title, body, weather FROM chronicle ORDER BY day DESC LIMIT 30")]
    with lock:
        agents = [dict(name=n, job=CAST[n]["job"], color=CAST[n]["color"], hair=CAST[n]["hair"], age=CAST[n]["age"],
                       traits=CAST[n]["traits"], place=a["place"], activity=a["activity"], say=a["say"],
                       say_to=a["say_to"], say_at=a["say_at"], thought=a["thought"], mood=a["mood"],
                       feelings=a["feelings"], reflection=(a["reflections"] or [""])[-1])
                  for n, a in S["agents"].items()]
        return json.dumps(dict(now=time.time(), day=S["day"], minute=S["minute"], weather=S["weather"],
                               news=S["news"], phase=S["phase"], status=status, agents=agents,
                               places={k: v[:2] for k, v in PLACES.items()}, events=ev[::-1], chronicle=chron,
                               models=dict(actor=ACTOR, narrator=NARRATOR)))

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send(self, code, body, ctype="application/json"):
        body = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            with open(os.path.join(HERE, "index.html"), "rb") as f:
                self.send(200, f.read(), "text/html")
        elif path == "/api/state":
            self.send(200, state_json())
        else:
            self.send(404, '{"error":"not found"}')

    def do_POST(self):
        if self.path != "/api/whisper":
            return self.send(404, '{"error":"not found"}')
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n > 2000: raise ValueError
            req = json.loads(self.rfile.read(n))
            text, to = clip(req.get("text"), 200), req.get("to")
            if not text: raise ValueError
        except Exception:
            return self.send(400, '{"error":"bad request"}')
        with lock:
            if to in S["agents"]:
                S["agents"][to]["whisper"] = text
                remember(to, f'A strange thought came to me as if whispered: "{text}"')
                log_event(kind="whisper", who=to, text=text)
            else:
                S["news"] = clip(S["news"] + " Also: " + text, 600)
                for name in S["agents"]:
                    remember(name, f"News went around the village: {text}")
                log_event(kind="news", text=text)
            save()
        self.send(200, '{"ok":true}')

if __name__ == "__main__":
    load()
    threading.Thread(target=run, daemon=True).start()
    print(f"Emberwick is awake on http://{BIND}:{PORT}/  (actor={ACTOR}, narrator={NARRATOR})", flush=True)
    ThreadingHTTPServer((BIND, PORT), Handler).serve_forever()
