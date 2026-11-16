import pytest

from tests.helpers import fresh_world


@pytest.fixture
def world():
    """A fresh world in a temporary database, every model call stubbed."""
    return fresh_world()


@pytest.fixture
def make_world():
    """For tests that need the stubbed model to answer something specific: make_world(reflection="...")."""
    return fresh_world
