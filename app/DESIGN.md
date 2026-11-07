# Bukatoko: arah desain

Reading this as: marketplace barang bekas untuk warga kota kecil Indonesia, bahasa visual "pasar loak teratur", dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Subjek dan audiens

Bukatoko dipakai orang yang menjual barang miliknya sendiri dan orang yang mencari barang tertentu dengan rentang harga. Bukan toko profesional. Pembeli datang dari HP, sering di sinyal lemah, dan yang mereka butuhkan pertama: harga, kondisi, lokasi, siapa penjualnya.

Referensi: riset Carousell Indonesia di `../REA/carousell-indonesia`. Yang diambil hanya pelajaran strukturnya (IA, kepadatan kartu, state marketplace). Identitas visualnya sengaja tidak ditiru (R-30).

## Karakter

Pasar loak yang dirapikan: kertas, label harga, cap toko. Bukan startup. Tidak ada gradien, tidak ada glow, tidak ada kartu melayang.

## Palet

Dua warna inti plus satu aksen. Nilai di bawah ini yang dipakai CSS.

| Token | Light | Dark | Alasan |
|---|---|---|---|
| paper (kanvas) | #F4EFE4 | #14120C | kertas buram, bukan putih bersih, mata tidak silau di pasar outdoor |
| surface (kartu) | #FFFCF5 | #1E1B13 | satu tingkat di atas kanvas, tanpa shadow |
| ink | #1A1710 | #F3EDE0 | teks utama |
| muted | #5F5749 | #A79E8C | metadata; tetap >= 4.5:1 |
| line | #DCD2BF | #342F23 | garis 1px, pembatas struktural |
| primary (warung green) | #1E6B4E | #4FB98C | aksi utama: Jual, Cari, Ajukan |
| accent (kunyit) | #8A4B08 | #E9A94B | label harga dan penanda "dicari", dipakai hemat |

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
