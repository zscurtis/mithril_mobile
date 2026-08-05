(function () {
  "use strict";

  if (window.__mithrilPendingHomeHotfixM409693Installed) return;
  window.__mithrilPendingHomeHotfixM409693Installed = true;

  function byId(id) {
    return document.getElementById(id);
  }

  function homeIsVisible() {
    var home = byId("templateStart");
    if (!home) return false;
    try {
      var style = window.getComputedStyle(home);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity || 1) === 0) return false;
      return home.getClientRects().length > 0;
    } catch (error) {
      return true;
    }
  }

  function removePendingHomeOverlay() {
    if (!homeIsVisible()) return;

    var overlay = byId("m40969PendingOverlay");
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

    var feedback = byId("m408FeedbackModal");
    var message = byId("m408FeedbackMessage");
    if (feedback && feedback.classList.contains("show") && message &&
        /pending role cannot open this template|current role cannot open this template/i.test(String(message.textContent || ""))) {
      feedback.classList.remove("show");
    }
  }

  function scheduleCleanup() {
    [0, 50, 150, 400, 900, 1800].forEach(function (delay) {
      window.setTimeout(removePendingHomeOverlay, delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleCleanup, { once: true });
  } else {
    scheduleCleanup();
  }

  window.addEventListener("pageshow", scheduleCleanup);

  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function () {
      if (homeIsVisible() && (byId("m40969PendingOverlay") || byId("m408FeedbackModal"))) {
        removePendingHomeOverlay();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  }
})();
