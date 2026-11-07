# BukaToko: arah desain

Reading this as: pasar barang milik warga yang profesional, sederhana, dan mudah dipindai. ENERGY 2 / RHYTHM 2 / MOTION 1. Mengikuti brief pengguna 7 November 2026: tiga warna utama, gradien halus, font berkarakter tetapi terbaca, dan logo yang disediakan pengguna.

## Prioritas kegunaan

Harga, kondisi dan lokasi harus terlihat pada kartu barang. Pencarian berada sebelum konten pembuka. Pengguna dapat langsung menjual barang atau membuat permintaan dengan rentang harga. Permintaan terbaru ditampilkan di samping pembuka karena dua sisi pasar ini sama pentingnya.

Referensi struktur: `../REA/carousell-indonesia`. Gunakan pelajaran navigasi dan state marketplace dari riset; alur permintaan adalah konsep Bukatoko sendiri.

## Token dan alasan

| Peran | Terang | Gelap | Alasan |
|---|---|---|---|
| Ungu utama | #6534C8 | #A78BFA | Aksi utama, tautan dan fokus keyboard |
| Lavender pendukung | #E8DEF8 | #403052 | Navigasi aktif dan permukaan pendukung |
| Hijau aksen | #20804C | #86EFAC | Harga, anggaran dan notifikasi |
| Kanvas netral | #F8F7FC | #18151F | Memisahkan konten tanpa menambah warna merek |
| Teks utama | #252039 | #FAF9FF | Kontras dan keterbacaan |
| Teks pendukung | #625D73 | #C2BACE | Kondisi, lokasi, petunjuk dan metadata |

Merah hanya untuk galat dan tindakan destruktif. Gradien linear yang sangat ringan dari permukaan ke lavender hanya pada pembuka untuk menandai area orientasi, sesuai permintaan pengguna. Teks di atas gradien diperiksa pada ujung paling gelap.

## Tipografi dan aset

- Exo 2 variabel, disimpan lokal sebagai `assets/fonts/Exo2.ttf`, digunakan untuk teks, heading, kontrol dan harga. Bentuk bersudut lembut memberi kedekatan karakter dengan referensi inpin tanpa mengorbankan label kecil. Bobot 400 untuk isi, 600-650 untuk judul dan harga. Angka harga memakai tabular numerals dari keluarga yang sama.
- Nama yang paling dekat dengan permintaan font adalah inpin hongmengti. Lisensi bebas untuk pemakaian web/komersial tidak terverifikasi; font itu tidak dibundel. Exo 2 memakai SIL OFL 1.1, dengan teks lisensi utuh di `assets/fonts/OFL.txt`. Sumber: https://github.com/google/fonts/tree/main/ofl/exo2 . Alternatif ini bukan font identik.
- `assets/logo.svg` adalah salinan SVG gabungan yang diberikan pengguna. Bentuk dan proporsi dipertahankan; tema gelap membalik luminansinya melalui CSS agar terbaca. Dimensi eksplisit mencegah pergeseran layout.
- `assets/favicon.svg` memakai simbol keranjang yang diberikan pengguna. Ikon navigasi dan kategori dibuat sebagai SVG dalam `app.js`, dengan ukuran dan ketebalan garis konsisten, disertai label teks. Simbol menunjukkan tujuan atau jenis barang.
- Nama, barang, permintaan dan foto bawaan tetap ditandai sebagai data contoh. Tidak membuat angka sosial, ulasan atau identitas baru.

## Komposisi

```text
Desktop
[Logo] [Jelajah | Lagi Dicari | Jual | Akun] [Tema | Bahasa | Masuk | Pasang]
[Cari barang................................] [Lokasi] [Cari]
[Judul + jual / buat permintaan]   [Permintaan terbaru + anggaran]
[Delapan kategori dengan label]
[Barang: foto / judul / kondisi / lokasi / harga]

Ponsel
[Logo] [Bahasa | Tema | Masuk]
[Cari barang...............................]
[Lokasi] [Cari]
[Judul + jual / buat permintaan]
[Permintaan terbaru]
[Kategori 4 kolom, kartu barang]
[Jelajah | Lagi Dicari | Jual | Akun] tetap di bawah
```

Teks rata kiri. Tablet memakai header dua baris dan kategori empat kolom. Di ponsel, navigasi bawah memiliki safe-area dan ruang cadangan agar tidak menutupi konten; aksi detail barang berada di atasnya. Kartu menggunakan radius 10px, panel orientasi/dialog 18px, label 6px sesuai fungsi. Gerak hanya umpan balik hover/tekan; reduced motion dihormati.

## Batas sistem

Frontend penuh tetap menggunakan API Python/SQLite. Adapter read-only hanya disisipkan oleh builder GitHub Pages pada HTML hasil ekspor. Pembaruan visual tidak mengubah batas hosting tersebut. Lihat `docs/PAGES.md` dan laporan pemeriksaan UI untuk hasil validasi aktual.
