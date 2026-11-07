/* Bukatoko app 2.0: bicara ke API di server.py, bukan localStorage. */
(function () {
  "use strict";

  var S = {
    me: null,
    lang: localStorage.getItem("bk_lang") || "id",
    lastQuery: sessionStorage.getItem("bk_last_query") || "",
    home: { listings: [], wanted: [] }
  };

  /* ---------- util ---------- */
  function rp(n) {
    return "Rp " + Number(n || 0).toLocaleString("id-ID");
  }

  function timeAgo(iso) {
    var t = new Date(iso).getTime();
    if (!t) return "";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return m + " menit lalu";
    var h = Math.round(m / 60);
    if (h < 24) return h + " jam lalu";
    var d = Math.round(h / 24);
    if (d < 30) return d + " hari lalu";
    return Math.round(d / 30) + " bulan lalu";
  }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (k) { if (k) node.appendChild(k); });
    return node;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- i18n ringkas ---------- */
  var T = {
    id: {
      explore: "Jelajah", wanted: "Lagi Dicari", sell: "Jual", account: "Akun",
      login: "Masuk", logout: "Keluar", sellCta: "Pasang barang", dark: "Gelap", light: "Terang",
      search: "Cari barang", allCities: "Semua lokasi", apply: "Terapkan",
      newest: "Paling baru", cheapest: "Termurah", priciest: "Termahal",
      results: "barang", empty: "Tidak ada yang cocok", retry: "Coba lagi",
      save: "Simpan barang", saved: "Tersimpan", ask: "Tanya penjual", offer: "Kirim tawaran",
      send: "Kirim", cancel: "Batal", loading: "Memuat", more: "Muat lagi", share: "Bagikan",
      report: "Laporkan", block: "Blokir penjual", review: "Tulis ulasan"
    },
    en: {
      explore: "Browse", wanted: "Wanted", sell: "Sell", account: "Account",
      login: "Log in", logout: "Log out", sellCta: "Post an item", dark: "Dark", light: "Light",
      search: "Search items", allCities: "All locations", apply: "Apply",
      newest: "Newest", cheapest: "Cheapest", priciest: "Most expensive",
      results: "items", empty: "Nothing matches", retry: "Try again",
      save: "Save item", saved: "Saved", ask: "Ask seller", offer: "Send offer",
      send: "Send", cancel: "Cancel", loading: "Loading", more: "Load more", share: "Share",
      report: "Report", block: "Block seller", review: "Write a review"
    }
  };

  function t(key) { return (T[S.lang] && T[S.lang][key]) || (T.id[key] || key); }

  function applyLang() {
    document.documentElement.lang = S.lang === "en" ? "en" : "id";
    qsa("[data-i18n]").forEach(function (node) {
      var key = node.getAttribute("data-i18n");
      var value = t(key);
      if (value) node.textContent = value;
    });
    qsa("[data-i18n-ph]").forEach(function (node) {
      var key = node.getAttribute("data-i18n-ph");
      var value = t(key);
      if (value) node.setAttribute("placeholder", value);
    });
    var btn = qs("#lang-toggle");
    if (btn) {
      btn.textContent = S.lang === "id" ? "EN" : "ID";
      btn.setAttribute("aria-label", S.lang === "id" ? "Ganti ke bahasa Inggris" : "Switch to Indonesian");
    }
  }

  /* ---------- api ---------- */
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || "GET", credentials: "same-origin", headers: {} };
    if (opts.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || ("Permintaan gagal (" + res.status + ")"));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- tema ---------- */
  function applyTheme(mode) {
    if (mode === "light" || mode === "dark") document.documentElement.setAttribute("data-theme", mode);
    else document.documentElement.removeAttribute("data-theme");
  }

  function initTheme() {
    var saved = localStorage.getItem("bukatoko:theme");
    if (saved) applyTheme(saved);
    var btn = qs("#theme-toggle");
    if (!btn) return;
    function label() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      btn.textContent = dark ? t("light") : t("dark");
      btn.setAttribute("aria-label", dark ? "Ganti ke tema terang" : "Ganti ke tema gelap");
    }
    label();
    btn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      var next = dark ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("bukatoko:theme", next);
      label();
    });
    btn._relabel = label;
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var node = qs("#toast");
    if (!node) return;
    node.textContent = msg;
    node.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-on"); }, 2800);
  }

  /* ---------- foto placeholder ---------- */
  var PALETTES = [
    ["#E7DCC4", "#8A6B3A"], ["#DCE5DA", "#31705A"], ["#E5DCE6", "#6D4A72"],
    ["#E6DFD2", "#7A5A32"], ["#D9E2E8", "#3A5F72"], ["#E9DFD6", "#8B4B32"]
  ];

  function photo(seed, label, ratio) {
    var idx = 0;
    for (var i = 0; i < String(seed).length; i++) idx += String(seed).charCodeAt(i);
    var pal = PALETTES[idx % PALETTES.length];
    var w = 640, h = ratio === "square" ? 640 : 480;
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
      '<defs><pattern id="h" width="18" height="18" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
      '<line x1="0" y1="0" x2="0" y2="18" stroke="' + pal[1] + '" stroke-width="2" opacity="0.12"/></pattern></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="' + pal[0] + '"/>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#h)"/>' +
      '<g fill="none" stroke="' + pal[1] + '" stroke-width="7" opacity="0.5">' +
      '<rect x="' + (w * 0.26) + '" y="' + (h * 0.2) + '" width="' + (w * 0.48) + '" height="' + (h * 0.42) + '" rx="12"/>' +
      '<path d="M' + (w * 0.26) + " " + (h * 0.5) + ' L' + (w * 0.4) + " " + (h * 0.35) + " L" + (w * 0.55) + " " + (h * 0.5) + ' L' + (w * 0.74) + " " + (h * 0.33) + '"/>' +
      "</g>" +
      '<text x="50%" y="' + (h * 0.79) + '" text-anchor="middle" font-family="ui-monospace, monospace" font-size="' + Math.round(h * 0.062) + '" fill="' + pal[1] + '">foto contoh</text>' +
      '<text x="50%" y="' + (h * 0.89) + '" text-anchor="middle" font-family="ui-monospace, monospace" font-size="' + Math.round(h * 0.045) + '" fill="' + pal[1] + '" opacity="0.85">' + esc(label || "") + "</text>" +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- modal ---------- */
  var lastFocus = null;

  function modalShell(id, title, body, foot) {
    var back = qs("#" + id);
    if (back) back.remove();
    back = el("div", { class: "modal-backdrop", id: id, hidden: null });
    var box = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": id + "-title" }, [
      el("h2", { id: id + "-title", text: title })
    ]);
    (Array.isArray(body) ? body : [body]).forEach(function (n) { if (n) box.appendChild(n); });
    if (foot) box.appendChild(foot);
    back.appendChild(box);
    document.body.appendChild(back);
    return back;
  }

  function openModal(id) {
    var back = qs("#" + id);
    if (!back) return;
    lastFocus = document.activeElement;
    back.hidden = false;
    var f = back.querySelector("input, button, textarea, select, a[href]");
    if (f) f.focus();
    document.addEventListener("keydown", trap);
  }

  function closeModals() {
    qsa(".modal-backdrop").forEach(function (b) { b.hidden = true; });
    document.removeEventListener("keydown", trap);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function trap(e) {
    if (e.key === "Escape") { closeModals(); return; }
    if (e.key !== "Tab") return;
    var open = qsa(".modal-backdrop").filter(function (b) { return !b.hidden; })[0];
    if (!open) return;
    var nodes = qsa("a[href], button:not([disabled]), input, select, textarea", open)
      .filter(function (n) { return n.offsetParent !== null; });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- auth ---------- */
  function paintUser() {
    var btn = qs("#auth-button");
    var badge = qs("#notif-badge");
    if (btn) {
      btn.textContent = S.me ? t("logout") : t("login");
      btn.setAttribute("aria-label", S.me ? "Keluar dari akun " + S.me.name : "Masuk atau daftar");
      btn.title = S.me ? S.me.email : "";
    }
    if (badge) {
      var n = S.me && S.me.counts ? (S.me.counts.unread + S.me.counts.offers + S.me.counts.matches) : 0;
      badge.textContent = n > 9 ? "9+" : String(n);
      badge.hidden = n === 0;
    }
  }

  function authModal(mode) {
    var isLogin = mode !== "signup";
    var body = [];
    var form = el("form", { id: "auth-form" });

    if (!isLogin) {
      var nameField = el("div", { class: "field" }, [
        el("label", { for: "auth-name", text: "Nama tampilan" }),
        el("input", { id: "auth-name", type: "text", autocomplete: "nickname", placeholder: "misal: rangga.putra", required: null })
      ]);
      form.appendChild(nameField);
    }
    var mail = el("div", { class: "field", style: "margin-top:12px;" }, [
      el("label", { for: "auth-email", text: isLogin ? "Email atau nama" : "Email" }),
      el("input", { id: "auth-email", type: isLogin ? "text" : "email", autocomplete: "email", placeholder: "nama@email.com", required: null })
    ]);
    var pw = el("div", { class: "field", style: "margin-top:12px;" }, [
      el("label", { for: "auth-password", text: "Kata sandi" }),
      el("input", { id: "auth-password", type: "password", autocomplete: isLogin ? "current-password" : "new-password", minlength: "8", required: null })
    ]);
    form.appendChild(mail);
    form.appendChild(pw);
    if (!isLogin) {
      var note = el("p", { class: "field-note", text: "Minimal 8 karakter. Ini demo: jangan pakai kata sandi yang kamu pakai di tempat lain." });
      form.appendChild(note);
    }
    var err = el("p", { class: "form-error", id: "auth-error", hidden: null });
    form.appendChild(err);

    var foot = el("div", { class: "modal-foot" }, [
      el("button", { class: "btn btn-outline", type: "button", text: t("cancel") }),
      el("button", { class: "btn btn-primary", type: "submit", text: isLogin ? t("login") : "Daftar" })
    ]);
    foot.firstChild.addEventListener("click", closeModals);
    form.appendChild(foot);

    var swap = el("button", {
      class: "btn btn-quiet btn-sm btn-block", type: "button",
      text: isLogin ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk",
      style: "margin-top:8px;"
    });
    swap.addEventListener("click", function () { authModal(isLogin ? "signup" : "login"); });
    form.appendChild(swap);

    body.push(el("p", { class: "field-note", text: isLogin ? "Masuk untuk menawar, menyimpan, dan memasang barang." : "Daftar dengan email dan kata sandi. Data lain tidak diminta." }));
    body.push(form);

    var back = modalShell("modal-auth", isLogin ? "Masuk ke Bukatoko" : "Daftar akun Bukatoko", body);
    openModal("modal-auth");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true;
      var payload = {
        email: qs("#auth-email").value.trim(),
        password: qs("#auth-password").value
      };
      if (!isLogin) payload.name = qs("#auth-name").value.trim();
      var submit = foot.lastChild;
      submit.disabled = true;
      submit.textContent = "Memproses...";
      api(isLogin ? "/api/login" : "/api/signup", { method: "POST", body: payload })
        .then(function () { return api("/api/me"); })
        .then(function (me) {
          S.me = me && me.id ? me : null;
          paintUser();
          if (!S.me) throw new Error("Sesi tidak terbentuk. Coba masuk lagi.");
          closeModals();
          toast(isLogin ? "Masuk sebagai " + S.me.name : "Akun dibuat. Selamat datang, " + S.me.name + ".");
          var pending = window.__afterAuth;
          window.__afterAuth = null;
          if (typeof pending === "function") pending();
        })
        .catch(function (ex) {
          err.textContent = ex.message;
          err.hidden = false;
          submit.disabled = false;
          submit.textContent = isLogin ? t("login") : "Daftar";
        });
    });
  }

  function requireAuth(then) {
    if (S.me) { then(); return; }
    window.__afterAuth = then;
    authModal("login");
  }

  function initAuth() {
    paintUser();
    var btn = qs("#auth-button");
    if (btn) {
      btn.addEventListener("click", function () {
        if (!S.me) { authModal("login"); return; }
        api("/api/logout", { method: "POST", body: { token: "" } }).then(function () {
          S.me = null;
          paintUser();
          toast("Kamu keluar.");
          if (document.body.dataset.page === "akun") location.reload();
        });
      });
    }
    var lang = qs("#lang-toggle");
    if (lang) {
      lang.addEventListener("click", function () {
        S.lang = S.lang === "id" ? "en" : "id";
        localStorage.setItem("bk_lang", S.lang);
        applyLang();
        var tt = qs("#theme-toggle");
        if (tt && tt._relabel) tt._relabel();
        if (document.body.dataset.page === "akun") boot.page && boot.page();
      });
    }
    qsa("[data-open-auth]").forEach(function (b) {
      b.addEventListener("click", function () { authModal(b.dataset.openAuth || "login"); });
    });
  }

  /* ---------- kartu & state ---------- */
  function card(item) {
    var real = item.photo_urls && item.photo_urls[0];
    var media = el("img", {
      class: "card-media",
      src: real || photo(item.id, item.category),
      alt: (real ? "Foto barang: " : "Foto contoh untuk ") + item.title,
      width: "640", height: "480", loading: "lazy"
    });
    var title = el("a", { class: "card-title", href: "listing.html?id=" + encodeURIComponent(item.id), text: item.title });
    var foot = el("div", { class: "card-foot" }, [el("span", { class: "tag", text: rp(item.price) })]);
    if (item.old_price) foot.appendChild(el("span", { class: "tag tag-old", text: rp(item.old_price) }));
    var body = el("div", { class: "card-body" }, [
      el("div", { class: "card-meta", text: (item.owner ? item.owner.name : "") + " · " + timeAgo(item.created_at) }),
      title,
      el("span", { class: "card-meta", text: item.condition + " · " + item.city }),
      foot
    ]);
    var wrap = el("article", { class: "card" }, [media, body]);
    if (item.status === "sold") {
      wrap.classList.add("is-sold");
      wrap.appendChild(el("span", { class: "sold-flag", text: "terjual" }));
    }
    return wrap;
  }

  function skeletons(n, target) {
    target.innerHTML = "";
    for (var i = 0; i < n; i++) {
      target.appendChild(el("div", { class: "skel" }, [
        el("div", { class: "skel-media" }),
        el("div", { class: "skel-bar" }),
        el("div", { class: "skel-bar short" })
      ]));
    }
  }

  function stateBox(target, opts) {
    target.hidden = false;
    target.className = "state" + (opts.error ? " state-error" : "");
    target.innerHTML = "";
    target.appendChild(el("h3", { text: opts.title }));
    if (opts.body) target.appendChild(el("p", { text: opts.body }));
    if (opts.action) {
      var b = el("button", { class: "btn btn-outline", type: "button", text: opts.action.label });
      b.addEventListener("click", opts.action.onClick);
      target.appendChild(b);
    }
  }

  function fail(target, err, retry) {
    stateBox(target, {
      error: true,
      title: "Gagal memuat",
      body: (err && err.message) || "Server tidak bisa dihubungi.",
      action: { label: t("retry"), onClick: retry }
    });
  }

  /* ---------- beranda ---------- */
  function initHome() {
    var railTurun = qs("#rail-turun");
    var railBaru = qs("#rail-rekomendasi");
    var mini = qs("#wanted-mini");
    var homeState = qs("#home-state");

    [railTurun, railBaru].forEach(function (r) { if (r) skeletons(4, r); });

    Promise.all([
      api("/api/listings?limit=40&sort=baru"),
      api("/api/wanted")
    ]).then(function (res) {
      var listings = res[0].items || [];
      var wanted = res[1].items || [];
      S.home = { listings: listings, wanted: wanted };

      if (railBaru) {
        railBaru.innerHTML = "";
        listings.slice(0, 8).forEach(function (i) { railBaru.appendChild(card(i)); });
      }
      if (railTurun) {
        railTurun.innerHTML = "";
        listings.filter(function (i) { return i.old_price; }).slice(0, 8).forEach(function (i) {
          railTurun.appendChild(card(i));
        });
      }
      if (mini) {
        mini.innerHTML = "";
        wanted.slice(0, 3).forEach(function (w) {
          mini.appendChild(el("div", { class: "wanted-mini" }, [
            el("strong", { text: w.title }),
            el("span", { text: rp(w.price_min) + " sampai " + rp(w.price_max) + " · " + w.city })
          ]));
        });
      }
      var counts = qs("#home-counts");
      if (counts) {
        var aktif = listings.filter(function (i) { return i.status === "active"; }).length;
        counts.textContent = "Server mencatat " + aktif + " barang aktif dan " + wanted.length +
          " permintaan. Angka ini dari basis data, bukan klaim pemasaran.";
      }
      if (homeState) homeState.hidden = true;
    }).catch(function (err) {
      if (railBaru) railBaru.innerHTML = "";
      if (railTurun) railTurun.innerHTML = "";
      if (homeState) fail(homeState, err, function () { initHome(); });
    });
  }

  /* ---------- jelajah ---------- */
  function readParams() {
    var p = new URLSearchParams(location.search);
    return {
      q: (p.get("q") || "").trim(),
      kat: p.get("kat") || "",
      city: p.get("lok") || "",
      kondisi: p.get("kondisi") || "",
      min: p.get("min") || "",
      max: p.get("max") || "",
      sort: p.get("urut") || "baru",
      status: p.get("status") || "active"
    };
  }

  function initJelajah() {
    var form = qs("#filter-form");
    var grid = qs("#hasil");
    var count = qs("#jumlah");
    var chips = qs("#filter-aktif");
    var stateBoxEl = qs("#state-box");
    var loading = qs("#loading");
    var moreBtn = qs("#load-more");
    var saveBtn = qs("#save-search");
    var state = readParams();
    var items = [];
    var offset = 0;
    var total = 0;

    function queryString() {
      var p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      if (state.kat) p.set("kat", state.kat);
      if (state.city) p.set("lok", state.city);
      if (state.kondisi) p.set("kondisi", state.kondisi);
      if (state.min) p.set("min", state.min);
      if (state.max) p.set("max", state.max);
      if (state.sort && state.sort !== "baru") p.set("urut", state.sort);
      if (state.status && state.status !== "active") p.set("status", state.status);
      return p;
    }

    function syncUrl() {
      var q = queryString().toString();
      history.replaceState(null, "", "jelajah.html" + (q ? "?" + q : ""));
      sessionStorage.setItem("bk_last_query", q);
    }

    function syncForm() {
      qs("#f-q").value = state.q;
      qs("#f-kat").value = state.kat;
      qs("#f-lok").value = state.city;
      qs("#f-kondisi").value = state.kondisi;
      qs("#f-min").value = state.min;
      qs("#f-max").value = state.max;
      qs("#f-urut").value = state.sort;
      var st = qs("#f-status");
      if (st) st.value = state.status;
      var crumb = qs("#crumb-kat");
      if (crumb) crumb.textContent = state.kat ? kategoriName(state.kat) : "Semua kategori";
      var h1 = qs("#explore-title");
      if (h1) {
        h1.textContent = state.q ? 'Hasil untuk "' + state.q + '"'
          : state.kat ? kategoriName(state.kat) : "Semua barang";
      }
    }

    function renderChips() {
      chips.innerHTML = "";
      var labels = { q: "Cari", kat: "Kategori", city: "Lokasi", kondisi: "Kondisi", min: "Harga min", max: "Harga maks", status: "Status" };
      Object.keys(labels).forEach(function (key) {
        if (!state[key] || (key === "status" && state.status === "active")) return;
        var val = key === "kat" ? kategoriName(state[key]) : (key === "min" || key === "max") ? rp(state[key]) : state[key];
        var chip = el("span", { class: "chip" }, [document.createTextNode(labels[key] + ": " + val + " ")]);
        var x = el("button", { type: "button", "aria-label": "Hapus filter " + labels[key], text: "x" });
        x.addEventListener("click", function () {
          state[key] = key === "status" ? "active" : "";
          syncForm();
          load(false);
        });
        chip.appendChild(x);
        chips.appendChild(chip);
      });
      if (chips.children.length) {
        var clear = el("button", { class: "btn btn-sm btn-quiet", type: "button", text: "Hapus semua" });
        clear.addEventListener("click", function () {
          state = readParams();
          state = { q: "", kat: "", city: "", kondisi: "", min: "", max: "", sort: "baru", status: "active" };
          syncForm();
          load(false);
        });
        chips.appendChild(clear);
      }
    }

    function appendItems(list, replace) {
      if (replace) grid.innerHTML = "";
      list.forEach(function (i) { grid.appendChild(card(i)); });
    }

    function load(append) {
      var min = state.min === "" ? null : Number(state.min);
      var max = state.max === "" ? null : Number(state.max);
      if (min !== null && max !== null && min > max) {
        grid.innerHTML = "";
        count.textContent = "0 barang";
        stateBox(stateBoxEl, {
          error: true, title: "Rentang harga terbalik",
          body: "Harga minimum " + rp(min) + " lebih besar dari maksimum " + rp(max) + ". Tukar angkanya lalu terapkan lagi."
        });
        if (moreBtn) moreBtn.hidden = true;
        renderChips();
        return;
      }
      offset = append ? items.length : 0;
      loading.hidden = false;
      if (!append) { skeletons(4, grid); stateBoxEl.hidden = true; }
      syncUrl();
      var p = queryString();
      p.set("limit", "24");
      p.set("offset", String(offset));
      api("/api/listings?" + p.toString()).then(function (data) {
        loading.hidden = true;
        items = append ? items.concat(data.items) : data.items;
        total = data.total;
        appendItems(data.items, !append);
        count.textContent = total + " " + t("results") + (state.city ? " di " + state.city : "");
        if (!items.length) {
          grid.innerHTML = "";
          stateBox(stateBoxEl, {
            title: t("empty"),
            body: "Coba kata kunci yang lebih umum, longgarkan rentang harga, atau lihat kategori lain.",
            action: {
              label: "Hapus semua filter",
              onClick: function () {
                state = { q: "", kat: "", city: "", kondisi: "", min: "", max: "", sort: "baru", status: "active" };
                syncForm();
                load(false);
              }
            }
          });
        }
        if (moreBtn) moreBtn.hidden = !data.has_more;
        if (saveBtn) saveBtn.hidden = false;
        renderChips();
      }).catch(function (err) {
        loading.hidden = true;
        grid.innerHTML = "";
        fail(stateBoxEl, err, function () { load(append); });
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      state.q = qs("#f-q").value.trim();
      state.kat = qs("#f-kat").value;
      state.city = qs("#f-lok").value;
      state.kondisi = qs("#f-kondisi").value;
      state.min = qs("#f-min").value;
      state.max = qs("#f-max").value;
      state.sort = qs("#f-urut").value;
      if (qs("#f-status")) state.status = qs("#f-status").value;
      var details = qs("#filter-details");
      if (details) details.removeAttribute("open");
      load(false);
    });

    qs("#f-urut").addEventListener("change", function () {
      state.sort = qs("#f-urut").value;
      load(false);
    });

    if (moreBtn) {
      moreBtn.addEventListener("click", function () { load(true); });
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        requireAuth(function () {
          var params = { q: state.q, kat: state.kat, city: state.city, kondisi: state.kondisi, min: state.min, max: state.max };
          api("/api/searches", { method: "POST", body: { params: params } })
            .then(function () { return refreshMe(); })
            .then(function () { toast("Pencarian disimpan. Lihat di Akun, tab Pencarian."); })
            .catch(function (err) { toast(err.message); });
        });
      });
    }

    var details = qs("#filter-details");
    if (details && window.matchMedia("(max-width: 720px)").matches) details.removeAttribute("open");

    syncForm();
    load(false);
  }

  /* ---------- kategori ---------- */
  var KATEGORI = {
    elektronik: "Elektronik", ponsel: "Ponsel & Tablet", fesyen: "Fesyen", rumah: "Rumah Tangga",
    hobi: "Hobi & Koleksi", buku: "Buku", otomotif: "Otomotif", olahraga: "Olahraga"
  };
  function kategoriName(id) { return KATEGORI[id] || id; }

  function refreshMe() {
    return api("/api/me").then(function (me) {
      // server mengembalikan objek pengguna langsung, atau {user: null}
      S.me = me && me.id ? me : null;
      paintUser();
      return S.me;
    });
  }

  /* ---------- detail barang ---------- */
  function initListing() {
    var id = new URLSearchParams(location.search).get("id") || document.body.dataset.listingId || "";
    var root = qs("#detail-root");
    var gallery = qs("#gallery-main");
    if (!id) {
      root.innerHTML = '<div class="state"><h3>Barang tidak ditemukan</h3><p>Tautan tidak memuat id barang.</p><a class="btn btn-primary" href="jelajah.html">Lihat barang lain</a></div>';
      return;
    }
    document.body.classList.add("is-loading");

    api("/api/listings/" + encodeURIComponent(id)).then(function (item) {
      document.body.classList.remove("is-loading");
      render(item);
    }).catch(function (err) {
      document.body.classList.remove("is-loading");
      var code = err.status || 0;
      root.innerHTML = "";
      stateBox(root, {
        error: true,
        title: code === 404 ? "Barang tidak ditemukan" : "Gagal memuat barang",
        body: code === 404 ? "Tautan kedaluwarsa atau barang sudah dihapus penjual." : err.message,
        action: { label: "Lihat barang lain", onClick: function () { location.href = "jelajah.html"; } }
      });
    });

    function render(item) {
      document.title = item.title + " · Bukatoko";
      qs("#d-judul").textContent = item.title;
      qs("#d-harga").textContent = rp(item.price);
      var old = qs("#d-harga-lama");
      old.hidden = !item.old_price;
      if (item.old_price) old.textContent = rp(item.old_price);
      qs("#d-kondisi").textContent = item.condition;
      qs("#d-lokasi").textContent = item.city;
      qs("#d-waktu").textContent = "Dipasang " + timeAgo(item.created_at);
      qs("#d-kategori").textContent = kategoriName(item.category);
      qs("#d-kategori-link").href = "jelajah.html?kat=" + encodeURIComponent(item.category);
      qs("#d-kat-copy").textContent = kategoriName(item.category);
      qs("#d-kondisi-copy").textContent = item.condition;
      qs("#d-lokasi-copy").textContent = item.city;
      qs("#d-deskripsi").textContent = item.description || "Penjual belum menulis deskripsi.";
      qs("#d-crumb").textContent = item.title;

      // kembali ke hasil dengan filter terakhir
      var back = qs("#back-link");
      if (back) {
        var q = S.lastQuery || sessionStorage.getItem("bk_last_query") || "";
        back.href = "jelajah.html" + (q ? "?" + q : "");
      }

      /* galeri */
      var urls = item.photo_urls || [];
      var count = item.photo_count || 1;
      var current = 1;
      var thumbs = qs("#thumbs");
      var galCount = qs("#gal-count");

      function src(n) { return urls[n - 1] || photo(item.id + (n === 1 ? "" : "-" + n), "foto " + n); }

      function show(n) {
        current = n;
        gallery.src = src(n);
        gallery.alt = (urls[n - 1] ? "Foto " + n : "Foto contoh " + n) + " untuk " + item.title;
        if (galCount) galCount.textContent = n + " / " + count;
        qsa("#thumbs button").forEach(function (b, i) {
          b.setAttribute("aria-current", i + 1 === n ? "true" : "false");
        });
      }

      thumbs.innerHTML = "";
      for (var i = 1; i <= count; i++) {
        (function (n) {
          var th = el("button", { type: "button", "aria-current": n === 1 ? "true" : "false", "aria-label": "Lihat foto " + n });
          th.appendChild(el("img", {
            src: urls[n - 1] || photo(item.id + "-" + n, "foto " + n, "square"),
            alt: "", width: "68", height: "68", loading: "lazy"
          }));
          th.addEventListener("click", function () { show(n); });
          thumbs.appendChild(th);
        })(i);
      }
      show(1);

      var prev = qs("#gal-prev"), next = qs("#gal-next");
      if (count > 1) {
        prev.addEventListener("click", function () { show(current === 1 ? count : current - 1); });
        next.addEventListener("click", function () { show(current === count ? 1 : current + 1); });
        document.addEventListener("keydown", function (e) {
          if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
          if (e.key === "ArrowLeft") prev.click();
          if (e.key === "ArrowRight") next.click();
        });
      } else {
        qsa(".gal-btn").forEach(function (b) { b.hidden = true; });
        if (galCount) galCount.hidden = true;
      }

      // lightbox
      gallery.style.cursor = "zoom-in";
      gallery.addEventListener("click", function () {
        var body = [el("img", { src: src(current), alt: gallery.alt, width: "1200", height: "900", style: "width:100%;height:auto;border-radius:6px;" })];
        modalShell("modal-lightbox", item.title, body);
        openModal("modal-lightbox");
      });

      /* penjual */
      var owner = item.owner || { name: "penjual", joined: "" };
      qs("#s-nama").textContent = owner.name;
      qs("#s-nama").href = "profil.html?u=" + encodeURIComponent(owner.name);
      qs("#s-avatar").textContent = (owner.name || "?").slice(0, 1).toUpperCase();
      qs("#s-bergabung").textContent = "Bergabung " + (owner.joined || "-");
      var rating = item.rating || { count: 0, average: null };
      qs("#s-rating").textContent = rating.count
        ? String(rating.average).replace(".", ",") + " dari " + rating.count + " ulasan"
        : "Belum ada ulasan";

      /* ulasan */
      var reviewsWrap = qs("#reviews");
      var list = qs("#review-list");
      if (item.reviews && item.reviews.length) {
        reviewsWrap.hidden = false;
        list.innerHTML = "";
        item.reviews.forEach(function (r) {
          list.appendChild(el("div", { class: "review" }, [
            el("div", { class: "review-head" }, [
              el("strong", { text: r.author }),
              el("span", { text: "· " + r.role }),
              el("span", { class: "stars", text: "★".repeat(r.stars) + "☆".repeat(5 - r.stars) }),
              el("span", { text: "· " + timeAgo(r.created_at) })
            ]),
            r.body ? el("p", { class: "card-meta", text: r.body }) : null
          ]));
        });
      } else {
        reviewsWrap.hidden = true;
      }

      /* status & aksi */
      var offerInput = qs("#tawaran");
      var offerBtn = qs("#ajukan");
      var offerErr = qs("#offer-error");
      var sold = item.status === "sold";
      offerInput.value = item.price;
      offerInput.max = item.price;

      if (sold) {
        var note = el("p", { class: "sold-note", text: "Barang ini sudah terjual. Tawaran dinonaktifkan." });
        qs(".offer").parentNode.insertBefore(note, qs(".offer"));
        offerBtn.disabled = true;
        offerBtn.textContent = "Sudah terjual";
        offerInput.disabled = true;
      }

      if (item.is_owner) {
        qs("#chat").textContent = "Buka pesan pembeli";
        qs("#simpan").hidden = true;
      }

      offerBtn.addEventListener("click", function () {
        requireAuth(function () {
          offerErr.hidden = true;
          var val = Number(offerInput.value);
          if (!val || val <= 0) {
            offerErr.textContent = "Isi angka tawaran lebih dari nol.";
            offerErr.hidden = false;
            return;
          }
          offerBtn.disabled = true;
          api("/api/offers", { method: "POST", body: { listing_id: item.id, amount: val } })
            .then(function () {
              toast("Tawaran " + rp(val) + " terkirim. Tunggu jawaban penjual.");
              offerBtn.textContent = "Menunggu jawaban";
            })
            .catch(function (err) {
              offerBtn.disabled = false;
              offerErr.textContent = err.message;
              offerErr.hidden = false;
            });
        });
      });

      qs("#simpan").addEventListener("click", function () {
        var btn = this;
        requireAuth(function () {
          var method = btn.getAttribute("aria-pressed") === "true" ? "DELETE" : "POST";
          api("/api/saved/" + encodeURIComponent(item.id), { method: method })
            .then(function (data) {
              btn.setAttribute("aria-pressed", data.saved ? "true" : "false");
              btn.textContent = data.saved ? t("saved") : t("save");
              toast(data.saved ? "Disimpan ke Akun." : "Dihapus dari simpanan.");
              refreshMe();
            })
            .catch(function (err) { toast(err.message); });
        });
      });

      if (item.saved) {
        var sb = qs("#simpan");
        sb.setAttribute("aria-pressed", "true");
        sb.textContent = t("saved");
      }

      qs("#share").addEventListener("click", function () {
        var url = location.origin + "/p/" + item.id;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { toast("Tautan disalin: " + url); },
            function () { toast(url); });
        } else {
          toast(url);
        }
      });

      /* chat drawer */
      qs("#chat").addEventListener("click", function () {
        requireAuth(function () { openChat(item); });
      });

      /* panel pemilik */
      if (item.is_owner) {
        var extra = qs("#owner-panel");
        extra.hidden = false;
        extra.innerHTML = "";
        extra.appendChild(el("h2", { text: "Tawaran masuk (" + (item.offers || []).length + ")", style: "font-size:18px;" }));
        if (!item.offers || !item.offers.length) {
          extra.appendChild(el("p", { class: "card-meta", text: "Belum ada yang menawar barang ini." }));
        } else {
          item.offers.forEach(function (o) {
            var row = el("div", { class: "row-item" }, [
              el("div", { class: "row-body" }, [
                el("h3", { text: rp(o.amount) + " · " + o.buyer.name }),
                el("div", { class: "card-meta", text: o.status + " · " + timeAgo(o.created_at) + (o.message ? " · " + o.message : "") })
              ])
            ]);
            var actions = el("div", { class: "row-actions" });
            if (o.status === "proposed") {
              var acc = el("button", { class: "btn btn-sm btn-primary", type: "button", text: "Terima" });
              acc.addEventListener("click", function () {
                acc.disabled = true;
                api("/api/offers/" + o.id + "/accept", { method: "POST" }).then(function () {
                  toast("Tawaran diterima. Barang ditandai terjual.");
                  setTimeout(function () { location.reload(); }, 700);
                }).catch(function (err) { acc.disabled = false; toast(err.message); });
              });
              var dec = el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Tolak" });
              dec.addEventListener("click", function () {
                api("/api/offers/" + o.id + "/decline", { method: "POST" }).then(function () {
                  toast("Tawaran ditolak.");
                  setTimeout(function () { location.reload(); }, 600);
                }).catch(function (err) { toast(err.message); });
              });
              actions.appendChild(acc);
              actions.appendChild(dec);
            }
            row.appendChild(actions);
            extra.appendChild(row);
          });
        }
        if (item.status !== "sold") {
          var soldBtn = el("button", { class: "btn btn-outline", type: "button", text: "Tandai terjual", style: "margin-top:12px;" });
          soldBtn.addEventListener("click", function () {
            soldBtn.disabled = true;
            api("/api/listings/" + item.id + "/sold", { method: "POST" }).then(function () {
              toast("Barang ditandai terjual.");
              setTimeout(function () { location.reload(); }, 600);
            }).catch(function (err) { soldBtn.disabled = false; toast(err.message); });
          });
          extra.appendChild(soldBtn);
        }
        var del = el("button", { class: "btn btn-danger", type: "button", text: "Hapus barang", style: "margin-top:12px;margin-left:8px;" });
        del.addEventListener("click", function () {
          if (!window.confirm("Hapus barang ini? Foto dan tawarannya ikut hilang.")) return;
          api("/api/listings/" + item.id, { method: "DELETE" }).then(function () {
            toast("Barang dihapus.");
            setTimeout(function () { location.href = "akun.html"; }, 600);
          }).catch(function (err) { toast(err.message); });
        });
        extra.appendChild(del);
      }

      /* ulasan form */
      if (item.can_review !== false && (item.can_review || item.is_owner)) {
        // can_review dari server hanya untuk pembeli; penjual memakai endpoint yang sama
      }
      if (item.can_review) {
        var rwrap = qs("#review-form-wrap");
        rwrap.hidden = false;
        var stars = 5;
        var starRow = el("div", { class: "stars", role: "group", "aria-label": "Bintang" });
        for (var s = 1; s <= 5; s++) {
          (function (n) {
            var b = el("button", { type: "button", class: "btn btn-quiet btn-sm", text: "★", "aria-label": n + " bintang", "aria-pressed": n === stars ? "true" : "false" });
            b.addEventListener("click", function () {
              stars = n;
              qsa("#review-form-wrap .stars button").forEach(function (x, i) {
                x.setAttribute("aria-pressed", i + 1 === n ? "true" : "false");
              });
            });
            starRow.appendChild(b);
          })(s);
        }
        qs("#review-form-wrap").appendChild(starRow);
        var rbody = el("textarea", { id: "review-body", rows: "3", placeholder: "Ceritakan pengalaman transaksi", maxlength: "800" });
        qs("#review-form-wrap").appendChild(rbody);
        var rsubmit = el("button", { class: "btn btn-primary", type: "button", text: "Kirim ulasan", style: "margin-top:8px;" });
        rsubmit.addEventListener("click", function () {
          rsubmit.disabled = true;
          api("/api/listings/" + item.id + "/reviews", { method: "POST", body: { stars: stars, body: rbody.value } })
            .then(function () { toast("Ulasan terkirim. Terima kasih."); setTimeout(function () { location.reload(); }, 700); })
            .catch(function (err) { rsubmit.disabled = false; toast(err.message); });
        });
        qs("#review-form-wrap").appendChild(rsubmit);
      }

      /* laporkan & blokir */
      qs("#report").addEventListener("click", function () {
        requireAuth(function () {
          var sel = el("select", { id: "report-reason" });
          ["Barang palsu", "Penipuan", "Barang terlarang", "Spam", "Lainnya"].forEach(function (r) {
            sel.appendChild(el("option", { value: r, text: r }));
          });
          var detail = el("textarea", { id: "report-detail", rows: "3", placeholder: "Keterangan tambahan (opsional)", maxlength: "500" });
          var err = el("p", { class: "form-error", hidden: null });
          var foot = el("div", { class: "modal-foot" }, [
            el("button", { class: "btn btn-outline", type: "button", text: t("cancel") }),
            el("button", { class: "btn btn-primary", type: "button", text: "Kirim laporan" })
          ]);
          foot.firstChild.addEventListener("click", closeModals);
          foot.lastChild.addEventListener("click", function () {
            api("/api/reports", { method: "POST", body: { listing_id: item.id, reason: sel.value, detail: detail.value } })
              .then(function () { closeModals(); toast("Laporan terkirim. Terima kasih."); })
              .catch(function (ex) { err.textContent = ex.message; err.hidden = false; });
          });
          modalShell("modal-report", "Laporkan barang", [
            el("div", { class: "field" }, [el("label", { for: "report-reason", text: "Alasan" }), sel]),
            el("div", { class: "field", style: "margin-top:12px;" }, [el("label", { for: "report-detail", text: "Keterangan" }), detail]),
            err
          ], foot);
          openModal("modal-report");
        });
      });

      qs("#block").addEventListener("click", function () {
        requireAuth(function () {
          if (item.is_owner) { toast("Ini barang kamu sendiri."); return; }
          if (!window.confirm("Blokir " + owner.name + "? Barang mereka tidak akan muncul lagi untukmu.")) return;
          api("/api/blocks", { method: "POST", body: { user_id: owner.id } })
            .then(function () { toast(owner.name + " diblokir."); setTimeout(function () { location.href = "jelajah.html"; }, 700); })
            .catch(function (err) { toast(err.message); });
        });
      });

      /* barang sejenis */
      api("/api/listings?kat=" + encodeURIComponent(item.category) + "&limit=8").then(function (data) {
        var rail = qs("#rail-terkait");
        rail.innerHTML = "";
        data.items.filter(function (x) { return x.id !== item.id; }).slice(0, 6)
          .forEach(function (x) { rail.appendChild(card(x)); });
      }).catch(function () {});

      /* bar aksi mobile */
      var bar = qs("#mobile-bar");
      if (bar) {
        qs("#bar-harga").textContent = rp(item.price);
        if (sold) {
          qs("#bar-tawar").disabled = true;
          qs("#bar-tawar").textContent = "Sudah terjual";
        }
        qs("#bar-chat").addEventListener("click", function () { qs("#chat").click(); });
        qs("#bar-tawar").addEventListener("click", function () {
          qs("#tawaran").scrollIntoView({ block: "center", behavior: "smooth" });
          qs("#tawaran").focus({ preventScroll: true });
        });
        if (window.matchMedia("(max-width: 860px)").matches) {
          bar.classList.add("is-on");
          document.body.classList.add("has-mobile-bar");
        }
      }
    }

    function openChat(item) {
      if (item.is_owner) {
        location.href = "akun.html#pesan";
        return;
      }
      var box = el("div", { class: "chat-box", id: "chat-box" });
      var input = el("input", { id: "chat-input", type: "text", placeholder: "Tulis pesan untuk " + item.owner.name, maxlength: "1000" });
      var send = el("button", { class: "btn btn-primary", type: "button", text: t("send") });
      var foot = el("div", { style: "display:flex;gap:8px;margin-top:12px;" }, [input, send]);
      var body = [el("p", { class: "field-note", text: "Percakapan khusus barang ini. Penjual menerima di tab Pesan." }), box, foot];
      modalShell("modal-chat", "Tanya " + item.owner.name, body);
      openModal("modal-chat");

      function paint(msgs) {
        box.innerHTML = "";
        if (!msgs.length) {
          box.appendChild(el("p", { class: "card-meta", text: "Belum ada pesan. Mulai dengan menyebut ketersediaan dan cara ambil." }));
        }
        msgs.forEach(function (m) {
          var bubble = el("div", {
            class: "chat-bubble" + (m.mine ? " mine" : ""),
            style: m.mine ? "text-align:right;background:var(--primary-soft);" : "background:var(--paper);"
          }, [
            el("div", { text: m.body }),
            el("div", { class: "card-meta", text: m.sender + " · " + timeAgo(m.created_at) })
          ]);
          box.appendChild(bubble);
        });
        box.scrollTop = box.scrollHeight;
      }

      function loadThread() {
        return api("/api/messages?listing=" + encodeURIComponent(item.id)).then(function (data) {
          paint(data.messages || []);
        }).catch(function (err) { box.textContent = err.message; });
      }

      send.addEventListener("click", function () {
        var text = input.value.trim();
        if (!text) return;
        send.disabled = true;
        api("/api/messages", { method: "POST", body: { listing_id: item.id, body: text } })
          .then(function () { input.value = ""; return loadThread(); })
          .then(function () { refreshMe(); })
          .catch(function (err) { toast(err.message); })
          .then(function () { send.disabled = false; });
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); send.click(); }
      });

      loadThread();
    }
  }

  /* ---------- unggah foto ---------- */
  function downscale(file, maxSide) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { resolve(file); return; }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxSide / Math.max(w, h));
        if (scale === 1 && file.size < 2_500_000) { URL.revokeObjectURL(url); resolve(file); return; }
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], (file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function uploadPhotos(files, onProgress) {
    return files.reduce(function (chain, file, i) {
      return chain.then(function (urls) {
        return downscale(file, 1600).then(function (prepared) {
          var form = new FormData();
          form.append("photo", prepared, prepared.name || "foto.jpg");
          if (onProgress) onProgress(i + 1, files.length);
          return fetch("/api/upload", { method: "POST", body: form, credentials: "same-origin" })
            .then(function (res) {
              return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok) throw new Error((data && data.error) || "unggahan ditolak server");
                if (!data.files || !data.files[0]) throw new Error("server tidak mengembalikan berkas");
                urls.push(data.files[0].url);
                return urls;
              });
            });
        });
      });
    }, Promise.resolve([]));
  }

  /* ---------- jual ---------- */
  function initJual() {
    var photos = [];
    var input = qs("#f-foto");
    var drop = qs("#dropzone");
    var grid = qs("#photo-grid");
    var form = qs("#jual-form");
    var error = qs("#jual-error");
    var status = qs("#jual-status");
    var submit = qs("#jual-submit");

    function paintPhotos() {
      grid.innerHTML = "";
      photos.forEach(function (p, i) {
        var item = el("div", { class: "photo-item" });
        item.appendChild(el("img", { src: p.url, alt: "Foto " + (i + 1) + " yang dipilih", width: "92", height: "92" }));
        var rm = el("button", { type: "button", "aria-label": "Hapus foto " + (i + 1), text: "x" });
        rm.addEventListener("click", function () { photos.splice(i, 1); paintPhotos(); });
        item.appendChild(rm);
        grid.appendChild(item);
      });
      qs("#photo-count").textContent = photos.length + " dari 10 foto";
    }

    function addFiles(files) {
      Array.prototype.slice.call(files).forEach(function (file) {
        if (!/^image\//.test(file.type) || photos.length >= 10) return;
        photos.push({ url: URL.createObjectURL(file), name: file.name, file: file });
      });
      paintPhotos();
    }

    input.addEventListener("change", function () { addFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.hidden = true;
      var payload = {
        title: qs("#f-judul").value.trim(),
        category: qs("#f-kat").value,
        condition: qs("#f-kondisi").value,
        price: Number(qs("#f-harga").value),
        city: qs("#f-lokasi").value,
        description: qs("#f-deskripsi").value.trim()
      };
      if (payload.title.length < 5) { error.textContent = "Judul minimal 5 karakter."; error.hidden = false; qs("#f-judul").focus(); return; }
      if (!payload.category) { error.textContent = "Pilih kategori dulu."; error.hidden = false; qs("#f-kat").focus(); return; }
      if (!payload.price || payload.price <= 0) { error.textContent = "Harga harus lebih dari nol."; error.hidden = false; qs("#f-harga").focus(); return; }
      if (!payload.city) { error.textContent = "Lokasi belum dipilih."; error.hidden = false; qs("#f-lokasi").focus(); return; }

      requireAuth(function () {
        var files = photos.map(function (p) { return p.file; }).filter(Boolean);
        submit.disabled = true;
        submit.textContent = "Mengunggah...";
        status.hidden = false;
        status.textContent = files.length ? "Mengunggah foto 0 dari " + files.length + "..." : "Menyimpan barang...";

        var chain = files.length
          ? uploadPhotos(files, function (n, total) {
              status.textContent = "Mengunggah foto " + n + " dari " + total + "...";
            })
          : Promise.resolve([]);

        chain.then(function (urls) {
          payload.photos = urls;
          status.textContent = "Menyimpan barang...";
          return api("/api/listings", { method: "POST", body: payload });
        }).then(function (item) {
          status.textContent = "Tersimpan. Membuka barang...";
          location.href = "/p/" + item.id;
        }).catch(function (ex) {
          submit.disabled = false;
          submit.textContent = "Terbitkan barang";
          status.textContent = "Gagal: " + ex.message + " Foto pilihanmu masih ada, coba lagi.";
          error.textContent = ex.message;
          error.hidden = false;
        });
      });
    });
  }

  /* ---------- papan permintaan ---------- */
  function initCari() {
    var list = qs("#wanted-list");
    var form = qs("#wanted-form");
    var error = qs("#wanted-error");
    var stateEl = qs("#wanted-state");

    function paint(rows) {
      list.innerHTML = "";
      if (!rows.length) {
        stateBox(list, { title: "Belum ada permintaan", body: "Jadilah yang pertama menulis barang yang kamu cari." });
        return;
      }
      rows.forEach(function (w) {
        var actions = el("div", { class: "wanted-side" }, [
          el("span", { class: "tag", text: rp(w.price_min) + " - " + rp(w.price_max) }),
          el("a", { class: "btn btn-outline btn-sm", href: "jelajah.html?kat=" + encodeURIComponent(w.category), text: "Lihat barang sejenis" })
        ]);
        if (S.me && w.owner && w.owner.name === S.me.name) {
          var del = el("button", { class: "btn btn-sm btn-danger", type: "button", text: "Hapus" });
          del.addEventListener("click", function () {
            api("/api/wanted/" + w.id, { method: "DELETE" }).then(function () { load(); refreshMe(); })
              .catch(function (err) { toast(err.message); });
          });
          actions.appendChild(del);
        }
        list.appendChild(el("article", { class: "wanted-item" }, [
          el("div", {}, [
            el("h3", { text: w.title }),
            el("span", { class: "card-meta", text: kategoriName(w.category) + " · " + w.city + " · " + timeAgo(w.created_at) + " · " + w.owner.name }),
            el("p", { class: "wanted-note", text: w.note })
          ]),
          actions
        ]));
      });
    }

    function load() {
      skeletons(2, list);
      return api("/api/wanted").then(function (data) { paint(data.items); })
        .catch(function (err) { fail(list, err, load); });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.hidden = true;
      var payload = {
        title: qs("#w-judul").value.trim(),
        category: qs("#w-kat").value,
        price_min: Number(qs("#w-min").value),
        price_max: Number(qs("#w-max").value),
        city: qs("#w-lokasi").value,
        note: qs("#w-catatan").value.trim()
      };
      if (payload.title.length < 5) { error.textContent = "Tulis barang yang kamu cari, minimal 5 karakter."; error.hidden = false; return; }
      if (!payload.category) { error.textContent = "Pilih kategori."; error.hidden = false; return; }
      if (!(payload.price_min > 0) || !(payload.price_max > 0)) { error.textContent = "Isi rentang harga minimum dan maksimum."; error.hidden = false; return; }
      if (payload.price_min > payload.price_max) { error.textContent = "Harga minimum tidak boleh lebih besar dari maksimum."; error.hidden = false; return; }
      if (!payload.city) { error.textContent = "Pilih lokasi."; error.hidden = false; return; }

      requireAuth(function () {
        api("/api/wanted", { method: "POST", body: payload }).then(function () {
          form.reset();
          toast("Permintaan terpasang.");
          load();
          refreshMe();
        }).catch(function (ex) { error.textContent = ex.message; error.hidden = false; });
      });
    });

    load();
  }

  /* ---------- profil penjual ---------- */
  function initProfil() {
    var name = new URLSearchParams(location.search).get("u") || "";
    var root = qs("#profil-root");
    if (!name) {
      stateBox(root, { title: "Nama pengguna kosong", body: "Buka profil dari halaman barang.", action: { label: "Jelajah", onClick: function () { location.href = "jelajah.html"; } } });
      return;
    }
    skeletons(3, qs("#profil-listings"));
    api("/api/users/" + encodeURIComponent(name)).then(function (data) {
      document.title = data.user.name + " · Bukatoko";
      qs("#p-nama").textContent = data.user.name;
      qs("#p-avatar").textContent = data.user.name.slice(0, 1).toUpperCase();
      qs("#p-bergabung").textContent = "Bergabung " + data.user.joined;
      qs("#p-rating").textContent = data.rating.count
        ? String(data.rating.average).replace(".", ",") + " dari " + data.rating.count + " ulasan"
        : "Belum ada ulasan";
      var list = qs("#profil-listings");
      list.innerHTML = "";
      if (!data.listings.length) {
        stateBox(list, { title: "Belum ada barang", body: "Penjual ini belum memasang barang." });
      } else {
        data.listings.forEach(function (i) { list.appendChild(card(i)); });
      }
      var reviews = qs("#profil-reviews");
      reviews.innerHTML = "";
      if (!data.reviews.length) {
        reviews.appendChild(el("p", { class: "card-meta", text: "Belum ada ulasan." }));
      } else {
        data.reviews.forEach(function (r) {
          reviews.appendChild(el("div", { class: "review" }, [
            el("div", { class: "review-head" }, [
              el("strong", { text: r.author }),
              el("span", { text: "· " + r.role }),
              el("span", { class: "stars", text: "★".repeat(r.stars) + "☆".repeat(5 - r.stars) }),
              el("span", { text: "· " + timeAgo(r.created_at) })
            ]),
            el("p", { class: "card-meta", text: r.body })
          ]));
        });
      }
      if (data.is_self) qs("#p-block").hidden = true;
      qs("#p-block").addEventListener("click", function () {
        requireAuth(function () {
          if (!window.confirm("Blokir " + data.user.name + "?")) return;
          api("/api/blocks", { method: "POST", body: { user_id: data.user.id } })
            .then(function () { toast("Diblokir."); setTimeout(function () { location.href = "jelajah.html"; }, 600); })
            .catch(function (err) { toast(err.message); });
        });
      });
    }).catch(function (err) {
      fail(root, err, function () { location.reload(); });
    });
  }

  /* ---------- akun ---------- */
  function threadModal(listingId, otherId, title) {
    var box = el("div", { class: "chat-box", id: "thread-box" });
    var input = el("input", { id: "thread-input", type: "text", placeholder: "Tulis balasan", maxlength: "1000" });
    var send = el("button", { class: "btn btn-primary", type: "button", text: t("send") });
    modalShell("modal-thread", title, [box, el("div", { style: "display:flex;gap:8px;margin-top:12px;" }, [input, send])]);
    openModal("modal-thread");

    function paint(msgs) {
      box.innerHTML = "";
      if (!msgs.length) box.appendChild(el("p", { class: "card-meta", text: "Belum ada pesan." }));
      msgs.forEach(function (m) {
        box.appendChild(el("div", {
          class: "chat-bubble",
          style: m.mine ? "text-align:right;background:var(--primary-soft);" : "background:var(--paper);"
        }, [
          el("div", { text: m.body }),
          el("div", { class: "card-meta", text: m.sender + " · " + timeAgo(m.created_at) })
        ]));
      });
      box.scrollTop = box.scrollHeight;
    }

    function loadThread() {
      return api("/api/messages?listing=" + encodeURIComponent(listingId) + "&with=" + otherId)
        .then(function (data) { paint(data.messages || []); })
        .catch(function (err) { box.textContent = err.message; });
    }

    send.addEventListener("click", function () {
      var text = input.value.trim();
      if (!text) return;
      send.disabled = true;
      api("/api/messages", { method: "POST", body: { listing_id: listingId, body: text, with: otherId } })
        .then(function () { input.value = ""; return loadThread(); })
        .catch(function (err) { toast(err.message); })
        .then(function () { send.disabled = false; });
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send.click(); } });
    loadThread();
  }

  function initAkun() {
    var tabs = qsa(".tabs button");
    var panels = {
      disimpan: qs("#panel-disimpan"),
      barang: qs("#panel-barang"),
      permintaan: qs("#panel-permintaan"),
      tawaran: qs("#panel-tawaran"),
      pesan: qs("#panel-pesan"),
      pencarian: qs("#panel-pencarian")
    };
    var needLogin = qs("#akun-need-login");
    var content = qs("#akun-content");
    var current = (location.hash || "").replace("#", "") || "disimpan";
    if (!panels[current]) current = "disimpan";

    function row(opts) {
      var r = el("div", { class: "row-item" });
      if (opts.src !== undefined) {
        r.appendChild(el("img", {
          class: "row-thumb", src: opts.src || photo(opts.id, opts.label || ""),
          alt: opts.alt || "Foto contoh", width: "72", height: "72", loading: "lazy"
        }));
      }
      var body = el("div", { class: "row-body" });
      if (opts.href) body.appendChild(el("h3", {}, [el("a", { href: opts.href, text: opts.title })]));
      else body.appendChild(el("h3", { text: opts.title }));
      if (opts.meta) body.appendChild(el("div", { class: "card-meta", text: opts.meta }));
      if (opts.extra) body.appendChild(el("div", { class: "card-meta", text: opts.extra }));
      r.appendChild(body);
      var actions = el("div", { class: "row-actions" });
      (opts.actions || []).forEach(function (a) {
        var b = el("button", { class: "btn btn-sm " + (a.variant || "btn-outline"), type: "button", text: a.label });
        b.addEventListener("click", function () { a.onClick(b); });
        actions.appendChild(b);
      });
      r.appendChild(actions);
      if (opts.noThumb) r.style.gridTemplateColumns = "minmax(0,1fr) auto";
      return r;
    }

    function panelState(panel, text, cta) {
      panel.innerHTML = "";
      stateBox(panel, { title: text, body: "", action: cta ? { label: cta.label, onClick: cta.onClick } : null });
    }

    function paintCounts(me) {
      qs("#c-simpan").textContent = me.counts.saved;
      qs("#c-barang").textContent = me.counts.listings;
      qs("#c-minta").textContent = me.counts.wanted;
      qs("#c-tawar").textContent = me.counts.offers;
      qs("#c-pesan").textContent = me.counts.unread;
      qs("#c-cari").textContent = me.counts.matches;
    }

    function loadSaved() {
      var p = panels.disimpan;
      skeletons(2, p);
      return api("/api/saved").then(function (data) {
        p.innerHTML = "";
        if (!data.items.length) {
          panelState(p, "Belum ada barang yang disimpan.", { label: "Jelajah barang", onClick: function () { location.href = "jelajah.html"; } });
          return;
        }
        data.items.forEach(function (i) {
          p.appendChild(row({
            id: i.id, label: kategoriName(i.category), src: i.photo_urls[0], alt: "Foto " + i.title,
            href: "listing.html?id=" + i.id, title: i.title,
            meta: rp(i.price) + " · " + i.city + (i.status === "sold" ? " · terjual" : ""),
            actions: [{
              label: "Hapus", onClick: function (btn) {
                btn.disabled = true;
                api("/api/saved/" + i.id, { method: "DELETE" }).then(function () { loadSaved(); refreshMe(); })
                  .catch(function (err) { btn.disabled = false; toast(err.message); });
              }
            }]
          }));
        });
      }).catch(function (err) { fail(p, err, loadSaved); });
    }

    function loadMyListings() {
      var p = panels.barang;
      skeletons(2, p);
      return api("/api/listings?owner=" + S.me.id + "&status=all&limit=100").then(function (data) {
        p.innerHTML = "";
        if (!data.items.length) {
          panelState(p, "Belum ada barang yang kamu pasang.", { label: "Pasang barang", onClick: function () { location.href = "jual.html"; } });
          return;
        }
        data.items.forEach(function (i) {
          var acts = [];
          if (i.status !== "sold") {
            acts.push({
              label: "Tandai terjual", onClick: function (btn) {
                btn.disabled = true;
                api("/api/listings/" + i.id + "/sold", { method: "POST" }).then(function () { loadMyListings(); })
                  .catch(function (err) { btn.disabled = false; toast(err.message); });
              }
            });
          }
          acts.push({
            label: "Hapus", variant: "btn-danger", onClick: function (btn) {
              if (!window.confirm("Hapus barang ini?")) return;
              btn.disabled = true;
              api("/api/listings/" + i.id, { method: "DELETE" }).then(function () { loadMyListings(); refreshMe(); })
                .catch(function (err) { btn.disabled = false; toast(err.message); });
            }
          });
          p.appendChild(row({
            id: i.id, label: kategoriName(i.category), src: i.photo_urls[0], alt: "Foto " + i.title,
            href: "listing.html?id=" + i.id, title: i.title,
            meta: rp(i.price) + " · " + (i.status === "sold" ? "terjual" : "aktif") + " · " + timeAgo(i.created_at) +
              (i.open_offers ? " · " + i.open_offers + " tawaran menunggu" : ""),
            actions: acts
          }));
        });
      }).catch(function (err) { fail(p, err, loadMyListings); });
    }

    function loadMyWanted() {
      var p = panels.permintaan;
      skeletons(2, p);
      return api("/api/wanted").then(function (data) {
        var mine = data.items.filter(function (w) { return w.owner.name === S.me.name; });
        p.innerHTML = "";
        if (!mine.length) {
          panelState(p, "Belum ada permintaan yang kamu tulis.", { label: "Tulis permintaan", onClick: function () { location.href = "cari.html"; } });
          return;
        }
        mine.forEach(function (w) {
          p.appendChild(row({
            noThumb: true, title: w.title,
            meta: rp(w.price_min) + " sampai " + rp(w.price_max) + " · " + w.city + " · " + timeAgo(w.created_at),
            actions: [{
              label: "Hapus", variant: "btn-danger", onClick: function (btn) {
                btn.disabled = true;
                api("/api/wanted/" + w.id, { method: "DELETE" }).then(function () { loadMyWanted(); refreshMe(); })
                  .catch(function (err) { btn.disabled = false; toast(err.message); });
              }
            }]
          }));
        });
      }).catch(function (err) { fail(p, err, loadMyWanted); });
    }

    function loadOffers() {
      var p = panels.tawaran;
      skeletons(2, p);
      return api("/api/offers").then(function (data) {
        p.innerHTML = "";
        var any = false;
        if (data.incoming.length) {
          any = true;
          p.appendChild(el("h2", { text: "Masuk (penjual)", style: "font-size:16px;margin:4px 0 8px;" }));
          data.incoming.forEach(function (o) {
            var acts = [];
            if (o.status === "proposed") {
              acts.push({
                label: "Terima", variant: "btn-primary", onClick: function (btn) {
                  btn.disabled = true;
                  api("/api/offers/" + o.id + "/accept", { method: "POST" })
                    .then(function () { toast("Diterima. Barang jadi terjual."); loadOffers(); refreshMe(); })
                    .catch(function (err) { btn.disabled = false; toast(err.message); });
                }
              });
              acts.push({
                label: "Tolak", onClick: function (btn) {
                  btn.disabled = true;
                  api("/api/offers/" + o.id + "/decline", { method: "POST" })
                    .then(function () { loadOffers(); }).catch(function (err) { btn.disabled = false; toast(err.message); });
                }
              });
            }
            p.appendChild(row({
              noThumb: true, href: "listing.html?id=" + o.listing_id,
              title: rp(o.amount) + " · " + o.listing_title,
              meta: o.status + " · dari " + o.with.name + " · " + timeAgo(o.created_at),
              extra: o.message || "", actions: acts
            }));
          });
        }
        if (data.outgoing.length) {
          any = true;
          p.appendChild(el("h2", { text: "Keluar (pembeli)", style: "font-size:16px;margin:18px 0 8px;" }));
          data.outgoing.forEach(function (o) {
            var acts = [];
            if (o.status === "proposed") {
              acts.push({
                label: "Tarik", onClick: function (btn) {
                  btn.disabled = true;
                  api("/api/offers/" + o.id + "/decline", { method: "POST" })
                    .then(function () { loadOffers(); }).catch(function (err) { btn.disabled = false; toast(err.message); });
                }
              });
            }
            p.appendChild(row({
              noThumb: true, href: "listing.html?id=" + o.listing_id,
              title: rp(o.amount) + " · " + o.listing_title,
              meta: o.status + " · ke " + o.with.name + " · " + timeAgo(o.created_at),
              actions: acts
            }));
          });
        }
        if (!any) panelState(p, "Belum ada tawaran.", { label: "Jelajah barang", onClick: function () { location.href = "jelajah.html"; } });
      }).catch(function (err) { fail(p, err, loadOffers); });
    }

    function loadInbox() {
      var p = panels.pesan;
      skeletons(2, p);
      return api("/api/inbox").then(function (data) {
        p.innerHTML = "";
        if (!data.threads.length) {
          panelState(p, "Belum ada percakapan.", { label: "Cari barang", onClick: function () { location.href = "jelajah.html"; } });
          return;
        }
        data.threads.forEach(function (t) {
          p.appendChild(row({
            noThumb: true, title: t.listing_title,
            meta: "dengan " + t.other.name + " · " + timeAgo(t.last_at) + (t.unread ? " · " + t.unread + " belum dibaca" : ""),
            extra: t.last_message,
            actions: [{
              label: "Buka", variant: t.unread ? "btn-primary" : "btn-outline",
              onClick: function () {
                threadModal(t.listing_id, t.other.id, t.listing_title);
              }
            }]
          }));
        });
        refreshMe();
      }).catch(function (err) { fail(p, err, loadInbox); });
    }

    function loadSearches() {
      var p = panels.pencarian;
      skeletons(2, p);
      return api("/api/searches").then(function (data) {
        p.innerHTML = "";
        if (!data.items.length) {
          panelState(p, "Belum ada pencarian tersimpan.", { label: "Cari barang", onClick: function () { location.href = "jelajah.html"; } });
          return;
        }
        data.items.forEach(function (s) {
          var qsStr = new URLSearchParams(Object.keys(s.params).filter(function (k) {
            return s.params[k] !== "" && s.params[k] !== undefined && s.params[k] !== null;
          }).map(function (k) { return [k === "city" ? "lok" : k, s.params[k]]; })).toString();
          p.appendChild(row({
            noThumb: true, href: "jelajah.html?" + qsStr,
            title: describeParams(s.params),
            meta: s.new_count + " barang baru sejak disimpan · total " + s.total,
            extra: s.sample.map(function (x) { return x.title; }).join(" · "),
            actions: [{
              label: "Hapus", variant: "btn-danger", onClick: function (btn) {
                btn.disabled = true;
                api("/api/searches/" + s.id, { method: "DELETE" }).then(function () { loadSearches(); refreshMe(); })
                  .catch(function (err) { btn.disabled = false; toast(err.message); });
              }
            }]
          }));
        });
      }).catch(function (err) { fail(p, err, loadSearches); });
    }

    function describeParams(p) {
      var bits = [];
      if (p.q) bits.push('"' + p.q + '"');
      if (p.kat) bits.push(kategoriName(p.kat));
      if (p.city) bits.push(p.city);
      if (p.min) bits.push("min " + rp(p.min));
      if (p.max) bits.push("maks " + rp(p.max));
      return bits.length ? bits.join(" · ") : "Semua barang";
    }

    var loaders = {
      disimpan: loadSaved, barang: loadMyListings, permintaan: loadMyWanted,
      tawaran: loadOffers, pesan: loadInbox, pencarian: loadSearches
    };

    function select(tab) {
      if (!panels[tab]) tab = "disimpan";
      current = tab;
      tabs.forEach(function (b) {
        var on = b.dataset.tab === tab;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== tab; });
      history.replaceState(null, "", "akun.html#" + tab);
      if (S.me) loaders[tab]();
    }

    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b.dataset.tab); });
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        var n = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        tabs[n].focus();
        select(tabs[n].dataset.tab);
      });
    });

    function gate() {
      if (!S.me) {
        needLogin.hidden = false;
        content.hidden = true;
        return false;
      }
      needLogin.hidden = true;
      content.hidden = false;
      qs("#akun-nama").textContent = S.me.name;
      qs("#akun-email").textContent = S.me.email;
      paintCounts(S.me);
      return true;
    }

    qs("#akun-login").addEventListener("click", function () {
      authModal("login");
      window.__afterAuth = function () { refreshMe().then(function () { if (gate()) select(current); }); };
    });

    // tautan #pesan / #tawaran dari halaman lain
    window.addEventListener("hashchange", function () {
      var h = (location.hash || "").replace("#", "");
      if (panels[h] && h !== current) select(h);
    });

    if (gate()) select(current);
  }

  /* ---------- boot ---------- */
  function bootPage() {
    var page = document.body.getAttribute("data-page");
    if (page === "home") initHome();
    else if (page === "jelajah") initJelajah();
    else if (page === "listing") initListing();
    else if (page === "jual") initJual();
    else if (page === "cari") initCari();
    else if (page === "akun") initAkun();
    else if (page === "profil") initProfil();
  }

  function boot() {
    applyLang();
    initTheme();
    initAuth();
    S.lastQuery = sessionStorage.getItem("bk_last_query") || "";
    refreshMe().catch(function () { S.me = null; paintUser(); }).then(function () {
      bootPage();
      boot.page = function () {
        applyLang();
        if (document.body.dataset.page === "akun") {
          var p = (location.hash || "").replace("#", "") || "disimpan";
          if (p) location.reload();
        }
      };
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


