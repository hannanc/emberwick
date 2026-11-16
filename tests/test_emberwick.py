import os
import re
import shutil
import subprocess

import pytest

from tests.helpers import ROOT, seat


# ---------------------------------------------------------------- schedule and limits
@pytest.mark.parametrize("hh, mm, closed", [
    (11, 55, False), (12, 0, True), (12, 55, True), (13, 0, False), (18, 59, False), (19, 0, True), (21, 59, True)])
def test_breaks(world, hh, mm, closed):
    assert world.off_duty(hh * 60 + mm) is closed


@pytest.mark.parametrize("day, extra", [(0, 0), (45, 3), (10000, None)])
def test_population_limit_grows_and_is_capped(world, day, extra):
    world.S["day"] = day
    expected = world.PEOPLE_CEILING if extra is None else world.MAX_PEOPLE + extra
    assert world.max_people() == expected


# ---------------------------------------------------------------- text helpers
@pytest.mark.parametrize("text, expected", [("one two three", "one two three"), ("a b c d e f g h", "a b c d e f…")])
def test_gist_keeps_the_first_words_only(world, text, expected):
    assert world.gist(text) == expected


@pytest.mark.parametrize("second, repeats", [
    ("Read it slow, Ansel, every line!", True),
    ("Pass the salt and mind the hearth-iron.", False)])
def test_repeat_note_needs_an_almost_identical_line(world, second, repeats):
    world.S["agents"]["Bram"]["lines"] = ["Read it slow, Ansel, every line.", second]
    assert bool(world.repeat_note("Bram")) is repeats


def test_persona_has_friction_only_while_the_rival_lives(world):
    assert "Wren borrows tools" in world.persona("Tobias")
    del world.S["agents"]["Wren"]
    assert "Wren borrows tools" not in world.persona("Tobias")


def test_personas_have_no_doubled_stops(world):
    for n in world.S["agents"]:
        assert ".." not in world.persona(n)


def test_facts_say_age_sex_and_trade(world):
    assert re.fullmatch(r"Wren \(\d+, man, the fisher\)", world.facts("Wren"))


# ---------------------------------------------------------------- the turn
def take_turn(m, who="Bram", **answer):
    m.OVERRIDES.update(dict(say="Show me the tally and a hot cup.", activity="leaning on the bar", inner="tired"), **answer)
    m.pick_agent = lambda: who
    m.agent_turn()


def last_memory(m, n):
    return m.S["agents"][n]["memories"][-1]


@pytest.fixture
def tavern(world):
    seat(world, ["Bram", "Isolde", "Mira"], "Tavern")
    return world


def test_the_speaker_chooses_the_addressee(tavern):
    take_turn(tavern, to="Isolde")
    assert "said to me" in last_memory(tavern, "Isolde")
    assert "said to Isolde, something like" in last_memory(tavern, "Mira")
    assert tavern.S["agents"]["Bram"]["say_to"] == "Isolde"


def test_speaking_to_everyone_prompts_nobody_to_answer(tavern):
    take_turn(tavern, to="everyone")
    assert "said to all of us" in last_memory(tavern, "Mira")
    assert tavern.S["agents"]["Isolde"]["pending"] is None
    assert tavern.S["agents"]["Bram"]["say_to"] == ""


def test_muttering_to_nobody(tavern):
    take_turn(tavern, to="nobody")
    assert "muttered to myself" in last_memory(tavern, "Bram")


def test_an_invalid_addressee_falls_back_to_someone_here(tavern):
    take_turn(tavern, to="Zed")
    assert tavern.S["agents"]["Bram"]["say_to"] in ("Isolde", "Mira")


def test_no_to_field_when_alone(world):
    for n in world.S["agents"]:
        world.S["agents"][n]["place"] = "Dock" if n == "Bram" else "Cottages"
    take_turn(world)
    assert "to" not in world.CALLS[-1][2]["properties"]


@pytest.mark.parametrize("minute, offered", [(10 * 60, True), (12 * 60 + 30, False), (20 * 60, False)])
def test_work_is_offered_in_working_hours_and_closed_at_breaks(world, minute, offered):
    seat(world, ["Tobias"], "Woods")
    world.S["minute"] = minute
    take_turn(world, who="Tobias", to="nobody", say="")
    assert ("work" in world.CALLS[-1][2]["properties"]["action"]["enum"]) is offered


def test_the_room_talk_is_shown_in_full_to_the_next_speaker(world):
    seat(world, ["Bram", "Mira"], "Tavern")
    take_turn(world, who="Bram", to="Mira", say="The stew is scraped bare, Mira.")
    take_turn(world, who="Mira", to="Bram", say="Then bread it is.")
    prompt = world.CALLS[-1][1]
    assert "The talk here just now" in prompt
    assert "The stew is scraped bare, Mira." in prompt


# ---------------------------------------------------------------- the night
def run_night(m):
    m.S["minute"] = m.SLEEP
    m.night()


def test_reflection_fields_are_stored(make_world):
    m = make_world(dict(
        reflection="A day.", growth="My temper showed again; nothing has shifted.", milestone="",
        wake=dict(mood="flat", body="stiff", on_mind="debts", avoid="Wren", seek=""),
        worn="telling everyone to read slowly", remembered=["the cold stew", "Wren's joke"],
        grudges=[dict(who="Wren", why="borrowed my plane"), dict(who="Nobody", why="ignored")],
        feelings=[dict(name="Wren", feeling="reckless", closeness="cool", between_us="He owes me a plane."),
                  dict(name="Mira", feeling="kind", closeness="dear", between_us="")]))
    run_night(m)
    t = m.S["agents"]["Tobias"]
    assert t["wake"]["mood"] == "flat"
    assert t["worn"] == "telling everyone to read slowly"
    assert [g["who"] for g in t["grudges"]] == ["Wren"]               # the invalid name is dropped
    assert t["warmth"]["Wren"] == m.CLOSE_LABELS["cool"]
    assert t["warmth"]["Mira"] == m.CLOSE_LABELS["dear"]
    assert t["between"]["Wren"] == "He owes me a plane."
    assert len(t["recall"]) == 2


def test_the_reflection_asks_for_the_whole_day_and_for_faults(world):
    for i in range(60):
        world.remember("Bram", f"event {i}")
    run_night(world)
    prompts = [u for _, u, _ in world.CALLS if "between_us" in u]       # one reflection per villager
    bram = next(u for u in prompts if "event 59" in u)
    assert "event 0" in bram                                           # more than the old 30-line window
    assert all("the fault or habit of yours that showed again" in u for u in prompts)


def test_a_lone_survivor_can_still_reflect(make_world):
    m = make_world(dict(reflection="Alone."))
    for n in list(m.S["agents"]):
        if n != "Mira":
            del m.S["agents"][n]
    run_night(m)
    assert any("Alone." in r for r in m.S["agents"]["Mira"]["reflections"])


# ---------------------------------------------------------------- life and death
def build(m, owner, typ, n, x0=0):
    base = max([s["id"] for s in m.S["structures"]], default=0)
    for i in range(n):
        m.S["structures"].append(dict(id=base + i + 1, type=typ, owner=owner, site="Square", x=x0 + i, y=1,
                                      have={}, labour=0, done=True, helpers=[], day=1))


def test_an_heir_may_not_hoard_buildings(world):
    build(world, "Wren", "stall", world.OWN_LIMIT)                      # the heir is already at the limit
    build(world, "Hesper", "stall", 2, x0=10)
    world.S["agents"]["Hesper"]["will"] = "Wren"
    world.die("Hesper", "of a wasting sickness")
    for owner in {s["owner"] for s in world.S["structures"]}:
        assert world.owned(owner, "stall") <= world.OWN_LIMIT, owner
    assert len([s for s in world.S["structures"] if s["type"] == "stall"]) == world.OWN_LIMIT + 2   # nothing destroyed


def test_a_death_is_remembered_and_the_dead_are_listed(world):
    world.die("Hesper", "of old age")
    assert "Hesper" not in world.S["agents"]
    assert world.S["dead"][-1]["name"] == "Hesper"
    assert any("Hesper died" in x for x in world.S["agents"]["Mira"]["memories"])


def test_mourning_is_recorded_once(world):
    world.die("Hesper", "of old age")
    world.do_mourn("Mira", "Hesper")
    world.do_mourn("Mira", "Hesper")
    assert world.S["dead"][-1]["mourners"] == ["Mira"]


# ---------------------------------------------------------------- the page
@pytest.mark.skipif(not shutil.which("node"), reason="node is not installed")
def test_the_page_script_parses(tmp_path):
    html = (ROOT + "/index.html")
    with open(html, encoding="utf-8") as f:
        script = max(re.findall(r"<script[^>]*>(.*?)</script>", f.read(), re.S), key=len)
    path = tmp_path / "page.js"
    path.write_text(script, encoding="utf-8")
    result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


# ---------------------------------------------------------------- compression and incremental state
def test_gzip_choice():
    import gzip as gz
    from tests.helpers import module
    m = module()
    big = b"x" * 5000
    out, zipped = m.gzip_if_accepted(big, "gzip, deflate, br")
    assert zipped and gz.decompress(out) == big and len(out) < 200
    assert m.gzip_if_accepted(big, "") == (big, False)
    assert m.gzip_if_accepted(big, None) == (big, False)
    assert m.gzip_if_accepted(big, "gzip;q=0") == (big, False)
    assert m.gzip_if_accepted(b"small", "gzip") == (b"small", False)
    assert m.gzip_if_accepted(big, "gzip", "audio/wav") == (big, False)


def test_state_is_full_by_default_and_incremental_on_request(make_world):
    import json
    w = make_world()
    w.log_event(kind="note", text="one")
    w.log_event(kind="note", text="two")
    full = json.loads(w.state_json())
    assert full["partial"] is False and "chronicle" in full and "log" in full["oracle"]
    ids = [e["id"] for e in full["events"]]
    assert ids == sorted(ids) and len(ids) >= 2
    top = ids[-1]
    same = json.loads(w.state_json(top, full["chron_day"], full["oracle_id"]))
    assert same["partial"] is True and same["events"] == []
    assert "chronicle" not in same and "log" not in same["oracle"]
    assert same["agents"] and same["day"] == full["day"]
    w.log_event(kind="note", text="three")
    more = json.loads(w.state_json(top, full["chron_day"], full["oracle_id"]))
    assert [e["text"] for e in more["events"]] == ["three"]
    assert json.loads(w.state_json(top, None, None))["chronicle"] == full["chronicle"]
    ahead = json.loads(w.state_json(top + 1000, full["chron_day"], full["oracle_id"]))
    assert ahead["partial"] is False and "chronicle" in ahead and len(ahead["events"]) == len(full["events"]) + 1


def test_a_partial_poll_is_small_when_gzipped(make_world):
    import json
    w = make_world()
    full = json.loads(w.state_json())
    body2 = w.state_json(full["events"][-1]["id"] if full["events"] else 0, full["chron_day"], full["oracle_id"]).encode()
    assert len(w.gzip_if_accepted(body2, "gzip")[0]) < 10_000


def _serve(m):
    import threading
    from http.server import ThreadingHTTPServer
    srv = ThreadingHTTPServer(("127.0.0.1", 0), m.Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def test_http_compresses_state_only_when_asked(make_world):
    import gzip as gz, http.client, json
    w = make_world()
    srv = _serve(w)
    try:
        def get(path, **hdr):
            c = http.client.HTTPConnection("127.0.0.1", srv.server_port)
            c.request("GET", path, headers=hdr)
            r = c.getresponse()
            return r, r.read()
        r, raw = get("/api/state")
        assert r.getheader("Content-Encoding") is None and json.loads(raw)["partial"] is False
        r, z = get("/api/state?since=0&chron=0&oracle=0", **{"Accept-Encoding": "gzip"})
        assert r.getheader("Content-Encoding") == "gzip" and json.loads(gz.decompress(z))["agents"]
        r, bad = get("/api/state?since=abc", **{"Accept-Encoding": "gzip"})
        assert json.loads(gz.decompress(bad))["partial"] is False
    finally:
        srv.shutdown()


def test_unchanged_lists_are_skipped_by_hash(make_world):
    import json
    w = make_world()
    full = json.loads(w.state_json())
    assert "structures" in full and "wishes" in full and set(full["hashes"]) == {"structures", "wishes"}
    top = full["events"][-1]["id"] if full["events"] else 0
    part = json.loads(w.state_json(top, full["chron_day"], full["oracle_id"], full["hashes"]))
    assert "structures" not in part and "wishes" not in part and part["hashes"] == full["hashes"]
    stale = json.loads(w.state_json(top, full["chron_day"], full["oracle_id"], {"structures": "0" * 10, "wishes": "0" * 10}))
    assert "structures" in stale and "wishes" in stale
