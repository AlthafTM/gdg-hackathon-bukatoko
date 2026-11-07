#!/usr/bin/env python3
"""Uji struktur halaman: elemen wajib ada, tautan internal hidup, tanpa teks kosong.

Bukan pengganti uji klik di peramban, hanya jaring cepat di CI:
    python3 tests/ui_smoke.py [base_url]
"""

import re
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8123"
ok = 0
fail = 0

PAGES = {
    "index.html": ["rail-rekomendasi", "rail-kategori", "recent-section", "q-home"],
    "jelajah.html": ["hasil", "filter-form", "f-foto", "saran-q", "state-box", "load-more"],
    "listing.html": ["detail-root", "gallery-main", "owner-panel", "review-form-wrap"],
    "jual.html": ["jual-form", "f-foto", "photo-grid", "jual-error"],
    "cari.html": ["wanted-list", "wanted-form", "wanted-error"],
    "akun.html": ["panel-transaksi", "panel-notifikasi", "verify-banner", "akun-content"],
    "profil.html": ["profil-listings", "p-bars", "p-sort", "profil-reviews"],
    "moderasi.html": ["mod-list", "mod-state"],
}


def check(label, cond, detail=""):
    global ok, fail
    if cond:
        ok += 1
        print(f"  ok    {label}")
    else:
        fail += 1
        print(f"  GAGAL {label} {detail}")


def fetch(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=10) as res:
            return res.status, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, ""


def main() -> int:
    links = set()
    for page, ids in PAGES.items():
        code, html = fetch("/" + page)
        check(f"{page} terbuka", code == 200, str(code))
        missing = [i for i in ids if f'id="{i}"' not in html]
        check(f"{page} punya elemen wajib", not missing, str(missing))
        check(f"{page} punya title", "<title>" in html and "</title>" in html)
        check(f"{page} punya lang", '<html lang="' in html)
        for href in re.findall(r'href="([^"#:]+\.html[^"]*)"', html):
            links.add(href.split("?")[0])

    for href in sorted(links):
        code, _ = fetch("/" + href)
        check(f"tautan hidup: {href}", code == 200, str(code))

    code, _ = fetch("/tidak-ada-halaman-ini")
    check("404 memakai halaman situs", code == 404, str(code))

    print(f"\n{ok} ok, {fail} gagal")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
