#!/usr/bin/env python3
"""Salin basis data JualinAja dengan API backup SQLite.

Contoh:
    python3 tools/backup.py                 # simpan ke backups/, sisakan 7 terbaru
    python3 tools/backup.py --keep 14
    BUKATOKO_DB=/var/lib/bukatoko.db python3 tools/backup.py --dir /var/backups/bukatoko
"""

import argparse
import sqlite3
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    ap = argparse.ArgumentParser(description="Backup basis data JualinAja")
    ap.add_argument("--db", default=None, help="jalur basis data (default: bukatoko.db)")
    ap.add_argument("--dir", default=None, help="folder tujuan (default: ./backups)")
    ap.add_argument("--keep", type=int, default=7, help="jumlah salinan yang disimpan")
    args = ap.parse_args()

    src = Path(args.db) if args.db else Path(__import__("os").environ.get("BUKATOKO_DB") or ROOT / "bukatoko.db")
    if not src.is_file():
        print(f"basis data tidak ada: {src}", file=sys.stderr)
        return 1
    out_dir = Path(args.dir) if args.dir else ROOT / "backups"
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"bukatoko-{time.strftime('%Y%m%d-%H%M%S')}.db"

    source = sqlite3.connect(f"file:{src}?mode=ro", uri=True)
    dest = sqlite3.connect(target)
    try:
        source.backup(dest)
        dest.execute("PRAGMA integrity_check").fetchone()
    finally:
        dest.close()
        source.close()

    copies = sorted(out_dir.glob("bukatoko-*.db"))
    for old in copies[:-max(1, args.keep)]:
        old.unlink(missing_ok=True)
    print(f"backup: {target} ({target.stat().st_size} byte), tersimpan {min(len(copies), max(1, args.keep))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
