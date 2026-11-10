# JualinAja 2.0

Pasar barang bekas antar warga: orang bisa menjual barang miliknya, dan bisa menulis barang yang sedang dicari beserta rentang harga. Sekarang ada server, basis data, akun, tawaran, percakapan, ulasan, laporan, dan blokir.

Referensi desain: [riset reverse-engineering Carousell Indonesia](../REA/carousell-indonesia/README.md). Yang dipakai pelajaran strukturnya, bukan identitas visualnya. Arah desain sendiri ada di `DESIGN.md`; komponen katalog React/Tailwind dan cara membangunnya ada di [frontend](../frontend/README.md). Hasil penggabungan backend dan UI dijelaskan di [catatan integrasi](../docs/INTEGRATION-2026-11-08.md).

## Menjalankan

```bash
cd app
python3 server.py 8123            # http://127.0.0.1:8123/index.html
```

Backend Python tidak membutuhkan dependensi pihak ketiga. Aset frontend hasil build disertakan di repo; perubahan React/Tailwind perlu `npm run build` dari root repo. Server menyajikan file statis, API JSON, dan satu endpoint unggah foto. Basis data SQLite dibuat otomatis di `bukatoko.db` dan diisi data contoh pada jalan pertama dalam mode lokal. Untuk penyimpanan di disk cloud dan HTTPS, ikuti [panduan deployment OCI](../docs/CLOUD-DEPLOYMENT.md).

Sebagai service yang tetap hidup:

```bash
systemctl --user enable --now bukatoko.service   # unit di ~/.config/systemd/user/bukatoko.service
tail -f server.log
```

Akses dari perangkat lain:

```bash
instabox-port publish 8123 --name bukatoko       # URL https://<sub>.instabox.tech
instabox-port list / instabox-port unpublish 8123
```

Untuk backend Instabox yang sudah berjalan, ikuti [kontrak koneksi yang sudah ada](../docs/BACKEND-CONNECTION.md). Panduan feature branch memakai frontend/API same-origin dan token CSRF. Jangan mengganti backend yang aktif dengan server di main hanya untuk menyambungkan UI; keduanya belum dipastikan versi yang sama.

## Akun contoh

Data awal berisi 10 penjual dengan kata sandi yang sama: `demo1234`, plus satu akun moderator:

```
rangga.putra@example.com      dimas.wibowo@example.com
sri.wahyuni@example.com       adit.nugroho@example.com
fajar.ramadhan@example.com    laras.ayu@example.com
agus.pramana@example.com      bayu.setiawan@example.com
hendra.gunawan@example.com    intan.permata@example.com
moderator@example.com         (peran moderator, panel di moderasi.html)
```

Bisa juga masuk dengan nama pengguna, misal `rangga.putra`. Akun baru dibuat lewat dialog Masuk, tautan "Belum punya akun? Daftar".

## Fitur

Akun dan sesi
- Daftar dan masuk dengan email + kata sandi. Kata sandi disimpan sebagai PBKDF2-HMAC-SHA256 (200.000 putaran, salt acak).
- Sesi berupa token acak di cookie HttpOnly + SameSite=Lax, berlaku 30 hari, dicabut saat keluar.
- Verifikasi email: akun baru dapat kode verifikasi. Pada mode lokal demo, kode ditampilkan di layar dan ditulis ke log server. Set `BUKATOKO_DEMO_MAIL=0` untuk menonaktifkan kode demo. Mode cloud menggunakan SMTP jika dikonfigurasi.
- Lupa kata sandi: minta kode 6 angka (berlaku 30 menit), lalu ganti sandi. Meminta reset untuk email yang tidak terdaftar dijawab sama, supaya tidak jadi alat menebak akun.
- Akun bisa dibekukan moderator: login ditolak, semua sesi dihapus, barang aktifnya diturunkan.

Keamanan permintaan
- Semua aksi tulis memakai token ganda: cookie `bk_csrf` harus sama dengan header `X-CSRF-Token` yang dikirim klien.
- Batas laju per IP dan per akun: login (20 per 10 menit per IP, 8 per email), daftar (10/jam), reset (6/jam per IP), tawaran (30/jam), pesan (60/jam), laporan (10/hari), unggah foto (80/jam).
- Unggahan foto: maksimal 6 MB per berkas, minimal 200 px sisi terpendek, EXIF dan teks tersembunyi dibuang server sebelum disimpan.

Barang
- Pasang barang: unggah sampai 10 foto (diperkecil ke 1600 px di peramban), kategori, kondisi, harga, lokasi, deskripsi.
- Barang berlaku 30 hari. Setelah kedaluwarsa hilang dari pencarian, dan pemilik bisa memperpanjang 30 hari dari halaman barang.
- Tandai terjual, hapus barang (foto ikut dihapus dari disk), sunting semua isian termasuk daftar foto.
- Semua daftar bisa disaring: kata kunci, kategori, lokasi, kondisi, rentang harga, status (aktif/terjual/semua), urutan, dan paginasi "Muat lagi".
- Halaman `/p/<id>` menyajikan detail dengan tag Open Graph (judul, harga, deskripsi, foto) supaya preview WhatsApp benar.

Tawaran dan transaksi
- Pembeli mengajukan harga; tidak boleh menawar barang sendiri, tidak boleh di atas harga pasang, tidak boleh dua tawaran terbuka untuk barang yang sama.
- Penjual menerima atau menolak. Menerima otomatis menandai barang terjual dan menolak tawaran lain yang masih terbuka.
- Tawaran yang diterima menjadi transaksi: kedua pihak melihat lawan transaksi, nominal, dan bisa menandai serah terima.
- Pembeli bisa menarik tawaran. Semua status: proposed, accepted, declined, withdrawn.

Percakapan
- Setiap barang punya komentar publik (tanya jawab terlihat semua orang) dan suka. Suka bisa dibatalkan, satu suka per akun per postingan.
- Permintaan di papan "Lagi Dicari" bisa ditanggapi penjual: pilih salah satu barangnya atau tulis pesan, lalu peminta dapat notifikasi. Tanggapan tampil di bawah permintaan dan bisa dibuka publik.
- Thread per barang antara pembeli dan penjual. Penjual melihat semua thread di tab Pesan, pembeli punya satu thread per barang.
- Pesan belum dibaca dihitung di badge header dan di tab Pesan.

Ulasan
- Hanya pihak dengan tawaran yang diterima, satu ulasan per orang per barang, bintang 1-5.
- Yang diulas bisa membalas sekali. Rating penjual dihitung dari ulasan yang benar-benar ada; tanpa ulasan, tampil "Belum ada ulasan".

Pencarian
- Pencarian kata kunci, filter kategori, lokasi, kondisi, harga, status, "hanya yang berfoto", saran judul saat mengetik, dan pencocokan kata saat ejaan salah ketik.

Moderasi
- Laporan masuk antrean di `moderasi.html` (akun peran moderator). Tindakan: abaikan, turunkan barang, atau bekukan penjual.
- Barang yang diturunkan hilang dari publik tetapi masih terlihat pemiliknya, dan tidak bisa diperpanjang.

Notifikasi
- Satu kotak masuk kejadian: tawaran masuk, tawaran diterima atau ditolak, pesan baru, ulasan baru, barang yang kamu simpan turun harga atau terjual, dan barang baru yang cocok dengan permintaanmu.
- Badge di header menuju tab Notifikasi; bisa ditandai terbaca satu per satu atau sekaligus. Membuka daftar pesan atau tawaran ikut menandai kejadian terkait.

Sunting dan statistik
- Pemilik bisa menyunting judul, harga, kategori, kondisi, lokasi, deskripsi, dan daftar foto tanpa membuat barang baru.
- Menurunkan harga mengirim notifikasi ke semua penyimpan.
- Hitungan dilihat bertambah dari pengunjung lain, bukan dari pemilik, dan tampil di halaman barang.
- Riwayat "Terakhir kamu lihat" di beranda disimpan di peramban, bukan di server.
- Profil penjual menampilkan jumlah barang terjual dan aktif, sebaran bintang, serta urutan ulasan (terbaru, tertinggi, terendah).

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
| POST | `/api/signup`, `/api/login`, `/api/logout` | sesi cookie + token CSRF |
| POST | `/api/verify`, `/api/verify/resend` | verifikasi email |
| POST | `/api/reset/request`, `/api/reset/confirm` | lupa kata sandi |
| GET | `/api/listings` | filter `q, kat, city, min, max, sort, status, owner, ids, limit, offset` |
| POST | `/api/listings` | buat barang (butuh login) |
| PATCH | `/api/listings/<id>` | sunting barang milik sendiri (harga turun memberi tahu penyimpan) |
| GET | `/api/listings/<id>` | detail + tawaran (untuk pemilik) + kelayakan ulasan |
| POST | `/api/listings/<id>/sold` | tandai terjual (pemilik) |
| POST | `/api/listings/<id>/renew` | perpanjang 30 hari (pemilik) |
| POST | `/api/wanted/<id>/close` | tandai permintaan selesai (penulis) |
| POST | `/api/offers/<id>/handover` | tandai serah terima selesai (dua pihak) |
| GET | `/api/deals` | transaksi yang melibatkan pengguna |
| POST | `/api/reviews/<id>/reply` | balas ulasan sekali (yang diulas) |
| GET | `/api/suggest?q=` | saran judul untuk pencarian |
| POST | `/api/likes` | suka atau batalkan suka (`target_type`: listing/wanted) |
| GET/POST | `/api/comments` | komentar publik per postingan |
| POST | `/api/wanted/<id>/reply` | tanggapi permintaan, boleh lampirkan barang sendiri |
| GET | `/api/wanted/<id>/replies` | daftar tanggapan sebuah permintaan |
| GET | `/api/reports` | antrean laporan (moderator) |
| POST | `/api/reports/<id>/resolve` | abaikan, turunkan barang, atau bekukan akun (moderator) |
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
| GET | `/api/notifications` | daftar kejadian + hitungan belum dibaca |
| POST | `/api/notifications/read` | tandai semua atau sebagian (`ids`) sudah dibaca |
| POST | `/api/upload` | unggah foto (multipart, butuh login, 80 unggahan/jam per IP) |
| GET | `/p/<id>` | halaman detail dengan tag Open Graph |

Batas unggah: JPG/PNG/WebP/GIF, maksimal 6 MB per foto, 10 foto per permintaan, 25 MB per permintaan. Foto disimpan dengan nama acak di `uploads/`; berkas yatim dibersihkan saat server mulai.

## Keamanan yang sudah ada

- Semua aksi tulis memeriksa sesi dan kepemilikan di server, bukan di peramban.
- Aksi tulis menolak permintaan tanpa token CSRF yang cocok.
- Batas laju login, daftar, reset, tawaran, pesan, laporan, dan unggah.
- Kode reset dan verifikasi berupa nilai acak sekali pakai, kedaluwarsa setelah 30 menit untuk reset, dan dibandingkan dengan perbandingan waktu tetap.
- Endpoint unggah menolak tamu, membatasi laju per IP, memvalidasi tipe dan ukuran, menolak gambar di bawah 200 px, dan membuang EXIF sebelum menyimpan.
- Nama berkas unggahan selalu dibuat server (regex nama aman saat menyajikan), jadi path traversal tidak bisa dipakai.
- Kode server (`*.py`), basis data (`*.db`), log, dan folder `backups/` tidak disajikan ke publik.
- `.js`, `.css`, `.html` dikirim dengan `Cache-Control: no-cache` supaya demo tidak menyajikan versi basi.

Catatan jujur: ini demo. Belum ada SMTP sungguhan (kode reset dan verifikasi tampil di layar karena itu), belum ada moderasi otomatis, belum ada pembayaran, dan belum ada uji beban. Data contoh dipakai apa adanya.

## Uji

```bash
python3 tests/api_smoke.py                     # 50 pemeriksaan alur utama
python3 tests/api_features.py                  # 70 pemeriksaan keamanan + fitur + siklus hidup
python3 tests/ui_smoke.py                      # 40 pemeriksaan struktur halaman
python3 tools/backup.py --keep 7               # cadangan SQLite dengan API backup
```

Untuk basis data bersih:

```bash
BUKATOKO_DB=/tmp/bk.db python3 server.py 8124 &
BUKATOKO_DB=/tmp/bk.db python3 tests/api_features.py http://127.0.0.1:8124
```

Uji fitur menutup: token CSRF, verifikasi email, reset kata sandi, batas laju login, unggah (kecil ditolak, EXIF dibuang), filter foto, saran kata kunci, pencarian salah ketik, kedaluwarsa dan perpanjangan, tutup permintaan, transaksi dan serah terima, balasan ulasan, moderasi (turunkan barang, bekukan akun), dan otorisasi tiap aksi.

## Struktur

```
bukatoko-site/
  server.py          HTTP + API + SQLite + unggah foto
  bukatoko.db        dibuat otomatis (jangan di-commit)
  uploads/           foto hasil unggahan
  backups/           hasil tools/backup.py
  index.html         beranda
  jelajah.html       hasil + filter + paginasi + saran kata kunci
  listing.html       detail barang (juga disajikan di /p/<id>)
  jual.html          pasang barang
  cari.html          papan permintaan
  akun.html          delapan tab akun (termasuk Transaksi dan Notifikasi)
  profil.html        profil penjual + ulasan + balasan
  moderasi.html      antrean laporan untuk peran moderator
  404.html           halaman alamat tidak ditemukan
  assets/styles.css  token terang/gelap, komponen
  assets/app.js      seluruh logika antarmuka
  tests/             api_smoke.py, api_features.py, ui_smoke.py
  tools/backup.py    cadangan SQLite
  DESIGN.md          arah desain, palet, dial, larangan
```
