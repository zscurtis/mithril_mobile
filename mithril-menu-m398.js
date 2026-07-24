(function () {
  "use strict";

  var RELEASE_VERSION = "m39.8";
  var TRANSFER_KEY = "mithrilDrillToShotTransferM398";
  var UNDO_KEY = "mithrilDrillToShotUndoM398";
  var SUCCESS_KEY = "mithrilDrillToShotSuccessM398";
  var RESTORED_KEY = "mithrilDrillToShotRestoredM398";
  var CHILD_SCRIPT_ID = "mithrilMenuM398ChildLoader";
  var CHILD_SCRIPT_SRC = "./mithril-menu-m398.js?rev=398-frame";

  if (window.__mithrilM398Installed) return;
  window.__mithrilM398Installed = true;

  function byId(id) {
    return document.getElementById(id);
  }

  function deepClone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function flagYes(value) {
    return value === true || /^(?:yes|true|1)$/i.test(text(value));
  }

  function isDrillLog() {
    return !!byId("drillCanvas");
  }

  function isShotDiagram() {
    return !!byId("shotCanvas");
  }

  function isShotWrapper() {
    return !!byId("shotFrame");
  }

  function closeVisibleMenu() {
    try {
      if (typeof window.closeMenu === "function") window.closeMenu();
      else {
        var menu = byId("menuModal");
        if (menu) menu.classList.remove("show");
      }
    } catch (error) {}
  }

  function meaningfulValue(key, value) {
    if (value == null || value === false) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    var normalized = text(value);
    if (!normalized) return false;
    if (/^(?:no|false|0)$/i.test(normalized) && /(?:Wet|BadHole|DirtHole|Breakthrough|Flag)$/i.test(key)) return false;
    return true;
  }

  function recordHasData(record) {
    if (!record || typeof record !== "object") return false;
    var ignored = {
      HoleID: true,
      PageNumber: true,
      Timestamp: true,
      FieldDate: true,
      ShotID: true,
      JobName: true,
      Blaster: true,
      EnteredBy: true,
      SourceDrillPage: true,
      SourceDrillHoleID: true
    };
    var keys = Object.keys(record);
    for (var i = 0; i < keys.length; i += 1) {
      if (!ignored[keys[i]] && meaningfulValue(keys[i], record[keys[i]])) return true;
    }
    return false;
  }

  function parseDrillHoleID(holeId) {
    var match = /^([A-Z]+)(\d+)$/i.exec(text(holeId));
    if (!match) return null;
    var letters = match[1].toUpperCase();
    var column = 0;
    for (var i = 0; i < letters.length; i += 1) column = column * 26 + (letters.charCodeAt(i) - 64);
    var row = Number(match[2]);
    if (!isFinite(column) || !isFinite(row) || column < 1 || column > 16 || row < 1 || row > 34) return null;
    return { column: column, row: row };
  }

  function shotHoleID(row, column) {
    return String.fromCharCode(64 + row) + String(column);
  }

  function numericPageKeys(pages) {
    return Object.keys(pages || {}).sort(function (a, b) {
      var na = Number(a), nb = Number(b);
      if (isFinite(na) && isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
  }

  function sourcePagePosition(pageKey, pageIndex, sourceMeta) {
    var meta = sourceMeta && sourceMeta[String(pageKey)] || {};
    var gx = Number(meta.gx);
    var gy = Number(meta.gy);
    return {
      gx: isFinite(gx) ? gx : pageIndex,
      gy: isFinite(gy) ? gy : 0
    };
  }

  function summarizeDrillPayload(payload) {
    var pages = payload && payload.pages || {};
    var summary = {
      sourcePages: 0,
      populatedHoles: 0,
      wetHoles: 0,
      dirtHoles: 0,
      badHoles: 0,
      breakthroughHoles: 0,
      destinationPages: 0
    };
    var destinationChunks = {};
    numericPageKeys(pages).forEach(function (pageKey) {
      var pageHadData = false;
      var records = pages[pageKey] || {};
      Object.keys(records).forEach(function (holeId) {
        var record = records[holeId];
        var pos = parseDrillHoleID(holeId);
        if (!pos || !recordHasData(record)) return;
        pageHadData = true;
        summary.populatedHoles += 1;
        if (flagYes(record.Wet)) summary.wetHoles += 1;
        if (flagYes(record.DirtHole)) summary.dirtHoles += 1;
        if (flagYes(record.BadHole)) summary.badHoles += 1;
        if (flagYes(record.Breakthrough) || (Array.isArray(record.HoleConditions) && record.HoleConditions.length)) summary.breakthroughHoles += 1;
        destinationChunks[String(pageKey) + "|" + String(Math.floor((pos.row - 1) / 15))] = true;
      });
      if (pageHadData) summary.sourcePages += 1;
    });
    summary.destinationPages = Object.keys(destinationChunks).length;
    return summary;
  }

  function readDrillState() {
    try {
      if (typeof saveState === "function") saveState();
    } catch (error) {}

    try {
      return {
        pages: typeof pagesData !== "undefined" ? deepClone(pagesData) : {},
        pageMeta: typeof pageMeta !== "undefined" ? deepClone(pageMeta) : {},
        sourceHeader: typeof headerData !== "undefined" ? deepClone(headerData) : {}
      };
    } catch (error2) {
      console.error("MITHRIL m39.8 could not read the Drill Log state.", error2);
      return null;
    }
  }

  function defaultShotInfo(sourceHeader) {
    sourceHeader = sourceHeader || {};
    return {
      FieldDate: text(sourceHeader.Date || sourceHeader.FieldDate),
      ShotID: text(sourceHeader.ShotID || sourceHeader.DrillLogNumber),
      JobName: text(sourceHeader.JobName || sourceHeader.Job),
      Blaster: text(sourceHeader.Blaster || sourceHeader.Employee),
      EnteredByDefault: text(sourceHeader.EnteredByDefault || sourceHeader.Employee)
    };
  }

  function ensureStyles() {
    if (byId("mithrilM398TransferStyles")) return;
    var style = document.createElement("style");
    style.id = "mithrilM398TransferStyles";
    style.textContent = [
      ".m398TransferModal{display:none;position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.68);padding:12px;box-sizing:border-box;overflow:auto;font-family:Arial,sans-serif}",
      ".m398TransferModal.show{display:flex;align-items:flex-start;justify-content:center}",
      ".m398TransferBox{width:min(720px,100%);margin:auto;background:#fff;color:#111;border-radius:14px;border:2px solid #1f6feb;box-shadow:0 12px 40px rgba(0,0,0,.55);padding:14px;box-sizing:border-box}",
      ".m398TransferHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}",
      ".m398TransferHead strong{font-size:20px}",
      ".m398TransferHead button,.m398TransferActions button,.m398TransferButton{min-height:46px;border:1px solid #777;border-radius:9px;background:#f4f4f4;color:#111;padding:8px 12px;font-size:15px;font-weight:850}",
      ".m398TransferActions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}",
      ".m398TransferActions .primary,.m398TransferButton.primary{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      ".m398TransferActions .wide{grid-column:1/-1}",
      ".m398TransferGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}",
      ".m398TransferGrid label{display:grid;gap:4px;font-size:12px;font-weight:850;color:#444}",
      ".m398TransferGrid input{min-height:42px;border:1px solid #888;border-radius:7px;padding:7px;font-size:16px;box-sizing:border-box;width:100%}",
      ".m398TransferSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:11px 0}",
      ".m398TransferStat{background:#eef4ff;border:1px solid #98b9e7;border-radius:9px;padding:8px;min-height:58px}",
      ".m398TransferStat b{display:block;font-size:21px;color:#173f70}",
      ".m398TransferStat span{font-size:11px;font-weight:800;color:#4d6075}",
      ".m398TransferNote{margin:9px 0;padding:9px;border-radius:8px;background:#fff8dc;border:1px solid #d6bd63;font-size:13px;font-weight:750;line-height:1.4}",
      ".m398TransferWarning{background:#ffe8e8;border-color:#cf7373;color:#730000}",
      ".m398TransferSuccess{position:fixed;left:8px;right:8px;bottom:8px;z-index:11950;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;background:#fff;border:2px solid #2b8a3e;border-radius:11px;padding:9px;box-shadow:0 6px 24px rgba(0,0,0,.42);font-family:Arial,sans-serif}",
      ".m398TransferSuccess span{font-size:13px;font-weight:850;line-height:1.3}",
      ".m398TransferSuccess button{min-height:40px;border:1px solid #777;border-radius:8px;background:#f4f4f4;font-weight:850;padding:6px 10px}",
      ".m398TransferSuccess button.primary{background:#2b8a3e;color:#fff;border-color:#2b8a3e}",
      "@media(max-width:600px){.m398TransferGrid{grid-template-columns:1fr}.m398TransferSummary{grid-template-columns:1fr 1fr}.m398TransferActions{grid-template-columns:1fr}.m398TransferActions .wide{grid-column:auto}.m398TransferSuccess{grid-template-columns:1fr 1fr}.m398TransferSuccess span{grid-column:1/-1}}"
    ].join("");
    document.head.appendChild(style);
  }

  function statHTML(value, label) {
    return '<div class="m398TransferStat"><b>' + String(value) + '</b><span>' + label + '</span></div>';
  }

  function ensureDrillTransferModal() {
    var modal = byId("m398DrillTransferModal");
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m398DrillTransferModal";
    modal.className = "m398TransferModal";
    modal.innerHTML = [
      '<div class="m398TransferBox">',
      '  <div class="m398TransferHead"><strong>Create Shot Diagram from Drill Log</strong><button type="button" id="m398DrillTransferClose">Close</button></div>',
      '  <div id="m398DrillTransferSummary" class="m398TransferSummary"></div>',
      '  <div class="m398TransferNote">Each 16 × 34 Drill Log page is split into up to three vertically stacked 16 × 15 Shot Diagram pages. The column/row pattern stays in the same physical orientation.</div>',
      '  <div class="m398TransferGrid">',
      '    <label>Date<input id="m398TransferDate" type="text" placeholder="MM/DD/YYYY" /></label>',
      '    <label>Shot Number<input id="m398TransferShotID" type="text" placeholder="Shot number" /></label>',
      '    <label>Job<input id="m398TransferJob" type="text" placeholder="Job name" /></label>',
      '    <label>Blaster<input id="m398TransferBlaster" type="text" placeholder="Blaster" /></label>',
      '  </div>',
      '  <div class="m398TransferNote">Depth, overburden, wet/dirt/bad flags, notes, hole conditions, hole diameter, and pattern assignments are copied. Stemming, explosive loads, and timing start blank.</div>',
      '  <div class="m398TransferActions"><button type="button" id="m398DrillTransferCancel">Cancel</button><button type="button" class="primary" id="m398DrillTransferStart">Open Shot Diagram</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m398DrillTransferClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m398DrillTransferCancel").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m398DrillTransferStart").addEventListener("click", startDrillTransfer);
    return modal;
  }

  function openDrillTransfer() {
    closeVisibleMenu();
    var source = readDrillState();
    if (!source) {
      alert("MITHRIL could not read the Drill Log. Refresh the app and try again.");
      return;
    }
    var payload = {
      transferType: "mithril-drill-log-to-shot-diagram",
      transferVersion: 1,
      release: RELEASE_VERSION,
      createdAt: new Date().toISOString(),
      pages: source.pages,
      pageMeta: source.pageMeta,
      sourceHeader: source.sourceHeader
    };
    var summary = summarizeDrillPayload(payload);
    if (!summary.populatedHoles) {
      alert("No populated Drill Log holes were found.");
      return;
    }
    var defaults = defaultShotInfo(source.sourceHeader);
    var modal = ensureDrillTransferModal();
    modal.__mithrilTransferPayload = payload;
    byId("m398TransferDate").value = defaults.FieldDate;
    byId("m398TransferShotID").value = defaults.ShotID;
    byId("m398TransferJob").value = defaults.JobName;
    byId("m398TransferBlaster").value = defaults.Blaster;
    byId("m398DrillTransferSummary").innerHTML = [
      statHTML(summary.sourcePages, "Drill Log pages"),
      statHTML(summary.destinationPages, "Shot Diagram pages"),
      statHTML(summary.populatedHoles, "Holes copied"),
      statHTML(summary.wetHoles, "Wet holes"),
      statHTML(summary.dirtHoles, "Dirt holes"),
      statHTML(summary.badHoles, "Bad holes")
    ].join("");
    modal.classList.add("show");
  }

  function startDrillTransfer() {
    var modal = byId("m398DrillTransferModal");
    var payload = modal && modal.__mithrilTransferPayload;
    if (!payload) {
      alert("The Drill Log transfer is no longer available. Close this window and start it again.");
      return;
    }
    payload.shotInfo = {
      FieldDate: text(byId("m398TransferDate").value),
      ShotID: text(byId("m398TransferShotID").value),
      JobName: text(byId("m398TransferJob").value),
      Blaster: text(byId("m398TransferBlaster").value),
      EnteredByDefault: text(byId("m398TransferBlaster").value)
    };
    payload.summary = summarizeDrillPayload(payload);
    try {
      localStorage.setItem(TRANSFER_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("MITHRIL m39.8 could not store the Drill Log transfer.", error);
      alert("The Drill Log is too large to stage for transfer in this browser. No data was changed.");
      return;
    }
    modal.classList.remove("show");
    window.location.href = "./shot_diagram_m38.html?m398DrillImport=" + Date.now();
  }

  function addDrillTransferMenuButton() {
    var menu = byId("menuModal");
    if (!menu || byId("m398CreateShotFromDrill")) return false;
    var box = menu.querySelector(".box");
    if (!box) return false;

    var button = document.createElement("button");
    button.id = "m398CreateShotFromDrill";
    button.type = "button";
    button.className = "wide primary";
    button.textContent = "Create Shot Diagram from Drill Log";
    button.addEventListener("click", openDrillTransfer);

    // m39.7 replaces the legacy menu with a single stacked menu. Put the
    // transfer beside the daily Edit Holes action instead of creating an
    // unrelated section outside that stack.
    var stack = box.querySelector(".m395MenuStack");
    if (stack) {
      var editButton = stack.querySelector('[data-m395-action="editHoles"]');
      if (editButton && editButton.parentNode === stack) stack.insertBefore(button, editButton.nextSibling);
      else stack.insertBefore(button, stack.firstChild);
      return true;
    }

    // Legacy menu fallback.
    var title = document.createElement("div");
    title.className = "menuTitle";
    title.id = "m398TransferMenuTitle";
    title.textContent = "Shot Diagram Transfer";
    var grid = document.createElement("div");
    grid.className = "menuGrid";
    grid.appendChild(button);
    var insertBefore = null;
    var headings = box.querySelectorAll(".menuTitle");
    for (var i = 0; i < headings.length; i += 1) {
      if (/file tools/i.test(headings[i].textContent || "")) {
        insertBefore = headings[i];
        break;
      }
    }
    box.insertBefore(title, insertBefore);
    box.insertBefore(grid, insertBefore);
    return true;
  }

  function installDrillTransfer() {
    ensureStyles();
    ensureDrillTransferModal();
    if (addDrillTransferMenuButton()) return;
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (addDrillTransferMenuButton() || attempts >= 30) window.clearInterval(timer);
    }, 100);
  }

  function buildShotImport(payload) {
    payload = payload || {};
    var sourcePages = payload.pages || {};
    var sourceMeta = payload.pageMeta || {};
    var pageKeys = numericPageKeys(sourcePages);
    var activePageInfo = [];

    for (var pageIndex = 0; pageIndex < pageKeys.length; pageIndex += 1) {
      var pageKey = pageKeys[pageIndex];
      var records = sourcePages[pageKey] || {};
      var valid = [];
      Object.keys(records).forEach(function (holeId) {
        var position = parseDrillHoleID(holeId);
        var record = records[holeId];
        if (position && recordHasData(record)) valid.push({ holeId: holeId, position: position, record: record });
      });
      if (valid.length) {
        var sourcePosition = sourcePagePosition(pageKey, pageIndex, sourceMeta);
        activePageInfo.push({ pageKey: pageKey, valid: valid, gx: sourcePosition.gx, gy: sourcePosition.gy });
      }
    }

    if (!activePageInfo.length) return { pages: {}, pageMeta: {}, headerData: {}, pageCount: 0, holeCount: 0 };

    var minGX = Math.min.apply(Math, activePageInfo.map(function (item) { return item.gx; }));
    var minGY = Math.min.apply(Math, activePageInfo.map(function (item) { return item.gy; }));
    var seenGroupPositions = {};
    for (var p = 0; p < activePageInfo.length; p += 1) {
      var positionKey = String(activePageInfo[p].gx) + "|" + String(activePageInfo[p].gy);
      if (seenGroupPositions[positionKey]) {
        activePageInfo[p].gx = minGX + p;
        activePageInfo[p].gy = minGY;
      }
      seenGroupPositions[String(activePageInfo[p].gx) + "|" + String(activePageInfo[p].gy)] = true;
    }

    activePageInfo.sort(function (a, b) {
      return a.gy - b.gy || a.gx - b.gx || Number(a.pageKey) - Number(b.pageKey);
    });

    var destinationPages = {};
    var destinationMeta = {};
    var destinationPageNumber = 1;
    var holeCount = 0;
    var shotInfo = payload.shotInfo || defaultShotInfo(payload.sourceHeader || {});

    activePageInfo.forEach(function (sourcePage) {
      var chunks = [[], [], []];
      sourcePage.valid.forEach(function (item) {
        var chunkIndex = Math.floor((item.position.row - 1) / 15);
        if (chunkIndex >= 0 && chunkIndex < 3) chunks[chunkIndex].push(item);
      });

      chunks.forEach(function (items, chunkIndex) {
        if (!items.length) return;
        var destinationKey = String(destinationPageNumber);
        destinationPages[destinationKey] = {};
        var firstSourceRow = chunkIndex * 15 + 1;
        var lastSourceRow = Math.min(34, firstSourceRow + 14);
        destinationMeta[destinationKey] = {
          gx: sourcePage.gx - minGX,
          gy: (sourcePage.gy - minGY) * 3 + chunkIndex,
          name: "Drill Page " + sourcePage.pageKey + " Rows " + firstSourceRow + "-" + lastSourceRow
        };

        items.sort(function (a, b) {
          return a.position.row - b.position.row || a.position.column - b.position.column;
        }).forEach(function (item) {
          var localShotRow = ((item.position.row - 1) % 15) + 1;
          var destinationHoleId = shotHoleID(localShotRow, item.position.column);
          var next = deepClone(item.record) || {};
          next.PageNumber = destinationPageNumber;
          next.FieldDate = shotInfo.FieldDate || "";
          next.ShotID = shotInfo.ShotID || "";
          next.JobName = shotInfo.JobName || "";
          next.Blaster = shotInfo.Blaster || "";
          next.HoleID = destinationHoleId;
          next.Depth = text(item.record.Depth);
          next.Overburden = text(item.record.Overburden);
          next.Stemming = "";
          next.PrimaryLoad = "";
          next.SecondaryLoad = "";
          next.Timing = "";
          next.Wet = flagYes(item.record.Wet) ? "Yes" : "No";
          next.BadHole = flagYes(item.record.BadHole) ? "Yes" : "No";
          next.DirtHole = flagYes(item.record.DirtHole) ? "Yes" : "No";
          next.Notes = text(item.record.Notes);
          next.EnteredBy = shotInfo.EnteredByDefault || shotInfo.Blaster || "";
          next.Timestamp = new Date().toLocaleString();
          next.SourceDrillPage = Number(sourcePage.pageKey) || sourcePage.pageKey;
          next.SourceDrillHoleID = item.holeId;
          destinationPages[destinationKey][destinationHoleId] = next;
          holeCount += 1;
        });
        destinationPageNumber += 1;
      });
    });

    var nextHeader = deepClone(payload.sourceHeader || {}) || {};
    nextHeader.FieldDate = shotInfo.FieldDate || text(nextHeader.Date);
    nextHeader.ShotID = shotInfo.ShotID || text(nextHeader.DrillLogNumber);
    nextHeader.JobName = shotInfo.JobName || text(nextHeader.Job);
    nextHeader.Blaster = shotInfo.Blaster || text(nextHeader.Employee);
    nextHeader.EnteredByDefault = shotInfo.EnteredByDefault || nextHeader.Blaster || text(nextHeader.Employee);
    nextHeader.TimingSequence = { start: 0, interval: 25, next: 0, direction: "ltr", overwrite: "blank", active: false };
    nextHeader.ImportedFromDrillLog = true;
    nextHeader.DrillLogImportRelease = RELEASE_VERSION;
    nextHeader.DrillLogImportedAt = new Date().toISOString();

    return {
      pages: destinationPages,
      pageMeta: destinationMeta,
      headerData: nextHeader,
      pageCount: Object.keys(destinationPages).length,
      holeCount: holeCount
    };
  }

  function countExistingShotHoles() {
    try {
      var count = 0;
      Object.keys(pagesData || {}).forEach(function (pageKey) {
        Object.keys(pagesData[pageKey] || {}).forEach(function (holeId) {
          if (recordHasData(pagesData[pageKey][holeId])) count += 1;
        });
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  function readPendingTransfer() {
    try {
      var raw = localStorage.getItem(TRANSFER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("MITHRIL m39.8 could not read the staged Drill Log transfer.", error);
      return null;
    }
  }

  function ensureShotImportModal() {
    var modal = byId("m398ShotImportModal");
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m398ShotImportModal";
    modal.className = "m398TransferModal";
    modal.innerHTML = [
      '<div class="m398TransferBox">',
      '  <div class="m398TransferHead"><strong>Import Drill Log into Shot Diagram</strong><button type="button" id="m398ShotImportClose">Cancel</button></div>',
      '  <div id="m398ShotImportSummary" class="m398TransferSummary"></div>',
      '  <div class="m398TransferNote">The Drill Log grid will be converted without rotating the physical pattern: source columns A–P become Shot Diagram columns 1–16, and source rows are divided across 15-row Shot Diagram pages.</div>',
      '  <div id="m398ShotImportExisting" class="m398TransferNote m398TransferWarning" style="display:none"></div>',
      '  <div class="m398TransferNote">The previous Shot Diagram is saved as one undo snapshot before import. The Drill Log itself is never changed.</div>',
      '  <div class="m398TransferActions"><button type="button" id="m398ShotImportCancel">Cancel Import</button><button type="button" class="primary" id="m398ShotImportConfirm">Import Drill Log</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    function cancelImport() {
      modal.classList.remove("show");
      try { localStorage.removeItem(TRANSFER_KEY); } catch (error) {}
    }
    byId("m398ShotImportClose").addEventListener("click", cancelImport);
    byId("m398ShotImportCancel").addEventListener("click", cancelImport);
    byId("m398ShotImportConfirm").addEventListener("click", performShotImport);
    return modal;
  }

  function openShotImportReview() {
    var payload = readPendingTransfer();
    if (!payload || payload.transferType !== "mithril-drill-log-to-shot-diagram") return;
    var result = buildShotImport(payload);
    if (!result.holeCount) {
      alert("The staged Drill Log did not contain any transferable holes.");
      try { localStorage.removeItem(TRANSFER_KEY); } catch (error) {}
      return;
    }
    var modal = ensureShotImportModal();
    modal.__mithrilTransferPayload = payload;
    modal.__mithrilImportResult = result;
    var summary = payload.summary || summarizeDrillPayload(payload);
    byId("m398ShotImportSummary").innerHTML = [
      statHTML(summary.sourcePages, "Drill Log pages"),
      statHTML(result.pageCount, "Shot Diagram pages"),
      statHTML(result.holeCount, "Holes imported"),
      statHTML(summary.wetHoles, "Wet holes"),
      statHTML(summary.dirtHoles, "Dirt holes"),
      statHTML(summary.badHoles, "Bad holes")
    ].join("");
    var existingCount = countExistingShotHoles();
    var warning = byId("m398ShotImportExisting");
    if (warning) {
      warning.style.display = existingCount ? "block" : "none";
      warning.textContent = existingCount ? "This browser currently has a Shot Diagram containing " + existingCount + " populated hole" + (existingCount === 1 ? "" : "s") + ". Importing will replace it, but Undo Import can restore it." : "";
    }
    modal.classList.add("show");
  }

  function currentShotSnapshot() {
    try {
      return {
        createdAt: new Date().toISOString(),
        pagesData: deepClone(pagesData || {}),
        pageMeta: deepClone(pageMeta || {}),
        headerData: deepClone(headerData || {}),
        currentPage: Number(currentPage || 1),
        view: typeof view !== "undefined" ? deepClone(view) : null,
        timingSequence: (function () { try { return localStorage.getItem("mithrilCanvasTimingSequenceM397"); } catch (error) { return null; } })()
      };
    } catch (error) {
      console.error("MITHRIL m39.8 could not create the Shot Diagram undo snapshot.", error);
      return null;
    }
  }

  function saveUndoSnapshot(snapshot) {
    if (!snapshot) return false;
    var serialized = JSON.stringify(snapshot);
    try {
      sessionStorage.setItem(UNDO_KEY, serialized);
      return true;
    } catch (sessionError) {
      try {
        localStorage.setItem(UNDO_KEY, serialized);
        return true;
      } catch (localError) {
        console.error("MITHRIL m39.8 could not save the undo snapshot.", sessionError, localError);
        return false;
      }
    }
  }

  function readUndoSnapshot() {
    var raw = null;
    try { raw = sessionStorage.getItem(UNDO_KEY); } catch (error) {}
    if (!raw) {
      try { raw = localStorage.getItem(UNDO_KEY); } catch (error2) {}
    }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (error3) { return null; }
  }

  function clearUndoSnapshot() {
    try { sessionStorage.removeItem(UNDO_KEY); } catch (error) {}
    try { localStorage.removeItem(UNDO_KEY); } catch (error2) {}
  }

  function persistShotStateDirect() {
    localStorage.setItem("mithrilCanvasPagesM01", JSON.stringify(pagesData));
    localStorage.setItem("mithrilCanvasPageMetaM03", JSON.stringify(pageMeta));
    localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData));
    localStorage.setItem("mithrilCanvasUnsentM01", "true");
    if (typeof view !== "undefined" && view) localStorage.setItem("mithrilCanvasViewM01", JSON.stringify(view));
  }

  function refreshShotAfterStateChange(preferFitAll) {
    try { if (typeof ensurePageMeta === "function") ensurePageMeta(); } catch (error) {}
    try { if (typeof refreshPageSelect === "function") refreshPageSelect(); } catch (error2) {}
    try { if (typeof updateStatus === "function") updateStatus(); } catch (error3) {}
    try {
      if (preferFitAll && typeof fitAllPages === "function") fitAllPages();
      else if (typeof snapToCurrentPage === "function") snapToCurrentPage();
      else if (typeof draw === "function") draw();
    } catch (error4) {
      try { if (typeof draw === "function") draw(); } catch (error5) {}
    }
  }

  function applyShotResult(result) {
    pagesData = deepClone(result.pages);
    pageMeta = deepClone(result.pageMeta);
    headerData = deepClone(result.headerData);
    var keys = numericPageKeys(pagesData);
    currentPage = keys.length ? Number(keys[0]) : 1;
    holeData = pagesData[String(currentPage)] || {};
    persistShotStateDirect();
    refreshShotAfterStateChange(true);
  }

  function performShotImport() {
    var modal = byId("m398ShotImportModal");
    var result = modal && modal.__mithrilImportResult;
    if (!result || !result.holeCount) {
      alert("The Drill Log import is no longer available. Return to the Drill Log and start it again.");
      return;
    }
    var snapshot = currentShotSnapshot();
    if (!saveUndoSnapshot(snapshot)) {
      alert("MITHRIL could not save the required Undo Import snapshot, so no data was changed.");
      return;
    }
    try {
      applyShotResult(result);
      localStorage.setItem("mithrilCanvasTimingSequenceM397", JSON.stringify(result.headerData.TimingSequence));
      localStorage.removeItem(TRANSFER_KEY);
      sessionStorage.setItem(SUCCESS_KEY, JSON.stringify({ holeCount: result.holeCount, pageCount: result.pageCount }));
      modal.classList.remove("show");
      window.location.reload();
    } catch (error) {
      console.error("MITHRIL m39.8 Drill Log import failed.", error);
      try { restoreShotSnapshot(snapshot); } catch (restoreError) { console.error("MITHRIL could not immediately restore the pre-import snapshot.", restoreError); }
      clearUndoSnapshot();
      alert("The Drill Log import failed and MITHRIL attempted to restore the previous Shot Diagram. Refresh the app before continuing.");
    }
  }

  function restoreShotSnapshot(snapshot) {
    pagesData = deepClone(snapshot.pagesData || { "1": {} });
    pageMeta = deepClone(snapshot.pageMeta || { "1": { gx: 0, gy: 0, name: "Page 1" } });
    headerData = deepClone(snapshot.headerData || {});
    currentPage = Number(snapshot.currentPage || 1);
    if (!pagesData[String(currentPage)]) {
      var keys = numericPageKeys(pagesData);
      currentPage = keys.length ? Number(keys[0]) : 1;
    }
    holeData = pagesData[String(currentPage)] || {};
    if (snapshot.view && typeof view !== "undefined") view = deepClone(snapshot.view);
    persistShotStateDirect();
    if (snapshot.timingSequence) localStorage.setItem("mithrilCanvasTimingSequenceM397", snapshot.timingSequence);
    else localStorage.removeItem("mithrilCanvasTimingSequenceM397");
    refreshShotAfterStateChange(false);
  }

  function undoShotImport() {
    var snapshot = readUndoSnapshot();
    if (!snapshot) {
      alert("No Drill Log import undo snapshot is available in this browser tab.");
      return;
    }
    if (!confirm("Undo the Drill Log import? This restores the previous Shot Diagram and removes all Shot Diagram work completed since the import.")) return;
    try {
      restoreShotSnapshot(snapshot);
      clearUndoSnapshot();
      sessionStorage.setItem(RESTORED_KEY, "true");
      window.location.reload();
    } catch (error) {
      console.error("MITHRIL m39.8 could not restore the Shot Diagram undo snapshot.", error);
      alert("Undo Import could not restore the previous Shot Diagram. No further changes were made.");
    }
  }

  function showImportSuccess(holeCount, pageCount) {
    var old = byId("m398ImportSuccess");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var bar = document.createElement("div");
    bar.id = "m398ImportSuccess";
    bar.className = "m398TransferSuccess";
    bar.innerHTML = '<span>Imported ' + holeCount + ' Drill Log hole' + (holeCount === 1 ? '' : 's') + ' onto ' + pageCount + ' Shot Diagram page' + (pageCount === 1 ? '' : 's') + '.</span><button type="button" id="m398UndoImportNow">Undo Import</button><button type="button" class="primary" id="m398ImportDone">Done</button>';
    document.body.appendChild(bar);
    byId("m398UndoImportNow").addEventListener("click", undoShotImport);
    byId("m398ImportDone").addEventListener("click", function () { if (bar.parentNode) bar.parentNode.removeChild(bar); });
    updateShotUndoMenuButton();
  }

  function updateShotUndoMenuButton() {
    var button = byId("m398UndoDrillImportMenu");
    if (button) button.disabled = !readUndoSnapshot();
  }

  function addShotUndoMenuButton() {
    var menu = byId("menuModal");
    if (!menu || byId("m398UndoDrillImportMenu")) return false;
    var target = menu.querySelector("#m395ShotBackup .m395ActionGrid") ||
      menu.querySelector("#m395ShotExport .m395ActionGrid") ||
      menu.querySelector(".m395MenuStack");

    if (!target) {
      var titles = menu.querySelectorAll(".menuSectionTitle,.menuTitle");
      for (var i = 0; i < titles.length; i += 1) {
        if (/file tools/i.test(titles[i].textContent || "")) {
          var node = titles[i].nextElementSibling;
          while (node && !/(?:menuGrid|m395ActionGrid)/.test(node.className || "")) node = node.nextElementSibling;
          target = node;
          break;
        }
      }
    }
    if (!target) target = menu.querySelector(".menuGrid");
    if (!target) return false;

    var button = document.createElement("button");
    button.id = "m398UndoDrillImportMenu";
    button.type = "button";
    button.className = "wide";
    button.textContent = "Undo Last Drill Log Import";
    button.addEventListener("click", function () { closeVisibleMenu(); undoShotImport(); });
    target.appendChild(button);
    updateShotUndoMenuButton();
    return true;
  }

  function showPostReloadNotice() {
    var success = null;
    try {
      var raw = sessionStorage.getItem(SUCCESS_KEY);
      if (raw) success = JSON.parse(raw);
      sessionStorage.removeItem(SUCCESS_KEY);
    } catch (error) {}
    if (success) showImportSuccess(Number(success.holeCount || 0), Number(success.pageCount || 0));

    var restored = false;
    try {
      restored = sessionStorage.getItem(RESTORED_KEY) === "true";
      sessionStorage.removeItem(RESTORED_KEY);
    } catch (error2) {}
    if (restored) alert("The previous Shot Diagram has been restored.");
  }

  function installShotTransfer() {
    ensureStyles();
    ensureShotImportModal();
    addShotUndoMenuButton();
    window.setTimeout(showPostReloadNotice, 60);
    window.setTimeout(openShotImportReview, 80);
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (addShotUndoMenuButton() || attempts >= 30) window.clearInterval(timer);
    }, 100);
  }

  function installShotFrameBridge() {
    var frame = byId("shotFrame");
    if (!frame || frame.getAttribute("data-m398-transfer-bridge") === "true") return;
    frame.setAttribute("data-m398-transfer-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        var childWindow = frame.contentWindow;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childWindow && childWindow.__mithrilM398Installed) return true;
        var existing = childDocument.getElementById(CHILD_SCRIPT_ID);
        if (existing) return true;
        var script = childDocument.createElement("script");
        script.id = CHILD_SCRIPT_ID;
        script.setAttribute("data-mithril-release", RELEASE_VERSION);
        script.src = CHILD_SCRIPT_SRC;
        (childDocument.head || childDocument.documentElement).appendChild(script);
        return true;
      } catch (error) {
        console.warn("MITHRIL m39.8 could not attach the Drill Log transfer helper to the Shot Diagram.", error);
        return false;
      }
    }

    frame.addEventListener("load", function () { window.setTimeout(injectChildScript, 0); });
    var attempts = 0;
    function retry() {
      attempts += 1;
      if (injectChildScript() || attempts >= 30) return;
      window.setTimeout(retry, 100);
    }
    window.setTimeout(retry, 0);
  }

  function updateReleaseLabels() {
    try {
      var labels = document.querySelectorAll(".version");
      for (var i = 0; i < labels.length; i += 1) labels[i].textContent = RELEASE_VERSION;
      if (/m(?:38|39)\.\d+(?:\.\d+)?/i.test(document.title || "")) {
        document.title = document.title.replace(/m(?:38|39)\.\d+(?:\.\d+)?/ig, RELEASE_VERSION);
      }
      document.documentElement.setAttribute("data-mithril-release", RELEASE_VERSION);
    } catch (error) {}
  }

  function initialize() {
    updateReleaseLabels();
    window.setTimeout(updateReleaseLabels, 250);
    window.setTimeout(updateReleaseLabels, 800);
    if (isDrillLog()) installDrillTransfer();
    else if (isShotDiagram()) installShotTransfer();
    else if (isShotWrapper()) installShotFrameBridge();
  }

  window.MithrilM398Transfer = {
    release: RELEASE_VERSION,
    parseDrillHoleID: parseDrillHoleID,
    summarizeDrillPayload: summarizeDrillPayload,
    buildShotImport: buildShotImport,
    undoImport: undoShotImport
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
