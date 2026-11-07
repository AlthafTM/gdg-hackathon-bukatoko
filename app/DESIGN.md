# Bukatoko: arah desain

Reading this as: marketplace barang bekas untuk warga kota kecil Indonesia, bahasa visual "pasar loak teratur", dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Subjek dan audiens

Bukatoko dipakai orang yang menjual barang miliknya sendiri dan orang yang mencari barang tertentu dengan rentang harga. Bukan toko profesional. Pembeli datang dari HP, sering di sinyal lemah, dan yang mereka butuhkan pertama: harga, kondisi, lokasi, siapa penjualnya.

Referensi: riset Carousell Indonesia di `../REA/carousell-indonesia`. Yang diambil hanya pelajaran strukturnya (IA, kepadatan kartu, state marketplace). Identitas visualnya sengaja tidak ditiru (R-30).

## Karakter

Pasar warga yang segar dan teratur: kanvas putih lavender, identitas ungu, dan label harga hijau. Tidak ada gradien, tidak ada glow, tidak ada kartu melayang. Struktur dan alur marketplace tetap dipertahankan.

## Palet

Palet Purple / Lavender / Green mengikuti referensi pengguna: primary `#7C3AED`, secondary `#A78BFA`, accent `#22C55E`, background `#FAF9FF`, dan text `#1F1637` pada tema terang. Nilai di bawah ini adalah token semantik dalam `assets/styles.css`, dipakai bersama oleh ketujuh halaman dan dialog yang dibuat JavaScript.

| Token | Light | Dark | Alasan |
|---|---|---|---|
| paper (kanvas) | #FAF9FF | #160F24 | putih lavender dan ungu gelap |
| surface (kartu) | #FFFFFF | #241A38 | kartu, header, form dan dialog |
| ink | #1F1637 | #FAF9FF | teks utama |
| muted | #625675 | #C4B5D8 | metadata dan placeholder |
| line / line-strong | #DED6ED / #9583AD | #473657 / #89749F | pembatas dan batas kontrol |
| primary / primary-ink | #7C3AED / #FFFFFF | #A78BFA / #1F1637 | aksi utama: Jual, Cari, Ajukan |
| primary-hover | #6D28D9 | #C4B5FD | hover tombol, terpisah dari ring fokus |
| primary-soft | #F3E8FF | #38264F | hover, avatar, langkah aktif dan pesan sendiri |
| secondary / secondary-ink | #A78BFA / #1F1637 | #A78BFA / #1F1637 | navigasi, tab dan tombol simpan aktif |
| accent | #22C55E | #22C55E | aksen hijau pada label harga dan notifikasi |
| accent-ink / accent-soft | #166534 / #F0FDF4 | #86EFAC / #123A25 | teks label harga, bintang dan strip demo |
| accent-solid-ink | #052E16 | #052E16 | teks notifikasi di atas hijau solid |
| danger | #B91C1C | #FCA5A5 | galat dan aksi destruktif tetap dibedakan |
| focus | #7C3AED | #A78BFA | ring fokus keyboard |

Hijau `#22C55E` tidak dipakai sebagai teks kecil di atas putih atau lavender. Gunakan `accent-ink` di atas `accent-soft`, dan `accent-solid-ink` di atas hijau solid. Tema gelap mempertahankan keluarga ungu/lavender/hijau dengan kontras yang sesuai; tema mengikuti sistem sampai pengguna memilih sendiri. Ikon situs dan SVG "foto contoh" memakai palet yang sama. Foto unggahan pengguna tetap ditampilkan apa adanya.

## Tipografi

- Teks: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`. Alasan: harga dan kondisi dibaca cepat, font sistem paling tajam di HP murah.
- Angka harga: `ui-monospace, "SF Mono", Menlo, Consolas, monospace` dengan `font-variant-numeric: tabular-nums`. Alasan fungsional: angka rupiah harus rata kolom supaya bisa dibandingkan sekilas, bukan untuk gaya terminal.
- Skala: 13 / 14 / 16 / 20 / 28 / 36 px. Berat 600 hanya untuk judul dan harga.

## Elemen signature

Label harga berbentuk tag kertas: sudut 3px, garis putus-putus di sisi kiri, lubang tusuk kecil di ujungnya, rotasi maksimum 1.5 derajat. Dipakai di kartu barang, di judul seksi, dan di papan "Lagi Dicari". Satu gestur, diulang, sehingga halaman ini tidak bisa tertukar dengan marketplace lain.

## Yang dilarang di proyek ini

- Gradien biru-ungu, glow, glassmorphism, shadow besar.
- Badge kapsul "Baru", "AI", "Terpercaya" tanpa isi.
- Angka sosial tanpa sumber. Tidak ada "10.000+ pengguna".
- Ulasan karangan. Ulasan hanya dirender kalau datanya ada.
- Teks em dash.
- Navbar berisi tautan ke halaman yang belum ada.

## Data dan placeholder

Semua barang, penjual, dan permintaan di situs ini data contoh untuk demo, ditandai di strip atas setiap halaman. Foto barang adalah placeholder SVG yang ditulis "foto contoh", bukan produk asli. Avatar penjual adalah inisial, bukan wajah.

## Gerak

Hover dan focus saja, 120ms. Tidak ada scroll reveal. Hormati `prefers-reduced-motion`.
