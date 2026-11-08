(function () {
  "use strict";
  // Approximate city centres match the existing API's city-only location model.
  var cities = [
    ["Bandung", -6.9175, 107.6191], ["Jakarta Selatan", -6.2615, 106.8106],
    ["Jakarta Pusat", -6.1865, 106.8340], ["Jakarta Barat", -6.1683, 106.7588],
    ["Surabaya", -7.2575, 112.7521], ["Yogyakarta", -7.7956, 110.3695],
    ["Semarang", -6.9667, 110.4167], ["Malang", -7.9666, 112.6326],
    ["Denpasar", -8.6705, 115.2126], ["Tangerang", -6.1783, 106.6319],
    ["Bekasi", -6.2383, 106.9756], ["Sleman", -7.7167, 110.3500]
  ];
  function nearest(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    var rad = Math.PI / 180, best = null;
    cities.forEach(function (city) {
      var dlat = (city[1] - latitude) * rad, dlon = (city[2] - longitude) * rad;
      var a = Math.sin(dlat / 2) ** 2 + Math.cos(latitude * rad) * Math.cos(city[1] * rad) * Math.sin(dlon / 2) ** 2;
      var km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
      if (!best || km < best.km) best = {city: city[0], km: km};
    });
    return best && best.km <= 80 ? best : null;
  }
  function init() {
    var button = document.querySelector("#nearby-button");
    if (!button) return;
    var status = document.querySelector("#nearby-status");
    var select = document.querySelector("#nearby-city") || document.querySelector("#f-lok");
    function say(message) { status.textContent = window.BukatokoLocale ? window.BukatokoLocale.text(message) : message; }
    button.addEventListener("click", function () {
      if (!window.isSecureContext || !navigator.geolocation) {
        say("Lokasi tidak tersedia. Pilih kota secara manual."); return;
      }
      button.disabled = true;
      say("Mencari lokasi perangkat…");
      navigator.geolocation.getCurrentPosition(function (position) {
        button.disabled = false;
        var match = nearest(position.coords.latitude, position.coords.longitude);
        if (!match) { say("Belum ada kota yang didukung di dekatmu. Pilih kota secara manual."); return; }
        select.value = match.city;
        select.dispatchEvent(new Event("change", {bubbles: true}));
        if (select.id === "f-lok") document.querySelector("#filter-form").requestSubmit();
        say("Kota terdekat dipilih. Hasil berdasarkan kota, bukan jarak pasti.");
      }, function (error) {
        button.disabled = false;
        say(error.code === 1 ? "Izin lokasi ditolak. Pilih kota secara manual." : "Lokasi belum ditemukan. Coba lagi atau pilih kota.");
      }, {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000});
    });
  }
  window.BukatokoLocation = {nearest: nearest, init: init};
}());
