(function () {
  "use strict";

  var RELEASE_VERSION = "m38.9";
  var RELEASE_LABEL = "unified minimal menus";

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

  function injectStyles() {
    if (byId("mithrilMenuM389Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM389Styles";
    style.textContent = [
      ".m389MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m389MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m389MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m389MenuStack>button.m389Home{text-align:center}",
      ".m389Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m389Section.show{display:block}",
      ".m389SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m389SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m389ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m389ActionGrid button{min-height:49px}",
      ".m389ActionGrid .wide{grid-column:1/-1}",
      ".m389Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m389Subpanel.show{display:block}",
      ".m389DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m389DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m389Up{grid-area:up}.m389Left{grid-area:left}.m389Center{grid-area:center}.m389Right{grid-area:right}.m389Down{grid-area:down}",
      ".m389Spacer{visibility:hidden;pointer-events:none}",
      ".m389DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m389DangerZone button{width:100%;min-height:50px}",
      "@media(max-width:520px){.m389QuickButton{font-size:0}.m389QuickButton:after{content:'Quick';font-size:14px}.m389FitButton{font-size:0}.m389FitButton:after{content:'Fit';font-size:14px}.m389ActionGrid{grid-template-columns:1fr}.m389ActionGrid .wide{grid-column:auto}.m389DirectionGrid{grid-template-columns:1fr 1fr 1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function updateRuntimeLabels() {
    document.title = String(document.title || "MITHRIL").replace(/m38\.8/g, RELEASE_VERSION);

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
        topButtons[i].classList.add("m389QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m389FitButton");
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
    var sections = box.querySelectorAll(".m389Section");
    var buttons = box.querySelectorAll("[data-m389-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m389-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m389Subpanel");
    var buttons = section.querySelectorAll("[data-m389-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m389-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m389-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m389-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m389-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m389-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m389Section");
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
      var sections = menu.querySelectorAll(".m389Section,.m389Subpanel");
      var buttons = menu.querySelectorAll("[data-m389-section],[data-m389-subpanel]");
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
    if (!menu || menu.getAttribute("data-m389-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m389-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m389-action="close">Close</button></div>',
      '<p class="m389MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m389MenuStack">',
      '  <button type="button" data-m389-action="info">Drill Log Info</button>',
      '  <button type="button" data-m389-section="m389DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m389DrillPages" class="m389Section">',
      '    <div class="m389SectionTitle">Page Tools</div>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" class="wide" data-m389-subpanel="m389DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m389DrillAdd" class="m389Subpanel">',
      '        <p class="m389SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m389DirectionGrid">',
      '          <button type="button" class="m389Up" data-m389-add="up">↑ Add Above</button>',
      '          <button type="button" class="m389Left" data-m389-add="left">← Add Left</button>',
      '          <button type="button" class="m389Center m389Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m389Right" data-m389-add="right">Add Right →</button>',
      '          <button type="button" class="m389Down" data-m389-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m389-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m389-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m389-section="m389DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m389DrillExport" class="m389Section">',
      '    <div class="m389SectionTitle">Export &amp; Share</div>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" class="primary wide" data-m389-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m389-action="pdf">Download PDF</button>',
      '      <button type="button" data-m389-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m389-section="m389DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m389DrillBackup" class="m389Section">',
      '    <div class="m389SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m389SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" data-m389-action="backup">Download Backup</button>',
      '      <button type="button" data-m389-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m389-section="m389DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m389DrillSettings" class="m389Section">',
      '    <div class="m389SectionTitle">Settings</div>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" class="wide" data-m389-action="calibrate">Calibrate Employee / Job</button>',
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m389-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m389DangerZone"><button type="button" class="danger" data-m389-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m389Home" data-m389-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m389-action="close"]', closeMenu);
    wireAction(box, '[data-m389-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m389-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m389-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m389-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m389-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m389-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m389-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m389-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m389-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m389-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m389-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m389-action="home"]', function () { runAndClose("returnToSelector"); });

    var addButtons = box.querySelectorAll("[data-m389-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m389-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m389-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m389-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m389-action="close">Close</button></div>',
      '<p class="m389MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m389MenuStack">',
      '  <button type="button" data-m389-action="info">Shot Info</button>',
      '  <button type="button" data-m389-section="m389ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m389ShotPages" class="m389Section">',
      '    <div class="m389SectionTitle">Page Tools</div>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" class="wide" data-m389-subpanel="m389ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m389ShotAdd" class="m389Subpanel">',
      '        <p class="m389SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m389DirectionGrid">',
      '          <button type="button" class="m389Up" data-m389-add="up">↑ Add Above</button>',
      '          <button type="button" class="m389Left" data-m389-add="left">← Add Left</button>',
      '          <button type="button" class="m389Center m389Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m389Right" data-m389-add="right">Add Right →</button>',
      '          <button type="button" class="m389Down" data-m389-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" class="wide" data-m389-subpanel="m389ShotShift" data-label="Shift Hole Data" aria-expanded="false">Shift Hole Data  ›</button>',
      '      <div id="m389ShotShift" class="m389Subpanel">',
      '        <p class="m389SectionHelp">Shift every saved hole entry on the current page. The page itself does not move.</p>',
      '        <div class="m389DirectionGrid">',
      '          <button type="button" class="m389Up" data-m389-shift="up">↑ Shift Up</button>',
      '          <button type="button" class="m389Left" data-m389-shift="left">← Shift Left</button>',
      '          <button type="button" class="m389Center" data-m389-action="undoShift">Undo</button>',
      '          <button type="button" class="m389Right" data-m389-shift="right">Shift Right →</button>',
      '          <button type="button" class="m389Down" data-m389-shift="down">↓ Shift Down</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m389-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m389-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m389-section="m389ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m389ShotExport" class="m389Section">',
      '    <div class="m389SectionTitle">Export &amp; Share</div>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" class="primary wide" data-m389-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m389-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m389-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m389-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m389-section="m389ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m389ShotBackup" class="m389Section">',
      '    <div class="m389SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m389SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" data-m389-action="backup">Download Backup</button>',
      '      <button type="button" data-m389-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m389-section="m389ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m389ShotSettings" class="m389Section">',
      '    <div class="m389SectionTitle">Settings</div>',
      '    <div class="m389ActionGrid">',
      '      <button type="button" class="wide" data-m389-action="calibrate">Field Calibration</button>',
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m389-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m389DangerZone"><button type="button" class="danger" data-m389-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m389Home" data-m389-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m389-action="close"]', closeMenu);
    wireAction(box, '[data-m389-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m389-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m389-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m389-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m389-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m389-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m389-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m389-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m389-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m389-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m389-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m389-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m389-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireAction(box, '[data-m389-action="undoShift"]', function () { runAndClose("undoLastPageMove"); });

    var addButtons = box.querySelectorAll("[data-m389-add]");
    var shiftButtons = box.querySelectorAll("[data-m389-shift]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m389-add")]);
      });
    }
    for (i = 0; i < shiftButtons.length; i += 1) {
      shiftButtons[i].addEventListener("click", function () {
        runAndClose("moveCurrentPageData", [this.getAttribute("data-m389-shift")]);
      });
    }
  }

  function initialize() {
    injectStyles();
    updateRuntimeLabels();

    if (byId("drillCanvas")) {
      updateToolbar(false);
      patchDrillMenu();
    } else if (byId("shotCanvas")) {
      updateToolbar(true);
      patchShotMenu();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
