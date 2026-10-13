"""Isolate file side effects: uploads go to a temp dir, never backend/media/."""
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="tryvelle-media-")
os.environ["STORAGE_LOCAL_DIR"] = _tmp

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()
