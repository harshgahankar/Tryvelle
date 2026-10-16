"""Isolate file side effects: uploads go to a temp dir, never backend/media/."""
import os
import tempfile

import pytest  # noqa: E402

_tmp = tempfile.mkdtemp(prefix="tryvelle-media-")
os.environ["STORAGE_LOCAL_DIR"] = _tmp
# Tests must never touch developer .env secrets (keys, admin passwords).
for _k in ("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
           "SETUP_ADMIN_EMAIL", "SETUP_ADMIN_PASSWORD"):
    os.environ[_k] = ""

from app.core.config import get_settings  # noqa: E402
from app.core.rate_limit import _hits  # noqa: E402

get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    _hits.clear()
    yield
    _hits.clear()
