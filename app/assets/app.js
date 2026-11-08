/* Bukatoko app 2.0: bicara ke API di server.py, bukan localStorage. */
(function () {
  "use strict";
  var pageEpoch = 0, pageCleanups = [];
  function onPage(target, event, callback) {
    target.addEventListener(event, callback);
    pageCleanups.push(function () { target.removeEventListener(event, callback); });
  }
  function pageRequest(promise) {
    var epoch = pageEpoch;
    // Abandoned chains are left unobserved, so old controllers never touch the new screen.
    return promise.then(function (value) { return epoch === pageEpoch ? value : new Promise(function () {}); }, function (error) {
      if (epoch !== pageEpoch) return new Promise(function () {});
      throw error;
    });
  }
  function navigateTo(url) {
    if (window.BukatokoRouter && window.BukatokoRouter.handles(url)) window.BukatokoRouter.navigate(url);
    else location.href = url;
  }
  function refreshPage() { if(window.BukatokoRouter)window.BukatokoRouter.refresh();else location.reload(); }
  function updateRouteURL(url) {if(window.BukatokoRouter)window.BukatokoRouter.updateURL(url);else history.replaceState(null,'',url);}

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
  function uiText(value) { return window.BukatokoLocale ? window.BukatokoLocale.text(value) : value; }
  function categoryHref(category, search) {
    var current = new URLSearchParams(search || "");
    var params = new URLSearchParams();
    ["q","lok","kondisi","min","max","urut","status"].forEach(function (key) {
      if (current.has(key)) params.set(key,current.get(key));
    });
    if (category) params.set("kat", category); else params.delete("kat");
    return "jelajah.html" + (params.toString() ? "?" + params.toString() : "");
  }

  var iconPaths = {
    heart: '<path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z"/>',
    comment: '<path d="M7 4h10a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4H9l-5 4v-5a4 4 0 0 1-1-3V8a4 4 0 0 1 4-4Z"/><path d="M8 9h8M8 13h5"/>',
    reply: '<path d="m10 5-6 6 6 6M4 11h9a7 7 0 0 1 7 7v2"/>',
    home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
    explore: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    wanted: '<path d="M6 4h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7l-6 4v-4a3 3 0 0 1-2-3V7a3 3 0 0 1 3-3Z"/><path d="M8 8h8M8 12h5"/>',
    sell: '<path d="m3 12 9-9h8v8l-9 10-8-9Z"/><circle cx="16.5" cy="6.5" r="1"/>',
    account: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
    elektronik: '<path d="M3 6h18v12H3zM8 21h8M12 18v3"/><path d="m7 10 3 2-3 2M13 14h4"/>',
    ponsel: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',
    fesyen: '<path d="M9 4 2 8l3 5 2-1v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7l2 1 3-5-7-4a3 3 0 0 1-6 0Z"/>',
    rumah: '<path d="m2 11 10-9 10 9M5 9v12h14V9M10 21v-7h4v7"/>',
    hobi: '<path d="M5 12V9a7 7 0 0 1 14 0v3M3 11h4v9H3zM17 11h4v9h-4zM17 20c0 2-2 2-5 2"/>',
    buku: '<path d="M12 5C9 2 5 2 2 3v16c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2v16Z"/>',
    otomotif: '<path d="m4 10 2-6h12l2 6M3 10h18v9H3zM6 19v3M18 19v3M6 14h2M16 14h2"/>',
    olahraga: '<rect x="3" y="6" width="4" height="12" rx="2"/><rect x="17" y="6" width="4" height="12" rx="2"/><path d="M7 12h10M1 10v4M23 10v4"/>',
    location: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'
  };

  function icon(name) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("viewBox", "0 0 24 24");
    node.setAttribute("class", "ui-icon");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("fill", "none");
    node.setAttribute("stroke", "currentColor");
    node.setAttribute("stroke-width", "1.8");
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("stroke-linecap", "round");
    node.innerHTML = window.BukatokoReact ? window.BukatokoReact.iconMarkup(name) : iconPaths[name] || iconPaths.explore;
    return node;
  }

  function initShell() {
    var showCatalogTools = ["cari", "jual", "akun"].indexOf(document.body.dataset.page) === -1;
    if (!showCatalogTools) qsa(".searchbar,.quick-category-bar").forEach(function (node) { node.remove(); });
    var homeLink = el("a", {href:"index.html","data-i18n":"home",text:"Beranda"});
    if (document.body.dataset.page === "home") homeLink.setAttribute("aria-current", "page");
    if (!qs('.nav [data-i18n="home"]')) qs(".nav").prepend(homeLink);
    if (showCatalogTools && !qs(".searchbar")) {
      var searchInput = el("input", {id:"q-global",type:"search",name:"q",placeholder:"Cari barang yang kamu butuhkan",autocomplete:"off"});
      var search = el("div", {class:"searchbar desktop-search"}, [el("div", {class:"wrap"}, [
        el("form", {class:"search-form",action:"jelajah.html",method:"get",role:"search","aria-label":"Pencarian utama"}, [
          el("div", {class:"search-input-wrap"}, [el("span", {class:"ico","data-icon":"search","aria-hidden":"true"}),
            el("label", {class:"sr-only",for:"q-global",text:"Cari barang"}), searchInput]),
          el("button", {class:"btn btn-primary",type:"submit",text:"Cari barang"})])])]);
      qs(".hdr").insertAdjacentElement("afterend", search);
    }
    var globalInput = qs("#q-global");
    if (globalInput) globalInput.value = new URLSearchParams(location.search).get("q") || "";
    if (showCatalogTools) {
      var categoryBar = el("div", {class:"quick-category-bar"}, [el("div", {class:"wrap"}, [
        el("nav", {class:"quick-categories","aria-label":"Kategori cepat"})])]);
      var categoryNav = qs(".quick-categories", categoryBar);
      var selectedCategory = new URLSearchParams(location.search).get("kat") || "";
      [["","Semua"],["elektronik","Elektronik"],["ponsel","Ponsel & Tablet"],["fesyen","Fashion"],
        ["rumah","Rumah Tangga"],["hobi","Hobi & Koleksi"],["buku","Buku"],["otomotif","Otomotif"],["olahraga","Olahraga"]].forEach(function (category) {
        categoryNav.appendChild(el("a", {class:"btn btn-sm",href:categoryHref(category[0],location.search),
          "data-category":category[0],"aria-current":category[0]===selectedCategory ? "page" : null,text:category[1]}));
      });
      qs(".searchbar").insertAdjacentElement("afterend", categoryBar);
    }
    qsa("label").forEach(function (label) {
      if (!qs(".req", label)) return;
      var field = document.getElementById(label.htmlFor);
      if (field) { field.required = true; field.setAttribute("aria-required", "true"); }
    });
    var maxBudget = qs("#w-max");
    if (maxBudget) { maxBudget.required = true; maxBudget.setAttribute("aria-required", "true"); }
    qsa(".nav a").forEach(function (link) {
      if (qs(".nav-label",link)) return;
      var key = link.getAttribute("data-i18n");
      var label = el("span", {class: "nav-label", text: link.textContent});
      link.textContent = "";
      link.appendChild(icon(key));
      link.appendChild(label);
    });
    qsa("[data-icon]").forEach(function (holder) { if(!qs('svg',holder))holder.appendChild(icon(holder.dataset.icon)); });
    var categories = qs("#rail-kategori");
    if (categories) {
      [["elektronik", "Elektronik"], ["ponsel", "Ponsel & tablet"], ["fesyen", "Fashion"],
        ["rumah", "Rumah tangga"], ["hobi", "Hobi & koleksi"], ["buku", "Buku"],
        ["otomotif", "Otomotif"], ["olahraga", "Olahraga"]].forEach(function (category) {
        categories.appendChild(el("a", {class: "btn", href: "jelajah.html?kat=" + category[0]},
          [icon(category[0]), el("span", {text: category[1]})]));
      });
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- i18n ringkas ---------- */
  var T = {
    id: {
      home: "Beranda", explore: "Jelajah", wanted: "Lagi Dicari", sell: "Jual", account: "Akun",
      login: "Masuk", logout: "Keluar", sellCta: "Pasang barang", dark: "Gelap", light: "Terang",
      search: "Cari barang", allCities: "Semua lokasi", apply: "Terapkan",
      newest: "Paling baru", cheapest: "Termurah", priciest: "Termahal",
      results: "barang", empty: "Tidak ada yang cocok", retry: "Coba lagi",
      save: "Simpan barang", saved: "Tersimpan", ask: "Tanya penjual", offer: "Kirim tawaran",
      send: "Kirim", cancel: "Batal", loading: "Memuat", more: "Muat lagi", share: "Bagikan",
      report: "Laporkan", block: "Blokir penjual", review: "Tulis ulasan"
    },
    en: {
      home: "Home", explore: "Browse", wanted: "Wanted", sell: "Sell", account: "Account",
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
      if (value) (qs(".nav-label", node) || node).textContent = value;
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
    if (window.BukatokoLocale) window.BukatokoLocale.setLanguage(S.lang);
  }

  /* ---------- api ---------- */
  var API_ORIGIN = window.BukatokoConfig && window.BukatokoConfig.apiOrigin || "";
  function backendURL(path) {
    if (!path || !API_ORIGIN || !/^\/(api|uploads)\//.test(path)) return path;
    return API_ORIGIN + path;
  }
  function csrfHeaders(method) {
    if (/^(GET|HEAD)$/i.test(method)) return {};
    if (API_ORIGIN && (!window.location || API_ORIGIN !== window.location.origin)) return {};
    var match = (document.cookie || "").match(/(?:^|;\s*)bk_csrf=([^;]*)/);
    if (!match) return {};
    try { return {"X-CSRF-Token": decodeURIComponent(match[1])}; }
    catch (error) { return {}; }
  }
  function api(path, opts) {
    if (window.BukatokoPreview) return pageRequest(window.BukatokoPreview.request(path, opts));
    opts = opts || {};
    var init = { method: opts.method || "GET", credentials: API_ORIGIN ? "include" : "same-origin", headers: {} };
    init.headers = csrfHeaders(init.method);
    if (opts.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    return pageRequest(fetch(backendURL(path), init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || ("Permintaan gagal (" + res.status + ")"));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    }));
  }


  function cookieValue(name) {
    var parts = document.cookie ? document.cookie.split("; ") : [];
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf("=");
      if (eq > 0 && parts[i].slice(0, eq) === name) return decodeURIComponent(parts[i].slice(eq + 1));
    }
    return "";
  }

  function recentIds() {
    try {
      var raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (x) { return typeof x === "string"; }).slice(0, 8) : [];
    } catch (e) {
      return [];
    }
  }

  function rememberViewed(id) {
    if (!id) return;
    try {
      var list = recentIds().filter(function (x) { return x !== id; });
      list.unshift(id);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
    } catch (e) {
      // mode privat atau kuota penuh: riwayat cukup dilewati, tidak mengganggu halaman
    }
  }

  function paintRecent() {
    var rail = qs("#recent-rail");
    var section = qs("#recent-section");
    if (!rail || !section) return;
    var ids = recentIds();
    if (!ids.length) {
      section.hidden = true;
      return;
    }
    api("/api/listings?ids=" + encodeURIComponent(ids.join(",")) + "&status=all&limit=8").then(function (data) {
      var byId = {};
      (data.items || []).forEach(function (i) { byId[i.id] = i; });
      var ordered = ids.map(function (id) { return byId[id]; }).filter(Boolean);
      if (!ordered.length) {
        section.hidden = true;
        return;
      }
      rail.innerHTML = "";
      renderCards(rail, ordered);
      section.hidden = false;
    }).catch(function () {
      section.hidden = true;
    });
  }

  /* ---------- suka & komentar ---------- */
  function reactionContent(button, name, label, count) {
    button.textContent = "";
    button.appendChild(icon(name));
    button.appendChild(el("span", {class: "sr-only", text: label + " "}));
    button.appendChild(el("span", {class: "reaction-count", "data-user-content": "", text: String(count || 0)}));
  }
  function socialBar(targetType, targetId, counts) {
    var wrap = el("div", { class: "social-bar" });
    var compact = targetType === "wanted";
    var liked = !!counts.liked;
    var likeBtn = el("button", {
      class: "btn btn-quiet btn-sm", type: "button",
      "aria-pressed": liked ? "true" : "false",
      text: (liked ? "Suka · " : "Suka  ") + (counts.likes || 0)
    });
    if (compact) reactionContent(likeBtn, "heart", "Suka", counts.likes);
    likeBtn.addEventListener("click", function () {
      requireAuth(function () {
        likeBtn.disabled = true;
        api("/api/likes", { method: "POST", body: { target_type: targetType, target_id: targetId } })
          .then(function (data) {
            if (compact) reactionContent(likeBtn, "heart", "Suka", data.likes);
            else likeBtn.textContent = (data.liked ? "Suka · " : "Suka  ") + data.likes;
            likeBtn.setAttribute("aria-pressed", data.liked ? "true" : "false");
          })
          .catch(function (err) { toast(err.message); })
          .then(function () { likeBtn.disabled = false; });
      });
    });
    var toggle = el("button", {
      class: "btn btn-quiet btn-sm", type: "button",
      "aria-expanded": "false",
      text: (counts.comments || 0) + " komentar"
    });
    var box = el("div", { class: "comment-slot" });
    if (compact) reactionContent(toggle, "comment", "Komentar", counts.comments);
    var loaded = false;
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      box.hidden = open;
      if (!open && !loaded) {
        loaded = true;
        box.appendChild(commentSection(targetType, targetId));
      }
    });
    box.hidden = true;
    wrap.appendChild(likeBtn);
    wrap.appendChild(toggle);
    wrap.appendChild(box);
    return wrap;
  }

  function commentSection(targetType, targetId) {
    var wrap = el("div", { class: "comment-box" });
    var listEl = el("div", {});
    var input = el("input", { type: "text", placeholder: "Tulis komentar", maxlength: "600" });
    var send = el("button", { class: "btn btn-sm btn-primary", type: "button", text: "Kirim" });

    function load() {
      api("/api/comments?target_type=" + targetType + "&target_id=" + encodeURIComponent(targetId))
        .then(function (data) {
          listEl.innerHTML = "";
          if (!data.items.length) {
            listEl.appendChild(el("p", { class: "card-meta", text: "Belum ada komentar." }));
            return;
          }
          data.items.forEach(function (c) {
            listEl.appendChild(el("div", { class: "comment" }, [
              el("div", { class: "comment-head" }, [
                el("strong", { text: c.author }),
                el("span", { class: "card-meta", text: " · " + timeAgo(c.created_at) })
              ]),
              el("p", { text: c.body })
            ]));
          });
        })
        .catch(function (err) { listEl.textContent = err.message; });
    }

    send.addEventListener("click", function () {
      var text = input.value.trim();
      if (!text) return;
      requireAuth(function () {
        send.disabled = true;
        api("/api/comments", { method: "POST",
          body: { target_type: targetType, target_id: targetId, body: text } })
          .then(function () { input.value = ""; load(); })
          .catch(function (err) { toast(err.message); })
          .then(function () { send.disabled = false; });
      });
    });

    wrap.appendChild(listEl);
    wrap.appendChild(el("div", { class: "comment-form" }, [input, send]));
    load();
    return wrap;
  }

  function replyWantedModal(w) {
    var sel = el("select", { id: "reply-listing" });
    sel.appendChild(el("option", { value: "", text: "Tanpa lampiran barang" }));
    var msg = el("textarea", { id: "reply-body", rows: "3", maxlength: "600", placeholder: "Ceritakan barangmu dan cara serah terima" });
    var err = el("p", { class: "form-error", hidden: null });
    var send = el("button", { class: "btn btn-primary", type: "button", text: "Kirim tanggapan" });

    api("/api/listings?owner=" + S.me.id + "&limit=50").then(function (data) {
      (data.items || []).forEach(function (i) {
        if (i.status !== "active") return;
        sel.appendChild(el("option", { value: i.id, text: i.title + " · " + rp(i.price) }));
      });
    }).catch(function () { /* daftar barang opsional */ });

    send.addEventListener("click", function () {
      err.hidden = true;
      send.disabled = true;
      api("/api/wanted/" + w.id + "/reply", {
        method: "POST", body: { listing_id: sel.value || "", body: msg.value.trim() }
      })
        .then(function () { toast("Tanggapan terkirim ke " + w.owner.name + "."); closeModals(); })
        .catch(function (ex) { err.textContent = ex.message; err.hidden = false; send.disabled = false; });
    });

    modalShell("modal-wanted-reply", "Tanggapi permintaan", [
      el("p", { class: "field-note", text: "Permintaan " + w.owner.name + ": " + w.title + " (" +
        rp(w.price_min) + " sampai " + rp(w.price_max) + ")" }),
      el("div", { class: "field" }, [el("label", { for: "reply-listing", text: "Lampirkan barangmu (opsional)" }), sel]),
      el("div", { class: "field", style: "margin-top:10px;" }, [el("label", { for: "reply-body", text: "Pesan" }), msg]),
      err, send
    ]);
    openModal("modal-wanted-reply");
  }

  /* ---------- api ---------- */

  /* ---------- tema ---------- */
  function applyTheme(mode) {
    if (mode === "light" || mode === "dark") document.documentElement.setAttribute("data-theme", mode);
    else document.documentElement.removeAttribute("data-theme");
  }

  function initTheme() {
    var saved = localStorage.getItem("bukatoko:theme");
    applyTheme(saved === "dark" ? "dark" : "light");
    var btn = qs("#theme-toggle");
    if (!btn) return;
    function label() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      btn.textContent = "";
      btn.appendChild(icon(dark ? "sun" : "moon"));
      btn.appendChild(el("span", {text: dark ? t("light") : t("dark")}));
      btn.setAttribute("aria-label", dark ? "Ganti ke tema terang" : "Ganti ke tema gelap");
    }
    label();
    btn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = dark ? "light" : "dark";
      function update() { applyTheme(next); localStorage.setItem("bukatoko:theme", next); label(); }
      if (window.BukatokoMotion) window.BukatokoMotion.theme(btn, update);
      else update();
    });
    btn._relabel = label;
  }

  /* ---------- toast ---------- */
  var toastTimer;
  function toast(msg) {
    var node = qs("#toast");
    if (!node) return;
    node.textContent = uiText(msg);
    node.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-on"); }, 2800);
  }

  /* ---------- foto placeholder ---------- */
  var PALETTES = [
    ["#F1EDFA", "#5B35A7"], ["#EEF5F0", "#286344"], ["#F2F0F6", "#605476"]
  ];

  var STOCK_PHOTOS = {
    l1001:20377495, l1002:18946640, l1003:5825422, l1004:6993182,
    l1005:29304264, l1006:6608247, l1007:7034089, l1008:36884742,
    l1009:38120058, l1010:25947097, l1011:12786598, l1012:29619139,
    l1013:6843241, l1014:5404459
  };
  function referencePhoto(seed) {
    var id = STOCK_PHOTOS[String(seed).split("-")[0]];
    return id ? "assets/stock/pexels-" + id + ".jpg" : null;
  }

  function photo(seed, label, ratio) {
    var stock = referencePhoto(seed);
    if (stock) return stock;
    var idx = 0;
    for (var i = 0; i < String(seed).length; i++) idx += String(seed).charCodeAt(i);
    var pal = PALETTES[idx % PALETTES.length];
    var w = 640, h = ratio === "landscape" ? 360 : 640;
    var subject = String(label || "").toLowerCase();
    var shapes = [
      [/kamera|camera|fujifilm/, '<rect x="25" y="34" width="78" height="50" rx="9"/><path d="m42 34 5-12h27l6 12"/><circle cx="65" cy="59" r="18"/><circle cx="65" cy="59" r="10"/><path d="M88 44h6"/>'],
      [/iphone|ponsel|phone/, '<rect x="43" y="10" width="44" height="87" rx="9"/><rect x="49" y="18" width="32" height="66" rx="4"/><path d="M59 91h12M60 13h10"/>'],
      [/sepatu|shoe|vans/, '<path d="m22 60 8-31 24 7 12 23 36 12q10 3 10 13v9H19V74q0-9 3-14Z"/><path d="M22 82h88M54 48l13-4M60 58l13-4M29 39l16 5"/>'],
      [/helm|helmet/, '<path d="M16 67a48 48 0 0 1 96 0v24H69L51 72H16Z"/><path d="M69 40h41M66 40v25h44M23 91h29"/>'],
      [/kulkas|fridge/, '<rect x="36" y="7" width="58" height="94" rx="6"/><path d="M36 39h58M45 22v10M45 52v18M44 101v4M86 101v4"/>'],
      [/buku|book/, '<path d="M64 28Q40 13 15 24v67q25-11 49 5 24-16 49-5V24Q88 13 64 28Z"/><path d="M64 28v68M26 38l25 3M26 50l25 3M77 41l25-3M77 53l25-3"/>'],
      [/gitar|guitar/, '<path d="m79 9 14 6-17 44q12 10 8 23c-5 19-28 23-43 10-15-14-9-35 7-39 9-2 13-7 15-13Z"/><circle cx="58" cy="75" r="9"/><path d="m51 88 16 5M66 61l19-45"/>'],
      [/sepeda|bike/, '<circle cx="29" cy="78" r="23"/><circle cx="100" cy="78" r="23"/><path d="m29 78 23-40 25 40H29l35-21 36 21-21-53h13M45 38h22"/>'],
      [/kopi|coffee|brew|grinder/, '<path d="M26 30h56v43a23 23 0 0 1-46 0V30M82 38h12a17 17 0 0 1 0 34H82M22 105h75M44 10v10M64 7v13"/>'],
      [/meja|table|rak|rumah/, '<path d="M12 35h104v14H12zM22 49v49M106 49v49M29 58h70M45 12h39v23"/>'],
      [/monitor|laptop|elektronik/, '<rect x="12" y="15" width="104" height="66" rx="6"/><path d="M12 70h104M64 81v16M43 99h42M23 27h82"/>'],
      [/jaket|fesyen|jacket/, '<path d="m44 19-27 16-9 41 23 6 8-28v47h50V54l8 28 23-6-9-41-27-16-20 12Z"/><path d="m44 19 20 12 20-12M64 31v70M47 70h-6M81 70h6"/>'],
      [/switch|game|hobi/, '<rect x="9" y="30" width="110" height="57" rx="13"/><rect x="32" y="36" width="64" height="45" rx="3"/><path d="M19 45v17M13 53h12M106 45v2M106 68v2"/>']
    ];
    var drawing = '<path d="m20 34 44-19 44 19v57L64 108 20 91Z"/><path d="m20 34 44 19 44-19M64 53v55M42 24l44 20"/>';
    shapes.some(function (entry) { if (!entry[0].test(subject)) return false; drawing=entry[1]; return true; });
    drawing = drawing.replace(/<(rect|circle)\b/g, '<$1 fill="#FFFFFF"')
      .replace(/<path d="([^"]*Z)"\/>/g, '<path fill="#FFFFFF" d="$1"/>');
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
      '<rect width="' + w + '" height="' + h + '" fill="' + pal[0] + '"/>' +
      '<ellipse cx="320" cy="' + (h * .73) + '" rx="190" ry="18" fill="' + pal[1] + '" opacity=".08"/>' +
      '<g transform="translate(128 ' + Math.round(h*.1) + ') scale(3)" fill="none" stroke="' + pal[1] + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + drawing + '</g>' +
      '<text x="50%" y="' + (h * 0.87) + '" text-anchor="middle" font-family="sans-serif" font-size="20" fill="' + pal[1] + '">foto contoh / sample illustration</text>' +
      "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- modal ---------- */
  var lastFocus = null;

  function modalShell(id, title, body, foot) {
    var back = qs("#" + id);
    if (back) back.remove();
    var back = el("div", { class: "modal-backdrop", id: id, hidden: null });
    var close = el("button", { class: "btn btn-quiet btn-sm modal-close", type: "button",
      "aria-label": "Tutup dialog", text: "Tutup" });
    close.addEventListener("click", closeModals);
    var box = el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": id + "-title" }, [
      el("div", { class: "modal-head" }, [el("h2", { id: id + "-title", text: title }), close])
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
    if (window.BukatokoMotion) window.BukatokoMotion.cancelExit(back);
    back.hidden = false;
    var f = back.querySelector("input, button, textarea, select, a[href]");
    if (f) f.focus();
    document.addEventListener("keydown", trap);
  }

  function closeModals() {
    qsa(".modal-backdrop").forEach(function (b) {
      if (window.BukatokoMotion) window.BukatokoMotion.exit(b);
      else b.hidden = true;
    });
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
    if (window.BukatokoPreview) { window.BukatokoPreview.notice(); return; }
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
    var mail = el("div", { class: "field mt-3" }, [
      el("label", { for: "auth-email", text: isLogin ? "Email atau nama" : "Email" }),
      el("input", { id: "auth-email", type: isLogin ? "text" : "email", autocomplete: "email", placeholder: "nama@email.com", required: null })
    ]);
    var pw = el("div", { class: "field mt-3" }, [
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
      class: "btn btn-quiet btn-sm btn-block mt-2", type: "button",
      text: isLogin ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"
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

  function resetModal() {
    var mail = el("input", { id: "reset-email", type: "text", autocomplete: "email", placeholder: "nama@email.com" });
    var code = el("input", { id: "reset-code", type: "text", inputmode: "numeric", placeholder: "6 angka" });
    var pw = el("input", { id: "reset-password", type: "password", autocomplete: "new-password", minlength: "8" });
    var info = el("p", { class: "field-note" });
    var err = el("p", { class: "form-error", hidden: null });

    var ask = el("button", { class: "btn btn-outline", type: "button", text: "Kirim kode" });
    ask.addEventListener("click", function () {
      err.hidden = true;
      ask.disabled = true;
      api("/api/reset/request", { method: "POST", body: { email: mail.value.trim() } })
        .then(function (data) {
          if (data.demo_reset_code) {
            info.textContent = "Mode demo tanpa email: kodenya " + data.demo_reset_code +
              " (berlaku " + (data.expires_minutes || 30) + " menit).";
            code.value = data.demo_reset_code;
          } else {
            info.textContent = data.message || "Cek email untuk kodenya.";
          }
        })
        .catch(function (ex) { err.textContent = ex.message; err.hidden = false; })
        .then(function () { ask.disabled = false; });
    });

    var save = el("button", { class: "btn btn-primary", type: "button", text: "Simpan sandi baru" });
    save.addEventListener("click", function () {
      err.hidden = true;
      save.disabled = true;
      api("/api/reset/confirm", { method: "POST",
        body: { email: mail.value.trim(), code: code.value.trim(), password: pw.value } })
        .then(function () { toast("Sandi diganti. Masuk dengan sandi baru."); authModal("login"); })
        .catch(function (ex) { err.textContent = ex.message; err.hidden = false; save.disabled = false; });
    });

    modalShell("modal-reset", "Lupa kata sandi", [
      el("p", { class: "field-note", text: "Masukkan email akunmu. Mesin ini belum punya SMTP, jadi kode reset ditampilkan di layar." }),
      el("div", { class: "field" }, [el("label", { for: "reset-email", text: "Email atau nama" }), mail]),
      ask,
      info,
      el("div", { class: "field", style: "margin-top:10px;" }, [el("label", { for: "reset-code", text: "Kode" }), code]),
      el("div", { class: "field", style: "margin-top:10px;" }, [el("label", { for: "reset-password", text: "Kata sandi baru" }), pw]),
      err,
      save
    ]);
    openModal("modal-reset");
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
          if (document.body.dataset.page === "akun") refreshPage();
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
          if (document.body.dataset.page === "akun") refreshPage();
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
      src: backendURL(real) || photo(item.id, item.title + " " + item.category),
      alt: (real ? "Foto barang: " : referencePhoto(item.id) ? "Foto referensi: " : "Foto contoh untuk ") + item.title,
      width: "640", height: "480", loading: "lazy", decoding: "async"
    });
    var title = el("a", { class: "card-title", href: "listing.html?id=" + encodeURIComponent(item.id), text: item.title });
    var foot = el("div", { class: "card-foot" }, [el("span", { class: "tag", text: rp(item.price) })]);
    if (item.old_price) foot.appendChild(el("span", { class: "tag tag-old", text: rp(item.old_price) }));
    var body = el("div", { class: "card-body" }, [
      foot, title,
      el("span", { class: "card-meta", text: item.condition }),
      el("span", { class: "card-meta card-location" }, [icon("location"), document.createTextNode(item.city)]),
      el("div", { class: "card-meta card-seller" }, [
        el("span", {"data-user-content":"",text:item.owner ? item.owner.name : ""}),
        document.createTextNode(" · "), el("span", {text:timeAgo(item.created_at)})])
    ]);
    var imageLink = el("a", { class: "card-image-link", href: "listing.html?id=" + encodeURIComponent(item.id),
      "aria-label": "Lihat " + item.title, tabindex: "-1" }, [media]);
    if (!real && referencePhoto(item.id)) imageLink.appendChild(el("span", {class:"photo-reference",text:"Foto referensi"}));
    var wrap = el("article", { class: "card" }, [imageLink, body]);
    if (item.status === "sold") {
      wrap.classList.add("is-sold");
      wrap.appendChild(el("span", { class: "sold-flag", text: "terjual" }));
    }
    return wrap;
  }

  function skeletons(n, target) {
    clearCards(target);
    target.innerHTML = "";
    for (var i = 0; i < n; i++) {
      target.appendChild(el("div", { class: "skel" }, [
        el("div", { class: "skel-media" }),
        el("div", { class: "skel-bar" }),
        el("div", { class: "skel-bar short" })
      ]));
    }
  }

  function clearCards(target) {
    if (window.BukatokoReact) window.BukatokoReact.clearCards(target);
    target.textContent = "";
  }

  function renderCards(target, items, append) {
    if (window.BukatokoReact) {
      window.BukatokoReact.renderCards(target, items, {
        photo: photo, referencePhoto: referencePhoto, backendURL: backendURL, timeAgo: timeAgo
      }, append);
    } else {
      if (!append) target.textContent = "";
      items.forEach(function (item) { target.appendChild(card(item)); });
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
        renderCards(railBaru, listings.slice(0, 8));
      }
      if (railTurun) {
        renderCards(railTurun, listings.filter(function (i) { return i.old_price; }).slice(0, 8));
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
        counts.hidden = !!window.BukatokoPreview;
        var aktif = listings.filter(function (i) { return i.status === "active"; }).length;
        counts.textContent = window.BukatokoPreview ? "" : "Server mencatat " + aktif + " barang aktif dan " + wanted.length +
            " permintaan. Angka ini dari basis data, bukan klaim pemasaran.";
      }
      if (homeState) homeState.hidden = true;
      paintRecent();
    }).catch(function (err) {
      if (railBaru) clearCards(railBaru);
      if (railTurun) clearCards(railTurun);
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
      status: p.get("status") || "active",
      foto: p.get("foto") || (p.get("has_photo") === "1" ? "1" : "")
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
    var requestVersion = 0;
    qsa(".quick-categories [data-category]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
        event.preventDefault();
        state.kat = link.dataset.category;
        syncForm();
        load(false);
      });
    });

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
      if (state.foto) p.set("has_photo", "1");
      return p;
    }

    function syncUrl() {
      var q = queryString().toString();
      updateRouteURL("jelajah.html" + (q ? "?" + q : ""));
      sessionStorage.setItem("bk_last_query", q);
    }

    function syncForm() {
      qs("#f-q").value = state.q;
      var mainQuery = qs("#q-global");
      if (mainQuery) mainQuery.value = state.q;
      qsa(".quick-categories [data-category]").forEach(function (link) {
        link.href = categoryHref(link.dataset.category, queryString().toString());
        if (link.dataset.category === state.kat) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      qs("#f-kat").value = state.kat;
      qs("#f-lok").value = state.city;
      qs("#f-kondisi").value = state.kondisi;
      qs("#f-min").value = state.min;
      qs("#f-max").value = state.max;
      qs("#f-urut").value = state.sort;
      var st = qs("#f-status");
      if (st) st.value = state.status;
      var ft = qs("#f-foto");
      if (ft) ft.value = state.foto;
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
      renderCards(grid, list, !replace);
    }

    function load(append) {
      var version = ++requestVersion;
      syncForm();
      var min = state.min === "" ? null : Number(state.min);
      var max = state.max === "" ? null : Number(state.max);
      if (min !== null && max !== null && min > max) {
        clearCards(grid);
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
      if (state.city) p.set("city", state.city);
      p.delete("lok");
      p.set("limit", "24");
      p.set("offset", String(offset));
      api("/api/listings?" + p.toString()).then(function (data) {
        if (version !== requestVersion) return;
        loading.hidden = true;
        items = append ? items.concat(data.items) : data.items;
        total = data.total;
        appendItems(data.items, !append);
        count.textContent = total + " " + t("results") + (state.city ? " di " + state.city : "");
        if (!items.length) {
          clearCards(grid);
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
        if (version !== requestVersion) return;
        loading.hidden = true;
        clearCards(grid);
        fail(stateBoxEl, err, function () { load(append); });
      });
    }

    var qInput = qs("#f-q");
    var saran = qs("#saran-q");
    if (qInput && saran) {
      var timer = 0;
      qInput.addEventListener("input", function () {
        var v = qInput.value.trim();
        clearTimeout(timer);
        if (v.length < 2) { saran.innerHTML = ""; return; }
        timer = setTimeout(function () {
          api("/api/suggest?q=" + encodeURIComponent(v)).then(function (data) {
            saran.innerHTML = "";
            (data.items || []).forEach(function (title) {
              saran.appendChild(el("option", { value: title }));
            });
          }).catch(function () { /* saran hanya pelengkap */ });
        }, 250);
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
      if (qs("#f-foto")) state.foto = qs("#f-foto").value;
      var details = qs("#filter-details");
      if (details && window.matchMedia("(max-width: 1024px)").matches) details.removeAttribute("open");
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
    if (details) {
      var compactFilters = window.matchMedia("(max-width: 1024px)");
      details.open = !compactFilters.matches;
      onPage(compactFilters,"change", function () { details.open = !compactFilters.matches; });
    }

    syncForm();
    load(false);
  }

  /* ---------- kategori ---------- */
  var KATEGORI = {
    elektronik: "Elektronik", ponsel: "Ponsel & Tablet", fesyen: "Fashion", rumah: "Rumah Tangga",
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

  function editModal(item) {
    var fields = el("div", { class: "form-grid" });
    var title = el("input", { id: "e-title", type: "text", value: item.title, maxlength: "90", required: null });
    var price = el("input", { id: "e-price", type: "number", inputmode: "numeric", min: "1", step: "1000", value: String(item.price), required: null });
    var city = el("input", { id: "e-city", type: "text", value: item.city, maxlength: "40", required: null });
    var desc = el("textarea", { id: "e-desc", rows: "4", maxlength: "2000" });
    desc.value = item.description || "";
    var kat = el("select", { id: "e-kat" });
    Object.keys(KATEGORI).forEach(function (k) {
      var o = el("option", { value: k, text: KATEGORI[k] });
      if (k === item.category) o.selected = true;
      kat.appendChild(o);
    });
    var cond = el("select", { id: "e-cond" });
    ["Bekas", "Seperti baru", "Baru"].forEach(function (c) {
      var o = el("option", { value: c, text: c });
      if (c === item.condition) o.selected = true;
      cond.appendChild(o);
    });

    fields.appendChild(el("div", { class: "field" }, [el("label", { for: "e-title", text: "Judul" }), title]));
    fields.appendChild(el("div", { class: "field" }, [el("label", { for: "e-price", text: "Harga (Rp)" }), price]));
    fields.appendChild(el("div", { class: "field" }, [el("label", { for: "e-kat", text: "Kategori" }), kat]));
    fields.appendChild(el("div", { class: "field" }, [el("label", { for: "e-cond", text: "Kondisi" }), cond]));
    fields.appendChild(el("div", { class: "field" }, [el("label", { for: "e-city", text: "Lokasi" }), city]));
    fields.appendChild(el("div", { class: "field", style: "grid-column:1/-1;" }, [el("label", { for: "e-desc", text: "Deskripsi" }), desc]));

    var photos = (item.photo_urls || []).slice();
    var photoWrap = el("div", { class: "edit-photos", id: "e-photos" });
    function paintPhotos() {
      photoWrap.innerHTML = "";
      if (!photos.length) {
        photoWrap.appendChild(el("p", { class: "field-note", text: "Tanpa foto. Barang tanpa foto tetap tayang, tapi lebih sulit dipercaya pembeli." }));
        return;
      }
      photos.forEach(function (url, i) {
        var cell = el("div", { class: "edit-photo" }, [
          el("img", { src: url, alt: "Foto " + (i + 1) + " " + item.title, width: "96", height: "96", loading: "lazy" })
        ]);
        var rm = el("button", { class: "btn btn-sm btn-danger", type: "button", text: "Hapus", "aria-label": "Hapus foto " + (i + 1) });
        rm.addEventListener("click", function () {
          photos.splice(i, 1);
          paintPhotos();
        });
        cell.appendChild(rm);
        photoWrap.appendChild(cell);
      });
    }
    paintPhotos();

    var fileInput = el("input", { id: "e-file", type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", multiple: null });
    fileInput.addEventListener("change", function () {
      var picked = Array.prototype.slice.call(fileInput.files || []).slice(0, 10 - photos.length);
      if (!picked.length) return;
      toast("Mengunggah " + picked.length + " foto...");
      Promise.all(picked.map(function (f) {
        return downscale(f, 1600).then(function (blob) {
          var fd = new FormData();
          fd.append("files", blob, f.name.replace(/\.\w+$/, "") + ".jpg");
          return fetch("/api/upload", { method: "POST", body: fd, credentials: "same-origin",
            headers: { "X-CSRF-Token": cookieValue("bk_csrf") } })
            .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "unggah gagal"); return d; }); });
        });
      })).then(function (res) {
        res.forEach(function (r) { (r.files || []).forEach(function (f) { photos.push(f.url); }); });
        paintPhotos();
        fileInput.value = "";
        toast("Foto ditambahkan. Tekan Simpan.");
      }).catch(function (err) { toast(err.message); });
    });

    var err = el("p", { class: "form-error", hidden: null, role: "alert" });
    var save = el("button", { class: "btn btn-primary", type: "submit", text: "Simpan perubahan" });
    var cancel = el("button", { class: "btn btn-outline", type: "button", text: "Batal" });
    cancel.addEventListener("click", function () { closeModals(); });
    var form = el("form", { id: "edit-form" }, [fields, el("div", { class: "field", style: "margin-top:14px;" },
      [el("label", { for: "e-file", text: "Tambah foto" }), fileInput]), photoWrap, err,
      el("div", { style: "display:flex;gap:8px;margin-top:14px;" }, [save, cancel])]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true;
      var payload = {
        title: title.value.trim(), price: parseInt(price.value, 10),
        category: kat.value, condition: cond.value, city: city.value.trim(),
        description: desc.value.trim(), photos: photos
      };
      if (!payload.title || payload.title.length < 5) { err.textContent = "Judul 5-90 karakter."; err.hidden = false; title.focus(); return; }
      if (!payload.price || payload.price <= 0) { err.textContent = "Harga harus angka lebih dari nol."; err.hidden = false; price.focus(); return; }
      if (!payload.city) { err.textContent = "Lokasi wajib diisi."; err.hidden = false; city.focus(); return; }
      save.disabled = true;
      api("/api/listings/" + item.id, { method: "PATCH", body: payload })
        .then(function () {
          toast(payload.price < item.price ? "Tersimpan. Harga turun, penyimpan diberi tahu." : "Perubahan tersimpan.");
          setTimeout(function () { refreshPage(); }, 700);
        })
        .catch(function (e2) { save.disabled = false; err.textContent = e2.message; err.hidden = false; });
    });

    modalShell("modal-edit", "Sunting barang", form);
    openModal("modal-edit");
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
      rememberViewed(item.id);
      render(item);
    }).catch(function (err) {
      document.body.classList.remove("is-loading");
      var code = err.status || 0;
      root.innerHTML = "";
      stateBox(root, {
        error: true,
        title: code === 404 ? "Barang tidak ditemukan" : "Gagal memuat barang",
        body: code === 404 ? "Tautan kedaluwarsa atau barang sudah dihapus penjual." : err.message,
        action: { label: "Lihat barang lain", onClick: function () { navigateTo("jelajah.html"); } }
      });
    });

    function render(item) {
      qs("#d-judul").setAttribute("data-user-content", "");
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
      if (item.description) qs("#d-deskripsi").setAttribute("data-user-content", "");

      var socialSlot = qs("#social-slot");
      if (socialSlot) {
        socialSlot.innerHTML = "";
        socialSlot.appendChild(socialBar("listing", item.id, item));
      }
      qs("#d-crumb").setAttribute("data-user-content", "");
      qs("#d-crumb").textContent = item.title;

      // kembali ke hasil dengan filter terakhir
      var back = qs("#back-link");
      if (back) {
        var q = S.lastQuery || sessionStorage.getItem("bk_last_query") || "";
        back.href = "jelajah.html" + (q ? "?" + q : "");
      }

      /* galeri */
      var urls = (item.photo_urls || []).map(backendURL);
      var count = urls.length || 1;
      var current = 1;
      var thumbs = qs("#thumbs");
      var galCount = qs("#gal-count");

      function src(n) { return urls[n - 1] || photo(item.id + (n === 1 ? "" : "-" + n), item.title + " " + item.category); }

      function show(n) {
        current = n;
        gallery.src = src(n);
        gallery.alt = urls[n - 1] ? "Foto " + n + " untuk " + item.title : (referencePhoto(item.id) ? "Foto referensi: " : "Foto contoh untuk ") + item.title;
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
            src: urls[n - 1] || photo(item.id + "-" + n, item.title + " " + item.category, "square"),
            alt: "", width: "68", height: "68", loading: "lazy"
          }));
          th.addEventListener("click", function () { show(n); });
          thumbs.appendChild(th);
        })(i);
      }
      show(1);
      if (!urls.length && referencePhoto(item.id)) thumbs.insertAdjacentElement("afterend", el("p", {class:"photo-reference-note",text:"Foto referensi stok; model dan kondisi bisa berbeda."}));

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
      qs("#gallery-open").addEventListener("click", function () {
        var body = [el("img", { src: src(current), alt: gallery.alt, width: "1280", height: "720", class: "zoom-image" })];
        modalShell("modal-lightbox", item.title, body);
        qs("#modal-lightbox-title").setAttribute("data-user-content", "");
        openModal("modal-lightbox");
      });

      /* penjual */
      var owner = item.owner || { name: "penjual", joined: "" };
      qs("#s-nama").textContent = owner.name;
      qs("#s-nama").setAttribute("data-user-content", "");
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
              el("strong", { "data-user-content":"", text: r.author }),
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
        var panel = qs("#owner-panel");
        if (panel) {
          var toolsCard = el("div", { class: "form-card", style: "margin-top:16px;" });
          toolsCard.appendChild(el("h2", { text: "Kelola barang ini", style: "font-size:18px;margin-bottom:10px;" }));
          var tools = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;" });
          if (item.status !== "sold") {
            var editBtn = el("button", { class: "btn btn-outline", type: "button", text: "Sunting barang" });
            editBtn.addEventListener("click", function () { editModal(item); });
            tools.appendChild(editBtn);
            var soldBtn = el("button", { class: "btn btn-outline", type: "button", text: "Tandai terjual" });
            soldBtn.addEventListener("click", function () {
              soldBtn.disabled = true;
              api("/api/listings/" + item.id + "/sold", { method: "POST" }).then(function () {
                toast("Barang ditandai terjual.");
                setTimeout(function () { refreshPage(); }, 600);
              }).catch(function (err) { soldBtn.disabled = false; toast(err.message); });
            });
            tools.appendChild(soldBtn);
          }
          var del = el("button", { class: "btn btn-danger", type: "button", text: "Hapus barang" });
          del.addEventListener("click", function () {
            if (!window.confirm("Hapus barang ini? Foto dan tawarannya ikut hilang.")) return;
            api("/api/listings/" + item.id, { method: "DELETE" }).then(function () {
              toast("Barang dihapus.");
              setTimeout(function () { navigateTo("akun.html"); }, 600);
            }).catch(function (err) { toast(err.message); });
          });
          tools.appendChild(del);
          toolsCard.appendChild(tools);
          panel.parentNode.insertBefore(toolsCard, panel.nextSibling);
        }

        if (item.expired || item.status === "removed") {
          var life = el("div", { class: "form-card", style: "margin-top:16px;" });
          if (item.status === "removed") {
            life.appendChild(el("p", { class: "form-error", text: "Barang ini diturunkan moderator dan tidak tampil ke publik. Kamu masih bisa melihatnya di sini." }));
          } else {
            life.appendChild(el("p", { class: "field-note", text: "Barang ini sudah kedaluwarsa dan tidak muncul di pencarian." }));
            var renew = el("button", { class: "btn btn-primary", type: "button", text: "Perpanjang 30 hari" });
            renew.addEventListener("click", function () {
              renew.disabled = true;
              api("/api/listings/" + item.id + "/renew", { method: "POST", body: {} })
                .then(function () { toast("Diperpanjang 30 hari."); setTimeout(function () { refreshPage(); }, 600); })
                .catch(function (err) { renew.disabled = false; toast(err.message); });
            });
            life.appendChild(renew);
          }
          panel.parentNode.insertBefore(life, panel.nextSibling);
        }

        if (item.deal && item.deal.is_party) {
          var dealBox = el("div", { class: "form-card", style: "margin-top:16px;" });
          dealBox.appendChild(el("h2", { text: "Transaksi", style: "font-size:18px;" }));
          dealBox.appendChild(el("p", { class: "card-meta",
            text: "Sepakat " + rp(item.deal.amount) + " dengan " + item.deal.buyer.name + " (pembeli) dan " +
              item.deal.seller.name + " (penjual)." }));
          if (item.deal.handover_at) {
            dealBox.appendChild(el("p", { class: "field-note", text: "Serah terima ditandai selesai " + timeAgo(item.deal.handover_at) + "." }));
          } else {
            dealBox.appendChild(el("p", { class: "field-note", text: "Belum ada tanda serah terima. Tandai setelah barang berpindah tangan." }));
            var hand = el("button", { class: "btn btn-outline", type: "button", text: "Tandai serah terima" });
            hand.addEventListener("click", function () {
              hand.disabled = true;
              api("/api/offers/" + item.deal.offer_id + "/handover", { method: "POST", body: {} })
                .then(function () { toast("Serah terima ditandai."); setTimeout(function () { refreshPage(); }, 600); })
                .catch(function (err) { hand.disabled = false; toast(err.message); });
            });
            dealBox.appendChild(hand);
          }
          panel.parentNode.insertBefore(dealBox, panel);
        }
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
        var url = window.BukatokoPreview ? window.BukatokoPreview.listingUrl(item.id) : API_ORIGIN
          ? new URL("listing.html?id=" + encodeURIComponent(item.id), location.href).href
          : location.origin + "/p/" + item.id;
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
        extra.appendChild(el("h2", { text: "Tawaran masuk (" + (item.offers || []).length + ")", class: "section-title" }));
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
                  setTimeout(function () { refreshPage(); }, 700);
                }).catch(function (err) { acc.disabled = false; toast(err.message); });
              });
              var dec = el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Tolak" });
              dec.addEventListener("click", function () {
                api("/api/offers/" + o.id + "/decline", { method: "POST" }).then(function () {
                  toast("Tawaran ditolak.");
                  setTimeout(function () { refreshPage(); }, 600);
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
          var soldBtn = el("button", { class: "btn btn-outline mt-3", type: "button", text: "Tandai terjual" });
          soldBtn.addEventListener("click", function () {
            soldBtn.disabled = true;
            api("/api/listings/" + item.id + "/sold", { method: "POST" }).then(function () {
              toast("Barang ditandai terjual.");
              setTimeout(function () { refreshPage(); }, 600);
            }).catch(function (err) { soldBtn.disabled = false; toast(err.message); });
          });
          extra.appendChild(soldBtn);
        }
        var del = el("button", { class: "btn btn-danger mt-3 owner-delete", type: "button", text: "Hapus barang" });
        del.addEventListener("click", function () {
          if (!window.confirm(uiText("Hapus barang ini? Foto dan tawarannya ikut hilang."))) return;
          api("/api/listings/" + item.id, { method: "DELETE" }).then(function () {
            toast("Barang dihapus.");
            setTimeout(function () { navigateTo("akun.html"); }, 600);
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
        var rsubmit = el("button", { class: "btn btn-primary mt-2", type: "button", text: "Kirim ulasan" });
        rsubmit.addEventListener("click", function () {
          rsubmit.disabled = true;
          api("/api/listings/" + item.id + "/reviews", { method: "POST", body: { stars: stars, body: rbody.value } })
            .then(function () { toast("Ulasan terkirim. Terima kasih."); setTimeout(function () { refreshPage(); }, 700); })
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
            el("div", { class: "field mt-3" }, [el("label", { for: "report-detail", text: "Keterangan" }), detail]),
            err
          ], foot);
          openModal("modal-report");
        });
      });

      qs("#block").addEventListener("click", function () {
        requireAuth(function () {
          if (item.is_owner) { toast("Ini barang kamu sendiri."); return; }
          if (!window.confirm(uiText("Blokir " + owner.name + "? Barang mereka tidak akan muncul lagi untukmu."))) return;
          api("/api/blocks", { method: "POST", body: { user_id: owner.id } })
            .then(function () { toast(owner.name + " diblokir."); setTimeout(function () { navigateTo("jelajah.html"); }, 700); })
            .catch(function (err) { toast(err.message); });
        });
      });

      /* barang sejenis */
      api("/api/listings?kat=" + encodeURIComponent(item.category) + "&limit=8").then(function (data) {
        var rail = qs("#rail-terkait");
        renderCards(rail, data.items.filter(function (x) { return x.id !== item.id; }).slice(0, 6));
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
        navigateTo("akun.html#pesan");
        return;
      }
      var box = el("div", { class: "chat-box", id: "chat-box" });
      var input = el("input", { id: "chat-input", type: "text", placeholder: "Tulis pesan untuk " + item.owner.name, maxlength: "1000" });
      var send = el("button", { class: "btn btn-primary", type: "button", text: t("send") });
      var foot = el("div", { class: "message-composer" }, [input, send]);
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
            class: "chat-bubble" + (m.mine ? " mine" : "")
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
    return pageRequest(files.reduce(function (chain, file, i) {
      return chain.then(function (urls) {
        return downscale(file, 1600).then(function (prepared) {
          var form = new FormData();
          form.append("photo", prepared, prepared.name || "foto.jpg");
          if (onProgress) onProgress(i + 1, files.length);
          return fetch(backendURL("/api/upload"), { method: "POST", body: form, headers: csrfHeaders("POST"), credentials: API_ORIGIN ? "include" : "same-origin" })
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
    }, Promise.resolve([])));
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
          if(window.BukatokoRouter)window.BukatokoRouter.checkpoint();
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
    var nearbyCity = qs("#nearby-city");
    if (nearbyCity) {
      qsa("#w-lokasi option").forEach(function (option) { if (option.value) nearbyCity.appendChild(option.cloneNode(true)); });
      nearbyCity.value = new URLSearchParams(location.search).get("lok") || "";
      nearbyCity.addEventListener("change", function () {
        var params = new URLSearchParams(location.search);
        if (nearbyCity.value) params.set("lok", nearbyCity.value); else params.delete("lok");
        updateRouteURL(location.pathname + (params.toString() ? "?" + params.toString() : ""));
        load();
      });
    }

    function paint(rows) {
      list.innerHTML = "";
      if (!rows.length) {
        stateBox(list, nearbyCity && nearbyCity.value ? {
          title: "Belum ada permintaan di kota ini", body: "Pilih kota lain atau tampilkan semua lokasi."
        } : { title: "Belum ada permintaan", body: "Jadilah yang pertama menulis barang yang kamu cari." });
        return;
      }
      rows.forEach(function (w) {
        var mine = !!(S.me && w.owner && w.owner.name === S.me.name);
        var actions = el("div", { class: "wanted-side" }, [
          el("div", { class: "wanted-budget" }, [el("span", { class: "tag", text: rp(w.price_min) + " - " + rp(w.price_max) })])
        ]);
        if (!mine) {
          var replyBtn = el("button", { class: "btn btn-primary btn-sm", type: "button", text: "Saya punya barangnya" });
          replyBtn.addEventListener("click", function () {
            requireAuth(function () { replyWantedModal(w); });
          });
          actions.appendChild(replyBtn);
        }
        actions.appendChild(el("a", { class: "btn btn-outline btn-sm",
          href: "jelajah.html?kat=" + encodeURIComponent(w.category), text: "Lihat barang sejenis" }));
        if (mine) {
          var del = el("button", { class: "btn btn-sm btn-danger", type: "button", text: "Hapus" });
          del.addEventListener("click", function () {
            api("/api/wanted/" + w.id, { method: "DELETE" }).then(function () { load(); refreshMe(); })
              .catch(function (err) { toast(err.message); });
          });
          actions.appendChild(del);
        }

        var replies = el("div", { class: "wanted-replies" });
        var replyToggle = el("button", { class: "btn btn-quiet btn-sm", type: "button",
          "aria-expanded": "false", text: (w.replies || 0) + " tanggapan" });
        reactionContent(replyToggle, "reply", "Tanggapan", w.replies);
        replyToggle.addEventListener("click", function () {
          var open = replyToggle.getAttribute("aria-expanded") === "true";
          replyToggle.setAttribute("aria-expanded", open ? "false" : "true");
          replies.hidden = open;
          if (!open) {
            replies.innerHTML = "";
            api("/api/wanted/" + w.id + "/replies").then(function (data) {
              if (!data.items.length) {
                replies.appendChild(el("p", { class: "card-meta", text: "Belum ada yang menanggapi." }));
                return;
              }
              data.items.forEach(function (r) {
                replies.appendChild(el("div", { class: "comment" }, [
                  el("div", { class: "comment-head" }, [
                    el("strong", { text: r.author }),
                    el("span", { class: "card-meta", text: " · " + timeAgo(r.created_at) })
                  ]),
                  el("p", { text: r.body }),
                  r.listing_id ? el("a", { class: "card-meta", href: "listing.html?id=" + encodeURIComponent(r.listing_id),
                    text: "Lihat barang: " + (r.listing_title || r.listing_id) }) : null
                ]));
              });
            }).catch(function (err) { replies.textContent = err.message; });
          }
        });
        replies.hidden = true;
        var social = socialBar("wanted", w.id, w);
        var comments = qs(".comment-slot", social);
        social.removeChild(comments);

        list.appendChild(el("article", { class: "wanted-item" }, [
          el("div", {}, [
            el("h3", { text: w.title }),
            el("span", { class: "card-meta" }, [
              el("span", {text:kategoriName(w.category) + " · " + w.city + " · " + timeAgo(w.created_at)}),
              document.createTextNode(" · "), el("span", {"data-user-content":"",text:w.owner.name})]),
            el("p", { class: "wanted-note", text: w.note })
          ]),
          el("div", {class: "wanted-footer"}, [actions,
            el("div", {class: "wanted-social"}, [social, replyToggle])]),
          comments,
          replies
        ]));
      });
    }

    function load() {
      skeletons(2, list);
      return api("/api/wanted").then(function (data) {
        // The existing endpoint returns up to 60 recent requests and has no city filter.
        paint(data.items.filter(function (item) { return !nearbyCity || !nearbyCity.value || item.city === nearbyCity.value; }));
      })
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
          if(window.BukatokoRouter)window.BukatokoRouter.checkpoint();
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
      stateBox(root, { title: "Nama pengguna kosong", body: "Buka profil dari halaman barang.", action: { label: "Jelajah", onClick: function () { navigateTo("jelajah.html"); } } });
      return;
    }
    skeletons(3, qs("#profil-listings"));
    var sortSel = qs("#p-sort");
    var lastReviews = [];
    function paintReviews() {
      var reviews = qs("#profil-reviews");
      reviews.innerHTML = "";
      var rows = lastReviews.slice();
      if (sortSel && sortSel.value === "tinggi") rows.sort(function (a, b) { return b.stars - a.stars; });
      if (sortSel && sortSel.value === "rendah") rows.sort(function (a, b) { return a.stars - b.stars; });
      if (!rows.length) {
        reviews.appendChild(el("p", { class: "card-meta", text: "Belum ada ulasan." }));
        return;
      }
      rows.forEach(function (r) {
        reviews.appendChild(el("div", { class: "review" }, [
          el("div", { class: "review-head" }, [
            el("strong", { "data-user-content": "", text: r.author }),
            el("span", { text: "· " + r.role }),
            el("span", { class: "stars", text: "★".repeat(r.stars) + "☆".repeat(5 - r.stars) }),
            el("span", { text: "· " + timeAgo(r.created_at) })
          ]),
          el("p", { class: "card-meta", text: r.body })
        ]));
      });
    }
    if (sortSel) sortSel.addEventListener("change", paintReviews);
    api("/api/users/" + encodeURIComponent(name)).then(function (data) {
      qs("#p-nama").textContent = data.user.name;
      qs("#p-avatar").textContent = data.user.name.slice(0, 1).toUpperCase();
      qs("#p-bergabung").textContent = "Bergabung " + data.user.joined;
      qs("#p-rating").textContent = data.rating.count
        ? String(data.rating.average).replace(".", ",") + " dari " + data.rating.count + " ulasan"
        : "Belum ada ulasan";
      var list = qs("#profil-listings");
      clearCards(list);
      if (!data.listings.length) {
        stateBox(list, { title: "Belum ada barang", body: "Penjual ini belum memasang barang." });
      } else {
        renderCards(list, data.listings);
      }
      var bars = qs("#p-bars");
      if (bars) {
        bars.innerHTML = "";
        var dist = data.rating && data.rating.distribution;
        if (data.rating.count && dist) {
          var wrapBars = el("div", { class: "rating-bars", role: "img",
            "aria-label": "Sebaran " + data.rating.count + " ulasan: " +
              [5, 4, 3, 2, 1].map(function (s) { return (dist[String(s)] || 0) + " bintang " + s; }).join(", ") });
          [5, 4, 3, 2, 1].forEach(function (star) {
            var n = dist[String(star)] || 0;
            var pct = Math.round((n / data.rating.count) * 100);
            wrapBars.appendChild(el("div", { class: "rating-bar" }, [
              el("span", { text: star + " bintang" }),
              el("span", { class: "track" }, [el("span", { class: "fill", style: "width:" + pct + "%" })]),
              el("span", { class: "n", text: String(n) })
            ]));
          });
          bars.appendChild(wrapBars);
        }
      }
      lastReviews = data.reviews;
      paintReviews();
      if (data.is_self) qs("#p-block").hidden = true;
      qs("#p-block").addEventListener("click", function () {
        requireAuth(function () {
          if (!window.confirm(uiText("Blokir " + data.user.name + "?"))) return;
          api("/api/blocks", { method: "POST", body: { user_id: data.user.id } })
            .then(function () { toast("Diblokir."); setTimeout(function () { navigateTo("jelajah.html"); }, 600); })
            .catch(function (err) { toast(err.message); });
        });
      });
    }).catch(function (err) {
      fail(root, err, function () { refreshPage(); });
    });
  }

  /* ---------- akun ---------- */
  function threadModal(listingId, otherId, title) {
    var box = el("div", { class: "chat-box", id: "thread-box" });
    var input = el("input", { id: "thread-input", type: "text", placeholder: "Tulis balasan", maxlength: "1000" });
    var send = el("button", { class: "btn btn-primary", type: "button", text: t("send") });
    modalShell("modal-thread", title, [box, el("div", { class: "message-composer" }, [input, send])]);
    openModal("modal-thread");

    function paint(msgs) {
      box.innerHTML = "";
      if (!msgs.length) box.appendChild(el("p", { class: "card-meta", text: "Belum ada pesan." }));
      msgs.forEach(function (m) {
        box.appendChild(el("div", {
          class: "chat-bubble" + (m.mine ? " mine" : "")
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
    var tabLayout = window.matchMedia("(max-width: 860px)");
    function orientTabs() { qs(".tabs").setAttribute("aria-orientation", tabLayout.matches ? "horizontal" : "vertical"); }
    orientTabs();
    onPage(tabLayout,"change", orientTabs);
    var panels = {
      disimpan: qs("#panel-disimpan"),
      barang: qs("#panel-barang"),
      permintaan: qs("#panel-permintaan"),
      tawaran: qs("#panel-tawaran"),
      pesan: qs("#panel-pesan"),
      pencarian: qs("#panel-pencarian"),
      notifikasi: qs("#panel-notifikasi"),
      transaksi: qs("#panel-transaksi")
    };
    var needLogin = qs("#akun-need-login");
    var content = qs("#akun-content");
    var current = (location.hash || "").replace("#", "") || "disimpan";
    if (!panels[current]) current = "disimpan";

    function row(opts) {
      var r = el("div", { class: "row-item" });
      if (opts.src !== undefined) {
        r.appendChild(el("img", {
          class: "row-thumb", src: backendURL(opts.src) || photo(opts.id, opts.label || opts.title || ""),
          alt: opts.alt || "Foto contoh", width: "160", height: "90", loading: "lazy"
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
      if (opts.noThumb || opts.src === undefined) r.classList.add("no-thumb");
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
      var notif = qs("#c-notif");
      if (notif) {
        notif.textContent = me.counts.notif > 9 ? "9+" : String(me.counts.notif || 0);
        notif.hidden = !me.counts.notif;
      }
    }

    function loadSaved() {
      var p = panels.disimpan;
      skeletons(2, p);
      return api("/api/saved").then(function (data) {
        p.innerHTML = "";
        if (!data.items.length) {
          panelState(p, "Belum ada barang yang disimpan.", { label: "Jelajah barang", onClick: function () { navigateTo("jelajah.html"); } });
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
          panelState(p, "Belum ada barang yang kamu pasang.", { label: "Pasang barang", onClick: function () { navigateTo("jual.html"); } });
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
              if (!window.confirm(uiText("Hapus barang ini?"))) return;
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
          panelState(p, "Belum ada permintaan yang kamu tulis.", { label: "Tulis permintaan", onClick: function () { navigateTo("cari.html"); } });
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
          p.appendChild(el("h2", { text: "Masuk (penjual)", class: "section-title" }));
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
          p.appendChild(el("h2", { text: "Keluar (pembeli)", class: "section-title-spaced" }));
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
        if (!any) panelState(p, "Belum ada tawaran.", { label: "Jelajah barang", onClick: function () { navigateTo("jelajah.html"); } });
      }).catch(function (err) { fail(p, err, loadOffers); });
    }

    function loadInbox() {
      var p = panels.pesan;
      skeletons(2, p);
      return api("/api/inbox").then(function (data) {
        p.innerHTML = "";
        if (!data.threads.length) {
          panelState(p, "Belum ada percakapan.", { label: "Cari barang", onClick: function () { navigateTo("jelajah.html"); } });
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
          panelState(p, "Belum ada pencarian tersimpan.", { label: "Cari barang", onClick: function () { navigateTo("jelajah.html"); } });
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

    function loadDeals() {
      var p = panels.transaksi;
      skeletons(2, p);
      return api("/api/deals").then(function (data) {
        p.innerHTML = "";
        if (!data.items.length) {
          panelState(p, "Belum ada transaksi. Transaksi muncul setelah penjual menerima tawaran.",
            { label: "Jelajah barang", onClick: function () { navigateTo("jelajah.html"); } });
          return;
        }
        data.items.forEach(function (d) {
          var acts = [{
            label: "Buka barang", onClick: function () { location.href = "listing.html?id=" + encodeURIComponent(d.listing_id); }
          }];
          if (!d.handover_at) {
            acts.push({
              label: "Tandai serah terima", onClick: function (btn) {
                btn.disabled = true;
                api("/api/offers/" + d.offer_id + "/handover", { method: "POST", body: {} })
                  .then(function () { loadDeals(); })
                  .catch(function (err) { btn.disabled = false; toast(err.message); });
              }
            });
          }
          p.appendChild(row({
            noThumb: true, title: d.title,
            meta: rp(d.amount) + " · kamu " + d.side + " · dengan " + d.with.name,
            extra: (d.handover_at ? "Serah terima ditandai " + timeAgo(d.handover_at) : "Menunggu serah terima") +
              " · deal " + timeAgo(d.accepted_at),
            actions: acts
          }));
        });
      }).catch(function (err) { fail(p, err, loadDeals); });
    }

    function loadNotifs() {
      var p = panels.notifikasi;
      skeletons(2, p);
      return api("/api/notifications").then(function (data) {
        p.innerHTML = "";
        if (!data.items.length) {
          panelState(p, "Belum ada notifikasi.", { label: "Jelajah barang", onClick: function () { navigateTo("jelajah.html"); } });
          return;
        }
        var head = el("div", { class: "notif-head" });
        head.appendChild(el("p", { class: "field-note", text: data.unread_events + " belum dibaca dari " + data.items.length + " notifikasi terakhir." }));
        var markAll = el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Tandai semua dibaca" });
        markAll.disabled = !data.unread_events;
        markAll.addEventListener("click", function () {
          markAll.disabled = true;
          api("/api/notifications/read", { method: "POST", body: {} })
            .then(function () { return refreshMe(); }).then(loadNotifs)
            .catch(function (err) { markAll.disabled = false; toast(err.message); });
        });
        head.appendChild(markAll);
        p.appendChild(head);

        var labels = {
          offer: "Tawaran masuk", accepted: "Tawaran diterima", declined: "Tawaran ditolak",
          withdrawn: "Tawaran ditarik", message: "Pesan baru", review: "Ulasan baru",
          wanted: "Cocok dengan permintaanmu", price_drop: "Harga turun", sold: "Sudah terjual",
          comment: "Komentar baru", wanted_reply: "Tanggapan permintaan"
        };
        data.items.forEach(function (n) {
          var acts = [{
            label: "Buka", onClick: function () {
              location.href = n.listing_id ? "listing.html?id=" + n.listing_id : "akun.html#pesan";
            }
          }];
          if (!n.read) {
            acts.push({
              label: "Tandai", onClick: function (btn) {
                btn.disabled = true;
                api("/api/notifications/read", { method: "POST", body: { ids: [n.id] } })
                  .then(function () { return refreshMe(); }).then(loadNotifs)
                  .catch(function (err) { btn.disabled = false; toast(err.message); });
              }
            });
          }
          p.appendChild(row({
            noThumb: true,
            title: (labels[n.kind] || "Notifikasi") + (n.read ? "" : " · baru"),
            meta: n.body,
            extra: (n.listing_title ? n.listing_title + " · " : "") + timeAgo(n.created_at),
            actions: acts
          }));
        });
        refreshMe();
      }).catch(function (err) { fail(p, err, loadNotifs); });
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
      tawaran: loadOffers, pesan: loadInbox, pencarian: loadSearches,
      notifikasi: loadNotifs, transaksi: loadDeals
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
      updateRouteURL("akun.html#" + tab);
      if (S.me) loaders[tab]();
    }

    tabs.forEach(function (b, i) {
      b.addEventListener("click", function () { select(b.dataset.tab); });
      b.addEventListener("keydown", function (e) {
        if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        var n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 :
          (e.key === "ArrowRight" || e.key === "ArrowDown") ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
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

      var vb = qs("#verify-banner");
      if (vb) {
        vb.hidden = !!S.me.email_verified;
        if (!vb.hidden && !vb.dataset.wired) {
          vb.dataset.wired = "1";
          qs("#verify-send").addEventListener("click", function () {
            api("/api/verify/resend", { method: "POST", body: {} }).then(function (data) {
              if (data.demo_verify_code) {
                qs("#verify-note").textContent = "Mode demo: kodenya " + data.demo_verify_code;
                qs("#verify-code").value = data.demo_verify_code;
              } else {
                qs("#verify-note").textContent = "Kode dikirim ke email.";
              }
            }).catch(function (err) { toast(err.message); });
          });
          qs("#verify-submit").addEventListener("click", function () {
            api("/api/verify", { method: "POST", body: { code: qs("#verify-code").value.trim() } })
              .then(function () { return refreshMe(); })
              .then(function () { gate(); toast("Email terverifikasi."); })
              .catch(function (err) { toast(err.message); });
          });
        }
      }
      if (S.me.role === "moderator" && !qs("#mod-link")) {
        var ml = el("a", { class: "btn btn-outline btn-sm", id: "mod-link", href: "moderasi.html",
          text: "Panel moderator", style: "margin-top:10px;display:inline-block;" });
        qs("#akun-nama").parentNode.appendChild(ml);
      }
      return true;
    }

    qs("#akun-login").addEventListener("click", function () {
      authModal("login");
      window.__afterAuth = function () { refreshMe().then(function () { if (gate()) select(current); }); };
    });

    // tautan #pesan / #tawaran dari halaman lain
    onPage(window,"hashchange", function () {
      var h = (location.hash || "").replace("#", "");
      if (panels[h] && h !== current) select(h);
    });

    if (gate()) select(current);
  }

  /* ---------- boot ---------- */
  function initModerasi() {
    var list = qs("#mod-list");
    var state = qs("#mod-state");
    if (!S.me) {
      stateBox(state, {
        title: "Masuk sebagai moderator",
        body: "Panel ini hanya terbuka untuk akun dengan peran moderator.",
        action: { label: "Masuk", onClick: function () { authModal("login"); } }
      });
      return;
    }
    if (S.me.role !== "moderator") {
      stateBox(state, {
        title: "Akun ini bukan moderator",
        body: "Peran akun " + S.me.name + " adalah pengguna biasa.",
        action: { label: "Ke akun saya", onClick: function () { navigateTo("akun.html"); } }
      });
      return;
    }
    state.innerHTML = "";

    function load() {
      skeletons(3, list);
      return api("/api/reports").then(function (data) {
        list.innerHTML = "";
        if (!data.items.length) {
          stateBox(list, { title: "Tidak ada laporan terbuka", body: "Antrean bersih. Laporan baru muncul di sini." });
          return;
        }
        data.items.forEach(function (r) {
          var rowEl = el("div", { class: "row-item" }, [
            el("div", { class: "row-body" }, [
              el("h3", { text: r.listing_title || "(barang sudah dihapus)" }),
              el("div", { class: "card-meta", text: r.reason + " · dilaporkan " + r.reporter + " · " + timeAgo(r.created_at) }),
              el("div", { class: "card-meta", text: r.detail || "tanpa keterangan tambahan" })
            ])
          ]);
          var actions = el("div", { class: "row-actions" });
          function act(label, action, variant, confirmText) {
            var b = el("button", { class: "btn btn-sm " + (variant || "btn-outline"), type: "button", text: label });
            b.addEventListener("click", function () {
              if (confirmText && !window.confirm(confirmText)) return;
              b.disabled = true;
              api("/api/reports/" + r.id + "/resolve", { method: "POST", body: { action: action } })
                .then(function () { toast("Laporan ditindak: " + action + "."); load(); })
                .catch(function (err) { b.disabled = false; toast(err.message); });
            });
            actions.appendChild(b);
          }
          act("Abaikan", "dismiss");
          if (r.listing_id) act("Turunkan barang", "remove_listing", "btn-danger",
            "Turunkan barang ini dari daftar publik?");
          if (r.listing_id) act("Bekukan penjual", "suspend_user", "btn-danger",
            "Bekukan akun penjual dan turunkan semua barang aktifnya?");
          rowEl.appendChild(actions);
          list.appendChild(rowEl);
        });
      }).catch(function (err) { fail(list, err, load); });
    }
    load();
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
    else if (page === "moderasi") initModerasi();
  }

  function activatePage() {
    initShell(); applyLang(); paintUser();
    if (window.BukatokoLocation) window.BukatokoLocation.init();
    return refreshMe().catch(function () { S.me = null; paintUser(); }).then(bootPage);
  }
  function boot() {
    if (window.BukatokoRedirecting) return;
    if (window.BukatokoRouter) window.BukatokoRouter.prepare();
    initShell(); applyLang(); initTheme(); initAuth();
    if (window.BukatokoMotion) window.BukatokoMotion.init();
    if (window.BukatokoLocation) window.BukatokoLocation.init();
    S.lastQuery = sessionStorage.getItem("bk_last_query") || "";
    boot.page = function () { applyLang(); if(document.body.dataset.page === "akun")refreshPage(); };
    if (window.BukatokoRouter) window.BukatokoRouter.start({
      before: function () {
        pageEpoch++; pageCleanups.splice(0).forEach(function (dispose) { dispose(); });
        if (window.BukatokoReact) qsa('#main .grid,#main .rail-track,#main .recent-rail').forEach(function (node) {window.BukatokoReact.clearCards(node);});
        closeModals(); window.__afterAuth = null;
      },
      after: activatePage
    });
    refreshMe().catch(function () { S.me = null; paintUser(); }).then(bootPage);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


