#!/usr/bin/env python3
"""Bukatoko: server demo (statis + API JSON + unggah foto).

Satu proses, tanpa dependensi pihak ketiga. Data di SQLite (bukatoko.db),
foto di uploads/. Jalankan: python3 server.py 8123
"""

from __future__ import annotations

import email
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from email import policy
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parent
UPLOAD_DIR = ROOT / "uploads"
DB_PATH = Path(os.environ.get("BUKATOKO_DB") or (ROOT / "bukatoko.db"))

MAX_BODY = 25 * 1024 * 1024
MAX_FILE_BYTES = 6 * 1024 * 1024
MAX_FILES = 10
ALLOWED_IMAGES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
SAFE_UPLOAD = re.compile(r"^[a-f0-9]{32}\.(jpg|png|webp|gif)$")
SESSION_DAYS = 30
UPLOADS_PER_HOUR = 80
UPLOADS_WINDOW = 3600

_upload_hits: dict[str, list[float]] = {}
_hits_lock = threading.Lock()


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wanted (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price_min INTEGER NOT NULL,
  price_max INTEGER NOT NULL,
  city TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_proposed ON offers(listing_id, buyer_id) WHERE status = 'proposed';
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  thread_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  stars INTEGER NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_review_per_listing ON reviews(listing_id, author_id);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  listing_id TEXT REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS saved (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, listing_id)
);
CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  params TEXT NOT NULL,
  created_at TEXT NOT NULL,
  seen_at TEXT NOT NULL
);
"""

SEED_USERS = [
    ("rangga.putra", "rangga@example.com"),
    ("dimas.wibowo", "dimas@example.com"),
    ("sri.wahyuni", "sri@example.com"),
    ("adit.nugroho", "adit@example.com"),
    ("fajar.ramadhan", "fajar@example.com"),
    ("laras.ayu", "laras@example.com"),
    ("agus.pramana", "agus@example.com"),
    ("bayu.setiawan", "bayu@example.com"),
    ("hendra.gunawan", "hendra@example.com"),
    ("intan.permata", "intan@example.com"),
]

SEED_LISTINGS = [
    ("l1001", "rangga.putra", "Kamera mirrorless Fujifilm X-T20 body saja", 5450000, 6200000, "elektronik", "Bekas, mulus", "Bandung",
     "Body saja, tanpa lensa. Tombol dan dial semua berfungsi, sensor bersih tanpa jamur. Baterai original dua, charger, dan kotak ada.\nAlasan jual: pindah ke X-S20. Bisa COD di Dago atau kirim via JNE.", 5, "2026-11-05T02:20:00+00:00"),
    ("l1002", "dimas.wibowo", "Sepatu Vans Old Skool ukuran 42", 385000, 500000, "fesyen", "Bekas, pemakaian ringan", "Jakarta Selatan",
     "Dipakai sekitar 6 kali. Sol masih tebal, tidak ada sobek atau lem lepas. Insole original ikut.\nUkuran 42, muat untuk kaki 26.5 cm.", 4, "2026-11-06T07:05:00+00:00"),
    ("l1003", "sri.wahyuni", "Kulkas satu pintu Sharp 168 liter", 1250000, None, "rumah", "Bekas, berfungsi normal", "Surabaya",
     "Pindahan kontrakan, tidak bisa dibawa. Freon sudah dicek teknisi bulan lalu, dingin normal, karet pintu masih rapat.\nDiambil sendiri di Rungkut, bawa pikap.", 3, "2026-11-04T03:30:00+00:00"),
    ("l1004", "adit.nugroho", "Nintendo Switch OLED plus 3 game fisik", 3900000, 4300000, "hobi", "Bekas, mulus", "Yogyakarta",
     "Layar OLED tanpa goresan, sudah pakai tempered glass sejak hari pertama. Joy-Con tidak drifting.\nGame: Mario Kart 8, Zelda TOTK, Animal Crossing.", 6, "2026-11-06T12:40:00+00:00"),
    ("l1005", "rangga.putra", "Meja kerja kayu jati 120 cm", 950000, None, "rumah", "Bekas, ada bekas pakai", "Bandung",
     "Kayu jati solid, finishing wax. Ada bekas gelas di sudut kanan, tidak terlalu kelihatan.\nBongkar pasang sendiri, saya simpan bautnya. Tinggi 74 cm.", 4, "2026-11-03T01:15:00+00:00"),
    ("l1006", "fajar.ramadhan", "iPhone 12 128GB baterai 86 persen", 4700000, 5100000, "ponsel", "Bekas, minus kecil", "Jakarta Pusat",
     "Fullset dengan dus dan kabel. Baterai 86 persen. Ada baret halus di frame kiri bawah, layar bersih tanpa shadow.\nFace ID dan kamera normal.", 5, "2026-11-07T00:10:00+00:00"),
    ("l1007", "laras.ayu", "Set buku Sastra Indonesia, 12 judul", 240000, None, "buku", "Bekas, kondisi baik", "Semarang",
     "Dijual satu set, tidak dipecah. Isi: Pramoedya, Ayu Utami, Eka Kurniawan, dan beberapa antologi puisi.\nAda lipatan di cover dua buku.", 3, "2026-11-02T06:00:00+00:00"),
    ("l1008", "agus.pramana", "Helm retro Bogo ukuran M", 275000, 340000, "otomotif", "Bekas, pemakaian ringan", "Denpasar",
     "Ukuran M, busa dalam masih tebal dan sudah dicuci. Visor bening tanpa baret berarti.\nSNI ada, tali dagu lengkap.", 4, "2026-11-05T09:45:00+00:00"),
    ("l1009", "bayu.setiawan", "Gitar akustik Yamaha F310", 780000, None, "hobi", "Bekas, bunyi bagus", "Malang",
     "Sudah disetup di luthier bulan September, senar baru Elixir. Neck lurus, fret masih tinggi.\nAda lecet di bodi bawah.", 4, "2026-11-01T04:20:00+00:00"),
    ("l1010", "hendra.gunawan", "Sepeda lipat Element Ecosmo 20 inci", 1650000, 1950000, "olahraga", "Bekas, terawat", "Tangerang",
     "Rantai dan bearing baru diganti, rem depan-belakang pakem. Lipatan kencang tidak goyang.\nBonus lampu depan dan tas rangka.", 5, "2026-11-05T23:30:00+00:00"),
    ("l1011", "fajar.ramadhan", "Monitor LG 24 inci IPS 75Hz", 890000, None, "elektronik", "Bekas, normal", "Bekasi",
     "Panel IPS tanpa dead pixel, sudah dites pakai layar putih dan hitam. Kabel HDMI dan adaptor included.\nStandar VESA.", 3, "2026-11-04T13:00:00+00:00"),
    ("l1012", "laras.ayu", "Kopi manual brew set, V60 dan grinder", 420000, None, "rumah", "Bekas, mulus", "Bandung",
     "V60 keramik ukuran 02, server 600 ml, dan grinder manual Timemore C2. Semua sudah dicuci bersih.", 4, "2026-11-05T00:55:00+00:00"),
    ("l1013", "intan.permata", "Jaket denim Levi's vintage, size L", 340000, 420000, "fesyen", "Bekas, kondisi baik", "Jakarta Barat",
     "Model trucker klasik, wash medium. Kancing lengkap, jahitan kuat.\nSize L, lingkar dada 112 cm, panjang 68 cm.", 5, "2026-11-03T10:25:00+00:00"),
    ("l1014", "adit.nugroho", "Rak buku kayu minimalis 4 tingkat", 310000, None, "rumah", "Bekas, kokoh", "Sleman",
     "Kayu pinus finishing clear. Tinggi 150 cm, lebar 60 cm. Bisa muat sekitar 120 buku.\nBongkar pasang, baut lengkap.", 3, "2026-10-31T02:00:00+00:00"),
]

SEED_WANTED = [
    ("w2001", "laras.ayu", "Cari laptop bekas buat kuliah arsitektur", "elektronik", 4000000, 6000000, "Bandung",
     "Minimal RAM 16GB dan ada GPU diskrit. Tidak masalah bodi lecet asal layar dan keyboard normal.", "2026-11-06T01:00:00+00:00"),
    ("w2002", "sri.wahyuni", "Butuh stroller bayi, merk apa saja", "rumah", 300000, 800000, "Jakarta Selatan",
     "Yang bisa dilipat dan masuk bagasi motor. Roda masih halus.", "2026-11-05T08:30:00+00:00"),
    ("w2003", "adit.nugroho", "Cari kamera analog Pentax atau Canon", "hobi", 700000, 1500000, "Yogyakarta",
     "Light meter masih jalan, shutter tidak macet. Boleh body only.", "2026-11-04T05:10:00+00:00"),
    ("w2004", "dimas.wibowo", "Cari sepatu futsal ukuran 43", "olahraga", 150000, 350000, "Surabaya",
     "Sol gum rubber, bukan sol karet keras.", "2026-11-03T11:45:00+00:00"),
    ("w2005", "intan.permata", "Buku resep masakan Indonesia, terbitan lama", "buku", 50000, 150000, "Semarang",
     "Yang resepnya masih pakai takaran sendok. Kondisi boleh berjamur sedikit.", "2026-11-02T00:20:00+00:00"),
]


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"pbkdf2$200000${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, rounds, salt_hex, digest_hex = stored.split("$")
        if algo != "pbkdf2":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def init_db() -> None:
    conn = db()
    try:
        conn.executescript(SCHEMA)
        if conn.execute("SELECT COUNT(*) AS n FROM listings").fetchone()["n"] == 0:
            seed(conn)
        conn.commit()
    finally:
        conn.close()


def seed(conn: sqlite3.Connection) -> None:
    stamp = now_iso()
    ids = {}
    for name, mail in SEED_USERS:
        cur = conn.execute(
            "INSERT INTO users (name, email, pass_hash, created_at) VALUES (?,?,?,?)",
            (name, mail, hash_password("demo1234"), stamp),
        )
        ids[name] = cur.lastrowid
    for (lid, owner, title, price, old, cat, cond, city, desc, nphotos, created) in SEED_LISTINGS:
        conn.execute(
            "INSERT INTO listings (id, owner_id, title, price, old_price, category, condition, city, description, status, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,'active',?)",
            (lid, ids[owner], title, price, old, cat, cond, city, desc, created),
        )
        for i in range(nphotos):
            conn.execute("INSERT INTO photos (listing_id, url, position) VALUES (?,?,?)", (lid, "", i))
    for (wid, owner, title, cat, lo, hi, city, note, created) in SEED_WANTED:
        conn.execute(
            "INSERT INTO wanted (id, owner_id, title, category, price_min, price_max, city, note, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (wid, ids[owner], title, cat, lo, hi, city, note, created),
        )


# ---------------------------------------------------------------- bantu

def public_user(conn: sqlite3.Connection, uid: int) -> dict:
    row = conn.execute("SELECT id, name, created_at FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return {"id": 0, "name": "tidak dikenal", "joined": ""}
    return {"id": row["id"], "name": row["name"], "joined": (row["created_at"] or "")[:7]}


def blocked_ids(conn: sqlite3.Connection, uid: int | None) -> set[int]:
    if not uid:
        return set()
    rows = conn.execute(
        "SELECT blocked_id FROM blocks WHERE blocker_id=? UNION SELECT blocker_id FROM blocks WHERE blocked_id=?",
        (uid, uid),
    ).fetchall()
    return {r[0] for r in rows}


def listing_json(conn: sqlite3.Connection, row: sqlite3.Row, viewer: int | None = None) -> dict:
    photos = [r["url"] for r in conn.execute(
        "SELECT url FROM photos WHERE listing_id=? ORDER BY position, id", (row["id"],))]
    real = [p for p in photos if p]
    owner = public_user(conn, row["owner_id"])
    saved = False
    if viewer:
        saved = bool(conn.execute("SELECT 1 FROM saved WHERE user_id=? AND listing_id=?",
                                  (viewer, row["id"])).fetchone())
    offers = conn.execute("SELECT COUNT(*) FROM offers WHERE listing_id=? AND status='proposed'",
                          (row["id"],)).fetchone()[0]
    return {
        "id": row["id"],
        "title": row["title"],
        "price": row["price"],
        "old_price": row["old_price"],
        "category": row["category"],
        "condition": row["condition"],
        "city": row["city"],
        "description": row["description"],
        "status": row["status"],
        "created_at": row["created_at"],
        "owner": owner,
        "photo_urls": real,
        "photo_count": len(photos) or 1,
        "saved": saved,
        "open_offers": offers,
    }


LISTING_COLS = "id, owner_id, title, price, old_price, category, condition, city, description, status, created_at"


def query_listings(conn: sqlite3.Connection, params: dict, viewer: int | None) -> dict:
    where, args = ["1=1"], []
    q = (params.get("q") or "").strip()
    if q:
        where.append("(lower(title) LIKE ? OR lower(description) LIKE ? OR lower(category) LIKE ?)")
        like = f"%{q.lower()}%"
        args += [like, like, like]
    for key, col in (("kat", "category"), ("city", "city")):
        val = (params.get(key) or "").strip()
        if val:
            where.append(f"{col} = ?")
            args.append(val)
    kond = (params.get("kondisi") or "").strip()
    if kond:
        where.append("condition LIKE ?")
        args.append(f"%{kond}%")
    for key, op in (("min", ">="), ("max", "<=")):
        raw = (params.get(key) or "").strip()
        if raw.isdigit():
            where.append(f"price {op} ?")
            args.append(int(raw))
    status = (params.get("status") or "active").strip()
    if status in {"active", "sold", "all"}:
        if status != "all":
            where.append("status = ?")
            args.append(status)
    owner = (params.get("owner") or "").strip()
    if owner.isdigit():
        where.append("owner_id = ?")
        args.append(int(owner))
    banned = blocked_ids(conn, viewer)
    if banned:
        where.append("owner_id NOT IN (%s)" % ",".join("?" * len(banned)))
        args += list(banned)

    order = {"murah": "price ASC", "mahal": "price DESC", "baru": "created_at DESC"}.get(
        (params.get("sort") or "baru"), "created_at DESC")
    limit = min(max(int((params.get("limit") or "24").isdigit() and params.get("limit") or 24), 1), 100) \
        if str(params.get("limit") or "").isdigit() else 24
    offset = int(params.get("offset") or 0) if str(params.get("offset") or "").isdigit() else 0

    sql_where = " AND ".join(where)
    total = conn.execute(f"SELECT COUNT(*) FROM listings WHERE {sql_where}", args).fetchone()[0]
    rows = conn.execute(
        f"SELECT {LISTING_COLS} FROM listings WHERE {sql_where} ORDER BY {order} LIMIT ? OFFSET ?",
        args + [limit, offset],
    ).fetchall()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(rows) < total,
        "items": [listing_json(conn, r, viewer) for r in rows],
    }


def query_wanted(conn: sqlite3.Connection, params: dict, viewer: int | None) -> dict:
    rows = conn.execute("SELECT * FROM wanted ORDER BY created_at DESC LIMIT 60").fetchall()
    banned = blocked_ids(conn, viewer)
    items = []
    for r in rows:
        if r["owner_id"] in banned:
            continue
        items.append({
            "id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "price_min": r["price_min"],
            "price_max": r["price_max"],
            "city": r["city"],
            "note": r["note"],
            "created_at": r["created_at"],
            "owner": public_user(conn, r["owner_id"]),
        })
    return {"items": items, "total": len(items)}


def review_rows(conn: sqlite3.Connection, subject_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT r.*, u.name AS author, l.title AS listing_title FROM reviews r "
        "JOIN users u ON u.id = r.author_id JOIN listings l ON l.id = r.listing_id "
        "WHERE r.subject_id=? ORDER BY r.created_at DESC", (subject_id,)).fetchall()
    return [{
        "id": r["id"], "author": r["author"], "role": r["role"], "stars": r["stars"],
        "body": r["body"], "created_at": r["created_at"], "listing_title": r["listing_title"],
    } for r in rows]


def rating_summary(conn: sqlite3.Connection, subject_id: int) -> dict:
    row = conn.execute("SELECT COUNT(*) n, AVG(stars) avg FROM reviews WHERE subject_id=?",
                       (subject_id,)).fetchone()
    return {"count": row["n"], "average": round(row["avg"], 1) if row["avg"] else None}


def new_matches(conn: sqlite3.Connection, uid: int) -> int:
    total = 0
    for row in conn.execute("SELECT params, seen_at FROM searches WHERE user_id=?", (uid,)):
        try:
            params = json.loads(row["params"])
        except json.JSONDecodeError:
            continue
        res = query_listings(conn, params, uid)
        ids = [i["id"] for i in res["items"] if i["created_at"] > row["seen_at"]]
        total += len(ids)
    return total


def unread_messages(conn: sqlite3.Connection, uid: int) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM messages WHERE read_at IS NULL AND sender_id<>? AND "
        "(thread_user=? OR listing_id IN (SELECT id FROM listings WHERE owner_id=?))",
        (uid, uid, uid)).fetchone()[0]


def incoming_offers(conn: sqlite3.Connection, uid: int) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM offers o JOIN listings l ON l.id=o.listing_id "
        "WHERE l.owner_id=? AND o.status='proposed' AND o.buyer_id<>?", (uid, uid)).fetchone()[0]


# ---------------------------------------------------------------- GET

def api_get(path: str, query: dict, uid: int | None, conn: sqlite3.Connection):
    def q(name, default=""):
        return (query.get(name) or [default])[0]

    if path == "/api/me":
        if not uid:
            return 200, {"user": None}
        me = public_user(conn, uid)
        me["email"] = conn.execute("SELECT email FROM users WHERE id=?", (uid,)).fetchone()[0]
        me["rating"] = rating_summary(conn, uid)
        me["counts"] = {
            "saved": conn.execute("SELECT COUNT(*) FROM saved WHERE user_id=?", (uid,)).fetchone()[0],
            "listings": conn.execute("SELECT COUNT(*) FROM listings WHERE owner_id=?", (uid,)).fetchone()[0],
            "wanted": conn.execute("SELECT COUNT(*) FROM wanted WHERE owner_id=?", (uid,)).fetchone()[0],
            "unread": unread_messages(conn, uid),
            "offers": incoming_offers(conn, uid),
            "matches": new_matches(conn, uid),
        }
        return 200, me

    if path == "/api/listings":
        return 200, query_listings(conn, {k: q(k) for k in
                                          ("q", "kat", "city", "kondisi", "min", "max", "sort", "status", "owner", "limit", "offset")}, uid)

    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)", path)
    if m:
        row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        data = listing_json(conn, row, uid)
        is_owner = uid == row["owner_id"]
        data["is_owner"] = is_owner
        data["rating"] = rating_summary(conn, row["owner_id"])
        data["reviews"] = review_rows(conn, row["owner_id"])[:6]
        data["can_review"] = review_eligibility(conn, row["id"], uid, row["owner_id"])
        data["offers"] = []
        if is_owner:
            data["offers"] = [{
                "id": o["id"], "amount": o["amount"], "status": o["status"], "message": o["message"],
                "created_at": o["created_at"], "buyer": public_user(conn, o["buyer_id"]),
            } for o in conn.execute(
                "SELECT * FROM offers WHERE listing_id=? ORDER BY created_at DESC", (row["id"],))]
        elif uid:
            mine = conn.execute(
                "SELECT * FROM offers WHERE listing_id=? AND buyer_id=? ORDER BY created_at DESC LIMIT 1",
                (row["id"], uid)).fetchone()
            if mine:
                data["my_offer"] = {"id": mine["id"], "amount": mine["amount"], "status": mine["status"]}
        return 200, data

    if path == "/api/wanted":
        return 200, query_wanted(conn, {k: q(k) for k in ("kat", "q")}, uid)

    m = re.fullmatch(r"/api/users/([^/]+)", path)
    if m:
        row = conn.execute("SELECT id, name, created_at FROM users WHERE name=?",
                           (unquote(m.group(1)),)).fetchone()
        if not row:
            return 404, {"error": "pengguna tidak ditemukan"}
        listings = query_listings(conn, {"owner": str(row["id"]), "status": "all", "limit": "60"}, uid)
        blocked = uid is not None and row["id"] in blocked_ids(conn, uid)
        return 200, {
            "user": dict(row) | {"joined": (row["created_at"] or "")[:7], "blocked": blocked},
            "rating": rating_summary(conn, row["id"]),
            "reviews": review_rows(conn, row["id"]),
            "listings": listings["items"],
            "is_self": uid == row["id"],
        }

    if path == "/api/offers":
        if not uid:
            return 401, {"error": "masuk dulu"}
        incoming = conn.execute(
            "SELECT o.*, l.title, l.price FROM offers o JOIN listings l ON l.id=o.listing_id "
            "WHERE l.owner_id=? ORDER BY o.created_at DESC", (uid,)).fetchall()
        outgoing = conn.execute(
            "SELECT o.*, l.title, l.price FROM offers o JOIN listings l ON l.id=o.listing_id "
            "WHERE o.buyer_id=? ORDER BY o.created_at DESC", (uid,)).fetchall()

        def pack(rows, side):
            out = []
            for r in rows:
                other_id = r["buyer_id"] if side == "masuk" else conn.execute(
                    "SELECT owner_id FROM listings WHERE id=?", (r["listing_id"],)).fetchone()[0]
                out.append({
                    "id": r["id"], "listing_id": r["listing_id"], "listing_title": r["title"],
                    "price": r["price"], "amount": r["amount"], "message": r["message"],
                    "status": r["status"], "created_at": r["created_at"], "side": side,
                    "with": public_user(conn, other_id),
                })
            return out

        return 200, {"incoming": pack(incoming, "masuk"), "outgoing": pack(outgoing, "keluar")}

    if path == "/api/inbox":
        if not uid:
            return 401, {"error": "masuk dulu"}
        rows = conn.execute(
            "SELECT listing_id, thread_user, MAX(created_at) AS last_at, COUNT(*) AS n FROM messages "
            "WHERE thread_user=? OR listing_id IN (SELECT id FROM listings WHERE owner_id=?) "
            "GROUP BY listing_id, thread_user ORDER BY last_at DESC LIMIT 40",
            (uid, uid)).fetchall()
        threads = []
        for r in rows:
            listing = conn.execute("SELECT id, title, owner_id FROM listings WHERE id=?",
                                   (r["listing_id"],)).fetchone()
            if not listing:
                continue
            other_id = r["thread_user"] if uid == listing["owner_id"] else listing["owner_id"]
            last = conn.execute("SELECT body, sender_id, created_at FROM messages WHERE listing_id=? AND thread_user=? "
                                "ORDER BY created_at DESC LIMIT 1", (r["listing_id"], r["thread_user"])).fetchone()
            unread = conn.execute(
                "SELECT COUNT(*) FROM messages WHERE listing_id=? AND thread_user=? AND read_at IS NULL AND sender_id<>?",
                (r["listing_id"], r["thread_user"], uid)).fetchone()[0]
            threads.append({
                "listing_id": listing["id"], "listing_title": listing["title"],
                "buyer": public_user(conn, r["thread_user"]),
                "other": public_user(conn, other_id),
                "last_message": last["body"] if last else "", "last_at": r["last_at"],
                "unread": unread, "count": r["n"],
            })
        return 200, {"threads": threads, "unread": unread_messages(conn, uid)}

    if path == "/api/messages":
        if not uid:
            return 401, {"error": "masuk dulu"}
        listing_id = q("listing")
        with_raw = q("with")
        row = conn.execute("SELECT id, owner_id, title FROM listings WHERE id=?", (listing_id,)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        if with_raw.isdigit():
            other = int(with_raw)
        elif uid == row["owner_id"]:
            # Penjual tanpa parameter: pakai thread terakhir yang ada di barang ini
            last = conn.execute("SELECT thread_user FROM messages WHERE listing_id=? "
                                "ORDER BY created_at DESC LIMIT 1", (listing_id,)).fetchone()
            other = last["thread_user"] if last else 0
        else:
            other = row["owner_id"]
        if uid == row["owner_id"]:
            thread_user = other
        else:
            thread_user = uid
        if not thread_user:
            return 200, {"messages": [], "listing": {"id": row["id"], "title": row["title"]},
                         "other": public_user(conn, row["owner_id"])}
        msgs = conn.execute(
            "SELECT m.*, u.name AS sender FROM messages m JOIN users u ON u.id=m.sender_id "
            "WHERE m.listing_id=? AND m.thread_user=? ORDER BY m.created_at", (listing_id, thread_user)).fetchall()
        conn.execute("UPDATE messages SET read_at=? WHERE listing_id=? AND thread_user=? AND sender_id<>? AND read_at IS NULL",
                     (now_iso(), listing_id, thread_user, uid))
        conn.commit()
        return 200, {
            "listing": {"id": row["id"], "title": row["title"], "owner_id": row["owner_id"]},
            "other": public_user(conn, other if uid == row["owner_id"] else row["owner_id"]),
            "messages": [{"id": m["id"], "body": m["body"], "sender": m["sender"],
                          "sender_id": m["sender_id"], "created_at": m["created_at"],
                          "mine": m["sender_id"] == uid} for m in msgs],
        }

    if path == "/api/saved":
        if not uid:
            return 200, {"items": []}
        rows = conn.execute(
            f"SELECT {LISTING_COLS} FROM listings WHERE id IN (SELECT listing_id FROM saved WHERE user_id=?) "
            "ORDER BY created_at DESC", (uid,)).fetchall()
        return 200, {"items": [listing_json(conn, r, uid) for r in rows]}

    if path == "/api/searches":
        if not uid:
            return 200, {"items": []}
        items = []
        for row in conn.execute("SELECT * FROM searches WHERE user_id=? ORDER BY created_at DESC", (uid,)):
            params = json.loads(row["params"])
            res = query_listings(conn, params, uid)
            fresh = [i for i in res["items"] if i["created_at"] > row["seen_at"]]
            items.append({"id": row["id"], "params": params, "created_at": row["created_at"],
                          "new_count": len(fresh), "total": res["total"],
                          "sample": [{"id": i["id"], "title": i["title"]} for i in fresh[:3]]})
        return 200, {"items": items}

    if path == "/api/notifications":
        if not uid:
            return 200, {"unread": 0, "offers": 0, "matches": 0}
        return 200, {"unread": unread_messages(conn, uid), "offers": incoming_offers(conn, uid),
                     "matches": new_matches(conn, uid)}

    return 404, {"error": "endpoint tidak dikenal"}


def review_eligibility(conn: sqlite3.Connection, listing_id: str, uid: int | None, owner_id: int) -> bool:
    """Boleh menulis ulasan hanya kalau ada tawaran yang diterima dan belum pernah mengulas."""
    if not uid or uid == owner_id:
        return False
    if conn.execute("SELECT 1 FROM reviews WHERE listing_id=? AND author_id=?",
                    (listing_id, uid)).fetchone():
        return False
    return bool(conn.execute(
        "SELECT 1 FROM offers WHERE listing_id=? AND buyer_id=? AND status='accepted'",
        (listing_id, uid)).fetchone())


def review_eligibility_owner(conn: sqlite3.Connection, listing_id: str, uid: int, owner_id: int) -> bool:
    if uid != owner_id:
        return False
    if conn.execute("SELECT 1 FROM reviews WHERE listing_id=? AND author_id=?",
                    (listing_id, uid)).fetchone():
        return False
    return bool(conn.execute(
        "SELECT 1 FROM offers WHERE listing_id=? AND status='accepted'", (listing_id,)).fetchone())


# ---------------------------------------------------------------- akun

def create_session(conn: sqlite3.Connection, uid: int) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)",
                 (token, uid, now_iso(),
                  (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).replace(microsecond=0).isoformat()))
    conn.commit()
    return token


def session_user(conn: sqlite3.Connection, token: str | None) -> int | None:
    if not token:
        return None
    row = conn.execute("SELECT user_id, expires_at FROM sessions WHERE token=?", (token,)).fetchone()
    if not row:
        return None
    if row["expires_at"] < now_iso():
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
        return None
    return row["user_id"]


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
NAME_RE = re.compile(r"^[a-zA-Z0-9._-]{3,24}$")


# ---------------------------------------------------------------- POST

def api_post(path: str, body: dict, uid: int | None, conn: sqlite3.Connection):
    if path == "/api/signup":
        name = (body.get("name") or "").strip().lower()
        mail = (body.get("email") or "").strip().lower()
        pw = body.get("password") or ""
        if not NAME_RE.match(name):
            return 400, {"error": "Nama 3-24 karakter: huruf, angka, titik, garis bawah, atau strip."}
        if not EMAIL_RE.match(mail):
            return 400, {"error": "Alamat email tidak valid."}
        if len(pw) < 8:
            return 400, {"error": "Kata sandi minimal 8 karakter."}
        if conn.execute("SELECT 1 FROM users WHERE name=? OR email=?", (name, mail)).fetchone():
            return 409, {"error": "Nama atau email sudah dipakai."}
        cur = conn.execute("INSERT INTO users (name, email, pass_hash, created_at) VALUES (?,?,?,?)",
                           (name, mail, hash_password(pw), now_iso()))
        conn.commit()
        return 200, {"token": create_session(conn, cur.lastrowid), "user": public_user(conn, cur.lastrowid)}

    if path == "/api/login":
        mail = (body.get("email") or "").strip().lower()
        pw = body.get("password") or ""
        row = conn.execute("SELECT id, pass_hash FROM users WHERE email=? OR name=?", (mail, mail)).fetchone()
        if not row or not verify_password(pw, row["pass_hash"]):
            return 401, {"error": "Email atau kata sandi salah."}
        return 200, {"token": create_session(conn, row["id"]), "user": public_user(conn, row["id"])}

    if path == "/api/logout":
        token = body.get("token") or ""
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
        return 200, {"ok": True}

    if path == "/api/listings":
        if not uid:
            return 401, {"error": "masuk dulu untuk memasang barang"}
        title = (body.get("title") or "").strip()
        price = body.get("price")
        category = (body.get("category") or "").strip()
        city = (body.get("city") or "").strip()
        if len(title) < 5 or len(title) > 90:
            return 400, {"error": "Judul 5-90 karakter."}
        if not isinstance(price, int) or price <= 0:
            return 400, {"error": "Harga harus angka lebih dari nol."}
        if not category or not city:
            return 400, {"error": "Kategori dan lokasi wajib diisi."}
        photos = body.get("photos") or []
        if not isinstance(photos, list):
            return 400, {"error": "Daftar foto tidak valid."}
        photos = [p for p in photos if isinstance(p, str) and p.startswith("/uploads/") and SAFE_UPLOAD.match(p.rsplit("/", 1)[-1])][:10]
        lid = "u" + uuid.uuid4().hex[:10]
        conn.execute(
            "INSERT INTO listings (id, owner_id, title, price, old_price, category, condition, city, description, status, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,'active',?)",
            (lid, uid, title, price, body.get("old_price") if isinstance(body.get("old_price"), int) else None,
             category, (body.get("condition") or "Bekas").strip(), city,
             (body.get("description") or "").strip(), now_iso()))
        for i, url in enumerate(photos):
            conn.execute("INSERT INTO photos (listing_id, url, position) VALUES (?,?,?)", (lid, url, i))
        conn.commit()
        row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (lid,)).fetchone()
        return 201, listing_json(conn, row, uid)

    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)/sold", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        row = conn.execute("SELECT owner_id, status FROM listings WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        if row["owner_id"] != uid:
            return 403, {"error": "hanya pemilik barang yang bisa menandai terjual"}
        conn.execute("UPDATE listings SET status='sold' WHERE id=?", (m.group(1),))
        conn.commit()
        return 200, {"ok": True, "status": "sold"}

    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)/reviews", path)
    if m:
        lid = m.group(1)
        if not uid:
            return 401, {"error": "masuk dulu"}
        row = conn.execute("SELECT owner_id, title FROM listings WHERE id=?", (lid,)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        stars = body.get("stars")
        if not isinstance(stars, int) or not 1 <= stars <= 5:
            return 400, {"error": "Bintang 1 sampai 5."}
        buyer_ok = review_eligibility(conn, lid, uid, row["owner_id"])
        seller_ok = review_eligibility_owner(conn, lid, uid, row["owner_id"])
        if not (buyer_ok or seller_ok):
            return 403, {"error": "Ulasan hanya untuk pihak dengan tawaran yang sudah diterima, sekali per barang."}
        subject = row["owner_id"] if buyer_ok else conn.execute(
            "SELECT buyer_id FROM offers WHERE listing_id=? AND status='accepted' LIMIT 1", (lid,)).fetchone()[0]
        conn.execute(
            "INSERT INTO reviews (id, listing_id, author_id, subject_id, role, stars, body, created_at)"
            " VALUES (?,?,?,?,?,?,?,?)",
            ("r" + uuid.uuid4().hex[:10], lid, uid, subject, "pembeli" if buyer_ok else "penjual",
             stars, (body.get("body") or "").strip()[:800], now_iso()))
        conn.commit()
        return 201, {"ok": True, "rating": rating_summary(conn, subject)}

    if path == "/api/offers":
        if not uid:
            return 401, {"error": "masuk dulu untuk mengajukan tawaran"}
        lid = (body.get("listing_id") or "").strip()
        amount = body.get("amount")
        row = conn.execute("SELECT owner_id, price, status FROM listings WHERE id=?", (lid,)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        if row["owner_id"] == uid:
            return 400, {"error": "Tidak bisa menawar barang sendiri."}
        if row["status"] != "active":
            return 409, {"error": "Barang sudah terjual."}
        if not isinstance(amount, int) or amount <= 0:
            return 400, {"error": "Jumlah tawaran harus angka lebih dari nol."}
        if amount > row["price"]:
            return 400, {"error": "Tawaran di atas harga pasang tidak perlu. Turunkan angkanya."}
        if conn.execute("SELECT 1 FROM offers WHERE listing_id=? AND buyer_id=? AND status='proposed'",
                        (lid, uid)).fetchone():
            return 409, {"error": "Kamu sudah punya tawaran yang menunggu jawaban."}
        oid = "o" + uuid.uuid4().hex[:10]
        conn.execute("INSERT INTO offers (id, listing_id, buyer_id, amount, message, status, created_at, updated_at)"
                     " VALUES (?,?,?,?,?,'proposed',?,?)",
                     (oid, lid, uid, amount, (body.get("message") or "").strip()[:500], now_iso(), now_iso()))
        conn.commit()
        return 201, {"ok": True, "id": oid, "status": "proposed"}

    m = re.fullmatch(r"/api/offers/([A-Za-z0-9_-]+)/(accept|decline)", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        offer = conn.execute("SELECT * FROM offers WHERE id=?", (m.group(1),)).fetchone()
        if not offer:
            return 404, {"error": "tawaran tidak ditemukan"}
        listing = conn.execute("SELECT owner_id, status FROM listings WHERE id=?", (offer["listing_id"],)).fetchone()
        if m.group(2) == "accept":
            if listing["owner_id"] != uid:
                return 403, {"error": "hanya penjual yang bisa menerima tawaran"}
            if offer["status"] != "proposed":
                return 409, {"error": "Tawaran ini sudah tidak aktif."}
            if listing["status"] != "active":
                return 409, {"error": "Barang sudah terjual."}
            conn.execute("UPDATE offers SET status='accepted', updated_at=? WHERE id=?", (now_iso(), offer["id"]))
            conn.execute("UPDATE offers SET status='declined', updated_at=? WHERE listing_id=? AND id<>? AND status='proposed'",
                         (now_iso(), offer["listing_id"], offer["id"]))
            conn.execute("UPDATE listings SET status='sold' WHERE id=?", (offer["listing_id"],))
            conn.commit()
            return 200, {"ok": True, "status": "accepted"}
        if uid not in (offer["buyer_id"], listing["owner_id"]):
            return 403, {"error": "bukan pihak dalam tawaran ini"}
        if offer["status"] != "proposed":
            return 409, {"error": "Tawaran ini sudah tidak aktif."}
        outcome = "withdrawn" if uid == offer["buyer_id"] else "declined"
        conn.execute("UPDATE offers SET status=?, updated_at=? WHERE id=?", (outcome, now_iso(), offer["id"]))
        conn.commit()
        return 200, {"ok": True, "status": outcome}

    if path == "/api/messages":
        if not uid:
            return 401, {"error": "masuk dulu untuk mengirim pesan"}
        lid = (body.get("listing_id") or "").strip()
        text = (body.get("body") or "").strip()
        if not text:
            return 400, {"error": "Pesan kosong."}
        if len(text) > 1000:
            return 400, {"error": "Pesan maksimal 1000 karakter."}
        row = conn.execute("SELECT owner_id FROM listings WHERE id=?", (lid,)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        thread_user = uid if uid != row["owner_id"] else int(body.get("with") or 0)
        if not thread_user:
            return 400, {"error": "Tentukan lawan bicara."}
        conn.execute("INSERT INTO messages (id, listing_id, thread_user, sender_id, body, created_at)"
                     " VALUES (?,?,?,?,?,?)",
                     ("m" + uuid.uuid4().hex[:10], lid, thread_user, uid, text, now_iso()))
        conn.commit()
        return 201, {"ok": True}

    if path == "/api/buy-requests" or path == "/api/wanted":
        if not uid:
            return 401, {"error": "masuk dulu untuk menulis permintaan"}
        title = (body.get("title") or "").strip()
        cat = (body.get("category") or "").strip()
        city = (body.get("city") or "").strip()
        lo, hi = body.get("price_min"), body.get("price_max")
        if len(title) < 5:
            return 400, {"error": "Tulis barang yang dicari, minimal 5 karakter."}
        if not cat or not city:
            return 400, {"error": "Kategori dan lokasi wajib diisi."}
        if not isinstance(lo, int) or not isinstance(hi, int) or lo <= 0 or hi <= 0:
            return 400, {"error": "Isi rentang harga minimum dan maksimum."}
        if lo > hi:
            return 400, {"error": "Harga minimum tidak boleh lebih besar dari maksimum."}
        wid = "w" + uuid.uuid4().hex[:10]
        conn.execute("INSERT INTO wanted (id, owner_id, title, category, price_min, price_max, city, note, created_at)"
                     " VALUES (?,?,?,?,?,?,?,?,?)",
                     (wid, uid, title, cat, lo, hi, city, (body.get("note") or "").strip()[:400], now_iso()))
        conn.commit()
        return 201, {"ok": True, "id": wid}

    if path == "/api/reports":
        if not uid:
            return 401, {"error": "masuk dulu untuk melapor"}
        lid = (body.get("listing_id") or "").strip()
        reason = (body.get("reason") or "").strip()
        if not reason:
            return 400, {"error": "Pilih alasan laporan."}
        if conn.execute("SELECT 1 FROM reports WHERE listing_id=? AND reporter_id=?", (lid, uid)).fetchone():
            return 409, {"error": "Kamu sudah melaporkan barang ini."}
        conn.execute("INSERT INTO reports (id, listing_id, reporter_id, reason, detail, created_at)"
                     " VALUES (?,?,?,?,?,?)",
                     ("p" + uuid.uuid4().hex[:10], lid, uid, reason[:60],
                      (body.get("detail") or "").strip()[:500], now_iso()))
        conn.commit()
        return 201, {"ok": True}

    if path == "/api/blocks":
        if not uid:
            return 401, {"error": "masuk dulu"}
        target = body.get("user_id")
        if not isinstance(target, int) or target == uid:
            return 400, {"error": "Pengguna tidak valid."}
        conn.execute("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?,?,?)",
                     (uid, target, now_iso()))
        conn.commit()
        return 200, {"ok": True, "blocked": True}

    m = re.fullmatch(r"/api/saved/([A-Za-z0-9_-]+)", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu untuk menyimpan"}
        conn.execute("INSERT OR IGNORE INTO saved (user_id, listing_id, created_at) VALUES (?,?,?)",
                     (uid, m.group(1), now_iso()))
        conn.commit()
        return 200, {"ok": True, "saved": True}

    if path == "/api/searches":
        if not uid:
            return 401, {"error": "masuk dulu untuk menyimpan pencarian"}
        params = body.get("params") or {}
        if not isinstance(params, dict):
            return 400, {"error": "Parameter pencarian tidak valid."}
        count = conn.execute("SELECT COUNT(*) FROM searches WHERE user_id=?", (uid,)).fetchone()[0]
        if count >= 5:
            return 409, {"error": "Maksimal 5 pencarian tersimpan. Hapus satu dulu."}
        sid = "s" + uuid.uuid4().hex[:10]
        conn.execute("INSERT INTO searches (id, user_id, params, created_at, seen_at) VALUES (?,?,?,?,?)",
                     (sid, uid, json.dumps(params, ensure_ascii=False), now_iso(), now_iso()))
        conn.commit()
        return 201, {"ok": True, "id": sid}

    return 404, {"error": "endpoint tidak dikenal"}


# ---------------------------------------------------------------- DELETE

def api_delete(path: str, uid: int | None, conn: sqlite3.Connection):
    if not uid:
        return 401, {"error": "masuk dulu"}

    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)", path)
    if m:
        row = conn.execute("SELECT owner_id FROM listings WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        if row["owner_id"] != uid:
            return 403, {"error": "hanya pemilik yang bisa menghapus"}
        for p in conn.execute("SELECT url FROM photos WHERE listing_id=?", (m.group(1),)):
            if p["url"]:
                (UPLOAD_DIR / p["url"].rsplit("/", 1)[-1]).unlink(missing_ok=True)
        conn.execute("DELETE FROM listings WHERE id=?", (m.group(1),))
        conn.commit()
        return 200, {"ok": True}

    m = re.fullmatch(r"/api/saved/([A-Za-z0-9_-]+)", path)
    if m:
        conn.execute("DELETE FROM saved WHERE user_id=? AND listing_id=?", (uid, m.group(1)))
        conn.commit()
        return 200, {"ok": True, "saved": False}

    m = re.fullmatch(r"/api/searches/([A-Za-z0-9_-]+)", path)
    if m:
        conn.execute("DELETE FROM searches WHERE user_id=? AND id=?", (uid, m.group(1)))
        conn.commit()
        return 200, {"ok": True}

    m = re.fullmatch(r"/api/wanted/([A-Za-z0-9_-]+)", path)
    if m:
        row = conn.execute("SELECT owner_id FROM wanted WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "permintaan tidak ditemukan"}
        if row["owner_id"] != uid:
            return 403, {"error": "hanya pemilik permintaan yang bisa menghapus"}
        conn.execute("DELETE FROM wanted WHERE id=?", (m.group(1),))
        conn.commit()
        return 200, {"ok": True}

    m = re.fullmatch(r"/api/blocks/(\d+)", path)
    if m:
        conn.execute("DELETE FROM blocks WHERE blocker_id=? AND blocked_id=?", (uid, int(m.group(1))))
        conn.commit()
        return 200, {"ok": True, "blocked": False}

    return 404, {"error": "endpoint tidak dikenal"}


# ---------------------------------------------------------------- HTTP

COOKIE = "bk_session"
BLOCKED_STATIC = (".py", ".pyc", ".db", ".log", ".sqlite", ".bak")


def rate_ok(ip: str) -> bool:
    now = time.time()
    with _hits_lock:
        hits = [t for t in _upload_hits.get(ip, []) if now - t < UPLOADS_WINDOW]
        if len(hits) >= UPLOADS_PER_HOUR:
            _upload_hits[ip] = hits
            return False
        hits.append(now)
        _upload_hits[ip] = hits
        return True


def cleanup_orphans() -> int:
    """Hapus berkas di uploads yang tidak dipakai barang mana pun dan sudah lewat sejam."""
    if not UPLOAD_DIR.is_dir():
        return 0
    conn = db()
    try:
        used = {r["url"].rsplit("/", 1)[-1] for r in conn.execute("SELECT url FROM photos WHERE url<>''")}
    finally:
        conn.close()
    removed = 0
    cutoff = time.time() - 3600
    for path in UPLOAD_DIR.iterdir():
        if not path.is_file() or path.name in used:
            continue
        if path.stat().st_mtime < cutoff:
            path.unlink(missing_ok=True)
            removed += 1
    return removed


def escape_attr(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


class Handler(SimpleHTTPRequestHandler):
    server_version = "Bukatoko/2.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s %s\n" % (self.address_string(), self.command, self.path))

    def _json(self, code: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _cookie_token(self) -> str | None:
        raw = self.headers.get("Cookie")
        if not raw:
            return None
        jar = cookies.SimpleCookie()
        try:
            jar.load(raw)
        except cookies.CookieError:
            return None
        morsel = jar.get(COOKIE)
        return morsel.value if morsel else None

    def _read_json(self) -> dict:
        raw = self.headers.get("Content-Length", "0")
        try:
            length = int(raw)
        except ValueError:
            return {}
        if length <= 0 or length > MAX_BODY:
            return {}
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}

    def do_GET(self):  # noqa: N802
        parts = urlsplit(self.path)
        path = unquote(parts.path)
        query = parse_qs(parts.query)

        if path.startswith("/api/"):
            conn = db()
            try:
                uid = session_user(conn, self._cookie_token())
                code, payload = api_get(path, query, uid, conn)
            except Exception as exc:  # noqa: BLE001
                sys.stderr.write(f"api_get error: {exc}\n")
                code, payload = 500, {"error": "kesalahan server"}
            finally:
                conn.close()
            self._json(code, payload)
            return

        if path.startswith("/uploads/"):
            name = path.rsplit("/", 1)[-1]
            target = UPLOAD_DIR / name
            if not SAFE_UPLOAD.match(name) or not target.is_file():
                self.send_error(404, "foto tidak ditemukan")
                return
            data = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(data)
            return

        m = re.fullmatch(r"/p/([A-Za-z0-9_-]+)(?:-[A-Za-z0-9-]*)?/?", path)
        if m:
            self._serve_listing_page(m.group(1))
            return

        if path.lower().endswith(BLOCKED_STATIC):
            self.send_error(404, "tidak tersedia")
            return
        super().do_GET()

    def _serve_listing_page(self, listing_id: str) -> None:
        conn = db()
        try:
            row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (listing_id,)).fetchone()
            if not row:
                self.send_error(404, "barang tidak ditemukan")
                return
            data = listing_json(conn, row)
        finally:
            conn.close()
        html = (ROOT / "listing.html").read_text(encoding="utf-8")
        title = f"{data['title']} · Rp {data['price']:,} · Bukatoko".replace(",", ".")
        desc = f"{data['condition']}, {data['city']}. {data['description'][:150]}".replace("\n", " ")
        image = data["photo_urls"][0] if data["photo_urls"] else "/assets/favicon.svg"
        meta = (
            '<meta property="og:type" content="product">\n'
            f'<meta property="og:title" content="{escape_attr(title)}">\n'
            f'<meta property="og:description" content="{escape_attr(desc)}">\n'
            f'<meta property="og:image" content="{escape_attr(image)}">\n'
            f'<meta property="og:url" content="{escape_attr(self.path)}">\n'
            '<meta name="twitter:card" content="summary_large_image">\n'
        )
        html = html.replace("</head>", f"{meta}</head>", 1)
        # halaman disajikan di /p/<id>, jadi path relatif aset harus dipatok ke akar
        html = html.replace("<head>", '<head>\n<base href="/">', 1)
        html = html.replace('<body data-page="listing">',
                            f'<body data-page="listing" data-listing-id="{escape_attr(listing_id)}">')
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):  # noqa: N802
        path = unquote(urlsplit(self.path).path)

        if path == "/api/upload":
            self._handle_upload()
            return
        if not path.startswith("/api/"):
            self._json(404, {"error": "endpoint tidak dikenal"})
            return

        body = self._read_json()
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
            code, payload = api_post(path, body, uid, conn)
            if code == 200 and path in ("/api/login", "/api/signup") and payload.get("token"):
                raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Set-Cookie",
                                 f"{COOKIE}={payload['token']}; Path=/; Max-Age={SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax")
                self.send_header("Content-Length", str(len(raw)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(raw)
                return
            if code == 200 and path == "/api/logout":
                raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Set-Cookie", f"{COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(f"api_post error: {exc}\n")
            code, payload = 500, {"error": "kesalahan server"}
        finally:
            conn.close()
        self._json(code, payload)

    def _handle_upload(self) -> None:
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
        finally:
            conn.close()
        if not uid:
            self._json(401, {"error": "masuk dulu sebelum mengunggah foto"})
            return
        if not rate_ok(self.address_string()):
            self._json(429, {"error": "terlalu banyak unggahan dari perangkat ini, coba lagi nanti"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json(400, {"error": "Content-Length tidak valid"})
            return
        if length <= 0 or length > MAX_BODY:
            self._json(400, {"error": "ukuran permintaan tidak wajar"})
            return
        ctype = self.headers.get("Content-Type", "")
        if not ctype.lower().startswith("multipart/form-data"):
            self._json(415, {"error": "kirim sebagai multipart/form-data"})
            return
        body = self.rfile.read(length)
        try:
            msg = email.message_from_bytes(
                b"Content-Type: " + ctype.encode("latin-1", "replace") + b"\r\nMIME-Version: 1.0\r\n\r\n" + body,
                policy=policy.default)
            parts = list(msg.iter_parts())
        except Exception:  # noqa: BLE001
            self._json(400, {"error": "bentuk multipart tidak terbaca"})
            return
        if not parts:
            self._json(400, {"error": "tidak ada berkas pada permintaan"})
            return
        if len(parts) > MAX_FILES:
            self._json(400, {"error": f"maksimal {MAX_FILES} foto per permintaan"})
            return
        UPLOAD_DIR.mkdir(exist_ok=True)
        saved = []
        for part in parts:
            kind = part.get_content_type().lower()
            if kind not in ALLOWED_IMAGES:
                self._json(415, {"error": f"format {kind} tidak didukung. Pakai JPG, PNG, WebP, atau GIF."})
                return
            data = part.get_payload(decode=True) or b""
            if not data:
                self._json(400, {"error": "ada berkas kosong"})
                return
            if len(data) > MAX_FILE_BYTES:
                self._json(413, {"error": "satu foto melebihi 6 MB. Kompres dulu."})
                return
            name = uuid.uuid4().hex + ALLOWED_IMAGES[kind]
            (UPLOAD_DIR / name).write_bytes(data)
            saved.append({"url": f"/uploads/{name}", "bytes": len(data), "type": kind})
        self._json(200, {"files": saved})

    def do_DELETE(self):  # noqa: N802
        path = unquote(urlsplit(self.path).path)
        if not path.startswith("/api/"):
            self._json(404, {"error": "endpoint tidak dikenal"})
            return
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
            code, payload = api_delete(path, uid, conn)
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(f"api_delete error: {exc}\n")
            code, payload = 500, {"error": "kesalahan server"}
        finally:
            conn.close()
        self._json(code, payload)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        # aset teks tidak boleh di-cache heuristik: demo ini sering berubah
        if self.path.split("?")[0].endswith((".js", ".css", ".html", ".svg")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    init_db()
    UPLOAD_DIR.mkdir(exist_ok=True)
    removed = cleanup_orphans()
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Bukatoko di http://127.0.0.1:{port}/index.html (foto yatim dibersihkan: {removed})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nberhenti")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()



