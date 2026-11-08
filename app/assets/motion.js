(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var transitionBusy = false;
  function theme(button, update) {
    if (transitionBusy) return Promise.resolve();
    if (reduced.matches) { update(); return Promise.resolve(); }
    if (!document.startViewTransition) {
      document.documentElement.classList.add("theme-fade");
      update();
      window.setTimeout(function () { document.documentElement.classList.remove("theme-fade"); }, 460);
      return Promise.resolve();
    }
    transitionBusy = true;
    document.documentElement.dataset.transition = "theme";
    var rect = button.getBoundingClientRect();
    var x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    // Set every snapshot style before capture; ready must never start a second animation.
    document.documentElement.style.setProperty("--theme-x", x + "px");
    document.documentElement.style.setProperty("--theme-y", y + "px");
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.style.setProperty("--theme-radius", (radius + 1) + "px");
    document.documentElement.style.setProperty("--theme-backdrop", window.getComputedStyle(document.documentElement).backgroundColor);
    var transition;
    var updated = false;
    function commit() { if (!updated) { updated = true; update(); } }
    function cleanup() {
      transitionBusy = false; delete document.documentElement.dataset.transition;
      ["--theme-x", "--theme-y", "--theme-radius", "--theme-backdrop"].forEach(function (name) {
        document.documentElement.style.removeProperty(name);
      });
    }
    try { transition = document.startViewTransition(commit); }
    catch (error) {
      commit(); cleanup();
      return Promise.resolve();
    }
    // A skipped/failed snapshot still commits the requested theme exactly once.
    transition.ready.catch(function () { commit(); });
    return transition.finished.catch(function () { commit(); }).finally(cleanup);
  }
  var exits = new WeakMap();
  function cancelExit(element) {
    var animation = exits.get(element);
    if (animation) { animation.cancel(); exits.delete(element); }
    element.inert = false;
  }
  function exit(element) {
    if (element.hidden || exits.has(element)) return;
    if (reduced.matches || !element.animate) { element.hidden = true; return; }
    element.inert = true;
    var animation = element.animate([{opacity:1},{opacity:0}], {duration:180,easing:"ease-in",fill:"forwards"});
    exits.set(element,animation);
    animation.finished.then(function () {
      if (exits.get(element) === animation) { element.hidden = true; cancelExit(element); }
    }).catch(function () {});
  }
  function init() {
    if (document.addEventListener) document.addEventListener("pointerdown", function (event) {
      if (reduced.matches || event.button !== 0) return;
      var control = event.target.closest && event.target.closest("button:not(:disabled),.btn,.tabs button,summary");
      if (control && control.animate) control.animate([
        {transform:"scale(1)"},{transform:"scale(.975)",offset:.3},{transform:"scale(1)"}
      ],{duration:220,easing:"cubic-bezier(.2,.7,.2,1)"});
    });
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
  window.BukatokoMotion = {theme: theme, init: init, exit: exit, cancelExit: cancelExit};
}());
