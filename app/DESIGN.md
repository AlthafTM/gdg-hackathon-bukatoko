# BukaToko: arah desain

Reading this as: katalog marketplace lokal yang padat informasi, teratur, dan mudah dinavigasi. ENERGY 2 / RHYTHM 2 / MOTION 2. Brief lanjutan 7 November 2026 meminta pembangunan ulang UI: kartu lebih mengotak, foto 16:9, spacing konsisten, gerak interaksi halus, terang default dan akun yang tersusun jelas.

## Prioritas kegunaan

Harga, kondisi dan lokasi harus terlihat pada kartu barang. Pencarian berada sebelum konten pembuka. Pengguna dapat langsung menjual barang atau membuat permintaan dengan rentang harga. Permintaan terbaru ditampilkan di samping pembuka karena dua sisi pasar ini sama pentingnya.

Katalog desktop memakai filter kiri selebar 248px dan grid hasil tiga kolom; tablet beralih dua kolom. Ponsel memakai filter lipat dan grid dua kolom. Kartu menampilkan harga dahulu, judul dua baris, kondisi, lokasi, lalu penjual. Setelah pengguna membolehkan rasio alternatif, bidang katalog dipilih kotak 1:1: lebih fleksibel bagi foto ponsel, pakaian dan buku yang cenderung tinggi, serta barang rumah tangga yang bentuknya beragam. Foto asli memakai `object-fit: contain` agar tidak terpotong; placeholder dibuat 640x640. Galeri detail 4:3 menyediakan ruang inspeksi tanpa setinggi panel kotak pada desktop. Thumbnail galeri dan unggahan kotak; thumbnail kecil di daftar akun tetap 16:9 untuk menjaga baris tetap ringkas. Foto dan judul menuju detail yang sama.

Akun memiliki ringkasan penuh di atas, enam angka dalam grid, lalu tab vertikal di kiri dan panel isi di kanan. Pada layar sempit tab menjadi horizontal. Catatan informasi berada di kolom panel, setelah isinya, dengan gutter dan padding yang sama. Baris tanpa thumbnail memakai satu kolom, sehingga pesan atau tawaran tidak terdorong ke kolom foto kosong.

Semua halaman dan dialog memakai token spacing 4/8/12/16/24/32/48/64px. Inline style layout telah dihapus dari HTML dan komponen JavaScript. Sesuai revisi pengguna, kartu/panel memakai radius 16px, elemen kecil 12px, dialog 20px; tombol dan isian satu baris membulat penuh. Textarea tetap radius panel agar bidang teks multiline tidak berbentuk oval. Glow ungu ringan hanya saat hover untuk menunjukkan panel aktif, bukan efek latar permanen. CSS memakai satu sistem komponen.

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

- Nunito variabel, disimpan lokal sebagai `assets/fonts/nunito/Nunito.ttf`, digunakan untuk teks, heading, kontrol dan harga. Pengguna secara khusus meminta ujung huruf membulat dan menolak Nunito Sans. Bobot 400 untuk isi, 700 untuk judul kartu, 750 untuk heading. Angka harga memakai tabular numerals dari keluarga yang sama.
- Nunito memakai SIL OFL 1.1, dengan teks lisensi utuh di `assets/fonts/nunito/OFL.txt`. Sumber resmi: https://github.com/google/fonts/tree/main/ofl/nunito . Font inpin tidak dibundel; berkas Exo 2 lama dipertahankan sebagai aset historis tetapi tidak dipakai oleh CSS aktif.
- `assets/logo.svg` adalah salinan SVG gabungan yang diberikan pengguna. Bentuk dan proporsi dipertahankan; tema gelap membalik luminansinya melalui CSS agar terbaca. Dimensi eksplisit mencegah pergeseran layout.
- `assets/favicon.svg` memakai simbol keranjang yang diberikan pengguna. Ikon navigasi dan kategori dibuat sebagai SVG dalam `app.js`, dengan ukuran dan ketebalan garis konsisten, disertai label teks. Simbol menunjukkan tujuan atau jenis barang.
- Judul browser dan heading beranda memakai `BukaToko - Jual apapun disini.`; versi Inggris mengikuti pilihan bahasa. Detail barang/profil tidak menimpa judul merek. Metadata Open Graph tetap mendeskripsikan barang, disisipkan terpisah dari judul browser. Favicon keranjang memakai warna ungu adaptif terang/gelap serta URL versi baru untuk memperbarui cache.
- Nama, barang, permintaan dan foto bawaan tetap ditandai sebagai data contoh. Tidak membuat angka sosial, ulasan atau identitas baru.
- Foto bawaan merupakan ilustrasi SVG buatan aplikasi: bentuk kamera, ponsel, sepatu, buku, gitar, sepeda, kulkas, meja, monitor, jaket atau konsol dipilih dari konteks judul. Tetap diberi label bilingual foto contoh/sample illustration. Foto unggahan nyata tidak diganti.

## Pencarian dan bahasa

Pencarian utama tersedia di atas konten pada desktop, termasuk halaman lain melalui shell bersama. Isian kata kunci sidebar memakai padding normal; padding ikon hanya untuk input dengan ikon. Tombol simpan pencarian berada di toolbar hasil, sehingga kartu pertama dan panel filter mulai pada baris yang sama.

`assets/locale.js` melokalisasi teks UI Indonesia/Inggris, placeholder, label aksesibilitas, dialog, status dan pesan galat. Nilai input dan nilai option backend dipertahankan; judul/deskripsi produk, nama pengguna, ulasan dan percakapan tidak diterjemahkan. Konten asinkron diproses lewat observer yang dihentikan sementara saat menerapkan terjemahan agar tidak membentuk loop. Bahasa dokumen ikut berubah; bahasa akun tidak memicu reload. Teks boleh membungkus, ukuran ruang tidak dikunci pada panjang satu bahasa.

Penanda wajib memakai `*`, dijelaskan di bawah formulir sebagai `* Wajib diisi.`/`* Required fields.`. Field terkait tetap memiliki semantik required untuk pembaca layar dan validasi. Nilai kategori/kondisi tetap mengikuti kontrak backend Indonesia meskipun label tampil Inggris.

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
