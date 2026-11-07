# Pemeriksaan pembangunan ulang UI

Tanggal: 7 November 2026. Publikasi ke `main` diizinkan pengguna setelah pemilihan rasio gambar. Pemeriksaan visual belum selesai karena akses browser pada sesi ini sebelumnya ditolak. Dokumen ini tidak mengklaim hasil render atau click-through yang tidak dilakukan.

## Perubahan

- CSS lama diganti dengan sistem komponen tunggal: token spacing 4/8/12/16/24/32/48/64px, radius 3/6/8px dan ukuran kontrol konsisten.
- Katalog desktop memakai sidebar filter dan grid hasil; ponsel memakai filter lipat dan dua kolom. Beranda memakai grid barang, bukan rel horizontal.
- Harga tampil sebelum judul, diikuti kondisi, lokasi dan penjual. Foto dan judul menuju detail yang sama. Kartu katalog, skeleton dan preview unggahan memakai bidang kotak; galeri detail 4:3. Thumbnail baris akun tetap 16:9 agar ringkas. `object-fit: contain` mempertahankan isi foto barang.
- Akun memakai ringkasan terpisah di atas, tab kiri dan kolom panel yang jelas. Baris tanpa gambar tidak lagi menyisakan kolom thumbnail. Catatan informasi mengikuti kolom isi, bukan menggantung selebar area luar.
- Inline style di semua HTML dan komponen JavaScript dihapus. Jarak pada formulir, dialog, chat, informasi akun dan aksi pemilik memakai token yang sama.
- Terang adalah default; pilihan gelap yang disimpan pengguna tetap berfungsi. Sistem operasi tidak lagi otomatis mengubah tema.
- Transisi 180-240ms memberi umpan balik tombol, foto, dialog, panel akun dan toast. Reduced motion mematikan transisi dan animasi. Tidak memakai loop, scroll reveal atau stagger seluruh kartu.
- Pembesaran foto memakai tombol native agar dapat dijangkau keyboard. Tab akun mendukung panah empat arah serta Home/End, dan orientasi ARIA mengikuti layout.

## Bukti pengujian

| Pemeriksaan | Hasil dan batas bukti |
|---|---|
| API backend | PASS: 39 smoke checks pada salinan aplikasi/database sementara, termasuk login, unggah, jual, tawaran, pesan, ulasan dan otorisasi |
| HTTP halaman/aset | PASS: tujuh halaman dan empat aset berhasil dilayani server Python |
| Tema | PASS: pengujian Node memverifikasi default terang, pilihan gelap tersimpan, tombol ganti tema dan persistensi preferensi |
| Kartu | PASS: pengujian Node memverifikasi dimensi 640x640, tautan foto/judul, kondisi, kota, penjual, placeholder berlabel dan status terjual |
| Adapter/ekspor Pages | PASS: empat pengujian snapshot publik, filter, sort, detail, profil, URL subpath dan penolakan write/private endpoint |
| Struktur HTML | PASS: tujuh halaman seimbang, ID unik, tautan relatif valid dan tanpa inline style |
| Sintaks | PASS: `node --check app/assets/app.js` dan `git diff --check` |
| Visual dan click-through | BELUM TERVERIFIKASI: tidak ada browser yang berhasil diakses; tidak menyimpulkan bahwa semua kontrol, breakpoint atau animasi sudah diuji secara visual |

Total tujuh test case Node lulus. Pengujian fungsi kartu/tema memakai DOM fixture minimal; bukan pengganti browser atau pengukuran kelancaran render.

## Landasan desain

`app/DESIGN.md` mencatat alasan keputusan dan batas penelitian. REA digunakan untuk struktur kartu, filter, state dan navigasi. Baymard mendasari penempatan atribut penting pada listing; panduan Carousell mendasari hubungan pencarian/kategori/filter. Pengguna melonggarkan rasio 16:9; katalog kotak dipilih berdasarkan variasi bentuk barang, bukan klaim universal dari penelitian atau hasil uji visual.

## Verifikasi visual tersisa

Saat izin browser tersedia, jalankan server Python lalu periksa beranda, Jelajah, detail/galeri, profil, jual, permintaan dan semua panel akun pada 360/390/768/1024/1440px. Periksa terang dan gelap, reduced motion, login/logout, filter lipat, data kosong/galat, fokus keyboard, dialog Escape, safe-area navbar/aksi bawah, serta console. Periksa catatan informasi akun pada daftar pendek, daftar panjang dan tab tanpa thumbnail. Status antislop R-03/R-26/R-27/R-32/R-34/R-35/R-39/R-40 belum dinyatakan PASS penuh tanpa pemeriksaan tersebut.
