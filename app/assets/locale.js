(function () {
  "use strict";
  function preferredLanguage() {
    var browser = typeof navigator !== "undefined" ? navigator : {};
    var preferred = Array.from(browser.languages || []).filter(Boolean);
    if (!preferred.length && browser.language) preferred = [browser.language];
    if (!preferred.length) {
      try { preferred = [Intl.DateTimeFormat().resolvedOptions().locale]; }
      catch (error) { return "en"; }
    }
    for (var i = 0; i < preferred.length; i++) {
      var base = String(preferred[i] || "").toLowerCase().split(/[-_]/)[0];
      if (base === "id" || base === "en") return base;
    }
    return "en";
  }
  var language = preferredLanguage();
  var phrases = {
    "Tutup permintaan":"Close request",
    "Ditutup":"Closed",
    "Foto profil":"Profile photo",
    "Ubah foto profil":"Change profile photo",
    "Foto profil diperbarui.":"Profile photo updated.",
    "Pilih satu foto profil.":"Select one profile photo.",
    "Pengiriman email belum tersedia.":"Email delivery is unavailable.",
    "Masukkan email akunmu untuk meminta kode reset.":"Enter your account email to request a reset code.",
    "wajib diisi":"required",
    "Laporan terlalu panjang untuk tautan GitHub. Unduh teks dan tempelkan ke laporan baru.":"The report is too long for a GitHub link. Download the text and paste it into a new issue.",
    "Ketahui cara BukaToko bekerja dan pilihan yang tersedia untukmu.":"Understand how BukaToko works and the choices available to you.",
    "Syarat & ketentuan":"Terms and conditions",
    "Diperbarui 9 November 2026":"Updated 9 November 2026",
    "Tentang layanan":"About the service",
    "Akun dan keamanan":"Accounts and security",
    "Barang dan konten":"Items and content",
    "Tawaran dan serah terima":"Offers and handover",
    "Komentar, permintaan, dan pesan":"Comments, requests, and messages",
    "Moderasi dan laporan":"Moderation and reports",
    "Ketersediaan dan perubahan":"Availability and changes",
    "Hubungi tim":"Contact the team",
    "BukaToko adalah proyek marketplace lokal oleh tim GDGoC ITB Stack Hackathon. Kamu dapat memasang barang milikmu, mencari barang, dan menulis permintaan dengan rentang harga. Halaman yang terhubung ke server menyimpan aktivitas ke akun; versi statis hanya menampilkan contoh dan tidak menerima perubahan.":"BukaToko is a local marketplace project by the GDGoC ITB Stack Hackathon team. You can list your items, browse, and post requests with a price range. Server-connected pages save activity to your account; the static version displays examples and does not accept changes.",
    "Gunakan informasi akun yang benar, jaga kata sandi, dan keluar dari perangkat bersama. Jangan memakai akun orang lain atau mencoba mengakses data dan fungsi yang bukan hakmu. Jangan gunakan layanan untuk menyimpan informasi rahasia.":"Use accurate account details, protect your password, and log out on shared devices. Do not use another person’s account or attempt to access data and functions you are not authorized to use. Do not store confidential information in the service.",
    "Pasang hanya barang yang boleh kamu jual dan foto yang berhak kamu gunakan. Jelaskan kondisi, harga, serta lokasi dengan jujur. Dilarang memasang barang ilegal, curian, palsu yang menyesatkan, konten penipuan, spam, ancaman, atau data pribadi orang lain tanpa hak. Jangan mengunggah identitas, alamat lengkap, dan informasi keuangan ke konten publik.":"List only items you are entitled to sell and photos you have permission to use. Describe condition, price, and location honestly. Illegal or stolen goods, misleading counterfeits, fraud, spam, threats, and unauthorized disclosure of other people’s personal data are prohibited. Do not upload identity documents, full addresses, or financial information to public content.",
    "Tawaran, penerimaan, konfirmasi serah terima, dan ulasan membantu mencatat kesepakatan. Pembayaran, pemeriksaan barang, pengiriman, serta penyelesaian masalah disepakati langsung oleh pembeli dan penjual. BukaToko tidak memproses pembayaran, menahan dana, atau menjamin kondisi barang. Pilih tempat umum untuk bertemu dan periksa barang sebelum membayar.":"Offers, acceptance, handover confirmation, and reviews help record an agreement. Payment, item inspection, shipping, and dispute resolution are agreed directly between buyer and seller. BukaToko does not process payments, hold funds, or guarantee item condition. Meet in a public place and inspect items before paying.",
    "Komentar, tanggapan permintaan, nama tampilan, serta ulasan dapat terlihat oleh pengguna lain. Gunakan dengan sopan dan sesuai konteks. Pesan serta tawaran hanya ditampilkan lewat akun pihak terkait; pengelola server memiliki akses teknis ke data yang disimpan dan layanan tidak menyediakan enkripsi ujung ke ujung.":"Comments, request responses, display names, and reviews can be visible to other users. Keep them respectful and relevant. Messages and offers are displayed through the accounts of the parties involved; server operators have technical access to stored data and the service does not provide end-to-end encryption.",
    "Gunakan tombol laporkan barang untuk melaporkan pelanggaran. Moderator dapat meninjau laporan, menurunkan barang, dan membekukan akun; tindakan dicatat oleh sistem. Portal bug digunakan untuk kendala teknis. Jangan mengirim kata sandi, cookie, atau data pribadi dalam laporan publik.":"Use the report-item button to report violations. Moderators can review reports, remove listings, and suspend accounts; the system records these actions. Use the bug portal for technical problems. Do not include passwords, cookies, or personal data in public reports.",
    "Proyek ini masih dikembangkan. Fitur atau data dapat berubah dan gangguan dapat terjadi. Jangan menjadikannya satu-satunya catatan kesepakatan penting. Pembaruan ketentuan ditampilkan pada halaman ini dengan tanggal terbaru. Ketentuan ini tidak menghapus hak pengguna menurut hukum yang berlaku.":"This project is under development. Features or data may change and interruptions may occur. Do not use it as the sole record of an important agreement. Updates to these terms appear on this page with a revised date. These terms do not remove rights provided by applicable law.",
    "Gunakan portal bantuan untuk membuat laporan umum kepada pengelola repositori BukaToko. Untuk urusan akun atau privasi, minta jalur komunikasi privat terlebih dahulu; jangan tulis rincian pribadi di GitHub Issues yang terbuka.":"Use the support portal to prepare a general report for the BukaToko repository maintainers. For account or privacy matters, first request a private communication channel; do not post personal details in public GitHub Issues.",
    "Hubungi melalui portal bantuan":"Contact us through the support portal",
    "Kebijakan privasi":"Privacy policy",
    "Siapa yang mengelola":"Who operates the service",
    "Data yang diproses":"Data we process",
    "Tujuan dan pilihanmu":"Purposes and your choices",
    "Data publik dan akses":"Public data and access",
    "Cookie dan penyimpanan perangkat":"Cookies and device storage",
    "Lokasi dan penyedia lain":"Location and other providers",
    "Penyimpanan dan keamanan":"Retention and security",
    "Hak dan permintaan terkait data":"Data rights and requests",
    "Laporan bug dan pembaruan":"Bug reports and updates",
    "BukaToko dikembangkan oleh tim GDGoC ITB Stack Hackathon pada repositori gdg-hackathon-bukatoko. Data pada layanan aktif dikelola oleh pengelola server tempat layanan tersebut berjalan. Halaman ini menjelaskan perilaku implementasi saat ini, bukan janji adanya fitur yang belum tersedia.":"BukaToko is developed by the GDGoC ITB Stack Hackathon team in the gdg-hackathon-bukatoko repository. Data on a live service is handled by the operators of the server running that service. This page describes the current implementation, rather than promising features that do not exist.",
    "Saat mendaftar, server menyimpan nama tampilan, email, hash kata sandi, status verifikasi, dan waktu pembuatan akun. Aktivitas dapat mencakup barang, foto, kota, permintaan, simpanan, pencarian tersimpan, suka, komentar, tanggapan, pesan, tawaran, serah terima, ulasan, notifikasi, dan laporan moderasi. Server juga memproses alamat IP untuk pembatasan permintaan; log akses dapat memuat IP, metode, dan alamat halaman yang diminta.":"When you register, the server stores your display name, email, password hash, verification status, and account creation time. Activity can include listings, photos, city, requests, saved items and searches, likes, comments, responses, messages, offers, handovers, reviews, notifications, and moderation reports. The server also processes IP addresses for rate limiting; access logs can contain IP addresses, methods, and requested page addresses.",
    "Data digunakan untuk menjalankan akun dan fitur yang kamu pilih, menampilkan katalog, menghubungkan pengguna, serta mencegah penyalahgunaan. Kamu dapat melihat katalog tanpa akun. Menulis konten dan menggunakan fitur akun memerlukan masuk. Izin lokasi bersifat opsional; kamu selalu dapat memilih kota secara manual.":"Data is used to operate your account and chosen features, display the catalog, connect users, and prevent abuse. You can browse without an account. Posting and account features require login. Location permission is optional; you can always select a city manually.",
    "Nama tampilan, foto profil, barang beserta foto dan kota, profil, permintaan, komentar, tanggapan, dan ulasan dapat diakses publik. Email, simpanan, pesan, serta tawaran tidak ditampilkan sebagai katalog publik. Moderator dapat melihat laporan dan menjalankan moderasi. Pengelola server memiliki akses teknis ke basis data, berkas unggahan, dan log. Jangan mengunggah data sensitif ke layanan ini.":"Display names, profile photos, listings with photos and city, profiles, requests, comments, responses, and reviews can be public. Email, saved items, messages, and offers are not displayed in the public catalog. Moderators can see reports and moderate content. Server operators have technical access to the database, uploaded files, and logs. Do not upload sensitive data to this service.",
    "Cookie bk_session menjaga sesi masuk hingga 30 hari dan tidak dapat dibaca JavaScript. Cookie bk_csrf membantu melindungi perubahan data. Keluar mengakhiri sesi dan membersihkan cookie tersebut. Browser menyimpan tema dan hingga delapan ID barang terakhir dilihat di localStorage. Kata kunci terakhir disimpan di sessionStorage. Bahasa mengikuti pengaturan browser. Hapus data situs lewat pengaturan browser untuk membersihkannya. Kode aplikasi tidak memasang pelacak iklan atau analitik pihak ketiga.":"The bk_session cookie maintains login for up to 30 days and cannot be read by JavaScript. The bk_csrf cookie helps protect data changes. Logging out ends the session and clears these cookies. The browser stores theme and up to eight recently viewed item IDs in localStorage. The last search is stored in sessionStorage. Language follows browser settings. Clear site data in your browser settings to remove it. The application code does not install third-party advertising trackers or analytics.",
    "Jika kamu menekan Gunakan lokasi saya dan memberi izin, browser menentukan koordinat untuk memilih kota terdekat di perangkat. Kode aplikasi tidak mengirim atau menyimpan koordinat tersebut ke API; hasil filter memakai nama kota. Kamu dapat mencabut izin lewat browser. Font dan foto referensi dibundel sebagai aset situs. Hosting memproses permintaan web; tautan GitHub dan layanan luar mengikuti kebijakan masing-masing setelah dibuka.":"If you press Use my location and grant permission, the browser determines coordinates to choose the nearest city on your device. The application code does not send or store those coordinates in its API; filters use the city name. You can revoke permission in your browser. Fonts and reference photos are bundled as site assets. Hosting processes web requests; GitHub and other external links follow their own policies once opened.",
    "Layanan aktif menyimpan data dalam basis data server dan berkas unggahan. Belum ada jadwal penghapusan otomatis untuk semua jenis data atau halaman hapus akun mandiri. Menghapus barang tidak berarti seluruh pesan, log, atau cadangan terkait ikut terhapus. Kata sandi di-hash, tetapi pesan tidak dienkripsi ujung ke ujung. Mode email demo dapat menulis kode verifikasi atau reset ke log server, dan pada konfigurasi tertentu menampilkannya di layar. Jangan gunakan kata sandi yang dipakai pada layanan penting lain.":"The live service stores data in a server database and uploaded files. There is no universal automatic deletion schedule or self-service account deletion page. Deleting an item does not mean all associated messages, logs, or backups are deleted. Passwords are hashed, but messages are not end-to-end encrypted. Demo email mode can write verification or reset codes to server logs and, in some configurations, display them on screen. Do not reuse a password from another important service.",
    "Kamu dapat menyunting atau menghapus konten milikmu pada fitur yang tersedia, menghapus simpanan, keluar, dan mencabut izin lokasi. Untuk permintaan akses, koreksi, atau penghapusan data yang tidak tersedia di layar, hubungi pengelola melalui portal bantuan dan minta jalur privat tanpa mengirim identitas di laporan publik. Tim perlu memverifikasi kepemilikan akun sebelum menangani permintaan; belum ada alur otomatis untuk permintaan tersebut.":"You can edit or delete your own content where supported, remove saved items, log out, and revoke location permission. For access, correction, or deletion requests not available in the interface, contact maintainers through the support portal and request a private channel without posting identity information publicly. The team needs to verify account ownership before handling a request; no automated process is available for these requests.",
    "Formulir bug membuat pratinjau lokal. Isinya baru dibawa ke GitHub saat kamu memilih Lanjut ke GitHub; laporan menjadi publik setelah kamu mengirimnya di sana. Tidak ada unggahan log, tangkapan layar, cookie, atau data akun secara otomatis. Kamu juga dapat mengunduh laporan teks. Tanggal pembaruan kebijakan ditampilkan di atas halaman ini.":"The bug form creates a local preview. Its contents are passed to GitHub only when you choose Continue to GitHub; a report becomes public after you submit it there. No logs, screenshots, cookies, or account data are uploaded automatically. You can also download a text report. The policy revision date appears at the top of this page.",
    "Jual barang milikmu dan temukan barang yang kamu cari dari orang di sekitarmu.":"Sell your items and find what you need from people nearby.",
    "Informasi BukaToko":"BukaToko information",
    "Ada kendala?":"Having trouble?",
    "Bantu kami memperbaiki BukaToko.":"Help us improve BukaToko.",
    "Laporkan bug":"Report a bug",
    "Isi halaman":"On this page",
    "Informasi layanan dan pilihan pengguna BukaToko.":"BukaToko service information and user choices.",
    "Lihat tanggapan":"View responses",
    "Lapor kendala teknis":"Report a technical problem",
    "Ceritakan apa yang terjadi. Laporan disiapkan di perangkatmu sebelum kamu memilih cara mengirimnya.":"Describe what happened. The report is prepared on your device before you choose how to send it.",
    "Judul masalah":"Issue title",
    "Contoh: filter harga tidak memperbarui hasil":"Example: price filter does not update results",
    "Halaman terkait":"Affected page",
    "Contoh: Jelajah, tanpa informasi akun":"Example: Browse, without account information",
    "Langkah untuk mengulang":"Steps to reproduce",
    "Apa yang kamu harapkan?":"What did you expect?",
    "Apa yang terjadi?":"What happened?",
    "Buat pratinjau laporan":"Preview report",
    "Pratinjau laporan":"Report preview",
    "Lanjut ke GitHub":"Continue to GitHub",
    "Unduh laporan teks":"Download text report",
    "Laporan belum dikirim. GitHub akan membuka formulir yang perlu kamu tinjau dan kirim sendiri.":"The report has not been sent. GitHub opens a form for you to review and submit yourself.",
    "Laporan ini bersifat publik":"This report is public",
    "Jangan sertakan kata sandi, cookie, token, pesan pribadi, email, atau alamat lengkap. Tidak ada data perangkat atau akun yang diambil otomatis.":"Do not include passwords, cookies, tokens, private messages, email, or full addresses. No device or account data is collected automatically.",
    "Masalah barang atau penjual?":"Problem with an item or seller?",
    "Gunakan tombol laporkan pada detail barang agar moderator menerima laporan yang tepat.":"Use the report button on the item detail page so moderators receive the right report.",
    "Urusan privasi atau keamanan?":"Privacy or security issue?",
    "Buat permintaan umum untuk jalur komunikasi privat. Jangan tulis data pribadi atau rincian celah keamanan di laporan publik.":"Make a general request for a private communication channel. Do not post personal data or vulnerability details in a public report.",
    "* wajib diisi":"* required",
    "Syarat & ketentuan · BukaToko":"Terms and conditions · BukaToko",
    "Kebijakan privasi · BukaToko":"Privacy policy · BukaToko",
    "Lapor kendala teknis · BukaToko":"Report a technical problem · BukaToko",
    "Ceritakan kendala teknis di BukaToko.":"Report a technical problem in BukaToko.",

    "Tinggalkan formulir yang belum disimpan?":"Leave this form without saving?",
    "Fitur ini belum tersedia di halaman ini.":"This feature is not available on this page yet.",
    "Komentar":"Comments", "Tanggapan":"Replies",
    "Belum ada permintaan di kota ini":"No requests in this city",
    "Pilih kota lain atau tampilkan semua lokasi.":"Choose another city or show all locations.",
    "Gunakan lokasi saya":"Use my location",
    "Lokasi permintaan":"Request location",
    "Izin lokasi dipakai untuk memilih kota terdekat. Koordinat tidak disimpan.":"Location permission selects the nearest supported city. Coordinates are not stored.",
    "Lokasi tidak tersedia. Pilih kota secara manual.":"Location is unavailable. Select a city manually.",
    "Mencari lokasi perangkat…":"Finding your device location…",
    "Belum ada kota yang didukung di dekatmu. Pilih kota secara manual.":"No supported city nearby. Select a city manually.",
    "Kota terdekat dipilih. Hasil berdasarkan kota, bukan jarak pasti.":"Nearest city selected. Results use city names, not exact distances.",
    "Izin lokasi ditolak. Pilih kota secara manual.":"Location permission denied. Select a city manually.",
    "Lokasi belum ditemukan. Coba lagi atau pilih kota.":"Location could not be found. Try again or select a city.",
    "Halaman tidak ditemukan · Bukatoko":"Page not found · Bukatoko",
    "Demo: alamat yang kamu buka tidak ada di server ini.":"Demo: this address does not exist on this server.",
    "Alamat ini tidak ada":"This page does not exist",
    "Barang bisa sudah dihapus penjual, atau tautannya salah ketik. Coba mulai dari daftar barang yang masih aktif.":"The seller may have removed the item, or the link may contain a typo. Start with the active listings.",
    "Ke beranda":"Go to home",
    "Demo: panel ini hanya terbuka untuk akun dengan peran moderator.":"Demo: this panel is available only to moderator accounts.",
    "Laporan terbuka dari pengguna. Menurunkan barang menyembunyikannya dari publik tanpa menghapus datanya. Membekukan akun juga mematikan semua sesi dan menurunkan barang aktifnya.":"Open reports from users. Removing a listing hides it without deleting its data. Suspending an account also revokes its sessions and hides its active listings.",
    "Situs demo: tindakan moderator tercatat di tabel reports.":"Demo site: moderation actions are recorded on the server.",
    "Notifikasi belum dibaca":"Unread notifications",
    "BukaToko - Jual apapun disini.":"BukaToko - Sell anything here.",
    "Kategori cepat":"Quick categories",
    "Jelajah":"Browse", "Lagi Dicari":"Wanted", "Jual":"Sell", "Akun":"Account", "Masuk":"Log in", "Keluar":"Log out",
    "Pasang barang":"Post an item", "Gelap":"Dark", "Terang":"Light", "Cari barang":"Search items", "Cari barang yang kamu butuhkan":"Search for what you need",
    "Semua lokasi":"All locations", "Pencarian utama":"Main search", "Terapkan":"Apply", "Paling baru":"Newest", "Termurah":"Lowest price", "Termahal":"Highest price",
    "Tidak ada yang cocok":"No matching items", "Coba lagi":"Try again", "Simpan barang":"Save item", "Tersimpan":"Saved", "Tanya penjual":"Ask seller",
    "Kirim tawaran":"Send offer", "Kirim":"Send", "Batal":"Cancel", "Memuat":"Loading", "Muat lagi":"Load more", "Bagikan":"Share", "Laporkan":"Report",
    "Blokir penjual":"Block seller", "Tulis ulasan":"Write a review", "Semua barang":"All items", "Semua kategori":"All categories", "Barang":"Items",
    "Beranda":"Home", "Kata kunci":"Keywords", "Kategori":"Category", "Lokasi":"Location", "Kondisi":"Condition", "Apa saja":"Any condition", "Semua":"All",
    "Mulus":"Excellent", "Pemakaian ringan":"Lightly used", "Berfungsi normal":"Working condition", "Kondisi baik":"Good condition", "Harga (Rp)":"Price (Rp)",
    "Urutkan":"Sort by", "Status":"Status", "Masih dijual":"For sale", "Sudah terjual":"Sold", "Filter dan urutan":"Filters and sorting", "Simpan pencarian ini":"Save this search",
    "Harga maksimum dalam rupiah":"Maximum price in rupiah", "misal: kamera, sepatu, kulkas":"e.g. camera, shoes, fridge", "maks":"max", "min":"min",
    "Elektronik":"Electronics", "Ponsel & Tablet":"Phones & tablets", "Ponsel & tablet":"Phones & tablets", "Fashion":"Fashion", "Rumah Tangga":"Home & living", "Rumah tangga":"Home & living",
    "Hobi & Koleksi":"Hobbies & collectibles", "Hobi & koleksi":"Hobbies & collectibles", "Buku":"Books", "Otomotif":"Vehicles & parts", "Olahraga":"Sports",
    "Temukan barang yang pas, dari warga sekitar.":"Find the right item from people nearby.",
    "Bandingkan harga, kondisi, dan lokasi. Jual barang milikmu atau buat permintaan sesuai anggaran.":"Compare prices, condition and location. Sell your own items or post a request within your budget.",
    "Jual barang":"Sell an item", "Buat permintaan":"Post a request", "Ada yang sedang mencari":"Someone is looking for these", "Lihat semua permintaan":"View all requests",
    "Cari sesuai kebutuhan":"Browse by category", "Langsung ke kategori pilihanmu.":"Go straight to the category you need.", "Harga turun":"Price drops", "Penjual menurunkan harga dari angka sebelumnya.":"Items with a lower asking price.",
    "Urutkan termurah":"Sort by lowest price", "Baru dipasang":"Recently listed", "Urut dari yang paling baru.":"The latest items first.", "Lihat semua":"View all", "Punya barang menganggur?":"Have something you no longer use?",
    "Foto yang jelas, harga yang sesuai, dan kondisi yang jujur membantu pembeli memilih barangmu.":"Clear photos, a fair price and an honest description help buyers choose your item.",
    "Mulai jual":"Start selling", "Atau cari barang orang lain":"Or post what you are looking for", "Kamera, sepatu 42, kulkas, buku resep":"Camera, size 42 shoes, fridge, cookbook",
    "Jelajah barang":"Browse items", "Papan permintaan":"Wanted board", "Cara kerja":"How it works", "Harga dan kondisi diisi penjual":"Sellers describe the price and condition",
    "Tawar menawar lewat percakapan":"Discuss offers in a conversation", "Bayar dan kirim disepakati dua pihak":"Agree on payment and delivery together",
    "Demo: barang, penjual, dan permintaan di sini data contoh. Foto stok hanya referensi; foto yang kamu unggah sendiri disimpan di server demo ini.":"Demo: items, sellers and requests are sample data. Stock photos are references only; your uploads are stored on this demo server.",
    "Foto referensi":"Reference photo", "Foto referensi stok; model dan kondisi bisa berbeda.":"Stock reference photo; the model and condition may differ.",
    "Demo terhubung ke server. Foto stok hanya referensi. Jangan gunakan kata sandi pribadi atau data sensitif.":"Server-connected demo. Stock photos are references only. Do not use personal passwords or sensitive data.",
    "Buka aplikasi langsung":"Open the app directly",
    "Origin permintaan tidak diizinkan.":"This request origin is not allowed.",
    "Origin atau preflight tidak diizinkan.":"This origin or preflight request is not allowed.",
    "Demo: permintaan bawaan adalah data contoh. Permintaan yang kamu tulis tersimpan di server demo ini.":"Demo: built-in requests are sample data. Your requests are saved on the demo server.",
    "Demo: detail barang dan foto tersimpan di server demo ini. Tidak ada transaksi uang di sini.":"Demo: item details and photos are stored on the demo server. No money is transferred here.",
    "Demo: akun, barang, tawaran, dan pesan tersimpan di basis data server demo ini. Jangan pakai kata sandi yang kamu pakai di tempat lain.":"Demo: accounts, items, offers and messages are stored on this demo server. Use a password you do not use elsewhere.",
    "Demo: detail barang tersimpan di peramban ini, fotonya diunggah ke server demo di mesin ini (folder uploads). Tidak ada layanan pihak ketiga.":"Demo: item details and uploaded photos use the local demo server. No third-party service is involved.",
    "Demo: profil dan ulasan berasal dari basis data server demo ini.":"Demo: profiles and reviews come from the demo server database.",
    "Demo: semua permintaan di halaman ini data contoh. Permintaan yang kamu tulis hanya tersimpan di peramban ini.":"Demo: built-in requests are sample data. Your requests are saved on the demo server.",
    "Situs demo: detail barang tersimpan di peramban ini, foto di server demo mesin ini. Tidak ada transaksi uang di sini.":"Demo site: item details and photos are stored on the local demo server. No money is transferred here.",
    "Situs demo: data di SQLite, foto di folder uploads mesin ini. Tidak ada transaksi uang di sini.":"Demo site: data and photos are stored on this machine. No money is transferred here.",
    "Situs demo: data di SQLite, foto di folder uploads mesin ini.":"Demo site: data and photos are stored on this machine.",
    "Pratinjau GitHub Pages: hanya lihat. Semua barang, penjual dan permintaan adalah data contoh; foto stok hanya referensi. Masuk, jual, pesan dan tawaran memerlukan server Python lokal.":"GitHub Pages preview: read only. Items, sellers and requests are samples; stock photos are references only. Sign-in, selling, messages and offers require the local Python server.",
    "Pratinjau ini hanya untuk melihat data contoh. Jalankan server Python lokal untuk masuk, menjual, menyimpan, mengirim pesan atau menawar. Tidak ada data yang dikirim atau disimpan di sini.":"This preview only displays sample data. Run the local Python server to sign in, sell, save, send messages or make offers. No data is sent or saved here.",
    "Kelola barang, permintaan, dan percakapanmu di satu tempat.":"Manage your items, requests and conversations in one place.", "Ringkasan akun":"Account overview", "Masuk sebagai":"Signed in as",
    "Masuk dulu untuk melihat barang tersimpan, barang yang kamu pasang, tawaran, pesan, dan pencarian tersimpan.":"Sign in to see saved items, your listings, offers, messages and saved searches.",
    "Masuk atau daftar":"Log in or sign up", "Disimpan":"Saved", "Barang saya":"My listings", "Permintaan saya":"My requests", "Tawaran":"Offers", "Pesan":"Messages", "Pencarian":"Searches",
    "disimpan":"saved", "barang saya":"my listings", "permintaan":"requests", "tawaran masuk":"incoming offers", "pesan belum dibaca":"unread messages", "barang baru":"new items",
    "Menandai barang terjual mematikan tawaran baru. Menerima tawaran juga menandai barang terjual dan membuka kesempatan menulis ulasan bagi dua pihak.":"Marking an item sold stops new offers. Accepting an offer also marks it sold and lets both parties leave a review.",
    "Tulis barang yang kamu butuhkan dan rentang anggarannya. Punya barang yang cocok? Temukan permintaan warga di sini.":"Post what you need and your budget range. Have a matching item? Browse requests from people nearby.",
    "Permintaan terbaru":"Latest requests", "Tulis permintaan":"Post a request", "Semakin spesifik, semakin mudah penjual menemukanmu.":"Specific details help sellers find your request.",
    "Barang yang dicari":"Wanted item", "Rentang harga (Rp)":"Budget range (Rp)", "Catatan":"Notes", "Pasang permintaan":"Post request", "* Wajib diisi.":"* Required fields.",
    "misal: Laptop bekas buat kuliah arsitektur":"e.g. used laptop for architecture studies", "Syarat yang penting: ukuran, kelengkapan, boleh minus di bagian mana.":"Important requirements: size, included accessories and acceptable defects.",
    "Judul":"Title", "Deskripsi":"Description", "Pilih kategori":"Select a category", "Pilih lokasi":"Select a location", "1. Foto barang":"1. Item photos", "2. Detail barang":"2. Item details",
    "Mulai dari foto, karena itu yang pertama dilihat pembeli. Setelah detail terisi, barang langsung muncul di halaman Jelajah.":"Start with photos: buyers see them first. Once you complete the details, your item appears in Browse.",
    "Tarik foto ke sini, atau pilih dari perangkat. Maksimal 10 foto, format gambar.":"Drop images here or choose them from your device. Up to 10 photos.", "Pilih foto":"Choose photos", "Terbitkan barang":"Publish item",
    "misal: Kamera mirrorless Fujifilm X-T20 body saja":"e.g. Fujifilm X-T20 mirrorless camera body", "misal: 850000":"e.g. 850000",
    "Tulis kondisi apa adanya: minus, kelengkapan, alasan jual, dan cara ambil.":"Describe the actual condition, defects, accessories, reason for selling and collection options.",
    "Sebutkan minus barang kalau ada. Pembeli lebih percaya pada keterangan jujur.":"Mention any defects. An honest description helps buyers decide.",
    "Terbit butuh nama tampilan. Kalau belum masuk, akan muncul kotak masuk dulu.":"A display name is required to publish. You will be asked to log in first.",
    "Bekas, mulus":"Used, excellent", "Bekas, pemakaian ringan":"Used, lightly worn", "Bekas, berfungsi normal":"Used, fully working", "Bekas, ada minus":"Used, with defects",
    "Bekas, ada bekas pakai":"Used, visible wear", "Bekas, minus kecil":"Used, minor defects", "Bekas, kondisi baik":"Used, good condition", "Bekas, bunyi bagus":"Used, good sound", "Bekas, terawat":"Used, well maintained", "Bekas, normal":"Used, working", "Bekas, kokoh":"Used, sturdy",
    "Memuat barang":"Loading item", "Lokasi barang":"Item location", "Waktu pasang":"Listed", "Cara ambil":"Collection options", "Rincian barang":"Item details",
    "COD di tempat umum atau kirim paket, disepakati dengan penjual":"Meet in a public place or arrange delivery with the seller", "Bagikan tautan":"Share link", "Laporkan barang":"Report item",
    "Ajukan harga":"Make an offer", "Tawaran tidak boleh di atas harga pasang. Penjual bebas menerima atau menolak.":"Offers cannot exceed the asking price. The seller may accept or decline.",
    "Pembayaran dan pengiriman disepakati langsung antara pembeli dan penjual. Bukatoko tidak menahan uang.":"Buyer and seller arrange payment and delivery directly. Bukatoko does not hold funds.",
    "Barang sejenis":"Similar items", "Ulasan penjual":"Seller reviews", "Ulasan":"Reviews", "Belum ada ulasan":"No reviews yet", "Belum ada ulasan.":"No reviews yet.",
    "Hanya untuk pihak yang tawarannya sudah diterima, satu kali per barang.":"Available once per item to parties with an accepted offer.",
    "Bergabung":"Joined", "Penjual dan tawaran":"Seller and offers", "Aksi cepat barang ini":"Quick item actions", "Tanya":"Ask", "Perbesar foto barang":"Enlarge item photo", "Foto sebelumnya":"Previous photo", "Foto berikutnya":"Next photo",
    "Isi akun":"Account sections", "Navigasi utama":"Main navigation", "Remah roti":"Breadcrumb", "Lewati ke konten":"Skip to content", "BukaToko, beranda":"BukaToko, home", "← Kembali ke hasil":"← Back to results",
    "Ganti ke bahasa Inggris":"Switch to English", "Ganti ke tema gelap":"Switch to dark theme", "Ganti ke tema terang":"Switch to light theme",
    "Nama tampilan":"Display name", "Email atau nama":"Email or username", "Kata sandi":"Password", "Daftar":"Sign up", "Masuk ke Bukatoko":"Log in to Bukatoko", "Daftar akun Bukatoko":"Create a Bukatoko account",
    "Belum punya akun? Daftar":"New here? Sign up", "Sudah punya akun? Masuk":"Already registered? Log in", "misal: rangga.putra":"e.g. rangga.putra",
    "Masuk untuk menawar, menyimpan, dan memasang barang.":"Log in to make offers, save items and post listings.", "Daftar dengan email dan kata sandi. Data lain tidak diminta.":"Sign up with an email and password. No other personal details are required.",
    "Kamu keluar.":"You have logged out.", "Gagal memuat":"Unable to load", "Gagal memuat barang":"Unable to load items", "Barang tidak ditemukan":"Item not found", "Tautan kedaluwarsa atau barang sudah dihapus penjual.":"This link has expired or the seller has removed the item.",
    "Lihat barang lain":"Browse other items", "Belum ada barang":"No items yet", "Belum ada barang yang disimpan.":"No saved items yet.", "Belum ada barang yang kamu pasang.":"You have not listed any items yet.",
    "Belum ada pencarian tersimpan.":"No saved searches yet.", "Belum ada percakapan.":"No conversations yet.", "Belum ada permintaan":"No requests yet", "Belum ada permintaan yang kamu tulis.":"You have not posted any requests yet.",
    "Belum ada pesan.":"No messages yet.", "Belum ada pesan. Mulai dengan menyebut ketersediaan dan cara ambil.":"No messages yet. Start by asking about availability and collection.", "Belum ada tawaran.":"No offers yet.", "Belum ada yang menawar barang ini.":"This item has no offers yet.",
    "Hapus":"Delete", "Hapus semua":"Clear all", "Hapus semua filter":"Clear all filters", "Hapus barang":"Delete item", "Hapus barang ini?":"Delete this item?", "Hapus barang ini? Foto dan tawarannya ikut hilang.":"Delete this item, its photos and offers?",
    "Tandai terjual":"Mark as sold", "Barang ditandai terjual.":"Item marked as sold.", "Barang dihapus.":"Item deleted.", "Barang ini sudah terjual. Tawaran dinonaktifkan.":"This item is sold. Offers are disabled.", "Ini barang kamu sendiri.":"This is your own item.",
    "Terima":"Accept", "Tolak":"Decline", "Diterima. Barang jadi terjual.":"Accepted. The item is now sold.", "Tawaran diterima. Barang ditandai terjual.":"Offer accepted. Item marked as sold.", "Tawaran ditolak.":"Offer declined.",
    "Disimpan ke Akun.":"Saved to your account.", "Dihapus dari simpanan.":"Removed from saved items.", "Pencarian disimpan. Lihat di Akun, tab Pencarian.":"Search saved. Find it under Account, Searches.",
    "Lihat barang sejenis":"Browse similar items", "Tulis balasan":"Write a reply", "Buka pesan pembeli":"Open buyer messages", "Kirim ulasan":"Send review", "Ulasan terkirim. Terima kasih.":"Review sent. Thank you.",
    "Alasan":"Reason", "Keterangan":"Details", "Keterangan tambahan (opsional)":"Additional details (optional)", "Kirim laporan":"Send report", "Barang palsu":"Counterfeit item", "Barang terlarang":"Prohibited item", "Lainnya":"Other", "Penipuan":"Fraud", "Spam":"Spam", "Laporan terkirim. Terima kasih.":"Report sent. Thank you.",
    "Percakapan khusus barang ini. Penjual menerima di tab Pesan.":"This conversation is about this item. The seller receives it under Messages.", "Ceritakan pengalaman transaksi":"Describe your experience", "Masuk (penjual)":"Incoming (seller)", "Keluar (pembeli)":"Outgoing (buyer)",
    "Penjual belum menulis deskripsi.":"The seller has not added a description.", "Penjual ini belum memasang barang.":"This seller has no listings yet.", "Buka profil dari halaman barang.":"Open a seller profile from an item page.", "Nama pengguna kosong":"No username provided",
    "Coba kata kunci yang lebih umum, longgarkan rentang harga, atau lihat kategori lain.":"Try a broader keyword, widen the price range or browse another category.", "Jadilah yang pertama menulis barang yang kamu cari.":"Be the first to post what you are looking for.",
    "Judul minimal 5 karakter.":"Use at least 5 characters for the title.", "Harga harus lebih dari nol.":"Price must be greater than zero.", "Pilih kategori dulu.":"Select a category first.", "Pilih kategori.":"Select a category.", "Pilih lokasi.":"Select a location.", "Lokasi belum dipilih.":"Select a location first.",
    "Isi angka tawaran lebih dari nol.":"Enter an offer greater than zero.", "Isi rentang harga minimum dan maksimum.":"Enter both minimum and maximum prices.", "Harga minimum tidak boleh lebih besar dari maksimum.":"The minimum price cannot exceed the maximum.", "Rentang harga terbalik":"Price range reversed",
    "Tulis barang yang kamu cari, minimal 5 karakter.":"Describe the item you need using at least 5 characters.", "Permintaan terpasang.":"Request posted.", "Tersimpan. Membuka barang...":"Saved. Opening the item...", "Server tidak bisa dihubungi.":"Cannot connect to the server.", "Sesi tidak terbentuk. Coba masuk lagi.":"The session could not be created. Try logging in again.",
    "Harga min":"Minimum price", "Harga maks":"Maximum price", "Cari":"Search", "baru saja":"just now", "terjual":"sold", "proposed":"pending", "accepted":"accepted", "declined":"declined",
    "masuk dulu":"log in first", "kesalahan server":"server error", "barang tidak ditemukan":"item not found", "pengguna tidak ditemukan":"user not found", "kata sandi salah":"incorrect password", "email atau nama sudah dipakai":"email or username is already in use",
    "Akun · Bukatoko":"Account · Bukatoko", "Jelajah barang · Bukatoko":"Browse items · Bukatoko", "Pasang barang · Bukatoko":"Post an item · Bukatoko", "Profil penjual · Bukatoko":"Seller profile · Bukatoko", "Detail barang · Bukatoko":"Item details · Bukatoko",
    "Lagi Dicari: papan permintaan barang · Bukatoko":"Wanted: item requests · Bukatoko", "Bukatoko: jual barang sendiri, cari yang kamu butuhkan":"Bukatoko: sell your items, find what you need",
    "Barang yang disimpan, barang yang dipasang, permintaan, tawaran, pesan, dan pencarian tersimpan.":"Saved items, listings, requests, offers, messages and saved searches.",
    "Barang, ulasan, dan status penjual di Bukatoko.":"Items, reviews and seller information on Bukatoko.", "Deskripsi barang.":"Item description.", "Foto contoh barang":"Sample item illustration", "penjual":"seller",
    "Detail barang, kondisi, lokasi, dan penjual di Bukatoko.":"Item details, condition, location and seller on Bukatoko.",
    "Pasang barang yang mau kamu jual: pilih foto dulu, lalu isi detail dan harga.":"List an item for sale: choose photos, then add details and a price.",
    "Pasar barang bekas warga sekitar. Pasang barang yang mau dijual, atau tulis barang yang sedang kamu cari beserta rentang harganya.":"A local secondhand marketplace. Sell your items or post what you need with a budget range.",
    "Saring barang bekas berdasarkan kata kunci, kategori, lokasi, kondisi, dan rentang harga.":"Filter secondhand items by keyword, category, location, condition and price range.",
    "Warga menulis barang yang mereka cari beserta rentang harga yang sanggup dibayar. Penjual bisa langsung menawarkan.":"People post wanted items with a budget range so sellers can respond.",
    "Nama 3-24 karakter: huruf, angka, titik, garis bawah, atau strip.":"Use 3-24 characters: letters, numbers, dots, underscores or hyphens.", "Alamat email tidak valid.":"Invalid email address.", "Kata sandi minimal 8 karakter.":"Password must contain at least 8 characters.", "Nama atau email sudah dipakai.":"That username or email is already in use.", "Email atau kata sandi salah.":"Incorrect email or password.",
    "Judul 5-90 karakter.":"Title must contain 5-90 characters.", "Harga harus angka lebih dari nol.":"Price must be a number greater than zero.", "Kategori dan lokasi wajib diisi.":"Category and location are required.", "Daftar foto tidak valid.":"Invalid photo list.", "Bintang 1 sampai 5.":"Choose between 1 and 5 stars.",
    "Barang sudah terjual.":"This item is already sold.", "Jumlah tawaran harus angka lebih dari nol.":"Offer amount must be a number greater than zero.", "Tawaran di atas harga pasang tidak perlu. Turunkan angkanya.":"The offer exceeds the asking price. Enter a lower amount.", "Kamu sudah punya tawaran yang menunggu jawaban.":"You already have a pending offer for this item.",
    "Data contoh gagal dimuat. Muat ulang halaman.":"Could not load sample data. Reload the page.", "Barang tidak ditemukan.":"Item not found.", "Pengguna tidak ditemukan.":"User not found.", "Diblokir.":"Blocked.", "pembeli":"buyer",
    "Minimal 8 karakter. Ini demo: jangan pakai kata sandi yang kamu pakai di tempat lain.":"At least 8 characters. This is a demo: do not reuse a password from another service.", "Menunggu jawaban":"Awaiting a response", "Menyimpan barang...":"Saving item...", "Foto contoh":"Sample illustration", "Mengunggah...":"Uploading...", "Memproses...":"Processing...", "Bintang":"Rating", "Tarik":"Withdraw", "Buka":"Open",
    "Content-Length tidak valid":"Invalid request length", "Kamu sudah melaporkan barang ini.":"You have already reported this item.", "Maksimal 5 pencarian tersimpan. Hapus satu dulu.":"You can save up to 5 searches. Delete one first.", "Parameter pencarian tidak valid.":"Invalid search parameters.", "Pengguna tidak valid.":"Invalid user.", "Pesan kosong.":"Enter a message.", "Pesan maksimal 1000 karakter.":"Messages can contain up to 1000 characters.", "Pilih alasan laporan.":"Select a report reason.", "Tawaran ini sudah tidak aktif.":"This offer is no longer active.", "Tentukan lawan bicara.":"Select a conversation participant.", "Tidak bisa menawar barang sendiri.":"You cannot make an offer on your own item.", "Tulis barang yang dicari, minimal 5 karakter.":"Describe the wanted item using at least 5 characters.", "Ulasan hanya untuk pihak dengan tawaran yang sudah diterima, sekali per barang.":"Reviews are available once per item to parties with an accepted offer.",
    "ada berkas kosong":"an uploaded file is empty", "bentuk multipart tidak terbaca":"could not read the uploaded file data", "bukan pihak dalam tawaran ini":"you are not a participant in this offer", "endpoint tidak dikenal":"unknown endpoint", "hanya pemilik barang yang bisa menandai terjual":"only the owner can mark this item sold", "hanya pemilik permintaan yang bisa menghapus":"only the request owner can delete it", "hanya pemilik yang bisa menghapus":"only the owner can delete this item", "hanya penjual yang bisa menerima tawaran":"only the seller can accept an offer", "kirim sebagai multipart/form-data":"send the upload as multipart/form-data", "permintaan tidak ditemukan":"request not found", "tawaran tidak ditemukan":"offer not found", "satu foto melebihi 6 MB. Kompres dulu.":"a photo exceeds 6 MB; compress it first", "terlalu banyak unggahan dari perangkat ini, coba lagi nanti":"too many uploads from this device; try again later", "tidak ada berkas pada permintaan":"no files were included", "ukuran permintaan tidak wajar":"request size exceeds the allowed limit", "server tidak mengembalikan berkas":"the server did not return a file", "unggahan ditolak server":"the server rejected the upload",
    "Email ini belum diverifikasi.":"This email is not verified yet.", "Kirim ulang":"Resend", "Verifikasi":"Verify",
    "Notifikasi":"Notifications", "Transaksi":"Transactions", "Kode verifikasi":"Verification code",
    "Panel moderator":"Moderator panel", "Kelola barang ini":"Manage this item", "Sunting barang":"Edit item",
    "Tandai terjual":"Mark as sold", "Hapus barang":"Delete item", "Perpanjang 30 hari":"Extend 30 days",
    "Terakhir kamu lihat":"Recently viewed", "Tersimpan di peramban ini saja, bukan di server.":"Stored in this browser only, not on the server.",
    "Foto":"Photos", "Hanya yang ada foto":"With photos only", "Terbaru":"Newest", "Bintang tertinggi":"Highest rating",
    "Bintang terendah":"Lowest rating", "Ulasan":"Reviews", "Sebaran ulasan":"Rating breakdown",
    "Suka":"Like", "komentar":"comments", "tanggapan":"replies", "Saya punya barangnya":"I have this item",
    "Tulis komentar":"Write a comment", "Belum ada komentar.":"No comments yet.", "Tandai semua dibaca":"Mark all as read",
    "Belum ada notifikasi.":"No notifications yet.", "Belum ada transaksi. Transaksi muncul setelah penjual menerima tawaran.":"No transactions yet. They appear after a seller accepts an offer.",
    "Tandai serah terima":"Mark as handed over", "Tanggapi permintaan":"Reply to request", "Tanggapan permintaan":"Request reply",
    "Komentar baru":"New comment", "Permintaan saya":"My requests", "Pesan":"Messages", "Disimpan":"Saved", "Tawaran":"Offers", "Pencarian":"Searches",
    "hanya moderator":"moderators only", "target tidak dikenal":"unknown target", "postingan tidak ditemukan":"post not found",
    "Akun ini sedang dibekukan oleh moderator.":"This account is suspended by a moderator.",
    "Kode verifikasi tidak cocok.":"That verification code does not match.",
    "Kode reset salah atau sudah dipakai.":"That reset code is wrong or already used.",
    "Kode reset kedaluwarsa. Minta kode baru.":"That reset code has expired. Request a new one.",
    "Tulis komentar dulu.":"Write a comment first.", "Komentar maksimal 600 karakter.":"Comments can contain up to 600 characters.",
    "Tidak perlu menanggapi permintaan sendiri.":"You do not need to answer your own request.",
    "Barang itu bukan milikmu.":"That item is not yours.",
    "Tulis pesan atau pilih barang yang kamu punya.":"Write a message or pick one of your own items.",
    "hanya pemilik yang bisa memperpanjang":"only the owner can extend this item",
    "Barang ini sudah diturunkan moderator dan tidak bisa diperpanjang.":"A moderator removed this item; it cannot be extended.",
    "hanya penulis permintaan yang bisa menutupnya":"only the request author can close it",
    "bukan pihak dalam transaksi ini":"you are not a party to this transaction",
    "Serah terima hanya untuk tawaran yang sudah diterima.":"Handover applies only to accepted offers.",
    "Tulis balasan dulu.":"Write a reply first.", "ulasan tidak ditemukan":"review not found",
    "hanya yang diulas yang bisa membalas":"only the reviewed seller can reply",
    "Ulasan ini sudah kamu balas sekali.":"You already replied to this review once.",
    "Aksi tidak dikenal.":"Unknown action.", "laporan tidak ditemukan":"report not found",
    "Laporan ini sudah ditindak.":"This report was already handled.",
    "hanya pemilik barang yang bisa mengubah":"only the owner can edit this item",
    "Lokasi wajib diisi.":"Location is required.", "Kategori wajib diisi.":"Category is required.",
    "Tidak ada perubahan.":"No changes.",
    "Token keamanan tidak cocok. Muat ulang halaman lalu coba lagi.":"Security token mismatch. Reload the page and try again.",
    "berkas ini tidak terbaca sebagai gambar utuh.":"this file could not be read as a complete image.",


  };
  var reverse = Object.create(null);
  Object.keys(phrases).forEach(function (key) { if (!(phrases[key] in reverse)) reverse[phrases[key]] = key; });
  var patterns = [
    [/^Suka (\d+)$/, function (_,n) { return "Like " + n; }],
    [/^(\d+) komentar$/, function (_,n) { return n + " comments"; }],
    [/^(\d+) tanggapan$/, function (_,n) { return n + " replies"; }],
    [/^Foto referensi: (.+)$/, function (_,title) { return "Reference photo: " + title; }],
    [/^· (.+)$/, function (_,value) { return "· " + text(value,"en"); }],
    [/^(.+) dari (\d+) ulasan$/, function (_,score,n) { return score + " from " + n + " reviews"; }],
    [/^(Cari|Kategori|Lokasi|Kondisi|Harga min|Harga maks|Status): (.+)$/, function (_,label,value) { return text(label,"en") + ": " + text(value,"en"); }],
    [/^Permintaan gagal \((\d+)\)$/, function (_,code) { return "Request failed (" + code + ")"; }],
    [/^dengan (.+)$/, function (_,name) { return "with " + name; }],
    [/^masuk dulu (.+)$/, function (_,action) { return "Log in first " + ({"sebelum mengunggah foto":"to upload photos","untuk melapor":"to report an item","untuk memasang barang":"to post an item","untuk mengajukan tawaran":"to make an offer","untuk mengirim pesan":"to send messages","untuk menulis permintaan":"to post a request","untuk menyimpan":"to save items","untuk menyimpan pencarian":"to save a search"}[action] || ""); }],
    [/^Blokir (.+)\? Barang mereka tidak akan muncul lagi untukmu\.$/, function (_,name) { return "Block " + name + "? Their items will no longer appear for you."; }],
    [/^Harga minimum (.+) lebih besar dari maksimum (.+)\. Tukar angkanya lalu terapkan lagi\.$/, function (_,a,b) { return "Minimum price " + a + " exceeds maximum " + b + ". Swap the values and apply again."; }],
    [/^(.+) Foto pilihanmu masih ada, coba lagi\.$/, function (_,error) { return text(error,"en") + " Your selected photos are still here. Try again."; }],
    [/^Gagal: (.+)$/, function (_,error) { return "Failed: " + text(error,"en"); }],
    [/^(\d+) barang baru sejak disimpan · total (\d+)$/, function (_,a,b) { return a + " new items since saving · " + b + " total"; }],
    [/^(\d+) belum dibaca$/, function (_,n) { return n + " unread"; }],
    [/^(.+) diblokir\.$/, function (_,name) { return name + " blocked."; }],
    [/^Foto (.+): (.+)$/, function (_,name,error) { return "Photo " + name + ": " + text(error,"en"); }],
    [/^(.+) sampai (.+)$/, function (_,a,b) { return a + " to " + b; }],
    [/^Foto contoh untuk (.+)$/, function (_,title) { return "Sample illustration for " + title; }],
    [/^Foto barang: (.+)$/, function (_,title) { return "Item photo: " + title; }],
    [/^Foto referensi: (.+)$/, function (_,title) { return "Reference photo: " + title; }],
    [/^Foto contoh (\d+) untuk (.+)$/, function (_,n,title) { return "Sample image " + n + " for " + title; }],
    [/^(.+) · (\d+) (menit|jam|hari|bulan) lalu$/, function (_,name,n,unit) { return name + " · " + text(n + " " + unit + " lalu","en"); }],
    [/^(.+) · baru saja$/, function (_,name) { return name + " · just now"; }],
    [/^(\d+) barang( di .+)?$/, function (_,n,city) { return n + " items" + (city ? city.replace(/^ di /," in ") : ""); }],
    [/^(\d+) dari 10 foto$/, function (_,n) { return n + " of 10 photos"; }],
    [/^(\d+) (menit|jam|hari|bulan) lalu$/, function (_,n,unit) { return n + " " + ({menit:"minutes",jam:"hours",hari:"days",bulan:"months"}[unit]) + " ago"; }],
    [/^Bergabung (.+)$/, function (_,date) { return "Joined " + date; }],
    [/^Dipasang (.+)$/, function (_,date) { return "Listed " + text(date, "en"); }],
    [/^Hasil untuk "(.*)"$/, function (_,query) { return 'Results for "' + query + '"'; }],
    [/^Pratinjau memuat (\d+) barang contoh dan (\d+) permintaan contoh\.$/, function (_,a,b) { return "Preview: " + a + " sample items and " + b + " sample requests."; }],
    [/^Server mencatat (\d+) barang aktif dan (\d+) permintaan\. Angka ini dari basis data, bukan klaim pemasaran\.$/, function (_,a,b) { return "The database contains " + a + " active items and " + b + " requests."; }],
    [/^(Lihat foto|Hapus foto|Foto contoh|Foto) (\d+)$/, function (_,kind,n) { return ({"Lihat foto":"View photo","Hapus foto":"Remove photo","Foto contoh":"Sample image",Foto:"Photo"}[kind]) + " " + n; }],
    [/^(Tanya|Tulis pesan untuk|Keluar dari akun|Blokir|Lihat) (.+)$/, function (_,prefix,value) { return ({Tanya:"Ask","Tulis pesan untuk":"Message","Keluar dari akun":"Log out of",Blokir:"Block",Lihat:"View"}[prefix]) + " " + value; }],
    [/^Tawaran masuk \((\d+)\)$/, function (_,n) { return "Incoming offers (" + n + ")"; }],
    [/^(\d+) bintang$/, function (_,n) { return n + " stars"; }],
    [/^(\d+) tawaran menunggu$/, function (_,n) { return n + " pending offers"; }],
    [/^Hapus filter (.+)$/, function (_,label) { return "Remove " + text(label,"en") + " filter"; }],
    [/^Tautan disalin: (.+)$/, function (_,url) { return "Link copied: " + url; }],
    [/^Akun dibuat\. Selamat datang, (.+)$/, function (_,name) { return "Account created. Welcome, " + name; }],
    [/^Tawaran (.+) terkirim\. Tunggu jawaban penjual\.$/, function (_,amount) { return "Offer of " + amount + " sent. Wait for the seller's response."; }]
  ];
  function text(value, locale) {
    var lang = locale || language;
    if (lang !== "en") return reverse[value] || value;
    if (phrases[value]) return phrases[value];
    for (var i=0;i<patterns.length;i++) if (patterns[i][0].test(value)) return value.replace(patterns[i][0],patterns[i][1]);
    if (value.indexOf(" · ") !== -1) return value.split(" · ").map(function (part) { return text(part,"en"); }).join(" · ");
    return value;
  }
  var records = new WeakMap();
  function canonical(value) {
    if (reverse[value]) return reverse[value];
    return value.replace(/^(\d+) items( in (.+))?$/,function (_,n,rest,city) { return n + " barang" + (city ? " di " + city : ""); });
  }
  function localized(owner, key, value, write) {
    var entries = records.get(owner) || {};
    var entry = entries[key];
    if (!entry || entry.last !== value) entry = {source: canonical(value)};
    var trimmed = entry.source.trim();
    var translated = text(trimmed);
    var next = entry.source.replace(trimmed,translated);
    entry.last = next; entries[key] = entry; records.set(owner,entries);
    if (value !== next) write(next);
  }
  var protectedContent = 'script,style,code,textarea,.card-title,#p-nama,#akun-nama,#akun-email,.wanted-note,.wanted-item h3,.wanted-mini strong,.chat-bubble,.review p,.comment p,.comment-head strong,.row-body h3,[data-user-content],[data-react-owned]';
  var observer;
  function render() {
    if (!document.body) return;
    if (observer) observer.disconnect();
    document.documentElement.lang = language;
    var walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest(protectedContent) || !node.nodeValue.trim()) continue;
      if (node.parentElement.tagName === 'OPTION' && !node.parentElement.hasAttribute('value')) node.parentElement.setAttribute('value',node.nodeValue);
      (function (current) { localized(current,'text',current.nodeValue,function (value) { current.nodeValue=value; }); })(node);
    }
    document.querySelectorAll('[placeholder],[aria-label],[alt],[title],meta[name="description"]').forEach(function (element) {
      if (element.closest('[data-user-content],[data-react-owned]')) return;
      ['placeholder','aria-label','alt','title','content'].forEach(function (key) {
        if (element.hasAttribute(key)) localized(element,key,element.getAttribute(key),function (value) { element.setAttribute(key,value); });
      });
    });
    if (observer) observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','alt']});
  }
  window.BukatokoLocale = {text:text, getLanguage:function () { return language; }, setLanguage:function (next) {
    language=next==='en'?'en':'id'; render();
    if (typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('bukatoko:language'));
  }, phrases:phrases};
  document.addEventListener('DOMContentLoaded',function () {
    if (!observer) observer=new MutationObserver(render);
    render();
  });
  if (document.readyState === 'loading' && typeof MutationObserver === 'function') {
    observer=new MutationObserver(function (mutations) {
      if (mutations.some(function (mutation) {
        return !mutation.target.closest || !mutation.target.closest('[data-react-owned]');
      })) render();
    });
    observer.observe(document.documentElement,{subtree:true,childList:true});
  }
}());
