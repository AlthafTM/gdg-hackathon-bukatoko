# Pemeriksaan pembaruan UI, 7 November 2026

Status: implementasi lokal siap ditinjau; gerbang pemeriksaan visual belum selesai. Tidak mengklaim persetujuan visual atau hasil click-through browser.

## Hasil yang sudah dibuktikan

- API PASS: 39 pemeriksaan pada salinan aplikasi dan database sementara, termasuk login, daftar, unggah, pasang barang, tawaran, pesan, ulasan, simpan, lapor, blokir, otorisasi dan filter kondisi. Fixture dibuang setelah proses server dihentikan; database kerja tidak dipakai untuk pengujian ini.
- Aset/backend PASS: ketujuh halaman HTML serta logo, favicon, font, lisensi, CSS dan JavaScript memberikan HTTP 200 dari server Python.
- Ekspor Pages PASS: empat pengujian Node meliputi allowlist publik, font/lisensi/logo pada ekspor, filter/sort/pagination, detail/profil/permintaan, URL subpath, serta penolakan write/private endpoint.
- Sintaks PASS: `node --check app/assets/app.js`.
- Kontras token PASS: sembilan pasangan teks dan dua pasangan batas kontrol pada masing-masing tema dihitung dengan formula WCAG. Rasio teks terendah 5.16:1; batas kontrol terendah 3.45:1. Angka ini memverifikasi pasangan token, bukan audit seluruh piksel hasil render.
- Arah dan aset PASS melalui inspeksi sumber: brief dan alasan keputusan tercatat di `app/DESIGN.md`; logo SVG pengguna disalin; Exo 2 dengan SIL OFL dibundel; ikon relevan memiliki label; data demo tetap ditandai; gradien hanya untuk hierarki pembuka; tidak ada klaim pengguna/ulasan baru.
- Interaksi melalui inspeksi sumber: kategori menuju hasil dengan query kategori; navigasi menuju halaman nyata; callback API server dipertahankan; adapter Pages tetap opsional; terjemahan label navigasi mempertahankan ikon; fokus keyboard dan reduced motion tetap tersedia.

## Pemeriksaan browser yang masih diperlukan

Browser menolak akses baik ke localhost maupun origin preview publik dengan alasan izin pengguna. Tidak mencoba browser lain atau jalur pengganti untuk melewati penolakan tersebut. URL preview pilihan pengguna: https://althaftm.github.io/gdg-hackathon-bukatoko/jelajah.html . Versi publik tidak berubah sebelum commit/push yang diizinkan.

Setelah akses browser tersedia dan versi baru dipublikasikan, catat hasil setiap langkah berikut. R-03/R-26/R-27/R-32/R-34/R-35/R-39/R-40 belum boleh dinyatakan PASS penuh hanya berdasarkan sumber.

| Kontrol/alur | Hasil yang harus diamati |
|---|---|
| Logo | Kembali ke beranda, proporsi benar di kedua tema |
| Delapan kategori | Hasil sesuai kategori dan ikon berlabel |
| Cari dan lokasi | Query dipertahankan saat membuka hasil/detail/kembali |
| Harga, kondisi, urutan dan status | Hasil berubah, kosong ditangani, chip dapat dihapus |
| Kartu barang | Detail memuat harga, kondisi, lokasi, galeri dan penjual |
| Galeri dan profil | Foto berpindah, profil dan barang penjual dimuat |
| Simpan, tawar, pesan, lapor dan blokir | Full backend meminta login/menjalankan aksi; Pages menjelaskan batas read-only |
| Jual dan permintaan | Label/validasi terbaca, login berfungsi pada server penuh |
| Tema dan bahasa | Kedua tema terbaca, teks/ikon navigasi tetap terlihat |
| Tab, Enter dan Escape | Urutan fokus masuk akal, ring terlihat, dialog menutup |
| Lebar 360, 390, 768, 1024 dan 1440 px | Tidak overflow; nav bawah/aksi detail tidak menutupi konten |
| Loading, kosong dan error | Pesan terbaca dan tindakan pemulihan berfungsi |
| Console | Tidak ada error; logo dan font termuat |

Gerbang antislop: verifikasi kode dan fungsi backend di atas selesai; pemeriksaan visual dan click-through masih menunggu izin browser. Jangan mengubah status ini menjadi PASS penuh tanpa bukti render dan interaksi.

## Follow-up, 0.3.0

Browser access was available for this round. Checked in a real Chromium session against the Python server: logo and labelled icons render, the category rail scrolls instead of widening the page, like/comment controls work on listings and wanted requests, the wanted reply modal lists only the signed-in seller's active listings, the eight account tabs switch, and computed text contrast passes in both themes on home, browse, listing and account. Seven pages measure 390 px wide with no horizontal overflow at a 390 px viewport. Mobile bottom navigation, keyboard tab order and the reduced-motion path were reviewed by hand only; no screen reader was run.
