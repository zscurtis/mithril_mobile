(function () {
  "use strict";

  var RELEASE_VERSION = "m38.14";
  var RELEASE_LABEL = "clean background-only image themes";
  var THEME_STORAGE_KEY = "mithrilCanvasThemeV1";
  var THEME_CLASS_PREFIX = "m3814-theme-";
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
    if (!canvas || canvas.getAttribute("data-m3814-wheel-zoom") === "true") return;
    canvas.setAttribute("data-m3814-wheel-zoom", "true");

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
    if (!modal || byId("m3814ShotInfoBack")) return;
    var grid = modal.querySelector(".buttonGrid");
    if (!grid) return;

    var button = document.createElement("button");
    button.id = "m3814ShotInfoBack";
    button.type = "button";
    button.className = "m3814BackMenu";
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
    if (!frame || frame.getAttribute("data-m3814-bridge") === "true") return;
    frame.setAttribute("data-m3814-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childDocument.getElementById("mithrilMenuM3814ChildLoader")) return true;

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM3814ChildLoader";
        script.src = "./mithril-menu-m3814.js?v=38.14-frame";
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
    if (byId("mithrilMenuM3814Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM3814Styles";
    style.textContent = [
      ".m3814MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m3814MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m3814MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m3814MenuStack>button.m3814Home{text-align:center}",
      ".m3814Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m3814Section.show{display:block}",
      ".m3814SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m3814SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m3814ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3814ActionGrid button{min-height:49px}",
      ".m3814ActionGrid .wide{grid-column:1/-1}",
      ".m3814Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m3814Subpanel.show{display:block}",
      ".m3814DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m3814DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m3814Up{grid-area:up}.m3814Left{grid-area:left}.m3814Center{grid-area:center}.m3814Right{grid-area:right}.m3814Down{grid-area:down}",
      ".m3814Spacer{visibility:hidden;pointer-events:none}",
      ".m3814DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m3814DangerZone button{width:100%;min-height:50px}",
      ".m3814BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      ".m3814ThemePanel{max-height:46vh;overflow:auto;padding-right:2px}",
      ".m3814ThemeGroupTitle{margin:10px 0 6px;font-size:12px;font-weight:950;color:#555;text-transform:uppercase;letter-spacing:.04em}",
      ".m3814ThemeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3814ThemeButton{min-height:44px;font-size:13px;line-height:1.25;text-align:left}",
      ".m3814ThemeButton.active{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "html.m3814-theme-gray,body.m3814-theme-gray{background:#777d84 !important;background-image:none !important}",
      "html.m3814-theme-dark-slate,body.m3814-theme-dark-slate{background-color:#232a31 !important;background-image:url('./theme_assets/dark-slate.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-blue-steel,body.m3814-theme-blue-steel{background-color:#566575 !important;background-image:url('./theme_assets/blue-steel.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-subtle-grid,body.m3814-theme-subtle-grid{background-color:#252e38 !important;background-image:url('./theme_assets/subtle-grid.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-gradient-slate,body.m3814-theme-gradient-slate{background-color:#54606f !important;background-image:url('./theme_assets/gradient-slate.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-dark-paper,body.m3814-theme-dark-paper{background-color:#35383d !important;background-image:url('./theme_assets/dark-paper.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-soft-quarry-tan,body.m3814-theme-soft-quarry-tan{background-color:#b9aea0 !important;background-image:url('./theme_assets/soft-quarry-tan.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-blast-ember,body.m3814-theme-blast-ember{background-color:#111 !important;background-image:url('./theme_assets/blast-ember.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-electric-steel,body.m3814-theme-electric-steel{background-color:#0e2032 !important;background-image:url('./theme_assets/electric-steel.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-blast-placard,body.m3814-theme-blast-placard{background-color:#111 !important;background-image:url('./theme_assets/blast-placard.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-copper-quarry,body.m3814-theme-copper-quarry{background-color:#5a2b11 !important;background-image:url('./theme_assets/copper-quarry.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-cobalt-topo,body.m3814-theme-cobalt-topo{background-color:#041c3a !important;background-image:url('./theme_assets/cobalt-topo.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m3814-theme-signal-red-slate,body.m3814-theme-signal-red-slate{background-color:#120b0b !important;background-image:url('./theme_assets/signal-red-slate.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "@media(max-width:520px){.m3814QuickButton{font-size:0}.m3814QuickButton:after{content:'Quick';font-size:14px}.m3814FitButton{font-size:0}.m3814FitButton:after{content:'Fit';font-size:14px}.m3814ActionGrid{grid-template-columns:1fr}.m3814ActionGrid .wide{grid-column:auto}.m3814DirectionGrid{grid-template-columns:1fr 1fr 1fr}.m3814ThemeGrid{grid-template-columns:1fr}}"
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
        topButtons[i].classList.add("m3814QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m3814FitButton");
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
    var sections = box.querySelectorAll(".m3814Section");
    var buttons = box.querySelectorAll("[data-m3814-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3814-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m3814Subpanel");
    var buttons = section.querySelectorAll("[data-m3814-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3814-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m3814-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m3814-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m3814-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m3814-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m3814Section");
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
      var sections = menu.querySelectorAll(".m3814Section,.m3814Subpanel");
      var buttons = menu.querySelectorAll("[data-m3814-section],[data-m3814-subpanel]");
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
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3814-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var label = button.getAttribute('data-label') || button.textContent.replace(/^✓\s*/, '').trim();
      button.setAttribute('data-label', label);
      var active = button.getAttribute('data-m3814-theme-choice') === current;
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
    return selected;
  }

  function isCanvasBackgroundFill(canvas, context, x, y, width, height) {
    var fill = String(context.fillStyle || "").toLowerCase().replace(/\s+/g, "");
    var gray = fill === "#2e2e2e" || fill === "rgb(46,46,46)" || fill === "rgba(46,46,46,1)";
    if (!gray || Number(x) !== 0 || Number(y) !== 0) return false;
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.width, height: canvas.height };
    var fullCss = Number(width) >= Math.max(1, Number(rect.width || 0) - 2) && Number(height) >= Math.max(1, Number(rect.height || 0) - 2);
    var fullPixels = Number(width) >= Math.max(1, Number(canvas.width || 0) - 2) && Number(height) >= Math.max(1, Number(canvas.height || 0) - 2);
    return fullCss || fullPixels;
  }

  function installCanvasThemeRenderer(canvas) {
    if (!canvas || canvas.getAttribute("data-m3814-theme-renderer") === "true") return;
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context) return;
    canvas.setAttribute("data-m3814-theme-renderer", "true");

    var originalFillRect = context.fillRect.bind(context);
    var originalClearRect = context.clearRect.bind(context);
    context.fillRect = function (x, y, width, height) {
      if (getSavedTheme() !== "gray" && isCanvasBackgroundFill(canvas, context, x, y, width, height)) {
        originalClearRect(x, y, width, height);
        return;
      }
      return originalFillRect(x, y, width, height);
    };
  }

  function syncCanvasThemeSurface() {
    var canvas = byId("drillCanvas") || byId("shotCanvas");
    var wrap = byId("canvasWrap");
    if (!canvas || !wrap) return;

    var bodyStyle = window.getComputedStyle ? window.getComputedStyle(document.body) : null;
    if (bodyStyle) {
      wrap.style.setProperty("background-color", bodyStyle.backgroundColor || "#2e2e2e", "important");
      wrap.style.setProperty("background-image", bodyStyle.backgroundImage || "none", "important");
      wrap.style.setProperty("background-size", bodyStyle.backgroundSize || "auto", "important");
      wrap.style.setProperty("background-position", bodyStyle.backgroundPosition || "0% 0%", "important");
      wrap.style.setProperty("background-repeat", bodyStyle.backgroundRepeat || "repeat", "important");
    }
    canvas.style.setProperty("background", "transparent", "important");
  }

  function redrawCanvasForTheme() {
    syncCanvasThemeSurface();
    if (typeof window.draw === "function") {
      try { window.draw(); } catch (error) { console.warn("MITHRIL could not redraw the canvas theme.", error); }
    }
  }

  function chooseTheme(themeKey) {
    var selected = getThemeOption(themeKey).key;
    saveTheme(selected);
    applyTheme(selected);
    redrawCanvasForTheme();
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
        html += '<button type="button" class="m3814ThemeButton" data-m3814-theme-choice="' + THEME_OPTIONS[i].key + '" data-label="' + THEME_OPTIONS[i].label + '">' + THEME_OPTIONS[i].label + '</button>';
      }
      return html;
    }

    return [
      '<button type="button" class="wide" data-m3814-subpanel="' + panelId + '" data-label="Canvas Background" aria-expanded="false">Canvas Background  ›</button>',
      '<div id="' + panelId + '" class="m3814Subpanel">',
      '  <div class="m3814ThemePanel">',
      '    <p class="m3814SectionHelp">Pick a canvas background. The canvas changes immediately and stays saved on this device.</p>',
      '    <div class="m3814ThemeGroupTitle">Classic Themes</div>',
      '    <div class="m3814ThemeGrid">' + buildThemeButtons('classic') + '</div>',
      '    <div class="m3814ThemeGroupTitle">Bold Themes</div>',
      '    <div class="m3814ThemeGrid">' + buildThemeButtons('bold') + '</div>',
      '    <div class="m3814ThemeGroupTitle">Default</div>',
      '    <div class="m3814ThemeGrid">' + buildThemeButtons('reset') + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function wireThemeButtons(root) {
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3814-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function () {
        chooseTheme(this.getAttribute('data-m3814-theme-choice'));
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
    if (!menu || menu.getAttribute("data-m3814-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3814-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m3814-action="close">Close</button></div>',
      '<p class="m3814MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m3814MenuStack">',
      '  <button type="button" data-m3814-action="info">Drill Log Info</button>',
      '  <button type="button" data-m3814-section="m3814DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3814DrillPages" class="m3814Section">',
      '    <div class="m3814SectionTitle">Page Tools</div>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" class="wide" data-m3814-subpanel="m3814DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3814DrillAdd" class="m3814Subpanel">',
      '        <p class="m3814SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3814DirectionGrid">',
      '          <button type="button" class="m3814Up" data-m3814-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3814Left" data-m3814-add="left">← Add Left</button>',
      '          <button type="button" class="m3814Center m3814Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3814Right" data-m3814-add="right">Add Right →</button>',
      '          <button type="button" class="m3814Down" data-m3814-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3814-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3814-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3814-section="m3814DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3814DrillExport" class="m3814Section">',
      '    <div class="m3814SectionTitle">Export &amp; Share</div>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" class="primary wide" data-m3814-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m3814-action="pdf">Download PDF</button>',
      '      <button type="button" data-m3814-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3814-section="m3814DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3814DrillBackup" class="m3814Section">',
      '    <div class="m3814SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3814SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" data-m3814-action="backup">Download Backup</button>',
      '      <button type="button" data-m3814-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3814-section="m3814DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3814DrillSettings" class="m3814Section">',
      '    <div class="m3814SectionTitle">Settings</div>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" class="wide" data-m3814-action="calibrate">Calibrate Employee / Job</button>',
      buildThemePickerHtml("m3814DrillTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3814-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3814DangerZone"><button type="button" class="danger" data-m3814-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3814Home" data-m3814-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3814-action="close"]', closeMenu);
    wireAction(box, '[data-m3814-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m3814-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3814-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m3814-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m3814-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m3814-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3814-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3814-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m3814-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m3814-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m3814-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3814-action="home"]', function () { runAndClose("returnToSelector"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3814-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3814-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m3814-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3814-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m3814-action="close">Close</button></div>',
      '<p class="m3814MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m3814MenuStack">',
      '  <button type="button" data-m3814-action="info">Shot Info</button>',
      '  <button type="button" data-m3814-section="m3814ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3814ShotPages" class="m3814Section">',
      '    <div class="m3814SectionTitle">Page Tools</div>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" class="wide" data-m3814-subpanel="m3814ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3814ShotAdd" class="m3814Subpanel">',
      '        <p class="m3814SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3814DirectionGrid">',
      '          <button type="button" class="m3814Up" data-m3814-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3814Left" data-m3814-add="left">← Add Left</button>',
      '          <button type="button" class="m3814Center m3814Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3814Right" data-m3814-add="right">Add Right →</button>',
      '          <button type="button" class="m3814Down" data-m3814-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" class="wide" data-m3814-subpanel="m3814ShotShift" data-label="Shift Hole Data" aria-expanded="false">Shift Hole Data  ›</button>',
      '      <div id="m3814ShotShift" class="m3814Subpanel">',
      '        <p class="m3814SectionHelp">Shift every saved hole entry on the current page. The page itself does not move.</p>',
      '        <div class="m3814DirectionGrid">',
      '          <button type="button" class="m3814Up" data-m3814-shift="up">↑ Shift Up</button>',
      '          <button type="button" class="m3814Left" data-m3814-shift="left">← Shift Left</button>',
      '          <button type="button" class="m3814Center" data-m3814-action="undoShift">Undo</button>',
      '          <button type="button" class="m3814Right" data-m3814-shift="right">Shift Right →</button>',
      '          <button type="button" class="m3814Down" data-m3814-shift="down">↓ Shift Down</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3814-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3814-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3814-section="m3814ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3814ShotExport" class="m3814Section">',
      '    <div class="m3814SectionTitle">Export &amp; Share</div>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" class="primary wide" data-m3814-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m3814-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m3814-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m3814-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3814-section="m3814ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3814ShotBackup" class="m3814Section">',
      '    <div class="m3814SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3814SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" data-m3814-action="backup">Download Backup</button>',
      '      <button type="button" data-m3814-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3814-section="m3814ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3814ShotSettings" class="m3814Section">',
      '    <div class="m3814SectionTitle">Settings</div>',
      '    <div class="m3814ActionGrid">',
      '      <button type="button" class="wide" data-m3814-action="calibrate">Field Calibration</button>',
      buildThemePickerHtml("m3814ShotTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3814-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3814DangerZone"><button type="button" class="danger" data-m3814-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3814Home" data-m3814-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3814-action="close"]', closeMenu);
    wireAction(box, '[data-m3814-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m3814-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3814-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m3814-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m3814-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m3814-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3814-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m3814-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3814-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m3814-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m3814-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m3814-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3814-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireAction(box, '[data-m3814-action="undoShift"]', function () { runAndClose("undoLastPageMove"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3814-add]");
    var shiftButtons = box.querySelectorAll("[data-m3814-shift]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3814-add")]);
      });
    }
    for (i = 0; i < shiftButtons.length; i += 1) {
      shiftButtons[i].addEventListener("click", function () {
        runAndClose("moveCurrentPageData", [this.getAttribute("data-m3814-shift")]);
      });
    }
  }

  function initialize() {
    installClosestPolyfill();
    injectStyles();
    updateRuntimeLabels();
    window.MithrilApplyTheme = applyTheme;
    applyTheme(getSavedTheme());

    if (byId("drillCanvas")) {
      updateToolbar(false);
      patchDrillMenu();
      enableWheelZoom(byId("drillCanvas"));
      installCanvasThemeRenderer(byId("drillCanvas"));
      window.setTimeout(redrawCanvasForTheme, 0);
    } else if (byId("shotCanvas")) {
      updateToolbar(true);
      patchShotMenu();
      addShotInfoBackButton();
      enableWheelZoom(byId("shotCanvas"));
      installCanvasThemeRenderer(byId("shotCanvas"));
      window.setTimeout(redrawCanvasForTheme, 0);
    } else if (byId("shotFrame")) {
      installShotFrameBridge();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
