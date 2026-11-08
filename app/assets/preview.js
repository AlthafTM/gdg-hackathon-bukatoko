(function () {
  "use strict";
  var root = new URL("../", document.currentScript.src);
  var snapshot;
  var message = "Fitur ini belum tersedia di halaman ini.";
  function denied(status, text) {
    var error = new Error(text);
    error.status = status;
    return Promise.reject(error);
  }
  function listings(data, p) {
    var items = data.listings.filter(function (item) {
      var q = (p.get("q") || "").toLowerCase();
      return (!q || (item.title + " " + item.description + " " + item.category).toLowerCase().includes(q)) &&
        (!p.get("kat") || item.category === p.get("kat")) &&
        (!p.get("city") || item.city === p.get("city")) &&
        (!p.get("owner") || String(item.owner.id) === p.get("owner")) &&
        (!p.get("ids") || p.get("ids").split(",").includes(item.id)) &&
        (!(p.get("foto") === "1" || p.get("has_photo") === "1") || !!(item.photo_urls && item.photo_urls.length)) &&
        (!p.get("kondisi") || item.condition.includes(p.get("kondisi"))) &&
        (!p.get("min") || item.price >= Number(p.get("min"))) &&
        (!p.get("max") || item.price <= Number(p.get("max"))) &&
        (!p.get("status") || p.get("status") === "all" || item.status === p.get("status"));
    });
    items.sort(function (a, b) {
      if (p.get("sort") === "murah") return a.price - b.price;
      if (p.get("sort") === "mahal") return b.price - a.price;
      return b.created_at.localeCompare(a.created_at);
    });
    var limit = Math.min(100, Math.max(1, Number(p.get("limit")) || 24));
    var offset = Math.max(0, Number(p.get("offset")) || 0);
    return {items: items.slice(offset, offset + limit), total: items.length,
      limit: limit, offset: offset, has_more: offset + limit < items.length};
  }
  window.BukatokoPreview = {
    notice: function () { window.alert(window.BukatokoLocale ? window.BukatokoLocale.text(message) : message); },
    listingUrl: function (id) { return new URL("listing.html?id=" + encodeURIComponent(id), root).href; },
    request: function (path, opts) {
      if (opts && opts.method && opts.method.toUpperCase() !== "GET") return denied(403, message);
      if (!snapshot) snapshot = fetch(new URL("assets/preview-data.json", root)).then(function (r) {
        if (!r.ok) throw new Error("Data contoh gagal dimuat. Muat ulang halaman.");
        return r.json();
      }).catch(function (error) { snapshot = null; throw error; });
      return snapshot.then(function (data) {
        var url = new URL(path, root), route = url.pathname;
        if (route === "/api/me") return {user: null};
        if (route === "/api/listings") return listings(data, url.searchParams);
        if (route === "/api/wanted") return {items: data.wanted, total: data.wanted.length};
        if (route === "/api/suggest") {
          var needle = (url.searchParams.get("q") || "").toLowerCase();
          return {items: data.listings.filter(function (item) { return needle && item.title.toLowerCase().includes(needle); }).slice(0,6).map(function (item) { return item.title; })};
        }
        if (route === "/api/comments" || /^\/api\/wanted\/[^/]+\/replies$/.test(route)) return {items:[],total:0};
        var match = route.match(/^\/api\/listings\/([^/]+)$/);
        if (match) {
          var item = data.listings.find(function (i) { return i.id === decodeURIComponent(match[1]); });
          return item ? Object.assign({}, item, {is_owner: false, rating: {count: 0, average: null},
            reviews: [], can_review: false, offers: []}) : denied(404, "Barang tidak ditemukan.");
        }
        match = route.match(/^\/api\/users\/([^/]+)$/);
        if (match) {
          var user = data.users.find(function (u) { return u.name === decodeURIComponent(match[1]); });
          return user ? {user: Object.assign({}, user, {blocked: false}), rating: {count: 0, average: null},
            reviews: [], listings: data.listings.filter(function (i) { return i.owner.id === user.id; }),
            is_self: false} : denied(404, "Pengguna tidak ditemukan.");
        }
        return denied(401, message);
      });
    }
  };
}());
