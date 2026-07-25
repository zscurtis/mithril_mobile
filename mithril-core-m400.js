(function () {
  "use strict";

  var RELEASE_VERSION = "m40.0";
  var CHILD_SCRIPT_ID = "mithrilCoreM400ChildLoader";
  var CHILD_SCRIPT_SRC = "./mithril-core-m400.js?rev=4000-frame";
  var TRANSFER_KEY = "mithrilDrillToShotTransferM400";
  var UNDO_KEY = "mithrilDrillToShotUndoM400";
  var DEVICE_KEY = "mithrilCloudDeviceNameM399";
  var FIREBASE_VERSION = "12.16.0";
  var firebaseConfig = {
    apiKey: ["AIzaSyBOb0pXdI", "DMqr5mMKdKOCpP84jSRjyjnhY"].join(""),
    authDomain: "mithril-mobile.firebaseapp.com",
    projectId: "mithril-mobile",
    storageBucket: "mithril-mobile.firebasestorage.app",
    messagingSenderId: "797958678485",
    appId: "1:797958678485:web:e19ab69e74e00cd8587f5c"
  };

  if (window.__mithrilM400Installed) return;
  window.__mithrilM400Installed = true;

  var fbPromise = null;
  var currentUser = null;
  var authUnsubscribe = null;

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
      ".m400Docs{display:grid;gap:8px;margin-top:10px}.m400Doc{border:1px solid #aaa;border-radius:9px;padding:9px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center}.m400DocTitle{font-size:15px;font-weight:900}.m400Meta{font-size:12px;color:#555;font-weight:750;line-height:1.35;margin-top:3px}.m400DocActions{display:grid;gap:6px}",
      ".m400Toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:22000;max-width:min(720px,calc(100vw - 24px));padding:12px 16px;border:2px solid #4f9a61;border-radius:10px;background:#e9f8ec;color:#173d20;font-size:14px;font-weight:900;line-height:1.35;box-shadow:0 8px 28px rgba(0,0,0,.35);text-align:center}.m400Toast.bad{background:#ffeaea;border-color:#c66;color:#720000}",
      "@media(max-width:600px){.m400Grid,.m400Actions{grid-template-columns:1fr}.m400Wide{grid-column:auto}.m400Stats{grid-template-columns:1fr 1fr}.m400Doc{grid-template-columns:1fr}.m400DocActions{grid-template-columns:1fr 1fr}}"
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
    return {
      schemaVersion: Number(src.schemaVersion || 1),
      type: src.type || docType(),
      pagesData: clone(src.pagesData || src.pages || { "1": {} }),
      pageMeta: clone(src.pageMeta || { "1": { gx: 0, gy: 0, name: "Page 1" } }),
      headerData: clone(src.headerData || src.header || {}),
      currentPage: Number(src.currentPage || 1),
      view: src.view ? clone(src.view) : null,
      extras: clone(src.extras || {})
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
      var extras = {};
      if (type === "shotDiagram") {
        try { extras.timingSequence = JSON.parse(localStorage.getItem("mithrilCanvasTimingSequenceM397") || "null"); } catch (error) { extras.timingSequence = null; }
      }
      return {
        schemaVersion: 2,
        type: type,
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
      var keys = numericKeys(pagesData);
      currentPage = Number(next.currentPage) || Number(keys[0]) || 1;
      if (!pagesData[String(currentPage)]) currentPage = Number(keys[0]) || 1;
      if (next.view && typeof view !== "undefined") view = clone(next.view);

      if (type === "shotDiagram") {
        holeData = pagesData[String(currentPage)] || {};
        localStorage.setItem("mithrilCanvasPagesM01", JSON.stringify(pagesData));
        localStorage.setItem("mithrilCanvasPageMetaM03", JSON.stringify(pageMeta));
        localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData));
        if (typeof view !== "undefined") localStorage.setItem("mithrilCanvasViewM01", JSON.stringify(view));
        if (next.extras && next.extras.timingSequence) localStorage.setItem("mithrilCanvasTimingSequenceM397", JSON.stringify(next.extras.timingSequence));
        try { hasUnsentChanges = options.markDirty === true; } catch (error1) {}
        localStorage.setItem("mithrilCanvasUnsentM01", options.markDirty === true ? "true" : "false");
      } else {
        if (typeof saveState === "function") saveState();
        try {
          if (typeof KEYS !== "undefined" && KEYS.dirty) localStorage.setItem(KEYS.dirty, options.markDirty === true ? "true" : "false");
        } catch (error2) {}
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
      contractVersion: 2,
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
    var header = clone(payload.sourceHeader || payload.headerData || {}) || {};
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
      sourceHeader: snap.headerData
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
      '<div class="m400Head"><strong>MITHRIL Cloud Sync · Shared Contract v2 · m40.0</strong><button type="button" id="m400CloudClose">Close</button></div>',
      '<div id="m400CloudOut">',
      '<div class="m400Note">Sign in with the Firebase account. Cloud Sync now reads and writes through the same MITHRIL document interface for Drill Logs and Shot Diagrams.</div>',
      '<div class="m400Grid"><label>Email<input type="email" id="m400Email" autocomplete="username"></label><label>Password<input type="password" id="m400Password" autocomplete="current-password"></label><label class="m400Wide">Device name<input id="m400DeviceOut" type="text"></label><button type="button" class="primary m400Wide" id="m400SignIn">Sign In</button></div>',
      '</div>',
      '<div id="m400CloudIn" style="display:none">',
      '<div class="m400Identity"><span id="m400Identity"></span><button type="button" id="m400SignOut">Sign Out</button></div>',
      '<div class="m400Grid"><label class="m400Wide">Device name<input id="m400DeviceIn" type="text"></label></div>',
      '<div class="m400Actions"><button type="button" class="primary" id="m400Upload">Upload Current <span id="m400TypeLabel"></span></button><button type="button" id="m400Refresh">Refresh Cloud List</button></div>',
      '<div class="m400Note">Manual sync remains user-controlled. Downloading replaces only the open document type and refreshes it in place.</div>',
      '<div id="m400Docs" class="m400Docs"></div>',
      '</div>',
      '<div id="m400CloudStatus" class="m400Status">Cloud sync is ready.</div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m400CloudClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m400SignIn").addEventListener("click", cloudSignIn);
    byId("m400SignOut").addEventListener("click", cloudSignOut);
    byId("m400Upload").addEventListener("click", uploadCurrent);
    byId("m400Refresh").addEventListener("click", refreshCloudList);
    byId("m400DeviceIn").addEventListener("change", function () { saveDeviceName(this.value); });
    return modal;
  }
  function refreshCloudAuth() {
    var out = byId("m400CloudOut"), inside = byId("m400CloudIn");
    if (!out || !inside) return;
    out.style.display = currentUser ? "none" : "block";
    inside.style.display = currentUser ? "block" : "none";
    if (byId("m400DeviceOut")) byId("m400DeviceOut").value = deviceName();
    if (byId("m400DeviceIn")) byId("m400DeviceIn").value = deviceName();
    if (byId("m400TypeLabel") && window.MithrilDocument) byId("m400TypeLabel").textContent = docTypeLabel(window.MithrilDocument.type);
    if (currentUser && byId("m400Identity")) byId("m400Identity").textContent = "Signed in: " + (currentUser.email || currentUser.uid);
  }
  function openCloud() {
    closeMenu();
    if (!window.MithrilDocument) { alert("Open a Drill Log or Shot Diagram before using Cloud Sync."); return; }
    var modal = ensureCloudModal(); modal.classList.add("show");
    setCloudStatus("Connecting to Firebase…", "wait");
    loadFirebase().then(function (fb) {
      currentUser = fb.auth.currentUser || currentUser;
      refreshCloudAuth();
      if (currentUser) return refreshCloudList();
      setCloudStatus("Sign in to access your private cloud documents.", "");
    }).catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function cloudSignIn() {
    var email = text(byId("m400Email").value), password = byId("m400Password").value;
    saveDeviceName(byId("m400DeviceOut").value);
    if (!email || !password) { setCloudStatus("Enter the account email and password.", "bad"); return; }
    setCloudStatus("Signing in…", "wait");
    loadFirebase().then(function (fb) { return fb.authMod.signInWithEmailAndPassword(fb.auth, email, password); })
      .then(function (cred) { currentUser = cred.user; byId("m400Password").value = ""; refreshCloudAuth(); setCloudStatus("Signed in successfully.", "good"); return refreshCloudList(); })
      .catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function cloudSignOut() {
    setCloudStatus("Signing out…", "wait");
    loadFirebase().then(function (fb) { return fb.authMod.signOut(fb.auth); })
      .then(function () { currentUser = null; refreshCloudAuth(); byId("m400Docs").innerHTML = ""; setCloudStatus("Signed out. Local MITHRIL data remains on this device.", "good"); })
      .catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }
  function cloudRecord() {
    var adapter = window.MithrilDocument;
    if (!adapter) return null;
    var info = adapter.getInfo(), snapshot = adapter.getSnapshot();
    return {
      schemaVersion: 2,
      mithrilVersion: RELEASE_VERSION,
      documentContractVersion: adapter.contractVersion,
      type: adapter.type,
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
    var raw = [data.type, data.jobName || "no-job", data.documentNumber || data.fieldDate || "untitled"].join("__").toLowerCase();
    var slug = raw.replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
    return slug || (data.type + "__untitled");
  }
  function uploadCurrent() {
    if (!currentUser) { setCloudStatus("Sign in before uploading.", "bad"); return; }
    var data = cloudRecord();
    if (!data) { setCloudStatus("MITHRIL could not read the current document through the shared document interface.", "bad"); return; }
    saveDeviceName(byId("m400DeviceIn").value);
    var id = logicalId(data);
    setCloudStatus("Checking the cloud revision…", "wait");
    loadFirebase().then(function (fb) {
      var ref = fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", id);
      return fb.storeMod.getDoc(ref).then(function (snap) {
        var existing = snap.exists() ? snap.data() : null;
        var revision = existing && Number(existing.revision) ? Number(existing.revision) + 1 : 1;
        if (existing) {
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
        return fb.storeMod.setDoc(ref, record).then(function () { return revision; });
      });
    }).then(function (revision) {
      setCloudStatus(data.title + " uploaded as revision " + revision + ".", "good");
      return refreshCloudList();
    }).catch(function (error) {
      if (error && error.cancelled) { setCloudStatus("Upload cancelled. Nothing was changed.", ""); return; }
      setCloudStatus(friendlyError(error), "bad");
    });
  }
  function formatTime(value) { try { if (value && value.toDate) return value.toDate().toLocaleString(); } catch (error) {} return "Pending server timestamp"; }
  function refreshCloudList() {
    if (!currentUser || !window.MithrilDocument) return Promise.resolve();
    var type = window.MithrilDocument.type;
    setCloudStatus("Loading private cloud documents…", "wait");
    return loadFirebase().then(function (fb) {
      var col = fb.storeMod.collection(fb.db, "users", currentUser.uid, "documents");
      return fb.storeMod.getDocs(col).then(function (snap) {
        var docs = [];
        snap.forEach(function (item) { var d = item.data(); if (d && d.type === type) docs.push({ id: item.id, data: d }); });
        docs.sort(function (a, b) { var at = a.data.updatedAt && a.data.updatedAt.seconds || 0, bt = b.data.updatedAt && b.data.updatedAt.seconds || 0; return bt - at; });
        renderCloudDocs(docs);
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
      row.innerHTML = '<div><div class="m400DocTitle">' + escapeHtml(d.title || docTypeLabel(d.type)) + '</div><div class="m400Meta">Revision ' + escapeHtml(d.revision || 1) + ' • ' + escapeHtml(d.holeCount || 0) + ' populated holes<br>' + escapeHtml(formatTime(d.updatedAt)) + ' • ' + escapeHtml(d.sourceDevice || "Unknown device") + '<br>Contract v' + escapeHtml(d.documentContractVersion || 1) + '</div></div><div class="m400DocActions"><button type="button" class="primary">Open on This Device</button><button type="button" class="danger">Delete Cloud Copy</button></div>';
      var buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", function () { downloadCloud(item.id, d); });
      buttons[1].addEventListener("click", function () { deleteCloud(item.id, d); });
      box.appendChild(row);
    });
  }
  function downloadCloud(id, data) {
    var adapter = window.MithrilDocument;
    if (!adapter) return;
    var warning = "Open cloud revision " + (data.revision || 1) + " of:\n\n" + (data.title || docTypeLabel(data.type)) + "\nSaved from " + (data.sourceDevice || "Unknown device") + "\n\nThis replaces the current local " + docTypeLabel(data.type) + " on this device.";
    if (!confirm(warning)) { setCloudStatus("Download cancelled. Nothing was changed.", ""); return; }
    setCloudStatus("Downloading and applying the cloud document through the shared document interface…", "wait");
    try {
      adapter.applySnapshot(data.payload || data, { markDirty: false, fitAll: adapter.type === "shotDiagram" });
      var modal = byId("m400CloudModal"); if (modal) modal.classList.remove("show");
      showToast((data.title || docTypeLabel(data.type)) + " — cloud revision " + (data.revision || 1) + " loaded successfully.");
    } catch (error) { setCloudStatus(friendlyError(error), "bad"); }
  }
  function deleteCloud(id, data) {
    if (!confirm("Delete this cloud copy?\n\n" + (data.title || docTypeLabel(data.type)) + "\n\nThe local copy on this device will not be deleted.")) return;
    setCloudStatus("Deleting cloud copy…", "wait");
    loadFirebase().then(function (fb) { return fb.storeMod.deleteDoc(fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", id)); })
      .then(function () { setCloudStatus("Cloud copy deleted. Local data was not changed.", "good"); return refreshCloudList(); })
      .catch(function (error) { setCloudStatus(friendlyError(error), "bad"); });
  }

  function installCloudButton() {
    var menu = byId("menuModal"); if (!menu) return false;
    ["m399CloudSyncButton"].forEach(function (id) { var old = byId(id); if (old && old.parentNode) { var group = old.closest ? old.closest(".m395MenuGroup") : null; if (group && group.parentNode) group.parentNode.removeChild(group); else old.parentNode.removeChild(old); } });
    var oldModal = byId("m399CloudModal"); if (oldModal && oldModal.parentNode) oldModal.parentNode.removeChild(oldModal);
    if (byId("m400CloudSyncButton")) return true;
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
      } catch (error) { console.warn("MITHRIL m40.0 could not attach the standardized document layer to the Shot Diagram.", error); }
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
  }

  function bootDocument() {
    ensureStyles();
    updateVersionLabels();
    var adapter = installAdapter();
    installPageDeletionPatch(adapter);
    installDrillPdfPatch();
    cleanupLegacyUI();
    installTransferButtons();
    installCloudButton();
    if (isShot()) setTimeout(openImportReview, 100);
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      cleanupLegacyUI();
      installTransferButtons();
      installCloudButton();
      updateUndoButton();
      if (attempts >= 40) clearInterval(timer);
    }, 150);
  }

  updateVersionLabels();
  if (isWrapper()) injectIntoShotFrame();
  if (isDrill() || isShot()) bootDocument();

  // Pure functions exposed only for release tests and diagnostics.
  window.__MITHRIL_M400_TEST__ = {
    sourcePoints: sourcePoints,
    transformPoints: transformPoints,
    buildShotImport: buildShotImport,
    orientationCounts: orientationCounts,
    normalizedSnapshot: normalizedSnapshot
  };
})();
