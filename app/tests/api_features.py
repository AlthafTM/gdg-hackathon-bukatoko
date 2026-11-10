#!/usr/bin/env python3
"""Uji fitur keamanan dan siklus hidup Bukatoko 0.2.

Jalankan terhadap server yang hidup:
    python3 tests/api_features.py [base_url]
Server uji sebaiknya memakai basis data kosong (BUKATOKO_DB=/tmp/x.db).
"""

import http.cookiejar
import json
import os
import sqlite3
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
DB_PATH = os.environ.get("BUKATOKO_DB", "")
ok = 0
fail = 0


def check(label, cond, detail=""):
    global ok, fail
    if cond:
        ok += 1
        print(f"  ok    {label}")
    else:
        fail += 1
        print(f"  GAGAL {label} {detail}")


def client():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)), jar


def call(op, method, path, payload=None, raw=None, headers=None, csrf=True):
    data = None
    hdrs = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode()
        hdrs["Content-Type"] = "application/json"
    if raw is not None:
        data = raw
    if csrf and method in ("POST", "PATCH", "DELETE") and getattr(op, "csrf", ""):
        hdrs["X-CSRF-Token"] = op.csrf
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=hdrs)
    try:
        with op.open(req) as res:
            body = res.read()
            ctype = res.headers.get("Content-Type", "")
            out = json.loads(body) if "json" in ctype else body
            if isinstance(out, dict) and out.get("csrf"):
                op.csrf = out["csrf"]
            return res.status, out
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            return exc.code, json.loads(body)
        except json.JSONDecodeError:
            return exc.code, body


def signup(name, mail, pw="rahasia123"):
    op, jar = client()
    code, data = call(op, "POST", "/api/signup", {"name": name, "email": mail, "password": pw})
    return op, code, data


def png(width=240, height=240):
    raw = b"".join(b"\x00" + bytes([30, 107, 78]) * width for _ in range(height))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def jpeg_with_exif(width=240, height=240):
    """JPEG minimal dengan segmen EXIF, cukup untuk menguji pembersihan metadata."""
    exif = b"Exif\x00\x00" + b"II*\x00" + b"\x08\x00\x00\x00" + b"\x00" * 24
    app1 = b"\xff\xe1" + struct.pack(">H", len(exif) + 2) + exif
    sof = b"\xff\xc0" + struct.pack(">H", 17) + b"\x08" + struct.pack(">HH", height, width) + b"\x03" + b"\x01\x22\x00\x02\x11\x01\x03\x11\x01"
    sos = b"\xff\xda" + struct.pack(">H", 12) + b"\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00"
    return b"\xff\xd8" + app1 + sof + sos + b"\x00" * 32 + b"\xff\xd9"


def multipart(name, filename, content, ctype):
    boundary = uuid.uuid4().hex
    head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {ctype}\r\n\r\n").encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    return head + content + tail, f"multipart/form-data; boundary={boundary}"


def main():
    suffix = uuid.uuid4().hex[:6]
    seller, code, data = signup("jual." + suffix, f"jual.{suffix}@example.com")
    check("daftar mengembalikan token csrf", code == 200 and data.get("csrf"), str(code))
    seller_csrf = getattr(seller, "csrf", "")

    avatar_raw, avatar_type = multipart("photo", "avatar.png", png(), "image/png")
    avatar_headers = {"Content-Type": avatar_type}
    code, result = call(seller, "POST", "/api/avatar", raw=avatar_raw, headers=avatar_headers, csrf=False)
    check("unggah avatar wajib memakai CSRF", code == 403)
    code, result = call(seller, "POST", "/api/avatar", raw=avatar_raw, headers=avatar_headers)
    avatar_url = result.get("avatar_url", "")
    check("unggah avatar mengembalikan URL publik", code == 200 and avatar_url.startswith("/avatars/"))
    if avatar_url:
        code, contents = call(client()[0], "GET", avatar_url)
        check("avatar dapat dimuat publik", code == 200 and contents.startswith(b"\x89PNG"))
        code, profile = call(client()[0], "GET", f"/api/users/jual.{suffix}")
        check("profil menampilkan avatar pemilik", code == 200 and profile["user"]["avatar_url"] == avatar_url)
        code, replacement = call(seller, "POST", "/api/avatar", raw=avatar_raw, headers=avatar_headers)
        check("mengganti avatar membuat URL baru", code == 200 and replacement.get("avatar_url") != avatar_url)
        code, _ = call(client()[0], "GET", avatar_url)
        check("avatar lama dibersihkan setelah diganti", code == 404)

    buyer, code, data = signup("beli." + suffix, f"beli.{suffix}@example.com")
    check("daftar kedua", code == 200, str(data)[:100])

    print("token keamanan")
    code, data = call(seller, "POST", "/api/listings",
                      {"title": "Barang tanpa token", "price": 10000, "category": "buku", "city": "Bogor"},
                      csrf=False)
    check("POST tanpa token ditolak", code == 403, str(data))
    code, data = call(seller, "POST", "/api/listings",
                      {"title": "Barang dengan token", "price": 10000, "category": "buku", "city": "Bogor"})
    check("POST dengan token diterima", code == 201, str(data)[:120])

    print("verifikasi email")
    code, data = call(seller, "GET", "/api/me")
    check("akun baru belum terverifikasi", data.get("email_verified") is False, str(data.get("email_verified")))
    code, data = call(seller, "POST", "/api/verify", {"code": "salah"})
    check("kode verifikasi salah ditolak", code == 400, str(data))
    code, data = call(seller, "POST", "/api/verify/resend", {})
    code_verify = data.get("demo_verify_code", "")
    check("kirim ulang memberi kode demo", code == 200 and bool(code_verify), str(data))
    code, data = call(seller, "POST", "/api/verify", {"code": code_verify})
    check("verifikasi berhasil", code == 200 and data.get("email_verified"), str(data))
    code, data = call(seller, "GET", "/api/me")
    check("/api/me melaporkan terverifikasi", data.get("email_verified") is True, str(data.get("email_verified")))

    print("reset kata sandi")
    code, data = call(client()[0], "POST", "/api/reset/request", {"email": f"beli.{suffix}@example.com"})
    reset_code = data.get("demo_reset_code", "")
    check("permintaan reset memberi kode demo", code == 200 and bool(reset_code), str(data))
    code, data = call(client()[0], "POST", "/api/reset/request", {"email": "tidak.ada@example.com"})
    check("email tak terdaftar dijawab sama", code == 200 and "demo_reset_code" not in data, str(data))
    code, data = call(client()[0], "POST", "/api/reset/confirm",
                      {"email": f"beli.{suffix}@example.com", "code": "000000", "password": "sandibaru1"})
    check("kode reset salah ditolak", code == 400, str(data))
    code, data = call(client()[0], "POST", "/api/reset/confirm",
                      {"email": f"beli.{suffix}@example.com", "code": reset_code, "password": "sandibaru1"})
    check("reset dengan kode benar", code == 200, str(data))
    code, data = call(client()[0], "POST", "/api/login",
                      {"email": f"beli.{suffix}@example.com", "password": "sandibaru1"})
    check("login dengan sandi baru", code == 200, str(data)[:80])
    code, data = call(client()[0], "POST", "/api/login",
                      {"email": f"beli.{suffix}@example.com", "password": "rahasia123"})
    check("sandi lama tidak berlaku", code == 401, str(data))
    buyer = client()[0]
    call(buyer, "POST", "/api/login", {"email": f"beli.{suffix}@example.com", "password": "sandibaru1"})

    print("batas laju login")
    limited = False
    for _ in range(12):
        code, data = call(client()[0], "POST", "/api/login",
                          {"email": f"jual.{suffix}@example.com", "password": "salahterus"})
        if code == 429:
            limited = True
            break
    check("login berulang kena batas", limited, "tidak pernah 429")

    print("unggah foto")
    body, ctype = multipart("photo", "kecil.png", png(100, 100), "image/png")
    code, data = call(seller, "POST", "/api/upload", raw=body, headers={"Content-Type": ctype})
    check("foto terlalu kecil ditolak", code == 415, str(data))
    body, ctype = multipart("photo", "ok.png", png(), "image/png")
    code, data = call(seller, "POST", "/api/upload", raw=body, headers={"Content-Type": ctype})
    check("foto wajar diterima", code == 200 and data["files"], str(data)[:100])
    photo_url = data["files"][0]["url"] if code == 200 else ""

    body, ctype = multipart("photo", "exif.jpg", jpeg_with_exif(), "image/jpeg")
    code, data = call(seller, "POST", "/api/upload", raw=body, headers={"Content-Type": ctype})
    exif_url = data["files"][0]["url"] if code == 200 else ""
    check("jpeg dengan exif diterima", bool(exif_url), str(data)[:100])
    if exif_url:
        with seller.open(BASE + exif_url) as res:
            stored = res.read()
        check("exif sudah dibuang dari berkas tersimpan", b"Exif\x00\x00" not in stored, f"{len(stored)} byte")

    print("filter dan pencarian")
    code, data = call(seller, "POST", "/api/listings", {
        "title": f"Kamera uji cari {suffix}", "price": 750000, "category": "elektronik",
        "city": "Bandung", "description": "kamera mirrorless", "photos": [photo_url]})
    lid = data["id"]
    code, data = call(client()[0], "GET", "/api/listings?has_photo=1&q=kamera")
    check("filter hanya berfoto", code == 200 and all(i["photo_urls"] for i in data["items"]), str(data["total"]))
    code, data = call(client()[0], "GET", "/api/suggest?q=kam")
    check("saran kata kunci", code == 200 and any("Kamera" in t for t in data["items"]), str(data["items"])[:80])
    code, data = call(client()[0], "GET", "/api/listings?q=kamra%20mirrorles")
    check("salah ketik masih menemukan", code == 200 and data["total"] >= 1, str(data["total"]))

    print("suka, komentar, tanggapan permintaan")
    code, data = call(seller, "POST", "/api/listings", {
        "title": f"Barang sosial {suffix}", "price": 90000, "category": "hobi",
        "city": "Bandung", "description": "uji sosial", "photos": [photo_url]})
    social_lid = data["id"]
    code, data = call(client()[0], "POST", "/api/likes", {"target_type": "listing", "target_id": social_lid})
    check("tamu tidak bisa menyukai", code == 401, str(data))
    code, data = call(buyer, "POST", "/api/likes", {"target_type": "listing", "target_id": social_lid})
    check("menyukai barang", code == 200 and data["liked"] and data["likes"] == 1, str(data))
    code, data = call(buyer, "POST", "/api/likes", {"target_type": "listing", "target_id": social_lid})
    check("suka bisa dibatalkan", code == 200 and not data["liked"] and data["likes"] == 0, str(data))
    code, data = call(buyer, "POST", "/api/likes", {"target_type": "listing", "target_id": "tidakada"})
    check("suka ke postingan tak ada ditolak", code == 404, str(data))

    code, data = call(buyer, "POST", "/api/comments", {"target_type": "listing", "target_id": social_lid, "body": ""})
    check("komentar kosong ditolak", code == 400, str(data))
    code, data = call(buyer, "POST", "/api/comments",
                      {"target_type": "listing", "target_id": social_lid, "body": "Bisa kirim ke luar kota?"})
    check("kirim komentar", code == 201, str(data))
    code, data = call(client()[0], "GET", f"/api/comments?target_type=listing&target_id={social_lid}")
    check("komentar terbaca publik", code == 200 and data["total"] == 1 and
          data["items"][0]["body"].startswith("Bisa kirim"), str(data["total"]))
    code, data = call(seller, "GET", "/api/notifications")
    check("pemilik dapat notifikasi komentar", any(n["kind"] == "comment" for n in data["items"]),
          str([n["kind"] for n in data["items"]][:5]))

    code, data = call(buyer, "POST", "/api/wanted", {
        "title": f"Butuh lampu meja {suffix}", "category": "rumah", "city": "Bandung",
        "price_min": 50000, "price_max": 150000})
    wanted_id = data["id"]
    code, data = call(buyer, "POST", f"/api/wanted/{wanted_id}/reply", {"body": "saya sendiri"})
    check("tidak bisa menanggapi permintaan sendiri", code == 400, str(data))
    code, data = call(seller, "POST", f"/api/wanted/{wanted_id}/reply",
                      {"body": "saya punya", "listing_id": social_lid})
    check("penjual menanggapi permintaan", code == 201, str(data))
    code, data = call(client()[0], "GET", f"/api/wanted/{wanted_id}/replies")
    check("tanggapan terbaca", code == 200 and data["total"] == 1 and
          data["items"][0]["listing_id"] == social_lid, str(data)[:120])
    code, data = call(buyer, "GET", "/api/notifications")
    check("peminta dapat notifikasi tanggapan", any(n["kind"] == "wanted_reply" for n in data["items"]),
          str([n["kind"] for n in data["items"]][:5]))
    outsider = signup("luar." + uuid.uuid4().hex[:6], f"luar.{uuid.uuid4().hex[:6]}@example.com")[0]
    code, data = call(outsider, "POST", f"/api/wanted/{wanted_id}/reply",
                      {"body": "pakai barang orang", "listing_id": social_lid})
    check("tidak bisa melampirkan barang orang lain", code == 403, str(data))

    print("kedaluwarsa dan perpanjangan")
    code, data = call(seller, "GET", f"/api/listings/{lid}")
    check("barang punya tanggal kedaluwarsa", code == 200 and data.get("expires_at"), str(data.get("expires_at")))
    first = data.get("expires_at")
    code, data = call(seller, "POST", f"/api/listings/{lid}/renew", {})
    check("perpanjang barang", code == 200 and data["expires_at"] >= first, str(data))
    code, data = call(buyer, "POST", f"/api/listings/{lid}/renew", {})
    check("bukan pemilik tidak bisa memperpanjang", code == 403, str(data))
    if DB_PATH and os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE listings SET expires_at='2000-01-01T00:00:00+00:00' WHERE id=?", (lid,))
        conn.commit()
        conn.close()
        code, data = call(client()[0], "GET", "/api/listings?q=" + urllib.parse.quote("Kamera uji cari " + suffix))
        check("barang kedaluwarsa hilang dari daftar",
              code == 200 and lid not in [i["id"] for i in data["items"]], str(data["total"]))
        code, data = call(seller, "POST", f"/api/listings/{lid}/renew", {})
        check("perpanjang menghidupkan lagi", code == 200, str(data))
    else:
        print("  lewati uji kedaluwarsa: BUKATOKO_DB tidak diset")

    print("permintaan barang")
    code, data = call(seller, "POST", "/api/wanted", {
        "title": f"Butuh tripod {suffix}", "category": "elektronik", "city": "Bandung",
        "price_min": 100000, "price_max": 400000})
    wid = data.get("id", "")
    check("tulis permintaan", code == 201 and wid, str(data))
    code, data = call(client()[0], "GET", "/api/wanted?q=tripod")
    check("permintaan tampil publik", code == 200 and any(w["id"] == wid for w in data["items"]), str(data["total"]))
    code, data = call(buyer, "POST", f"/api/wanted/{wid}/close", {})
    check("bukan penulis tidak bisa menutup", code == 403, str(data))
    code, data = call(seller, "POST", f"/api/wanted/{wid}/close", {})
    check("penulis menutup permintaan", code == 200 and data["status"] == "closed", str(data))
    code, data = call(client()[0], "GET", "/api/wanted")
    check("permintaan tertutup hilang dari papan", all(w["id"] != wid for w in data["items"]), str(data["total"]))
    code, data = call(seller, "GET", "/api/wanted?mine=1")
    check("pemilik masih melihat miliknya", any(w["id"] == wid for w in data["items"]), str(data["total"]))

    print("transaksi dan serah terima")
    code, data = call(buyer, "POST", "/api/offers", {"listing_id": lid, "amount": 700000})
    check("ajukan tawaran", code == 201, str(data))
    offer_id = data.get("id", "")
    code, data = call(seller, "POST", f"/api/offers/{offer_id}/accept", {})
    check("terima tawaran", code == 200, str(data))
    code, data = call(buyer, "GET", "/api/deals")
    check("pembeli melihat transaksi", code == 200 and any(d["offer_id"] == offer_id for d in data["items"]), str(data["total"]))
    code, data = call(seller, "GET", "/api/deals")
    check("penjual melihat transaksi", code == 200 and data["total"] >= 1, str(data["total"]))
    code, data = call(buyer, "POST", f"/api/offers/{offer_id}/handover", {})
    check("tandai serah terima", code == 200 and data.get("handover_at"), str(data))
    code, data = call(buyer, "GET", "/api/deals")
    deal = [d for d in data["items"] if d["offer_id"] == offer_id][0]
    check("serah terima tercatat", bool(deal["handover_at"]), str(deal))
    third = signup("lain." + uuid.uuid4().hex[:6], f"lain.{uuid.uuid4().hex[:6]}@example.com")[0]
    code, data = call(third, "POST", f"/api/offers/{offer_id}/handover", {})
    check("orang lain tidak bisa menandai serah terima", code == 403, str(data))

    print("balasan ulasan")
    code, data = call(buyer, "POST", f"/api/listings/{lid}/reviews", {"stars": 5, "body": "Mantap."})
    check("pembeli menulis ulasan", code == 201, str(data))
    code, data = call(seller, "GET", f"/api/users/jual.{suffix}")
    review_id = data["reviews"][0]["id"]
    code, data = call(buyer, "POST", f"/api/reviews/{review_id}/reply", {"body": "Bukan urusanku."})
    check("bukan subjek tidak bisa membalas", code == 403, str(data))
    code, data = call(seller, "POST", f"/api/reviews/{review_id}/reply", {"body": "Terima kasih."})
    check("subjek membalas ulasan", code == 200, str(data))
    code, data = call(seller, "POST", f"/api/reviews/{review_id}/reply", {"body": "Sekali lagi."})
    check("balasan kedua ditolak", code == 409, str(data))
    code, data = call(seller, "GET", f"/api/users/jual.{suffix}")
    check("balasan tersimpan", data["reviews"][0].get("reply") == "Terima kasih.", str(data["reviews"][0])[:100])

    print("moderasi")
    code, data = call(buyer, "GET", "/api/reports")
    check("pengguna biasa tidak bisa lihat laporan", code == 403, str(data))
    code, data = call(buyer, "POST", "/api/reports", {"listing_id": lid, "reason": "Barang palsu", "detail": "uji"})
    check("lapor barang", code == 201, str(data))
    mod, code, data = signup("mod." + suffix, f"mod.{suffix}@example.com")
    conn = None
    if DB_PATH and os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE users SET role='moderator' WHERE name=?", ("mod." + suffix,))
        conn.commit()
    code, data = call(mod, "GET", "/api/reports")
    check("moderator melihat laporan", code == 200 and data["total"] >= 1, str(data)[:120])
    report = [r for r in data["items"] if r["listing_id"] == lid][0]
    code, data = call(mod, "POST", f"/api/reports/{report['id']}/resolve", {"action": "remove_listing"})
    check("moderator menurunkan barang", code == 200 and data["action"] == "remove_listing", str(data))
    code, data = call(client()[0], "GET", f"/api/listings/{lid}")
    check("barang turun tidak terbaca publik", code == 404, str(code))
    code, data = call(seller, "GET", f"/api/listings/{lid}")
    check("pemilik masih bisa melihat barang turun", code == 200 and data["status"] == "removed", str(data.get("status")))
    code, data = call(mod, "POST", f"/api/reports/{report['id']}/resolve", {"action": "dismiss"})
    check("laporan tidak bisa ditindak dua kali", code == 409, str(data))

    print("pembekuan akun")
    code, data = call(buyer, "POST", "/api/reports",
                      {"listing_id": "l1002", "reason": "Penipuan", "detail": "uji blokir akun"})
    check("laporan kedua", code == 201, str(data))
    code, data = call(mod, "GET", "/api/reports")
    rep2 = [r for r in data["items"] if r["listing_id"] == "l1002" and r["reporter"] == "beli." + suffix]
    if rep2:
        code, data = call(mod, "POST", f"/api/reports/{rep2[0]['id']}/resolve", {"action": "suspend_user"})
        check("moderator membekukan akun penjual", code == 200, str(data))
        code, data = call(client()[0], "POST", "/api/login", {"email": "dimas@example.com", "password": "demo1234"})
        check("akun beku tidak bisa masuk", code == 403, str(data))
        code, data = call(client()[0], "GET", "/api/listings?limit=100&status=all")
        check("barang akun beku hilang dari publik",
              all(i["owner"]["name"] != "dimas.wibowo" for i in data["items"]), str(data["total"]))
    else:
        print("  lewati uji pembekuan: laporan tidak ditemukan")

    print(f"\n{ok} ok, {fail} gagal")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
