# Pemeriksaan font, pencarian dan bahasa

Tanggal: 7 November 2026. Pengguna mengizinkan commit/publikasi setelah penambahan judul merek dan favicon. Batas verifikasi visual di bawah tetap berlaku.

## Keputusan dan perubahan

- Font aktif Nunito dengan ujung membulat, disimpan lokal beserta SIL OFL 1.1. Nunito Sans ditolak pengguna dan tidak dibundel. Judul halaman memakai bobot 750, judul kartu 700.
- Judul browser dan heading beranda memakai `JualinAja - Jual apapun disini.`. Favicon memakai logo keranjang, dengan warna untuk kedua tema dan cache versioning. Judul browser dipisahkan dari metadata Open Graph barang agar preview tautan backend tetap berfungsi.
- Kontrol satu baris/tombol membulat penuh; kartu dan panel memakai radius 16px, dialog 20px, elemen kecil 12px. Textarea tetap radius panel agar bidang multiline terbaca. Glow ungu ringan hanya saat hover, sebagai umpan balik fokus perhatian, sesuai permintaan pengguna.
- Ikon satu sistem SVG outline 1.6px dengan cap/join membulat. Simbol kategori dan navigasi memakai ukuran konsisten.
- Pencarian utama berada di atas konten desktop. Padding kiri ikon hanya berlaku di input yang benar-benar memiliki ikon; placeholder sidebar kembali memakai padding normal. Toolbar simpan pencarian dan filter aktif dipindah di atas kedua kolom katalog sehingga tidak mendorong kartu pertama ke bawah relatif terhadap panel filter.
- Penanda wajib `*` dijelaskan di bawah formulir. Field tetap memiliki `required` dan `aria-required`; mengganti bahasa hanya mengganti label, bukan nilai option atau kontrak backend.
- Gambar bawaan memang placeholder SVG buatan aplikasi. Sekarang ilustrasinya mengikuti konteks judul, misalnya kamera, ponsel, sepatu, buku, kulkas, gitar, sepeda, meja, monitor, pakaian dan konsol. Semua tetap dilabeli ilustrasi contoh. Foto unggahan nyata tidak diganti.
- `locale.js` mengisi terjemahan UI Indonesia/Inggris, termasuk teks statis tujuh halaman, placeholder, label aksesibilitas, dialog, pesan/status dinamis dan galat backend. Konten pengguna diberi batas agar tidak diterjemahkan. Observer menangani konten asinkron tanpa reload akun atau menghapus nilai formulir. Elemen teks boleh membungkus dan tetap memakai token spacing yang sama di kedua bahasa.

## Bukti dan batas pengujian

| Pemeriksaan | Hasil |
|---|---|
| API | PASS: 39 smoke checks pada salinan aplikasi dan database sementara; termasuk akun, jual, unggah, filter, tawaran, pesan, ulasan dan otorisasi |
| Pages, UI dan locale | PASS: 12 test case Node pada hasil ekspor sementara |
| Cakupan bahasa statis | PASS: teks dan label/placeholder statis semua tujuh halaman memiliki terjemahan Inggris; nama kota, merek dan simbol dikecualikan |
| Galat backend | PASS: seluruh galat string konstan server memiliki terjemahan Inggris; pola dinamis juga diuji pada hitungan, waktu, status dan galat autentikasi |
| Pergantian bahasa | PASS pada fixture DOM: Indonesia ke Inggris dan kembali, teks asinkron baru, judul konten pengguna terlindungi, nilai input serta option backend tidak berubah |
| Gambar | PASS: ilustrasi kamera, ponsel dan buku berbeda sesuai konteks; foto asli tetap dipakai; placeholder dan status terjual tetap dikenali |
| HTTP | PASS: tujuh halaman serta locale.js dan font Nunito memberikan HTTP 200 dari server Python |
| Struktur | PASS: markup tujuh halaman seimbang, ID unik dan tautan aset relatif valid; sintaks JavaScript dan Git whitespace diperiksa |
| Visual, layout dan interaksi browser | BELUM TERVERIFIKASI: browser sebelumnya menolak akses origin; tidak mencoba jalur pengganti untuk melewati penolakan |

Tes DOM menggunakan fixture minimal, bukan browser. Karena itu hasilnya tidak membuktikan bahwa seluruh glyph, glow, wrapping kedua bahasa, alignment, dialog, validasi native atau animasi sudah terlihat benar pada semua ukuran layar. Uji visual tersisa: 360/390/768/1024/1440px, terang/gelap, Indonesia/Inggris, form terisi saat ganti bahasa, hasil kosong, hasil berfilter, panel akun dan pesan baru. Gerbang antislop visual/click-through belum dinyatakan PASS penuh.
