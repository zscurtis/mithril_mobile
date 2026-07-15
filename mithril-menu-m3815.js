(function () {
  "use strict";

  var RELEASE_VERSION = "m38.15";
  var RELEASE_LABEL = "multi quick fill and canvas themes";
  var THEME_STORAGE_KEY = "mithrilCanvasThemeV1";
  var THEME_CLASS_PREFIX = "m3815-theme-";
  var THEME_OPTIONS = [
    { key: "gray", label: "Original Gray", group: "reset" },
    { key: "dark-slate", label: "Dark Slate", group: "classic" },
    { key: "blue-steel", label: "Blue Steel", group: "classic" },
    { key: "subtle-grid", label: "Subtle Grid", group: "classic" },
    { key: "gradient-slate", label: "Gradient Slate", group: "classic" },
    { key: "dark-paper", label: "Dark Paper", group: "classic" },
    { key: "soft-quarry-tan", label: "Soft Quarry Tan", group: "classic" },
    { key: "blast-ember", label: "Blast Ember", group: "bold" },
    { key: "electric-steel", label: "Electric Steel", group: "bold" },
    { key: "blast-placard", label: "Blast Placard", group: "bold" },
    { key: "copper-quarry", label: "Copper Quarry", group: "bold" },
    { key: "cobalt-topo", label: "Cobalt Topo", group: "bold" },
    { key: "signal-red-slate", label: "Signal Red Slate", group: "bold" }
  ];

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
    if (!canvas || canvas.getAttribute("data-m3815-wheel-zoom") === "true") return;
    canvas.setAttribute("data-m3815-wheel-zoom", "true");

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
    if (!modal || byId("m3815ShotInfoBack")) return;
    var grid = modal.querySelector(".buttonGrid");
    if (!grid) return;

    var button = document.createElement("button");
    button.id = "m3815ShotInfoBack";
    button.type = "button";
    button.className = "m3815BackMenu";
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
    if (!frame || frame.getAttribute("data-m3815-bridge") === "true") return;
    frame.setAttribute("data-m3815-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childDocument.getElementById("mithrilMenuM3815ChildLoader")) return true;

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM3815ChildLoader";
        script.src = "./mithril-menu-m3815.js?v=38.15-frame";
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
    if (byId("mithrilMenuM3815Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM3815Styles";
    style.textContent = [
      ".m3815MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m3815MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m3815MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m3815MenuStack>button.m3815Home{text-align:center}",
      ".m3815Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m3815Section.show{display:block}",
      ".m3815SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m3815SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m3815ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3815ActionGrid button{min-height:49px}",
      ".m3815ActionGrid .wide{grid-column:1/-1}",
      ".m3815Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m3815Subpanel.show{display:block}",
      ".m3815DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m3815DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m3815Up{grid-area:up}.m3815Left{grid-area:left}.m3815Center{grid-area:center}.m3815Right{grid-area:right}.m3815Down{grid-area:down}",
      ".m3815Spacer{visibility:hidden;pointer-events:none}",
      ".m3815DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m3815DangerZone button{width:100%;min-height:50px}",
      ".m3815BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      ".m3815ThemePanel{max-height:46vh;overflow:auto;padding-right:2px}",
      ".m3815ThemeGroupTitle{margin:10px 0 6px;font-size:12px;font-weight:950;color:#555;text-transform:uppercase;letter-spacing:.04em}",
      ".m3815ThemeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3815ThemeButton{min-height:44px;font-size:13px;line-height:1.25;text-align:left}",
      ".m3815ThemeButton.active{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "html.m3815-theme-gray,body.m3815-theme-gray{background:#2e2e2e !important}",
      "html.m3815-theme-dark-slate,body.m3815-theme-dark-slate{background-color:#232a31 !important;background-image:radial-gradient(circle at 18% 18%, rgba(255,255,255,.06) 0 3px, transparent 4px),radial-gradient(circle at 76% 70%, rgba(0,0,0,.2) 0 18px, transparent 20px),linear-gradient(135deg,#20262d 0%,#313b46 100%) !important;background-size:140px 140px,220px 220px,cover !important;background-attachment:fixed !important}",
      "html.m3815-theme-blue-steel,body.m3815-theme-blue-steel{background-color:#566575 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.08) 0 2px, transparent 3px),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0) 38%),linear-gradient(135deg,#4b5a68 0%,#6b7d8f 100%) !important;background-size:150px 150px,cover,cover !important;background-attachment:fixed !important}",
      "html.m3815-theme-subtle-grid,body.m3815-theme-subtle-grid{background-color:#252e38 !important;background-image:radial-gradient(circle at center, rgba(255,255,255,.03) 1px, transparent 1px),repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),linear-gradient(135deg,#232b34,#2e3945) !important;background-size:26px 26px,26px 26px,26px 26px,cover !important;background-attachment:fixed !important}",
      "html.m3815-theme-gradient-slate,body.m3815-theme-gradient-slate{background:#54606f !important;background-image:linear-gradient(135deg,#6b7786 0%,#3c4653 100%) !important;background-attachment:fixed !important}",
      "html.m3815-theme-dark-paper,body.m3815-theme-dark-paper{background-color:#35383d !important;background-image:radial-gradient(circle at 25% 25%, rgba(255,255,255,.05) 0 2px, transparent 3px),radial-gradient(circle at 75% 60%, rgba(255,255,255,.03) 0 1px, transparent 2px),linear-gradient(135deg,#2c3035 0%,#44484f 100%) !important;background-size:120px 120px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m3815-theme-soft-quarry-tan,body.m3815-theme-soft-quarry-tan{background-color:#b9aea0 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.12) 0 2px, transparent 3px),radial-gradient(circle at 80% 70%, rgba(0,0,0,.08) 0 2px, transparent 3px),linear-gradient(135deg,#c8bdae 0%,#a89b8b 100%) !important;background-size:70px 70px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m3815-theme-blast-ember,body.m3815-theme-blast-ember{background-color:#111 !important;background-image:radial-gradient(circle at 15% 78%, rgba(255,110,0,.72) 0 2%, transparent 8%),radial-gradient(circle at 82% 22%, rgba(255,90,0,.48) 0 1.4%, transparent 7%),repeating-linear-gradient(135deg, rgba(255,120,0,.0) 0 18px, rgba(255,110,0,.18) 18px 19px, transparent 19px 34px),linear-gradient(135deg,#090909,#262626) !important;background-attachment:fixed !important}",
      "html.m3815-theme-electric-steel,body.m3815-theme-electric-steel{background-color:#0e2032 !important;background-image:radial-gradient(circle at 50% 60%, rgba(0,150,255,.34) 0 18%, transparent 42%),repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 18px),linear-gradient(135deg,#091521,#27425f) !important;background-attachment:fixed !important}",
      "html.m3815-theme-blast-placard,body.m3815-theme-blast-placard{background-color:#111 !important;background-image:linear-gradient(45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),linear-gradient(-45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),radial-gradient(circle at 80% 25%, rgba(255,165,0,.22) 0 12%, transparent 26%),repeating-linear-gradient(135deg, rgba(255,150,30,.22) 0 12px, transparent 12px 36px),linear-gradient(135deg,#090909,#1b1b1b) !important;background-size:280px 280px,280px 280px,cover,cover,cover !important;background-attachment:fixed !important}",
      "html.m3815-theme-copper-quarry,body.m3815-theme-copper-quarry{background-color:#5a2b11 !important;background-image:radial-gradient(circle at 25% 30%, rgba(255,170,100,.28) 0 14%, transparent 26%),radial-gradient(circle at 72% 68%, rgba(255,210,130,.16) 0 10%, transparent 24%),repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0 12px, rgba(0,0,0,.08) 12px 22px),linear-gradient(135deg,#4c200c,#8a481f) !important;background-attachment:fixed !important}",
      "html.m3815-theme-cobalt-topo,body.m3815-theme-cobalt-topo{background-color:#041c3a !important;background-image:radial-gradient(circle at 18% 72%, transparent 0 40px, rgba(0,180,255,.24) 41px 42px, transparent 43px 54px, rgba(0,180,255,.18) 55px 56px, transparent 57px),radial-gradient(circle at 78% 62%, transparent 0 50px, rgba(0,180,255,.22) 51px 52px, transparent 53px 66px, rgba(0,180,255,.18) 67px 68px, transparent 69px),radial-gradient(circle at 56% 22%, transparent 0 32px, rgba(0,180,255,.18) 33px 34px, transparent 35px 48px, rgba(0,180,255,.15) 49px 50px, transparent 51px),linear-gradient(135deg,#031325,#09447a) !important;background-attachment:fixed !important}",
      "html.m3815-theme-signal-red-slate,body.m3815-theme-signal-red-slate{background-color:#120b0b !important;background-image:radial-gradient(circle at 18% 78%, rgba(255,70,40,.34) 0 18%, transparent 30%),radial-gradient(circle at 84% 20%, rgba(255,60,30,.28) 0 12%, transparent 24%),repeating-linear-gradient(90deg, rgba(255,60,30,.16) 0 2px, transparent 2px 48px),linear-gradient(135deg,#0b0b0b,#272222) !important;background-attachment:fixed !important}",
      "@media(max-width:520px){.m3815QuickButton{font-size:0}.m3815QuickButton:after{content:'Quick';font-size:14px}.m3815FitButton{font-size:0}.m3815FitButton:after{content:'Fit';font-size:14px}.m3815ActionGrid{grid-template-columns:1fr}.m3815ActionGrid .wide{grid-column:auto}.m3815DirectionGrid{grid-template-columns:1fr 1fr 1fr}.m3815ThemeGrid{grid-template-columns:1fr}}"
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
        topButtons[i].classList.add("m3815QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m3815FitButton");
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
    var sections = box.querySelectorAll(".m3815Section");
    var buttons = box.querySelectorAll("[data-m3815-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3815-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m3815Subpanel");
    var buttons = section.querySelectorAll("[data-m3815-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3815-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m3815-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m3815-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m3815-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m3815-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m3815Section");
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
      var sections = menu.querySelectorAll(".m3815Section,.m3815Subpanel");
      var buttons = menu.querySelectorAll("[data-m3815-section],[data-m3815-subpanel]");
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

  function getThemeOption(themeKey) {
    for (var i = 0; i < THEME_OPTIONS.length; i += 1) {
      if (THEME_OPTIONS[i].key === themeKey) return THEME_OPTIONS[i];
    }
    return THEME_OPTIONS[0];
  }

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(THEME_STORAGE_KEY);
      return getThemeOption(saved).key;
    } catch (error) {
      return "gray";
    }
  }

  function saveTheme(themeKey) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, getThemeOption(themeKey).key);
    } catch (error) {}
  }

  function stripThemeClasses(node) {
    if (!node || !node.className) return;
    var classes = String(node.className).split(/\s+/).filter(function (name) {
      return name && name.indexOf(THEME_CLASS_PREFIX) !== 0;
    });
    node.className = classes.join(" ").trim();
  }

  function refreshThemeButtons(root) {
    root = root || document;
    var current = getSavedTheme();
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3815-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var label = button.getAttribute('data-label') || button.textContent.replace(/^✓\s*/, '').trim();
      button.setAttribute('data-label', label);
      var active = button.getAttribute('data-m3815-theme-choice') === current;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.textContent = active ? ('✓ ' + label) : label;
    }
  }

  function applyTheme(themeKey) {
    var selected = getThemeOption(themeKey).key;
    var nodes = [document.documentElement, document.body];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (!node) continue;
      stripThemeClasses(node);
      node.classList.add(THEME_CLASS_PREFIX + selected);
    }
    refreshThemeButtons(document);
    syncThemeSurfaces();
    if (typeof window.draw === "function") { try { window.draw(); } catch (error) {} }
    return selected;
  }

  function chooseTheme(themeKey) {
    var selected = getThemeOption(themeKey).key;
    saveTheme(selected);
    applyTheme(selected);
    try {
      if (window.parent && window.parent !== window && typeof window.parent.MithrilApplyTheme === 'function') {
        window.parent.MithrilApplyTheme(selected);
      }
    } catch (error) {}
  }

  function buildThemePickerHtml(panelId) {
    function buildThemeButtons(groupKey) {
      var html = '';
      for (var i = 0; i < THEME_OPTIONS.length; i += 1) {
        if (THEME_OPTIONS[i].group !== groupKey) continue;
        html += '<button type="button" class="m3815ThemeButton" data-m3815-theme-choice="' + THEME_OPTIONS[i].key + '" data-label="' + THEME_OPTIONS[i].label + '">' + THEME_OPTIONS[i].label + '</button>';
      }
      return html;
    }

    return [
      '<button type="button" class="wide" data-m3815-subpanel="' + panelId + '" data-label="Canvas Background" aria-expanded="false">Canvas Background  ›</button>',
      '<div id="' + panelId + '" class="m3815Subpanel">',
      '  <div class="m3815ThemePanel">',
      '    <p class="m3815SectionHelp">Pick a canvas background. The theme applies immediately and stays saved on this device.</p>',
      '    <div class="m3815ThemeGroupTitle">Classic Themes</div>',
      '    <div class="m3815ThemeGrid">' + buildThemeButtons('classic') + '</div>',
      '    <div class="m3815ThemeGroupTitle">Bold Themes</div>',
      '    <div class="m3815ThemeGrid">' + buildThemeButtons('bold') + '</div>',
      '    <div class="m3815ThemeGroupTitle">Default</div>',
      '    <div class="m3815ThemeGrid">' + buildThemeButtons('reset') + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function wireThemeButtons(root) {
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3815-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function () {
        chooseTheme(this.getAttribute('data-m3815-theme-choice'));
      });
    }
    refreshThemeButtons(root);
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
    if (!menu || menu.getAttribute("data-m3815-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3815-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m3815-action="close">Close</button></div>',
      '<p class="m3815MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m3815MenuStack">',
      '  <button type="button" data-m3815-action="info">Drill Log Info</button>',
      '  <button type="button" data-m3815-section="m3815DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3815DrillPages" class="m3815Section">',
      '    <div class="m3815SectionTitle">Page Tools</div>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" class="wide" data-m3815-subpanel="m3815DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3815DrillAdd" class="m3815Subpanel">',
      '        <p class="m3815SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3815DirectionGrid">',
      '          <button type="button" class="m3815Up" data-m3815-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3815Left" data-m3815-add="left">← Add Left</button>',
      '          <button type="button" class="m3815Center m3815Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3815Right" data-m3815-add="right">Add Right →</button>',
      '          <button type="button" class="m3815Down" data-m3815-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3815-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3815-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3815-section="m3815DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3815DrillExport" class="m3815Section">',
      '    <div class="m3815SectionTitle">Export &amp; Share</div>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" class="primary wide" data-m3815-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m3815-action="pdf">Download PDF</button>',
      '      <button type="button" data-m3815-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3815-section="m3815DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3815DrillBackup" class="m3815Section">',
      '    <div class="m3815SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3815SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" data-m3815-action="backup">Download Backup</button>',
      '      <button type="button" data-m3815-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3815-section="m3815DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3815DrillSettings" class="m3815Section">',
      '    <div class="m3815SectionTitle">Settings</div>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" class="wide" data-m3815-action="calibrate">Calibrate Employee / Job</button>',
      buildThemePickerHtml("m3815DrillTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3815-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3815DangerZone"><button type="button" class="danger" data-m3815-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3815Home" data-m3815-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3815-action="close"]', closeMenu);
    wireAction(box, '[data-m3815-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m3815-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3815-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m3815-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m3815-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m3815-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3815-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3815-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m3815-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m3815-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m3815-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3815-action="home"]', function () { runAndClose("returnToSelector"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3815-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3815-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m3815-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3815-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m3815-action="close">Close</button></div>',
      '<p class="m3815MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m3815MenuStack">',
      '  <button type="button" data-m3815-action="info">Shot Info</button>',
      '  <button type="button" data-m3815-section="m3815ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3815ShotPages" class="m3815Section">',
      '    <div class="m3815SectionTitle">Page Tools</div>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" class="wide" data-m3815-subpanel="m3815ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3815ShotAdd" class="m3815Subpanel">',
      '        <p class="m3815SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3815DirectionGrid">',
      '          <button type="button" class="m3815Up" data-m3815-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3815Left" data-m3815-add="left">← Add Left</button>',
      '          <button type="button" class="m3815Center m3815Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3815Right" data-m3815-add="right">Add Right →</button>',
      '          <button type="button" class="m3815Down" data-m3815-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" class="wide" data-m3815-subpanel="m3815ShotShift" data-label="Shift Hole Data" aria-expanded="false">Shift Hole Data  ›</button>',
      '      <div id="m3815ShotShift" class="m3815Subpanel">',
      '        <p class="m3815SectionHelp">Shift every saved hole entry on the current page. The page itself does not move.</p>',
      '        <div class="m3815DirectionGrid">',
      '          <button type="button" class="m3815Up" data-m3815-shift="up">↑ Shift Up</button>',
      '          <button type="button" class="m3815Left" data-m3815-shift="left">← Shift Left</button>',
      '          <button type="button" class="m3815Center" data-m3815-action="undoShift">Undo</button>',
      '          <button type="button" class="m3815Right" data-m3815-shift="right">Shift Right →</button>',
      '          <button type="button" class="m3815Down" data-m3815-shift="down">↓ Shift Down</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3815-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3815-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3815-section="m3815ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3815ShotExport" class="m3815Section">',
      '    <div class="m3815SectionTitle">Export &amp; Share</div>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" class="primary wide" data-m3815-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m3815-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m3815-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m3815-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3815-section="m3815ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3815ShotBackup" class="m3815Section">',
      '    <div class="m3815SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3815SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" data-m3815-action="backup">Download Backup</button>',
      '      <button type="button" data-m3815-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3815-section="m3815ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3815ShotSettings" class="m3815Section">',
      '    <div class="m3815SectionTitle">Settings</div>',
      '    <div class="m3815ActionGrid">',
      '      <button type="button" class="wide" data-m3815-action="calibrate">Field Calibration</button>',
      buildThemePickerHtml("m3815ShotTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3815-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3815DangerZone"><button type="button" class="danger" data-m3815-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3815Home" data-m3815-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3815-action="close"]', closeMenu);
    wireAction(box, '[data-m3815-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m3815-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3815-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m3815-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m3815-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m3815-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3815-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m3815-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3815-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m3815-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m3815-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m3815-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3815-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireAction(box, '[data-m3815-action="undoShift"]', function () { runAndClose("undoLastPageMove"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3815-add]");
    var shiftButtons = box.querySelectorAll("[data-m3815-shift]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3815-add")]);
      });
    }
    for (i = 0; i < shiftButtons.length; i += 1) {
      shiftButtons[i].addEventListener("click", function () {
        runAndClose("moveCurrentPageData", [this.getAttribute("data-m3815-shift")]);
      });
    }
  }

  var DRILL_MULTI_QUICK_FIELDS = [
    { key: "Overburden", label: "Overburden" },
    { key: "Depth", label: "Depth" },
    { key: "Breakthrough", label: "Breakthrough" },
    { key: "DirtHole", label: "Dirt Hole" },
    { key: "BadHole", label: "Bad Hole" },
    { key: "Wet", label: "Wet Hole" }
  ];

  var SHOT_MULTI_QUICK_FIELDS = [
    { key: "Overburden", label: "Overburden" },
    { key: "Depth", label: "Depth" },
    { key: "Stemming", label: "Stemming" },
    { key: "PrimaryLoad", label: "Load" },
    { key: "SecondaryLoad", label: "Special Load" },
    { key: "Timing", label: "Timing" },
    { key: "DirtHole", label: "Dirt Hole" },
    { key: "BadHole", label: "Bad Hole" },
    { key: "Wet", label: "Wet Hole" }
  ];

  function injectMultiQuickStyles() {
    if (byId("mithrilMultiQuickM3815Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilMultiQuickM3815Styles";
    style.textContent = [
      ".m3815QuickIntro{margin:0 0 12px;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m3815QuickRows{display:grid;gap:10px}",
      ".m3815QuickRow{display:grid;grid-template-columns:78px minmax(130px,1.15fr) minmax(110px,.85fr);gap:8px;align-items:end;padding:9px;border:1px solid #bbb;border-radius:10px;background:#f8f8f8}",
      ".m3815QuickRow.inactive{opacity:.68}",
      ".m3815QuickUse{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:6px;border:1px solid #aaa;border-radius:8px;background:#fff;font-size:13px;font-weight:950}",
      ".m3815QuickUse input{width:24px;height:24px;min-height:24px;margin:0;padding:0}",
      ".m3815QuickRow label{min-width:0}",
      ".m3815QuickRow select,.m3815QuickRow input{width:100%;min-height:46px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;background:#fff}",
      ".m3815QuickValueCell{min-width:0}",
      ".m3815QuickActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}",
      ".m3815QuickActions button{min-height:48px}",
      ".m3815QuickBarSummary{min-width:0;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".m3815QuickBarHint{grid-column:1/-1;font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#333}",
      "#quickBar.m3815MultiQuickBar,#singleFillBar.m3815MultiQuickBar{grid-template-columns:minmax(0,1fr) auto auto!important}",
      "#quickModal .box.m3815QuickModalBox{width:min(650px,96vw)}",
      "#quickModal .box.m3815QuickKeypadOpen{padding-bottom:365px!important}",
      "@media(max-width:520px){.m3815QuickRow{grid-template-columns:68px 1fr}.m3815QuickValueCell{grid-column:2}.m3815QuickActions{grid-template-columns:1fr}.m3815QuickBarSummary{font-size:13px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function quickFieldLabel(fields, key) {
    for (var i = 0; i < fields.length; i += 1) {
      if (fields[i].key === key) return fields[i].label;
    }
    return key || "Field";
  }

  function isQuickConditionField(field) {
    return field === "Breakthrough" || field === "DirtHole" || field === "BadHole" || field === "Wet";
  }

  function normalizeQuickYesNo(value) {
    var text = String(value == null ? "" : value).trim().toLowerCase();
    return text === "no" || text === "false" || text === "0" ? "No" : "Yes";
  }

  function quickFieldAllowed(fields, field) {
    for (var i = 0; i < fields.length; i += 1) if (fields[i].key === field) return true;
    return false;
  }

  function optionHtml(fields) {
    var html = "";
    for (var i = 0; i < fields.length; i += 1) {
      html += '<option value="' + fields[i].key + '">' + fields[i].label + '</option>';
    }
    return html;
  }

  function normalizeMultiQuickEntries(source, fields, defaultOrder) {
    source = source || {};
    var oldField = quickFieldAllowed(fields, source.field) ? source.field : defaultOrder[0];
    var oldValue = source.value == null ? "" : String(source.value);
    var raw = Array.isArray(source.entries) ? source.entries.slice(0, 3) : null;
    var entries = [];
    var i;

    if (!raw || !raw.length) {
      entries.push({ enabled: true, field: oldField, value: oldValue });
      for (i = 0; entries.length < 3 && i < defaultOrder.length; i += 1) {
        if (defaultOrder[i] === oldField) continue;
        entries.push({ enabled: false, field: defaultOrder[i], value: "" });
      }
    } else {
      for (i = 0; i < raw.length && entries.length < 3; i += 1) {
        var item = raw[i] || {};
        entries.push({
          enabled: item.enabled !== false,
          field: quickFieldAllowed(fields, item.field) ? item.field : defaultOrder[Math.min(i, defaultOrder.length - 1)],
          value: item.value == null ? "" : String(item.value)
        });
      }
    }

    for (i = 0; entries.length < 3; i += 1) {
      entries.push({ enabled: false, field: defaultOrder[Math.min(entries.length, defaultOrder.length - 1)], value: "" });
    }
    return entries.slice(0, 3);
  }

  function activeMultiQuickEntries(entries) {
    return (entries || []).filter(function (entry) { return entry && entry.enabled; });
  }

  function validateMultiQuickEntries(entries, fields) {
    var active = activeMultiQuickEntries(entries);
    if (!active.length) {
      alert("Turn on at least one Quick Fill row.");
      return false;
    }
    var seen = {};
    for (var i = 0; i < active.length; i += 1) {
      if (seen[active[i].field]) {
        alert("Each active Quick Fill row must use a different field.\n\n" + quickFieldLabel(fields, active[i].field) + " is selected more than once.");
        return false;
      }
      seen[active[i].field] = true;
    }
    return true;
  }

  function buildMultiQuickRows(prefix, fields) {
    var html = "";
    var options = optionHtml(fields);
    for (var i = 1; i <= 3; i += 1) {
      html += [
        '<div id="' + prefix + 'Row' + i + '" class="m3815QuickRow">',
        '  <label class="m3815QuickUse"><input id="' + prefix + 'Use' + i + '" type="checkbox" /> Use ' + i + '</label>',
        '  <label>Field<select id="' + prefix + 'Field' + i + '">' + options + '</select></label>',
        '  <label class="m3815QuickValueCell">Value',
        '    <input id="' + prefix + 'Value' + i + '" type="text" readonly inputmode="none" autocomplete="off" placeholder="tap keypad" />',
        '    <select id="' + prefix + 'Bool' + i + '" style="display:none"><option value="Yes">Yes</option><option value="No">No</option></select>',
        '  </label>',
        '</div>'
      ].join("");
    }
    return html;
  }

  function quickEntrySummary(entries, fields) {
    var active = activeMultiQuickEntries(entries);
    if (!active.length) return "No Quick Fill fields selected";
    return active.map(function (entry) {
      var value = isQuickConditionField(entry.field) ? normalizeQuickYesNo(entry.value) : String(entry.value || "blank");
      return quickFieldLabel(fields, entry.field) + "=" + value;
    }).join(" • ");
  }

  function syncThemeSurfaces() {
    var body = document.body;
    if (!body || !window.getComputedStyle) return;
    var computed = window.getComputedStyle(body);
    var surfaces = [byId("canvasWrap"), byId("drillCanvas"), byId("shotCanvas")];
    for (var i = 0; i < surfaces.length; i += 1) {
      var surface = surfaces[i];
      if (!surface) continue;
      surface.style.backgroundColor = computed.backgroundColor;
      surface.style.backgroundImage = computed.backgroundImage;
      surface.style.backgroundSize = computed.backgroundSize;
      surface.style.backgroundPosition = computed.backgroundPosition;
      surface.style.backgroundRepeat = computed.backgroundRepeat;
    }
  }

  function installCanvasBackgroundBridge(canvas) {
    if (!canvas || canvas.getAttribute("data-m3815-theme-canvas") === "true") return;
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context || context.__mithrilM3815FillRect) return;
    var originalFillRect = context.fillRect.bind(context);
    context.__mithrilM3815FillRect = originalFillRect;
    context.fillRect = function (x, y, width, height) {
      var color = String(context.fillStyle || "").replace(/\s+/g, "").toLowerCase();
      var rect = canvas.getBoundingClientRect();
      var gray = color === "#2e2e2e" || color === "rgb(46,46,46)" || color === "rgba(46,46,46,1)";
      var fullSurface = Math.abs(Number(x || 0)) < 1 && Math.abs(Number(y || 0)) < 1 && Number(width || 0) >= rect.width - 2 && Number(height || 0) >= rect.height - 2;
      if (gray && fullSurface) return;
      return originalFillRect(x, y, width, height);
    };
    canvas.setAttribute("data-m3815-theme-canvas", "true");
  }

  function ensureDrillQuickState() {
    var entries = normalizeMultiQuickEntries(quick, DRILL_MULTI_QUICK_FIELDS, ["Overburden", "Depth", "Breakthrough"]);
    quick.entries = entries;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quick.field = first.field;
    quick.value = first.value;
    return quick;
  }

  function drillQuickPrefix() { return "m3815DrillQuick"; }

  function drillQuickEntriesFromModal() {
    var prefix = drillQuickPrefix();
    var entries = [];
    for (var i = 1; i <= 3; i += 1) {
      var field = byId(prefix + "Field" + i).value;
      var condition = isQuickConditionField(field);
      entries.push({
        enabled: !!byId(prefix + "Use" + i).checked,
        field: field,
        value: condition ? byId(prefix + "Bool" + i).value : byId(prefix + "Value" + i).value
      });
    }
    return entries;
  }

  function syncDrillQuickRow(index) {
    var prefix = drillQuickPrefix();
    var use = byId(prefix + "Use" + index);
    var field = byId(prefix + "Field" + index);
    var input = byId(prefix + "Value" + index);
    var boolSelect = byId(prefix + "Bool" + index);
    var row = byId(prefix + "Row" + index);
    if (!use || !field || !input || !boolSelect || !row) return;
    var condition = isQuickConditionField(field.value);
    input.style.display = condition ? "none" : "block";
    boolSelect.style.display = condition ? "block" : "none";
    if (condition && !boolSelect.value) boolSelect.value = "Yes";
    row.classList.toggle("inactive", !use.checked);
    if (condition && typeof window.hidePad === "function" && typeof activeInput !== "undefined" && activeInput === input.id) window.hidePad();
  }

  function fillDrillQuickModal() {
    var state = ensureDrillQuickState();
    var prefix = drillQuickPrefix();
    for (var i = 1; i <= 3; i += 1) {
      var entry = state.entries[i - 1];
      byId(prefix + "Use" + i).checked = !!entry.enabled;
      byId(prefix + "Field" + i).value = entry.field;
      byId(prefix + "Value" + i).value = isQuickConditionField(entry.field) ? "" : entry.value;
      byId(prefix + "Bool" + i).value = isQuickConditionField(entry.field) ? normalizeQuickYesNo(entry.value) : "Yes";
      syncDrillQuickRow(i);
    }
  }

  function saveDrillMultiQuick(enabled) {
    var entries = drillQuickEntriesFromModal();
    if (enabled && !validateMultiQuickEntries(entries, DRILL_MULTI_QUICK_FIELDS)) return false;
    quick.entries = entries;
    quick.enabled = !!enabled;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quick.field = first.field;
    quick.value = first.value;
    if (typeof saveState === "function") saveState();
    updateDrillMultiQuickBar();
    if (typeof window.closeQuickModal === "function") window.closeQuickModal();
    if (typeof draw === "function") draw();
    return true;
  }

  function updateDrillMultiQuickBar(message) {
    var state = ensureDrillQuickState();
    var bar = byId("quickBar");
    if (!bar) return;
    bar.classList.toggle("show", !!state.enabled);
    var summary = byId("m3815DrillQuickSummary");
    var hint = byId("m3815DrillQuickHint");
    if (summary) summary.textContent = quickEntrySummary(state.entries, DRILL_MULTI_QUICK_FIELDS);
    if (hint) hint.textContent = message || (activeMultiQuickEntries(state.entries).length + " field" + (activeMultiQuickEntries(state.entries).length === 1 ? "" : "s") + " active. Tap a hole once to apply all of them.");
  }

  function applyDrillMultiQuick(holeId) {
    var state = ensureDrillQuickState();
    if (!state.enabled) return;
    var entries = activeMultiQuickEntries(state.entries);
    if (!entries.length) return;
    var data = currentData();
    var row = data[holeId] || { HoleID: holeId, Overburden: "", Depth: "", Breakthrough: "No", DirtHole: "No", BadHole: "No", Wet: "No", Notes: "" };
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      row[entry.field] = isQuickConditionField(entry.field) ? normalizeQuickYesNo(entry.value) : String(entry.value || "");
    }
    row.HoleID = holeId;
    row.Timestamp = new Date().toLocaleString();
    data[holeId] = row;
    if (typeof invalidatePageCache === "function") invalidatePageCache(currentPage);
    if (typeof saveState === "function") saveState();
    if (typeof markDirty === "function") markDirty();
    if (typeof draw === "function") draw();
    updateDrillMultiQuickBar("Updated " + holeId + ": " + quickEntrySummary(entries, DRILL_MULTI_QUICK_FIELDS) + ".");
  }

  function installDrillQuickPadSupport() {
    if (window.__mithrilM3815DrillPad) return;
    window.__mithrilM3815DrillPad = true;
    var originalShowPad = window.showPad;
    var originalHidePad = window.hidePad;
    var originalInputLabel = window.inputLabel;
    var originalNextInput = window.nextInput;
    var prefix = drillQuickPrefix();

    window.inputLabel = function (id) {
      if (String(id || "").indexOf(prefix + "Value") === 0) {
        var index = Number(String(id).replace(prefix + "Value", ""));
        var field = byId(prefix + "Field" + index);
        return "Quick Fill " + index + " — " + quickFieldLabel(DRILL_MULTI_QUICK_FIELDS, field ? field.value : "");
      }
      return typeof originalInputLabel === "function" ? originalInputLabel(id) : "Value";
    };

    window.showPad = function (id) {
      if (typeof originalShowPad === "function") originalShowPad(id);
      for (var i = 1; i <= 3; i += 1) {
        var input = byId(prefix + "Value" + i);
        if (input) input.classList.toggle("activeInput", input.id === id);
      }
      var box = byId("quickModal") && byId("quickModal").querySelector(".box");
      if (box && byId("quickModal").classList.contains("show")) box.classList.add("m3815QuickKeypadOpen");
      var label = byId("padLabel");
      if (label) label.textContent = window.inputLabel(id);
    };

    window.hidePad = function () {
      if (typeof originalHidePad === "function") originalHidePad();
      for (var i = 1; i <= 3; i += 1) {
        var input = byId(prefix + "Value" + i);
        if (input) input.classList.remove("activeInput");
      }
      var box = byId("quickModal") && byId("quickModal").querySelector(".box");
      if (box) box.classList.remove("m3815QuickKeypadOpen");
    };

    window.nextInput = function () {
      if (typeof activeInput !== "undefined" && String(activeInput || "").indexOf(prefix + "Value") === 0) {
        var current = Number(String(activeInput).replace(prefix + "Value", ""));
        for (var offset = 1; offset <= 3; offset += 1) {
          var next = ((current - 1 + offset) % 3) + 1;
          var use = byId(prefix + "Use" + next);
          var field = byId(prefix + "Field" + next);
          if (use && use.checked && field && !isQuickConditionField(field.value)) {
            window.showPad(prefix + "Value" + next);
            return;
          }
        }
        window.hidePad();
        return;
      }
      if (typeof originalNextInput === "function") originalNextInput();
    };
  }

  function patchDrillMultiQuick() {
    var modal = byId("quickModal");
    var bar = byId("quickBar");
    if (!modal || !bar || modal.getAttribute("data-m3815-multi-quick") === "drill") return;
    modal.setAttribute("data-m3815-multi-quick", "drill");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m3815QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m3815DrillQuickClose">Close</button></div>',
      '<p class="m3815QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m3815QuickRows">' + buildMultiQuickRows(drillQuickPrefix(), DRILL_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m3815QuickActions">',
      '  <button type="button" class="primary" id="m3815DrillQuickOn">Turn On</button>',
      '  <button type="button" id="m3815DrillQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m3815DrillQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m3815MultiQuickBar");
    bar.innerHTML = [
      '<div id="m3815DrillQuickSummary" class="m3815QuickBarSummary"></div>',
      '<button type="button" id="m3815DrillQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m3815DrillQuickBarOff">Off</button>',
      '<div id="m3815DrillQuickHint" class="m3815QuickBarHint"></div>'
    ].join("");

    installDrillQuickPadSupport();
    var prefix = drillQuickPrefix();
    for (var i = 1; i <= 3; i += 1) {
      (function (index) {
        byId(prefix + "Use" + index).addEventListener("change", function () { syncDrillQuickRow(index); });
        byId(prefix + "Field" + index).addEventListener("change", function () { syncDrillQuickRow(index); });
        var input = byId(prefix + "Value" + index);
        input.addEventListener("pointerdown", function (event) { event.preventDefault(); window.showPad(input.id); });
        input.addEventListener("focus", function () { window.showPad(input.id); });
      })(i);
    }

    byId("m3815DrillQuickClose").addEventListener("click", function () { window.closeQuickModal(); });
    byId("m3815DrillQuickOn").addEventListener("click", function () { saveDrillMultiQuick(true); });
    byId("m3815DrillQuickOff").addEventListener("click", function () { saveDrillMultiQuick(false); });
    byId("m3815DrillQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hidePad === "function") window.hidePad();
    });
    byId("m3815DrillQuickEdit").addEventListener("click", function () { window.openQuickModal(); });
    byId("m3815DrillQuickBarOff").addEventListener("click", function () { window.turnQuickOff(); });

    window.openQuickModal = function () {
      fillDrillQuickModal();
      modal.classList.add("show");
    };
    window.closeQuickModal = function () {
      if (typeof window.hidePad === "function") window.hidePad();
      modal.classList.remove("show");
    };
    window.enableQuickFill = function () { return saveDrillMultiQuick(true); };
    window.saveQuickSettings = function () { ensureDrillQuickState(); if (typeof saveState === "function") saveState(); updateDrillMultiQuickBar(); };
    window.turnQuickOff = function () {
      ensureDrillQuickState();
      quick.enabled = false;
      if (typeof saveState === "function") saveState();
      updateDrillMultiQuickBar();
      if (typeof draw === "function") draw();
    };
    window.updateQuickBar = updateDrillMultiQuickBar;
    window.applyQuick = applyDrillMultiQuick;

    ensureDrillQuickState();
    updateDrillMultiQuickBar();
  }

  function ensureShotQuickState() {
    var entries = normalizeMultiQuickEntries(quickEntry, SHOT_MULTI_QUICK_FIELDS, ["Depth", "Stemming", "Overburden", "PrimaryLoad"]);
    quickEntry.entries = entries;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quickEntry.field = first.field;
    quickEntry.value = first.value;
    return quickEntry;
  }

  function shotQuickPrefix() { return "m3815ShotQuick"; }

  function shotQuickEntriesFromModal() {
    var prefix = shotQuickPrefix();
    var entries = [];
    for (var i = 1; i <= 3; i += 1) {
      var field = byId(prefix + "Field" + i).value;
      var condition = isQuickConditionField(field);
      var value = condition ? byId(prefix + "Bool" + i).value : byId(prefix + "Value" + i).value;
      if ((field === "PrimaryLoad" || field === "SecondaryLoad") && typeof normalizeLoadValue === "function") value = normalizeLoadValue(value);
      entries.push({ enabled: !!byId(prefix + "Use" + i).checked, field: field, value: value });
    }
    return entries;
  }

  function syncShotQuickRow(index) {
    var prefix = shotQuickPrefix();
    var use = byId(prefix + "Use" + index);
    var field = byId(prefix + "Field" + index);
    var input = byId(prefix + "Value" + index);
    var boolSelect = byId(prefix + "Bool" + index);
    var row = byId(prefix + "Row" + index);
    if (!use || !field || !input || !boolSelect || !row) return;
    var condition = isQuickConditionField(field.value);
    input.style.display = condition ? "none" : "block";
    boolSelect.style.display = condition ? "block" : "none";
    if (condition && !boolSelect.value) boolSelect.value = "Yes";
    row.classList.toggle("inactive", !use.checked);
    if (condition && typeof window.hideLoadKeypad === "function" && typeof activeLoadInputId !== "undefined" && activeLoadInputId === input.id) window.hideLoadKeypad();
    if (typeof window.updateEntryKeypadMode === "function") window.updateEntryKeypadMode();
  }

  function fillShotQuickModal() {
    var state = ensureShotQuickState();
    var prefix = shotQuickPrefix();
    for (var i = 1; i <= 3; i += 1) {
      var entry = state.entries[i - 1];
      byId(prefix + "Use" + i).checked = !!entry.enabled;
      byId(prefix + "Field" + i).value = entry.field;
      byId(prefix + "Value" + i).value = isQuickConditionField(entry.field) ? "" : entry.value;
      byId(prefix + "Bool" + i).value = isQuickConditionField(entry.field) ? normalizeQuickYesNo(entry.value) : "Yes";
      syncShotQuickRow(i);
    }
  }

  function saveShotMultiQuick(enabled) {
    var entries = shotQuickEntriesFromModal();
    if (enabled && !validateMultiQuickEntries(entries, SHOT_MULTI_QUICK_FIELDS)) return false;
    quickEntry.entries = entries;
    quickEntry.enabled = !!enabled;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quickEntry.field = first.field;
    quickEntry.value = first.value;
    localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
    updateShotMultiQuickBar();
    if (typeof window.closeQuickEntry === "function") window.closeQuickEntry();
    if (typeof draw === "function") draw();
    return true;
  }

  function updateShotMultiQuickBar(message) {
    var state = ensureShotQuickState();
    var bar = byId("singleFillBar");
    if (!bar) return;
    bar.classList.toggle("show", !!state.enabled);
    var summary = byId("m3815ShotQuickSummary");
    var hint = byId("m3815ShotQuickHint");
    if (summary) summary.textContent = quickEntrySummary(state.entries, SHOT_MULTI_QUICK_FIELDS);
    if (hint) hint.textContent = message || (activeMultiQuickEntries(state.entries).length + " field" + (activeMultiQuickEntries(state.entries).length === 1 ? "" : "s") + " active. Tap a hole once to apply all of them.");
  }

  function applyShotMultiQuick(pageNum, holeId) {
    var state = ensureShotQuickState();
    if (!state.enabled) return false;
    var entries = activeMultiQuickEntries(state.entries);
    if (!entries.length) return false;
    var pageKey = String(pageNum);
    if (!pagesData[pageKey]) pagesData[pageKey] = {};
    if (!pagesData[pageKey][holeId]) {
      pagesData[pageKey][holeId] = {
        PageNumber: pageNum,
        FieldDate: typeof formatShotDate === "function" ? (formatShotDate(headerData.FieldDate) || "") : (headerData.FieldDate || ""),
        ShotID: headerData.ShotID || "",
        JobName: headerData.JobName || "",
        Blaster: headerData.Blaster || "",
        HoleID: holeId,
        Depth: "",
        Stemming: "",
        PrimaryLoad: "",
        SecondaryLoad: "",
        Overburden: "",
        Timing: "",
        Wet: "No",
        BadHole: "No",
        DirtHole: "No",
        Notes: "",
        EnteredBy: headerData.EnteredByDefault || "",
        Timestamp: new Date().toLocaleString()
      };
    }
    var row = pagesData[pageKey][holeId];
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      var value = entry.value;
      if ((entry.field === "PrimaryLoad" || entry.field === "SecondaryLoad") && typeof normalizeLoadValue === "function") value = normalizeLoadValue(value);
      if (isQuickConditionField(entry.field)) value = normalizeQuickYesNo(value);
      row[entry.field] = String(value == null ? "" : value);
    }
    if (typeof normalizeHoleEntry === "function") normalizeHoleEntry(row);
    row.PageNumber = pageNum;
    row.FieldDate = typeof formatShotDate === "function" ? (formatShotDate(headerData.FieldDate) || "") : (headerData.FieldDate || "");
    row.ShotID = headerData.ShotID || "";
    row.JobName = headerData.JobName || "";
    row.Blaster = headerData.Blaster || "";
    row.EnteredBy = headerData.EnteredByDefault || "";
    row.Timestamp = new Date().toLocaleString();
    if (Number(pageNum) === Number(currentPage)) holeData = pagesData[pageKey];
    if (typeof saveData === "function") saveData();
    if (typeof markDirty === "function") markDirty();
    if (typeof draw === "function") draw();
    updateShotMultiQuickBar("Updated " + holeId + ": " + quickEntrySummary(entries, SHOT_MULTI_QUICK_FIELDS) + ".");
    return true;
  }

  function installShotQuickKeypadSupport() {
    if (window.__mithrilM3815ShotPad) return;
    window.__mithrilM3815ShotPad = true;
    var originalIsEntryKeypadField = window.isEntryKeypadField;
    var originalIsLoadValueInputId = window.isLoadValueInputId;
    var originalSetActiveLoadInput = window.setActiveLoadInput;
    var originalLoadInputLabel = window.loadInputLabel;
    var originalActiveEntryAllowsLoadLetters = window.activeEntryAllowsLoadLetters;
    var originalScrollActive = window.scrollActiveLoadInputIntoView;
    var originalHideLoadKeypad = window.hideLoadKeypad;
    var originalNextLoadInput = window.nextLoadInput;
    var prefix = shotQuickPrefix();

    function customIndex(id) {
      if (String(id || "").indexOf(prefix + "Value") !== 0) return 0;
      return Number(String(id).replace(prefix + "Value", "")) || 0;
    }
    function customField(id) {
      var index = customIndex(id);
      var field = index ? byId(prefix + "Field" + index) : null;
      return field ? field.value : "";
    }

    window.isEntryKeypadField = function (id) {
      if (customIndex(id)) return !isQuickConditionField(customField(id));
      return typeof originalIsEntryKeypadField === "function" ? originalIsEntryKeypadField(id) : false;
    };
    window.isLoadValueInputId = function (id) {
      if (customIndex(id)) {
        var field = customField(id);
        return field === "PrimaryLoad" || field === "SecondaryLoad";
      }
      return typeof originalIsLoadValueInputId === "function" ? originalIsLoadValueInputId(id) : false;
    };
    window.setActiveLoadInput = function (id) {
      if (typeof originalSetActiveLoadInput === "function") originalSetActiveLoadInput(id);
      for (var i = 1; i <= 3; i += 1) {
        var input = byId(prefix + "Value" + i);
        if (input) input.classList.toggle("loadInputActive", input.id === id);
      }
    };
    window.loadInputLabel = function (id) {
      var index = customIndex(id);
      if (index) return "Quick Fill " + index + " — " + quickFieldLabel(SHOT_MULTI_QUICK_FIELDS, customField(id));
      return typeof originalLoadInputLabel === "function" ? originalLoadInputLabel(id) : "Entry";
    };
    window.activeEntryAllowsLoadLetters = function (id) {
      id = id || (typeof activeLoadInputId !== "undefined" ? activeLoadInputId : "");
      if (customIndex(id)) {
        var field = customField(id);
        return field === "PrimaryLoad" || field === "SecondaryLoad";
      }
      return typeof originalActiveEntryAllowsLoadLetters === "function" ? originalActiveEntryAllowsLoadLetters(id) : false;
    };
    window.scrollActiveLoadInputIntoView = function (id) {
      if (typeof originalScrollActive === "function") originalScrollActive(id);
      if (customIndex(id)) {
        var box = byId("quickModal") && byId("quickModal").querySelector(".box");
        if (box) box.classList.add("m3815QuickKeypadOpen");
      }
    };
    window.hideLoadKeypad = function () {
      if (typeof originalHideLoadKeypad === "function") originalHideLoadKeypad();
      var box = byId("quickModal") && byId("quickModal").querySelector(".box");
      if (box) box.classList.remove("m3815QuickKeypadOpen");
      for (var i = 1; i <= 3; i += 1) {
        var input = byId(prefix + "Value" + i);
        if (input) input.classList.remove("loadInputActive");
      }
    };
    window.nextLoadInput = function () {
      var activeId = typeof activeLoadInputId !== "undefined" ? activeLoadInputId : "";
      var current = customIndex(activeId);
      if (current) {
        for (var offset = 1; offset <= 3; offset += 1) {
          var next = ((current - 1 + offset) % 3) + 1;
          var use = byId(prefix + "Use" + next);
          var field = byId(prefix + "Field" + next);
          if (use && use.checked && field && !isQuickConditionField(field.value)) {
            window.showEntryKeypad(prefix + "Value" + next, { noGuard: true });
            return;
          }
        }
        window.hideLoadKeypad();
        return;
      }
      if (typeof originalNextLoadInput === "function") originalNextLoadInput();
    };
  }

  function patchShotMultiQuick() {
    var modal = byId("quickModal");
    var bar = byId("singleFillBar");
    if (!modal || !bar || modal.getAttribute("data-m3815-multi-quick") === "shot") return;
    modal.setAttribute("data-m3815-multi-quick", "shot");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m3815QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m3815ShotQuickClose">Close</button></div>',
      '<p class="m3815QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m3815QuickRows">' + buildMultiQuickRows(shotQuickPrefix(), SHOT_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m3815QuickActions">',
      '  <button type="button" class="primary" id="m3815ShotQuickOn">Turn On</button>',
      '  <button type="button" id="m3815ShotQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m3815ShotQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m3815MultiQuickBar");
    bar.innerHTML = [
      '<div id="m3815ShotQuickSummary" class="m3815QuickBarSummary"></div>',
      '<button type="button" id="m3815ShotQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m3815ShotQuickBarOff">Off</button>',
      '<div id="m3815ShotQuickHint" class="m3815QuickBarHint"></div>'
    ].join("");

    installShotQuickKeypadSupport();
    var prefix = shotQuickPrefix();
    for (var i = 1; i <= 3; i += 1) {
      (function (index) {
        byId(prefix + "Use" + index).addEventListener("change", function () { syncShotQuickRow(index); });
        byId(prefix + "Field" + index).addEventListener("change", function () { syncShotQuickRow(index); });
        var input = byId(prefix + "Value" + index);
        input.addEventListener("pointerdown", function (event) {
          event.preventDefault();
          if (typeof window.showEntryKeypad === "function") window.showEntryKeypad(input.id);
        });
        input.addEventListener("focus", function () { if (typeof window.showEntryKeypad === "function") window.showEntryKeypad(input.id); });
      })(i);
    }

    byId("m3815ShotQuickClose").addEventListener("click", function () { window.closeQuickEntry(); });
    byId("m3815ShotQuickOn").addEventListener("click", function () { saveShotMultiQuick(true); });
    byId("m3815ShotQuickOff").addEventListener("click", function () { saveShotMultiQuick(false); });
    byId("m3815ShotQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hideLoadKeypad === "function") window.hideLoadKeypad();
    });
    byId("m3815ShotQuickEdit").addEventListener("click", function () { window.openQuickEntry(); });
    byId("m3815ShotQuickBarOff").addEventListener("click", function () { window.quickEnabledOff(); });

    window.openQuickEntry = function () {
      fillShotQuickModal();
      modal.classList.add("show");
    };
    window.closeQuickEntry = function () {
      if (typeof window.hideLoadKeypad === "function") window.hideLoadKeypad();
      modal.classList.remove("show");
    };
    window.saveQuickEntrySettings = function () { return saveShotMultiQuick(true); };
    window.clearQuickEntryValue = function () {
      for (var i = 1; i <= 3; i += 1) byId(prefix + "Value" + i).value = "";
    };
    window.singleFillOff = function () {
      ensureShotQuickState();
      quickEntry.enabled = false;
      localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
      updateShotMultiQuickBar();
      if (typeof draw === "function") draw();
    };
    window.quickEnabledOff = window.singleFillOff;
    window.syncSingleFillToQuickEntry = function () {};
    window.updateSingleFillBar = updateShotMultiQuickBar;
    window.applyQuickEntry = applyShotMultiQuick;
    window.getQuickStatusText = function () {
      var state = ensureShotQuickState();
      return state.enabled ? " — FILL " + quickEntrySummary(state.entries, SHOT_MULTI_QUICK_FIELDS) : "";
    };

    ensureShotQuickState();
    updateShotMultiQuickBar();
  }

  function initialize() {
    installClosestPolyfill();
    injectStyles();
    injectMultiQuickStyles();
    updateRuntimeLabels();

    var drillCanvas = byId("drillCanvas");
    var shotCanvas = byId("shotCanvas");
    if (drillCanvas) installCanvasBackgroundBridge(drillCanvas);
    if (shotCanvas) installCanvasBackgroundBridge(shotCanvas);

    window.MithrilApplyTheme = applyTheme;
    applyTheme(getSavedTheme());

    if (drillCanvas) {
      updateToolbar(false);
      patchDrillMenu();
      patchDrillMultiQuick();
      enableWheelZoom(drillCanvas);
    } else if (shotCanvas) {
      updateToolbar(true);
      patchShotMenu();
      addShotInfoBackButton();
      patchShotMultiQuick();
      enableWheelZoom(shotCanvas);
    } else if (byId("shotFrame")) {
      installShotFrameBridge();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
