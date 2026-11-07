# BukaToko: arah desain

Reading this as: katalog marketplace lokal yang padat informasi, teratur, dan mudah dinavigasi. ENERGY 2 / RHYTHM 2 / MOTION 2. Brief lanjutan 7 November 2026 meminta pembangunan ulang UI: kartu lebih mengotak, foto 16:9, spacing konsisten, gerak interaksi halus, terang default dan akun yang tersusun jelas.

## Prioritas kegunaan

Harga, kondisi dan lokasi harus terlihat pada kartu barang. Pencarian berada sebelum konten pembuka. Pengguna dapat langsung menjual barang atau membuat permintaan dengan rentang harga. Permintaan terbaru ditampilkan di samping pembuka karena dua sisi pasar ini sama pentingnya.

Katalog desktop memakai filter kiri selebar 248px dan grid hasil tiga kolom; tablet beralih dua kolom. Ponsel memakai filter lipat dan grid dua kolom. Kartu menampilkan harga dahulu, judul dua baris, kondisi, lokasi, lalu penjual. Setelah pengguna membolehkan rasio alternatif, bidang katalog dipilih kotak 1:1: lebih fleksibel bagi foto ponsel, pakaian dan buku yang cenderung tinggi, serta barang rumah tangga yang bentuknya beragam. Foto asli memakai `object-fit: contain` agar tidak terpotong; placeholder dibuat 640x640. Galeri detail 4:3 menyediakan ruang inspeksi tanpa setinggi panel kotak pada desktop. Thumbnail galeri dan unggahan kotak; thumbnail kecil di daftar akun tetap 16:9 untuk menjaga baris tetap ringkas. Foto dan judul menuju detail yang sama.

Akun memiliki ringkasan penuh di atas, enam angka dalam grid, lalu tab vertikal di kiri dan panel isi di kanan. Pada layar sempit tab menjadi horizontal. Catatan informasi berada di kolom panel, setelah isinya, dengan gutter dan padding yang sama. Baris tanpa thumbnail memakai satu kolom, sehingga pesan atau tawaran tidak terdorong ke kolom foto kosong.

Semua halaman dan dialog memakai token spacing 4/8/12/16/24/32/48/64px. Inline style layout telah dihapus dari HTML dan komponen JavaScript. Radius hanya 3/6/8px. CSS lama diganti sebagai satu sistem komponen, bukan ditumpuk dengan tema tambahan.

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

Teks rata kiri. Tablet memakai header dua baris dan kategori empat kolom. Di ponsel, navigasi bawah memiliki safe-area dan ruang cadangan agar tidak menutupi konten; aksi detail barang berada di atasnya. Gerak 180-240ms pada tombol, pembesaran foto saat hover, pembukaan dialog dan pergantian panel memberi umpan balik. Animasi otomatis hanya sekali pada panel/konten, tanpa stagger tiap kartu atau efek scroll. Semua animasi/transisi dimatikan ketika reduced motion aktif. Terang menjadi default; tema gelap hanya dari pilihan pengguna yang tersimpan.

## Landasan eksternal

- REA, bagian informasi kartu, filter, navigasi kembali dan state kosong/galat: dipakai sebagai referensi struktur, bukan kontrak backend produksi.
- https://baymard.com/research-articles/product-listing-information : atribut penting perlu terlihat pada listing agar pembeli tidak perlu membuka setiap detail untuk membandingkan barang. Mendukung hierarki harga/kondisi/lokasi.
- https://blog.carousell.com/carousell-pro-tips/buying-guide/browse-carousell/ : pencarian, kategori dan filter mendukung penemuan barang. Mendukung pemisahan filter dan hasil.
- Rasio awal 16:9 dilonggarkan pengguna; pemilihan katalog 1:1 dan galeri 4:3 adalah keputusan desain berdasarkan variasi bentuk barang, belum hasil A/B atau uji visual. Bentuk mengotak, tema terang dan animasi mengikuti instruksi pengguna. Riset gambar Baymard mendukung keterlihatan detail, bukan menetapkan satu rasio universal: https://baymard.com/research-articles/ensure-sufficient-image-resolution-and-zoom .

## Batas sistem

Frontend penuh tetap menggunakan API Python/SQLite. Adapter read-only hanya disisipkan oleh builder GitHub Pages pada HTML hasil ekspor. Pembaruan visual tidak mengubah batas hosting tersebut. Lihat `docs/PAGES.md` dan laporan pemeriksaan UI untuk hasil validasi aktual.
