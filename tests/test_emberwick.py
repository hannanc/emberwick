import json, os, re, shutil, subprocess, unittest

from tests.helpers import ROOT, fresh_world, seat


class Schedule(unittest.TestCase):
    def test_breaks(self):
        m = fresh_world()
        for hh, mm, closed in [(11, 55, False), (12, 0, True), (12, 55, True), (13, 0, False),
                               (18, 59, False), (19, 0, True), (21, 59, True)]:
            self.assertEqual(m.off_duty(hh * 60 + mm), closed, f"{hh:02d}:{mm:02d}")

    def test_population_limit_grows_and_is_capped(self):
        m = fresh_world()
        m.S["day"] = 0
        self.assertEqual(m.max_people(), m.MAX_PEOPLE)
        m.S["day"] = 45
        self.assertEqual(m.max_people(), m.MAX_PEOPLE + 3)
        m.S["day"] = 10000
        self.assertEqual(m.max_people(), m.PEOPLE_CEILING)


class Text(unittest.TestCase):
    def test_gist_keeps_the_first_words_only(self):
        m = fresh_world()
        self.assertEqual(m.gist("one two three"), "one two three")
        self.assertEqual(m.gist("a b c d e f g h"), "a b c d e f…")

    def test_repeat_note_needs_an_almost_identical_line(self):
        m = fresh_world()
        a = m.S["agents"]["Bram"]
        a["lines"] = ["Read it slow, Ansel, every line.", "Read it slow, Ansel, every line!"]
        self.assertTrue(m.repeat_note("Bram"))
        a["lines"] = ["Read it slow, Ansel, every line.", "Pass the salt and mind the hearth-iron."]
        self.assertEqual(m.repeat_note("Bram"), [])

    def test_persona_has_friction_only_while_the_rival_lives_and_no_doubled_stops(self):
        m = fresh_world()
        self.assertIn("Wren borrows tools", m.persona("Tobias"))
        del m.S["agents"]["Wren"]
        self.assertNotIn("Wren borrows tools", m.persona("Tobias"))
        for n in m.S["agents"]:
            self.assertNotIn("..", m.persona(n))

    def test_facts_say_age_sex_and_trade(self):
        m = fresh_world()
        self.assertRegex(m.facts("Wren"), r"Wren \(\d+, man, the fisher\)")


class Turn(unittest.TestCase):
    def take_turn(self, m, who="Bram", **say):
        m.OVERRIDES.update(dict(say="Show me the tally and a hot cup.", activity="leaning on the bar", inner="tired"), **say)
        m.pick_agent = lambda: who
        m.agent_turn()

    def memory(self, m, n):
        return m.S["agents"][n]["memories"][-1]

    def test_the_speaker_chooses_the_addressee(self):
        m = fresh_world()
        seat(m, ["Bram", "Isolde", "Mira"], "Tavern")
        self.take_turn(m, to="Isolde")
        self.assertIn("said to me", self.memory(m, "Isolde"))
        self.assertIn("said to Isolde, something like", self.memory(m, "Mira"))
        self.assertEqual(m.S["agents"]["Bram"]["say_to"], "Isolde")

    def test_everyone_and_nobody(self):
        m = fresh_world()
        seat(m, ["Bram", "Isolde", "Mira"], "Tavern")
        self.take_turn(m, to="everyone")
        self.assertIn("said to all of us", self.memory(m, "Mira"))
        self.assertIsNone(m.S["agents"]["Isolde"]["pending"])
        self.assertEqual(m.S["agents"]["Bram"]["say_to"], "")
        self.take_turn(m, to="nobody")
        self.assertIn("muttered to myself", self.memory(m, "Bram"))

    def test_an_invalid_addressee_falls_back_to_someone_here(self):
        m = fresh_world()
        seat(m, ["Bram", "Isolde", "Mira"], "Tavern")
        self.take_turn(m, to="Zed")
        self.assertIn(m.S["agents"]["Bram"]["say_to"], ("Isolde", "Mira"))

    def test_no_to_field_when_alone(self):
        m = fresh_world()
        seat(m, ["Bram"], "Dock")
        for n in m.S["agents"]:
            if n != "Bram":
                m.S["agents"][n]["place"] = "Cottages"
        self.take_turn(m)
        self.assertNotIn("to", m.CALLS[-1][2]["properties"])

    def test_work_is_offered_in_working_hours_and_closed_at_the_midday_break(self):
        m = fresh_world()
        seat(m, ["Tobias"], "Woods")
        for minute, offered in [(10 * 60, True), (12 * 60 + 30, False), (20 * 60, False)]:
            m.S["minute"] = minute
            self.take_turn(m, who="Tobias", to="nobody", say="")
            actions = m.CALLS[-1][2]["properties"]["action"]["enum"]
            self.assertEqual("work" in actions, offered, minute)

    def test_the_room_talk_is_shown_in_full_to_the_next_speaker(self):
        m = fresh_world()
        seat(m, ["Bram", "Mira"], "Tavern")
        self.take_turn(m, who="Bram", to="Mira", say="The stew is scraped bare, Mira.")
        self.take_turn(m, who="Mira", to="Bram", say="Then bread it is.")
        self.assertIn("The talk here just now", m.CALLS[-1][1])
        self.assertIn("The stew is scraped bare, Mira.", m.CALLS[-1][1])


class Night(unittest.TestCase):
    def run_night(self, m):
        m.S["minute"] = m.SLEEP
        m.night()

    def test_reflection_fields_are_stored(self):
        m = fresh_world(dict(
            reflection="A day.", growth="My temper showed again; nothing has shifted.", milestone="",
            wake=dict(mood="flat", body="stiff", on_mind="debts", avoid="Wren", seek=""),
            worn="telling everyone to read slowly", remembered=["the cold stew", "Wren's joke"],
            grudges=[dict(who="Wren", why="borrowed my plane"), dict(who="Nobody", why="ignored")],
            feelings=[dict(name="Wren", feeling="reckless", closeness="cool", between_us="He owes me a plane."),
                      dict(name="Mira", feeling="kind", closeness="dear", between_us="")]))
        self.run_night(m)
        t = m.S["agents"]["Tobias"]
        self.assertEqual(t["wake"]["mood"], "flat")
        self.assertEqual(t["worn"], "telling everyone to read slowly")
        self.assertEqual([g["who"] for g in t["grudges"]], ["Wren"])          # the invalid name is dropped
        self.assertEqual(t["warmth"]["Wren"], m.CLOSE_LABELS["cool"])
        self.assertEqual(t["warmth"]["Mira"], m.CLOSE_LABELS["dear"])
        self.assertEqual(t["between"]["Wren"], "He owes me a plane.")
        self.assertEqual(len([x for x in t["recall"]]), 2)

    def test_the_reflection_asks_for_the_whole_day_and_for_faults(self):
        m = fresh_world()
        seat(m, ["Bram", "Mira"], "Tavern")
        for i in range(60):
            m.remember("Bram", f"event {i}")
        self.run_night(m)
        prompts = [u for _, u, s in m.CALLS if "between_us" in u]               # one reflection per villager
        bram = next(u for u in prompts if "event 59" in u)
        self.assertIn("event 0", bram)                                          # more than the old 30-line window
        self.assertTrue(all("the fault or habit of yours that showed again" in u for u in prompts))

    def test_a_lone_survivor_can_still_reflect(self):
        m = fresh_world(dict(reflection="Alone."))
        for n in list(m.S["agents"]):
            if n != "Mira":
                del m.S["agents"][n]
        self.run_night(m)
        self.assertTrue(any("Alone." in r for r in m.S["agents"]["Mira"]["reflections"]))


class Life(unittest.TestCase):
    def build(self, m, owner, typ, n, x0=0):
        base = max([s["id"] for s in m.S["structures"]], default=0)
        for i in range(n):
            m.S["structures"].append(dict(id=base + i + 1, type=typ, owner=owner, site="Square", x=x0 + i, y=1,
                                          have={}, labour=0, done=True, helpers=[], day=1))

    def test_an_heir_may_not_hoard_buildings(self):
        m = fresh_world()
        self.build(m, "Wren", "stall", m.OWN_LIMIT)           # the heir is already at the limit
        self.build(m, "Hesper", "stall", 2, x0=10)
        m.S["agents"]["Hesper"]["will"] = "Wren"
        m.die("Hesper", "of a wasting sickness")
        for owner in {s["owner"] for s in m.S["structures"]}:
            self.assertLessEqual(m.owned(owner, "stall"), m.OWN_LIMIT, owner)
        self.assertEqual(len([s for s in m.S["structures"] if s["type"] == "stall"]), m.OWN_LIMIT + 2)   # nothing destroyed

    def test_a_death_is_remembered_and_the_dead_are_listed(self):
        m = fresh_world()
        m.die("Hesper", "of old age")
        self.assertNotIn("Hesper", m.S["agents"])
        self.assertEqual(m.S["dead"][-1]["name"], "Hesper")
        self.assertTrue(any("Hesper died" in x for x in m.S["agents"]["Mira"]["memories"]))

    def test_mourning_is_recorded_once(self):
        m = fresh_world()
        m.die("Hesper", "of old age")
        m.do_mourn("Mira", "Hesper")
        m.do_mourn("Mira", "Hesper")
        self.assertEqual(m.S["dead"][-1]["mourners"], ["Mira"])


class Page(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "node is not installed")
    def test_the_page_script_parses(self):
        with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
            html = f.read()
        script = max(re.findall(r"<script[^>]*>(.*?)</script>", html, re.S), key=len)
        path = os.path.join(os.environ.get("TMPDIR", "/tmp"), "emberwick_page_check.js")
        with open(path, "w", encoding="utf-8") as f:
            f.write(script)
        r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
