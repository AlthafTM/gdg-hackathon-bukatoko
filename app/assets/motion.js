(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var transitionBusy = false;
  function theme(button, update) {
    if (transitionBusy) return Promise.resolve();
    if (reduced.matches) { update(); return Promise.resolve(); }
    if (!document.startViewTransition || !document.documentElement.animate) {
      document.documentElement.classList.add("theme-fade");
      update();
      window.setTimeout(function () { document.documentElement.classList.remove("theme-fade"); }, 340);
      return Promise.resolve();
    }
    transitionBusy = true;
    var rect = button.getBoundingClientRect();
    var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var transition;
    var updated = false;
    function commit() { if (!updated) { updated = true; update(); } }
    try { transition = document.startViewTransition(commit); }
    catch (error) { commit(); transitionBusy = false; return Promise.resolve(); }
    return transition.ready.then(function () {
      return document.documentElement.animate({clipPath: [
        "circle(0px at " + x + "px " + y + "px)",
        "circle(" + radius + "px at " + x + "px " + y + "px)"
      ]}, {duration: 620, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)", fill: "both"}).finished;
    }).catch(function () { commit(); }).then(function () {
      return transition.finished;
    }).catch(function () { commit(); }).finally(function () { transitionBusy = false; });
  }
  function init() {
    if (!window.IntersectionObserver || reduced.matches) return;
    var watched = new WeakSet();
    var targets = new Set();
    var selector = ".card,.wanted-item,.form-card,.row-item,.intro-card,.account-header,.profile-header";
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (reduced.matches || entry.isIntersecting) entry.target.classList.add("is-visible");
        else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= window.innerHeight) entry.target.classList.remove("is-visible");
      });
    }, {threshold: 0.08});
    function watch(element) {
      if (watched.has(element)) return;
      watched.add(element); targets.add(element);
      var rect = element.getBoundingClientRect();
      if (reduced.matches || (rect.bottom > 0 && rect.top < window.innerHeight)) element.classList.add("is-visible");
      element.classList.add("reveal-item"); observer.observe(element);
    }
    function discover(root) {
      if (root.nodeType !== 1) return;
      if (root.matches(selector)) watch(root);
      root.querySelectorAll(selector).forEach(watch);
    }
    discover(document.body);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) { mutation.addedNodes.forEach(discover); });
      targets.forEach(function (element) {
        if (!element.isConnected) { observer.unobserve(element); targets.delete(element); }
      });
    }).observe(document.body, {subtree: true, childList: true});
    reduced.addEventListener("change", function () {
      if (reduced.matches) targets.forEach(function (element) { element.classList.add("is-visible"); });
    });
  }
  window.BukatokoMotion = {theme: theme, init: init};
}());
