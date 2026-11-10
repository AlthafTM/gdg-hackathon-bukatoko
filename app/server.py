#!/usr/bin/env python3
"""JualinAja: server demo (statis + API JSON + unggah foto).

Satu proses, tanpa dependensi pihak ketiga. Data di SQLite (bukatoko.db),
foto di uploads/. Jalankan: python3 server.py 8123
"""

from __future__ import annotations

import email
import hashlib
import hmac
import json
import ipaddress
import mimetypes
import os
import re
import secrets
import sqlite3
import smtplib
import ssl
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from email import policy
from email.message import EmailMessage
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.environ.get("BUKATOKO_UPLOAD_DIR") or ROOT / "uploads")
AVATAR_DIR = UPLOAD_DIR / "avatars"
DB_PATH = Path(os.environ.get("BUKATOKO_DB") or (ROOT / "bukatoko.db"))

MAX_BODY = 25 * 1024 * 1024
MAX_FILE_BYTES = 6 * 1024 * 1024
MAX_FILES = 10
ALLOWED_IMAGES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
SAFE_UPLOAD = re.compile(r"^[a-f0-9]{32}\.(jpg|png|webp|gif)$")
SESSION_DAYS = 30
UPLOADS_PER_HOUR = 80
UPLOADS_WINDOW = 3600
LISTING_DAYS = 30
WANTED_DAYS = 30
RESET_MINUTES = 30
CLOUD_MODE = os.environ.get("BUKATOKO_CLOUD", "0") == "1"
DEMO_MAIL = not CLOUD_MODE and os.environ.get("BUKATOKO_DEMO_MAIL", "1") != "0"
SMTP_HOST = os.environ.get("BUKATOKO_SMTP_HOST", "")
COOKIE_SECURITY = "; Secure" if CLOUD_MODE else ""

# batas laju: (jendela detik, jumlah maksimum)
LIMITS = {
    "login_ip": (600, 20),
    "login_mail": (600, 8),
    "signup_ip": (3600, 10),
    "reset_ip": (3600, 6),
    "reset_mail": (3600, 4),
    "reset_confirm_ip": (600, 20),
    "reset_confirm_mail": (1800, 8),
    "verify_user": (3600, 4),
    "offer_user": (3600, 30),
    "message_user": (3600, 60),
    "report_user": (86400, 10),
    "upload_ip": (3600, UPLOADS_PER_HOUR),
    "comment_user": (3600, 60),
    "likes_user": (3600, 300),
}

_hits: dict[str, list[float]] = {}
_hits_lock = threading.Lock()


def limit_ok(kind: str, key: str) -> bool:
    """True kalau masih di bawah batas untuk jenis dan kunci ini."""
    window, cap = LIMITS[kind]
    bucket = kind + ":" + key
    now = time.time()
    with _hits_lock:
        hits = [t for t in _hits.get(bucket, []) if now - t < window]
        if len(hits) >= cap:
            _hits[bucket] = hits
            return False
        hits.append(now)
        _hits[bucket] = hits
        return True


def limit_message(kind: str) -> str:
    window, _ = LIMITS[kind]
    return f"Terlalu banyak percobaan. Coba lagi dalam {max(1, window // 60)} menit."


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verify_token TEXT,
  reset_token TEXT,
  reset_expires TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT,
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
  views INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
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
  status TEXT NOT NULL DEFAULT 'open',
  expires_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'proposed',
  accepted_at TEXT,
  handover_at TEXT,
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
  reply TEXT,
  replied_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_review_per_listing ON reviews(listing_id, author_id);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  listing_id TEXT REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  action TEXT,
  reviewed_by INTEGER,
  reviewed_at TEXT,
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
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  listing_id TEXT,
  actor_id INTEGER,
  body TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS notif_user ON notifications(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comment_target ON comments(target_type, target_id, created_at);
CREATE TABLE IF NOT EXISTS wanted_replies (
  id TEXT PRIMARY KEY,
  wanted_id TEXT NOT NULL REFERENCES wanted(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
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
        for table, column, decl in (
            ("users", "avatar_url", "TEXT"),
            ("users", "email_verified", "INTEGER NOT NULL DEFAULT 0"),
            ("users", "verify_token", "TEXT"),
            ("users", "reset_token", "TEXT"),
            ("users", "reset_expires", "TEXT"),
            ("users", "role", "TEXT NOT NULL DEFAULT 'user'"),
            ("users", "suspended", "INTEGER NOT NULL DEFAULT 0"),
            ("sessions", "csrf", "TEXT"),
            ("listings", "views", "INTEGER NOT NULL DEFAULT 0"),
            ("listings", "expires_at", "TEXT"),
            ("wanted", "status", "TEXT NOT NULL DEFAULT 'open'"),
            ("wanted", "expires_at", "TEXT"),
            ("offers", "accepted_at", "TEXT"),
            ("offers", "handover_at", "TEXT"),
            ("reviews", "reply", "TEXT"),
            ("reviews", "replied_at", "TEXT"),
            ("reports", "status", "TEXT NOT NULL DEFAULT 'open'"),
            ("reports", "action", "TEXT"),
            ("reports", "reviewed_by", "INTEGER"),
            ("reports", "reviewed_at", "TEXT"),
        ):
            ensure_column(conn, table, column, decl)
        if not CLOUD_MODE:
            if conn.execute("SELECT COUNT(*) AS n FROM listings").fetchone()["n"] == 0:
                seed(conn)
            ensure_moderator(conn)
        conn.commit()
    finally:
        conn.close()


def ensure_column(conn: sqlite3.Connection, table: str, column: str, decl: str) -> None:
    """Tambahkan kolom baru ke basis data lama tanpa menghapus isinya."""
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def ensure_moderator(conn: sqlite3.Connection) -> None:
    """Akun moderator demo, dibuat sekali kalau belum ada."""
    row = conn.execute("SELECT 1 FROM users WHERE role='moderator'").fetchone()
    if row:
        return
    if conn.execute("SELECT 1 FROM users WHERE name='moderator'").fetchone():
        conn.execute("UPDATE users SET role='moderator' WHERE name='moderator'")
        return
    conn.execute(
        "INSERT INTO users (name, email, pass_hash, role, email_verified, created_at) VALUES (?,?,?,?,1,?)",
        ("moderator", "moderator@example.com", hash_password("demo1234"), "moderator", now_iso()))


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
            "INSERT INTO listings (id, owner_id, title, price, old_price, category, condition, city, description, status, expires_at, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,'active',?,?)",
            (lid, ids[owner], title, price, old, cat, cond, city, desc,
             (datetime.now(timezone.utc) + timedelta(days=LISTING_DAYS)).replace(microsecond=0).isoformat(), created),
        )
        for i in range(nphotos):
            conn.execute("INSERT INTO photos (listing_id, url, position) VALUES (?,?,?)", (lid, "", i))
    for (wid, owner, title, cat, lo, hi, city, note, created) in SEED_WANTED:
        conn.execute(
            "INSERT INTO wanted (id, owner_id, title, category, price_min, price_max, city, note, status, expires_at, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,'open',?,?)",
            (wid, ids[owner], title, cat, lo, hi, city, note,
             (datetime.now(timezone.utc) + timedelta(days=WANTED_DAYS)).replace(microsecond=0).isoformat(), created),
        )
    # akun moderator untuk meninjau laporan; kata sandinya sama dengan akun demo lain
    conn.execute(
        "INSERT INTO users (name, email, pass_hash, role, email_verified, created_at) VALUES (?,?,?,?,1,?)",
        ("moderator", "moderator@example.com", hash_password("demo1234"), "moderator", stamp))


# ---------------------------------------------------------------- bantu

def public_user(conn: sqlite3.Connection, uid: int) -> dict:
    row = conn.execute("SELECT id, name, created_at, avatar_url FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return {"id": 0, "name": "tidak dikenal", "joined": ""}
    return {"id": row["id"], "name": row["name"], "joined": (row["created_at"] or "")[:7], "avatar_url": row["avatar_url"]}


def is_moderator(conn: sqlite3.Connection, uid: int | None) -> bool:
    if not uid:
        return False
    row = conn.execute("SELECT role FROM users WHERE id=?", (uid,)).fetchone()
    return bool(row and row["role"] == "moderator")


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
    social = social_counts(conn, "listing", row["id"], viewer)
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
        "views": row["views"],
        "expires_at": row["expires_at"],
        "expired": bool(row["expires_at"] and row["expires_at"] <= now_iso()),
        "created_at": row["created_at"],
        "owner": owner,
        "photo_urls": real,
        "photo_count": len(photos) or 1,
        "saved": saved,
        "open_offers": offers,
        "likes": social["likes"],
        "comments": social["comments"],
        "liked": social["liked"],
    }


LISTING_COLS = "id, owner_id, title, price, old_price, category, condition, city, description, status, views, expires_at, created_at"


def query_listings(conn: sqlite3.Connection, params: dict, viewer: int | None) -> dict:
    where, args = ["1=1"], []
    q = (params.get("q") or "").strip()
    q_clause = ""
    if q:
        q_clause = "(lower(title) LIKE ? OR lower(description) LIKE ? OR lower(category) LIKE ?)"
        where.append(q_clause)
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
    if status in {"active", "sold", "all", "removed"}:
        if status != "all":
            where.append("status = ?")
            args.append(status)
    else:
        status = "active"
    # barang kedaluwarsa disembunyikan dari daftar kecuali pemilik meminta status=all
    if status == "active":
        where.append("(expires_at IS NULL OR expires_at > ?)")
        args.append(now_iso())
    if (params.get("has_photo") or "").strip() in {"1", "true", "ya"}:
        where.append("EXISTS (SELECT 1 FROM photos WHERE photos.listing_id = listings.id AND photos.url <> '')")
    owner = (params.get("owner") or "").strip()
    if owner.isdigit():
        where.append("owner_id = ?")
        args.append(int(owner))
    ids = (params.get("ids") or "").strip()
    if ids:
        wanted_ids = [x for x in ids.split(",") if re.fullmatch(r"[A-Za-z0-9_-]{3,20}", x)][:40]
        if wanted_ids:
            where.append("id IN (%s)" % ",".join("?" * len(wanted_ids)))
            args += wanted_ids
        else:
            where.append("0=1")
    banned = blocked_ids(conn, viewer)
    if banned:
        where.append("owner_id NOT IN (%s)" % ",".join("?" * len(banned)))
        args += list(banned)
    where.append("owner_id NOT IN (SELECT id FROM users WHERE suspended=1)")

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
    # salah ketik: kalau tidak ada hasil, coba cocokkan kata per kata, lalu potongan awal kata
    if not rows and q_clause and len(q) >= 3:
        base_where = [w for w in where if w != q_clause]
        base_args = args[3:]
        words = [w for w in re.split(r"\s+", q.lower()) if len(w) >= 3][:4]
        for variant in (words, [w[:3] for w in words]):
            if not variant:
                continue
            like_parts, like_args = [], []
            for w in variant:
                like_parts.append("(lower(title) LIKE ? OR lower(category) LIKE ?)")
                like_args += [f"%{w}%", f"%{w}%"]
            sql2 = " AND ".join(base_where + ["(" + " OR ".join(like_parts) + ")"])
            try:
                rows = conn.execute(
                    f"SELECT {LISTING_COLS} FROM listings WHERE {sql2} ORDER BY {order} LIMIT ? OFFSET ?",
                    base_args + like_args + [limit, offset],
                ).fetchall()
            except sqlite3.Error:
                rows = []
            if rows:
                total = conn.execute(f"SELECT COUNT(*) FROM listings WHERE {sql2}",
                                     base_args + like_args).fetchone()[0]
                break
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + len(rows) < total,
        "items": [listing_json(conn, r, viewer) for r in rows],
    }


def query_wanted(conn: sqlite3.Connection, params: dict, viewer: int | None) -> dict:
    mine = (params.get("mine") or "").strip() in {"1", "true"}
    sql = "SELECT * FROM wanted"
    args: list = []
    if mine and viewer:
        sql += " WHERE owner_id = ?"
        args.append(viewer)
    else:
        sql += " WHERE status = 'open' AND (expires_at IS NULL OR expires_at > ?)"
        args.append(now_iso())
    rows = conn.execute(sql + " ORDER BY created_at DESC LIMIT 60", args).fetchall()
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
            "status": r["status"],
            "expires_at": r["expires_at"],
            "created_at": r["created_at"],
            "owner": public_user(conn, r["owner_id"]),
            "is_mine": bool(viewer and r["owner_id"] == viewer),
            "replies": conn.execute("SELECT COUNT(*) FROM wanted_replies WHERE wanted_id=?",
                                    (r["id"],)).fetchone()[0],
            **social_counts(conn, "wanted", r["id"], viewer),
        })
    return {"items": items, "total": len(items)}


def review_rows(conn: sqlite3.Connection, subject_id: int, sort: str = "baru") -> list[dict]:
    order = {"tinggi": "r.stars DESC, r.created_at DESC",
             "rendah": "r.stars ASC, r.created_at DESC"}.get(sort, "r.created_at DESC")
    rows = conn.execute(
        "SELECT r.*, u.name AS author, l.title AS listing_title FROM reviews r "
        "JOIN users u ON u.id = r.author_id JOIN listings l ON l.id = r.listing_id "
        f"WHERE r.subject_id=? ORDER BY {order}", (subject_id,)).fetchall()
    return [{
        "id": r["id"], "author": r["author"], "role": r["role"], "stars": r["stars"],
        "body": r["body"], "reply": r["reply"], "replied_at": r["replied_at"],
        "created_at": r["created_at"], "listing_title": r["listing_title"],
    } for r in rows]


def social_counts(conn: sqlite3.Connection, target_type: str, target_id: str,
                  viewer: int | None = None) -> dict:
    likes = conn.execute("SELECT COUNT(*) FROM likes WHERE target_type=? AND target_id=?",
                         (target_type, target_id)).fetchone()[0]
    comments = conn.execute("SELECT COUNT(*) FROM comments WHERE target_type=? AND target_id=?",
                            (target_type, target_id)).fetchone()[0]
    liked = bool(viewer and conn.execute(
        "SELECT 1 FROM likes WHERE user_id=? AND target_type=? AND target_id=?",
        (viewer, target_type, target_id)).fetchone())
    return {"likes": likes, "comments": comments, "liked": liked}


def target_exists(conn: sqlite3.Connection, target_type: str, target_id: str) -> bool:
    table = {"listing": "listings", "wanted": "wanted"}.get(target_type)
    if not table:
        return False
    return bool(conn.execute(f"SELECT 1 FROM {table} WHERE id=?", (target_id,)).fetchone())


def rating_summary(conn: sqlite3.Connection, subject_id: int) -> dict:
    row = conn.execute("SELECT COUNT(*) n, AVG(stars) avg FROM reviews WHERE subject_id=?",
                       (subject_id,)).fetchone()
    distribution = {str(i): 0 for i in range(1, 6)}
    for r in conn.execute("SELECT stars, COUNT(*) n FROM reviews WHERE subject_id=? GROUP BY stars",
                          (subject_id,)):
        distribution[str(r["stars"])] = r["n"]
    return {"count": row["n"], "average": round(row["avg"], 1) if row["avg"] else None,
            "distribution": distribution}


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


def rupiah(n: int) -> str:
    return "Rp " + f"{int(n):,}".replace(",", ".")


def notify(conn: sqlite3.Connection, user_id: int | None, kind: str, body: str,
           listing_id: str | None = None, actor_id: int | None = None, data: dict | None = None) -> None:
    """Catat satu notifikasi. Tidak commit sendiri: ikut transaksi aksi pemicunya."""
    if not user_id:
        return
    conn.execute(
        "INSERT INTO notifications (id, user_id, kind, listing_id, actor_id, body, data, created_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        ("n" + uuid.uuid4().hex[:10], user_id, kind, listing_id, actor_id, body,
         json.dumps(data or {}, ensure_ascii=False), now_iso()))


def unread_notifications(conn: sqlite3.Connection, uid: int) -> int:
    return conn.execute("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL",
                        (uid,)).fetchone()[0]


def wanted_matches(conn: sqlite3.Connection, listing: sqlite3.Row) -> list[sqlite3.Row]:
    """Permintaan warga yang cocok dengan barang baru: kategori sama dan harga di dalam rentang."""
    rows = conn.execute(
        "SELECT id, owner_id, title, price_min, price_max FROM wanted WHERE category=? AND owner_id<>?",
        (listing["category"], listing["owner_id"])).fetchall()
    return [r for r in rows if r["price_min"] <= listing["price"] <= r["price_max"]]


# ---------------------------------------------------------------- GET

def api_get(path: str, query: dict, uid: int | None, conn: sqlite3.Connection):
    def q(name, default=""):
        return (query.get(name) or [default])[0]

    if path == "/api/me":
        if not uid:
            return 200, {"user": None}
        me = public_user(conn, uid)
        row_me = conn.execute("SELECT email, role, email_verified FROM users WHERE id=?", (uid,)).fetchone()
        me["email"] = row_me["email"]
        me["role"] = row_me["role"]
        me["email_verified"] = bool(row_me["email_verified"])
        me["rating"] = rating_summary(conn, uid)
        me["counts"] = {
            "deals": conn.execute("SELECT COUNT(*) FROM offers WHERE status='accepted' AND (buyer_id=? OR listing_id IN "
                                  "(SELECT id FROM listings WHERE owner_id=?))", (uid, uid)).fetchone()[0],
            "saved": conn.execute("SELECT COUNT(*) FROM saved WHERE user_id=?", (uid,)).fetchone()[0],
            "listings": conn.execute("SELECT COUNT(*) FROM listings WHERE owner_id=?", (uid,)).fetchone()[0],
            "wanted": conn.execute("SELECT COUNT(*) FROM wanted WHERE owner_id=?", (uid,)).fetchone()[0],
            "unread": unread_messages(conn, uid),
            "offers": incoming_offers(conn, uid),
            "matches": new_matches(conn, uid),
            "notif": unread_notifications(conn, uid),
        }
        return 200, me

    if path == "/api/listings":
        return 200, query_listings(conn, {k: q(k) for k in
                                          ("q", "kat", "city", "kondisi", "min", "max", "sort", "status", "owner",
                                           "ids", "has_photo", "limit", "offset")}, uid)

    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)", path)
    if m:
        row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        # hitungan dilihat hanya bertambah dari pengunjung lain, bukan dari pemilik
        if uid != row["owner_id"]:
            conn.execute("UPDATE listings SET views = views + 1 WHERE id=?", (row["id"],))
            conn.commit()
            row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (row["id"],)).fetchone()
        data = listing_json(conn, row, uid)
        is_owner = uid == row["owner_id"]
        data["is_owner"] = is_owner
        if row["status"] == "removed" and not is_owner and not is_moderator(conn, uid):
            return 404, {"error": "barang tidak ditemukan"}
        data["deal"] = None
        deal = conn.execute(
            "SELECT o.id, o.amount, o.accepted_at, o.handover_at, o.buyer_id, l.owner_id FROM offers o "
            "JOIN listings l ON l.id=o.listing_id WHERE o.listing_id=? AND o.status='accepted'",
            (row["id"],)).fetchone()
        if deal:
            data["deal"] = {
                "offer_id": deal["id"], "amount": deal["amount"],
                "accepted_at": deal["accepted_at"], "handover_at": deal["handover_at"],
                "buyer": public_user(conn, deal["buyer_id"]),
                "seller": public_user(conn, deal["owner_id"]),
                "is_party": uid in (deal["buyer_id"], deal["owner_id"]),
            }
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
        return 200, query_wanted(conn, {k: q(k) for k in ("kat", "q", "mine")}, uid)

    m = re.fullmatch(r"/api/users/([^/]+)", path)
    if m:
        row = conn.execute("SELECT id, name, created_at, avatar_url FROM users WHERE name=?",
                           (unquote(m.group(1)),)).fetchone()
        if not row:
            return 404, {"error": "pengguna tidak ditemukan"}
        listings = query_listings(conn, {"owner": str(row["id"]), "status": "all", "limit": "60"}, uid)
        blocked = uid is not None and row["id"] in blocked_ids(conn, uid)
        sold = conn.execute("SELECT COUNT(*) FROM listings WHERE owner_id=? AND status='sold'",
                            (row["id"],)).fetchone()[0]
        active = conn.execute("SELECT COUNT(*) FROM listings WHERE owner_id=? AND status='active'",
                              (row["id"],)).fetchone()[0]
        return 200, {
            "user": dict(row) | {"joined": (row["created_at"] or "")[:7], "blocked": blocked},
            "stats": {"sold": sold, "active": active},
            "rating": rating_summary(conn, row["id"]),
            "reviews": review_rows(conn, row["id"], (query.get("rsort") or ["baru"])[0]),
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

        # membuka daftar tawaran berarti tawaran masuk sudah dilihat
        conn.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND kind='offer' AND read_at IS NULL",
                     (now_iso(), uid))
        conn.commit()
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
        conn.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND kind='message' AND listing_id=? AND read_at IS NULL",
                     (now_iso(), uid, listing_id))
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
            return 200, {"items": [], "total": 0, "has_more": False}
        limit = min(int(q("limit") or 30) if (q("limit") or "").isdigit() else 30, 100)
        offset = int(q("offset") or 0) if (q("offset") or "").isdigit() else 0
        total = conn.execute("SELECT COUNT(*) FROM saved WHERE user_id=?", (uid,)).fetchone()[0]
        rows = conn.execute(
            f"SELECT {LISTING_COLS} FROM listings WHERE id IN (SELECT listing_id FROM saved WHERE user_id=?) "
            "ORDER BY created_at DESC LIMIT ? OFFSET ?", (uid, limit, offset)).fetchall()
        return 200, {"items": [listing_json(conn, r, uid) for r in rows], "total": total,
                     "limit": limit, "offset": offset, "has_more": offset + len(rows) < total}

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

    if path == "/api/suggest":
        q = (query.get("q") or [""])[0].strip().lower()
        if len(q) < 2:
            return 200, {"items": []}
        rows = conn.execute(
            "SELECT DISTINCT title FROM listings WHERE status='active' AND lower(title) LIKE ? "
            "ORDER BY created_at DESC LIMIT 8", (f"%{q}%",)).fetchall()
        return 200, {"items": [r["title"] for r in rows]}

    if path == "/api/deals":
        if not uid:
            return 401, {"error": "masuk dulu"}
        rows = conn.execute(
            "SELECT o.id, o.amount, o.accepted_at, o.handover_at, o.buyer_id, l.id AS listing_id, l.title, l.owner_id "
            "FROM offers o JOIN listings l ON l.id=o.listing_id "
            "WHERE o.status='accepted' AND (o.buyer_id=? OR l.owner_id=?) ORDER BY o.accepted_at DESC LIMIT 60",
            (uid, uid)).fetchall()
        items = [{
            "offer_id": r["id"], "listing_id": r["listing_id"], "title": r["title"], "amount": r["amount"],
            "accepted_at": r["accepted_at"], "handover_at": r["handover_at"],
            "side": "pembeli" if r["buyer_id"] == uid else "penjual",
            "with": public_user(conn, r["owner_id"] if r["buyer_id"] == uid else r["buyer_id"]),
        } for r in rows]
        return 200, {"items": items, "total": len(items)}

    if path == "/api/reports":
        if not uid:
            return 401, {"error": "masuk dulu"}
        if not is_moderator(conn, uid):
            return 403, {"error": "hanya moderator"}
        rows = conn.execute(
            "SELECT r.*, l.title AS listing_title, l.status AS listing_status, u.name AS reporter "
            "FROM reports r LEFT JOIN listings l ON l.id=r.listing_id LEFT JOIN users u ON u.id=r.reporter_id "
            "WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 100").fetchall()
        return 200, {"items": [{
            "id": r["id"], "listing_id": r["listing_id"], "listing_title": r["listing_title"],
            "listing_status": r["listing_status"], "reason": r["reason"], "detail": r["detail"],
            "reporter": r["reporter"], "created_at": r["created_at"],
        } for r in rows], "total": len(rows)}

    if path == "/api/comments":
        ttype = (query.get("target_type") or [""])[0].strip()
        tid = (query.get("target_id") or [""])[0].strip()
        if ttype not in {"listing", "wanted"} or not tid:
            return 400, {"error": "target tidak dikenal"}
        rows = conn.execute(
            "SELECT c.*, u.name AS author FROM comments c JOIN users u ON u.id=c.author_id "
            "WHERE c.target_type=? AND c.target_id=? ORDER BY c.created_at ASC LIMIT 100",
            (ttype, tid)).fetchall()
        return 200, {"items": [{
            "id": r["id"], "author": r["author"], "author_id": r["author_id"],
            "body": r["body"], "created_at": r["created_at"], "mine": r["author_id"] == uid,
        } for r in rows], "total": len(rows)}

    m = re.fullmatch(r"/api/wanted/([A-Za-z0-9_-]+)/replies", path)
    if m:
        rows = conn.execute(
            "SELECT r.*, u.name AS author, l.title AS listing_title FROM wanted_replies r "
            "JOIN users u ON u.id=r.user_id LEFT JOIN listings l ON l.id=r.listing_id "
            "WHERE r.wanted_id=? ORDER BY r.created_at ASC LIMIT 60", (m.group(1),)).fetchall()
        return 200, {"items": [{
            "id": r["id"], "author": r["author"], "user_id": r["user_id"], "body": r["body"],
            "listing_id": r["listing_id"], "listing_title": r["listing_title"],
            "created_at": r["created_at"],
        } for r in rows], "total": len(rows)}

    if path == "/api/notifications":
        counts = {"unread": unread_messages(conn, uid) if uid else 0,
                  "offers": incoming_offers(conn, uid) if uid else 0,
                  "matches": new_matches(conn, uid) if uid else 0,
                  "unread_events": unread_notifications(conn, uid) if uid else 0,
                  "items": []}
        if not uid:
            return 200, counts
        rows = conn.execute(
            "SELECT n.*, l.title FROM notifications n LEFT JOIN listings l ON l.id=n.listing_id "
            "WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 60", (uid,)).fetchall()
        counts["items"] = [{
            "id": r["id"], "kind": r["kind"], "body": r["body"], "listing_id": r["listing_id"],
            "listing_title": r["title"], "actor": public_user(conn, r["actor_id"]) if r["actor_id"] else None,
            "created_at": r["created_at"], "read": bool(r["read_at"]),
            "data": json.loads(r["data"] or "{}"),
        } for r in rows]
        return 200, counts

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

def create_session(conn: sqlite3.Connection, uid: int) -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(24)
    conn.execute("INSERT INTO sessions (token, user_id, csrf, created_at, expires_at) VALUES (?,?,?,?,?)",
                 (token, uid, csrf, now_iso(),
                  (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).replace(microsecond=0).isoformat()))
    conn.commit()
    return token, csrf


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

def send_account_code(address: str, code: str, purpose: str) -> bool:
    if DEMO_MAIL:
        sys.stderr.write(f"[mail-demo] {purpose} {address}: {code}\n")
        return True
    if not SMTP_HOST:
        return False
    try:
        message = EmailMessage()
        message["From"] = os.environ["BUKATOKO_SMTP_FROM"]
        message["To"] = address
        message["Subject"] = f"JualinAja: {purpose}"
        message.set_content(f"Kode JualinAja: {code}")
        with smtplib.SMTP(SMTP_HOST, int(os.environ.get("BUKATOKO_SMTP_PORT", "587")), timeout=8) as mailer:
            mailer.starttls(context=ssl.create_default_context())
            if os.environ.get("BUKATOKO_SMTP_USER"):
                mailer.login(os.environ["BUKATOKO_SMTP_USER"], os.environ["BUKATOKO_SMTP_PASSWORD"])
            mailer.send_message(message)
        return True
    except (OSError, KeyError, ValueError):
        sys.stderr.write("[mail] Pengiriman kode gagal. Periksa konfigurasi SMTP.\n")
        return False


def api_post(path: str, body: dict, uid: int | None, conn: sqlite3.Connection, ip: str = ""):
    if path == "/api/signup":
        if not limit_ok("signup_ip", ip or "?"):
            return 429, {"error": limit_message("signup_ip")}
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
        token_verify = secrets.token_urlsafe(18)
        cur = conn.execute(
            "INSERT INTO users (name, email, pass_hash, verify_token, created_at) VALUES (?,?,?,?,?)",
            (name, mail, hash_password(pw), token_verify, now_iso()))
        session, csrf = create_session(conn, cur.lastrowid)
        payload = {"token": session, "csrf": csrf, "user": public_user(conn, cur.lastrowid),
                   "verify_required": True}
        if DEMO_MAIL:
            payload["demo_verify_code"] = token_verify
        send_account_code(mail, token_verify, "Verifikasi email")
        return 200, payload

    if path == "/api/login":
        mail = (body.get("email") or "").strip().lower()
        pw = body.get("password") or ""
        if not limit_ok("login_ip", ip or "?"):
            return 429, {"error": limit_message("login_ip")}
        if not limit_ok("login_mail", mail or "?"):
            return 429, {"error": limit_message("login_mail")}
        row = conn.execute("SELECT id, pass_hash, suspended FROM users WHERE email=? OR name=?",
                           (mail, mail)).fetchone()
        if not row or not verify_password(pw, row["pass_hash"]):
            return 401, {"error": "Email atau kata sandi salah."}
        if row["suspended"]:
            return 403, {"error": "Akun ini sedang dibekukan oleh moderator."}
        session, csrf = create_session(conn, row["id"])
        return 200, {"token": session, "csrf": csrf, "user": public_user(conn, row["id"])}

    if path == "/api/logout":
        token = body.get("token") or ""
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
        return 200, {"ok": True}

    if path == "/api/verify":
        code = (body.get("code") or "").strip()
        if not uid:
            return 401, {"error": "masuk dulu"}
        row = conn.execute("SELECT verify_token FROM users WHERE id=?", (uid,)).fetchone()
        if not row or not row["verify_token"] or not hmac.compare_digest(row["verify_token"], code):
            return 400, {"error": "Kode verifikasi tidak cocok."}
        conn.execute("UPDATE users SET email_verified=1, verify_token=NULL WHERE id=?", (uid,))
        conn.commit()
        return 200, {"ok": True, "email_verified": True}

    if path == "/api/verify/resend":
        if not uid:
            return 401, {"error": "masuk dulu"}
        if not limit_ok("verify_user", str(uid)):
            return 429, {"error": limit_message("verify_user")}
        address = conn.execute("SELECT email FROM users WHERE id=?", (uid,)).fetchone()["email"]
        token_verify = secrets.token_urlsafe(18)
        conn.execute("UPDATE users SET verify_token=? WHERE id=?", (token_verify, uid))
        conn.commit()
        if not send_account_code(address, token_verify, "Verifikasi email"):
            return 503, {"error": "Pengiriman email belum tersedia."}
        payload = {"ok": True}
        if DEMO_MAIL:
            payload["demo_verify_code"] = token_verify
        return 200, payload

    if path == "/api/reset/request":
        if not DEMO_MAIL and not SMTP_HOST:
            return 503, {"error": "Pengiriman email belum tersedia."}
        mail = (body.get("email") or "").strip().lower()
        if not limit_ok("reset_ip", ip or "?"):
            return 429, {"error": limit_message("reset_ip")}
        if not limit_ok("reset_mail", mail or "?"):
            return 429, {"error": limit_message("reset_mail")}
        row = conn.execute("SELECT id, email FROM users WHERE email=? OR name=?", (mail, mail)).fetchone()
        # jawaban sama untuk email yang tidak ada, supaya tidak jadi alat menebak akun
        payload = {"ok": True,
                   "message": "Kalau email itu terdaftar, kode reset sudah dibuat."}
        if row:
            code = f"{secrets.randbelow(10 ** 6):06d}"
            expires = (datetime.now(timezone.utc) + timedelta(minutes=RESET_MINUTES)).replace(microsecond=0).isoformat()
            conn.execute("UPDATE users SET reset_token=?, reset_expires=? WHERE id=?",
                         (code, expires, row["id"]))
            conn.commit()
            send_account_code(row["email"], code, "Reset kata sandi")
            if DEMO_MAIL:
                payload["demo_reset_code"] = code
                payload["expires_minutes"] = RESET_MINUTES
        return 200, payload

    if path == "/api/reset/confirm":
        mail = (body.get("email") or "").strip().lower()
        if not limit_ok("reset_confirm_ip", ip or "?"):
            return 429, {"error": limit_message("reset_confirm_ip")}
        code = (body.get("code") or "").strip()
        pw = body.get("password") or ""
        if len(pw) < 8:
            return 400, {"error": "Kata sandi minimal 8 karakter."}
        row = conn.execute("SELECT id, reset_token, reset_expires FROM users WHERE email=? OR name=?",
                           (mail, mail)).fetchone()
        if row and not limit_ok("reset_confirm_mail", str(row["id"])):
            return 429, {"error": limit_message("reset_confirm_mail")}
        if not row or not row["reset_token"] or not hmac.compare_digest(row["reset_token"], code):
            return 400, {"error": "Kode reset salah atau sudah dipakai."}
        if not row["reset_expires"] or row["reset_expires"] < now_iso():
            return 400, {"error": "Kode reset kedaluwarsa. Minta kode baru."}
        conn.execute("UPDATE users SET pass_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?",
                     (hash_password(pw), row["id"]))
        conn.execute("DELETE FROM sessions WHERE user_id=?", (row["id"],))
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
            "INSERT INTO listings (id, owner_id, title, price, old_price, category, condition, city, description, status, expires_at, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,'active',?,?)",
            (lid, uid, title, price, body.get("old_price") if isinstance(body.get("old_price"), int) else None,
             category, (body.get("condition") or "Bekas").strip(), city,
             (body.get("description") or "").strip(),
             (datetime.now(timezone.utc) + timedelta(days=LISTING_DAYS)).replace(microsecond=0).isoformat(),
             now_iso()))
        for i, url in enumerate(photos):
            conn.execute("INSERT INTO photos (listing_id, url, position) VALUES (?,?,?)", (lid, url, i))
        row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (lid,)).fetchone()
        for w in wanted_matches(conn, row):
            notify(conn, w["owner_id"], "wanted",
                   f"Barang baru cocok dengan permintaanmu: {row['title']} ({rupiah(row['price'])})",
                   lid, uid, {"wanted": w["id"], "price": row["price"]})
        conn.commit()
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
        row = conn.execute("SELECT id, title FROM listings WHERE id=?", (m.group(1),)).fetchone()
        for saver in conn.execute("SELECT user_id FROM saved WHERE listing_id=? AND user_id<>?",
                                  (m.group(1), uid)).fetchall():
            notify(conn, saver["user_id"], "sold",
                   f"Barang yang kamu simpan sudah terjual: {row['title']}", row["id"], uid, {})
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
            (("r" + uuid.uuid4().hex[:10]), lid, uid, subject, "pembeli" if buyer_ok else "penjual",
             stars, (body.get("body") or "").strip()[:800], now_iso()))
        author = conn.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()["name"]
        notify(conn, subject, "review", f"{author} memberi {stars} bintang untuk {row['title']}", lid, uid,
               {"stars": stars})
        conn.commit()
        return 201, {"ok": True, "rating": rating_summary(conn, subject)}

    if path == "/api/offers":
        if not uid:
            return 401, {"error": "masuk dulu untuk mengajukan tawaran"}
        if not limit_ok("offer_user", str(uid)):
            return 429, {"error": limit_message("offer_user")}
        lid = (body.get("listing_id") or "").strip()
        amount = body.get("amount")
        row = conn.execute("SELECT owner_id, price, status, title FROM listings WHERE id=?", (lid,)).fetchone()
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
        notify(conn, row["owner_id"], "offer",
               f"Tawaran {rupiah(amount)} untuk {row['title']} menunggu jawabanmu.", lid, uid,
               {"offer": oid, "amount": amount})
        conn.commit()
        return 201, {"ok": True, "id": oid, "status": "proposed"}

    m = re.fullmatch(r"/api/offers/([A-Za-z0-9_-]+)/(accept|decline)", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        offer = conn.execute("SELECT * FROM offers WHERE id=?", (m.group(1),)).fetchone()
        if not offer:
            return 404, {"error": "tawaran tidak ditemukan"}
        listing = conn.execute("SELECT owner_id, status, title FROM listings WHERE id=?",
                               (offer["listing_id"],)).fetchone()
        if m.group(2) == "accept":
            if listing["owner_id"] != uid:
                return 403, {"error": "hanya penjual yang bisa menerima tawaran"}
            if offer["status"] != "proposed":
                return 409, {"error": "Tawaran ini sudah tidak aktif."}
            if listing["status"] != "active":
                return 409, {"error": "Barang sudah terjual."}
            conn.execute("UPDATE offers SET status='accepted', accepted_at=?, updated_at=? WHERE id=?",
                         (now_iso(), now_iso(), offer["id"]))
            conn.execute("UPDATE offers SET status='declined', updated_at=? WHERE listing_id=? AND id<>? AND status='proposed'",
                         (now_iso(), offer["listing_id"], offer["id"]))
            conn.execute("UPDATE listings SET status='sold' WHERE id=?", (offer["listing_id"],))
            for saver in conn.execute("SELECT user_id FROM saved WHERE listing_id=? AND user_id<>?",
                                      (offer["listing_id"], uid)).fetchall():
                notify(conn, saver["user_id"], "sold",
                       f"Barang yang kamu simpan sudah terjual: {listing['title']}",
                       offer["listing_id"], uid, {"offer": offer["id"]})
            notify(conn, offer["buyer_id"], "accepted",
                   f"Tawaranmu {rupiah(offer['amount'])} untuk {listing['title']} diterima. Atur serah terima lewat chat.",
                   offer["listing_id"], uid, {"offer": offer["id"], "amount": offer["amount"]})
            for other in conn.execute(
                    "SELECT id, buyer_id, amount FROM offers WHERE listing_id=? AND id<>? AND status='declined'",
                    (offer["listing_id"], offer["id"])).fetchall():
                notify(conn, other["buyer_id"], "declined",
                       f"Tawaranmu {rupiah(other['amount'])} untuk {listing['title']} belum bisa diambil.",
                       offer["listing_id"], uid, {"offer": other["id"]})
            conn.commit()
            return 200, {"ok": True, "status": "accepted"}
        if uid not in (offer["buyer_id"], listing["owner_id"]):
            return 403, {"error": "bukan pihak dalam tawaran ini"}
        if offer["status"] != "proposed":
            return 409, {"error": "Tawaran ini sudah tidak aktif."}
        outcome = "withdrawn" if uid == offer["buyer_id"] else "declined"
        conn.execute("UPDATE offers SET status=?, updated_at=? WHERE id=?", (outcome, now_iso(), offer["id"]))
        other_side = listing["owner_id"] if uid == offer["buyer_id"] else offer["buyer_id"]
        notify(conn, other_side, outcome,
               (f"Penawar menarik tawarannya untuk {listing['title']}." if outcome == "withdrawn"
                else f"Tawaranmu {rupiah(offer['amount'])} untuk {listing['title']} ditolak."),
               offer["listing_id"], uid, {"offer": offer["id"], "amount": offer["amount"]})
        conn.commit()
        return 200, {"ok": True, "status": outcome}

    if path == "/api/messages":
        if not uid:
            return 401, {"error": "masuk dulu untuk mengirim pesan"}
        if not limit_ok("message_user", str(uid)):
            return 429, {"error": limit_message("message_user")}
        lid = (body.get("listing_id") or "").strip()
        text = (body.get("body") or "").strip()
        if not text:
            return 400, {"error": "Pesan kosong."}
        if len(text) > 1000:
            return 400, {"error": "Pesan maksimal 1000 karakter."}
        row = conn.execute("SELECT owner_id, title FROM listings WHERE id=?", (lid,)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        thread_user = uid if uid != row["owner_id"] else int(body.get("with") or 0)
        if not thread_user:
            return 400, {"error": "Tentukan lawan bicara."}
        conn.execute("INSERT INTO messages (id, listing_id, thread_user, sender_id, body, created_at)"
                     " VALUES (?,?,?,?,?,?)",
                     ("m" + uuid.uuid4().hex[:10], lid, thread_user, uid, text, now_iso()))
        recipient = thread_user if uid == row["owner_id"] else row["owner_id"]
        sender = conn.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()["name"]
        notify(conn, recipient, "message", f"Pesan baru dari {sender} tentang {row['title']}", lid, uid,
               {"thread_user": thread_user, "preview": text[:80]})
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
        conn.execute("INSERT INTO wanted (id, owner_id, title, category, price_min, price_max, city, note, status, expires_at, created_at)"
                     " VALUES (?,?,?,?,?,?,?,?,'open',?,?)",
                     (wid, uid, title, cat, lo, hi, city, (body.get("note") or "").strip()[:400],
                      (datetime.now(timezone.utc) + timedelta(days=WANTED_DAYS)).replace(microsecond=0).isoformat(),
                      now_iso()))
        conn.commit()
        return 201, {"ok": True, "id": wid}

    if path == "/api/reports":
        if not uid:
            return 401, {"error": "masuk dulu untuk melapor"}
        if not limit_ok("report_user", str(uid)):
            return 429, {"error": limit_message("report_user")}
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

    # ------------------------------------------------------------ sosial
    if path == "/api/likes":
        if not uid:
            return 401, {"error": "masuk dulu untuk menyukai"}
        if not limit_ok("likes_user", str(uid)):
            return 429, {"error": limit_message("likes_user")}
        ttype = (body.get("target_type") or "").strip()
        tid = (body.get("target_id") or "").strip()
        if ttype not in {"listing", "wanted"} or not tid:
            return 400, {"error": "target tidak dikenal"}
        if not target_exists(conn, ttype, tid):
            return 404, {"error": "postingan tidak ditemukan"}
        existing = conn.execute(
            "SELECT 1 FROM likes WHERE user_id=? AND target_type=? AND target_id=?",
            (uid, ttype, tid)).fetchone()
        if existing:
            conn.execute("DELETE FROM likes WHERE user_id=? AND target_type=? AND target_id=?",
                         (uid, ttype, tid))
        else:
            conn.execute("INSERT INTO likes (user_id, target_type, target_id, created_at) VALUES (?,?,?,?)",
                         (uid, ttype, tid, now_iso()))
        conn.commit()
        counts = social_counts(conn, ttype, tid, uid)
        return 200, {"liked": counts["liked"], "likes": counts["likes"]}

    if path == "/api/comments":
        if not uid:
            return 401, {"error": "masuk dulu untuk berkomentar"}
        if not limit_ok("comment_user", str(uid)):
            return 429, {"error": limit_message("comment_user")}
        ttype = (body.get("target_type") or "").strip()
        tid = (body.get("target_id") or "").strip()
        text = (body.get("body") or "").strip()
        if ttype not in {"listing", "wanted"} or not tid:
            return 400, {"error": "target tidak dikenal"}
        if not target_exists(conn, ttype, tid):
            return 404, {"error": "postingan tidak ditemukan"}
        if not text:
            return 400, {"error": "Tulis komentar dulu."}
        if len(text) > 600:
            return 400, {"error": "Komentar maksimal 600 karakter."}
        cid = "c" + uuid.uuid4().hex[:10]
        conn.execute("INSERT INTO comments (id, target_type, target_id, author_id, body, created_at)"
                     " VALUES (?,?,?,?,?,?)", (cid, ttype, tid, uid, text, now_iso()))
        owner_id = conn.execute(
            f"SELECT owner_id FROM {'listings' if ttype == 'listing' else 'wanted'} WHERE id=?",
            (tid,)).fetchone()["owner_id"]
        if owner_id != uid:
            notify(conn, owner_id, "comment",
                   f"Komentar baru dari {conn.execute('SELECT name FROM users WHERE id=?', (uid,)).fetchone()[0]}",
                   tid if ttype == "listing" else None, uid, {"comment": cid, "target_type": ttype})
        conn.commit()
        return 201, {"ok": True, "id": cid}

    m = re.fullmatch(r"/api/wanted/([A-Za-z0-9_-]+)/reply", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu untuk menanggapi permintaan"}
        if not limit_ok("comment_user", str(uid)):
            return 429, {"error": limit_message("comment_user")}
        wanted = conn.execute("SELECT id, owner_id, title FROM wanted WHERE id=?", (m.group(1),)).fetchone()
        if not wanted:
            return 404, {"error": "permintaan tidak ditemukan"}
        if wanted["owner_id"] == uid:
            return 400, {"error": "Tidak perlu menanggapi permintaan sendiri."}
        text = (body.get("body") or "").strip()
        listing_id = (body.get("listing_id") or "").strip() or None
        if listing_id:
            mine = conn.execute("SELECT id, title FROM listings WHERE id=? AND owner_id=?",
                                (listing_id, uid)).fetchone()
            if not mine:
                return 403, {"error": "Barang itu bukan milikmu."}
            if not text:
                text = "Saya punya barangnya: " + mine["title"]
        if not text:
            return 400, {"error": "Tulis pesan atau pilih barang yang kamu punya."}
        rid = "wr" + uuid.uuid4().hex[:10]
        conn.execute("INSERT INTO wanted_replies (id, wanted_id, user_id, listing_id, body, created_at)"
                     " VALUES (?,?,?,?,?,?)", (rid, wanted["id"], uid, listing_id, text[:600], now_iso()))
        sender = conn.execute("SELECT name FROM users WHERE id=?", (uid,)).fetchone()["name"]
        notify(conn, wanted["owner_id"], "wanted_reply",
               f"{sender} menanggapi permintaanmu: {wanted['title']}", listing_id, uid,
               {"wanted": wanted["id"], "reply": rid})
        conn.commit()
        return 201, {"ok": True, "id": rid}

    # ------------------------------------------------------------ siklus hidup
    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)/renew", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        row = conn.execute("SELECT owner_id, status FROM listings WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "barang tidak ditemukan"}
        if row["owner_id"] != uid:
            return 403, {"error": "hanya pemilik yang bisa memperpanjang"}
        if row["status"] == "removed":
            return 409, {"error": "Barang ini sudah diturunkan moderator dan tidak bisa diperpanjang."}
        expires = (datetime.now(timezone.utc) + timedelta(days=LISTING_DAYS)).replace(microsecond=0).isoformat()
        conn.execute("UPDATE listings SET expires_at=? WHERE id=?", (expires, m.group(1)))
        conn.commit()
        return 200, {"ok": True, "expires_at": expires}

    m = re.fullmatch(r"/api/wanted/([A-Za-z0-9_-]+)/close", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        row = conn.execute("SELECT owner_id FROM wanted WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "permintaan tidak ditemukan"}
        if row["owner_id"] != uid:
            return 403, {"error": "hanya penulis permintaan yang bisa menutupnya"}
        conn.execute("UPDATE wanted SET status='closed' WHERE id=?", (m.group(1),))
        conn.commit()
        return 200, {"ok": True, "status": "closed"}

    m = re.fullmatch(r"/api/offers/([A-Za-z0-9_-]+)/handover", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        offer = conn.execute("SELECT o.*, l.owner_id, l.title FROM offers o JOIN listings l ON l.id=o.listing_id "
                             "WHERE o.id=?", (m.group(1),)).fetchone()
        if not offer:
            return 404, {"error": "tawaran tidak ditemukan"}
        if uid not in (offer["buyer_id"], offer["owner_id"]):
            return 403, {"error": "bukan pihak dalam transaksi ini"}
        if offer["status"] != "accepted":
            return 409, {"error": "Serah terima hanya untuk tawaran yang sudah diterima."}
        conn.execute("UPDATE offers SET handover_at=? WHERE id=?", (now_iso(), offer["id"]))
        other = offer["owner_id"] if uid == offer["buyer_id"] else offer["buyer_id"]
        notify(conn, other, "handover", f"Serah terima {offer['title']} ditandai selesai.", offer["listing_id"], uid, {})
        conn.commit()
        return 200, {"ok": True, "handover_at": now_iso()}

    m = re.fullmatch(r"/api/reviews/([A-Za-z0-9_-]+)/reply", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        body_text = (body.get("body") or "").strip()
        if not body_text:
            return 400, {"error": "Tulis balasan dulu."}
        row = conn.execute("SELECT subject_id, reply, listing_id FROM reviews WHERE id=?", (m.group(1),)).fetchone()
        if not row:
            return 404, {"error": "ulasan tidak ditemukan"}
        if row["subject_id"] != uid:
            return 403, {"error": "hanya yang diulas yang bisa membalas"}
        if row["reply"]:
            return 409, {"error": "Ulasan ini sudah kamu balas sekali."}
        conn.execute("UPDATE reviews SET reply=?, replied_at=? WHERE id=?",
                     (body_text[:600], now_iso(), m.group(1)))
        conn.commit()
        return 200, {"ok": True}

    m = re.fullmatch(r"/api/reports/([A-Za-z0-9_-]+)/resolve", path)
    if m:
        if not uid:
            return 401, {"error": "masuk dulu"}
        if not is_moderator(conn, uid):
            return 403, {"error": "hanya moderator"}
        action = (body.get("action") or "").strip()
        if action not in {"dismiss", "remove_listing", "suspend_user"}:
            return 400, {"error": "Aksi tidak dikenal."}
        rep = conn.execute("SELECT * FROM reports WHERE id=?", (m.group(1),)).fetchone()
        if not rep:
            return 404, {"error": "laporan tidak ditemukan"}
        if rep["status"] != "open":
            return 409, {"error": "Laporan ini sudah ditindak."}
        if action == "remove_listing" and rep["listing_id"]:
            owner = conn.execute("SELECT owner_id, title FROM listings WHERE id=?",
                                 (rep["listing_id"],)).fetchone()
            conn.execute("UPDATE listings SET status='removed' WHERE id=?", (rep["listing_id"],))
            if owner:
                notify(conn, owner["owner_id"], "moderation",
                       f"Barang {owner['title']} diturunkan moderator setelah ditinjau.", rep["listing_id"], None, {})
        if action == "suspend_user" and rep["listing_id"]:
            owner = conn.execute("SELECT owner_id FROM listings WHERE id=?", (rep["listing_id"],)).fetchone()
            if owner:
                conn.execute("UPDATE users SET suspended=1 WHERE id=?", (owner["owner_id"],))
                conn.execute("DELETE FROM sessions WHERE user_id=?", (owner["owner_id"],))
                conn.execute("UPDATE listings SET status='removed' WHERE owner_id=? AND status='active'",
                             (owner["owner_id"],))
        conn.execute("UPDATE reports SET status='resolved', action=?, reviewed_by=?, reviewed_at=? WHERE id=?",
                     (action, uid, now_iso(), m.group(1)))
        conn.commit()
        return 200, {"ok": True, "action": action}

    if path == "/api/notifications/read":
        if not uid:
            return 401, {"error": "masuk dulu"}
        ids = body.get("ids")
        if isinstance(ids, list) and ids:
            clean = [i for i in ids if isinstance(i, str)][:100]
            conn.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL AND id IN (%s)"
                         % ",".join("?" * len(clean)), [now_iso(), uid] + clean)
        else:
            conn.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
                         (now_iso(), uid))
        conn.commit()
        return 200, {"ok": True, "unread_events": unread_notifications(conn, uid)}

    return 404, {"error": "endpoint tidak dikenal"}


# ---------------------------------------------------------------- PATCH

def api_patch(path: str, body: dict, uid: int | None, conn: sqlite3.Connection, ip: str = ""):
    """Ubah barang milik sendiri. Menurunkan harga memicu notifikasi ke penyimpan."""
    if not uid:
        return 401, {"error": "masuk dulu"}
    m = re.fullmatch(r"/api/listings/([A-Za-z0-9_-]+)", path)
    if not m:
        return 404, {"error": "endpoint tidak dikenal"}
    row = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (m.group(1),)).fetchone()
    if not row:
        return 404, {"error": "barang tidak ditemukan"}
    if row["owner_id"] != uid:
        return 403, {"error": "hanya pemilik barang yang bisa mengubah"}

    fields: dict[str, object] = {}
    if "title" in body:
        title = (body.get("title") or "").strip()
        if not 5 <= len(title) <= 90:
            return 400, {"error": "Judul 5-90 karakter."}
        fields["title"] = title
    if "price" in body:
        price = body.get("price")
        if not isinstance(price, int) or price <= 0:
            return 400, {"error": "Harga harus angka lebih dari nol."}
        fields["price"] = price
    if "old_price" in body:
        fields["old_price"] = body["old_price"] if isinstance(body["old_price"], int) else None
    if "description" in body:
        fields["description"] = (body.get("description") or "").strip()[:2000]
    if "city" in body:
        city = (body.get("city") or "").strip()
        if not city:
            return 400, {"error": "Lokasi wajib diisi."}
        fields["city"] = city
    if "condition" in body:
        fields["condition"] = (body.get("condition") or "").strip() or "Bekas"
    if "category" in body:
        category = (body.get("category") or "").strip()
        if not category:
            return 400, {"error": "Kategori wajib diisi."}
        fields["category"] = category

    photos = None
    if isinstance(body.get("photos"), list):
        photos = [p for p in body["photos"] if isinstance(p, str) and p.startswith("/uploads/")
                  and SAFE_UPLOAD.match(p.rsplit("/", 1)[-1])][:10]

    if not fields and photos is None:
        return 400, {"error": "Tidak ada perubahan."}

    if fields:
        conn.execute("UPDATE listings SET %s WHERE id=?" % ", ".join(f"{k}=?" for k in fields.keys()),
                     list(fields.values()) + [row["id"]])
    if photos is not None:
        conn.execute("DELETE FROM photos WHERE listing_id=?", (row["id"],))
        for i, url in enumerate(photos):
            conn.execute("INSERT INTO photos (listing_id, url, position) VALUES (?,?,?)", (row["id"], url, i))

    new_price = int(fields.get("price", row["price"]))
    if new_price < row["price"]:
        for saver in conn.execute("SELECT user_id FROM saved WHERE listing_id=? AND user_id<>?",
                                  (row["id"], uid)).fetchall():
            notify(conn, saver["user_id"], "price_drop",
                   f"Harga turun: {fields.get('title', row['title'])} sekarang {rupiah(new_price)}",
                   row["id"], uid, {"old": row["price"], "new": new_price})

    conn.commit()
    fresh = conn.execute(f"SELECT {LISTING_COLS} FROM listings WHERE id=?", (row["id"],)).fetchone()
    return 200, listing_json(conn, fresh, uid)

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
        conn.execute("DELETE FROM notifications WHERE listing_id=?", (m.group(1),))
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
CSRF_COOKIE = "bk_csrf"
CSRF_EXEMPT = ("/api/login", "/api/signup", "/api/logout", "/api/reset/request", "/api/reset/confirm")
BLOCKED_STATIC = (".py", ".pyc", ".db", ".log", ".sqlite", ".bak")


def rate_ok(ip: str) -> bool:
    return limit_ok("upload_ip", ip)


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


MIN_IMAGE_SIDE = 200


def image_size(data: bytes, kind: str) -> tuple[int, int] | None:
    """Baca dimensi tanpa pustaka pihak ketiga."""
    try:
        if kind == "image/png" and data[:8] == b"\x89PNG\r\n\x1a\n":
            return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
        if kind == "image/gif" and data[:3] == b"GIF":
            return int.from_bytes(data[6:8], "little"), int.from_bytes(data[8:10], "little")
        if kind == "image/jpeg" and data[:2] == b"\xff\xd8":
            i = 2
            while i < len(data) - 9:
                if data[i] != 0xFF:
                    i += 1
                    continue
                marker = data[i + 1]
                if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                    i += 2
                    continue
                seg_len = int.from_bytes(data[i + 2:i + 4], "big")
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    return int.from_bytes(data[i + 7:i + 9], "big"), int.from_bytes(data[i + 5:i + 7], "big")
                i += 2 + seg_len
            return None
        if kind == "image/webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            chunk = data[12:16]
            if chunk == b"VP8X":
                return (int.from_bytes(data[24:27], "little") + 1,
                        int.from_bytes(data[27:30], "little") + 1)
            if chunk == b"VP8 ":
                return (int.from_bytes(data[26:28], "little") & 0x3FFF,
                        int.from_bytes(data[28:30], "little") & 0x3FFF)
            if chunk == b"VP8L":
                bits = int.from_bytes(data[21:25], "little")
                return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    except (IndexError, ValueError):
        return None
    return None


def strip_metadata(data: bytes, kind: str) -> bytes:
    """Buang EXIF dan teks tersembunyi dari foto sebelum disimpan."""
    try:
        if kind == "image/jpeg" and data[:2] == b"\xff\xd8":
            out = bytearray(data[:2])
            i = 2
            while i < len(data) - 1:
                if data[i] != 0xFF:
                    out += data[i:]
                    break
                marker = data[i + 1]
                if marker == 0xDA:
                    out += data[i:]
                    break
                if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                    out += data[i:i + 2]
                    i += 2
                    continue
                seg_len = int.from_bytes(data[i + 2:i + 4], "big")
                if marker not in (0xE1, 0xFE):
                    out += data[i:i + 2 + seg_len]
                i += 2 + seg_len
            return bytes(out)
        if kind == "image/png" and data[:8] == b"\x89PNG\r\n\x1a\n":
            out = bytearray(data[:8])
            i = 8
            drop = {b"tEXt", b"iTXt", b"zTXt", b"eXIf", b"tIME"}
            while i + 12 <= len(data):
                length = int.from_bytes(data[i:i + 4], "big")
                ctype = data[i + 4:i + 8]
                if ctype not in drop:
                    out += data[i:i + 12 + length]
                i += 12 + length
                if ctype == b"IEND":
                    break
            return bytes(out)
        if kind == "image/webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            out = bytearray(data[:12])
            i = 12
            while i + 8 <= len(data):
                ctype = data[i:i + 4]
                length = int.from_bytes(data[i + 4:i + 8], "little")
                if ctype not in (b"EXIF", b"XMP "):
                    out += data[i:i + 8 + length + (length & 1)]
                i += 8 + length + (length & 1)
            out[4:8] = (len(out) - 8).to_bytes(4, "little")
            return bytes(out)
    except (IndexError, ValueError):
        return data
    return data


def escape_attr(text: str) -> str:
    return (text or "").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


class Handler(SimpleHTTPRequestHandler):
    server_version = "JualinAja/2.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def address_string(self):
        if CLOUD_MODE and self.client_address[0] == "127.0.0.1":
            try:
                return str(ipaddress.ip_address(getattr(self, "headers", {}).get("X-Real-IP", "")))
            except ValueError:
                pass
        return self.client_address[0]

    def list_directory(self, path):
        self.send_error(404)
        return None

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

    def _json_with_cookies(self, code: int, payload, cookie_headers: list[str]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        for header in cookie_headers:
            self.send_header("Set-Cookie", header)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _cookie_value(self, name: str) -> str | None:
        raw = self.headers.get("Cookie")
        if not raw:
            return None
        jar = cookies.SimpleCookie()
        try:
            jar.load(raw)
        except cookies.CookieError:
            return None
        morsel = jar.get(name)
        return morsel.value if morsel else None

    def _csrf_ok(self, conn: sqlite3.Connection, path: str) -> bool:
        """Periksa token ganda: header harus sama dengan token di sesi."""
        if path in CSRF_EXEMPT:
            return True
        token = self._cookie_token()
        if not token:
            return True  # tamu: endpoint tulis akan menolak dengan 401
        row = conn.execute("SELECT csrf FROM sessions WHERE token=?", (token,)).fetchone()
        header = self.headers.get("X-CSRF-Token") or ""
        return bool(row and row["csrf"] and header and hmac.compare_digest(row["csrf"], header))

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

        if path.startswith(("/uploads/", "/avatars/")):
            directory = AVATAR_DIR if path.startswith("/avatars/") else UPLOAD_DIR
            name = path.split("/", 2)[2]
            target = directory / name
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
        title = f"{data['title']} · Rp {data['price']:,} · JualinAja".replace(",", ".")
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
        html = re.sub(r"</title>", lambda match: match.group(0) + "\n" + meta, html, count=1, flags=re.I)
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

        if path in {"/api/upload", "/api/avatar"}:
            self._handle_upload(avatar=path == "/api/avatar")
            return
        if not path.startswith("/api/"):
            self._json(404, {"error": "endpoint tidak dikenal"})
            return

        body = self._read_json()
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
            if not self._csrf_ok(conn, path):
                self._json(403, {"error": "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi."})
                return
            if path == "/api/logout":
                body = {"token": self._cookie_token() or body.get("token", "")}
            code, payload = api_post(path, body, uid, conn, self.address_string())
            if code == 200 and path in ("/api/login", "/api/signup") and payload.get("token"):
                self._json_with_cookies(code, payload, [
                    f"{COOKIE}={payload['token']}; Path=/; Max-Age={SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax{COOKIE_SECURITY}",
                    f"{CSRF_COOKIE}={payload.get('csrf', '')}; Path=/; Max-Age={SESSION_DAYS * 86400}; SameSite=Lax{COOKIE_SECURITY}",
                ])
                return
            if code == 200 and path == "/api/logout":
                self._json_with_cookies(code, payload, [
                    f"{COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax{COOKIE_SECURITY}",
                    f"{CSRF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax{COOKIE_SECURITY}",
                ])
                return
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(f"api_post error: {exc}\n")
            code, payload = 500, {"error": "kesalahan server"}
        finally:
            conn.close()
        self._json(code, payload)

    def _handle_upload(self, *, avatar: bool = False) -> None:
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
            if not self._csrf_ok(conn, "/api/upload"):
                self._json(403, {"error": "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi."})
                return
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
        if avatar and len(parts) != 1:
            self._json(400, {"error": "Pilih satu foto profil."})
            return
        directory = AVATAR_DIR if avatar else UPLOAD_DIR
        directory.mkdir(parents=True, exist_ok=True)
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
            size = image_size(data, kind)
            if not size:
                self._json(415, {"error": "berkas ini tidak terbaca sebagai gambar utuh."})
                return
            if min(size) < MIN_IMAGE_SIDE:
                self._json(415, {"error": f"foto terlalu kecil ({size[0]}x{size[1]}). Minimal {MIN_IMAGE_SIDE} px sisi terpendek."})
                return
            data = strip_metadata(data, kind)
            name = uuid.uuid4().hex + ALLOWED_IMAGES[kind]
            target = directory / name
            target.write_bytes(data)
            if avatar:
                url = f"/avatars/{name}"
                conn = db()
                try:
                    conn.execute("BEGIN IMMEDIATE")
                    old_url = conn.execute("SELECT avatar_url FROM users WHERE id=?", (uid,)).fetchone()["avatar_url"]
                    conn.execute("UPDATE users SET avatar_url=? WHERE id=?", (url, uid))
                    conn.commit()
                except sqlite3.Error:
                    target.unlink(missing_ok=True)
                    self._json(500, {"error": "kesalahan server"})
                    return
                finally:
                    conn.close()
                old_name = (old_url or "").removeprefix("/avatars/")
                if SAFE_UPLOAD.fullmatch(old_name):
                    (directory / old_name).unlink(missing_ok=True)
                self._json(200, {"avatar_url": url})
                return
            saved.append({"url": f"/uploads/{name}", "bytes": len(data), "type": kind, "size": list(size)})
        self._json(200, {"files": saved})

    def do_PATCH(self):  # noqa: N802
        path = unquote(urlsplit(self.path).path)
        if not path.startswith("/api/"):
            self._json(404, {"error": "endpoint tidak dikenal"})
            return
        body = self._read_json()
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
            if not self._csrf_ok(conn, path):
                self._json(403, {"error": "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi."})
                return
            code, payload = api_patch(path, body, uid, conn, self.address_string())
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(f"api_patch error: {exc}\n")
            code, payload = 500, {"error": "kesalahan server"}
        finally:
            conn.close()
        self._json(code, payload)

    def do_DELETE(self):  # noqa: N802
        path = unquote(urlsplit(self.path).path)
        if not path.startswith("/api/"):
            self._json(404, {"error": "endpoint tidak dikenal"})
            return
        conn = db()
        try:
            uid = session_user(conn, self._cookie_token())
            if not self._csrf_ok(conn, path):
                self._json(403, {"error": "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi."})
                return
            code, payload = api_delete(path, uid, conn)
        except Exception as exc:  # noqa: BLE001
            sys.stderr.write(f"api_delete error: {exc}\n")
            code, payload = 500, {"error": "kesalahan server"}
        finally:
            conn.close()
        self._json(code, payload)

    def send_error(self, code, message=None, explain=None):  # noqa: N802
        """404 memakai halaman situs, bukan halaman bawaan http.server."""
        if code == 404 and not self.path.startswith("/api/"):
            page = ROOT / "404.html"
            if page.is_file():
                body = page.read_bytes()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return
        super().send_error(code, message, explain)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        # aset teks tidak boleh di-cache heuristik: demo ini sering berubah
        if self.path.split("?")[0].endswith((".js", ".css", ".html", ".svg")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    if CLOUD_MODE and not (os.environ.get("BUKATOKO_DB") and os.environ.get("BUKATOKO_UPLOAD_DIR")):
        raise SystemExit("Cloud mode requires explicit persistent database and upload paths.")
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    init_db()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    removed = cleanup_orphans()
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"JualinAja di http://127.0.0.1:{port}/index.html (foto yatim dibersihkan: {removed})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nberhenti")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()



