(function () {
  "use strict";

  var RELEASE_VERSION = "m40.5.1";
  var CHILD_SCRIPT_ID = "mithrilCoreM400ChildLoader";
  var CHILD_SCRIPT_SRC = "./mithril-core-m400.js?rev=4051-frame";
  var TRANSFER_KEY = "mithrilDrillToShotTransferM400";
  var UNDO_KEY = "mithrilDrillToShotUndoM400";
  var DEVICE_KEY = "mithrilCloudDeviceNameM399";
  var SYNC_META_PREFIX = "mithrilCloudSyncMetaM401:";
  var RECOVERY_PREFIX = "mithrilCloudRecoveryM401:";
  var LAST_VERIFIED_USER_KEY = "mithrilLastVerifiedUserM404";
  var PROFILE_DOCUMENT_ID = "__mithril_user_profile__";
  var PROFILE_COLLECTION = "userProfiles";
  var FIREBASE_VERSION = "12.16.0";
  var firebaseConfig = {
    apiKey: ["AIzaSyBOb0pXdI", "DMqr5mMKdKOCpP84jSRjyjnhY"].join(""),
    authDomain: "mithril-mobile.firebaseapp.com",
    projectId: "mithril-mobile",
    storageBucket: "mithril-mobile.firebasestorage.app",
    messagingSenderId: "797958678485",
    appId: "1:797958678485:web:e19ab69e74e00cd8587f5c"
  };

  // m40 owns Drill Log transfer and cloud sync. Prevent retired m39.8/m39.9
  // helpers from starting if an older cached HTML response still references them.
  window.__mithrilM398Installed = true;
  window.__mithrilM399Installed = true;

  if (window.__mithrilM400Installed) return;
  window.__mithrilM400Installed = true;

  var fbPromise = null;
  var currentUser = null;
  var currentProfile = null;
  var offlineUserSession = false;
  var profilePromise = null;
  var profilePromiseUid = "";
  var authUnsubscribe = null;
  var cloudItems = [];
  var accessObserver = null;
  var accessNoticeShown = false;

  function byId(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? "" : value).trim(); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function isDrill() { return !!byId("drillCanvas"); }
  function isShot() { return !!byId("shotCanvas"); }
  function isWrapper() { return !!byId("shotFrame"); }
  function docType() { return isDrill() ? "drillLog" : (isShot() ? "shotDiagram" : ""); }
  function docTypeLabel(type) { return type === "shotDiagram" ? "Shot Diagram" : "Drill Log"; }
  function numericKeys(value) {
    return Object.keys(value || {}).sort(function (a, b) {
      var na = Number(a), nb = Number(b);
      if (isFinite(na) && isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
  }
  function flagYes(value) { return value === true || /^(?:yes|true|1)$/i.test(text(value)); }
  var IDENTITY_FIELDS = {
    documentId: "MithrilDocumentId",
    createdAt: "MithrilIdentityCreatedAt",
    legacyCloudId: "MithrilLegacyCloudId",
    sourceDocumentId: "MithrilSourceDocumentId",
    origin: "MithrilIdentityOrigin"
  };
  function legacyLogicalId(data) {
    data = data || {};
    var raw = [data.type || docType(), data.jobName || "no-job", data.documentNumber || data.fieldDate || "untitled"].join("__").toLowerCase();
    var slug = raw.replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
    return slug || ((data.type || docType() || "document") + "__untitled");
  }
  function identityInfo(type, header) {
    header = header || {};
    return {
      type: type,
      jobName: type === "drillLog" ? text(header.Job) : text(header.JobName),
      documentNumber: type === "drillLog" ? text(header.DrillLogNumber) : text(header.ShotID),
      fieldDate: type === "drillLog" ? text(header.Date) : text(header.FieldDate)
    };
  }
  function hasDocumentContent(type, header) {
    var info = identityInfo(type, header || {});
    if (info.jobName || info.documentNumber || info.fieldDate) return true;
    try { return countHoles(typeof pagesData !== "undefined" ? pagesData : {}) > 0; } catch (error) { return false; }
  }
  function uuidFromSeed(seed) {
    var value = String(seed || "mithril-document"), hashes = [2166136261, 2246822507, 3266489909, 668265263];
    for (var i = 0; i < value.length; i += 1) {
      for (var h = 0; h < hashes.length; h += 1) {
        hashes[h] ^= value.charCodeAt(i) + h * 31;
        hashes[h] = Math.imul(hashes[h], 16777619 + h * 2) >>> 0;
      }
    }
    var hex = hashes.map(function (n) { return ("00000000" + n.toString(16)).slice(-8); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-5" + hex.slice(13, 16) + "-a" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
  }
  function randomUuid() {
    try { if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID(); } catch (error) {}
    var bytes = new Uint8Array(16);
    try { window.crypto.getRandomValues(bytes); } catch (error2) { for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256); }
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  function readIdentity(header) {
    header = header || {};
    return {
      documentId: text(header[IDENTITY_FIELDS.documentId]),
      createdAt: text(header[IDENTITY_FIELDS.createdAt]),
      legacyCloudId: text(header[IDENTITY_FIELDS.legacyCloudId]),
      sourceDocumentId: text(header[IDENTITY_FIELDS.sourceDocumentId]),
      origin: text(header[IDENTITY_FIELDS.origin])
    };
  }
  function writeIdentity(header, identity) {
    header = header || {};
    identity = identity || {};
    if (identity.documentId) header[IDENTITY_FIELDS.documentId] = identity.documentId;
    if (identity.createdAt) header[IDENTITY_FIELDS.createdAt] = identity.createdAt;
    if (identity.legacyCloudId) header[IDENTITY_FIELDS.legacyCloudId] = identity.legacyCloudId;
    else delete header[IDENTITY_FIELDS.legacyCloudId];
    if (identity.sourceDocumentId) header[IDENTITY_FIELDS.sourceDocumentId] = identity.sourceDocumentId;
    else delete header[IDENTITY_FIELDS.sourceDocumentId];
    if (identity.origin) header[IDENTITY_FIELDS.origin] = identity.origin;
    return header;
  }
  function stripIdentity(header) {
    var clean = clone(header || {});
    Object.keys(IDENTITY_FIELDS).forEach(function (key) { delete clean[IDENTITY_FIELDS[key]]; });
    return clean;
  }
  function ensureDocumentIdentity(type, header, options) {
    options = options || {};
    header = header || {};
    var identity = readIdentity(header);
    if (identity.documentId) return identity;
    var info = identityInfo(type, header);
    var legacyId = text(options.legacyCloudId) || legacyLogicalId(info);
    var oldDocument = options.forceLegacy === true || (options.forceNew !== true && hasDocumentContent(type, header));
    identity.documentId = oldDocument ? uuidFromSeed("MITHRIL|" + legacyId) : randomUuid();
    identity.createdAt = new Date().toISOString();
    identity.legacyCloudId = oldDocument ? legacyId : "";
    identity.sourceDocumentId = text(options.sourceDocumentId);
    identity.origin = oldDocument ? "legacy-derived" : "new";
    writeIdentity(header, identity);
    return identity;
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function closeMenu() {
    try { if (typeof window.closeMenu === "function") window.closeMenu(); } catch (error) {}
    var menu = byId("menuModal");
    if (menu) menu.classList.remove("show");
  }
  function meaningfulRecord(record) {
    if (!record || typeof record !== "object") return false;
    var ignored = /^(?:HoleID|PageNumber|Timestamp|FieldDate|ShotID|JobName|Blaster|EnteredBy|SourceDrillPage|SourceDrillHoleID)$/i;
    return Object.keys(record).some(function (key) {
      if (ignored.test(key)) return false;
      var value = record[key];
      if (value == null || value === false || value === "") return false;
      if (/^(?:Wet|BadHole|DirtHole|Breakthrough)$/i.test(key) && /^(?:no|false|0)$/i.test(text(value))) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Object.keys(value).length > 0;
      return true;
    });
  }
  function countHoles(pages) {
    var count = 0;
    Object.keys(pages || {}).forEach(function (pageKey) {
      Object.keys((pages || {})[pageKey] || {}).forEach(function (holeKey) {
        if (meaningfulRecord(pages[pageKey][holeKey])) count += 1;
      });
    });
    return count;
  }
  function showToast(message, kind) {
    var old = byId("m400Toast");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var toast = document.createElement("div");
    toast.id = "m400Toast";
    toast.className = "m400Toast " + (kind || "good");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 5200);
  }

  function ensureStyles() {
    if (byId("m400Styles")) return;
    var style = document.createElement("style");
    style.id = "m400Styles";
    style.textContent = [
      ".m400Modal{display:none;position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.7);padding:12px;box-sizing:border-box;overflow:auto;font-family:Arial,sans-serif}",
      ".m400Modal.show{display:flex;align-items:flex-start;justify-content:center}",
      ".m400Box{width:min(780px,100%);margin:auto;background:#fff;color:#111;border:2px solid #1f6feb;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.5)}",
      ".m400Head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.m400Head strong{font-size:21px}",
      ".m400Box button{min-height:44px;border:1px solid #777;border-radius:8px;background:#f4f4f4;color:#111;font-weight:850;padding:7px 10px;font-size:14px}",
      ".m400Box button.primary{background:#1f6feb;border-color:#1f6feb;color:#fff}.m400Box button.danger{background:#fff0f0;border-color:#c66}",
      ".m400Grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.m400Grid label{display:grid;gap:4px;font-size:12px;font-weight:850;color:#444}",
      ".m400Grid input,.m400Grid select{width:100%;min-height:43px;border:1px solid #888;border-radius:7px;padding:8px;font-size:16px;box-sizing:border-box}",
      ".m400Wide{grid-column:1/-1}.m400Actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}",
      ".m400Note{font-size:12px;line-height:1.4;color:#555;font-weight:750;margin:8px 0;padding:9px;border:1px solid #bbb;border-radius:8px;background:#f7f7f7}",
      ".m400Warning{background:#fff4d8;border-color:#c5a54a;color:#5f4800}",
      ".m400Danger{background:#ffeaea;border-color:#c66;color:#720000}",
      ".m400Stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}",
      ".m400Stat{background:#eef4ff;border:1px solid #98b9e7;border-radius:9px;padding:8px;min-height:58px}.m400Stat b{display:block;font-size:21px;color:#173f70}.m400Stat span{font-size:11px;font-weight:800;color:#4d6075}",
      ".m400Status{margin:9px 0;padding:9px;border:1px solid #aaa;border-radius:8px;background:#f5f5f5;font-size:13px;font-weight:800;line-height:1.35}.m400Status.good{background:#e9f8ec;border-color:#61a86e}.m400Status.bad{background:#ffeaea;border-color:#c66}.m400Status.wait{background:#fff7d8;border-color:#c7aa45}",
      ".m400Identity{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:9px;border-radius:8px;background:#eef4ff;border:1px solid #9ab8df;margin-bottom:9px;font-size:13px;font-weight:800}",
      ".m401Compare{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}.m401Side{border:1px solid #9ab8df;border-radius:9px;padding:10px;background:#f7faff}.m401Side.cloud{border-color:#8dbb96;background:#f3fbf4}.m401Side h3{margin:0 0 6px;font-size:13px;letter-spacing:.08em}.m401Side b{display:block;font-size:16px;margin-bottom:4px}.m401Side span{display:block;font-size:12px;line-height:1.4;color:#4d5866;font-weight:750}",
      ".m400Docs{display:grid;gap:8px;margin-top:10px}.m400Doc{border:1px solid #aaa;border-radius:9px;padding:9px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center}.m400DocTitle{font-size:15px;font-weight:900}.m400Meta{font-size:12px;color:#555;font-weight:750;line-height:1.35;margin-top:3px}.m400DocActions{display:grid;gap:6px}",
      ".m400Toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:22000;max-width:min(720px,calc(100vw - 24px));padding:12px 16px;border:2px solid #4f9a61;border-radius:10px;background:#e9f8ec;color:#173d20;font-size:14px;font-weight:900;line-height:1.35;box-shadow:0 8px 28px rgba(0,0,0,.35);text-align:center}.m400Toast.bad{background:#ffeaea;border-color:#c66;color:#720000}",
      ".m404LandingAuth{margin:14px 0 16px;padding:14px;border:1px solid #666;border-radius:12px;background:rgba(255,255,255,.06);color:#fff}.m404LandingHead{display:flex;justify-content:space-between;gap:10px;align-items:center}.m404LandingHead strong{font-size:17px}.m404AuthState{font-size:12px;font-weight:900;color:#b9c7da}.m404AuthForm{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;margin-top:10px}.m404AuthForm input{min-width:0;min-height:44px;border:1px solid #888;border-radius:8px;padding:9px;font-size:16px}.m404AuthForm button{min-width:105px;background:#1f6feb;border-color:#1f6feb;color:#fff}.m404SignedIn{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:10px;padding:10px;border:1px solid #477454;border-radius:9px;background:rgba(37,110,57,.24)}.m404UserName{font-size:15px;font-weight:950}.m404UserMeta{font-size:12px;color:#c9d7cc;font-weight:800;margin-top:3px}.m404AuthMessage{display:none;margin-top:9px;font-size:12px;line-height:1.35;font-weight:800;color:#ffd37a}.m404AuthMessage.show{display:block}.m404TemplateLocked{opacity:.42;pointer-events:none;filter:grayscale(.55)}",
      ".m405UserActions{display:flex;gap:8px;flex-wrap:wrap}.m405AdminBox{width:min(900px,100%)}.m405AdminRows{display:grid;gap:8px;margin-top:10px}.m405AdminRow{display:grid;grid-template-columns:minmax(0,1fr) 150px 125px auto;gap:8px;align-items:center;border:1px solid #aaa;border-radius:9px;padding:9px}.m405AdminName{font-weight:900}.m405AdminMeta{font-size:11px;color:#555;font-weight:750;overflow-wrap:anywhere}.m405AccessBanner{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:19000;padding:8px 13px;border:2px solid #9b71df;border-radius:10px;background:#f2eaff;color:#3d226d;font:900 13px Arial,sans-serif;box-shadow:0 5px 18px rgba(0,0,0,.28)}body.m405ReadOnly canvas{pointer-events:none!important}body.m405ReadOnly [data-m405-mutation=true]{display:none!important}",
      "@media(max-width:700px){.m405AdminRow{grid-template-columns:1fr 1fr}.m405AdminIdentity{grid-column:1/-1}.m405AdminRow button{grid-column:1/-1}}",
      "@media(max-width:600px){.m400Grid,.m400Actions,.m401Compare,.m404AuthForm{grid-template-columns:1fr}.m400Wide{grid-column:auto}.m400Stats{grid-template-columns:1fr 1fr}.m400Doc{grid-template-columns:1fr}.m400DocActions{grid-template-columns:1fr 1fr}.m404SignedIn{align-items:flex-start;flex-direction:column}.m404SignedIn button{width:100%}.m405UserActions{width:100%;display:grid}}"
    ].join("");
    document.head.appendChild(style);
  }
  function stat(value, label) { return '<div class="m400Stat"><b>' + escapeHtml(value) + '</b><span>' + escapeHtml(label) + '</span></div>'; }

  // ---------------------------------------------------------------------------
  // Shared document adapter
  // ---------------------------------------------------------------------------

  function normalizedSnapshot(snapshot) {
    var src = snapshot || {};
    if (src.payload && !src.pagesData) src = src.payload;
    var extras = clone(src.extras || {});
    if (!extras.headerCalibration && src.headerCalibration) extras.headerCalibration = clone(src.headerCalibration);
    if (!extras.timingSequence && src.timingSequence) extras.timingSequence = clone(src.timingSequence);
    var header = clone(src.headerData || src.shotInfo || src.header || {});
    var suppliedIdentity = {
      documentId: text(src.documentId || header[IDENTITY_FIELDS.documentId]),
      createdAt: text(src.identityCreatedAt || header[IDENTITY_FIELDS.createdAt]),
      legacyCloudId: text(src.legacyCloudId || header[IDENTITY_FIELDS.legacyCloudId]),
      sourceDocumentId: text(src.sourceDocumentId || header[IDENTITY_FIELDS.sourceDocumentId]),
      origin: text(src.identityOrigin || header[IDENTITY_FIELDS.origin])
    };
    if (suppliedIdentity.documentId) writeIdentity(header, suppliedIdentity);
    return {
      schemaVersion: Number(src.schemaVersion || 1),
      type: src.type || docType(),
      documentId: suppliedIdentity.documentId,
      identityCreatedAt: suppliedIdentity.createdAt,
      legacyCloudId: suppliedIdentity.legacyCloudId,
      sourceDocumentId: suppliedIdentity.sourceDocumentId,
      identityOrigin: suppliedIdentity.origin,
      pagesData: clone(src.pagesData || src.pages || { "1": {} }),
      pageMeta: clone(src.pageMeta || { "1": { gx: 0, gy: 0, name: "Page 1" } }),
      headerData: header,
      currentPage: Number(src.currentPage || 1),
      view: src.view ? clone(src.view) : null,
      extras: extras
    };
  }

  function makeAdapter() {
    var type = docType();
    if (!type) return null;

    function save() {
      if (type === "drillLog") {
        if (typeof saveState === "function") saveState();
        return;
      }
      if (typeof saveData === "function") saveData();
      try { localStorage.setItem("mithrilCanvasPageMetaM03", JSON.stringify(pageMeta || {})); } catch (error1) {}
      try { localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData || {})); } catch (error2) {}
      try { if (typeof view !== "undefined") localStorage.setItem("mithrilCanvasViewM01", JSON.stringify(view || {})); } catch (error3) {}
    }

    function info() {
      var header = typeof headerData !== "undefined" ? headerData || {} : {};
      var job = type === "drillLog" ? text(header.Job) : text(header.JobName);
      var number = type === "drillLog" ? text(header.DrillLogNumber) : text(header.ShotID);
      var date = type === "drillLog" ? text(header.Date) : text(header.FieldDate);
      var person = type === "drillLog" ? text(header.Employee) : text(header.Blaster);
      return {
        type: type,
        label: docTypeLabel(type),
        jobName: job,
        documentNumber: number,
        fieldDate: date,
        person: person,
        title: [job, number].filter(Boolean).join(" — ") || (docTypeLabel(type) + " — Untitled")
      };
    }

    function getSnapshot() {
      save();
      var identity = ensureDocumentIdentity(type, headerData || {});
      writeIdentity(headerData, identity);
      save();
      var extras = {};
      if (type === "shotDiagram") {
        try { extras.timingSequence = JSON.parse(localStorage.getItem("mithrilCanvasTimingSequenceM397") || "null"); } catch (error) { extras.timingSequence = null; }
      } else {
        try { extras.headerCalibration = typeof headerCalibration !== "undefined" ? clone(headerCalibration) : null; } catch (error2) { extras.headerCalibration = null; }
      }
      return {
        schemaVersion: 3,
        type: type,
        documentId: identity.documentId,
        identityCreatedAt: identity.createdAt,
        legacyCloudId: identity.legacyCloudId,
        sourceDocumentId: identity.sourceDocumentId,
        identityOrigin: identity.origin,
        pagesData: typeof pagesData !== "undefined" ? clone(pagesData) : { "1": {} },
        pageMeta: typeof pageMeta !== "undefined" ? clone(pageMeta) : { "1": { gx: 0, gy: 0, name: "Page 1" } },
        headerData: typeof headerData !== "undefined" ? clone(headerData) : {},
        currentPage: typeof currentPage !== "undefined" ? Number(currentPage) : 1,
        view: typeof view !== "undefined" ? clone(view) : null,
        extras: extras
      };
    }

    function refresh(options) {
      options = options || {};
      try { if (typeof ensurePageMeta === "function") ensurePageMeta(); } catch (error1) {}
      try { if (typeof invalidatePageCache === "function") invalidatePageCache(); } catch (error2) {}
      try { if (typeof refreshPageSelect === "function") refreshPageSelect(); } catch (error3) {}
      try { if (typeof updateQuickBar === "function") updateQuickBar(); } catch (error4) {}
      try { if (typeof updateSingleFillBar === "function") updateSingleFillBar(); } catch (error5) {}
      try { if (typeof updateStatus === "function") updateStatus(); } catch (error6) {}
      try {
        if (options.fitAll && typeof fitAllPages === "function") fitAllPages();
        else if (options.fitCurrent && typeof snapToCurrentPage === "function") snapToCurrentPage();
        else if (typeof resizeCanvas === "function") resizeCanvas();
        else if (typeof draw === "function") draw();
      } catch (error7) {
        try { if (typeof draw === "function") draw(); } catch (error8) {}
      }
    }

    function applySnapshot(snapshot, options) {
      options = options || {};
      var next = normalizedSnapshot(snapshot);
      if (!next.pagesData || !next.headerData) throw new Error("The document snapshot is incomplete.");
      pagesData = clone(next.pagesData);
      pageMeta = clone(next.pageMeta || {});
      headerData = clone(next.headerData || {});
      var incomingIdentity = {
        documentId: text(next.documentId),
        createdAt: text(next.identityCreatedAt),
        legacyCloudId: text(next.legacyCloudId),
        sourceDocumentId: text(next.sourceDocumentId),
        origin: text(next.identityOrigin)
      };
      if (!incomingIdentity.documentId) incomingIdentity = ensureDocumentIdentity(type, headerData, { forceLegacy: true });
      else writeIdentity(headerData, incomingIdentity);
      var keys = numericKeys(pagesData);
      currentPage = Number(next.currentPage) || Number(keys[0]) || 1;
      if (!pagesData[String(currentPage)]) currentPage = Number(keys[0]) || 1;
      if (next.view && typeof view !== "undefined") view = clone(next.view);

      if (type === "shotDiagram") {
        holeData = pagesData[String(currentPage)] || {};
        localStorage.setItem("mithrilCanvasPagesM01", JSON.stringify(pagesData));
        localStorage.setItem("mithrilCanvasPageMetaM03", JSON.stringify(pageMeta));
        localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData));
        syncShotHeaderControls();
        if (typeof view !== "undefined") localStorage.setItem("mithrilCanvasViewM01", JSON.stringify(view));
        if (next.extras && next.extras.timingSequence) localStorage.setItem("mithrilCanvasTimingSequenceM397", JSON.stringify(next.extras.timingSequence));
        try { hasUnsentChanges = options.markDirty === true; } catch (error1) {}
        localStorage.setItem("mithrilCanvasUnsentM01", options.markDirty === true ? "true" : "false");
      } else {
        if (next.extras && next.extras.headerCalibration) {
          try {
            headerCalibration = typeof normalizeHeaderCalibration === "function"
              ? normalizeHeaderCalibration(next.extras.headerCalibration)
              : clone(next.extras.headerCalibration);
          } catch (error2) {}
          try {
            if (typeof KEYS !== "undefined" && KEYS.headerCalibration) localStorage.setItem(KEYS.headerCalibration, JSON.stringify(headerCalibration));
          } catch (error3) {}
        }
        if (typeof saveState === "function") saveState();
        try {
          if (typeof KEYS !== "undefined" && KEYS.dirty) localStorage.setItem(KEYS.dirty, options.markDirty === true ? "true" : "false");
        } catch (error4) {}
      }
      refresh({ fitAll: !!options.fitAll, fitCurrent: !!options.fitCurrent });
      return next;
    }

    function renumberPages() {
      var oldKeys = numericKeys(pagesData);
      if (!oldKeys.length) oldKeys = ["1"];
      var newPages = {}, newMeta = {}, map = {};
      oldKeys.forEach(function (oldKey, index) {
        var newKey = String(index + 1);
        map[String(oldKey)] = newKey;
        var data = clone((pagesData || {})[oldKey] || {});
        Object.keys(data).forEach(function (holeId) {
          if (data[holeId] && typeof data[holeId] === "object") data[holeId].PageNumber = index + 1;
        });
        newPages[newKey] = data;
        var meta = clone((pageMeta || {})[oldKey] || { gx: index, gy: 0 });
        meta.name = "Page " + newKey;
        newMeta[newKey] = meta;
      });
      var mapped = map[String(currentPage)] || "1";
      pagesData = newPages;
      pageMeta = newMeta;
      currentPage = Number(mapped);
      if (type === "shotDiagram") holeData = pagesData[String(currentPage)] || {};
      save();
      refresh({ fitCurrent: true });
      return map;
    }

    return {
      contractVersion: 3,
      release: RELEASE_VERSION,
      type: type,
      getInfo: info,
      getSnapshot: getSnapshot,
      applySnapshot: applySnapshot,
      refreshDisplay: refresh,
      save: save,
      renumberPages: renumberPages,
      countHoles: function () { return countHoles(typeof pagesData !== "undefined" ? pagesData : {}); }
    };
  }

  function installAdapter() {
    var adapter = makeAdapter();
    if (!adapter) return null;
    window.MithrilDocument = adapter;
    window.dispatchEvent(new CustomEvent("mithril-document-ready", { detail: { type: adapter.type, contractVersion: adapter.contractVersion } }));
    return adapter;
  }

  function installIdentityGuards() {
    if (window.__mithrilM403IdentityGuards || (!isDrill() && !isShot())) return;
    window.__mithrilM403IdentityGuards = true;

    function capture() {
      var header = typeof headerData !== "undefined" ? headerData || {} : {};
      return ensureDocumentIdentity(docType(), header);
    }
    function persist(identity) {
      if (typeof headerData === "undefined") return;
      writeIdentity(headerData, identity);
      try {
        localStorage.setItem(isDrill() && typeof KEYS !== "undefined" && KEYS.header ? KEYS.header : "mithrilCanvasHeaderM01", JSON.stringify(headerData));
      } catch (error) {}
    }
    function guardFunction(name) {
      var original = window[name];
      if (typeof original !== "function" || original.__mithrilM403IdentityGuard) return;
      var guarded = function () {
        var identity = capture();
        var result = original.apply(this, arguments);
        persist(identity);
        return result;
      };
      guarded.__mithrilM403IdentityGuard = true;
      window[name] = guarded;
    }

    guardFunction("saveInfo");
    guardFunction("saveHeaderData");
    persist(capture());
  }

  function syncShotHeaderControls() {
    if (!isShot() || typeof headerData === "undefined") return;
    var header = headerData || {};
    var values = {
      fieldDate: typeof toDateInputValue === "function" ? toDateInputValue(header.FieldDate) : text(header.FieldDate),
      shotID: text(header.ShotID),
      jobName: text(header.JobName),
      blaster: text(header.Blaster),
      enteredByDefault: text(header.EnteredByDefault)
    };
    Object.keys(values).forEach(function (id) {
      var field = byId(id);
      if (field) field.value = values[id];
    });
  }

  function installShotHeaderPreservation() {
    if (!isShot() || window.__mithrilM4051HeaderPreservation) return;
    window.__mithrilM4051HeaderPreservation = true;
    var originalSaveHeaderData = window.saveHeaderData;
    if (typeof originalSaveHeaderData === "function") {
      var guardedSaveHeaderData = function () {
        var modal = byId("shotInfoModal");
        if (!modal || !modal.classList || !modal.classList.contains("show")) {
          syncShotHeaderControls();
          return typeof headerData !== "undefined" ? headerData : undefined;
        }
        return originalSaveHeaderData.apply(this, arguments);
      };
      guardedSaveHeaderData.__mithrilM4051HeaderPreservation = true;
      window.saveHeaderData = guardedSaveHeaderData;
    }
    syncShotHeaderControls();
  }


  // ---------------------------------------------------------------------------
  // Standardized manual JSON backup files
  // ---------------------------------------------------------------------------

  var MANUAL_BACKUP_FORMAT = "MITHRIL_DOCUMENT_BACKUP";
  var MANUAL_BACKUP_FORMAT_VERSION = 1;

  function backupTemplateId(type) {
    if (type === "drillLog") {
      try { if (typeof TEMPLATE_ID !== "undefined" && text(TEMPLATE_ID)) return text(TEMPLATE_ID); } catch (error) {}
      return "mithril-drill-log-16x34";
    }
    return "mithril-shot-diagram-16x15";
  }

  function backupTemplateName(type) {
    return type === "drillLog" ? "Drill Log 16x34 Construction" : "Shot Diagram 16x15";
  }

  function buildManualBackup(adapter) {
    if (!adapter) throw new Error("The MITHRIL document interface is not available.");
    var info = adapter.getInfo();
    var snapshot = adapter.getSnapshot();
    var out = {
      format: MANUAL_BACKUP_FORMAT,
      backupFormatVersion: MANUAL_BACKUP_FORMAT_VERSION,
      schemaVersion: Number(snapshot.schemaVersion || 2),
      documentContractVersion: Number(adapter.contractVersion || 2),
      type: adapter.type,
      templateId: backupTemplateId(adapter.type),
      templateName: backupTemplateName(adapter.type),
      version: RELEASE_VERSION,
      createdByVersion: RELEASE_VERSION,
      createdAt: new Date().toISOString(),
      app: "MITHRIL Mobile",
      title: info.title,
      documentId: snapshot.documentId,
      identityCreatedAt: snapshot.identityCreatedAt,
      legacyCloudId: snapshot.legacyCloudId || "",
      sourceDocumentId: snapshot.sourceDocumentId || "",
      identityOrigin: snapshot.identityOrigin || "",
      pagesData: clone(snapshot.pagesData || { "1": {} }),
      pageMeta: clone(snapshot.pageMeta || { "1": { gx: 0, gy: 0, name: "Page 1" } }),
      headerData: clone(snapshot.headerData || {}),
      currentPage: Number(snapshot.currentPage || 1),
      view: snapshot.view ? clone(snapshot.view) : null,
      extras: clone(snapshot.extras || {})
    };

    // Keep these legacy mirrors so a new backup can still be opened after a
    // rollback to the older Drill Log or Shot Diagram loader.
    if (adapter.type === "drillLog") {
      out.headerCalibration = clone((snapshot.extras || {}).headerCalibration || null);
    } else {
      out.shotInfo = clone(snapshot.headerData || {});
    }
    return out;
  }

  function backupHeader(value) {
    value = value || {};
    var src = value.payload && !value.pagesData ? value.payload : value;
    return src.headerData || src.shotInfo || src.header || value.headerData || value.shotInfo || {};
  }

  function detectBackupType(value, fallbackType) {
    value = value || {};
    var nested = value.payload && typeof value.payload === "object" ? value.payload : {};
    var explicit = text(value.type || value.documentType || nested.type);
    if (explicit === "drillLog" || explicit === "shotDiagram") return explicit;

    var templateText = [value.templateId, value.templateName, nested.templateId, nested.templateName].map(text).join(" ").toLowerCase();
    if (/drill|16\s*[x×]\s*34/.test(templateText)) return "drillLog";
    if (/shot|16\s*[x×]\s*15/.test(templateText)) return "shotDiagram";

    var header = backupHeader(value);
    if (header && (header.ShotID != null || header.JobName != null || header.Blaster != null || header.EnteredByDefault != null)) return "shotDiagram";
    if (header && (header.DrillLogNumber != null || header.Employee != null || (header.Job != null && header.JobName == null))) return "drillLog";
    if (value.shotInfo || nested.shotInfo) return "shotDiagram";

    var src = value.payload && !value.pagesData ? value.payload : value;
    // Old Shot Diagram backups had pagesData but no type or template ID.
    // Accept that ambiguous legacy shape only while the Shot Diagram is open.
    if (fallbackType === "shotDiagram" && src.pagesData) return "shotDiagram";
    return "";
  }

  function inspectManualBackup(value, fallbackType) {
    var type = detectBackupType(value, fallbackType || docType());
    var snapshot = normalizedSnapshot(value);
    snapshot.type = type || snapshot.type;
    if (!snapshot.documentId) {
      var info = identityInfo(snapshot.type, snapshot.headerData || {});
      snapshot.legacyCloudId = legacyLogicalId(info);
      snapshot.documentId = uuidFromSeed("MITHRIL|" + snapshot.legacyCloudId);
      snapshot.identityCreatedAt = new Date().toISOString();
      snapshot.identityOrigin = "legacy-derived";
      writeIdentity(snapshot.headerData, {
        documentId: snapshot.documentId,
        createdAt: snapshot.identityCreatedAt,
        legacyCloudId: snapshot.legacyCloudId,
        sourceDocumentId: snapshot.sourceDocumentId,
        origin: snapshot.identityOrigin
      });
    }
    if (!snapshot.pagesData || typeof snapshot.pagesData !== "object") throw new Error("This file does not contain MITHRIL page data.");
    return {
      type: type,
      legacy: value && value.format !== MANUAL_BACKUP_FORMAT,
      snapshot: snapshot,
      title: text(value && value.title) || "",
      sourceVersion: text(value && (value.createdByVersion || value.version))
    };
  }

  function backupFileBaseName(adapter) {
    var base = "";
    try {
      if (adapter.type === "drillLog" && typeof exportBaseName === "function") base = text(exportBaseName());
      if (adapter.type === "shotDiagram" && typeof getExportBaseName === "function") base = text(getExportBaseName());
    } catch (error) {}
    if (!base) base = text(adapter.getInfo().title) || docTypeLabel(adapter.type);
    var suffix = adapter.type === "drillLog" ? "Drill Log" : "Shot Diagram";
    if (base.toLowerCase().indexOf(suffix.toLowerCase()) < 0) base += " - " + suffix;
    return base.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  }

  function downloadManualBackup(adapter) {
    try {
      var backup = buildManualBackup(adapter);
      var blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = backupFileBaseName(adapter) + ".json";
      document.body.appendChild(link);
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); if (link.parentNode) link.parentNode.removeChild(link); }, 900);
      showToast(docTypeLabel(adapter.type) + " backup saved in the standardized MITHRIL JSON format.");
      return backup;
    } catch (error) {
      alert(error && error.message ? error.message : "MITHRIL could not create the backup file.");
      return null;
    }
  }

  function loadManualBackupEvent(event) {
    var adapter = window.MithrilDocument;
    var input = event && event.target;
    var file = input && input.files && input.files[0];
    if (!adapter || !file) return;
    var reader = new FileReader();
    reader.onload = function (readEvent) {
      try {
        var raw = JSON.parse(readEvent.target.result);
        var inspected = inspectManualBackup(raw, adapter.type);
        if (!inspected.type) throw new Error("MITHRIL could not determine whether this is a Drill Log or Shot Diagram backup.");
        if (inspected.type !== adapter.type) {
          throw new Error("This backup contains a " + docTypeLabel(inspected.type) + ". Open the " + docTypeLabel(inspected.type) + " before restoring it.");
        }
        var pages = Object.keys(inspected.snapshot.pagesData || {}).length;
        var holes = countHoles(inspected.snapshot.pagesData || {});
        var legacyNote = inspected.legacy ? "\n\nThis is an older MITHRIL backup. It will be converted safely when loaded." : "";
        if (!confirm("Load this " + docTypeLabel(adapter.type) + " backup and replace the current local data?\n\nPages: " + pages + "\nPopulated holes: " + holes + legacyNote)) return;
        adapter.applySnapshot(inspected.snapshot, { markDirty: true, fitAll: adapter.type === "shotDiagram", fitCurrent: adapter.type === "drillLog" });
        closeMenu();
        showToast((inspected.legacy ? "Legacy " : "") + docTypeLabel(adapter.type) + " backup loaded successfully.");
      } catch (error) {
        alert(error && error.message ? error.message : "MITHRIL could not load this backup file.");
      } finally {
        if (input) input.value = "";
      }
    };
    reader.onerror = function () { alert("MITHRIL could not read this backup file."); if (input) input.value = ""; };
    reader.readAsText(file);
  }

  function installManualBackupStandardization(adapter) {
    if (!adapter) return;
    window.downloadJSON = function () { return downloadManualBackup(adapter); };
    if (adapter.type === "drillLog") {
      window.buildBackupPayload = function () { return buildManualBackup(adapter); };
      window.getJSONText = function () { return JSON.stringify(buildManualBackup(adapter), null, 2); };
      window.loadJSON = loadManualBackupEvent;
    } else {
      window.loadJSONBackup = loadManualBackupEvent;
    }
    window.MithrilBackup = {
      format: MANUAL_BACKUP_FORMAT,
      formatVersion: MANUAL_BACKUP_FORMAT_VERSION,
      build: function () { return buildManualBackup(adapter); },
      inspect: function (value) { return inspectManualBackup(value, adapter.type); }
    };
  }

  // ---------------------------------------------------------------------------
  // Page deletion and contiguous numbering
  // ---------------------------------------------------------------------------

  function installPageDeletionPatch(adapter) {
    if (!adapter) return;
    if (adapter.type === "drillLog") {
      window.deletePage = function () {
        var keys = numericKeys(pagesData);
        if (keys.length <= 1) {
          if (!confirm("Clear Page 1?")) return;
          pagesData = { "1": {} };
          pageMeta = { "1": { gx: 0, gy: 0, name: "Page 1" } };
          currentPage = 1;
        } else {
          if (!confirm("Delete Page " + currentPage + "? Remaining pages will be renumbered.")) return;
          delete pagesData[String(currentPage)];
          delete pageMeta[String(currentPage)];
          var remaining = numericKeys(pagesData);
          currentPage = Number(remaining[0]) || 1;
          adapter.renumberPages();
        }
        try { if (typeof invalidatePageCache === "function") invalidatePageCache(); } catch (error1) {}
        adapter.save();
        try { if (typeof markDirty === "function") markDirty(); } catch (error2) {}
        closeMenu();
        adapter.refreshDisplay({ fitCurrent: true });
      };
      return;
    }

    window.deleteCurrentPage = function () {
      var keys = numericKeys(pagesData);
      if (keys.length <= 1) {
        if (!confirm("Clear Page 1?")) return;
        pagesData = { "1": {} };
        pageMeta = { "1": { gx: 0, gy: 0, name: "Page 1" } };
        currentPage = 1;
        holeData = pagesData["1"];
      } else {
        if (!confirm("Delete Page " + currentPage + "? Remaining pages will be renumbered.")) return;
        delete pagesData[String(currentPage)];
        delete pageMeta[String(currentPage)];
        var remaining = numericKeys(pagesData);
        currentPage = Number(remaining[0]) || 1;
        adapter.renumberPages();
      }
      adapter.save();
      try { if (typeof markDirty === "function") markDirty(); } catch (error) {}
      closeMenu();
      adapter.refreshDisplay({ fitCurrent: true });
    };
  }

  // ---------------------------------------------------------------------------
  // Drill PDF: keep grid references on screen, omit them from exported pages
  // ---------------------------------------------------------------------------

  function installDrillPdfPatch() {
    if (!isDrill() || typeof window.renderDrillPageCanvas !== "function" || window.__m400PdfPatched) return;
    window.__m400PdfPatched = true;
    var originalRender = window.renderDrillPageCanvas;
    var originalOutlined = window.drawOutlinedOn;
    if (typeof originalOutlined !== "function") return;
    window.renderDrillPageCanvas = function (pageNum) {
      var saved = window.drawOutlinedOn;
      window.drawOutlinedOn = function (targetCtx, value, x, y, align, stroke, fill) {
        if (fill === "#0b56a8" && stroke === "rgba(255,255,255,.95)") return;
        return originalOutlined.apply(this, arguments);
      };
      try { return originalRender(pageNum); }
      finally { window.drawOutlinedOn = saved; }
    };
  }

  // ---------------------------------------------------------------------------
  // Drill Log -> Shot Diagram compact rotation-aware transfer
  // ---------------------------------------------------------------------------

  function parseDrillHoleID(holeId) {
    var match = /^([A-Z]+)(\d+)$/i.exec(text(holeId));
    if (!match) return null;
    var letters = match[1].toUpperCase(), column = 0;
    for (var i = 0; i < letters.length; i += 1) column = column * 26 + letters.charCodeAt(i) - 64;
    var row = Number(match[2]);
    if (!isFinite(column) || !isFinite(row) || column < 1 || column > 16 || row < 1 || row > 34) return null;
    return { column: column, row: row };
  }
  function shotHoleID(row, column) { return String.fromCharCode(64 + row) + String(column); }
  function orientationLabel(value) {
    if (value === "right") return "Rotate right 90°";
    if (value === "left") return "Rotate left 90°";
    if (value === "180") return "Rotate 180°";
    return "Keep orientation";
  }

  function sourcePoints(payload) {
    var pages = payload.pages || payload.pagesData || {};
    var meta = payload.pageMeta || {};
    var pageKeys = numericKeys(pages);
    var active = [];
    pageKeys.forEach(function (pageKey, pageIndex) {
      var records = pages[pageKey] || {}, valid = [];
      Object.keys(records).forEach(function (holeId) {
        var pos = parseDrillHoleID(holeId), record = records[holeId];
        if (pos && meaningfulRecord(record)) valid.push({ holeId: holeId, pos: pos, record: record });
      });
      if (!valid.length) return;
      var m = meta[pageKey] || {};
      var gx = isFinite(Number(m.gx)) ? Number(m.gx) : pageIndex;
      var gy = isFinite(Number(m.gy)) ? Number(m.gy) : 0;
      active.push({ pageKey: pageKey, gx: gx, gy: gy, valid: valid });
    });
    if (!active.length) return [];

    // Duplicate page positions would overlap every hole. Preserve all data by
    // placing duplicate-position source pages beside the first occurrence.
    var used = {};
    active.forEach(function (page, index) {
      var key = page.gx + "|" + page.gy;
      if (used[key]) {
        page.gx = Math.max.apply(Math, active.map(function (x) { return x.gx; })) + index + 1;
        page.gy = 0;
      }
      used[page.gx + "|" + page.gy] = true;
    });
    var minGX = Math.min.apply(Math, active.map(function (x) { return x.gx; }));
    var minGY = Math.min.apply(Math, active.map(function (x) { return x.gy; }));
    var points = [];
    active.forEach(function (page) {
      page.valid.forEach(function (item) {
        points.push({
          x: (page.gx - minGX) * 16 + item.pos.column - 1,
          y: (page.gy - minGY) * 34 + item.pos.row - 1,
          sourcePage: page.pageKey,
          sourceHoleId: item.holeId,
          record: item.record
        });
      });
    });
    var minX = Math.min.apply(Math, points.map(function (p) { return p.x; }));
    var minY = Math.min.apply(Math, points.map(function (p) { return p.y; }));
    points.forEach(function (p) { p.x -= minX; p.y -= minY; });
    return points;
  }

  function transformPoints(points, orientation) {
    if (!points.length) return [];
    var maxX = Math.max.apply(Math, points.map(function (p) { return p.x; }));
    var maxY = Math.max.apply(Math, points.map(function (p) { return p.y; }));
    return points.map(function (p) {
      var x = p.x, y = p.y, nx = x, ny = y;
      if (orientation === "right") { nx = maxY - y; ny = x; }
      else if (orientation === "left") { nx = y; ny = maxX - x; }
      else if (orientation === "180") { nx = maxX - x; ny = maxY - y; }
      return { x: nx, y: ny, sourcePage: p.sourcePage, sourceHoleId: p.sourceHoleId, record: p.record };
    });
  }

  function defaultShotInfo(header) {
    header = header || {};
    return {
      FieldDate: text(header.FieldDate || header.Date),
      ShotID: text(header.ShotID || header.DrillLogNumber),
      JobName: text(header.JobName || header.Job),
      Blaster: text(header.Blaster || header.Employee),
      EnteredByDefault: text(header.EnteredByDefault || header.Blaster || header.Employee)
    };
  }

  function buildShotImport(payload, orientation) {
    var points = transformPoints(sourcePoints(payload), orientation);
    if (!points.length) return { pages: {}, pageMeta: {}, headerData: {}, pageCount: 0, holeCount: 0, orientation: orientation };
    var tiles = {};
    points.forEach(function (point) {
      var gx = Math.floor(point.x / 16), gy = Math.floor(point.y / 15);
      var localCol = point.x % 16 + 1, localRow = point.y % 15 + 1;
      var key = gx + "|" + gy;
      if (!tiles[key]) tiles[key] = { gx: gx, gy: gy, items: [] };
      tiles[key].items.push({ point: point, row: localRow, column: localCol });
    });
    var ordered = Object.keys(tiles).map(function (key) { return tiles[key]; }).sort(function (a, b) { return a.gy - b.gy || a.gx - b.gx; });
    var minTileX = Math.min.apply(Math, ordered.map(function (x) { return x.gx; }));
    var minTileY = Math.min.apply(Math, ordered.map(function (x) { return x.gy; }));
    var pages = {}, pageMeta = {}, info = payload.shotInfo || defaultShotInfo(payload.sourceHeader || payload.headerData || {}), holeCount = 0;
    ordered.forEach(function (tile, index) {
      var pageNumber = index + 1, pageKey = String(pageNumber);
      pages[pageKey] = {};
      pageMeta[pageKey] = { gx: tile.gx - minTileX, gy: tile.gy - minTileY, name: "Page " + pageNumber };
      tile.items.sort(function (a, b) { return a.row - b.row || a.column - b.column; }).forEach(function (item) {
        var id = shotHoleID(item.row, item.column);
        var next = clone(item.point.record) || {};
        next.PageNumber = pageNumber;
        next.FieldDate = info.FieldDate || "";
        next.ShotID = info.ShotID || "";
        next.JobName = info.JobName || "";
        next.Blaster = info.Blaster || "";
        next.HoleID = id;
        next.Depth = text(item.point.record.Depth);
        next.Overburden = text(item.point.record.Overburden);
        next.Stemming = "";
        next.PrimaryLoad = "";
        next.SecondaryLoad = "";
        next.Timing = "";
        next.Wet = flagYes(item.point.record.Wet) ? "Yes" : "No";
        next.BadHole = flagYes(item.point.record.BadHole) ? "Yes" : "No";
        next.DirtHole = flagYes(item.point.record.DirtHole) ? "Yes" : "No";
        next.Notes = text(item.point.record.Notes);
        next.EnteredBy = info.EnteredByDefault || info.Blaster || "";
        next.Timestamp = new Date().toLocaleString();
        next.SourceDrillPage = Number(item.point.sourcePage) || item.point.sourcePage;
        next.SourceDrillHoleID = item.point.sourceHoleId;
        pages[pageKey][id] = next;
        holeCount += 1;
      });
    });
    var header = stripIdentity(payload.sourceHeader || payload.headerData || {});
    header.FieldDate = info.FieldDate || text(header.Date);
    header.ShotID = info.ShotID || text(header.DrillLogNumber);
    header.JobName = info.JobName || text(header.Job);
    header.Blaster = info.Blaster || text(header.Employee);
    header.EnteredByDefault = info.EnteredByDefault || header.Blaster || text(header.Employee);
    header.TimingSequence = { start: 0, interval: 25, next: 0, direction: "ltr", overwrite: "blank", active: false };
    header.ImportedFromDrillLog = true;
    header.DrillLogImportRelease = RELEASE_VERSION;
    header.DrillLogImportOrientation = orientation;
    header.DrillLogImportedAt = new Date().toISOString();
    writeIdentity(header, {
      documentId: randomUuid(),
      createdAt: new Date().toISOString(),
      legacyCloudId: "",
      sourceDocumentId: text(payload.sourceDocumentId),
      origin: "converted"
    });
    return { pages: pages, pageMeta: pageMeta, headerData: header, pageCount: ordered.length, holeCount: holeCount, orientation: orientation };
  }

  function orientationCounts(payload) {
    var values = ["keep", "right", "left", "180"], result = {};
    values.forEach(function (value) { result[value] = buildShotImport(payload, value).pageCount; });
    var preferred = values.slice().sort(function (a, b) { return result[a] - result[b] || values.indexOf(a) - values.indexOf(b); })[0];
    return { counts: result, preferred: preferred };
  }

  function ensureTransferModal() {
    var modal = byId("m400TransferModal");
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m400TransferModal";
    modal.className = "m400Modal";
    modal.innerHTML = [
      '<div class="m400Box">',
      '<div class="m400Head"><strong>Create Shot Diagram from Drill Log — m40.0</strong><button type="button" id="m400TransferClose">Close</button></div>',
      '<div id="m400TransferStats" class="m400Stats"></div>',
      '<div class="m400Grid">',
      '<label class="m400Wide">Shot orientation<select id="m400Orientation"></select></label>',
      '<label>Date<input id="m400Date" type="text" placeholder="MM/DD/YYYY"></label>',
      '<label>Shot Number<input id="m400ShotID" type="text"></label>',
      '<label>Job<input id="m400Job" type="text"></label>',
      '<label>Blaster<input id="m400Blaster" type="text"></label>',
      '</div>',
      '<div id="m400OrientationNote" class="m400Note m400Warning"></div>',
      '<div class="m400Note">MITHRIL tiles only populated holes onto 16 × 15 Shot Diagram pages. Empty result pages are not created, and destination pages are numbered consecutively.</div>',
      '<div class="m400Note">Depth, overburden, conditions, and notes are copied. Stemming, explosive loads, and timing start blank.</div>',
      '<div class="m400Actions"><button type="button" id="m400TransferCancel">Cancel</button><button type="button" class="primary" id="m400TransferStart">Open Shot Diagram</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m400TransferClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m400TransferCancel").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m400TransferStart").addEventListener("click", stageTransfer);
    byId("m400Orientation").addEventListener("change", updateTransferPreview);
    return modal;
  }

  function selectedOrientation(modal) {
    var select = byId("m400Orientation"), selected = select ? select.value : "auto";
    if (selected === "auto") return modal.__orientationInfo.preferred;
    return selected;
  }

  function updateTransferPreview() {
    var modal = byId("m400TransferModal");
    if (!modal || !modal.__payload) return;
    var selected = selectedOrientation(modal), counts = modal.__orientationInfo.counts;
    var result = buildShotImport(modal.__payload, selected);
    byId("m400TransferStats").innerHTML = [
      stat(numericKeys(modal.__payload.pages || {}).filter(function (key) { return Object.keys((modal.__payload.pages || {})[key] || {}).some(function (id) { return meaningfulRecord(modal.__payload.pages[key][id]); }); }).length, "Drill Log pages"),
      stat(result.pageCount, "Shot Diagram pages"),
      stat(result.holeCount, "Holes copied")
    ].join("");
    byId("m400OrientationNote").textContent = orientationLabel(selected) + " produces " + result.pageCount + " populated Shot Diagram page" + (result.pageCount === 1 ? "" : "s") + ". Page counts — keep: " + counts.keep + ", right: " + counts.right + ", left: " + counts.left + ", 180°: " + counts["180"] + ".";
  }

  function openTransfer() {
    if (!hasPermission("convert")) return restrictedMessage("Drill Log to Shot Diagram conversion");
    closeMenu();
    var adapter = window.MithrilDocument;
    if (!adapter || adapter.type !== "drillLog") { alert("Open the Drill Log before creating a Shot Diagram."); return; }
    var snap = adapter.getSnapshot();
    if (!countHoles(snap.pagesData)) { alert("No populated Drill Log holes were found."); return; }
    var payload = {
      transferType: "mithril-drill-log-to-shot-diagram-m400",
      transferVersion: 2,
      release: RELEASE_VERSION,
      createdAt: new Date().toISOString(),
      pages: snap.pagesData,
      pageMeta: snap.pageMeta,
      sourceHeader: snap.headerData,
      sourceDocumentId: snap.documentId
    };
    var modal = ensureTransferModal(), info = orientationCounts(payload), defaults = defaultShotInfo(snap.headerData);
    modal.__payload = payload;
    modal.__orientationInfo = info;
    var select = byId("m400Orientation");
    select.innerHTML = [
      '<option value="auto">Auto — fewest pages (' + info.counts[info.preferred] + ', ' + escapeHtml(orientationLabel(info.preferred)) + ')</option>',
      '<option value="keep">Keep orientation — ' + info.counts.keep + ' pages</option>',
      '<option value="right">Rotate right 90° — ' + info.counts.right + ' pages</option>',
      '<option value="left">Rotate left 90° — ' + info.counts.left + ' pages</option>',
      '<option value="180">Rotate 180° — ' + info.counts["180"] + ' pages</option>'
    ].join("");
    select.value = "auto";
    byId("m400Date").value = defaults.FieldDate;
    byId("m400ShotID").value = defaults.ShotID;
    byId("m400Job").value = defaults.JobName;
    byId("m400Blaster").value = defaults.Blaster;
    updateTransferPreview();
    modal.classList.add("show");
  }

  function stageTransfer() {
    var modal = byId("m400TransferModal"), payload = modal && modal.__payload;
    if (!payload) { alert("The Drill Log transfer is no longer available."); return; }
    payload.orientation = selectedOrientation(modal);
    payload.shotInfo = {
      FieldDate: text(byId("m400Date").value),
      ShotID: text(byId("m400ShotID").value),
      JobName: text(byId("m400Job").value),
      Blaster: text(byId("m400Blaster").value),
      EnteredByDefault: text(byId("m400Blaster").value)
    };
    try { localStorage.setItem(TRANSFER_KEY, JSON.stringify(payload)); }
    catch (error) { alert("The Drill Log is too large to stage for transfer in this browser. No data was changed."); return; }
    modal.classList.remove("show");
    window.location.href = "./shot_diagram_m38.html?m400DrillImport=" + Date.now();
  }

  function readPendingTransfer() {
    try { var raw = localStorage.getItem(TRANSFER_KEY); return raw ? JSON.parse(raw) : null; }
    catch (error) { return null; }
  }
  function saveUndo(snapshot) {
    var raw = JSON.stringify(snapshot);
    try { sessionStorage.setItem(UNDO_KEY, raw); return true; }
    catch (error1) { try { localStorage.setItem(UNDO_KEY, raw); return true; } catch (error2) { return false; } }
  }
  function readUndo() {
    var raw = null;
    try { raw = sessionStorage.getItem(UNDO_KEY); } catch (error1) {}
    if (!raw) try { raw = localStorage.getItem(UNDO_KEY); } catch (error2) {}
    try { return raw ? JSON.parse(raw) : null; } catch (error3) { return null; }
  }
  function clearUndo() {
    try { sessionStorage.removeItem(UNDO_KEY); } catch (error1) {}
    try { localStorage.removeItem(UNDO_KEY); } catch (error2) {}
  }

  function ensureImportReview() {
    var modal = byId("m400ImportModal");
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m400ImportModal";
    modal.className = "m400Modal";
    modal.innerHTML = [
      '<div class="m400Box">',
      '<div class="m400Head"><strong>Import Drill Log into Shot Diagram</strong><button type="button" id="m400ImportClose">Cancel</button></div>',
      '<div id="m400ImportStats" class="m400Stats"></div>',
      '<div id="m400ImportOrientation" class="m400Note m400Warning"></div>',
      '<div id="m400ImportExisting" class="m400Note m400Danger" style="display:none"></div>',
      '<div class="m400Note">Only populated result pages are created. Pages are numbered 1, 2, 3… with no gaps. The current Shot Diagram is saved as an undo snapshot before replacement.</div>',
      '<div class="m400Actions"><button type="button" id="m400ImportCancel">Cancel Import</button><button type="button" class="primary" id="m400ImportConfirm">Import Drill Log</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    function cancel() { modal.classList.remove("show"); try { localStorage.removeItem(TRANSFER_KEY); } catch (error) {} }
    byId("m400ImportClose").addEventListener("click", cancel);
    byId("m400ImportCancel").addEventListener("click", cancel);
    byId("m400ImportConfirm").addEventListener("click", performImport);
    return modal;
  }

  function openImportReview() {
    if (!hasPermission("convert")) return;
    if (!isShot()) return;
    var payload = readPendingTransfer();
    if (!payload || payload.transferType !== "mithril-drill-log-to-shot-diagram-m400") return;
    var result = buildShotImport(payload, payload.orientation || "keep");
    if (!result.holeCount) { localStorage.removeItem(TRANSFER_KEY); alert("The staged Drill Log did not contain transferable holes."); return; }
    var modal = ensureImportReview();
    modal.__result = result;
    byId("m400ImportStats").innerHTML = [stat(result.holeCount, "Holes imported"), stat(result.pageCount, "Shot Diagram pages"), stat(orientationLabel(result.orientation), "Orientation")].join("");
    byId("m400ImportOrientation").textContent = orientationLabel(result.orientation) + " was selected. Empty pages were removed before numbering.";
    var existing = window.MithrilDocument ? window.MithrilDocument.countHoles() : 0;
    var warning = byId("m400ImportExisting");
    warning.style.display = existing ? "block" : "none";
    warning.textContent = existing ? "This device currently has a Shot Diagram with " + existing + " populated hole" + (existing === 1 ? "" : "s") + ". Importing replaces it; Undo Last Drill Log Import can restore it." : "";
    modal.classList.add("show");
  }

  function performImport() {
    var modal = byId("m400ImportModal"), result = modal && modal.__result, adapter = window.MithrilDocument;
    if (!adapter || adapter.type !== "shotDiagram" || !result) { alert("The Drill Log import is no longer available."); return; }
    var before = adapter.getSnapshot();
    if (!saveUndo(before)) { alert("MITHRIL could not save the required undo snapshot, so no data was changed."); return; }
    try {
      adapter.applySnapshot({
        schemaVersion: 2,
        type: "shotDiagram",
        pagesData: result.pages,
        pageMeta: result.pageMeta,
        headerData: result.headerData,
        currentPage: 1,
        view: null,
        extras: { timingSequence: result.headerData.TimingSequence }
      }, { markDirty: true, fitAll: true });
      localStorage.removeItem(TRANSFER_KEY);
      modal.classList.remove("show");
      updateUndoButton();
      showToast("Imported " + result.holeCount + " Drill Log holes onto " + result.pageCount + " consecutively numbered Shot Diagram page" + (result.pageCount === 1 ? "" : "s") + ".");
    } catch (error) {
      try { adapter.applySnapshot(before, { markDirty: false, fitAll: true }); } catch (restoreError) {}
      clearUndo();
      alert("The Drill Log import failed and MITHRIL restored the previous Shot Diagram.");
    }
  }

  function undoImport() {
    var adapter = window.MithrilDocument, snap = readUndo();
    if (!adapter || !snap) { alert("No Drill Log import undo snapshot is available on this device."); return; }
    if (!confirm("Undo the last Drill Log import? This removes Shot Diagram work completed since that import.")) return;
    adapter.applySnapshot(snap, { markDirty: true, fitAll: true });
    clearUndo();
    updateUndoButton();
    showToast("The previous Shot Diagram was restored.");
  }

  function installTransferButtons() {
    if (currentProfile && !hasPermission("convert")) {
      ["m400TransferButton", "m400ImportButton", "m400UndoImportButton"].forEach(function (id) {
        var old = byId(id);
        if (old && old.parentNode) old.parentNode.removeChild(old);
      });
      return false;
    }
    var menu = byId("menuModal");
    if (!menu) return false;
    ["m398CreateShotFromDrill", "m398UndoDrillImportMenu"].forEach(function (id) { var old = byId(id); if (old && old.parentNode) old.parentNode.removeChild(old); });
    var oldModal = byId("m398DrillTransferModal"); if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);
    var oldImport = byId("m398ShotImportModal"); if (oldImport && oldImport.parentNode) oldImport.parentNode.removeChild(oldImport);

    var stack = menu.querySelector(".m395MenuStack");
    if (isDrill() && !byId("m400CreateShotButton")) {
      var button = document.createElement("button");
      button.id = "m400CreateShotButton";
      button.type = "button";
      button.className = "wide primary";
      button.textContent = "Create Shot Diagram from Drill Log";
      button.addEventListener("click", openTransfer);
      if (stack) {
        var edit = stack.querySelector('[data-m395-action="editHoles"]');
        if (edit && edit.parentNode === stack) stack.insertBefore(button, edit.nextSibling); else stack.insertBefore(button, stack.firstChild);
      } else {
        var grid = menu.querySelector(".menuGrid"); if (grid) grid.appendChild(button);
      }
    }
    if (isShot() && !byId("m400UndoImportButton")) {
      var target = menu.querySelector("#m395ShotBackup .m395ActionGrid") || menu.querySelector("#m395ShotExport .m395ActionGrid") || stack || menu.querySelector(".menuGrid");
      if (target) {
        var undo = document.createElement("button");
        undo.id = "m400UndoImportButton";
        undo.type = "button";
        undo.className = "wide";
        undo.textContent = "Undo Last Drill Log Import";
        undo.addEventListener("click", function () { closeMenu(); undoImport(); });
        target.appendChild(undo);
        updateUndoButton();
      }
    }
    return true;
  }
  function updateUndoButton() { var b = byId("m400UndoImportButton"); if (b) b.disabled = !readUndo(); }

  // ---------------------------------------------------------------------------
  // Standardized cloud sync - uses MithrilDocument only
  // ---------------------------------------------------------------------------

  function friendlyError(error) {
    var code = error && error.code ? String(error.code) : "";
    if (code.indexOf("auth/invalid-credential") >= 0 || code.indexOf("auth/wrong-password") >= 0) return "Email or password was not accepted.";
    if (code.indexOf("auth/too-many-requests") >= 0) return "Firebase temporarily blocked repeated sign-in attempts. Wait a few minutes and try again.";
    if (code.indexOf("permission-denied") >= 0) return "Firestore denied access. Confirm the private per-user rules are still published.";
    if (code.indexOf("unavailable") >= 0 || !navigator.onLine) return "Cloud service is unavailable or this device is offline.";
    return text(error && error.message) || "The cloud operation did not complete.";
  }
  function deviceName() {
    var saved = "";
    try { saved = localStorage.getItem(DEVICE_KEY) || ""; } catch (error) {}
    return saved || "MITHRIL Device";
  }
  function saveDeviceName(value) {
    value = text(value) || "MITHRIL Device";
    try { localStorage.setItem(DEVICE_KEY, value); } catch (error) {}
    return value;
  }
  function snapshotFingerprint(snapshot) {
    var value = normalizedSnapshot(snapshot || {});
    return JSON.stringify({ type: value.type, pagesData: value.pagesData, pageMeta: value.pageMeta, headerData: stripIdentity(value.headerData), extras: value.extras });
  }
  function syncStorageKey(id) { return SYNC_META_PREFIX + (currentUser ? currentUser.uid : "signed-out") + ":" + id; }
  function recoveryStorageKey(id) { return RECOVERY_PREFIX + (currentUser ? currentUser.uid : "signed-out") + ":" + id; }
  function readJsonStorage(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (error) { return null; } }
  function writeJsonStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { return false; } }
  function readSyncMeta(id) { return readJsonStorage(syncStorageKey(id)); }
  function writeSyncMeta(id, revision, snapshot, cloudData) {
    var meta = { revision: Number(revision || 0), fingerprint: snapshotFingerprint(snapshot), syncedAt: new Date().toISOString(), sourceDevice: cloudData && cloudData.sourceDevice || deviceName() };
    writeJsonStorage(syncStorageKey(id), meta);
    return meta;
  }
  function currentSyncState(cloudData, cloudPathId) {
    var data = cloudRecord(), id = logicalId(data), snapshot = data.payload;
    var meta = readSyncMeta(id);
    if (!meta && cloudPathId && cloudPathId !== id) meta = readSyncMeta(cloudPathId);
    var fingerprint = snapshotFingerprint(snapshot);
    var cloudRevision = cloudData ? Number(cloudData.revision || 1) : 0;
    var cloudFingerprint = cloudData ? snapshotFingerprint(cloudData.payload || cloudData) : "";
    if (cloudData && !meta && fingerprint === cloudFingerprint) meta = writeSyncMeta(id, cloudRevision, snapshot, cloudData);
    return { data: data, id: id, cloudPathId: cloudPathId || id, snapshot: snapshot, meta: meta, fingerprint: fingerprint, dirty: !meta || meta.fingerprint !== fingerprint, lastRevision: meta ? Number(meta.revision || 0) : 0, cloudRevision: cloudRevision, cloudFingerprint: cloudFingerprint };
  }
  function matchingCloudItem() {
    var record = cloudRecord(), id = record && logicalId(record);
    var legacyId = record && text(record.legacyCloudId);
    for (var i = 0; id && i < cloudItems.length; i += 1) {
      if (cloudItems[i].id === id || text(cloudItems[i].data && cloudItems[i].data.documentId) === id || (legacyId && cloudItems[i].id === legacyId)) return cloudItems[i];
    }
    return null;
  }
  function saveRecovery(id, adapter, meta) {
    return writeJsonStorage(recoveryStorageKey(id), { savedAt: new Date().toISOString(), snapshot: adapter.getSnapshot(), syncMeta: meta || null });
  }
  function updateUndoCloudButton() {
    var button = byId("m401UndoCloud"), record = window.MithrilDocument && cloudRecord();
    if (button) button.disabled = !record || !readJsonStorage(recoveryStorageKey(logicalId(record)));
  }
  function renderLocalCloudStatus() {
    var local = byId("m401LocalStatus"), cloud = byId("m401CloudStatus");
    if (!local || !cloud || !window.MithrilDocument) return;
    var item = matchingCloudItem(), d = item && item.data, state = currentSyncState(d, item && item.id);
    var localLabel = state.dirty ? "Modified on this device" : (state.meta ? "Matches last sync" : "Not yet linked to cloud");
    local.innerHTML = "<h3>LOCAL</h3><b>" + escapeHtml(localLabel) + "</b><span>" + escapeHtml(state.data.holeCount || 0) + " populated holes<br>Last synced revision: " + escapeHtml(state.lastRevision || "None") + "</span>";
    cloud.innerHTML = "<h3>CLOUD</h3>" + (d ? "<b>Revision " + escapeHtml(d.revision || 1) + "</b><span>" + escapeHtml(d.holeCount || 0) + " populated holes<br>" + escapeHtml(formatTime(d.updatedAt)) + "<br>" + escapeHtml(d.sourceDevice || "Unknown device") + "</span>" : "<b>No matching cloud copy</b><span>Smart Sync will upload this document.</span>");
    updateUndoCloudButton();
  }

  function defaultUserProfile(user) {
    var email = text(user && user.email);
    var name = text(user && user.displayName) || (email ? email.split("@")[0] : "MITHRIL User");
    return {
      schemaVersion: 1,
      type: "userProfile",
      uid: text(user && user.uid),
      email: email,
      displayName: name,
      role: "member",
      organizationId: "personal",
      status: "active"
    };
  }
  function normalizeUserProfile(user, data) {
    var fallback = defaultUserProfile(user), source = data || {};
    var allowedRoles = ["administrator", "blaster", "driller", "driver", "viewer", "member"];
    var role = text(source.role).toLowerCase();
    if (allowedRoles.indexOf(role) < 0) role = fallback.role;
    var status = text(source.status).toLowerCase();
    if (["active", "inactive", "disabled"].indexOf(status) < 0) status = fallback.status;
    return {
      schemaVersion: Math.max(2, Number(source.schemaVersion || fallback.schemaVersion)),
      type: "userProfile",
      uid: text(source.uid) || fallback.uid,
      email: text(source.email) || fallback.email,
      displayName: text(source.displayName) || fallback.displayName,
      role: role,
      organizationId: text(source.organizationId) || fallback.organizationId,
      status: status
    };
  }
  function roleLabel(role) {
    var labels = { administrator: "Administrator", blaster: "Blaster", driller: "Driller", driver: "Driver", viewer: "Viewer", member: "Member" };
    return labels[text(role).toLowerCase()] || "Member";
  }
  var ROLE_PERMISSIONS = {
    administrator: { drill: true, shot: true, edit: true, convert: true, export: true, cloudRead: true, cloudWrite: true, cloudDelete: true, userAdmin: true },
    blaster:       { drill: true, shot: true, edit: true, convert: true, export: true, cloudRead: true, cloudWrite: true, cloudDelete: true, userAdmin: false },
    driller:       { drill: true, shot: false, edit: true, convert: false, export: true, cloudRead: true, cloudWrite: true, cloudDelete: true, userAdmin: false },
    driver:        { drill: false, shot: false, edit: false, convert: false, export: false, cloudRead: false, cloudWrite: false, cloudDelete: false, userAdmin: false },
    viewer:        { drill: true, shot: true, edit: false, convert: false, export: true, cloudRead: true, cloudWrite: false, cloudDelete: false, userAdmin: false },
    member:        { drill: true, shot: true, edit: true, convert: true, export: true, cloudRead: true, cloudWrite: true, cloudDelete: true, userAdmin: false }
  };
  function currentRole() {
    return text(currentProfile && currentProfile.role || "member").toLowerCase();
  }
  function permissionsFor(role) {
    return ROLE_PERMISSIONS[text(role).toLowerCase()] || ROLE_PERMISSIONS.member;
  }
  function hasPermission(name) {
    if (!currentProfile || /^(?:disabled|inactive)$/i.test(text(currentProfile.status))) return false;
    return !!permissionsFor(currentRole())[name];
  }
  function restrictedMessage(action) {
    var message = action + " is not available to the " + roleLabel(currentRole()) + " role.";
    alert("ACCESS RESTRICTED\n\n" + message + "\n\nContact a MITHRIL administrator if this access is required.");
    return false;
  }
  function readVerifiedUser() {
    var cached = readJsonStorage(LAST_VERIFIED_USER_KEY);
    return cached && cached.uid ? cached : null;
  }
  function cacheVerifiedUser(profile) {
    if (!profile || !profile.uid) return false;
    return writeJsonStorage(LAST_VERIFIED_USER_KEY, {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      organizationId: profile.organizationId,
      status: profile.status,
      verifiedAt: new Date().toISOString()
    });
  }
  function clearVerifiedUser() {
    try { localStorage.removeItem(LAST_VERIFIED_USER_KEY); } catch (error) {}
  }
  function legacyProfileDocumentRef(fb, uid) {
    return fb.storeMod.doc(fb.db, "users", uid, "documents", PROFILE_DOCUMENT_ID);
  }
  function profileDocumentRef(fb, uid) {
    return fb.storeMod.doc(fb.db, PROFILE_COLLECTION, uid);
  }
  function loadUserProfile(fb, user) {
    if (profilePromise && profilePromiseUid === user.uid) return profilePromise;
    profilePromiseUid = user.uid;
    var ref = profileDocumentRef(fb, user.uid);
    profilePromise = fb.storeMod.getDoc(ref).then(function (snap) {
      if (snap.exists()) return normalizeUserProfile(user, snap.data());
      return fb.storeMod.getDoc(legacyProfileDocumentRef(fb, user.uid)).catch(function () { return null; }).then(function (legacySnap) {
        var legacy = legacySnap && legacySnap.exists && legacySnap.exists() ? legacySnap.data() : null;
        var profile = normalizeUserProfile(user, legacy || defaultUserProfile(user));
        // The first secure self-created profile is deliberately non-privileged.
        // Administrators assign elevated roles after registration.
        profile.role = "member";
        profile.status = "active";
        profile.organizationId = text(profile.organizationId) || "personal";
        var record = clone(profile);
        record.createdAt = fb.storeMod.serverTimestamp();
        record.updatedAt = fb.storeMod.serverTimestamp();
        return fb.storeMod.setDoc(ref, record).then(function () { return profile; });
      });
    }).catch(function () {
      // Authentication remains usable if existing rules have not yet been
      // expanded for the profile record. The safe member profile preserves the
      // current feature set and can be persisted after the rules are updated.
      return defaultUserProfile(user);
    }).then(function (profile) {
      currentProfile = profile;
      offlineUserSession = false;
      cacheVerifiedUser(profile);
      renderLandingAuth();
      refreshCloudAuth();
      applyDocumentRoleUI();
      return profile;
    });
    return profilePromise;
  }
  function setTemplateAccess(enabled) {
    var cards = document.querySelector(".templateCards");
    if (!cards) return;
    var buttons = cards.querySelectorAll("button");
    var anyEnabled = false;
    Array.prototype.forEach.call(buttons, function (button, index) {
      var allowed = !!enabled && (index === 0 ? hasPermission("shot") : hasPermission("drill"));
      button.disabled = !allowed;
      button.classList.toggle("m404TemplateLocked", !allowed);
      button.setAttribute("aria-disabled", allowed ? "false" : "true");
      if (allowed) anyEnabled = true;
    });
    cards.classList.toggle("m404TemplateLocked", !enabled || !anyEnabled);
  }
  function ensureLandingAuth() {
    var start = byId("templateStart"), box = start && start.querySelector(".startBox");
    if (!box) return null;
    ensureStyles();
    var panel = byId("m404LandingAuth");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "m404LandingAuth";
    panel.className = "m404LandingAuth";
    panel.innerHTML = [
      '<div class="m404LandingHead"><strong>User Access</strong><span id="m404AuthState" class="m404AuthState">Checking sign-in…</span></div>',
      '<div id="m404AuthOut">',
      '<div class="m404AuthForm"><input id="m404Email" type="email" autocomplete="username" placeholder="Email"><input id="m404Password" type="password" autocomplete="current-password" placeholder="Password"><button id="m404SignIn" type="button">Sign In</button></div>',
      '</div>',
      '<div id="m404AuthIn" class="m404SignedIn" style="display:none"><div><div id="m404UserName" class="m404UserName"></div><div id="m404UserMeta" class="m404UserMeta"></div></div><div class="m405UserActions"><button id="m405ManageUsers" type="button" style="display:none">Manage Users</button><button id="m404SignOut" type="button">Sign Out</button></div></div>',
      '<div id="m404AuthMessage" class="m404AuthMessage"></div>'
    ].join("");
    var intro = box.querySelector(".startIntro");
    box.insertBefore(panel, intro || box.firstChild);
    byId("m404SignIn").addEventListener("click", landingSignIn);
    byId("m404SignOut").addEventListener("click", landingSignOut);
    byId("m405ManageUsers").addEventListener("click", openUserAdmin);
    byId("m404Password").addEventListener("keydown", function (event) { if (event.key === "Enter") landingSignIn(); });
    setTemplateAccess(false);
    return panel;
  }
  function setLandingMessage(message, kind) {
    var el = byId("m404AuthMessage");
    if (!el) return;
    el.textContent = message || "";
    el.className = "m404AuthMessage" + (message ? " show" : "");
    if (kind === "good") el.style.color = "#9de0ae";
    else if (kind === "bad") el.style.color = "#ffadad";
    else el.style.color = "#ffd37a";
  }
  function renderLandingAuth() {
    if (!ensureLandingAuth()) return;
    var out = byId("m404AuthOut"), inside = byId("m404AuthIn"), state = byId("m404AuthState");
    var profile = currentProfile;
    var active = !!profile && !/^(?:disabled|inactive)$/i.test(text(profile.status));
    out.style.display = profile ? "none" : "block";
    inside.style.display = profile ? "flex" : "none";
    setTemplateAccess(active);
    if (profile) {
      byId("m404UserName").textContent = profile.displayName || profile.email || "MITHRIL User";
      byId("m404UserMeta").textContent = (offlineUserSession ? "Offline access" : "Signed in") + " · " + roleLabel(profile.role) + (profile.organizationId && profile.organizationId !== "personal" ? " · " + profile.organizationId : "");
      state.textContent = offlineUserSession ? "OFFLINE" : (/^(?:disabled|inactive)$/i.test(text(profile.status)) ? "ACCESS DISABLED" : "SIGNED IN");
      if (byId("m405ManageUsers")) byId("m405ManageUsers").style.display = !offlineUserSession && hasPermission("userAdmin") ? "block" : "none";
      var noTemplates = active && !hasPermission("drill") && !hasPermission("shot");
      setLandingMessage(active ? (offlineUserSession ? "Using the last verified account on this device. Cloud Sync will reconnect when service returns." : (noTemplates ? "No current field templates are assigned to this role yet." : "")) : "This account is inactive. Contact a MITHRIL administrator.", active && !noTemplates ? "" : "bad");
    } else {
      state.textContent = "SIGN IN REQUIRED";
    }
  }
  function useOfflineVerifiedUser(reason) {
    var cached = readVerifiedUser();
    if (!cached) return false;
    currentUser = null;
    currentProfile = normalizeUserProfile({ uid: cached.uid, email: cached.email, displayName: cached.displayName }, cached);
    offlineUserSession = true;
    renderLandingAuth();
    if (reason) setLandingMessage(reason, "");
    return true;
  }
  function installLandingActionGuards() {
    if (window.__mithrilM405LandingGuards) return;
    window.__mithrilM405LandingGuards = true;
    var originalShot = window.openStableShotDiagram;
    var originalDrill = window.openDrillLog;
    if (typeof originalShot === "function") window.openStableShotDiagram = function () {
      if (!hasPermission("shot")) return restrictedMessage("Shot Diagram");
      return originalShot.apply(this, arguments);
    };
    if (typeof originalDrill === "function") window.openDrillLog = function () {
      if (!hasPermission("drill")) return restrictedMessage("Drill Log");
      var result = originalDrill.apply(this, arguments);
      applyDocumentRoleUI();
      return result;
    };
  }
  function landingSignIn() {
    var email = text(byId("m404Email").value), password = byId("m404Password").value;
    if (!email || !password) { setLandingMessage("Enter the account email and password.", "bad"); return; }
    setTemplateAccess(false);
    byId("m404AuthState").textContent = "SIGNING IN…";
    setLandingMessage("", "");
    loadFirebase().then(function (fb) {
      return fb.authMod.signInWithEmailAndPassword(fb.auth, email, password).then(function (cred) {
        currentUser = cred.user;
        byId("m404Password").value = "";
        return loadUserProfile(fb, cred.user);
      });
    }).catch(function (error) {
      currentUser = null;
      currentProfile = null;
      renderLandingAuth();
      setLandingMessage(friendlyError(error), "bad");
    });
  }
  function landingSignOut() {
    setTemplateAccess(false);
    byId("m404AuthState").textContent = "SIGNING OUT…";
    loadFirebase().then(function (fb) { return fb.authMod.signOut(fb.auth); }).then(function () {
      currentUser = null;
      currentProfile = null;
      offlineUserSession = false;
      profilePromise = null;
      profilePromiseUid = "";
      clearVerifiedUser();
      renderLandingAuth();
      setLandingMessage("Signed out. Local document data remains on this device.", "good");
    }).catch(function (error) { setLandingMessage(friendlyError(error), "bad"); });
  }
  function bootLandingAuth() {
    if (!ensureLandingAuth()) return;
    installLandingActionGuards();
    renderLandingAuth();
    loadFirebase().then(function (fb) {
      if (fb.auth.currentUser) return loadUserProfile(fb, fb.auth.currentUser);
      currentUser = null;
      currentProfile = null;
      offlineUserSession = false;
      renderLandingAuth();
    }).catch(function () {
      if (!useOfflineVerifiedUser("Firebase could not be reached. Using the last verified account on this device.")) {
        renderLandingAuth();
        setLandingMessage("Sign-in could not be reached. Connect to the internet and try again.", "bad");
      }
    });
  }

  function ensureUserAdminModal() {
    var modal = byId("m405UserAdminModal");
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m405UserAdminModal";
    modal.className = "m400Modal";
    modal.innerHTML = [
      '<div class="m400Box m405AdminBox">',
      '<div class="m400Head"><strong>MITHRIL User Roles · m40.5</strong><button type="button" id="m405AdminClose">Close</button></div>',
      '<div class="m400Note">Users appear here after they have registered through Firebase Authentication and signed in to MITHRIL at least once. Role and status changes take effect the next time that user connects online.</div>',
      '<div class="m400Actions"><button type="button" id="m405AdminRefresh">Refresh Users</button><button type="button" id="m405AdminRules">Security Rules Status</button></div>',
      '<div id="m405AdminStatus" class="m400Status">Ready.</div>',
      '<div id="m405AdminRows" class="m405AdminRows"></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m405AdminClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m405AdminRefresh").addEventListener("click", refreshUserAdmin);
    byId("m405AdminRules").addEventListener("click", function () {
      alert("MITHRIL app permissions and Firebase security rules must both be installed.\n\nIf this screen can list users and save a role, the m40.5 profile rules are active.");
    });
    return modal;
  }
  function setAdminStatus(message, kind) {
    var el = byId("m405AdminStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "m400Status " + (kind || "");
  }
  function openUserAdmin() {
    if (offlineUserSession || !currentUser) return restrictedMessage("User management while offline");
    if (!hasPermission("userAdmin")) return restrictedMessage("User management");
    var modal = ensureUserAdminModal();
    modal.classList.add("show");
    refreshUserAdmin();
  }
  function refreshUserAdmin() {
    if (!currentUser || !hasPermission("userAdmin")) return Promise.resolve();
    setAdminStatus("Loading registered users…", "wait");
    return loadFirebase().then(function (fb) {
      return fb.storeMod.getDocs(fb.storeMod.collection(fb.db, PROFILE_COLLECTION)).then(function (snap) {
        var profiles = [];
        snap.forEach(function (item) { profiles.push(normalizeUserProfile({ uid: item.id }, item.data())); });
        profiles.sort(function (a, b) { return (a.displayName || a.email).localeCompare(b.displayName || b.email); });
        renderUserAdminRows(profiles);
        setAdminStatus(profiles.length + " registered user" + (profiles.length === 1 ? "" : "s") + " found.", "good");
      });
    }).catch(function (error) { setAdminStatus(friendlyError(error), "bad"); });
  }
  function renderUserAdminRows(profiles) {
    var box = byId("m405AdminRows");
    if (!box) return;
    box.innerHTML = "";
    profiles.forEach(function (profile) {
      var row = document.createElement("div");
      row.className = "m405AdminRow";
      var own = !!currentUser && profile.uid === currentUser.uid;
      row.innerHTML = [
        '<div class="m405AdminIdentity"><div class="m405AdminName">' + escapeHtml(profile.displayName || profile.email || "MITHRIL User") + (own ? " (you)" : "") + '</div><div class="m405AdminMeta">' + escapeHtml(profile.email || "No email") + '<br>' + escapeHtml(profile.uid) + '</div></div>',
        '<select aria-label="Role"><option value="administrator">Administrator</option><option value="blaster">Blaster</option><option value="driller">Driller</option><option value="driver">Driver</option><option value="viewer">Viewer</option><option value="member">Member</option></select>',
        '<select aria-label="Status"><option value="active">Active</option><option value="disabled">Disabled</option></select>',
        '<button type="button" class="primary">Save</button>'
      ].join("");
      var selects = row.querySelectorAll("select"), button = row.querySelector("button");
      selects[0].value = currentRoleValue(profile.role);
      selects[1].value = /^(?:disabled|inactive)$/i.test(profile.status) ? "disabled" : "active";
      if (own) {
        selects[0].disabled = true;
        selects[1].disabled = true;
        button.disabled = true;
        button.textContent = "Protected";
        button.title = "An administrator cannot change or disable their own account here.";
      } else {
        button.addEventListener("click", function () { saveManagedProfile(profile, selects[0].value, selects[1].value, button); });
      }
      box.appendChild(row);
    });
  }
  function currentRoleValue(role) {
    role = text(role).toLowerCase();
    return ROLE_PERMISSIONS[role] ? role : "member";
  }
  function saveManagedProfile(profile, role, status, button) {
    if (!currentUser || !hasPermission("userAdmin")) return restrictedMessage("User management");
    if (profile.uid === currentUser.uid) return restrictedMessage("Changing your own administrator access");
    var oldText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving…";
    setAdminStatus("Saving " + (profile.displayName || profile.email) + "…", "wait");
    loadFirebase().then(function (fb) {
      return fb.storeMod.updateDoc(profileDocumentRef(fb, profile.uid), {
        role: currentRoleValue(role),
        status: status === "disabled" ? "disabled" : "active",
        updatedAt: fb.storeMod.serverTimestamp(),
        updatedBy: currentUser.uid
      });
    }).then(function () {
      setAdminStatus((profile.displayName || profile.email) + " is now " + roleLabel(role) + " · " + (status === "disabled" ? "Disabled" : "Active") + ".", "good");
      return refreshUserAdmin();
    }).catch(function (error) {
      button.disabled = false;
      button.textContent = oldText;
      setAdminStatus(friendlyError(error), "bad");
    });
  }

  function isReadOnlyAllowedButton(button) {
    if (!button) return false;
    if (button.id === "m400CloudSyncButton" || button.id === "m400CloudClose" || button.id === "m400Refresh" || button.id === "m400SignOut") return true;
    var label = text(button.textContent);
    if (button.classList && (button.classList.contains("brandHome") || button.classList.contains("updateCheckButton"))) return true;
    return /^(?:close|(?:☰\s*)?menu|fit(?: current page| all pages)?|check for updates|switch template|cloud sync|refresh cloud list|open on this device|sign out|download (?:pdf|csv|backup)|export (?:pdf|csv)|finish & export pdf|backup json|← back to menu|\+|-)$/i.test(label);
  }
  function markReadOnlyControls() {
    if (!document.body || !document.body.classList) return;
    var readOnly = currentRole() === "viewer" && !!currentProfile;
    document.body.classList.toggle("m405ReadOnly", readOnly);
    Array.prototype.forEach.call(document.querySelectorAll("button"), function (button) {
      if (button.closest && button.closest("#m404LandingAuth")) return;
      if (!readOnly) {
        if (button.getAttribute("data-m405-role-hidden") === "true") {
          button.removeAttribute("data-m405-mutation");
          button.removeAttribute("data-m405-role-hidden");
        }
        return;
      }
      if (!isReadOnlyAllowedButton(button)) {
        button.setAttribute("data-m405-mutation", "true");
        button.setAttribute("data-m405-role-hidden", "true");
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll("input,textarea,select"), function (input) {
      if (!readOnly) {
        if (input.getAttribute("data-m405-role-disabled") === "true") {
          input.disabled = false;
          input.removeAttribute("data-m405-role-disabled");
        }
        return;
      }
      if (input.id === "pageSelect" || input.id === "zoomSlider" || input.closest && input.closest("#m400CloudModal")) return;
      input.disabled = true;
      input.setAttribute("data-m405-role-disabled", "true");
    });
  }
  function ensureAccessBanner() {
    var banner = byId("m405AccessBanner");
    if (!currentProfile || currentRole() !== "viewer" || (!isDrill() && !isShot())) {
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
      return;
    }
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "m405AccessBanner";
      banner.className = "m405AccessBanner";
      document.body.appendChild(banner);
    }
    banner.textContent = "VIEWER · READ-ONLY";
  }
  function installMutationGuards() {
    if (window.__mithrilM405MutationGuards) return;
    window.__mithrilM405MutationGuards = true;
    ["saveHole", "clearCurrentHole", "copyPrevious", "saveInfo", "enableQuickFill", "turnQuickOff", "addPageAtDirection", "deletePage", "loadJSON", "loadJSONBackup", "clearAll", "clearShotData", "startHeaderCalibration"].forEach(function (name) {
      var original = window[name];
      if (typeof original !== "function") return;
      window[name] = function () {
        if (!hasPermission("edit")) return restrictedMessage("Editing");
        return original.apply(this, arguments);
      };
    });
  }
  function applyDocumentRoleUI() {
    installMutationGuards();
    markReadOnlyControls();
    ensureAccessBanner();
    if (!accessObserver && typeof MutationObserver !== "undefined" && document.body) {
      accessObserver = new MutationObserver(function () { markReadOnlyControls(); });
      accessObserver.observe(document.body, { childList: true, subtree: true });
    }
  }
  function bootDocumentAccess() {
    if (!isDrill() && !isShot()) return;
    if (!currentProfile) {
      var cached = readVerifiedUser();
      if (cached) currentProfile = normalizeUserProfile({ uid: cached.uid, email: cached.email, displayName: cached.displayName }, cached);
    }
    var permissionName = isShot() ? "shot" : "drill";
    if (currentProfile && !hasPermission(permissionName)) {
      if (!accessNoticeShown) {
        accessNoticeShown = true;
        alert("ACCESS RESTRICTED\n\nThe " + roleLabel(currentRole()) + " role cannot open this template. MITHRIL will return to Home.");
      }
      window.location.href = "./index.html";
      return;
    }
    applyDocumentRoleUI();
    loadFirebase().then(function (fb) {
      if (!fb.auth.currentUser) return;
      return loadUserProfile(fb, fb.auth.currentUser).then(function () {
        if (!hasPermission(permissionName)) {
          alert("Your current role cannot open this template. MITHRIL will return to Home.");
          window.location.href = "./index.html";
        } else applyDocumentRoleUI();
      });
    }).catch(function () { applyDocumentRoleUI(); });
  }

  function loadFirebase() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-firestore.js")
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], storeMod = mods[2], app;
      try { app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig); }
      catch (error) { app = appMod.initializeApp(firebaseConfig); }
      var auth = authMod.getAuth(app), db = storeMod.getFirestore(app);
      try { authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (error2) {}
      if (!authUnsubscribe) authUnsubscribe = authMod.onAuthStateChanged(auth, function (user) {
        currentUser = user || null;
        if (user) loadUserProfile({ auth: auth, db: db, authMod: authMod, storeMod: storeMod }, user);
        else if (!offlineUserSession) {
          currentProfile = null;
          renderLandingAuth();
        }
        refreshCloudAuth();
        var modal = byId("m400CloudModal");
        if (currentUser && modal && modal.classList.contains("show")) refreshCloudList();
      });
      return { auth: auth, db: db, authMod: authMod, storeMod: storeMod };
    });
    return fbPromise;
  }
  function setCloudStatus(message, kind) {
    var el = byId("m400CloudStatus"); if (!el) return;
    el.textContent = message; el.className = "m400Status " + (kind || "");
  }
  function ensureCloudModal() {
    var modal = byId("m400CloudModal");
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m400CloudModal";
    modal.className = "m400Modal";
    modal.innerHTML = [
      '<div class="m400Box">',
      '<div class="m400Head"><strong>MITHRIL Cloud Sync · Role Access · m40.5</strong><button type="button" id="m400CloudClose">Close</button></div>',
      '<div id="m400CloudOut">',
      '<div class="m400Note m400Warning">Cloud Sync uses the MITHRIL account from the Home screen. Return Home to sign in, then reopen Cloud Sync.</div>',
      '</div>',
      '<div id="m400CloudIn" style="display:none">',
      '<div class="m400Identity"><span id="m400Identity"></span><button type="button" id="m400SignOut">Sign Out</button></div>',
      '<div class="m400Grid"><label class="m400Wide">Device name<input id="m400DeviceIn" type="text"></label></div>',
      '<div class="m401Compare"><div id="m401LocalStatus" class="m401Side"></div><div id="m401CloudStatus" class="m401Side cloud"></div></div>',
      '<div class="m400Actions"><button type="button" class="primary" id="m401SmartSync">Sync Current Document</button><button type="button" id="m401UndoCloud">Undo Cloud Download</button></div>',
      '<div class="m400Actions"><button type="button" id="m400Upload">Manual Upload Current <span id="m400TypeLabel"></span></button><button type="button" id="m400Refresh">Refresh Cloud List</button></div>',
      '<div class="m400Note">Smart Sync uploads local changes, downloads a newer unchanged cloud copy, and stops when both sides changed. Manual upload and download controls remain available.</div>',
      '<div id="m400Docs" class="m400Docs"></div>',
      '</div>',
      '<div id="m400CloudStatus" class="m400Status">Cloud sync is ready.</div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m400CloudClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m400SignOut").addEventListener("click", cloudSignOut);
    byId("m400Upload").addEventListener("click", uploadCurrent);
    byId("m400Refresh").addEventListener("click", refreshCloudList);
    byId("m401SmartSync").addEventListener("click", smartSync);
    byId("m401UndoCloud").addEventListener("click", undoCloudDownload);
    byId("m400DeviceIn").addEventListener("change", function () { saveDeviceName(this.value); });
    return modal;
  }
  function refreshCloudAuth() {
    var out = byId("m400CloudOut"), inside = byId("m400CloudIn");
    if (!out || !inside) return;
    out.style.display = currentUser ? "none" : "block";
    inside.style.display = currentUser ? "block" : "none";
    if (byId("m400DeviceIn")) byId("m400DeviceIn").value = deviceName();
    if (byId("m400TypeLabel") && window.MithrilDocument) byId("m400TypeLabel").textContent = docTypeLabel(window.MithrilDocument.type);
    if (currentUser && byId("m400Identity")) byId("m400Identity").textContent = "Signed in: " + (currentProfile && currentProfile.displayName || currentUser.email || currentUser.uid) + (currentProfile ? " · " + roleLabel(currentProfile.role) : "");
    ["m401SmartSync", "m400Upload", "m401UndoCloud"].forEach(function (id) {
      var button = byId(id);
      if (button) button.style.display = hasPermission("cloudWrite") ? "" : "none";
    });
    if (currentUser) renderLocalCloudStatus();
  }
  function openCloud() {
    closeMenu();
    if (!hasPermission("cloudRead")) return restrictedMessage("Cloud Sync");
    if (!window.MithrilDocument) { alert("Open a Drill Log or Shot Diagram before using Cloud Sync."); return; }
    var modal = ensureCloudModal(); modal.classList.add("show");
    setCloudStatus("Connecting to Firebase…", "wait");
    loadFirebase().then(function (fb) {
      currentUser = fb.auth.currentUser || currentUser;
      refreshCloudAuth();
      if (currentUser) return refreshCloudList();
      setCloudStatus("Return to MITHRIL Home and sign in to access cloud documents.", "");
    }).catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function cloudSignOut() {
    setCloudStatus("Signing out…", "wait");
    loadFirebase().then(function (fb) { return fb.authMod.signOut(fb.auth); })
      .then(function () { currentUser = null; currentProfile = null; offlineUserSession = false; profilePromise = null; profilePromiseUid = ""; clearVerifiedUser(); refreshCloudAuth(); renderLandingAuth(); byId("m400Docs").innerHTML = ""; setCloudStatus("Signed out. Local MITHRIL data remains on this device.", "good"); })
      .catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function cloudRecord() {
    var adapter = window.MithrilDocument;
    if (!adapter) return null;
    var info = adapter.getInfo(), snapshot = adapter.getSnapshot();
    return {
      schemaVersion: 3,
      mithrilVersion: RELEASE_VERSION,
      documentContractVersion: adapter.contractVersion,
      type: adapter.type,
      documentId: snapshot.documentId,
      identityCreatedAt: snapshot.identityCreatedAt,
      legacyCloudId: snapshot.legacyCloudId || "",
      sourceDocumentId: snapshot.sourceDocumentId || "",
      title: info.title,
      jobName: info.jobName,
      documentNumber: info.documentNumber,
      fieldDate: info.fieldDate,
      person: info.person,
      holeCount: countHoles(snapshot.pagesData),
      payload: snapshot
    };
  }
  function logicalId(data) {
    data = data || {};
    return text(data.documentId || (data.payload && data.payload.documentId)) || legacyLogicalId(data);
  }
  function resolveCloudDocument(fb, data) {
    var permanentId = logicalId(data);
    var candidates = [text(data.legacyCloudId), legacyLogicalId(data)].filter(function (id, index, all) {
      return id && id !== permanentId && all.indexOf(id) === index;
    });
    var permanentRef = fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", permanentId);
    return fb.storeMod.getDoc(permanentRef).then(function (snap) {
      if (snap.exists()) return { id: permanentId, ref: permanentRef, data: snap.data(), isLegacy: false, permanentId: permanentId };
      var sequence = Promise.resolve(null);
      candidates.forEach(function (candidate) {
        sequence = sequence.then(function (found) {
          if (found) return found;
          var ref = fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", candidate);
          return fb.storeMod.getDoc(ref).then(function (legacySnap) {
            return legacySnap.exists() ? { id: candidate, ref: ref, data: legacySnap.data(), isLegacy: true, permanentId: permanentId } : null;
          });
        });
      });
      return sequence.then(function (found) { return found || { id: permanentId, ref: permanentRef, data: null, isLegacy: false, permanentId: permanentId }; });
    });
  }
  function uploadCurrent(options) {
    options = options || {};
    if (!hasPermission("cloudWrite")) { setCloudStatus("Your role has read-only cloud access.", "bad"); return restrictedMessage("Cloud upload"); }
    if (!currentUser) { setCloudStatus("Sign in before uploading.", "bad"); return; }
    var data = cloudRecord();
    if (!data) { setCloudStatus("MITHRIL could not read the current document through the shared document interface.", "bad"); return; }
    saveDeviceName(byId("m400DeviceIn").value);
    var id = logicalId(data);
    setCloudStatus("Checking the cloud revision…", "wait");
    loadFirebase().then(function (fb) {
      return resolveCloudDocument(fb, data).then(function (resolved) {
        var existing = resolved.data;
        var state = currentSyncState(existing, resolved.id);
        if (existing && state.cloudRevision > state.lastRevision && state.dirty) throw { conflict: true, state: state };
        var revision = existing && Number(existing.revision) ? Number(existing.revision) + 1 : 1;
        if (existing && !options.skipConfirm) {
          var when = existing.updatedAt && existing.updatedAt.toDate ? existing.updatedAt.toDate().toLocaleString() : "an earlier time";
          if (!confirm("A cloud copy already exists.\n\nCloud revision: " + (existing.revision || 1) + "\nSaved from: " + (existing.sourceDevice || "Unknown device") + "\nUpdated: " + when + "\n\nUpload this device as revision " + revision + "?")) throw { cancelled: true };
        }
        var record = clone(data);
        record.ownerUid = currentUser.uid;
        record.revision = revision;
        record.sourceDevice = deviceName();
        record.updatedBy = currentUser.email || currentUser.uid;
        record.updatedAt = fb.storeMod.serverTimestamp();
        record.createdAt = existing && existing.createdAt ? existing.createdAt : fb.storeMod.serverTimestamp();
        var permanentRef = fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", id);
        return fb.storeMod.setDoc(permanentRef, record).then(function () {
          if (!resolved.isLegacy) return null;
          return fb.storeMod.deleteDoc(resolved.ref);
        }).then(function () { return { revision: revision, record: record, id: id, migrated: resolved.isLegacy }; });
      });
    }).then(function (result) {
      writeSyncMeta(result.id, result.revision, data.payload, result.record);
      setCloudStatus(data.title + " uploaded as revision " + result.revision + (result.migrated ? " and linked to its permanent document ID." : "."), "good");
      return refreshCloudList();
    }).catch(function (error) {
      if (error && error.cancelled) { setCloudStatus("Upload cancelled. Nothing was changed.", ""); return; }
      if (error && error.conflict) {
        setCloudStatus("Upload blocked: cloud revision " + error.state.cloudRevision + " is newer than this device's last synced revision " + (error.state.lastRevision || "none") + ", and this device also has local changes.", "bad");
        alert("SYNC CONFLICT\n\nThe cloud is revision " + error.state.cloudRevision + ", but this device last synced revision " + (error.state.lastRevision || "none") + " and has local changes.\n\nNothing was uploaded. Download the newer cloud revision, or save a manual JSON backup before resolving the conflict.");
        return;
      }
      setCloudStatus(friendlyError(error), "bad");
    });
  }
  function formatTime(value) { try { if (value && value.toDate) return value.toDate().toLocaleString(); } catch (error) {} return "Pending server timestamp"; }
  function refreshCloudList() {
    if (!hasPermission("cloudRead")) return Promise.resolve();
    if (!currentUser || !window.MithrilDocument) return Promise.resolve();
    var type = window.MithrilDocument.type;
    setCloudStatus("Loading private cloud documents…", "wait");
    return loadFirebase().then(function (fb) {
      var col = fb.storeMod.collection(fb.db, "users", currentUser.uid, "documents");
      return fb.storeMod.getDocs(col).then(function (snap) {
        var docs = [];
        snap.forEach(function (item) { var d = item.data(); if (d && d.type === type && !d.migratedTo) docs.push({ id: item.id, data: d }); });
        docs.sort(function (a, b) { var at = a.data.updatedAt && a.data.updatedAt.seconds || 0, bt = b.data.updatedAt && b.data.updatedAt.seconds || 0; return bt - at; });
        cloudItems = docs;
        renderCloudDocs(docs);
        renderLocalCloudStatus();
        setCloudStatus(docs.length ? docs.length + " cloud " + docTypeLabel(type) + (docs.length === 1 ? "" : "s") + " found." : "No cloud " + docTypeLabel(type) + "s have been uploaded yet.", docs.length ? "good" : "");
      });
    }).catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function renderCloudDocs(items) {
    var box = byId("m400Docs"); if (!box) return;
    box.innerHTML = "";
    items.forEach(function (item) {
      var d = item.data, row = document.createElement("div");
      row.className = "m400Doc";
      row.innerHTML = '<div><div class="m400DocTitle">' + escapeHtml(d.title || docTypeLabel(d.type)) + '</div><div class="m400Meta">Revision ' + escapeHtml(d.revision || 1) + ' • ' + escapeHtml(d.holeCount || 0) + ' populated holes<br>' + escapeHtml(formatTime(d.updatedAt)) + ' • ' + escapeHtml(d.sourceDevice || "Unknown device") + '<br>Contract v' + escapeHtml(d.documentContractVersion || 1) + '</div></div><div class="m400DocActions"><button type="button" class="primary">Open on This Device</button>' + (hasPermission("cloudDelete") ? '<button type="button" class="danger">Delete Cloud Copy</button>' : "") + '</div>';
      var buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", function () { downloadCloud(item.id, d); });
      if (buttons[1]) buttons[1].addEventListener("click", function () { deleteCloud(item.id, d); });
      box.appendChild(row);
    });
  }
  function downloadCloud(id, data) {
    if (!hasPermission("cloudRead")) return restrictedMessage("Cloud download");
    var adapter = window.MithrilDocument;
    if (!adapter) return;
    var warning = "Open cloud revision " + (data.revision || 1) + " of:\n\n" + (data.title || docTypeLabel(data.type)) + "\nSaved from " + (data.sourceDevice || "Unknown device") + "\n\nThis replaces the current local " + docTypeLabel(data.type) + " on this device.";
    if (!confirm(warning)) { setCloudStatus("Download cancelled. Nothing was changed.", ""); return; }
    setCloudStatus("Downloading and applying the cloud document through the shared document interface…", "wait");
    try {
      var cloudSnapshot = normalizedSnapshot(data.payload || data);
      if (!cloudSnapshot.documentId) {
        cloudSnapshot.documentId = text(data.documentId) || uuidFromSeed("MITHRIL|" + id);
        cloudSnapshot.identityCreatedAt = text(data.identityCreatedAt) || new Date().toISOString();
        cloudSnapshot.legacyCloudId = id;
        cloudSnapshot.identityOrigin = "legacy-derived";
        writeIdentity(cloudSnapshot.headerData, {
          documentId: cloudSnapshot.documentId,
          createdAt: cloudSnapshot.identityCreatedAt,
          legacyCloudId: cloudSnapshot.legacyCloudId,
          sourceDocumentId: cloudSnapshot.sourceDocumentId,
          origin: cloudSnapshot.identityOrigin
        });
      }
      var targetId = cloudSnapshot.documentId;
      var priorMeta = readSyncMeta(targetId) || readSyncMeta(id);
      saveRecovery(targetId, adapter, priorMeta);
      adapter.applySnapshot(cloudSnapshot, { markDirty: false, fitAll: adapter.type === "shotDiagram" });
      writeSyncMeta(targetId, Number(data.revision || 1), cloudSnapshot, data);
      var modal = byId("m400CloudModal"); if (modal) modal.classList.remove("show");
      showToast((data.title || docTypeLabel(data.type)) + " — cloud revision " + (data.revision || 1) + " loaded. Undo Cloud Download is available.");
    } catch (error) { setCloudStatus(friendlyError(error), "bad"); }
  }
  function undoCloudDownload() {
    var adapter = window.MithrilDocument, record = cloudRecord();
    if (!adapter || !record) return;
    var id = logicalId(record), recovery = readJsonStorage(recoveryStorageKey(id));
    if (!recovery || !recovery.snapshot) { setCloudStatus("No cloud-download recovery snapshot is available for this document.", "bad"); return; }
    if (!confirm("Restore the local document as it was before the last cloud download?")) return;
    try {
      adapter.applySnapshot(recovery.snapshot, { markDirty: true, fitAll: adapter.type === "shotDiagram" });
      if (recovery.syncMeta) writeJsonStorage(syncStorageKey(id), recovery.syncMeta);
      else try { localStorage.removeItem(syncStorageKey(id)); } catch (error1) {}
      try { localStorage.removeItem(recoveryStorageKey(id)); } catch (error2) {}
      renderLocalCloudStatus();
      setCloudStatus("Previous local document restored. Its LOCAL sync status has been recalculated.", "good");
      showToast("Undo Cloud Download completed.");
    } catch (error) { setCloudStatus(friendlyError(error), "bad"); }
  }
  function smartSync() {
    if (!hasPermission("cloudWrite")) { setCloudStatus("Your role has read-only cloud access. Use Open on This Device to view a cloud document.", "bad"); return restrictedMessage("Cloud synchronization"); }
    if (!currentUser) { setCloudStatus("Sign in before syncing.", "bad"); return; }
    setCloudStatus("Comparing local and cloud revisions…", "wait");
    var data = cloudRecord(), id = logicalId(data);
    loadFirebase().then(function (fb) {
      return resolveCloudDocument(fb, data).then(function (resolved) {
        var cloud = resolved.data, state = currentSyncState(cloud, resolved.id);
        if (!cloud) { uploadCurrent({ skipConfirm: true }); return; }
        if (state.fingerprint === state.cloudFingerprint) {
          if (resolved.isLegacy) { uploadCurrent({ skipConfirm: true }); return; }
          writeSyncMeta(id, state.cloudRevision, state.snapshot, cloud);
          setCloudStatus("Local and cloud copies already match revision " + state.cloudRevision + ".", "good");
          return refreshCloudList();
        }
        if (state.cloudRevision > state.lastRevision) {
          if (state.dirty) {
            setCloudStatus("Conflict: both this device and the cloud changed. Nothing was overwritten.", "bad");
            alert("SYNC CONFLICT\n\nCloud revision " + state.cloudRevision + " is newer, and this device also has local changes.\n\nNothing was changed. Preserve the local work with a JSON backup before downloading the cloud copy.");
            return;
          }
          downloadCloud(id, cloud);
          return;
        }
        if (state.dirty) { uploadCurrent({ skipConfirm: true }); return; }
        setCloudStatus("This document is already synchronized.", "good");
      });
    }).catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function deleteCloud(id, data) {
    if (!hasPermission("cloudDelete")) return restrictedMessage("Cloud deletion");
    if (!confirm("Delete this cloud copy?\n\n" + (data.title || docTypeLabel(data.type)) + "\n\nThe local copy on this device will not be deleted.")) return;
    setCloudStatus("Deleting cloud copy…", "wait");
    loadFirebase().then(function (fb) { return fb.storeMod.deleteDoc(fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", id)); })
      .then(function () { setCloudStatus("Cloud copy deleted. Local data was not changed.", "good"); return refreshCloudList(); })
      .catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }

  function removeDuplicateCloudControls() {
    var menu = byId("menuModal");
    if (!menu) return null;

    var currentButtons = menu.querySelectorAll('[id="m400CloudSyncButton"]');
    var keep = currentButtons.length ? currentButtons[0] : null;

    Array.prototype.forEach.call(menu.querySelectorAll("button"), function (button) {
      var label = text(button.textContent);
      var isCloud = button.id === "m399CloudSyncButton" || button.id === "m400CloudSyncButton" || /^Cloud Sync$/i.test(label);
      if (!isCloud || button === keep) return;
      var group = button.closest ? button.closest(".m395MenuGroup") : null;
      if (group && group.parentNode) group.parentNode.removeChild(group);
      else if (button.parentNode) button.parentNode.removeChild(button);
    });

    Array.prototype.forEach.call(menu.querySelectorAll(".m395MenuGroup"), function (group) {
      var title = group.querySelector(".m395MenuGroupTitle");
      if (!title || !/^Cloud$/i.test(text(title.textContent))) return;
      if (!keep || !group.contains(keep)) {
        if (group.parentNode) group.parentNode.removeChild(group);
      }
    });

    var oldModal = byId("m399CloudModal");
    if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);
    return keep && keep.isConnected ? keep : null;
  }

  function installCloudButton() {
    var menu = byId("menuModal"); if (!menu) return false;
    var existing = removeDuplicateCloudControls();
    if (existing) return true;
    var stack = menu.querySelector(".m395MenuStack"), target = stack || menu.querySelector(".menuGrid");
    if (!target) return false;
    var button = document.createElement("button");
    button.id = "m400CloudSyncButton";
    button.type = "button";
    button.textContent = "Cloud Sync";
    button.addEventListener("click", openCloud);
    if (stack) {
      var group = document.createElement("div"), title = document.createElement("div"), grid = document.createElement("div");
      group.className = "m395MenuGroup"; title.className = "m395MenuGroupTitle"; title.textContent = "Cloud"; grid.className = "m395ActionGrid";
      grid.appendChild(button); group.appendChild(title); group.appendChild(grid); stack.appendChild(group);
    } else { button.className = "wide"; target.appendChild(button); }
    removeDuplicateCloudControls();
    return true;
  }

  // ---------------------------------------------------------------------------
  // m40.0.4 Shot Diagram maximum holes-per-delay timing check
  // ---------------------------------------------------------------------------

  function timingCheckNumber(value) {
    var raw = String(value == null ? "" : value).trim().replace(/\s*ms\s*$/i, "");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
    var number = Number(raw);
    return isFinite(number) && number >= 0 ? number : null;
  }

  function timingCheckFormat(value) {
    var number = Number(value);
    if (!isFinite(number)) return "";
    var rounded = Math.round(number * 1000) / 1000;
    return String(rounded);
  }

  function timingCheckHoleParts(holeId) {
    var match = String(holeId || "").toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: String(holeId || ""), col: 0 };
    var row = 0;
    for (var i = 0; i < match[1].length; i += 1) row = row * 26 + (match[1].charCodeAt(i) - 64);
    return { row: row, col: Number(match[2]) };
  }

  function timingCheckLocationCompare(left, right) {
    var pageDifference = Number(left.pageNum || 0) - Number(right.pageNum || 0);
    if (pageDifference) return pageDifference;
    var a = timingCheckHoleParts(left.holeId), b = timingCheckHoleParts(right.holeId);
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return String(left.holeId || "").localeCompare(String(right.holeId || ""));
  }

  function collectTimingCheckData(pageSource) {
    var source = pageSource || {};
    var result = { entries: [], untimed: 0, invalid: 0, excluded: 0, savedEligible: 0 };
    numericKeys(source).forEach(function (pageKey) {
      var page = source[String(pageKey)] || {};
      Object.keys(page).forEach(function (holeId) {
        var record = page[holeId];
        if (!meaningfulRecord(record)) return;
        if (flagYes(record.BadHole) || flagYes(record.DirtHole)) {
          result.excluded += 1;
          return;
        }
        result.savedEligible += 1;
        var raw = String(record.Timing == null ? "" : record.Timing).trim();
        if (!raw) {
          result.untimed += 1;
          return;
        }
        var timing = timingCheckNumber(raw);
        if (timing === null) {
          result.invalid += 1;
          return;
        }
        result.entries.push({
          pageNum: Number(pageKey),
          holeId: String(holeId),
          timing: timing
        });
      });
    });
    result.entries.sort(function (a, b) {
      return a.timing - b.timing || timingCheckLocationCompare(a, b);
    });
    return result;
  }

  function findTimingConflicts(entries, minimumSeparation) {
    var minimum = Number(minimumSeparation);
    if (!isFinite(minimum) || minimum <= 0) minimum = 8;
    var sorted = (entries || []).slice().sort(function (a, b) {
      return Number(a.timing) - Number(b.timing) || timingCheckLocationCompare(a, b);
    });
    var conflicts = [];
    for (var i = 0; i < sorted.length; i += 1) {
      for (var j = i + 1; j < sorted.length; j += 1) {
        var difference = Number(sorted[j].timing) - Number(sorted[i].timing);
        // Exactly 8 ms is permitted. Only a difference below 8 ms is flagged.
        if (difference >= minimum - 0.000000001) break;
        conflicts.push({ first: sorted[i], second: sorted[j], difference: difference });
      }
    }
    return conflicts;
  }

  function maximumHolesPerDelay(entries, minimumSeparation) {
    var minimum = Number(minimumSeparation);
    if (!isFinite(minimum) || minimum <= 0) minimum = 8;
    var sorted = (entries || []).slice().sort(function (a, b) {
      return Number(a.timing) - Number(b.timing) || timingCheckLocationCompare(a, b);
    });
    if (!sorted.length) return 0;
    var left = 0;
    var maximum = 1;
    for (var right = 0; right < sorted.length; right += 1) {
      while (left < right && Number(sorted[right].timing) - Number(sorted[left].timing) >= minimum - 0.000000001) left += 1;
      maximum = Math.max(maximum, right - left + 1);
    }
    return maximum;
  }

  function ensureTimingSeparationStyles() {
    if (byId("m400TimingCheckStyles")) return;
    var style = document.createElement("style");
    style.id = "m400TimingCheckStyles";
    style.textContent = [
      ".m400TimingSummary{padding:18px 12px;border:2px solid #999;border-radius:10px;font-size:28px;font-weight:950;line-height:1.2;margin:10px 0;text-align:center}",
      ".m400TimingSummary.pass{background:#e9f8ec;border-color:#4f9a61;color:#173d20}",
      ".m400TimingSummary.fail{background:#ffeaea;border-color:#c44;color:#720000}",
      ".m400TimingSummary.empty{background:#fff7d8;border-color:#c7aa45;color:#624b00}",
      ".m400TimingCheckMeta{font-size:12px;font-weight:750;line-height:1.45;color:#555;margin:8px 0}",
      ".m400TimingDetails{display:none;margin-top:8px}",
      ".m400TimingConflictList{display:grid;gap:7px;max-height:52vh;overflow:auto;margin-top:10px;padding-right:2px}",
      ".m400TimingConflict{border:1px solid #c77;border-left:7px solid #c22;border-radius:8px;background:#fff7f7;padding:9px;font-size:13px;font-weight:800;line-height:1.35}",
      ".m400TimingConflict strong{font-size:14px}",
      "#m400TimingCheckButton.m400TimingFailButton,#m400TimingModalCheckButton.m400TimingFailButton{background:#ffeaea;border-color:#c44;color:#720000}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureTimingSeparationModal() {
    var modal = byId("m400TimingCheckModal");
    if (modal) return modal;
    ensureStyles();
    ensureTimingSeparationStyles();
    modal = document.createElement("div");
    modal.id = "m400TimingCheckModal";
    modal.className = "m400Modal";
    modal.innerHTML = [
      '<div class="m400Box">',
      '<div class="m400Head"><strong>8 ms Timing Check</strong><button type="button" id="m400TimingCheckClose">Close</button></div>',
      '<div class="m400Note">Shows the maximum number of eligible holes within any timing window shorter than 8 ms. Exactly 8 ms apart is acceptable.</div>',
      '<div id="m400TimingCheckSummary" class="m400TimingSummary empty"></div>',
      '<div class="m400Actions" id="m400TimingToggleRow" style="display:none"><button type="button" class="m400Wide" id="m400TimingToggleConflicts">Show Timing Conflicts</button></div>',
      '<div id="m400TimingDetails" class="m400TimingDetails">',
      '  <div id="m400TimingCheckMeta" class="m400TimingCheckMeta"></div>',
      '  <div id="m400TimingConflictList" class="m400TimingConflictList"></div>',
      '</div>',
      '<div class="m400Actions"><button type="button" class="primary m400Wide" id="m400TimingCheckDone">Done</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    function close() { modal.classList.remove("show"); }
    byId("m400TimingCheckClose").addEventListener("click", close);
    byId("m400TimingCheckDone").addEventListener("click", close);
    byId("m400TimingToggleConflicts").addEventListener("click", function () {
      var details = byId("m400TimingDetails");
      var expanded = details && details.style.display === "block";
      if (details) details.style.display = expanded ? "none" : "block";
      var count = Number(this.getAttribute("data-conflict-count") || 0);
      this.textContent = (expanded ? "Show" : "Hide") + " Timing Conflicts" + (count ? " (" + count + ")" : "");
    });
    return modal;
  }

  function timingCheckLocationLabel(entry) {
    return "P" + Number(entry.pageNum) + " " + String(entry.holeId);
  }

  function runTimingSeparationCheck() {
    if (!isShot() || typeof pagesData === "undefined") {
      alert("Open the Shot Diagram before running the 8 ms timing check.");
      return null;
    }
    try { if (typeof saveData === "function") saveData(); } catch (error) {}
    var scan = collectTimingCheckData(pagesData || {});
    var conflicts = findTimingConflicts(scan.entries, 8);
    var maxHoles = maximumHolesPerDelay(scan.entries, 8);
    var modal = ensureTimingSeparationModal();
    var summary = byId("m400TimingCheckSummary");
    var meta = byId("m400TimingCheckMeta");
    var list = byId("m400TimingConflictList");
    var detailsBox = byId("m400TimingDetails");
    var toggleRow = byId("m400TimingToggleRow");
    var toggleButton = byId("m400TimingToggleConflicts");

    if (!scan.entries.length) {
      summary.className = "m400TimingSummary empty";
      summary.textContent = "No timed holes found";
    } else {
      summary.className = "m400TimingSummary " + (maxHoles > 1 ? "fail" : "pass");
      summary.textContent = maxHoles + " hole" + (maxHoles === 1 ? "" : "s") + " per delay";
    }

    var detailLines = [
      "Timed eligible holes checked: " + scan.entries.length,
      "Eligible saved holes without timing: " + scan.untimed,
      "Non-numeric timing values: " + scan.invalid,
      "Dirt or bad holes excluded: " + scan.excluded
    ];
    meta.textContent = detailLines.join(" • ");
    if (detailsBox) detailsBox.style.display = "none";
    if (toggleRow) toggleRow.style.display = conflicts.length ? "grid" : "none";
    if (toggleButton) {
      toggleButton.setAttribute("data-conflict-count", String(conflicts.length));
      toggleButton.textContent = "Show Timing Conflicts" + (conflicts.length ? " (" + conflicts.length + ")" : "");
    }
    list.innerHTML = "";
    var shown = Math.min(conflicts.length, 100);
    for (var c = 0; c < shown; c += 1) {
      var conflict = conflicts[c];
      var row = document.createElement("div");
      row.className = "m400TimingConflict";
      row.innerHTML = '<strong>' + escapeHtml(timingCheckLocationLabel(conflict.first)) + ' — ' + escapeHtml(timingCheckFormat(conflict.first.timing)) + ' ms</strong><br>' +
        '<strong>' + escapeHtml(timingCheckLocationLabel(conflict.second)) + ' — ' + escapeHtml(timingCheckFormat(conflict.second.timing)) + ' ms</strong><br>' +
        escapeHtml(timingCheckFormat(conflict.difference)) + ' ms apart';
      list.appendChild(row);
    }
    if (conflicts.length > shown) {
      var more = document.createElement("div");
      more.className = "m400Note m400Danger";
      more.textContent = (conflicts.length - shown) + " additional conflict pairs were not displayed.";
      list.appendChild(more);
    }

    var activeButton = byId("m400TimingCheckButton");
    var modalButton = byId("m400TimingModalCheckButton");
    [activeButton, modalButton].forEach(function (button) {
      if (!button) return;
      button.classList.toggle("m400TimingFailButton", maxHoles > 1);
      button.textContent = scan.entries.length ? "8 ms Check — " + maxHoles + " hole" + (maxHoles === 1 ? "" : "s") + "/delay" : "8 ms Check — no timings";
    });
    modal.classList.add("show");
    return { scan: scan, conflicts: conflicts, maxHolesPerDelay: maxHoles };
  }

  function resetTimingCheckButtonLabels() {
    var activeButton = byId("m400TimingCheckButton");
    var modalButton = byId("m400TimingModalCheckButton");
    [activeButton, modalButton].forEach(function (button) {
      if (!button) return;
      button.classList.remove("m400TimingFailButton");
      button.textContent = button.id === "m400TimingModalCheckButton" ? "Check Existing Timings — 8 ms" : "Check 8 ms";
    });
  }

  function installTimingSeparationCheck() {
    if (!isShot()) return true;
    ensureTimingSeparationStyles();
    var foundTimingUi = false;
    var bar = byId("m397TimingBar");
    var actions = bar ? bar.querySelector(".m397TimingActions") : null;
    if (actions) {
      foundTimingUi = true;
      if (!byId("m400TimingCheckButton")) {
        var button = document.createElement("button");
        button.id = "m400TimingCheckButton";
        button.type = "button";
        button.textContent = "Check 8 ms";
        button.addEventListener("click", runTimingSeparationCheck);
        var selectButton = byId("m397TimingEditHoles");
        if (selectButton && selectButton.parentNode === actions) actions.insertBefore(button, selectButton);
        else actions.appendChild(button);
      }
    }

    var timingModal = byId("m397TimingModal");
    var modalActions = timingModal ? timingModal.querySelector(".buttonGrid") : null;
    if (modalActions) {
      foundTimingUi = true;
      if (!byId("m400TimingModalCheckButton")) {
        var modalButton = document.createElement("button");
        modalButton.id = "m400TimingModalCheckButton";
        modalButton.type = "button";
        modalButton.className = "wide";
        modalButton.textContent = "Check Existing Timings — 8 ms";
        modalButton.addEventListener("click", runTimingSeparationCheck);
        modalActions.appendChild(modalButton);
      }
    }

    if (foundTimingUi && !window.__mithrilM400TimingCheckDirtyListener) {
      window.__mithrilM400TimingCheckDirtyListener = true;
      var canvas = byId("shotCanvas");
      if (canvas) canvas.addEventListener("pointerup", function () { window.setTimeout(resetTimingCheckButtonLabels, 0); }, true);
      document.addEventListener("click", function (event) {
        var target = event && event.target;
        if (!target || target.id === "m400TimingCheckButton" || target.id === "m400TimingModalCheckButton") return;
        if (target.closest && (target.closest("#m397TimingBar") || target.closest("#m397TimingModal") || target.closest("#holeModal"))) {
          window.setTimeout(resetTimingCheckButtonLabels, 0);
        }
      }, true);
    }
    return foundTimingUi;
  }

  // Desktop browsers finish their normal mouse pointer-up bookkeeping after the
  // Edit Holes selection handler. Redraw on the next frame so the selection
  // overlay is the final canvas layer, matching the iPad touch behavior.
  function installDesktopSelectionRedraw() {
    if (!isShot()) return true;
    var canvas = byId("shotCanvas");
    if (!canvas || canvas.getAttribute("data-m4011-selection-redraw") === "true") return !!canvas;
    canvas.setAttribute("data-m4011-selection-redraw", "true");
    canvas.addEventListener("pointerup", function (event) {
      var bar = byId("m395ShotEditBar");
      if (!bar || !bar.classList.contains("show")) return;
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      (window.requestAnimationFrame || function (callback) { return window.setTimeout(callback, 16); })(function () {
        try { if (typeof window.draw === "function") window.draw(); } catch (error) {}
      });
    }, false);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Versioning and wrapper bridge
  // ---------------------------------------------------------------------------

  function updateVersionLabels() {
    var labels = document.querySelectorAll(".version,.startVersion,.updateHomeVersion");
    Array.prototype.forEach.call(labels, function (el) {
      var value = text(el.textContent);
      if (/installed version:/i.test(value)) el.textContent = "Installed version: " + RELEASE_VERSION;
      else if (/^m\d/i.test(value)) el.textContent = RELEASE_VERSION + " standardized document architecture";
      else if (/m\d+\.\d+/i.test(value)) el.textContent = value.replace(/m\d+(?:\.\d+)+/i, RELEASE_VERSION);
    });
    if (/MITHRIL/i.test(document.title)) document.title = document.title.replace(/m\d+(?:\.\d+)+/i, RELEASE_VERSION);
    if (window.MITHRIL_UPDATE_CONFIG) window.MITHRIL_UPDATE_CONFIG.currentVersion = RELEASE_VERSION;
  }

  function installVersionLabelGuard() {
    function refreshLabels() { updateVersionLabels(); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshLabels);
    window.addEventListener("load", refreshLabels);
    window.setTimeout(refreshLabels, 0);
    window.setTimeout(refreshLabels, 250);
    window.setTimeout(refreshLabels, 1000);
  }

  function injectIntoShotFrame() {
    var frame = byId("shotFrame"); if (!frame) return;
    function inject() {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.head) return;
        var old = doc.getElementById(CHILD_SCRIPT_ID);
        if (old) return;
        var script = doc.createElement("script");
        script.id = CHILD_SCRIPT_ID;
        script.src = CHILD_SCRIPT_SRC;
        doc.head.appendChild(script);
      } catch (error) { console.warn("MITHRIL m40.5.1 could not attach the standardized document layer to the Shot Diagram.", error); }
    }
    frame.addEventListener("load", function () { setTimeout(inject, 80); });
    setTimeout(inject, 120);
  }

  function cleanupLegacyUI() {
    ["m398CreateShotFromDrill", "m398UndoDrillImportMenu", "m399CloudSyncButton"].forEach(function (id) {
      var old = byId(id);
      if (!old) return;
      var group = old.closest ? old.closest(".m395MenuGroup") : null;
      if (group && /Cloud/i.test(group.textContent || "") && group.parentNode) group.parentNode.removeChild(group);
      else if (old.parentNode) old.parentNode.removeChild(old);
    });
    ["m398DrillTransferModal", "m398ShotImportModal", "m399CloudModal", "m398ImportSuccess"].forEach(function (id) { var node = byId(id); if (node && node.parentNode) node.parentNode.removeChild(node); });
    removeDuplicateCloudControls();
  }

  function bootDocument() {
    ensureStyles();
    updateVersionLabels();
    installIdentityGuards();
    installShotHeaderPreservation();
    var adapter = installAdapter();
    installManualBackupStandardization(adapter);
    installPageDeletionPatch(adapter);
    installDrillPdfPatch();
    cleanupLegacyUI();
    installTransferButtons();
    installCloudButton();
    installTimingSeparationCheck();
    installDesktopSelectionRedraw();
    if (isShot()) setTimeout(openImportReview, 100);
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      cleanupLegacyUI();
      installTransferButtons();
      installCloudButton();
      installTimingSeparationCheck();
      installDesktopSelectionRedraw();
      updateUndoButton();
      if (attempts >= 40) clearInterval(timer);
    }, 150);
  }

  updateVersionLabels();
  installVersionLabelGuard();
  if (byId("templateStart")) bootLandingAuth();
  if (isDrill() || isShot()) bootDocumentAccess();
  if (isWrapper()) injectIntoShotFrame();
  if (isDrill() || isShot()) bootDocument();

  // Pure functions exposed only for release tests and diagnostics.
  window.__MITHRIL_M400_TEST__ = {
    sourcePoints: sourcePoints,
    transformPoints: transformPoints,
    buildShotImport: buildShotImport,
    orientationCounts: orientationCounts,
    normalizedSnapshot: normalizedSnapshot,
    detectBackupType: detectBackupType,
    inspectManualBackup: inspectManualBackup,
    buildManualBackup: buildManualBackup,
    legacyLogicalId: legacyLogicalId,
    uuidFromSeed: uuidFromSeed,
    logicalId: logicalId,
    stripIdentity: stripIdentity,
    timingCheckNumber: timingCheckNumber,
    collectTimingCheckData: collectTimingCheckData,
    findTimingConflicts: findTimingConflicts,
    maximumHolesPerDelay: maximumHolesPerDelay,
    defaultUserProfile: defaultUserProfile,
    normalizeUserProfile: normalizeUserProfile,
    roleLabel: roleLabel,
    permissionsFor: permissionsFor,
    hasPermission: hasPermission,
    currentRoleValue: currentRoleValue,
    readVerifiedUser: readVerifiedUser,
    cacheVerifiedUser: cacheVerifiedUser
  };
})();
