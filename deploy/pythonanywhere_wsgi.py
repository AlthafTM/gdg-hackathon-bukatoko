"""Run from the WSGI configuration of a PythonAnywhere web app."""

import os
import sys
from pathlib import Path

state = Path.home() / ".bukatoko"
state.mkdir(mode=0o700, exist_ok=True)
os.environ["BUKATOKO_CLOUD"] = "1"
os.environ["BUKATOKO_DB"] = str(state / "bukatoko.db")
os.environ["BUKATOKO_UPLOAD_DIR"] = str(state / "uploads")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))

from server import init_db
from wsgi_adapter import application

init_db()
