(function (global) {
  "use strict";

  var DIALOG_ID = "mithrilUpdateDialog";
  var STYLE_ID = "mithrilUpdateStyle";
  var activeConfig = null;
  var latestMetadata = null;

  function merge(base, extra) {
    var out = {}, key;
    base = base || {};
    extra = extra || {};
    for (key in base) if (Object.prototype.hasOwnProperty.call(base, key)) out[key] = base[key];
    for (key in extra) if (Object.prototype.hasOwnProperty.call(extra, key)) out[key] = extra[key];
    return out;
  }

  function normalizeVersion(value) {
    var text = String(value || "").trim().toLowerCase();
    if (text.charAt(0) === "m" || text.charAt(0) === "v") text = text.slice(1);
    return text.split(/[^0-9]+/).filter(function (part) { return part !== ""; }).map(function (part) { return Number(part); });
  }

  function compareVersions(left, right) {
    var a = normalizeVersion(left), b = normalizeVersion(right), length = Math.max(a.length, b.length), i;
    for (i = 0; i < length; i += 1) {
      var av = a[i] || 0, bv = b[i] || 0;
      if (av > bv) return 1;
      if (av < bv) return -1;
    }
    return 0;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureUi() {
    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent =
        "#" + DIALOG_ID + "{display:none;position:fixed;top:0;right:0;bottom:0;left:0;z-index:5000;background:rgba(0,0,0,.66);padding:14px;box-sizing:border-box;align-items:center;justify-content:center;font-family:Arial,sans-serif;}" +
        "#" + DIALOG_ID + ".show{display:flex;}" +
        "#" + DIALOG_ID + " .mu-card{width:min(520px,96vw);max-height:92vh;overflow:auto;background:#fff;color:#111;border:2px solid #222;border-radius:14px;padding:16px;box-sizing:border-box;-webkit-overflow-scrolling:touch;}" +
        "#" + DIALOG_ID + " .mu-title{font-size:22px;font-weight:950;margin:0 0 9px;}" +
        "#" + DIALOG_ID + " .mu-body{font-size:15px;line-height:1.4;font-weight:700;color:#333;white-space:normal;}" +
        "#" + DIALOG_ID + " .mu-versions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;}" +
        "#" + DIALOG_ID + " .mu-version{border:1px solid #bbb;border-radius:9px;padding:9px;background:#f7f7f7;}" +
        "#" + DIALOG_ID + " .mu-label{font-size:11px;font-weight:900;color:#666;text-transform:uppercase;}" +
        "#" + DIALOG_ID + " .mu-value{font-size:19px;font-weight:950;margin-top:2px;}" +
        "#" + DIALOG_ID + " ul{margin:10px 0 0 20px;padding:0;}" +
        "#" + DIALOG_ID + " .mu-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px;}" +
        "#" + DIALOG_ID + " button{min-height:46px;border:1px solid #777;border-radius:8px;background:#f4f4f4;color:#111;font:900 15px Arial,sans-serif;padding:8px 10px;}" +
        "#" + DIALOG_ID + " button.mu-primary{background:#1f6feb;border-color:#1f6feb;color:#fff;}" +
        "#" + DIALOG_ID + " button:disabled{opacity:.55;}" +
        "@media(max-width:430px){#" + DIALOG_ID + " .mu-versions,#" + DIALOG_ID + " .mu-actions{grid-template-columns:1fr;}}";
      document.head.appendChild(style);
    }

    var dialog = document.getElementById(DIALOG_ID);
    if (!dialog) {
      dialog = document.createElement("div");
      dialog.id = DIALOG_ID;
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.innerHTML = '<div class="mu-card"><div class="mu-title" id="mithrilUpdateTitle">MITHRIL Update</div><div class="mu-body" id="mithrilUpdateBody"></div><div class="mu-actions" id="mithrilUpdateActions"></div></div>';
      document.body.appendChild(dialog);
    }
    return dialog;
  }

  function setDialog(title, bodyHtml, actions) {
    var dialog = ensureUi();
    document.getElementById("mithrilUpdateTitle").textContent = title;
    document.getElementById("mithrilUpdateBody").innerHTML = bodyHtml;
    var actionBox = document.getElementById("mithrilUpdateActions");
    actionBox.innerHTML = "";
    (actions || []).forEach(function (action) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      if (action.primary) button.className = "mu-primary";
      if (action.disabled) button.disabled = true;
      button.addEventListener("click", action.onClick);
      actionBox.appendChild(button);
    });
    dialog.classList.add("show");
  }

  function closeDialog() {
    var dialog = document.getElementById(DIALOG_ID);
    if (dialog) dialog.classList.remove("show");
  }

  function safeSave(config) {
    try {
      if (config && typeof config.save === "function") config.save();
    } catch (error) {
      console.warn("MITHRIL could not complete its save callback before checking for updates.", error);
    }
  }

  function versionUrl(config) {
    var base = config.versionUrl || "./version.json";
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + "check=" + Date.now();
  }

  function fetchMetadata(config) {
    if (!global.fetch) return Promise.reject(new Error("This browser does not support online update checks."));
    return global.fetch(versionUrl(config), {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    }).then(function (response) {
      if (!response || !response.ok) throw new Error("The update server returned " + (response ? response.status : "no response") + ".");
      return response.json();
    }).then(function (metadata) {
      if (!metadata || !metadata.version) throw new Error("The published version file is invalid.");
      return metadata;
    });
  }

  function versionsHtml(installed, available) {
    return '<div class="mu-versions">' +
      '<div class="mu-version"><div class="mu-label">Installed</div><div class="mu-value">' + escapeHtml(installed) + '</div></div>' +
      '<div class="mu-version"><div class="mu-label">Available</div><div class="mu-value">' + escapeHtml(available) + '</div></div>' +
      '</div>';
  }

  function notesHtml(metadata) {
    var notes = metadata && Array.isArray(metadata.notes) ? metadata.notes : [];
    if (!notes.length) return "";
    return "<ul>" + notes.map(function (note) { return "<li>" + escapeHtml(note) + "</li>"; }).join("") + "</ul>";
  }

  function bindButtons(root) {
    root = root || document;
    var buttons = root.querySelectorAll ? root.querySelectorAll("[data-mithril-update-button]") : [];
    Array.prototype.forEach.call(buttons, function (button) {
      if (button.getAttribute("data-mithril-update-bound") === "1") return;
      button.setAttribute("data-mithril-update-bound", "1");
      button.addEventListener("click", function () { check(global.MITHRIL_UPDATE_CONFIG || {}); });
    });
  }

  function check(config) {
    activeConfig = merge(global.MITHRIL_UPDATE_CONFIG || {}, config || {});
    var installed = activeConfig.currentVersion || "unknown";
    safeSave(activeConfig);
    setDialog("Checking for Updates", "MITHRIL is contacting the published update file. Your saved field data will not be changed.", [
      { label: "Checking…", disabled: true, onClick: function () {} }
    ]);

    return fetchMetadata(activeConfig).then(function (metadata) {
      latestMetadata = metadata;
      var comparison = compareVersions(installed, metadata.version);
      if (comparison < 0) {
        setDialog("Update Available", versionsHtml(installed, metadata.version) +
          '<div>A newer MITHRIL version is ready. Install it when field entry is not actively in progress.</div>' + notesHtml(metadata), [
          { label: "Later", onClick: closeDialog },
          { label: "Install Update", primary: true, onClick: function () { install(metadata, activeConfig); } }
        ]);
      } else if (comparison > 0) {
        setDialog("Development Build", versionsHtml(installed, metadata.version) +
          "<div>This device is running a version newer than the currently published release.</div>", [
          { label: "Close", primary: true, onClick: closeDialog }
        ]);
      } else {
        setDialog("MITHRIL Is Up to Date", versionsHtml(installed, metadata.version) +
          "<div>No newer published version was found.</div>", [
          { label: "Close", primary: true, onClick: closeDialog }
        ]);
      }
      return metadata;
    }).catch(function (error) {
      console.error("MITHRIL update check failed:", error);
      setDialog("Unable to Check for Updates", "<div>MITHRIL could not reach the update file. The app and saved field data remain available offline.</div><div style=\"margin-top:10px;font-size:12px;color:#666;\">" + escapeHtml(error && error.message ? error.message : error) + "</div>", [
        { label: "Close", primary: true, onClick: closeDialog }
      ]);
      return null;
    });
  }

  function clearMithrilCaches() {
    if (!global.caches || !global.caches.keys) return Promise.resolve();
    return global.caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key.indexOf("mithril-mobile-") === 0; }).map(function (key) { return global.caches.delete(key); }));
    });
  }

  function refreshServiceWorker(config) {
    if (!("serviceWorker" in navigator)) return Promise.resolve();
    var swUrl = config.serviceWorkerUrl || "./service-worker.js";
    return navigator.serviceWorker.getRegistration().then(function (registration) {
      if (!registration) return navigator.serviceWorker.register(swUrl);
      return registration.update().then(function () { return registration; });
    }).then(function (registration) {
      var worker = registration && (registration.waiting || registration.installing);
      if (worker) {
        try { worker.postMessage({ type: "SKIP_WAITING" }); } catch (error) {}
        if (worker.state !== "installed" && worker.addEventListener) {
          worker.addEventListener("statechange", function () {
            if (worker.state === "installed") {
              try { worker.postMessage({ type: "SKIP_WAITING" }); } catch (error) {}
            }
          });
        }
      }
      return registration;
    }).catch(function (error) {
      console.warn("MITHRIL service-worker refresh did not complete before reload.", error);
    });
  }

  function buildReloadUrl(config, metadata) {
    var base = config.homeUrl || "./index.html";
    var joiner = base.indexOf("?") >= 0 ? "&" : "?";
    return base + joiner + "updated=" + encodeURIComponent(metadata.version) + "&refresh=" + Date.now();
  }

  function install(metadata, config) {
    metadata = metadata || latestMetadata;
    config = merge(global.MITHRIL_UPDATE_CONFIG || {}, config || activeConfig || {});
    if (!metadata || !metadata.version) return;
    safeSave(config);
    setDialog("Installing Update", "MITHRIL is refreshing the application files. Saved drill logs, shot diagrams, and calibration settings will remain on this device.", [
      { label: "Installing…", disabled: true, onClick: function () {} }
    ]);

    Promise.all([refreshServiceWorker(config), clearMithrilCaches()]).then(function () {
      global.setTimeout(function () { global.location.replace(buildReloadUrl(config, metadata)); }, 450);
    }).catch(function (error) {
      console.error("MITHRIL update installation failed:", error);
      setDialog("Update Could Not Be Installed", "MITHRIL could not complete the refresh. Your saved data was not changed.", [
        { label: "Close", primary: true, onClick: closeDialog }
      ]);
    });
  }

  function readQueryValue(name) {
    var match = new RegExp("[?&]" + name + "=([^&#]*)").exec(global.location.search || "");
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  function showInstalledConfirmation() {
    var updated = readQueryValue("updated");
    if (!updated) return;
    global.setTimeout(function () {
      setDialog("MITHRIL Updated", "<div>The update completed successfully.</div>" + versionsHtml(updated, updated), [
        { label: "Continue", primary: true, onClick: closeDialog }
      ]);
      try {
        if (global.history && global.history.replaceState) global.history.replaceState({}, document.title, (global.MITHRIL_UPDATE_CONFIG && global.MITHRIL_UPDATE_CONFIG.homeUrl) || "./index.html");
      } catch (error) {}
    }, 250);
  }

  global.MithrilUpdate = {
    check: check,
    install: install,
    compareVersions: compareVersions,
    bindButtons: bindButtons,
    close: closeDialog
  };
  global.checkMithrilForUpdates = function () { return check(global.MITHRIL_UPDATE_CONFIG || {}); };

  function ready() {
    bindButtons(document);
    showInstalledConfirmation();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})(window);
