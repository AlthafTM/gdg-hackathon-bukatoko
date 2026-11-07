# Pemeriksaan alignment, kontrol dan animasi

Tanggal: 7 November 2026. Status: perubahan lokal, belum commit/deploy. Browser sebelumnya menolak akses origin sehingga hasil visual belum terverifikasi.

## Perbaikan

- Kedua judul pada papan permintaan berada di baris grid yang sama; daftar dan formulir mulai pada baris kedua. Pembungkusan teks Inggris/Indonesia ikut menentukan tinggi baris bersama. Di mobile urutan menjadi judul/daftar lalu judul/formulir.
- Simpan pencarian dipindah ke bawah formulir filter. Bar luar transparan; ikon dan input kini berada dalam satu flex row, bukan overlay absolut. Bingkai dan fokus keyboard mengikuti satu bidang pill. Filter desktop 312px, tablet 272px, lebar halaman maksimum 1560px; padding kata kunci 16px. Navigasi utama berbentuk pill dan memiliki tombol Beranda dengan ikon rumah.
- Radius panel/kartu 24px, elemen kecil 16px, dialog 28px. Tombol, isian satu baris, kategori cepat, chip filter dan kontrol galeri membulat penuh. Textarea tetap berbentuk bidang multiline dengan radius panel.
- Font aktif tetap Nunito, dengan preload dan URL font versi baru. CSS dan seluruh script memakai URL versi baru untuk menghindari penggunaan aset lama pada navigasi berikutnya setelah deployment. Ini tindakan pencegahan cache, bukan diagnosis pasti penyebab tampilan pada browser pengguna.
- Empat belas foto stok Pexels disimpan lokal dan disertai manifest lisensi/kredit/hash. Foto diberi label referensi; unggahan asli tetap didahulukan. Galeri menghitung jumlah URL foto yang tersedia, atau satu foto referensi. Palet berubah menjadi deep charcoal, electric violet dan acid lime; lime memakai teks charcoal pada bidang terang dan hijau gelap untuk teks harga light mode.
- Kategori cepat tepat di bawah area pencarian. Pada Jelajah, klik memperbarui hasil tanpa reload sambil mempertahankan filter yang diterapkan. Tautan normal tetap tersedia untuk keyboard/tab baru. Respons request lama diabaikan setelah pilihan baru dibuat. Parameter lokasi URL `lok` dikonversi ke parameter API `city`.
- Pop-up memakai fade backdrop dan scale/fade isi; kartu/panel memakai IntersectionObserver untuk reveal ulang setelah sepenuhnya keluar lalu kembali ke viewport dari kedua arah. Elemen berfokus tetap terlihat. Referensi elemen yang dilepas dibersihkan.
- View Transitions mengungkap snapshot tema baru melalui clip-path lingkaran dari pusat tombol ke sudut viewport terjauh selama 620ms. Klik berikutnya menunggu transisi selesai. Browser tanpa dukungan memakai fade warna; reduced motion mengganti tema langsung dan menonaktifkan reveal. Bootstrap tema di head ketujuh halaman berjalan sebelum stylesheet; background root mengikuti tema tersimpan agar navigasi tidak mulai dengan kanvas putih. Fade opacity awal pada keseluruhan grid dihapus.

## Baseline sebelum revisi foto/palet/bootstrap

- API PASS: 41 smoke checks pada fixture sementara, termasuk gabungan lokasi/kategori, login, jual, unggah, tawaran, pesan, ulasan dan otorisasi.
- Unit/ekspor PASS: 17 test case Node, termasuk kategori yang mempertahankan filter/reset pagination, pusat/radius lingkaran, reduced motion, fallback, reveal keluar/masuk ulang, serta regresi UI, locale dan Pages.
- Struktur PASS: tujuh HTML seimbang, ID unik, aset relatif valid; URL CSS, app, motion dan font yang berversi berhasil dilayani Python.
- Sintaks JavaScript dan whitespace Git diperiksa.

Unit animasi memakai mock API, bukan render browser. Tidak mengklaim FPS, kelancaran aktual, alignment piksel, bentuk glyph/font yang sudah terlihat pada perangkat pengguna, atau hasil semua breakpoint. Uji visual tersisa mencakup kedua tema/bahasa, klik tema berulang, scroll naik/turun, keyboard, reduced motion, fallback API, hasil kosong/error, kategori cepat dan papan permintaan pada 360/390/768/1024/1440px. Gerbang visual/click-through belum dinyatakan PASS penuh.

## Revisi terbaru: batas validasi

Angka pengujian di atas adalah baseline sebelumnya, bukan hasil ulang revisi foto/palet/bootstrap. Pengujian ekspor foto dan prioritas unggahan telah ditambahkan, tetapi belum dijalankan. Skill security-audit yang diminta pengguna melarang menjalankan target tanpa sandbox OS dengan jaringan terisolasi, environment allowlist, mount read-only, scratch dan pembatasan sumber daya. Lingkungan ini tidak menyediakan seluruh kontrol tersebut. Pemeriksaan terbaru: sintaks enam berkas JS/test melalui `node --check` tanpa menjalankan isinya, AST Python, ID/tautan aset tujuh HTML, urutan bootstrap tema, hash 14 JPEG dan whitespace lulus. Tujuh pasangan kontras teks utama/aksi diperiksa secara numerik; rasio terendah 5,90:1. Ini bukan pemeriksaan seluruh state UI. Browser dan koneksi API belum diuji ulang. Build ulang Pages, jalankan seluruh tes dalam sandbox yang sesuai, lalu lakukan pemeriksaan visual sebelum menyatakan lulus.

Frontend lokal tetap memakai fetch relatif `/api/` dan cookie same-origin. Setelah pengguna memberikan URL Instabox, build terhubung disiapkan terpisah dengan konfigurasi API/foto, allowlist CORS dan cookie lintas situs opt-in. Build tanpa parameter tetap baca-saja. Backend remote harus diperbarui dan koneksi live belum diuji; lihat `BACKEND-CONNECTION.md`. Perubahan belum commit/deploy.

Rujukan implementasi: [View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) dan [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
