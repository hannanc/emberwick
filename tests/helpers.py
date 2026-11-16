"""Test helpers: load emberwick.py against a throwaway database with every model call stubbed.

Nothing here touches emberwick.db, the network or an API key."""
import importlib.util, os, random, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_mod = None


def module():
    global _mod
    if _mod is None:
        spec = importlib.util.spec_from_file_location("emberwick_under_test", os.path.join(ROOT, "emberwick.py"))
        _mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_mod)
    return _mod


def _fill(schema, over):
    """A valid answer for a JSON schema: the first enum value, empty text, 0, [] unless overridden by key."""
    t = schema.get("type")
    if t == "object":
        return {k: (over[k] if k in over else _fill(v, over)) for k, v in schema["properties"].items()}
    if t == "array":
        return []
    if t == "integer":
        return 0
    if "enum" in schema:
        return schema["enum"][0]
    return ""


def fresh_world(overrides=None):
    """A brand new world in a temporary database. m.OVERRIDES sets what the stubbed model answers (by field name);
    m.CALLS records (system, user, schema) for every model call."""
    m = module()
    m.DB = os.path.join(tempfile.mkdtemp(), "test.db")
    m.S.clear()
    m.ROOM_TALK.clear()
    m.YIELD = False
    random.seed(7)
    m.load()
    m.OVERRIDES, m.CALLS = dict(overrides or {}), []

    def deep(system, user, schema, num_predict=0, temperature=0):
        m.CALLS.append((system, user, schema))
        return _fill(schema, m.OVERRIDES), True

    def chat(model, system, user, schema, **kw):
        m.CALLS.append((system, user, schema))
        return _fill(schema, m.OVERRIDES)

    m.chat_deep, m.chat, m.unload = deep, chat, lambda *a, **k: None
    return m


def seat(m, names, place):
    for n in names:
        m.S["agents"][n]["place"] = place
