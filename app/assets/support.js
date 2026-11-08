(function () {
  "use strict";
  var form = document.getElementById("bug-form");
  if (!form) return;
  var result = document.getElementById("bug-result");
  var preview = document.getElementById("bug-preview");
  var github = document.getElementById("bug-github");
  var report = "";
  function value(id) { return document.getElementById(id).value.trim(); }
  form.addEventListener("input", function () {
    result.hidden = true;
    github.removeAttribute("href");
    report = "";
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    var title = value("bug-title");
    report = title + "\n\nPage: " + (value("bug-page") || "—") +
      "\n\nSteps to reproduce:\n" + value("bug-steps") +
      "\n\nExpected:\n" + value("bug-expected") +
      "\n\nActual:\n" + value("bug-actual");
    preview.textContent = report;
    var url = new URL("https://github.com/AlthafTM/gdg-hackathon-bukatoko/issues/new");
    url.searchParams.set("title", "[Bug] " + title);
    url.searchParams.set("body", report);
    github.hidden = url.href.length > 7600;
    document.getElementById("bug-link-limit").hidden = !github.hidden;
    if (!github.hidden) github.href = url.href;
    result.hidden = false;
    result.tabIndex = -1;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ block: "nearest", behavior: "auto" });
  });
  document.getElementById("bug-download").addEventListener("click", function () {
    if (!report) return;
    var url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = "bukatoko-bug-report.txt";
    link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
}());
