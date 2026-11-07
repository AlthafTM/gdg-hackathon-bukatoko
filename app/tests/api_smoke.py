#!/usr/bin/env python3
"""Uji asap API Bukatoko. Jalankan: python3 tests/api_smoke.py [base_url]"""

import http.cookiejar
import json
import mimetypes
import sys
import urllib.error
import urllib.request
import uuid

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
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


def opener():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)), jar


def call(op, method, path, payload=None, raw=None, headers=None):
    url = BASE + path
    data = None
    hdrs = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode()
        hdrs["Content-Type"] = "application/json"
    if raw is not None:
        data = raw
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with op.open(req) as res:
            body = res.read()
            ctype = res.headers.get("Content-Type", "")
            return res.status, (json.loads(body) if "json" in ctype else body)
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            return exc.code, json.loads(body)
        except json.JSONDecodeError:
            return exc.code, body


def multipart(field_name, filename, content, ctype):
    boundary = uuid.uuid4().hex
    head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field_name}\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {ctype}\r\n\r\n").encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    return head + content + tail, f"multipart/form-data; boundary={boundary}"


def main():
    seller, _ = opener()
    buyer, _ = opener()
    anon, _ = opener()

    print("akun")
    code, data = call(anon, "GET", "/api/me")
    check("tamu /api/me tanpa user", code == 200 and data.get("user") is None, str(data))

    code, data = call(anon, "GET", "/api/listings?kondisi=mulus")
    check("filter kondisi diteruskan ke backend", code == 200 and data["total"] > 0 and
          all("mulus" in item["condition"].lower() for item in data["items"]), str(data))

    code, data = call(seller, "POST", "/api/login", {"email": "rangga.putra", "password": "demo1234"})
    check("login penjual seed", code == 200 and data["user"]["name"] == "rangga.putra", str(data))

    suffix = uuid.uuid4().hex[:6]
    code, data = call(buyer, "POST", "/api/signup",
                      {"name": f"pembeli.{suffix}", "email": f"beli.{suffix}@example.com", "password": "rahasia123"})
    check("daftar pembeli baru", code == 200 and data["user"]["name"].startswith("pembeli."), str(data))

    code, data = call(buyer, "POST", "/api/signup",
                      {"name": f"pembeli.{suffix}", "email": f"lain.{suffix}@example.com", "password": "rahasia123"})
    check("daftar nama kembar ditolak", code == 409, str(data))

    code, data = call(anon, "POST", "/api/login", {"email": f"beli.{suffix}@example.com", "password": "salah"})
    check("kata sandi salah ditolak", code == 401, str(data))

    print("unggah + pasang barang")
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753"
        "de0000000c4944415408d763f8cfc0000003010100" "18dd8db10000000049454e44ae426082")
    code, data = call(anon, "POST", "/api/upload", raw=multipart("photo", "x.png", png, "image/png")[0],
                      headers={"Content-Type": multipart("photo", "x.png", png, "image/png")[1]})
    check("unggah tanpa login ditolak", code == 401, str(data))

    body, ctype = multipart("photo", "x.png", png, "image/png")
    code, data = call(buyer, "POST", "/api/upload", raw=body, headers={"Content-Type": ctype})
    check("unggah dengan login", code == 200 and data["files"][0]["url"].startswith("/uploads/"), str(data))
    photo = data["files"][0]["url"] if code == 200 else ""

    code, data = call(buyer, "POST", "/api/listings", {
        "title": "Kotak penyimpanan plastik besar", "price": 65000, "category": "rumah",
        "condition": "Bekas, mulus", "city": "Bandung", "description": "Tutup masih rapat.",
        "photos": [photo]})
    check("pasang barang", code == 201 and data["photo_urls"] == [photo], str(data)[:200])
    new_id = data.get("id", "")

    code, data = call(anon, "GET", f"/api/listings/{new_id}")
    check("barang baru terbaca publik", code == 200 and data["owner"]["name"].startswith("pembeli."), str(data)[:120])

    print("tawaran")
    code, data = call(buyer, "POST", "/api/offers", {"listing_id": "l1001", "amount": 5200000, "message": "Bisa 5,2?"})
    check("ajukan tawaran", code == 201 and data["status"] == "proposed", str(data))
    offer_id = data.get("id", "")

    code, data = call(buyer, "POST", "/api/offers", {"listing_id": "l1001", "amount": 5000000})
    check("tawaran ganda ditolak", code == 409, str(data))

    code, data = call(seller, "POST", "/api/offers", {"listing_id": "l1001", "amount": 1000000})
    check("menawar barang sendiri ditolak", code == 400, str(data))

    code, data = call(buyer, "POST", f"/api/offers/{offer_id}/accept")
    check("pembeli tidak bisa menerima", code == 403, str(data))

    code, data = call(seller, "GET", "/api/offers")
    check("penjual melihat tawaran masuk", code == 200 and len(data["incoming"]) >= 1, str(data)[:120])

    code, data = call(seller, "POST", f"/api/offers/{offer_id}/accept")
    check("penjual menerima tawaran", code == 200 and data["status"] == "accepted", str(data))

    code, data = call(anon, "GET", "/api/listings/l1001")
    check("barang jadi terjual", code == 200 and data["status"] == "sold", str(data)[:120])

    code, data = call(anon, "POST", "/api/offers", {"listing_id": "l1001", "amount": 1000})
    check("tawar barang terjual ditolak", code == 401 or code == 409, str(data))

    print("pesan")
    code, data = call(buyer, "POST", "/api/messages", {"listing_id": "l1001", "body": "Sudah deal, kapan bisa COD?"})
    check("kirim pesan", code == 201, str(data))

    code, data = call(seller, "GET", "/api/inbox")
    check("penjual punya thread", code == 200 and len(data["threads"]) >= 1 and data["threads"][0]["unread"] >= 1, str(data)[:160])

    code, data = call(seller, "GET", "/api/messages?listing=l1001")
    check("penjual baca thread", code == 200 and any("COD" in m["body"] for m in data["messages"]), str(data)[:160])

    code, data = call(seller, "POST", "/api/messages",
                      {"listing_id": "l1001", "body": "Besok sore di Dago ya.", "with": data["other"]["id"]})
    check("penjual balas", code == 201, str(data))

    code, data = call(seller, "GET", "/api/inbox")
    check("unread kembali nol setelah dibaca", code == 200 and data["unread"] == 0, str(data)[:120])

    print("ulasan")
    code, data = call(buyer, "POST", "/api/listings/l1001/reviews", {"stars": 5, "body": "Ramah, barang sesuai."})
    check("pembeli mengulas setelah deal", code == 201 and data["rating"]["count"] >= 1, str(data))

    code, data = call(buyer, "POST", "/api/listings/l1001/reviews", {"stars": 4, "body": "lagi"})
    check("ulasan ganda ditolak", code == 403, str(data))

    code, data = call(seller, "POST", "/api/listings/l1001/reviews", {"stars": 5, "body": "Pembeli serius."})
    check("penjual mengulas pembeli", code == 201, str(data))

    code, data = call(anon, "GET", "/api/users/rangga.putra")
    check("profil publik + rating", code == 200 and data["rating"]["count"] >= 1, str(data)[:120])

    print("simpan, cari tersimpan, lapor, blokir")
    code, data = call(buyer, "POST", f"/api/saved/{new_id}")
    check("simpan barang", code == 200 and data["saved"], str(data))
    code, data = call(buyer, "GET", "/api/saved")
    check("daftar simpanan", code == 200 and any(i["id"] == new_id for i in data["items"]), str(data)[:120])
    code, data = call(buyer, "DELETE", f"/api/saved/{new_id}")
    check("hapus simpanan", code == 200 and not data["saved"], str(data))

    code, data = call(buyer, "POST", "/api/searches", {"params": {"kat": "rumah", "max": "500000"}})
    check("simpan pencarian", code == 201, str(data))
    code, data = call(buyer, "GET", "/api/searches")
    check("daftar pencarian + hitungan baru", code == 200 and len(data["items"]) >= 1, str(data)[:160])

    code, data = call(buyer, "POST", "/api/reports", {"listing_id": "l1002", "reason": "Barang palsu", "detail": "uji"})
    check("lapor barang", code == 201, str(data))
    code, data = call(buyer, "POST", "/api/reports", {"listing_id": "l1002", "reason": "lagi"})
    check("lapor ganda ditolak", code == 409, str(data))

    code, data = call(buyer, "POST", "/api/blocks", {"user_id": 2})
    check("blokir pengguna", code == 200 and data["blocked"], str(data))
    code, data = call(buyer, "GET", "/api/listings?limit=100")
    check("barang terblokir hilang dari daftar",
          code == 200 and all(i["owner"]["id"] != 2 for i in data["items"]), str(data["total"]))

    print("otorisasi tulis")
    code, data = call(buyer, "POST", "/api/listings/l1001/sold")
    check("bukan pemilik tidak bisa menandai terjual", code == 403, str(data))
    code, data = call(buyer, "DELETE", "/api/listings/l1001")
    check("bukan pemilik tidak bisa menghapus", code == 403, str(data))

    print("halaman OG")
    code, body = call(anon, "GET", "/p/l1001")
    text = body.decode() if isinstance(body, bytes) else str(body)
    check("halaman /p/<id> punya og:title", code == 200 and 'property="og:title"' in text, str(code))
    check("judul merek tetap terpisah dari metadata barang", '<title>BukaToko - Jual apapun disini.</title>' in text and
          'Kamera mirrorless Fujifilm X-T20' in text, str(code))

    print(f"\n{ok} ok, {fail} gagal")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
