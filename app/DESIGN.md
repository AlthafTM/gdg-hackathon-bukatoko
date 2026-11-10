# JualinAja: arah desain

Reading this as: katalog marketplace lokal yang padat informasi, teratur, dan mudah dinavigasi. ENERGY 2 / RHYTHM 2 / MOTION 2. Revisi 8 November 2026 memakai React/Tailwind untuk katalog, bingkai foto 4:3 penuh sesuai klarifikasi terakhir, komponen ponsel/tablet lebih ringkas, ikon membulat, acid lime lebih terlihat dan gerak dengan anticipation ringan. Detail implementasi dan build ada di `../frontend/README.md`.

## Prioritas kegunaan

Harga, kondisi dan lokasi harus terlihat pada kartu barang. Pencarian berada sebelum konten pembuka. Pengguna dapat langsung menjual barang atau membuat permintaan dengan rentang harga. Permintaan terbaru ditampilkan di samping pembuka karena dua sisi pasar ini sama pentingnya.

Katalog desktop memakai filter kiri 312px, lebar halaman maksimum 1560px dengan gutter 32px, dan grid hasil tiga kolom. Filter dilipat pada lebar sampai 1024px; tablet memakai hasil dua kolom dan gutter 24px, ponsel gutter 16px. Harga, judul, kondisi, lokasi dan penjual tetap berurutan. Bidang katalog 4:3 dengan `object-fit: cover` memenuhi panel secara proporsional; sebagian tepi foto 16:9 dapat terpotong. Tidak ada zoom hover tambahan. Galeri detail memakai contain agar sumber utuh dapat diperiksa. Foto dan judul menuju detail yang sama.

Akun memiliki ringkasan penuh di atas, enam angka dalam grid, lalu tab vertikal di kiri dan panel isi di kanan. Pada layar sempit tab menjadi horizontal. Catatan informasi berada di kolom panel, setelah isinya, dengan gutter dan padding yang sama. Baris tanpa thumbnail memakai satu kolom, sehingga pesan atau tawaran tidak terdorong ke kolom foto kosong.

Semua halaman dan dialog memakai token spacing 4/8/12/16/24/32/48/64px. Kartu/panel memakai radius 24px, elemen kecil 16px, dialog 28px; tombol dan isian satu baris membulat penuh. Textarea tetap radius panel. Hover menggabungkan bayangan violet/lime yang ringan; tidak dipertahankan pada perangkat touch. Utility Tailwind memakai prefix `tw:` tanpa Preflight agar tidak menimpa formulir/backend yang diintegrasikan.

Referensi struktur: `../REA/carousell-indonesia`. Gunakan pelajaran navigasi dan state marketplace dari riset; alur permintaan adalah konsep JualinAja sendiri.

## Token dan alasan

| Peran | Terang | Gelap | Alasan |
|---|---|---|---|
| Electric violet | #7038E8 | #B49CFF | Aksi utama, tautan dan fokus keyboard |
| Violet lembut | #EFE8FF | #342A50 | Navigasi aktif dan permukaan pendukung |
| Acid lime | #C8F542 | #D1FF52 | Notifikasi dan aksen tersier, teks charcoal |
| Kanvas netral | #F6F7F9 | #17191F | Permukaan terang dan deep charcoal |
| Teks utama | #202228 | #F5F6FA | Kontras dan keterbacaan |
| Teks pendukung | #59606D | #BDC2CE | Kondisi, lokasi, petunjuk dan metadata |

Merah hanya untuk galat dan tindakan destruktif. Gradien linear yang sangat ringan dari permukaan ke lavender hanya pada pembuka untuk menandai area orientasi, sesuai permintaan pengguna. Teks di atas gradien diperiksa pada ujung paling gelap.

## Tipografi dan aset

- Nunito variabel, disimpan lokal sebagai `assets/fonts/nunito/Nunito.ttf`, digunakan untuk teks, heading, kontrol dan harga. Pengguna secara khusus meminta ujung huruf membulat dan menolak Nunito Sans. Bobot 400 untuk isi, 700 untuk judul kartu, 750 untuk heading. Angka harga memakai tabular numerals dari keluarga yang sama.
- Nunito memakai SIL OFL 1.1, dengan teks lisensi utuh di `assets/fonts/nunito/OFL.txt`. Sumber resmi: https://github.com/google/fonts/tree/main/ofl/nunito . Font inpin tidak dibundel; berkas Exo 2 lama dipertahankan sebagai aset historis tetapi tidak dipakai oleh CSS aktif.
- `assets/logo.svg` adalah salinan SVG gabungan yang diberikan pengguna. Bentuk dan proporsi dipertahankan; tema gelap membalik luminansinya melalui CSS agar terbaca. Dimensi eksplisit mencegah pergeseran layout.
- `assets/favicon.svg` memakai simbol keranjang yang diberikan pengguna. Ikon navigasi dan kategori dibuat sebagai SVG dalam `app.js`, dengan ukuran dan ketebalan garis konsisten, disertai label teks. Simbol menunjukkan tujuan atau jenis barang.
- Judul browser dan heading beranda memakai `JualinAja - Jual apapun disini.`; versi Inggris mengikuti pilihan bahasa. Detail barang/profil tidak menimpa judul merek. Metadata Open Graph tetap mendeskripsikan barang, disisipkan terpisah dari judul browser. Favicon keranjang memakai warna ungu adaptif terang/gelap serta URL versi baru untuk memperbarui cache.
- Nama, barang, permintaan dan foto bawaan tetap ditandai sebagai data contoh. Tidak membuat angka sosial, ulasan atau identitas baru.
- Empat belas listing sampel memakai foto asli Pexels yang disimpan lokal. Lisensi, fotografer, halaman sumber dan hash unduhan dicatat di `assets/stock/photos.json`; batas pemakaian di `assets/stock/README.md`. Label bilingual menandai foto referensi, bukan bukti model/kondisi barang sebenarnya. Galeri menghitung foto tersedia, bukan angka foto fiktif fixture. Unggahan penjual selalu didahulukan; SVG kontekstual hanya cadangan ID tanpa foto.

## Pencarian dan bahasa

Pencarian utama tersedia di atas konten pada desktop, termasuk halaman lain melalui shell bersama. Area luar bar transparan, input dan tombol berbentuk pill. Isian kata kunci sidebar memakai padding 16px tanpa ruang ikon; selector dasar memakai `:where` agar override ikon tidak kalah specificity. Tombol simpan pencarian berada di bawah formulir filter, satu konteks dengan kriteria yang disimpan. Judul pada papan permintaan memakai satu baris grid bersama, lalu daftar permintaan dan kartu formulir memakai baris berikutnya sehingga sejajar meskipun terjemahan membungkus.

Kategori cepat berada tepat setelah area pencarian. Pada Jelajah, kategori memperbarui hasil tanpa reload, mempertahankan query/lokasi/harga/kondisi/urutan/status dan mengabaikan hasil respons lama. URL tautan juga tersedia untuk navigasi normal/keyboard atau membuka tab baru. Parameter URL lokasi `lok` diterjemahkan ke parameter API `city`.

CSS, script dan font memakai URL versi baru; Nunito dipreload agar permintaan font berjalan lebih awal. Ini memperbarui cache aset pada navigasi berikutnya setelah deployment, bukan bukti bahwa tampilan browser sudah diverifikasi.

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

Teks rata kiri. Tablet memakai header dua baris dan kategori empat kolom. Di ponsel, navigasi bawah memiliki safe-area dan ruang cadangan agar tidak menutupi konten; aksi detail barang berada di atasnya. Sesuai permintaan terbaru, pop-up memakai fade dan scale 300ms; kartu/panel memakai reveal 420ms saat memasuki viewport dari kedua arah. Reveal diulang setelah elemen sepenuhnya meninggalkan viewport, tanpa stagger. Elemen berfokus tetap terlihat. Semua animasi/transisi dimatikan ketika reduced motion aktif. Terang menjadi default; tema gelap hanya dari pilihan pengguna yang tersimpan.

`motion.js` mengganti tema dengan View Transitions: snapshot baru diungkap melalui lingkaran 900ms setelah delay 120ms dari pusat tombol ke sudut viewport terjauh. Klik berikutnya menunggu transisi selesai. Browser tanpa API tersebut memakai fade warna; reduced motion mengganti tema langsung. Transisi navigasi native memakai fade keluar/masuk terpisah dan header stabil; dukungannya mengikuti browser. Locale dimuat di head dan melewati subtree React, sedangkan font optional menghindari pergantian glyph terlambat. Scroll reveal memakai IntersectionObserver dengan pembersihan elemen yang dilepas. Rujukan: https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition .

## Landasan eksternal

- REA, bagian informasi kartu, filter, navigasi kembali dan state kosong/galat: dipakai sebagai referensi struktur, bukan kontrak backend produksi.
- https://baymard.com/research-articles/product-listing-information : atribut penting perlu terlihat pada listing agar pembeli tidak perlu membuka setiap detail untuk membandingkan barang. Mendukung hierarki harga/kondisi/lokasi.
- https://blog.carousell.com/carousell-pro-tips/buying-guide/browse-carousell/ : pencarian, kategori dan filter mendukung penemuan barang. Mendukung pemisahan filter dan hasil.
- Rasio katalog terbaru 4:3 penuh mengikuti klarifikasi pengguna; galeri/zoom tetap dapat menampilkan sumber utuh. Ini bukan hasil A/B. Riset gambar Baymard mendukung keterlihatan detail, bukan menetapkan satu rasio universal: https://baymard.com/research-articles/ensure-sufficient-image-resolution-and-zoom .

## Batas sistem

Frontend penuh tetap menggunakan API Python/SQLite. Build tanpa konfigurasi menyisipkan adapter read-only; build terhubung menyisipkan origin API Instabox dan tidak memuat adapter. GitHub Pages tetap hanya menyajikan frontend; proses Python dan data tetap berada di server terpisah. Konfigurasi backend dan batas validasi ada di `../docs/BACKEND-CONNECTION.md`.
