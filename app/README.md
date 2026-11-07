# Bukatoko 2.0

Pasar barang bekas antar warga: orang bisa menjual barang miliknya, dan bisa menulis barang yang sedang dicari beserta rentang harga. Sekarang ada server, basis data, akun, tawaran, percakapan, ulasan, laporan, dan blokir.

Referensi desain: [riset reverse-engineering Carousell Indonesia](../REA/carousell-indonesia/README.md). Yang dipakai pelajaran strukturnya, bukan identitas visualnya. Arah desain sendiri ada di `DESIGN.md`.

## Menjalankan

```bash
cd app
python3 server.py 8123            # http://127.0.0.1:8123/index.html
```

Tanpa dependensi pihak ketiga dan tanpa build. Server menyajikan file statis, API JSON, dan satu endpoint unggah foto. Basis data SQLite dibuat otomatis di `bukatoko.db` dan diisi data contoh pada jalan pertama.

Kalau perlu tetap hidup di mesin Linux, jalankan sebagai service pengguna:

```bash
systemctl --user enable --now bukatoko.service   # unit: ~/.config/systemd/user/bukatoko.service
tail -f server.log
```

Untuk mengaksesnya dari perangkat lain, teruskan port 8123 lewat apa pun yang tersedia di mesinmu (reverse proxy, tunnel, atau port publik penyedia VPS). Aplikasi ini sendiri hanya mengikat `127.0.0.1`.

Untuk backend Instabox yang sudah berjalan, ikuti [kontrak koneksi yang sudah ada](../docs/BACKEND-CONNECTION.md). Panduan feature branch memakai frontend/API same-origin dan token CSRF. Jangan mengganti backend yang aktif dengan server di main hanya untuk menyambungkan UI; keduanya belum dipastikan versi yang sama.

## Akun contoh

Data awal berisi 10 penjual dengan kata sandi yang sama: `demo1234`.

```
rangga.putra@example.com      dimas.wibowo@example.com
sri.wahyuni@example.com       adit.nugroho@example.com
fajar.ramadhan@example.com    laras.ayu@example.com
agus.pramana@example.com      bayu.setiawan@example.com
hendra.gunawan@example.com    intan.permata@example.com
```

Bisa juga masuk dengan nama pengguna, misal `rangga.putra`. Akun baru dibuat lewat dialog Masuk, tautan "Belum punya akun? Daftar".

## Fitur

Akun dan sesi
- Daftar dan masuk dengan email + kata sandi. Kata sandi disimpan sebagai PBKDF2-HMAC-SHA256 (200.000 putaran, salt acak).
- Sesi berupa token acak di cookie HttpOnly + SameSite=Lax, berlaku 30 hari, dicabut saat keluar.

Barang
- Pasang barang: unggah sampai 10 foto (diperkecil ke 1600 px di peramban), kategori, kondisi, harga, lokasi, deskripsi.
- Tandai terjual, hapus barang (foto ikut dihapus dari disk).
- Semua daftar bisa disaring: kata kunci, kategori, lokasi, kondisi, rentang harga, status (aktif/terjual/semua), urutan, dan paginasi "Muat lagi".
- Halaman `/p/<id>` menyajikan detail dengan tag Open Graph (judul, harga, deskripsi, foto) supaya preview WhatsApp benar.

Tawaran
- Pembeli mengajukan harga; tidak boleh menawar barang sendiri, tidak boleh di atas harga pasang, tidak boleh dua tawaran terbuka untuk barang yang sama.
- Penjual menerima atau menolak. Menerima otomatis menandai barang terjual dan menolak tawaran lain yang masih terbuka.
- Pembeli bisa menarik tawaran. Semua status: proposed, accepted, declined, withdrawn.

Percakapan
- Thread per barang antara pembeli dan penjual. Penjual melihat semua thread di tab Pesan, pembeli punya satu thread per barang.
- Pesan belum dibaca dihitung di badge header dan di tab Pesan.

Ulasan
- Hanya pihak dengan tawaran yang diterima, satu ulasan per orang per barang, bintang 1-5.
- Rating penjual dihitung dari ulasan yang benar-benar ada; tanpa ulasan, tampil "Belum ada ulasan".

Simpan, cari, lapor, blokir
- Simpan barang (idempoten), daftar di tab Disimpan.
- Pencarian tersimpan (maks 5) dengan hitungan barang baru sejak disimpan.
- Lapor barang dengan alasan dan keterangan, satu laporan per pengguna per barang.
- Blokir penjual: barang mereka hilang dari Jelajah, Beranda, dan pencarian untuk kamu.

Antarmuka
- Tema terang/gelap (mengikuti sistem sampai dipilih manual), bahasa ID/EN untuk navigasi dan tombol utama.
- Skeleton saat memuat, state kosong, state galat dengan tombol coba lagi, toast untuk hasil aksi.
- Lightbox foto, galeri dengan tombol geser + panah kibor, tautan "kembali ke hasil" yang membawa filter terakhir.
- Tabel akun enam tab: Disimpan, Barang saya, Permintaan saya, Tawaran, Pesan, Pencarian.

## API

| Metode | Jalur | Keterangan |
|---|---|---|
| GET | `/api/me` | pengguna aktif + hitungan, atau `{user: null}` |
| POST | `/api/signup`, `/api/login`, `/api/logout` | sesi cookie |
| GET | `/api/listings` | filter `q, kat, city, min, max, sort, status, owner, limit, offset` |
| POST | `/api/listings` | buat barang (butuh login) |
| GET | `/api/listings/<id>` | detail + tawaran (untuk pemilik) + kelayakan ulasan |
| POST | `/api/listings/<id>/sold` | tandai terjual (pemilik) |
| POST | `/api/listings/<id>/reviews` | tulis ulasan (peserta deal) |
| DELETE | `/api/listings/<id>` | hapus barang (pemilik) |
| POST | `/api/offers` | ajukan tawaran |
| GET | `/api/offers` | tawaran masuk dan keluar |
| POST | `/api/offers/<id>/accept`, `/decline` | jawab tawaran |
| GET/POST | `/api/wanted` | papan permintaan |
| DELETE | `/api/wanted/<id>` | hapus permintaan sendiri |
| GET/POST | `/api/messages` | thread per barang (`listing`, `with`) |
| GET | `/api/inbox` | daftar percakapan + jumlah belum dibaca |
| POST | `/api/reports` | lapor barang |
| POST/DELETE | `/api/blocks` `/<user_id>` | blokir dan buka blokir |
| POST/DELETE | `/api/saved/<listing_id>` | simpan dan hapus simpanan |
| GET/POST/DELETE | `/api/searches` `/<id>` | pencarian tersimpan |
| POST | `/api/upload` | unggah foto (multipart, butuh login, 80 unggahan/jam per IP) |
| GET | `/p/<id>` | halaman detail dengan tag Open Graph |

Batas unggah: JPG/PNG/WebP/GIF, maksimal 6 MB per foto, 10 foto per permintaan, 25 MB per permintaan. Foto disimpan dengan nama acak di `uploads/`; berkas yatim dibersihkan saat server mulai.

## Keamanan yang sudah ada

- Semua aksi tulis memeriksa sesi dan kepemilikan di server, bukan di peramban.
- Endpoint unggah menolak tamu, membatasi laju per IP, dan memvalidasi tipe serta ukuran berkas.
- Nama berkas unggahan selalu dibuat server (regex nama aman saat menyajikan), jadi path traversal tidak bisa dipakai.
- Kode server (`*.py`), basis data (`*.db`), dan log tidak disajikan ke publik.
- `.js`, `.css`, `.html` dikirim dengan `Cache-Control: no-cache` supaya demo tidak menyajikan versi basi.

Catatan jujur: ini demo. Belum ada verifikasi email, reset kata sandi, pembatasan laju pada login, moderasi otomatis, atau pembayaran. Data contoh dipakai apa adanya.

## Uji

```bash
python3 tests/api_smoke.py                    # terhadap server yang jalan
BUKATOKO_DB=/tmp/bk.db python3 server.py 8124 & python3 tests/api_smoke.py http://127.0.0.1:8124
```

Uji ini menutup 38 pemeriksaan: akun, unggah, pasang barang, tawaran (termasuk tawaran ganda dan menawar barang sendiri), penerimaan tawaran, percakapan, ulasan, simpan, pencarian, laporan, blokir, otorisasi tulis, dan halaman Open Graph.

## Struktur

```
bukatoko-site/
  server.py          HTTP + API + SQLite + unggah foto
  bukatoko.db        dibuat otomatis (jangan di-commit)
  uploads/           foto hasil unggahan
  index.html         beranda
  jelajah.html       hasil + filter + paginasi
  listing.html       detail barang (juga disajikan di /p/<id>)
  jual.html          pasang barang
  cari.html          papan permintaan
  akun.html          enam tab akun
  profil.html        profil penjual + ulasan
  assets/styles.css  token terang/gelap, komponen
  assets/app.js      seluruh logika antarmuka
  tests/api_smoke.py uji API
  DESIGN.md          arah desain, palet, dial, larangan
```
