(function () {
  "use strict";

  var RELEASE_VERSION = "m38.10";
  var RELEASE_LABEL = "shot recovery, menu navigation, and desktop wheel zoom";

  function byId(id) {
    return document.getElementById(id);
  }

  function callGlobal(name, args) {
    var fn = window[name];
    if (typeof fn !== "function") {
      alert("MITHRIL could not open this tool. Refresh the app and try again.");
      return undefined;
    }
    return fn.apply(window, args || []);
  }

  function closeMenu() {
    if (typeof window.closeMenu === "function") window.closeMenu();
    else {
      var menu = byId("menuModal");
      if (menu) menu.classList.remove("show");
    }
  }

  function runAndClose(name, args) {
    closeMenu();
    return callGlobal(name, args);
  }

  function installClosestPolyfill() {
    var elementProto = window.Element && window.Element.prototype;
    if (!elementProto) return;
    if (!elementProto.matches) {
      elementProto.matches = elementProto.msMatchesSelector || elementProto.webkitMatchesSelector || function (selector) {
        var matches = (this.document || this.ownerDocument).querySelectorAll(selector);
        var i = matches.length;
        while (--i >= 0 && matches.item(i) !== this) {}
        return i > -1;
      };
    }
    if (!elementProto.closest) {
      elementProto.closest = function (selector) {
        var node = this;
        while (node && node.nodeType === 1) {
          if (node.matches(selector)) return node;
          node = node.parentElement || node.parentNode;
        }
        return null;
      };
    }
  }

  function enableWheelZoom(canvas) {
    if (!canvas || canvas.getAttribute("data-m3810-wheel-zoom") === "true") return;
    canvas.setAttribute("data-m3810-wheel-zoom", "true");

    var accumulatedDelta = 0;
    var framePending = false;

    canvas.addEventListener("wheel", function (event) {
      if (typeof window.zoomBy !== "function") return;
      event.preventDefault();
      accumulatedDelta += Number(event.deltaY || 0);
      if (framePending) return;
      framePending = true;

      (window.requestAnimationFrame || function (callback) { return window.setTimeout(callback, 16); })(function () {
        framePending = false;
        if (!accumulatedDelta) return;
        var direction = accumulatedDelta < 0 ? 1 : -1;
        var magnitude = Math.min(0.18, Math.max(0.04, Math.abs(accumulatedDelta) * 0.0015));
        accumulatedDelta = 0;
        window.zoomBy(direction * magnitude);
      });
    }, { passive: false });
  }

  function addShotInfoBackButton() {
    var modal = byId("shotInfoModal");
    if (!modal || byId("m3810ShotInfoBack")) return;
    var grid = modal.querySelector(".buttonGrid");
    if (!grid) return;

    var button = document.createElement("button");
    button.id = "m3810ShotInfoBack";
    button.type = "button";
    button.className = "m3810BackMenu";
    button.textContent = "← Back to Menu";
    button.addEventListener("click", function () {
      if (typeof window.closeShotInfo === "function") window.closeShotInfo();
      else modal.classList.remove("show");

      if (typeof window.openMenu === "function") window.openMenu();
      else {
        var menu = byId("menuModal");
        if (menu) menu.classList.add("show");
      }
    });
    grid.appendChild(button);
  }

  function installShotFrameBridge() {
    var frame = byId("shotFrame");
    if (!frame || frame.getAttribute("data-m3810-bridge") === "true") return;
    frame.setAttribute("data-m3810-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childDocument.getElementById("mithrilMenuM3810ChildLoader")) return true;

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM3810ChildLoader";
        script.src = "./mithril-menu-m3810.js?v=38.10-frame";
        (childDocument.head || childDocument.documentElement).appendChild(script);
        return true;
      } catch (error) {
        console.warn("MITHRIL could not attach the Shot Diagram interface helpers.", error);
        return false;
      }
    }

    frame.addEventListener("load", function () {
      window.setTimeout(injectChildScript, 0);
    });

    var attempts = 0;
    function retryUntilReady() {
      attempts += 1;
      if (injectChildScript() || attempts >= 20) return;
      window.setTimeout(retryUntilReady, 100);
    }
    window.setTimeout(retryUntilReady, 0);
  }

  function injectStyles() {
    if (byId("mithrilMenuM3810Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM3810Styles";
    style.textContent = [
      ".m3810MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m3810MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m3810MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m3810MenuStack>button.m3810Home{text-align:center}",
      ".m3810Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m3810Section.show{display:block}",
      ".m3810SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m3810SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m3810ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3810ActionGrid button{min-height:49px}",
      ".m3810ActionGrid .wide{grid-column:1/-1}",
      ".m3810Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m3810Subpanel.show{display:block}",
      ".m3810DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m3810DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m3810Up{grid-area:up}.m3810Left{grid-area:left}.m3810Center{grid-area:center}.m3810Right{grid-area:right}.m3810Down{grid-area:down}",
      ".m3810Spacer{visibility:hidden;pointer-events:none}",
      ".m3810DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m3810DangerZone button{width:100%;min-height:50px}",
      ".m3810BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      "@media(max-width:520px){.m3810QuickButton{font-size:0}.m3810QuickButton:after{content:'Quick';font-size:14px}.m3810FitButton{font-size:0}.m3810FitButton:after{content:'Fit';font-size:14px}.m3810ActionGrid{grid-template-columns:1fr}.m3810ActionGrid .wide{grid-column:auto}.m3810DirectionGrid{grid-template-columns:1fr 1fr 1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function updateRuntimeLabels() {
    document.title = String(document.title || "MITHRIL").replace(/m38\.\d+/g, RELEASE_VERSION);

    var startVersion = document.querySelector(".startVersion");
    if (startVersion) startVersion.textContent = RELEASE_VERSION + " " + RELEASE_LABEL;

    var installedVersion = document.querySelector(".updateHomeVersion");
    if (installedVersion) installedVersion.textContent = "Installed version: " + RELEASE_VERSION;

    var versionLabels = document.querySelectorAll(".version");
    for (var i = 0; i < versionLabels.length; i += 1) {
      if (/m38\./i.test(versionLabels[i].textContent || "")) versionLabels[i].textContent = RELEASE_VERSION;
    }

    if (window.MITHRIL_UPDATE_CONFIG) {
      window.MITHRIL_UPDATE_CONFIG.currentVersion = RELEASE_VERSION;
    }
  }

  function updateToolbar(isShot) {
    var header = document.querySelector("header");
    if (!header) return;

    var topButtons = header.querySelectorAll(".topRow button");
    for (var i = 0; i < topButtons.length; i += 1) {
      var label = String(topButtons[i].textContent || "").trim();
      if (label === "Quick") {
        topButtons[i].textContent = "Quick Fill";
        topButtons[i].classList.add("m3810QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m3810FitButton");
    }

    if (isShot) {
      var finishButton = header.querySelector(".finishBtn");
      if (finishButton) finishButton.textContent = "Finish & Export PDF";
    }
  }

  function setButtonArrow(button, isOpen) {
    if (!button) return;
    var base = button.getAttribute("data-label") || button.textContent.replace(/[›⌄]\s*$/, "").trim();
    button.setAttribute("data-label", base);
    button.textContent = base + (isOpen ? "  ⌄" : "  ›");
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function hideAllSections(box, exceptId) {
    var sections = box.querySelectorAll(".m3810Section");
    var buttons = box.querySelectorAll("[data-m3810-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3810-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m3810Subpanel");
    var buttons = section.querySelectorAll("[data-m3810-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3810-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m3810-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m3810-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m3810-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m3810-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m3810Section");
        var subOpening = !subpanel.classList.contains("show");
        hideSubpanels(parentSection, subOpening ? subId : "");
        subpanel.classList.toggle("show", subOpening);
        setButtonArrow(subButton, subOpening);
      }
    });
  }

  function wireAction(box, selector, handler) {
    var button = box.querySelector(selector);
    if (button) button.addEventListener("click", handler);
  }

  function resetMenuPanelsWhenClosed(menu) {
    var observer = new MutationObserver(function () {
      if (menu.classList.contains("show")) return;
      var sections = menu.querySelectorAll(".m3810Section,.m3810Subpanel");
      var buttons = menu.querySelectorAll("[data-m3810-section],[data-m3810-subpanel]");
      var i;
      for (i = 0; i < sections.length; i += 1) sections[i].classList.remove("show");
      for (i = 0; i < buttons.length; i += 1) setButtonArrow(buttons[i], false);
    });
    observer.observe(menu, { attributes: true, attributeFilter: ["class"] });
  }

  function homeFromShot() {
    try {
      if (typeof window.saveData === "function") window.saveData();
      if (typeof window.saveView === "function") window.saveView();
    } catch (error) {
      console.warn("MITHRIL could not save before returning Home.", error);
    }

    if (window.parent && window.parent !== window) {
      window.parent.location.href = "./index.html?refresh=" + Date.now();
    } else {
      window.location.href = "./index.html?refresh=" + Date.now();
    }
  }

  function checkShotUpdates() {
    closeMenu();
    if (window.parent && window.parent !== window && typeof window.parent.checkShotDiagramForUpdates === "function") {
      window.parent.checkShotDiagramForUpdates();
      return;
    }
    if (window.MithrilUpdate && typeof window.MithrilUpdate.check === "function") {
      window.MithrilUpdate.check(window.MITHRIL_UPDATE_CONFIG || {});
      return;
    }
    alert("The MITHRIL update checker is still loading. Try again in a moment.");
  }

  function patchDrillMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m3810-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3810-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m3810-action="close">Close</button></div>',
      '<p class="m3810MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m3810MenuStack">',
      '  <button type="button" data-m3810-action="info">Drill Log Info</button>',
      '  <button type="button" data-m3810-section="m3810DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3810DrillPages" class="m3810Section">',
      '    <div class="m3810SectionTitle">Page Tools</div>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" class="wide" data-m3810-subpanel="m3810DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3810DrillAdd" class="m3810Subpanel">',
      '        <p class="m3810SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3810DirectionGrid">',
      '          <button type="button" class="m3810Up" data-m3810-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3810Left" data-m3810-add="left">← Add Left</button>',
      '          <button type="button" class="m3810Center m3810Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3810Right" data-m3810-add="right">Add Right →</button>',
      '          <button type="button" class="m3810Down" data-m3810-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3810-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3810-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3810-section="m3810DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3810DrillExport" class="m3810Section">',
      '    <div class="m3810SectionTitle">Export &amp; Share</div>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" class="primary wide" data-m3810-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m3810-action="pdf">Download PDF</button>',
      '      <button type="button" data-m3810-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3810-section="m3810DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3810DrillBackup" class="m3810Section">',
      '    <div class="m3810SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3810SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" data-m3810-action="backup">Download Backup</button>',
      '      <button type="button" data-m3810-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3810-section="m3810DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3810DrillSettings" class="m3810Section">',
      '    <div class="m3810SectionTitle">Settings</div>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" class="wide" data-m3810-action="calibrate">Calibrate Employee / Job</button>',
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3810-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3810DangerZone"><button type="button" class="danger" data-m3810-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3810Home" data-m3810-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3810-action="close"]', closeMenu);
    wireAction(box, '[data-m3810-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m3810-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3810-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m3810-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m3810-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m3810-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3810-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3810-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m3810-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m3810-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m3810-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3810-action="home"]', function () { runAndClose("returnToSelector"); });

    var addButtons = box.querySelectorAll("[data-m3810-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3810-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m3810-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3810-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m3810-action="close">Close</button></div>',
      '<p class="m3810MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m3810MenuStack">',
      '  <button type="button" data-m3810-action="info">Shot Info</button>',
      '  <button type="button" data-m3810-section="m3810ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3810ShotPages" class="m3810Section">',
      '    <div class="m3810SectionTitle">Page Tools</div>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" class="wide" data-m3810-subpanel="m3810ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3810ShotAdd" class="m3810Subpanel">',
      '        <p class="m3810SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3810DirectionGrid">',
      '          <button type="button" class="m3810Up" data-m3810-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3810Left" data-m3810-add="left">← Add Left</button>',
      '          <button type="button" class="m3810Center m3810Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3810Right" data-m3810-add="right">Add Right →</button>',
      '          <button type="button" class="m3810Down" data-m3810-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" class="wide" data-m3810-subpanel="m3810ShotShift" data-label="Shift Hole Data" aria-expanded="false">Shift Hole Data  ›</button>',
      '      <div id="m3810ShotShift" class="m3810Subpanel">',
      '        <p class="m3810SectionHelp">Shift every saved hole entry on the current page. The page itself does not move.</p>',
      '        <div class="m3810DirectionGrid">',
      '          <button type="button" class="m3810Up" data-m3810-shift="up">↑ Shift Up</button>',
      '          <button type="button" class="m3810Left" data-m3810-shift="left">← Shift Left</button>',
      '          <button type="button" class="m3810Center" data-m3810-action="undoShift">Undo</button>',
      '          <button type="button" class="m3810Right" data-m3810-shift="right">Shift Right →</button>',
      '          <button type="button" class="m3810Down" data-m3810-shift="down">↓ Shift Down</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3810-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3810-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3810-section="m3810ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3810ShotExport" class="m3810Section">',
      '    <div class="m3810SectionTitle">Export &amp; Share</div>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" class="primary wide" data-m3810-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m3810-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m3810-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m3810-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3810-section="m3810ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3810ShotBackup" class="m3810Section">',
      '    <div class="m3810SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3810SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" data-m3810-action="backup">Download Backup</button>',
      '      <button type="button" data-m3810-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3810-section="m3810ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3810ShotSettings" class="m3810Section">',
      '    <div class="m3810SectionTitle">Settings</div>',
      '    <div class="m3810ActionGrid">',
      '      <button type="button" class="wide" data-m3810-action="calibrate">Field Calibration</button>',
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3810-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3810DangerZone"><button type="button" class="danger" data-m3810-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3810Home" data-m3810-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3810-action="close"]', closeMenu);
    wireAction(box, '[data-m3810-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m3810-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3810-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m3810-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m3810-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m3810-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3810-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m3810-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3810-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m3810-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m3810-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m3810-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3810-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireAction(box, '[data-m3810-action="undoShift"]', function () { runAndClose("undoLastPageMove"); });

    var addButtons = box.querySelectorAll("[data-m3810-add]");
    var shiftButtons = box.querySelectorAll("[data-m3810-shift]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3810-add")]);
      });
    }
    for (i = 0; i < shiftButtons.length; i += 1) {
      shiftButtons[i].addEventListener("click", function () {
        runAndClose("moveCurrentPageData", [this.getAttribute("data-m3810-shift")]);
      });
    }
  }

  function initialize() {
    installClosestPolyfill();
    injectStyles();
    updateRuntimeLabels();

    if (byId("drillCanvas")) {
      updateToolbar(false);
      patchDrillMenu();
      enableWheelZoom(byId("drillCanvas"));
    } else if (byId("shotCanvas")) {
      updateToolbar(true);
      patchShotMenu();
      addShotInfoBackButton();
      enableWheelZoom(byId("shotCanvas"));
    } else if (byId("shotFrame")) {
      installShotFrameBridge();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
