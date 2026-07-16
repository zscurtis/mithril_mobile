(function () {
  "use strict";

  var RELEASE_VERSION = "m38.24";
  var RELEASE_LABEL = "structured quarry hole conditions with interval notes, Dirt holes excluded from PDF notes, cross-page GPS arranging, loaded-hole summary, edge-anchored GPS arrows, compact callouts, precision quick-fill targeting, multi quick fill, and canvas themes";
  var THEME_STORAGE_KEY = "mithrilCanvasThemeV1";
  var THEME_CLASS_PREFIX = "m3824-theme-";
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

  function finiteCoordinate(value) {
    var number = Number(value);
    return isFinite(number) ? number : null;
  }

  // Convert a pointer or touch event into CSS-pixel coordinates inside the
  // canvas. Pointer offset coordinates are preferred because they remain
  // tied to the canvas even when iPad Safari changes its visual viewport.
  // Page coordinates are the fallback for legacy touch events.
  function preciseCanvasPoint(event, canvas) {
    var source = event;
    if (event && event.touches && event.touches.length) source = event.touches[0];
    else if (event && event.changedTouches && event.changedTouches.length) source = event.changedTouches[0];

    var rect = canvas.getBoundingClientRect();
    var x = null;
    var y = null;
    var canUseOffset = source === event &&
      finiteCoordinate(source.offsetX) !== null &&
      finiteCoordinate(source.offsetY) !== null &&
      (source.target === canvas || source.currentTarget === canvas);

    if (canUseOffset) {
      x = finiteCoordinate(source.offsetX);
      y = finiteCoordinate(source.offsetY);
    }

    if (x === null || y === null) {
      var pageX = finiteCoordinate(source && source.pageX);
      var pageY = finiteCoordinate(source && source.pageY);
      if (pageX !== null && pageY !== null) {
        x = pageX - (rect.left + Number(window.pageXOffset || 0));
        y = pageY - (rect.top + Number(window.pageYOffset || 0));
      }
    }

    if (x === null || y === null) {
      var clientX = finiteCoordinate(source && source.clientX);
      var clientY = finiteCoordinate(source && source.clientY);
      x = (clientX === null ? 0 : clientX) - rect.left;
      y = (clientY === null ? 0 : clientY) - rect.top;
    }

    return { x: x, y: y };
  }

  function installPrecisionCanvasCoordinates(canvas, type) {
    if (!canvas || canvas.getAttribute("data-m3824-precision-coordinates") === "true") return;

    if (type === "drill" && typeof window.canvasPoint === "function") {
      window.canvasPoint = function (event) {
        return preciseCanvasPoint(event, canvas);
      };
    }

    if (type === "shot" && typeof window.canvasPointFromEvent === "function") {
      window.canvasPointFromEvent = function (event) {
        return preciseCanvasPoint(event, canvas);
      };
    }

    canvas.setAttribute("data-m3824-precision-coordinates", "true");
  }

  function enableWheelZoom(canvas) {
    if (!canvas || canvas.getAttribute("data-m3824-wheel-zoom") === "true") return;
    canvas.setAttribute("data-m3824-wheel-zoom", "true");

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
    if (!modal || byId("m3824ShotInfoBack")) return;
    var grid = modal.querySelector(".buttonGrid");
    if (!grid) return;

    var button = document.createElement("button");
    button.id = "m3824ShotInfoBack";
    button.type = "button";
    button.className = "m3824BackMenu";
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
    if (!frame || frame.getAttribute("data-m3824-bridge") === "true") return;
    frame.setAttribute("data-m3824-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childDocument.getElementById("mithrilMenuM3824ChildLoader")) return true;

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM3824ChildLoader";
        script.src = "./mithril-menu-m3824.js?v=38.24-frame";
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
    if (byId("mithrilMenuM3824Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM3824Styles";
    style.textContent = [
      ".m3824MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m3824MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m3824MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m3824MenuStack>button.m3824Home{text-align:center}",
      ".m3824Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m3824Section.show{display:block}",
      ".m3824SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m3824SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m3824ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3824ActionGrid button{min-height:49px}",
      ".m3824ActionGrid .wide{grid-column:1/-1}",
      ".m3824Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m3824Subpanel.show{display:block}",
      ".m3824DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m3824DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m3824Up{grid-area:up}.m3824Left{grid-area:left}.m3824Center{grid-area:center}.m3824Right{grid-area:right}.m3824Down{grid-area:down}",
      ".m3824Spacer{visibility:hidden;pointer-events:none}",
      ".m3824DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m3824DangerZone button{width:100%;min-height:50px}",
      ".m3824BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      ".m3824ThemePanel{max-height:46vh;overflow:auto;padding-right:2px}",
      ".m3824ThemeGroupTitle{margin:10px 0 6px;font-size:12px;font-weight:950;color:#555;text-transform:uppercase;letter-spacing:.04em}",
      ".m3824ThemeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3824ThemeButton{min-height:44px;font-size:13px;line-height:1.25;text-align:left}",
      ".m3824ThemeButton.active{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "html.m3824-theme-gray,body.m3824-theme-gray{background:#2e2e2e !important}",
      "html.m3824-theme-dark-slate,body.m3824-theme-dark-slate{background-color:#232a31 !important;background-image:radial-gradient(circle at 18% 18%, rgba(255,255,255,.06) 0 3px, transparent 4px),radial-gradient(circle at 76% 70%, rgba(0,0,0,.2) 0 18px, transparent 20px),linear-gradient(135deg,#20262d 0%,#313b46 100%) !important;background-size:140px 140px,220px 220px,cover !important;background-attachment:fixed !important}",
      "html.m3824-theme-blue-steel,body.m3824-theme-blue-steel{background-color:#566575 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.08) 0 2px, transparent 3px),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0) 38%),linear-gradient(135deg,#4b5a68 0%,#6b7d8f 100%) !important;background-size:150px 150px,cover,cover !important;background-attachment:fixed !important}",
      "html.m3824-theme-subtle-grid,body.m3824-theme-subtle-grid{background-color:#252e38 !important;background-image:radial-gradient(circle at center, rgba(255,255,255,.03) 1px, transparent 1px),repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),linear-gradient(135deg,#232b34,#2e3945) !important;background-size:26px 26px,26px 26px,26px 26px,cover !important;background-attachment:fixed !important}",
      "html.m3824-theme-gradient-slate,body.m3824-theme-gradient-slate{background:#54606f !important;background-image:linear-gradient(135deg,#6b7786 0%,#3c4653 100%) !important;background-attachment:fixed !important}",
      "html.m3824-theme-dark-paper,body.m3824-theme-dark-paper{background-color:#35383d !important;background-image:radial-gradient(circle at 25% 25%, rgba(255,255,255,.05) 0 2px, transparent 3px),radial-gradient(circle at 75% 60%, rgba(255,255,255,.03) 0 1px, transparent 2px),linear-gradient(135deg,#2c3035 0%,#44484f 100%) !important;background-size:120px 120px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m3824-theme-soft-quarry-tan,body.m3824-theme-soft-quarry-tan{background-color:#b9aea0 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.12) 0 2px, transparent 3px),radial-gradient(circle at 80% 70%, rgba(0,0,0,.08) 0 2px, transparent 3px),linear-gradient(135deg,#c8bdae 0%,#a89b8b 100%) !important;background-size:70px 70px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m3824-theme-blast-ember,body.m3824-theme-blast-ember{background-color:#111 !important;background-image:radial-gradient(circle at 15% 78%, rgba(255,110,0,.72) 0 2%, transparent 8%),radial-gradient(circle at 82% 22%, rgba(255,90,0,.48) 0 1.4%, transparent 7%),repeating-linear-gradient(135deg, rgba(255,120,0,.0) 0 18px, rgba(255,110,0,.18) 18px 19px, transparent 19px 34px),linear-gradient(135deg,#090909,#262626) !important;background-attachment:fixed !important}",
      "html.m3824-theme-electric-steel,body.m3824-theme-electric-steel{background-color:#0e2032 !important;background-image:radial-gradient(circle at 50% 60%, rgba(0,150,255,.34) 0 18%, transparent 42%),repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 18px),linear-gradient(135deg,#091521,#27425f) !important;background-attachment:fixed !important}",
      "html.m3824-theme-blast-placard,body.m3824-theme-blast-placard{background-color:#111 !important;background-image:linear-gradient(45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),linear-gradient(-45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),radial-gradient(circle at 80% 25%, rgba(255,165,0,.22) 0 12%, transparent 26%),repeating-linear-gradient(135deg, rgba(255,150,30,.22) 0 12px, transparent 12px 36px),linear-gradient(135deg,#090909,#1b1b1b) !important;background-size:280px 280px,280px 280px,cover,cover,cover !important;background-attachment:fixed !important}",
      "html.m3824-theme-copper-quarry,body.m3824-theme-copper-quarry{background-color:#5a2b11 !important;background-image:radial-gradient(circle at 25% 30%, rgba(255,170,100,.28) 0 14%, transparent 26%),radial-gradient(circle at 72% 68%, rgba(255,210,130,.16) 0 10%, transparent 24%),repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0 12px, rgba(0,0,0,.08) 12px 22px),linear-gradient(135deg,#4c200c,#8a481f) !important;background-attachment:fixed !important}",
      "html.m3824-theme-cobalt-topo,body.m3824-theme-cobalt-topo{background-color:#041c3a !important;background-image:radial-gradient(circle at 18% 72%, transparent 0 40px, rgba(0,180,255,.24) 41px 42px, transparent 43px 54px, rgba(0,180,255,.18) 55px 56px, transparent 57px),radial-gradient(circle at 78% 62%, transparent 0 50px, rgba(0,180,255,.22) 51px 52px, transparent 53px 66px, rgba(0,180,255,.18) 67px 68px, transparent 69px),radial-gradient(circle at 56% 22%, transparent 0 32px, rgba(0,180,255,.18) 33px 34px, transparent 35px 48px, rgba(0,180,255,.15) 49px 50px, transparent 51px),linear-gradient(135deg,#031325,#09447a) !important;background-attachment:fixed !important}",
      "html.m3824-theme-signal-red-slate,body.m3824-theme-signal-red-slate{background-color:#120b0b !important;background-image:radial-gradient(circle at 18% 78%, rgba(255,70,40,.34) 0 18%, transparent 30%),radial-gradient(circle at 84% 20%, rgba(255,60,30,.28) 0 12%, transparent 24%),repeating-linear-gradient(90deg, rgba(255,60,30,.16) 0 2px, transparent 2px 48px),linear-gradient(135deg,#0b0b0b,#272222) !important;background-attachment:fixed !important}",
      "@media(max-width:520px){.m3824QuickButton{font-size:0}.m3824QuickButton:after{content:'Quick';font-size:14px}.m3824FitButton{font-size:0}.m3824FitButton:after{content:'Fit';font-size:14px}.m3824ActionGrid{grid-template-columns:1fr}.m3824ActionGrid .wide{grid-column:auto}.m3824DirectionGrid{grid-template-columns:1fr 1fr 1fr}.m3824ThemeGrid{grid-template-columns:1fr}}"
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
        topButtons[i].classList.add("m3824QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m3824FitButton");
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
    var sections = box.querySelectorAll(".m3824Section");
    var buttons = box.querySelectorAll("[data-m3824-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3824-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m3824Subpanel");
    var buttons = section.querySelectorAll("[data-m3824-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3824-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m3824-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m3824-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m3824-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m3824-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m3824Section");
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
      var sections = menu.querySelectorAll(".m3824Section,.m3824Subpanel");
      var buttons = menu.querySelectorAll("[data-m3824-section],[data-m3824-subpanel]");
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
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3824-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var label = button.getAttribute('data-label') || button.textContent.replace(/^✓\s*/, '').trim();
      button.setAttribute('data-label', label);
      var active = button.getAttribute('data-m3824-theme-choice') === current;
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
        html += '<button type="button" class="m3824ThemeButton" data-m3824-theme-choice="' + THEME_OPTIONS[i].key + '" data-label="' + THEME_OPTIONS[i].label + '">' + THEME_OPTIONS[i].label + '</button>';
      }
      return html;
    }

    return [
      '<button type="button" class="wide" data-m3824-subpanel="' + panelId + '" data-label="Canvas Background" aria-expanded="false">Canvas Background  ›</button>',
      '<div id="' + panelId + '" class="m3824Subpanel">',
      '  <div class="m3824ThemePanel">',
      '    <p class="m3824SectionHelp">Pick a canvas background. The theme applies immediately and stays saved on this device.</p>',
      '    <div class="m3824ThemeGroupTitle">Classic Themes</div>',
      '    <div class="m3824ThemeGrid">' + buildThemeButtons('classic') + '</div>',
      '    <div class="m3824ThemeGroupTitle">Bold Themes</div>',
      '    <div class="m3824ThemeGrid">' + buildThemeButtons('bold') + '</div>',
      '    <div class="m3824ThemeGroupTitle">Default</div>',
      '    <div class="m3824ThemeGrid">' + buildThemeButtons('reset') + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function wireThemeButtons(root) {
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3824-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function () {
        chooseTheme(this.getAttribute('data-m3824-theme-choice'));
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
    if (!menu || menu.getAttribute("data-m3824-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3824-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m3824-action="close">Close</button></div>',
      '<p class="m3824MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m3824MenuStack">',
      '  <button type="button" data-m3824-action="info">Drill Log Info</button>',
      '  <button type="button" data-m3824-section="m3824DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3824DrillPages" class="m3824Section">',
      '    <div class="m3824SectionTitle">Page Tools</div>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" class="wide" data-m3824-subpanel="m3824DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3824DrillAdd" class="m3824Subpanel">',
      '        <p class="m3824SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3824DirectionGrid">',
      '          <button type="button" class="m3824Up" data-m3824-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3824Left" data-m3824-add="left">← Add Left</button>',
      '          <button type="button" class="m3824Center m3824Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3824Right" data-m3824-add="right">Add Right →</button>',
      '          <button type="button" class="m3824Down" data-m3824-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3824-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3824-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3824-section="m3824DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3824DrillExport" class="m3824Section">',
      '    <div class="m3824SectionTitle">Export &amp; Share</div>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" class="primary wide" data-m3824-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m3824-action="pdf">Download PDF</button>',
      '      <button type="button" data-m3824-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3824-section="m3824DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3824DrillBackup" class="m3824Section">',
      '    <div class="m3824SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3824SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" data-m3824-action="backup">Download Backup</button>',
      '      <button type="button" data-m3824-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3824-section="m3824DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3824DrillSettings" class="m3824Section">',
      '    <div class="m3824SectionTitle">Settings</div>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" class="wide" data-m3824-action="calibrate">Calibrate Employee / Job</button>',
      buildThemePickerHtml("m3824DrillTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3824-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3824DangerZone"><button type="button" class="danger" data-m3824-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3824Home" data-m3824-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3824-action="close"]', closeMenu);
    wireAction(box, '[data-m3824-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m3824-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3824-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m3824-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m3824-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m3824-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3824-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3824-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m3824-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m3824-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m3824-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3824-action="home"]', function () { runAndClose("returnToSelector"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3824-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3824-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m3824-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3824-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m3824-action="close">Close</button></div>',
      '<p class="m3824MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m3824MenuStack">',
      '  <button type="button" data-m3824-action="info">Shot Info</button>',
      '  <button type="button" data-m3824-section="m3824ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3824ShotPages" class="m3824Section">',
      '    <div class="m3824SectionTitle">Page Tools</div>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" class="wide" data-m3824-subpanel="m3824ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3824ShotAdd" class="m3824Subpanel">',
      '        <p class="m3824SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3824DirectionGrid">',
      '          <button type="button" class="m3824Up" data-m3824-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3824Left" data-m3824-add="left">← Add Left</button>',
      '          <button type="button" class="m3824Center m3824Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3824Right" data-m3824-add="right">Add Right →</button>',
      '          <button type="button" class="m3824Down" data-m3824-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" class="wide" data-m3824-subpanel="m3824ShotShift" data-label="Shift Hole Data" aria-expanded="false">Shift Hole Data  ›</button>',
      '      <div id="m3824ShotShift" class="m3824Subpanel">',
      '        <p class="m3824SectionHelp">Shift every saved hole entry on the current page. The page itself does not move.</p>',
      '        <div class="m3824DirectionGrid">',
      '          <button type="button" class="m3824Up" data-m3824-shift="up">↑ Shift Up</button>',
      '          <button type="button" class="m3824Left" data-m3824-shift="left">← Shift Left</button>',
      '          <button type="button" class="m3824Center" data-m3824-action="undoShift">Undo</button>',
      '          <button type="button" class="m3824Right" data-m3824-shift="right">Shift Right →</button>',
      '          <button type="button" class="m3824Down" data-m3824-shift="down">↓ Shift Down</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3824-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3824-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3824-section="m3824ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3824ShotExport" class="m3824Section">',
      '    <div class="m3824SectionTitle">Export &amp; Share</div>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" class="primary wide" data-m3824-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m3824-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m3824-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m3824-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3824-section="m3824ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3824ShotBackup" class="m3824Section">',
      '    <div class="m3824SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3824SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" data-m3824-action="backup">Download Backup</button>',
      '      <button type="button" data-m3824-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3824-section="m3824ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3824ShotSettings" class="m3824Section">',
      '    <div class="m3824SectionTitle">Settings</div>',
      '    <div class="m3824ActionGrid">',
      '      <button type="button" class="wide" data-m3824-action="calibrate">Field Calibration</button>',
      buildThemePickerHtml("m3824ShotTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3824-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3824DangerZone"><button type="button" class="danger" data-m3824-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3824Home" data-m3824-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3824-action="close"]', closeMenu);
    wireAction(box, '[data-m3824-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m3824-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3824-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m3824-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m3824-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m3824-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3824-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m3824-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3824-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m3824-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m3824-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m3824-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3824-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireAction(box, '[data-m3824-action="undoShift"]', function () { runAndClose("undoLastPageMove"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3824-add]");
    var shiftButtons = box.querySelectorAll("[data-m3824-shift]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3824-add")]);
      });
    }
    for (i = 0; i < shiftButtons.length; i += 1) {
      shiftButtons[i].addEventListener("click", function () {
        runAndClose("moveCurrentPageData", [this.getAttribute("data-m3824-shift")]);
      });
    }
  }

  var DRILL_MULTI_QUICK_FIELDS = [
    { key: "Overburden", label: "Overburden" },
    { key: "Depth", label: "Depth" },
    { key: "Breakthrough", label: "Hole Condition Flag" },
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
    if (byId("mithrilMultiQuickM3824Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilMultiQuickM3824Styles";
    style.textContent = [
      ".m3824QuickIntro{margin:0 0 12px;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m3824QuickRows{display:grid;gap:10px}",
      ".m3824QuickRow{display:grid;grid-template-columns:78px minmax(130px,1.15fr) minmax(110px,.85fr);gap:8px;align-items:end;padding:9px;border:1px solid #bbb;border-radius:10px;background:#f8f8f8}",
      ".m3824QuickRow.inactive{opacity:.68}",
      ".m3824QuickUse{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:6px;border:1px solid #aaa;border-radius:8px;background:#fff;font-size:13px;font-weight:950}",
      ".m3824QuickUse input{width:24px;height:24px;min-height:24px;margin:0;padding:0}",
      ".m3824QuickRow label{min-width:0}",
      ".m3824QuickRow select,.m3824QuickRow input{width:100%;min-height:46px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;background:#fff}",
      ".m3824QuickValueCell{min-width:0}",
      ".m3824QuickActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}",
      ".m3824QuickActions button{min-height:48px}",
      ".m3824QuickBarSummary{min-width:0;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".m3824QuickBarHint{grid-column:1/-1;font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#333}",
      "#quickBar.m3824MultiQuickBar,#singleFillBar.m3824MultiQuickBar{grid-template-columns:minmax(0,1fr) auto auto!important}",
      "#quickModal .box.m3824QuickModalBox{width:min(650px,96vw)}",
      "#quickModal .box.m3824QuickKeypadOpen{padding-bottom:365px!important}",
      "@media(max-width:520px){.m3824QuickRow{grid-template-columns:68px 1fr}.m3824QuickValueCell{grid-column:2}.m3824QuickActions{grid-template-columns:1fr}.m3824QuickBarSummary{font-size:13px}}"
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
        '<div id="' + prefix + 'Row' + i + '" class="m3824QuickRow">',
        '  <label class="m3824QuickUse"><input id="' + prefix + 'Use' + i + '" type="checkbox" /> Use ' + i + '</label>',
        '  <label>Field<select id="' + prefix + 'Field' + i + '">' + options + '</select></label>',
        '  <label class="m3824QuickValueCell">Value',
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
    if (!canvas || canvas.getAttribute("data-m3824-theme-canvas") === "true") return;
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context || context.__mithrilM3824FillRect) return;
    var originalFillRect = context.fillRect.bind(context);
    context.__mithrilM3824FillRect = originalFillRect;
    context.fillRect = function (x, y, width, height) {
      var color = String(context.fillStyle || "").replace(/\s+/g, "").toLowerCase();
      var rect = canvas.getBoundingClientRect();
      var gray = color === "#2e2e2e" || color === "rgb(46,46,46)" || color === "rgba(46,46,46,1)";
      var fullSurface = Math.abs(Number(x || 0)) < 1 && Math.abs(Number(y || 0)) < 1 && Number(width || 0) >= rect.width - 2 && Number(height || 0) >= rect.height - 2;
      if (gray && fullSurface) return;
      return originalFillRect(x, y, width, height);
    };
    canvas.setAttribute("data-m3824-theme-canvas", "true");
  }

  function ensureDrillQuickState() {
    var entries = normalizeMultiQuickEntries(quick, DRILL_MULTI_QUICK_FIELDS, ["Overburden", "Depth", "Breakthrough"]);
    quick.entries = entries;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quick.field = first.field;
    quick.value = first.value;
    return quick;
  }

  function drillQuickPrefix() { return "m3824DrillQuick"; }

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
    var summary = byId("m3824DrillQuickSummary");
    var hint = byId("m3824DrillQuickHint");
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
    if (window.__mithrilM3824DrillPad) return;
    window.__mithrilM3824DrillPad = true;
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
      if (box && byId("quickModal").classList.contains("show")) box.classList.add("m3824QuickKeypadOpen");
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
      if (box) box.classList.remove("m3824QuickKeypadOpen");
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
    if (!modal || !bar || modal.getAttribute("data-m3824-multi-quick") === "drill") return;
    modal.setAttribute("data-m3824-multi-quick", "drill");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m3824QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m3824DrillQuickClose">Close</button></div>',
      '<p class="m3824QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m3824QuickRows">' + buildMultiQuickRows(drillQuickPrefix(), DRILL_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m3824QuickActions">',
      '  <button type="button" class="primary" id="m3824DrillQuickOn">Turn On</button>',
      '  <button type="button" id="m3824DrillQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m3824DrillQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m3824MultiQuickBar");
    bar.innerHTML = [
      '<div id="m3824DrillQuickSummary" class="m3824QuickBarSummary"></div>',
      '<button type="button" id="m3824DrillQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m3824DrillQuickBarOff">Off</button>',
      '<div id="m3824DrillQuickHint" class="m3824QuickBarHint"></div>'
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

    byId("m3824DrillQuickClose").addEventListener("click", function () { window.closeQuickModal(); });
    byId("m3824DrillQuickOn").addEventListener("click", function () { saveDrillMultiQuick(true); });
    byId("m3824DrillQuickOff").addEventListener("click", function () { saveDrillMultiQuick(false); });
    byId("m3824DrillQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hidePad === "function") window.hidePad();
    });
    byId("m3824DrillQuickEdit").addEventListener("click", function () { window.openQuickModal(); });
    byId("m3824DrillQuickBarOff").addEventListener("click", function () { window.turnQuickOff(); });

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

  function shotQuickPrefix() { return "m3824ShotQuick"; }

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
    var summary = byId("m3824ShotQuickSummary");
    var hint = byId("m3824ShotQuickHint");
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
    if (window.__mithrilM3824ShotPad) return;
    window.__mithrilM3824ShotPad = true;
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
        if (box) box.classList.add("m3824QuickKeypadOpen");
      }
    };
    window.hideLoadKeypad = function () {
      if (typeof originalHideLoadKeypad === "function") originalHideLoadKeypad();
      var box = byId("quickModal") && byId("quickModal").querySelector(".box");
      if (box) box.classList.remove("m3824QuickKeypadOpen");
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
    if (!modal || !bar || modal.getAttribute("data-m3824-multi-quick") === "shot") return;
    modal.setAttribute("data-m3824-multi-quick", "shot");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m3824QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m3824ShotQuickClose">Close</button></div>',
      '<p class="m3824QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m3824QuickRows">' + buildMultiQuickRows(shotQuickPrefix(), SHOT_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m3824QuickActions">',
      '  <button type="button" class="primary" id="m3824ShotQuickOn">Turn On</button>',
      '  <button type="button" id="m3824ShotQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m3824ShotQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m3824MultiQuickBar");
    bar.innerHTML = [
      '<div id="m3824ShotQuickSummary" class="m3824QuickBarSummary"></div>',
      '<button type="button" id="m3824ShotQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m3824ShotQuickBarOff">Off</button>',
      '<div id="m3824ShotQuickHint" class="m3824QuickBarHint"></div>'
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

    byId("m3824ShotQuickClose").addEventListener("click", function () { window.closeQuickEntry(); });
    byId("m3824ShotQuickOn").addEventListener("click", function () { saveShotMultiQuick(true); });
    byId("m3824ShotQuickOff").addEventListener("click", function () { saveShotMultiQuick(false); });
    byId("m3824ShotQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hideLoadKeypad === "function") window.hideLoadKeypad();
    });
    byId("m3824ShotQuickEdit").addEventListener("click", function () { window.openQuickEntry(); });
    byId("m3824ShotQuickBarOff").addEventListener("click", function () { window.quickEnabledOff(); });

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

  var GPS_CALLOUT_FONT = "800 16px Arial";
  var GPS_CALLOUT_PAD_X = 8;
  var GPS_CALLOUT_PAD_Y = 6;
  var GPS_CALLOUT_LINE_HEIGHT = 20;
  var gpsMeasureCanvas = null;
  var gpsMeasureContext = null;
  var gpsArrangeMode = false;
  var gpsArrangeType = "";
  var gpsDragState = null;
  var gpsQuickWasEnabled = false;

  function injectGPSStyles() {
    if (byId("mithrilGPSM3824Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilGPSM3824Styles";
    style.textContent = [
      ".m3824GPSDetails{margin-top:12px;border:1px solid #9ab5d6;border-radius:10px;background:#f6faff;overflow:hidden}",
      ".m3824GPSDetails summary{min-height:48px;display:flex;align-items:center;padding:8px 11px;font-size:15px;font-weight:950;cursor:pointer;user-select:none}",
      ".m3824GPSBody{padding:0 10px 10px}",
      ".m3824GPSGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}",
      ".m3824GPSGrid label{min-width:0}",
      ".m3824GPSGrid input{width:100%;min-height:44px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;box-sizing:border-box}",
      ".m3824GPSGrid .wide{grid-column:1/-1}",
      ".m3824GPSActions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:9px}",
      ".m3824GPSActions button{min-height:46px}",
      ".m3824GPSStatus{margin-top:8px;min-height:18px;font-size:12px;font-weight:800;color:#365b82;line-height:1.3}",
      ".m3824GPSMenuGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3824GPSMenuGrid button{min-height:48px}",
      ".m3824GPSMenuGrid .wide{grid-column:1/-1}",
      ".m3824GPSArrangeBar{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:240;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;background:rgba(255,255,255,.98);border:2px solid #8a4fff;border-radius:12px;padding:8px;box-shadow:0 5px 18px rgba(0,0,0,.38)}",
      ".m3824GPSArrangeBar.show{display:grid}",
      ".m3824GPSArrangeHint{font-size:13px;line-height:1.25;font-weight:900;color:#333;min-width:0}",
      ".m3824GPSArrangeBar button{min-height:44px}",
      "@media(max-width:520px){.m3824GPSGrid{grid-template-columns:1fr}.m3824GPSGrid .wide{grid-column:auto}.m3824GPSActions{grid-template-columns:1fr}.m3824GPSMenuGrid{grid-template-columns:1fr}.m3824GPSMenuGrid .wide{grid-column:auto}.m3824GPSArrangeBar{grid-template-columns:1fr 1fr}.m3824GPSArrangeHint{grid-column:1/-1}}"
    ].join("");
    document.head.appendChild(style);
  }

  function gpsStorageKey(type) {
    return type === "drill" ? "mithrilDrillGPSCalloutsVisibleM3817" : "mithrilShotGPSCalloutsVisibleM3817";
  }

  function gpsCalloutsVisible(type) {
    try {
      var saved = localStorage.getItem(gpsStorageKey(type));
      return saved === null ? true : saved !== "false";
    } catch (error) {
      return true;
    }
  }

  function setGPSCalloutsVisible(type, visible) {
    try { localStorage.setItem(gpsStorageKey(type), visible ? "true" : "false"); } catch (error) {}
    updateGPSMenuState(type);
    if (typeof window.draw === "function") window.draw();
  }

  function gpsNumber(value) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw || raw.toLowerCase() === "nan" || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return null;
    var number = Number(raw);
    return Number.isFinite ? (Number.isFinite(number) ? number : null) : (isFinite(number) ? number : null);
  }

  function rowHasGPS(row) {
    if (!row) return false;
    var lat = gpsNumber(row.GPSLatitude);
    var lon = gpsNumber(row.GPSLongitude);
    return lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  function removeFalseGPSArtifacts(type) {
    var changed = false;
    try {
      Object.keys(pagesData || {}).forEach(function (pageKey) {
        var data = pagesData[pageKey] || {};
        Object.keys(data).forEach(function (holeId) {
          var row = data[holeId];
          if (!row) return;
          var rawLat = String(row.GPSLatitude == null ? "" : row.GPSLatitude).trim();
          var rawLon = String(row.GPSLongitude == null ? "" : row.GPSLongitude).trim();
          var lat = gpsNumber(rawLat);
          var lon = gpsNumber(rawLon);
          var invalid = (rawLat || rawLon) && !rowHasGPS(row);
          var falseZero = lat === 0 && lon === 0;
          if (!rawLat && !rawLon) {
            if (row.GPSCalloutX != null || row.GPSCalloutY != null) {
              delete row.GPSCalloutX;
              delete row.GPSCalloutY;
              changed = true;
            }
            return;
          }
          if (invalid || falseZero) {
            delete row.GPSLatitude;
            delete row.GPSLongitude;
            delete row.GPSCalloutX;
            delete row.GPSCalloutY;
            changed = true;
          }
        });
      });
      if (changed) {
        if (type === "drill" && typeof saveState === "function") saveState();
        if (type === "shot" && typeof saveData === "function") saveData();
        if (type === "drill" && typeof invalidatePageCache === "function") invalidatePageCache();
      }
    } catch (error) {
      console.warn("MITHRIL could not clean invalid GPS callouts.", error);
    }
    return changed;
  }

  function gpsPageData(pageNum) {
    try { return pagesData[String(pageNum)] || {}; } catch (error) { return {}; }
  }

  function gpsCurrentRow(type, holeId) {
    try {
      if (type === "drill" && typeof currentData === "function") return currentData()[holeId] || null;
      var data = gpsPageData(currentPage);
      return data[holeId] || null;
    } catch (error) {
      return null;
    }
  }

  function gpsHoleGeometry(type, holeId) {
    try {
      var pos = parseHoleID(holeId);
      if (!pos) return null;
      if (type === "drill") {
        var drillCenter = holeCenter(pos.row, pos.col);
        return { center: drillCenter, rx: 22.5, ry: 20.5 };
      }
      var rect = holeRect(pos.row, pos.col);
      return {
        center: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
        rx: Math.max(8, rect.w / 2 - 3),
        ry: Math.max(8, rect.h / 2 - 3)
      };
    } catch (error) {
      return null;
    }
  }

  function gpsHoleCenter(type, holeId) {
    var geometry = gpsHoleGeometry(type, holeId);
    return geometry ? geometry.center : null;
  }

  // Put the arrowhead on the edge of the hole instead of its center. As the
  // callout moves, the intersection point travels around the hole perimeter.
  function gpsHoleEdgePoint(type, holeId, fromPoint) {
    var geometry = gpsHoleGeometry(type, holeId);
    if (!geometry) return null;
    var center = geometry.center;
    var dx = Number(fromPoint && fromPoint.x) - center.x;
    var dy = Number(fromPoint && fromPoint.y) - center.y;
    if (!isFinite(dx) || !isFinite(dy) || (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001)) {
      return { x: center.x, y: center.y - geometry.ry };
    }
    var denominator = Math.sqrt(
      (dx * dx) / (geometry.rx * geometry.rx) +
      (dy * dy) / (geometry.ry * geometry.ry)
    ) || 1;
    return {
      x: center.x + dx / denominator,
      y: center.y + dy / denominator
    };
  }

  function gpsCoordinateLines(row) {
    var lat = gpsNumber(row && row.GPSLatitude);
    var lon = gpsNumber(row && row.GPSLongitude);
    return [
      lat === null ? "" : lat.toFixed(6),
      lon === null ? "" : lon.toFixed(6)
    ];
  }

  function gpsCalloutMetrics(row) {
    if (!gpsMeasureCanvas) {
      gpsMeasureCanvas = document.createElement("canvas");
      gpsMeasureContext = gpsMeasureCanvas.getContext("2d");
    }
    var lines = gpsCoordinateLines(row);
    var maxWidth = 0;
    if (gpsMeasureContext) {
      gpsMeasureContext.font = GPS_CALLOUT_FONT;
      for (var i = 0; i < lines.length; i += 1) {
        maxWidth = Math.max(maxWidth, gpsMeasureContext.measureText(lines[i]).width);
      }
    } else {
      for (var j = 0; j < lines.length; j += 1) maxWidth = Math.max(maxWidth, lines[j].length * 9);
    }
    return {
      lines: lines,
      w: Math.ceil(maxWidth) + GPS_CALLOUT_PAD_X * 2,
      h: GPS_CALLOUT_PAD_Y * 2 + GPS_CALLOUT_LINE_HEIGHT * lines.length
    };
  }

  function clampGPSBox(x, y, width, height) {
    var w = Math.max(1, Number(width || 1));
    var h = Math.max(1, Number(height || 1));
    var maxX = Math.max(8, Number(IMG_W || 0) - w - 8);
    var maxY = Math.max(8, Number(IMG_H || 0) - h - 8);
    return {
      x: Math.max(8, Math.min(maxX, Number(x || 0))),
      y: Math.max(8, Math.min(maxY, Number(y || 0)))
    };
  }

  function defaultGPSBox(type, holeId, width, height) {
    var center = gpsHoleCenter(type, holeId) || { x: width, y: height };
    var code = 0;
    for (var i = 0; i < String(holeId).length; i += 1) code += String(holeId).charCodeAt(i) * (i + 1);
    var right = code % 2 === 0;
    var below = code % 3 === 0;
    var x = right ? center.x + 58 : center.x - width - 58;
    var y = below ? center.y + 48 : center.y - height - 48;
    return clampGPSBox(x, y, width, height);
  }

  function gpsBoxForRow(type, holeId, row) {
    var metrics = gpsCalloutMetrics(row);
    var x = gpsNumber(row && row.GPSCalloutX);
    var y = gpsNumber(row && row.GPSCalloutY);
    if (x === null || y === null) {
      var initial = defaultGPSBox(type, holeId, metrics.w, metrics.h);
      return { x: initial.x, y: initial.y, w: metrics.w, h: metrics.h, lines: metrics.lines };
    }
    var clamped = clampGPSBox(x, y, metrics.w, metrics.h);
    return { x: clamped.x, y: clamped.y, w: metrics.w, h: metrics.h, lines: metrics.lines };
  }

  function gpsBoxStartPoint(box, target) {
    var x = Math.max(box.x, Math.min(box.x + box.w, target.x));
    var y = Math.max(box.y, Math.min(box.y + box.h, target.y));
    if (target.x >= box.x && target.x <= box.x + box.w && target.y >= box.y && target.y <= box.y + box.h) {
      var left = Math.abs(target.x - box.x);
      var right = Math.abs(target.x - (box.x + box.w));
      var top = Math.abs(target.y - box.y);
      var bottom = Math.abs(target.y - (box.y + box.h));
      var min = Math.min(left, right, top, bottom);
      if (min === left) x = box.x;
      else if (min === right) x = box.x + box.w;
      else if (min === top) y = box.y;
      else y = box.y + box.h;
    }
    return { x: x, y: y };
  }

  function drawGPSArrow(targetCtx, start, end, color) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var length = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / length;
    var uy = dy / length;
    var tipX = end.x - ux * 15;
    var tipY = end.y - uy * 15;
    var wing = 10;
    targetCtx.save();
    targetCtx.strokeStyle = color;
    targetCtx.fillStyle = color;
    targetCtx.lineWidth = 4;
    targetCtx.beginPath();
    targetCtx.moveTo(start.x, start.y);
    targetCtx.lineTo(tipX, tipY);
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.moveTo(end.x, end.y);
    targetCtx.lineTo(tipX - uy * wing, tipY + ux * wing);
    targetCtx.lineTo(tipX + uy * wing, tipY - ux * wing);
    targetCtx.closePath();
    targetCtx.fill();
    targetCtx.restore();
  }

  function drawGPSCallouts(targetCtx, pageNum, type, screenMode) {
    if (!gpsCalloutsVisible(type) && !(gpsArrangeMode && gpsArrangeType === type)) return;
    var data = gpsPageData(pageNum);
    var ids = Object.keys(data).filter(function (id) { return rowHasGPS(data[id]); }).sort();
    for (var i = 0; i < ids.length; i += 1) {
      var holeId = ids[i];
      var row = data[holeId];
      var center = gpsHoleCenter(type, holeId);
      if (!center) continue;
      var box = gpsBoxForRow(type, holeId, row);
      var selected = !!(screenMode && gpsDragState && String(gpsDragState.pageNum) === String(pageNum) && gpsDragState.holeId === holeId);
      var color = selected ? "#8a4fff" : "#1769d2";
      var start = gpsBoxStartPoint(box, center);
      var edge = gpsHoleEdgePoint(type, holeId, start) || center;
      drawGPSArrow(targetCtx, start, edge, color);

      targetCtx.save();
      targetCtx.fillStyle = "rgba(255,255,255,.96)";
      targetCtx.strokeStyle = color;
      targetCtx.lineWidth = selected ? 5 : 3;
      targetCtx.fillRect(box.x, box.y, box.w, box.h);
      targetCtx.strokeRect(box.x, box.y, box.w, box.h);
      targetCtx.fillStyle = "#111";
      targetCtx.textAlign = "left";
      targetCtx.textBaseline = "top";
      targetCtx.font = GPS_CALLOUT_FONT;
      for (var lineIndex = 0; lineIndex < box.lines.length; lineIndex += 1) {
        targetCtx.fillText(
          box.lines[lineIndex],
          box.x + GPS_CALLOUT_PAD_X,
          box.y + GPS_CALLOUT_PAD_Y + lineIndex * GPS_CALLOUT_LINE_HEIGHT
        );
      }
      targetCtx.restore();
    }
  }

  function drawGPSScreen(type) {
    try {
      if (!ctx || !view) return;
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      var nums = typeof getPageNumbers === "function" ? getPageNumbers() : [currentPage];
      for (var i = 0; i < nums.length; i += 1) {
        var pageNum = nums[i];
        var origin = pageOrigin(pageNum);
        ctx.save();
        ctx.translate(origin.x, origin.y);
        drawGPSCallouts(ctx, pageNum, type, true);
        ctx.restore();
      }
      ctx.restore();
    } catch (error) {
      console.warn("MITHRIL GPS callout drawing failed.", error);
    }
  }

  function patchGPSDrawing(type) {
    if (window.__mithrilM3824GPSDrawing) return;
    window.__mithrilM3824GPSDrawing = true;
    var originalDraw = window.draw;
    if (typeof originalDraw === "function") {
      window.draw = function () {
        var result = originalDraw.apply(this, arguments);
        if (type === "drill") {
          (window.requestAnimationFrame || function (callback) { return window.setTimeout(callback, 16); })(function () { drawGPSScreen(type); });
        } else {
          drawGPSScreen(type);
        }
        return result;
      };
    }

    if (type === "drill" && typeof window.renderDrillPageCanvas === "function") {
      var originalRenderDrillPage = window.renderDrillPageCanvas;
      window.renderDrillPageCanvas = function (pageNum) {
        var canvasOut = originalRenderDrillPage.apply(this, arguments);
        if (canvasOut && canvasOut.getContext) drawGPSCallouts(canvasOut.getContext("2d"), pageNum, type, false);
        return canvasOut;
      };
    }

    if (type === "shot" && typeof window.drawPageToContext === "function") {
      var originalDrawPageToContext = window.drawPageToContext;
      window.drawPageToContext = function (targetCtx, pageNum) {
        var result = originalDrawPageToContext.apply(this, arguments);
        drawGPSCallouts(targetCtx, pageNum, type, false);
        return result;
      };
    }
  }

  function gpsEditorPrefix(type) {
    return type === "drill" ? "m3824DrillGPS" : "m3824ShotGPS";
  }

  function gpsEditorValues(type) {
    var prefix = gpsEditorPrefix(type);
    return {
      latitude: String((byId(prefix + "Latitude") || {}).value || "").trim(),
      longitude: String((byId(prefix + "Longitude") || {}).value || "").trim()
    };
  }

  function validateGPSEditor(type) {
    var values = gpsEditorValues(type);
    var details = byId(gpsEditorPrefix(type) + "Details");
    if (!values.latitude && !values.longitude) return true;
    var lat = gpsNumber(values.latitude);
    var lon = gpsNumber(values.longitude);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      if (details) details.open = true;
      alert("Enter a valid latitude and longitude from your external GPS unit, or clear both fields.\n\nLatitude must be between -90 and 90. Longitude must be between -180 and 180.");
      return false;
    }
    return true;
  }

  function addGPSToRow(type, row) {
    var existing = gpsCurrentRow(type, typeof currentHole !== "undefined" ? currentHole : "") || {};
    var values = gpsEditorValues(type);
    var lat = gpsNumber(values.latitude);
    var lon = gpsNumber(values.longitude);
    if (lat === null || lon === null) {
      delete row.GPSLatitude;
      delete row.GPSLongitude;
      delete row.GPSCalloutX;
      delete row.GPSCalloutY;
      return row;
    }
    row.GPSLatitude = lat.toFixed(6);
    row.GPSLongitude = lon.toFixed(6);
    if (gpsNumber(existing.GPSCalloutX) !== null && gpsNumber(existing.GPSCalloutY) !== null) {
      row.GPSCalloutX = existing.GPSCalloutX;
      row.GPSCalloutY = existing.GPSCalloutY;
    }
    return row;
  }

  function fillGPSEditor(type, holeId) {
    var prefix = gpsEditorPrefix(type);
    var row = gpsCurrentRow(type, holeId) || {};
    var latitude = byId(prefix + "Latitude");
    var longitude = byId(prefix + "Longitude");
    var details = byId(prefix + "Details");
    var status = byId(prefix + "Status");
    if (latitude) latitude.value = row.GPSLatitude || "";
    if (longitude) longitude.value = row.GPSLongitude || "";
    if (details) details.open = rowHasGPS(row);
    if (status) status.textContent = rowHasGPS(row) ? "Manual GPS tag saved for Hole " + holeId + "." : "No manual GPS tag saved for this hole.";
  }

  function clearGPSEditor(type) {
    var prefix = gpsEditorPrefix(type);
    ["Latitude", "Longitude"].forEach(function (suffix) {
      var input = byId(prefix + suffix);
      if (input) input.value = "";
    });
    var status = byId(prefix + "Status");
    if (status) status.textContent = "The manual GPS tag will be removed when the hole is saved.";
  }

  function installGPSHoleEditor(type) {
    var modal = byId("holeModal");
    if (!modal || modal.getAttribute("data-m3824-gps-editor") === type) return;
    var box = type === "drill" ? byId("holeBox") : byId("holeEditorBox");
    if (!box) return;
    var buttonGrid = box.querySelector(".buttonGrid");
    if (!buttonGrid) return;
    var prefix = gpsEditorPrefix(type);
    var details = document.createElement("details");
    details.id = prefix + "Details";
    details.className = "m3824GPSDetails";
    details.innerHTML = [
      '<summary>Manual GPS Tag (optional)</summary>',
      '<div class="m3824GPSBody">',
      '  <p class="m3824GPSStatus">Enter coordinates collected with your external GPS equipment. MITHRIL does not request or capture this device\'s location.</p>',
      '  <div class="m3824GPSGrid">',
      '    <label>Latitude<input id="' + prefix + 'Latitude" type="text" inputmode="decimal" autocomplete="off" placeholder="40.123456" /></label>',
      '    <label>Longitude<input id="' + prefix + 'Longitude" type="text" inputmode="decimal" autocomplete="off" placeholder="-76.123456" /></label>',
      '  </div>',
      '  <div class="m3824GPSActions">',
      '    <button type="button" class="danger" id="' + prefix + 'Clear">Clear GPS Tag</button>',
      '  </div>',
      '  <div id="' + prefix + 'Status" class="m3824GPSStatus">No manual GPS tag saved for this hole.</div>',
      '</div>'
    ].join("");
    buttonGrid.parentNode.insertBefore(details, buttonGrid);
    byId(prefix + "Clear").addEventListener("click", function () { clearGPSEditor(type); });

    var originalOpenHole = window.openHole;
    if (typeof originalOpenHole === "function") {
      window.openHole = function (holeId) {
        var result = originalOpenHole.apply(this, arguments);
        fillGPSEditor(type, holeId);
        return result;
      };
    }

    var originalReadHoleForm = window.readHoleForm;
    if (typeof originalReadHoleForm === "function") {
      window.readHoleForm = function () {
        var row = originalReadHoleForm.apply(this, arguments);
        return addGPSToRow(type, row);
      };
    }

    if (type === "drill") {
      var originalSaveHole = window.saveHole;
      if (typeof originalSaveHole === "function") {
        window.saveHole = function () {
          if (!validateGPSEditor(type)) return;
          return originalSaveHole.apply(this, arguments);
        };
      }
    } else {
      var originalShotSaveHole = window.saveHole;
      var originalShotSaveNext = window.saveHoleAndNext;
      if (typeof originalShotSaveHole === "function") {
        window.saveHole = function () {
          if (!validateGPSEditor(type)) return;
          return originalShotSaveHole.apply(this, arguments);
        };
      }
      if (typeof originalShotSaveNext === "function") {
        window.saveHoleAndNext = function () {
          if (!validateGPSEditor(type)) return;
          return originalShotSaveNext.apply(this, arguments);
        };
      }
    }
    modal.setAttribute("data-m3824-gps-editor", type);
  }

  function gpsCountForPage(pageNum) {
    var data = gpsPageData(pageNum);
    return Object.keys(data).filter(function (id) { return rowHasGPS(data[id]); }).length;
  }

  function gpsTotalCount() {
    var total = 0;
    try {
      var nums = typeof getPageNumbers === "function" ? getPageNumbers() : [currentPage];
      for (var i = 0; i < nums.length; i += 1) total += gpsCountForPage(nums[i]);
    } catch (error) {}
    return total;
  }

  function updateGPSMenuState(type) {
    var button = byId(type === "drill" ? "m3824DrillGPSToggle" : "m3824ShotGPSToggle");
    var count = byId(type === "drill" ? "m3824DrillGPSCount" : "m3824ShotGPSCount");
    if (button) button.textContent = gpsCalloutsVisible(type) ? "Hide GPS Callouts" : "Show GPS Callouts";
    if (count) count.textContent = gpsCountForPage(currentPage) + " GPS tag" + (gpsCountForPage(currentPage) === 1 ? "" : "s") + " on the current page.";
  }

  function saveGPSLayout(type) {
    try {
      if (type === "drill" && typeof saveState === "function") saveState();
      if (type === "shot" && typeof saveData === "function") saveData();
      if (typeof markDirty === "function") markDirty();
    } catch (error) {}
  }

  function resetGPSPositions(type) {
    var count = gpsCountForPage(currentPage);
    if (!count) {
      alert("The current page has no GPS callouts to reset.");
      return;
    }
    if (!confirm("Reset all GPS callout positions on Page " + currentPage + "?")) return;
    var data = gpsPageData(currentPage);
    Object.keys(data).forEach(function (id) {
      if (!rowHasGPS(data[id])) return;
      delete data[id].GPSCalloutX;
      delete data[id].GPSCalloutY;
    });
    saveGPSLayout(type);
    if (typeof window.invalidatePageCache === "function" && type === "drill") window.invalidatePageCache(currentPage);
    if (typeof window.draw === "function") window.draw();
  }

  function ensureGPSArrangeBar(type) {
    var bar = byId("m3824GPSArrangeBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "m3824GPSArrangeBar";
      bar.className = "m3824GPSArrangeBar";
      bar.innerHTML = [
        '<div id="m3824GPSArrangeHint" class="m3824GPSArrangeHint">Drag GPS boxes to move them. The arrows follow automatically.</div>',
        '<button type="button" id="m3824GPSArrangeReset">Reset Page</button>',
        '<button type="button" class="primary" id="m3824GPSArrangeDone">Done</button>'
      ].join("");
      document.body.appendChild(bar);
      byId("m3824GPSArrangeDone").addEventListener("click", function () { finishGPSArrange(); });
      byId("m3824GPSArrangeReset").addEventListener("click", function () { resetGPSPositions(gpsArrangeType || type); });
    }
    return bar;
  }

  function pauseQuickForGPSArrange(type) {
    gpsQuickWasEnabled = false;
    try {
      if (type === "drill" && typeof quick !== "undefined") {
        gpsQuickWasEnabled = !!quick.enabled;
        quick.enabled = false;
        if (typeof saveState === "function") saveState();
        if (typeof updateQuickBar === "function") updateQuickBar();
      } else if (type === "shot" && typeof quickEntry !== "undefined") {
        gpsQuickWasEnabled = !!quickEntry.enabled;
        quickEntry.enabled = false;
        localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
        if (typeof updateSingleFillBar === "function") updateSingleFillBar();
      }
    } catch (error) {}
  }

  function resumeQuickAfterGPSArrange(type) {
    try {
      if (type === "drill" && typeof quick !== "undefined") {
        quick.enabled = !!gpsQuickWasEnabled;
        if (typeof saveState === "function") saveState();
        if (typeof updateQuickBar === "function") updateQuickBar();
      } else if (type === "shot" && typeof quickEntry !== "undefined") {
        quickEntry.enabled = !!gpsQuickWasEnabled;
        localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
        if (typeof updateSingleFillBar === "function") updateSingleFillBar();
      }
    } catch (error) {}
    gpsQuickWasEnabled = false;
  }

  function startGPSArrange(type) {
    if (!gpsTotalCount()) {
      alert("Manually tag at least one hole with coordinates before arranging callouts.");
      return;
    }
    setGPSCalloutsVisible(type, true);
    gpsArrangeMode = true;
    gpsArrangeType = type;
    gpsDragState = null;
    pauseQuickForGPSArrange(type);
    closeMenu();
    var bar = ensureGPSArrangeBar(type);
    bar.classList.add("show");
    byId("m3824GPSArrangeHint").textContent = "Drag GPS boxes on any visible page. Touching a box automatically activates its page.";
    if (typeof window.draw === "function") window.draw();
  }

  function finishGPSArrange() {
    var type = gpsArrangeType;
    gpsArrangeMode = false;
    gpsArrangeType = "";
    gpsDragState = null;
    var bar = byId("m3824GPSArrangeBar");
    if (bar) bar.classList.remove("show");
    if (type) {
      saveGPSLayout(type);
      resumeQuickAfterGPSArrange(type);
    }
    if (typeof window.draw === "function") window.draw();
  }

  function buildGPSMenuHtml(type) {
    var prefix = type === "drill" ? "m3824DrillGPS" : "m3824ShotGPS";
    return [
      '<button type="button" class="wide" data-m3824-subpanel="' + prefix + 'Panel" data-label="GPS Callouts" aria-expanded="false">GPS Callouts  ›</button>',
      '<div id="' + prefix + 'Panel" class="m3824Subpanel">',
      '  <p class="m3824SectionHelp">Coordinates entered manually are stored on each hole. Visible callouts and arrows are also included in PDF exports.</p>',
      '  <div id="' + prefix + 'Count" class="m3824GPSStatus"></div>',
      '  <div class="m3824GPSMenuGrid">',
      '    <button type="button" class="wide" id="' + prefix + 'Toggle"></button>',
      '    <button type="button" id="' + prefix + 'Arrange">Arrange Callouts</button>',
      '    <button type="button" id="' + prefix + 'Reset">Reset Current Page</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function installGPSMenuTools(type) {
    var settings = byId(type === "drill" ? "m3824DrillSettings" : "m3824ShotSettings");
    if (!settings || settings.getAttribute("data-m3824-gps-menu") === "true") return;
    var grid = settings.querySelector(".m3824ActionGrid");
    if (!grid) return;
    var holder = document.createElement("div");
    holder.style.display = "contents";
    holder.innerHTML = buildGPSMenuHtml(type);
    var updateButton = grid.querySelector("#mithrilUpdateMenuButton");
    while (holder.firstChild) grid.insertBefore(holder.firstChild, updateButton || null);
    var prefix = type === "drill" ? "m3824DrillGPS" : "m3824ShotGPS";
    byId(prefix + "Toggle").addEventListener("click", function () { setGPSCalloutsVisible(type, !gpsCalloutsVisible(type)); });
    byId(prefix + "Arrange").addEventListener("click", function () { startGPSArrange(type); });
    byId(prefix + "Reset").addEventListener("click", function () { resetGPSPositions(type); });
    settings.setAttribute("data-m3824-gps-menu", "true");
    updateGPSMenuState(type);
    if (!window.__mithrilM3824GPSMenuOpenWrapped && typeof window.openMenu === "function") {
      var originalOpenMenuForGPS = window.openMenu;
      window.openMenu = function () {
        updateGPSMenuState(type);
        return originalOpenMenuForGPS.apply(this, arguments);
      };
      window.__mithrilM3824GPSMenuOpenWrapped = true;
    }
  }

  function gpsScreenPoint(event, canvas) {
    return preciseCanvasPoint(event, canvas);
  }

  function gpsLocalPoint(screenPoint, pageNum) {
    var world = screenToWorld(screenPoint.x, screenPoint.y);
    var origin = pageOrigin(pageNum);
    return { x: world.x - origin.x, y: world.y - origin.y };
  }

  function gpsPageAtScreenPoint(type, screenPoint) {
    var world = screenToWorld(screenPoint.x, screenPoint.y);
    try {
      if (type === "drill" && typeof pageAtWorldPoint === "function") {
        return pageAtWorldPoint(world.x, world.y);
      }
      if (type === "shot" && typeof getPageAtWorldPoint === "function") {
        return getPageAtWorldPoint(world.x, world.y);
      }
      var nums = typeof getPageNumbers === "function" ? getPageNumbers() : [currentPage];
      for (var i = 0; i < nums.length; i += 1) {
        var pageNum = nums[i];
        var origin = pageOrigin(pageNum);
        if (world.x >= origin.x && world.x <= origin.x + IMG_W &&
            world.y >= origin.y && world.y <= origin.y + IMG_H) return pageNum;
      }
    } catch (error) {}
    return null;
  }

  function activateGPSPage(type, pageNum) {
    pageNum = Number(pageNum);
    if (!pageNum || Number(currentPage) === pageNum) return;
    try {
      if (type === "drill" && typeof switchPage === "function") {
        switchPage(pageNum, false);
      } else if (type === "shot" && typeof switchToPage === "function") {
        switchToPage(pageNum);
      } else {
        currentPage = pageNum;
        if (typeof refreshPageSelect === "function") refreshPageSelect();
        if (typeof window.draw === "function") window.draw();
      }
      var hint = byId("m3824GPSArrangeHint");
      if (hint) hint.textContent = "Page " + pageNum + " active — drag GPS boxes on any visible page.";
      updateGPSMenuState(type);
    } catch (error) {
      console.warn("MITHRIL could not activate the GPS callout page.", error);
    }
  }

  function hitGPSBox(type, pageNum, localPoint) {
    var data = gpsPageData(pageNum);
    var ids = Object.keys(data).filter(function (id) { return rowHasGPS(data[id]); }).sort().reverse();
    for (var i = 0; i < ids.length; i += 1) {
      var box = gpsBoxForRow(type, ids[i], data[ids[i]]);
      var currentScale = 1;
      try { currentScale = Math.max(0.1, Number(view && view.scale || 1)); } catch (error) {}
      var hitPad = Math.max(8, 12 / currentScale);
      if (localPoint.x >= box.x - hitPad && localPoint.x <= box.x + box.w + hitPad && localPoint.y >= box.y - hitPad && localPoint.y <= box.y + box.h + hitPad) {
        return { holeId: ids[i], box: box };
      }
    }
    return null;
  }

  function stopGPSDragEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }

  function beginGPSDrag(type, canvas, eventPoint, pointerId) {
    if (!gpsArrangeMode || gpsArrangeType !== type) return false;
    var pageNum = gpsPageAtScreenPoint(type, eventPoint);
    if (!pageNum) return false;
    var local = gpsLocalPoint(eventPoint, pageNum);
    var hit = hitGPSBox(type, pageNum, local);
    if (!hit) return false;
    activateGPSPage(type, pageNum);
    gpsDragState = {
      type: type,
      pageNum: Number(pageNum),
      holeId: hit.holeId,
      pointerId: pointerId,
      offsetX: local.x - hit.box.x,
      offsetY: local.y - hit.box.y
    };
    return true;
  }

  function moveGPSDrag(eventPoint) {
    if (!gpsDragState) return;
    var local = gpsLocalPoint(eventPoint, gpsDragState.pageNum);
    var data = gpsPageData(gpsDragState.pageNum);
    var row = data[gpsDragState.holeId];
    if (!row) return;
    var metrics = gpsCalloutMetrics(row);
    var point = clampGPSBox(local.x - gpsDragState.offsetX, local.y - gpsDragState.offsetY, metrics.w, metrics.h);
    row.GPSCalloutX = Math.round(point.x * 10) / 10;
    row.GPSCalloutY = Math.round(point.y * 10) / 10;
    if (typeof window.draw === "function") window.draw();
  }

  function endGPSDrag() {
    if (!gpsDragState) return;
    var type = gpsDragState.type;
    gpsDragState = null;
    saveGPSLayout(type);
    updateGPSMenuState(type);
    if (typeof window.draw === "function") window.draw();
  }

  function installGPSDragging(canvas, type) {
    if (!canvas || canvas.getAttribute("data-m3824-gps-drag") === "true") return;
    canvas.addEventListener("pointerdown", function (event) {
      var point = gpsScreenPoint(event, canvas);
      if (!beginGPSDrag(type, canvas, point, event.pointerId)) return;
      try { canvas.setPointerCapture(event.pointerId); } catch (error) {}
      stopGPSDragEvent(event);
    }, true);
    canvas.addEventListener("pointermove", function (event) {
      if (!gpsDragState || gpsDragState.pointerId !== event.pointerId) return;
      moveGPSDrag(gpsScreenPoint(event, canvas));
      stopGPSDragEvent(event);
    }, true);
    ["pointerup", "pointercancel"].forEach(function (name) {
      canvas.addEventListener(name, function (event) {
        if (!gpsDragState || gpsDragState.pointerId !== event.pointerId) return;
        stopGPSDragEvent(event);
        endGPSDrag();
      }, true);
    });

    canvas.addEventListener("touchstart", function (event) {
      if (window.PointerEvent || !event.touches || event.touches.length !== 1) return;
      var touch = event.touches[0];
      var point = gpsScreenPoint(touch, canvas);
      if (!beginGPSDrag(type, canvas, point, "touch")) return;
      stopGPSDragEvent(event);
    }, { capture: true, passive: false });
    canvas.addEventListener("touchmove", function (event) {
      if (window.PointerEvent || !gpsDragState || gpsDragState.pointerId !== "touch" || !event.touches || !event.touches.length) return;
      moveGPSDrag(gpsScreenPoint(event.touches[0], canvas));
      stopGPSDragEvent(event);
    }, { capture: true, passive: false });
    ["touchend", "touchcancel"].forEach(function (name) {
      canvas.addEventListener(name, function (event) {
        if (window.PointerEvent || !gpsDragState || gpsDragState.pointerId !== "touch") return;
        stopGPSDragEvent(event);
        endGPSDrag();
      }, { capture: true, passive: false });
    });
    canvas.setAttribute("data-m3824-gps-drag", "true");
  }

  function patchGPSCSV(type) {
    if (type === "drill" && typeof window.exportCSV === "function") {
      window.exportCSV = function () {
        var rows = [["Page","HoleID","Column","Row","Overburden","Depth","Breakthrough","DirtHole","BadHole","Wet","Notes","GPSLatitude","GPSLongitude","Timestamp"]];
        Object.keys(pagesData).map(Number).sort(function (a,b) { return a-b; }).forEach(function (pageNum) {
          Object.keys(pagesData[String(pageNum)] || {}).sort(function (a,b) {
            var pa = parseHoleID(a), pb = parseHoleID(b);
            return pa.row - pb.row || pa.col - pb.col;
          }).forEach(function (id) {
            var d = pagesData[String(pageNum)][id] || {};
            var pos = parseHoleID(id);
            rows.push([pageNum,id,colLetter(pos.col),pos.row+1,d.Overburden||"",d.Depth||"",flagYes(d.Breakthrough)?"Yes":"No",flagYes(d.DirtHole)?"Yes":"No",flagYes(d.BadHole)?"Yes":"No",flagYes(d.Wet)?"Yes":"No",d.Notes||"",d.GPSLatitude||"",d.GPSLongitude||"",d.Timestamp||""]);
          });
        });
        var csv = rows.map(function (row) { return row.map(function (value) { return '"' + String(value == null ? "" : value).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
        downloadBlob(csv, exportBaseName() + ".csv", "text/csv");
      };
    }

    if (type === "shot" && typeof window.getCSVText === "function") {
      window.getCSVText = function () {
        if (typeof saveData === "function") saveData();
        var headers = ["PageNumber","FieldDate","ShotID","JobName","Blaster","HoleID","Depth","Stemming","PrimaryLoad","SecondaryLoad","Overburden","Timing","Wet","BadHole","DirtHole","Notes","EnteredBy","GPSLatitude","GPSLongitude","Timestamp"];
        var csv = headers.join(",") + "\n";
        getPageNumbers().forEach(function (pageNum) {
          var pageData = pagesData[String(pageNum)] || {};
          Object.keys(pageData).sort(function (a,b) {
            var pa = parseHoleID(a), pb = parseHoleID(b);
            return pa.row - pb.row || pa.col - pb.col;
          }).forEach(function (id) {
            var row = normalizeHoleEntry(Object.assign({}, pageData[id], { PageNumber: pageNum, HoleID: id }));
            row.FieldDate = formatShotDate(headerData.FieldDate) || row.FieldDate || "";
            row.ShotID = headerData.ShotID || row.ShotID || "";
            row.JobName = headerData.JobName || row.JobName || "";
            row.Blaster = headerData.Blaster || row.Blaster || "";
            row.EnteredBy = headerData.EnteredByDefault || row.EnteredBy || "";
            csv += headers.map(function (header) { return csvEscape(row[header]); }).join(",") + "\n";
          });
        });
        return csv;
      };
    }
  }

  function installGPSFeature(type, canvas) {
    injectGPSStyles();
    removeFalseGPSArtifacts(type);
    installGPSHoleEditor(type);
    installGPSMenuTools(type);
    patchGPSDrawing(type);
    installGPSDragging(canvas, type);
    patchGPSCSV(type);
    updateGPSMenuState(type);
    if (typeof window.draw === "function") window.draw();
  }



  var HOLE_CONDITION_TYPES = [
    { key: "Breakthrough", label: "Breakthrough" },
    { key: "Broken Rock", label: "Broken Rock" },
    { key: "Mud/Clay Seam", label: "Mud / Clay Seam" },
    { key: "Void", label: "Void" },
    { key: "Water", label: "Water" },
    { key: "Other", label: "Other" }
  ];
  var conditionDraft = [];
  var conditionLegacyFlag = false;
  var conditionModalSnapshot = [];
  var conditionModalOriginalChecked = false;

  function conditionClone(entries) {
    try { return JSON.parse(JSON.stringify(entries || [])); }
    catch (error) { return []; }
  }

  function conditionNumber(value) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return null;
    var number = Number(raw);
    return isFinite(number) ? number : null;
  }

  function conditionFormatNumber(value) {
    var number = conditionNumber(value);
    if (number === null) return "";
    return String(Math.round(number * 100) / 100);
  }

  function conditionTypeLabel(entry) {
    if (!entry) return "Condition";
    if (entry.type === "Other") return String(entry.other || "Other").trim() || "Other";
    for (var i = 0; i < HOLE_CONDITION_TYPES.length; i += 1) {
      if (HOLE_CONDITION_TYPES[i].key === entry.type) return HOLE_CONDITION_TYPES[i].label;
    }
    return String(entry.type || "Condition");
  }

  function normalizeHoleConditions(value) {
    var source = value;
    if (typeof source === "string") {
      try { source = JSON.parse(source); } catch (error) { source = []; }
    }
    if (!Array.isArray(source)) return [];
    var result = [];
    for (var i = 0; i < source.length; i += 1) {
      var raw = source[i] || {};
      var type = String(raw.type || "Breakthrough");
      var allowed = false;
      for (var j = 0; j < HOLE_CONDITION_TYPES.length; j += 1) {
        if (HOLE_CONDITION_TYPES[j].key === type) allowed = true;
      }
      if (!allowed) type = "Other";
      result.push({
        type: type,
        other: String(raw.other || (allowed ? "" : raw.type || "")),
        start: conditionFormatNumber(raw.start),
        end: conditionFormatNumber(raw.end),
        toBottom: raw.toBottom === true || String(raw.toBottom || "").toLowerCase() === "true"
      });
    }
    result.sort(function (a, b) {
      var av = conditionNumber(a.start), bv = conditionNumber(b.start);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    });
    return result;
  }

  function holeConditionHasDetails(row) {
    return normalizeHoleConditions(row && row.HoleConditions).length > 0;
  }

  function currentConditionDepth() {
    var input = byId("depth");
    return conditionNumber(input ? input.value : "");
  }

  function holeConditionSummaryFromEntries(entries, depthValue) {
    entries = normalizeHoleConditions(entries);
    if (!entries.length) return "";
    var depth = conditionNumber(depthValue);
    var parts = [];
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      var start = conditionNumber(entry.start);
      var end = entry.toBottom ? depth : conditionNumber(entry.end);
      var label = conditionTypeLabel(entry);
      if (start === null) continue;
      if (end !== null && end > start) parts.push(label + " " + conditionFormatNumber(start) + "-" + conditionFormatNumber(end) + " ft");
      else if (entry.toBottom) parts.push(label + " from " + conditionFormatNumber(start) + " ft to bottom");
      else parts.push(label + " at " + conditionFormatNumber(start) + " ft");
    }
    return parts.length ? "Hole conditions: " + parts.join("; ") + "." : "";
  }

  function holeConditionSummary(row) {
    return holeConditionSummaryFromEntries(row && row.HoleConditions, row && row.Depth);
  }

  function conditionOptionsHtml(selected) {
    var html = "";
    for (var i = 0; i < HOLE_CONDITION_TYPES.length; i += 1) {
      var item = HOLE_CONDITION_TYPES[i];
      html += '<option value="' + item.key + '"' + (item.key === selected ? ' selected' : '') + '>' + item.label + '</option>';
    }
    return html;
  }

  function injectHoleConditionStyles() {
    if (byId("mithrilHoleConditionsM3824Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilHoleConditionsM3824Styles";
    style.textContent = [
      ".m3824ConditionEditButton{grid-column:1/-1;min-height:46px;background:#fff8c9;border-color:#c8a600;color:#3d3300}",
      ".m3824ConditionEditButton.hidden{display:none}",
      "#m3824ConditionModal{z-index:260}",
      "#m3824ConditionModal .box{width:min(720px,97vw)}",
      ".m3824ConditionIntro{margin:0 0 10px;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m3824ConditionRows{display:grid;gap:10px}",
      ".m3824ConditionRow{position:relative;display:grid;grid-template-columns:minmax(145px,1.25fr) minmax(100px,.7fr) minmax(120px,.85fr);gap:8px;padding:10px;border:1px solid #c8ad44;border-radius:11px;background:#fffbea}",
      ".m3824ConditionRow label{min-width:0}",
      ".m3824ConditionRow select,.m3824ConditionRow input[type=number],.m3824ConditionRow input[type=text]{width:100%;min-height:44px;padding:8px;border:1px solid #999;border-radius:8px;background:#fff;font-size:17px}",
      ".m3824ConditionBottom{grid-column:1/3;display:flex;align-items:center;gap:9px;min-height:44px;padding:7px 9px;border:1px solid #aaa;border-radius:8px;background:#fff;font-size:14px;font-weight:900}",
      ".m3824ConditionBottom input{width:25px;height:25px;min-height:25px;margin:0}",
      ".m3824ConditionRemove{align-self:end;min-height:44px;background:#fff1f1;border-color:#c66}",
      ".m3824ConditionOther{grid-column:1/-1}",
      ".m3824ConditionOther.hidden{display:none}",
      ".m3824ConditionTools{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}",
      ".m3824ConditionPreview{margin-top:10px;padding:10px;border:1px solid #9f8a2d;border-radius:9px;background:#fffdf3;font-size:14px;font-weight:850;line-height:1.4;color:#342d0b}",
      ".m3824ConditionActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}",
      ".m3824ConditionActions button{min-height:48px}",
      "@media(max-width:620px){.m3824ConditionRow{grid-template-columns:1fr 1fr}.m3824ConditionRow>label:first-child{grid-column:1/-1}.m3824ConditionBottom{grid-column:1/-1}.m3824ConditionRemove{grid-column:1/-1}.m3824ConditionActions{grid-template-columns:1fr}.m3824ConditionTools{grid-template-columns:1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureHoleConditionModal() {
    var modal = byId("m3824ConditionModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m3824ConditionModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span id="m3824ConditionTitle">Hole Conditions</span><button type="button" id="m3824ConditionClose">Close</button></div>',
      '  <p class="m3824ConditionIntro">Record where a loading condition begins and where competent rock resumes. These intervals are informational and never reduce Total Rock.</p>',
      '  <div id="m3824ConditionRows" class="m3824ConditionRows"></div>',
      '  <div class="m3824ConditionTools"><button type="button" id="m3824ConditionAdd">+ Add another condition</button><button type="button" id="m3824ConditionClear" class="danger">Clear all</button></div>',
      '  <div id="m3824ConditionPreview" class="m3824ConditionPreview">No condition intervals entered.</div>',
      '  <div class="m3824ConditionActions"><button type="button" class="primary" id="m3824ConditionSave">Save Conditions</button><button type="button" id="m3824ConditionCancel">Cancel</button><button type="button" id="m3824ConditionDoneHole">Save Conditions + Hole</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);

    byId("m3824ConditionClose").addEventListener("click", cancelHoleConditionModal);
    byId("m3824ConditionCancel").addEventListener("click", cancelHoleConditionModal);
    byId("m3824ConditionAdd").addEventListener("click", function () {
      if (conditionDraft.length >= 8) { alert("A maximum of eight condition intervals can be entered for one hole."); return; }
      conditionDraft.push({ type: "Breakthrough", other: "", start: "", end: "", toBottom: true });
      renderHoleConditionRows();
    });
    byId("m3824ConditionClear").addEventListener("click", function () {
      conditionDraft = [];
      renderHoleConditionRows();
    });
    byId("m3824ConditionSave").addEventListener("click", function () { saveHoleConditionModal(false); });
    byId("m3824ConditionDoneHole").addEventListener("click", function () { if (saveHoleConditionModal(false)) window.saveHole(false); });
    byId("m3824ConditionRows").addEventListener("input", readConditionRowsIntoDraft);
    byId("m3824ConditionRows").addEventListener("change", function (event) {
      readConditionRowsIntoDraft();
      if (event.target && event.target.classList.contains("m3824ConditionType")) renderHoleConditionRows();
      else updateHoleConditionPreview();
    });
    byId("m3824ConditionRows").addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-condition-remove]") : null;
      if (!button) return;
      event.preventDefault();
      readConditionRowsIntoDraft();
      var index = Number(button.getAttribute("data-condition-remove"));
      if (index >= 0 && index < conditionDraft.length) conditionDraft.splice(index, 1);
      renderHoleConditionRows();
    });
    return modal;
  }

  function readConditionRowsIntoDraft() {
    var rows = document.querySelectorAll("#m3824ConditionRows .m3824ConditionRow");
    var next = [];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var type = row.querySelector(".m3824ConditionType");
      var other = row.querySelector(".m3824ConditionOtherInput");
      var start = row.querySelector(".m3824ConditionStart");
      var end = row.querySelector(".m3824ConditionEnd");
      var bottom = row.querySelector(".m3824ConditionToBottom");
      next.push({
        type: type ? type.value : "Breakthrough",
        other: other ? other.value : "",
        start: start ? start.value : "",
        end: end ? end.value : "",
        toBottom: !!(bottom && bottom.checked)
      });
    }
    conditionDraft = next;
    updateHoleConditionPreview();
    updateConditionEditorControls();
  }

  function renderHoleConditionRows() {
    var container = byId("m3824ConditionRows");
    if (!container) return;
    var html = "";
    for (var i = 0; i < conditionDraft.length; i += 1) {
      var entry = conditionDraft[i];
      var otherClass = entry.type === "Other" ? "m3824ConditionOther" : "m3824ConditionOther hidden";
      html += [
        '<div class="m3824ConditionRow" data-condition-index="' + i + '">',
        '  <label>Condition<select class="m3824ConditionType">' + conditionOptionsHtml(entry.type) + '</select></label>',
        '  <label>Starts at (ft)<input class="m3824ConditionStart" type="number" inputmode="decimal" step="0.1" min="0" value="' + String(entry.start || "") + '" /></label>',
        '  <label>Competent rock resumes (ft)<input class="m3824ConditionEnd" type="number" inputmode="decimal" step="0.1" min="0" value="' + String(entry.end || "") + '"' + (entry.toBottom ? ' disabled' : '') + ' /></label>',
        '  <label class="m3824ConditionBottom"><input class="m3824ConditionToBottom" type="checkbox"' + (entry.toBottom ? ' checked' : '') + ' /> Continues to bottom</label>',
        '  <button type="button" class="m3824ConditionRemove" data-condition-remove="' + i + '">Remove</button>',
        '  <label class="' + otherClass + '">Other condition name<input class="m3824ConditionOtherInput" type="text" value="' + String(entry.other || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;") + '" /></label>',
        '</div>'
      ].join("");
    }
    if (!conditionDraft.length) html = '<div class="m3824ConditionPreview">No condition intervals. Tap “Add another condition” to begin.</div>';
    container.innerHTML = html;
    updateHoleConditionPreview();
    updateConditionEditorControls();
  }

  function updateConditionEditorControls() {
    var rows = document.querySelectorAll("#m3824ConditionRows .m3824ConditionRow");
    for (var i = 0; i < rows.length; i += 1) {
      var bottom = rows[i].querySelector(".m3824ConditionToBottom");
      var end = rows[i].querySelector(".m3824ConditionEnd");
      var type = rows[i].querySelector(".m3824ConditionType");
      var otherWrap = rows[i].querySelector(".m3824ConditionOther");
      if (end && bottom) {
        end.disabled = bottom.checked;
        if (bottom.checked) end.value = "";
      }
      if (otherWrap && type) otherWrap.classList.toggle("hidden", type.value !== "Other");
    }
  }

  function updateHoleConditionPreview() {
    var preview = byId("m3824ConditionPreview");
    if (!preview) return;
    var summary = holeConditionSummaryFromEntries(conditionDraft, currentConditionDepth());
    preview.textContent = summary || "No complete condition intervals entered yet.";
  }

  function validateHoleConditionDraft() {
    var depth = currentConditionDepth();
    for (var i = 0; i < conditionDraft.length; i += 1) {
      var entry = conditionDraft[i];
      var start = conditionNumber(entry.start);
      var end = conditionNumber(entry.end);
      if (entry.type === "Other" && !String(entry.other || "").trim()) {
        alert("Enter a name for condition " + (i + 1) + "."); return false;
      }
      if (start === null || start < 0) {
        alert("Enter the starting depth for condition " + (i + 1) + "."); return false;
      }
      if (depth !== null && start >= depth) {
        alert("Condition " + (i + 1) + " must start above the total hole depth of " + conditionFormatNumber(depth) + " ft."); return false;
      }
      if (!entry.toBottom) {
        if (end === null || end <= start) {
          alert("Enter where competent rock resumes for condition " + (i + 1) + ". It must be deeper than the starting depth."); return false;
        }
        if (depth !== null && end > depth) {
          alert("Condition " + (i + 1) + " cannot end deeper than the total hole depth of " + conditionFormatNumber(depth) + " ft."); return false;
        }
      }
    }
    return true;
  }

  function openHoleConditionModal(createDefault) {
    ensureHoleConditionModal();
    conditionModalSnapshot = conditionClone(conditionDraft);
    var checkbox = byId("breakthrough");
    conditionModalOriginalChecked = !!(checkbox && checkbox.checked);
    if (createDefault && !conditionDraft.length) conditionDraft = [{ type: "Breakthrough", other: "", start: "", end: "", toBottom: true }];
    byId("m3824ConditionTitle").textContent = "Hole Conditions — " + (typeof currentHole !== "undefined" ? currentHole : "Hole");
    renderHoleConditionRows();
    byId("m3824ConditionModal").classList.add("show");
    window.setTimeout(function () {
      var input = document.querySelector("#m3824ConditionRows .m3824ConditionStart");
      if (input) input.focus();
    }, 80);
  }

  function closeHoleConditionModal() {
    var modal = byId("m3824ConditionModal");
    if (modal) modal.classList.remove("show");
  }

  function cancelHoleConditionModal() {
    conditionDraft = conditionClone(conditionModalSnapshot);
    var checkbox = byId("breakthrough");
    if (checkbox) checkbox.checked = conditionModalOriginalChecked;
    closeHoleConditionModal();
    updateHoleConditionButton();
  }

  function saveHoleConditionModal(closeOnly) {
    readConditionRowsIntoDraft();
    if (!conditionDraft.length) {
      var emptyCheckbox = byId("breakthrough");
      if (emptyCheckbox) emptyCheckbox.checked = false;
      conditionLegacyFlag = false;
      closeHoleConditionModal();
      updateHoleConditionButton();
      return true;
    }
    if (!validateHoleConditionDraft()) return false;
    conditionDraft = normalizeHoleConditions(conditionDraft);
    var checkbox = byId("breakthrough");
    if (checkbox) checkbox.checked = true;
    conditionLegacyFlag = false;
    closeHoleConditionModal();
    updateHoleConditionButton();
    return true;
  }

  function updateHoleConditionButton() {
    var button = byId("m3824EditHoleConditions");
    var checkbox = byId("breakthrough");
    if (!button || !checkbox) return;
    var count = conditionDraft.length;
    button.classList.toggle("hidden", !checkbox.checked && !count);
    button.textContent = count ? "Edit Hole Conditions (" + count + ")" : "Add Hole Condition Details";
  }

  function installDrillHoleConditions() {
    if (window.__mithrilM3824HoleConditions) return;
    var checkbox = byId("breakthrough");
    var holeBox = byId("holeBox");
    if (!checkbox || !holeBox) return;
    window.__mithrilM3824HoleConditions = true;
    injectHoleConditionStyles();
    ensureHoleConditionModal();

    var label = checkbox.closest ? checkbox.closest("label") : null;
    if (label) {
      while (checkbox.nextSibling) label.removeChild(checkbox.nextSibling);
      label.appendChild(document.createTextNode(" Hole Condition"));
    }

    var formGrid = holeBox.querySelector(".formGrid");
    var notesLabel = byId("notes") && byId("notes").closest ? byId("notes").closest("label") : null;
    var edit = document.createElement("button");
    edit.id = "m3824EditHoleConditions";
    edit.type = "button";
    edit.className = "m3824ConditionEditButton hidden";
    edit.textContent = "Add Hole Condition Details";
    edit.addEventListener("click", function () { openHoleConditionModal(!conditionDraft.length); });
    if (formGrid) formGrid.insertBefore(edit, notesLabel || null);

    checkbox.addEventListener("change", function () {
      if (checkbox.checked) {
        conditionLegacyFlag = false;
        openHoleConditionModal(!conditionDraft.length);
      } else {
        if (conditionDraft.length && !confirm("Clear the saved hole-condition intervals for this hole?")) {
          checkbox.checked = true; return;
        }
        conditionDraft = [];
        conditionLegacyFlag = false;
        updateHoleConditionButton();
      }
    });

    var originalOpenHole = window.openHole;
    if (typeof originalOpenHole === "function") {
      window.openHole = function (holeId) {
        var result = originalOpenHole.apply(this, arguments);
        var row = null;
        try { row = currentData()[holeId] || {}; } catch (error) { row = {}; }
        conditionDraft = normalizeHoleConditions(row.HoleConditions);
        conditionLegacyFlag = flagYes(row.Breakthrough) && !conditionDraft.length;
        checkbox.checked = flagYes(row.Breakthrough) || conditionDraft.length > 0;
        updateHoleConditionButton();
        return result;
      };
    }

    var originalReadHoleForm = window.readHoleForm;
    if (typeof originalReadHoleForm === "function") {
      window.readHoleForm = function () {
        var row = originalReadHoleForm.apply(this, arguments) || {};
        if (checkbox.checked) {
          row.Breakthrough = "Yes";
          row.HoleConditions = conditionClone(conditionDraft);
          row.HoleConditionSummary = holeConditionSummaryFromEntries(conditionDraft, row.Depth);
        } else {
          row.Breakthrough = "No";
          row.HoleConditions = [];
          row.HoleConditionSummary = "";
        }
        return row;
      };
    }

    var originalSaveHole = window.saveHole;
    if (typeof originalSaveHole === "function") {
      window.saveHole = function () {
        if (checkbox.checked && !conditionDraft.length && !conditionLegacyFlag) {
          alert("Add at least one hole-condition interval, or uncheck Hole Condition.");
          openHoleConditionModal(true);
          return;
        }
        return originalSaveHole.apply(this, arguments);
      };
    }

    var originalCopyPrevious = window.copyPrevious;
    if (typeof originalCopyPrevious === "function") {
      window.copyPrevious = function () {
        var previous = null;
        try {
          var prevId = previousHoleID(currentHole);
          previous = prevId ? currentData()[prevId] : null;
        } catch (error) {}
        var result = originalCopyPrevious.apply(this, arguments);
        if (previous) {
          conditionDraft = normalizeHoleConditions(previous.HoleConditions);
          conditionLegacyFlag = flagYes(previous.Breakthrough) && !conditionDraft.length;
          checkbox.checked = flagYes(previous.Breakthrough) || conditionDraft.length > 0;
          updateHoleConditionButton();
        }
        return result;
      };
    }

    window.openHoleConditionEditor = function () { openHoleConditionModal(!conditionDraft.length); };
  }

  function patchDrillConditionCSV() {
    if (window.__mithrilM3824ConditionCSV || typeof window.exportCSV !== "function") return;
    window.__mithrilM3824ConditionCSV = true;
    window.exportCSV = function () {
      var rows = [["Page","HoleID","Column","Row","Overburden","Depth","Breakthrough","HoleConditionSummary","HoleConditionsJSON","DirtHole","BadHole","Wet","Notes","GPSLatitude","GPSLongitude","Timestamp"]];
      Object.keys(pagesData).map(Number).sort(function (a,b) { return a-b; }).forEach(function (pageNum) {
        Object.keys(pagesData[String(pageNum)] || {}).sort(function (a,b) {
          var pa = parseHoleID(a), pb = parseHoleID(b);
          return pa.row - pb.row || pa.col - pb.col;
        }).forEach(function (id) {
          var d = pagesData[String(pageNum)][id] || {};
          var pos = parseHoleID(id);
          var summary = holeConditionSummary(d) || d.HoleConditionSummary || "";
          rows.push([pageNum,id,colLetter(pos.col),pos.row+1,d.Overburden||"",d.Depth||"",flagYes(d.Breakthrough)?"Yes":"No",summary,JSON.stringify(normalizeHoleConditions(d.HoleConditions)),flagYes(d.DirtHole)?"Yes":"No",flagYes(d.BadHole)?"Yes":"No",flagYes(d.Wet)?"Yes":"No",d.Notes||"",d.GPSLatitude||"",d.GPSLongitude||"",d.Timestamp||""]);
        });
      });
      var csv = rows.map(function (row) { return row.map(function (value) { return '"' + String(value == null ? "" : value).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
      downloadBlob(csv, exportBaseName() + ".csv", "text/csv");
    };
  }


  function patchDrillLoadedSummary() {
    if (window.__mithrilM3824DrillSummaryPatched) return;
    if (typeof window.getDrillSummary !== "function" || typeof window.renderDrillSummaryCanvas !== "function") return;
    window.__mithrilM3824DrillSummaryPatched = true;

    window.getDrillSummary = function () {
      var s = {
        pages: getPageNumbers().length,
        saved: 0,
        loaded: 0,
        complete: 0,
        incomplete: 0,
        invalid: 0,
        breakthrough: 0,
        dirt: 0,
        bad: 0,
        wet: 0,
        notes: 0,
        totalDepth: 0,
        totalOverburden: 0,
        totalRock: 0,
        depthCount: 0,
        overburdenCount: 0,
        rockCount: 0
      };

      getPageNumbers().forEach(function (pageNum) {
        Object.keys(pagesData[String(pageNum)] || {}).forEach(function (holeId) {
          var d = pagesData[String(pageNum)][holeId];
          if (!holeHasSavedData(d)) return;

          s.saved += 1;
          var dirt = flagYes(d.DirtHole);
          var bad = flagYes(d.BadHole);
          if (flagYes(d.Breakthrough)) s.breakthrough += 1;
          if (dirt) s.dirt += 1;
          if (bad) s.bad += 1;
          if (flagYes(d.Wet)) s.wet += 1;
          if (!dirt && (String(d.Notes || "").trim() || holeConditionHasDetails(d) || flagYes(d.Breakthrough))) s.notes += 1;

          if (dirt || bad) return;

          s.loaded += 1;
          var depth = parseDrillNumber(d.Depth);
          var overburden = parseDrillNumber(d.Overburden);

          if (depth !== null) {
            s.totalDepth += depth;
            s.depthCount += 1;
          }
          if (overburden !== null) {
            s.totalOverburden += overburden;
            s.overburdenCount += 1;
          }

          if (depth === null || overburden === null) {
            s.incomplete += 1;
          } else if (overburden > depth) {
            s.invalid += 1;
          } else {
            s.complete += 1;
            s.totalRock += Math.max(depth - overburden, 0);
            s.rockCount += 1;
          }
        });
      });

      s.avgDepth = s.depthCount ? s.totalDepth / s.depthCount : 0;
      s.avgOverburden = s.overburdenCount ? s.totalOverburden / s.overburdenCount : 0;
      s.avgRock = s.rockCount ? s.totalRock / s.rockCount : 0;
      return s;
    };

    window.renderDrillSummaryCanvas = function () {
      var s = window.getDrillSummary();
      var c = document.createElement("canvas");
      c.width = IMG_W;
      c.height = IMG_H;
      var x = c.getContext("2d");

      x.fillStyle = "#fff";
      x.fillRect(0, 0, IMG_W, IMG_H);
      x.textBaseline = "top";
      x.fillStyle = "#111";
      x.font = "950 54px Arial";
      x.fillText("MITHRIL DRILL LOG SUMMARY", 70, 62);
      x.font = "800 27px Arial";
      x.fillText("Job: " + (headerData.Job || ""), 70, 145);
      x.fillText("Drill Log: " + (headerData.DrillLogNumber || ""), 70, 187);
      x.fillText("Employee: " + (headerData.Employee || ""), 720, 145);
      x.fillText("Date: " + (headerData.Date || ""), 720, 187);
      x.strokeStyle = "#333";
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(70, 245);
      x.lineTo(IMG_W - 70, 245);
      x.stroke();

      drawSummaryBox(x, 70, 290, 285, 150, "Pages", s.pages);
      drawSummaryBox(x, 385, 290, 285, 150, "Holes entered", s.saved);
      drawSummaryBox(x, 700, 290, 285, 150, "Loaded holes", s.loaded, "Excludes dirt / bad");
      drawSummaryBox(x, 1015, 290, 280, 150, "Needs review", s.incomplete + s.invalid,
        s.incomplete + " incomplete / " + s.invalid + " invalid");

      x.fillStyle = "#111";
      x.font = "950 35px Arial";
      x.fillText("Loaded-hole footage", 70, 505);
      drawSummaryBox(x, 70, 560, 370, 160, "Total depth", fmtSummaryNumber(s.totalDepth),
        "Average " + fmtSummaryNumber(s.avgDepth) + " ft");
      drawSummaryBox(x, 475, 560, 370, 160, "Total overburden", fmtSummaryNumber(s.totalOverburden),
        "Average " + fmtSummaryNumber(s.avgOverburden) + " ft");
      drawSummaryBox(x, 880, 560, 415, 160, "Total rock", fmtSummaryNumber(s.totalRock),
        "Average " + fmtSummaryNumber(s.avgRock) + " ft");

      x.fillStyle = "#111";
      x.font = "950 35px Arial";
      x.fillText("Hole conditions", 70, 790);
      drawConditionLegend(x, 70, 850, 285, "Hole condition", s.breakthrough, "rgba(255,210,0,.62)");
      drawConditionLegend(x, 385, 850, 285, "Dirt", s.dirt, "rgba(150,95,45,.40)");
      drawConditionLegend(x, 700, 850, 285, "Bad", s.bad, "rgba(255,70,70,.38)");
      drawConditionLegend(x, 1015, 850, 280, "Wet", s.wet, "rgba(72,200,95,.30)", "rgba(0,90,255,.95)");

      x.font = "950 35px Arial";
      x.fillStyle = "#111";
      x.fillText("Loaded-hole review", 70, 1025);
      x.font = "800 27px Arial";
      x.fillStyle = s.invalid ? "#a00000" : "#222";
      x.fillText("Invalid loaded holes (overburden greater than depth): " + s.invalid, 90, 1090);
      x.fillStyle = s.incomplete ? "#7a5200" : "#222";
      x.fillText("Incomplete loaded holes (missing depth or overburden): " + s.incomplete, 90, 1140);
      x.fillStyle = "#222";
      x.fillText("Holes with notes: " + s.notes, 90, 1190);

      x.font = "700 22px Arial";
      x.fillStyle = "#555";
      x.fillText("Dirt and bad holes remain on the diagram for field context but are not flagged for review.", 70, 1285);

      x.fillStyle = "#f7f7f7";
      x.strokeStyle = "#ccc";
      x.lineWidth = 2;
      x.fillRect(70, 1370, IMG_W - 140, 520);
      x.strokeRect(70, 1370, IMG_W - 140, 520);
      x.fillStyle = "#111";
      x.font = "950 31px Arial";
      x.fillText("Summary rules", 95, 1400);
      x.font = "700 24px Arial";
      var rules = [
        "Loaded holes = entered holes not marked Dirt or Bad.",
        "Dirt and Bad holes are context only and are excluded from review and footage totals.",
        "Rock footage = depth minus overburden for loaded holes.",
        "A loaded hole missing depth or overburden is incomplete.",
        "A loaded hole with overburden greater than depth is invalid.",
        "Hole-condition intervals are informational and do not reduce Total Rock."
      ];
      var y = 1460;
      for (var i = 0; i < rules.length; i += 1) {
        x.fillText("• " + rules[i], 105, y);
        y += 62;
      }

      x.font = "700 20px Arial";
      x.fillStyle = "#666";
      x.fillText("Generated by MITHRIL Mobile " + APP_VERSION, 70, IMG_H - 80);
      return c;
    };
  }


  function patchDrillNotesPages() {
    if (window.__mithrilM3824DrillNotesPatched) return;
    if (typeof window.collectNoteEntries !== "function" || typeof window.renderNotesCanvases !== "function") return;
    window.__mithrilM3824DrillNotesPatched = true;

    window.collectNoteEntries = function () {
      var entries = [];
      getPageNumbers().forEach(function (pageNum) {
        Object.keys(pagesData[String(pageNum)] || {}).sort(function (a,b) {
          var pa = parseHoleID(a), pb = parseHoleID(b);
          return pa.row - pb.row || pa.col - pb.col;
        }).forEach(function (holeId) {
          var d = pagesData[String(pageNum)][holeId] || {};
          if (flagYes(d.DirtHole)) return;
          var conditions = [];
          var generated = holeConditionSummary(d);
          var manual = String(d.Notes || "").trim();
          if (generated || flagYes(d.Breakthrough)) conditions.push("HOLE CONDITION");
          if (flagYes(d.BadHole)) conditions.push("BAD");
          if (flagYes(d.Wet)) conditions.push("WET");
          var noteParts = [];
          if (generated) noteParts.push(generated);
          else if (flagYes(d.Breakthrough)) noteParts.push("Hole condition marked; no interval details entered.");
          if (manual) noteParts.push(manual);
          if (!noteParts.length && conditions.length) noteParts.push("Condition marked; no details entered.");
          if (noteParts.length || conditions.length) entries.push({ page: pageNum, hole: holeId, conditions: conditions, note: noteParts.join(" ") });
        });
      });
      return entries;
    };

    window.renderNotesCanvases = function () {
      var entries = window.collectNoteEntries();
      if (!entries.length) return [];
      var result = [];
      var pageIndex = 1;
      var c = newNotesCanvas(pageIndex);
      var x = c.getContext("2d");
      var y = 275;
      for (var i = 0; i < entries.length; i += 1) {
        var entry = entries[i];
        x.font = "950 29px Arial";
        var heading = "Page " + entry.page + "  •  Hole " + entry.hole + (entry.conditions.length ? "  •  " + entry.conditions.join(" / ") : "");
        x.font = "700 27px Arial";
        var lines = wrapCanvasText(x, entry.note, IMG_W - 170);
        var needed = 42 + lines.length * 36 + 24;
        if (y + needed > IMG_H - 90) {
          result.push(c);
          pageIndex += 1;
          c = newNotesCanvas(pageIndex);
          x = c.getContext("2d");
          y = 275;
        }
        x.font = "950 29px Arial";
        if (entry.conditions.indexOf("BAD") !== -1) x.fillStyle = "#a00000";
        else if (entry.conditions.indexOf("HOLE CONDITION") !== -1) x.fillStyle = "#8a6400";
        else if (entry.conditions.indexOf("WET") !== -1) x.fillStyle = "#0b56a8";
        else x.fillStyle = "#111";
        x.fillText(heading, 85, y);
        y += 40;
        x.font = "700 27px Arial";
        x.fillStyle = "#222";
        for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
          x.fillText(lines[lineIndex], 105, y);
          y += 36;
        }
        x.strokeStyle = "#ccc";
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(85, y + 8);
        x.lineTo(IMG_W - 85, y + 8);
        x.stroke();
        y += 28;
      }
      result.push(c);
      return result;
    };
  }

  function initialize() {
    installClosestPolyfill();
    injectStyles();
    injectMultiQuickStyles();
    injectGPSStyles();
    updateRuntimeLabels();

    var drillCanvas = byId("drillCanvas");
    var shotCanvas = byId("shotCanvas");
    if (drillCanvas) installCanvasBackgroundBridge(drillCanvas);
    if (shotCanvas) installCanvasBackgroundBridge(shotCanvas);

    window.MithrilApplyTheme = applyTheme;
    applyTheme(getSavedTheme());

    if (drillCanvas) {
      installPrecisionCanvasCoordinates(drillCanvas, "drill");
      patchDrillLoadedSummary();
      patchDrillNotesPages();
      updateToolbar(false);
      patchDrillMenu();
      patchDrillMultiQuick();
      installGPSFeature("drill", drillCanvas);
      installDrillHoleConditions();
      patchDrillConditionCSV();
      enableWheelZoom(drillCanvas);
    } else if (shotCanvas) {
      installPrecisionCanvasCoordinates(shotCanvas, "shot");
      updateToolbar(true);
      patchShotMenu();
      addShotInfoBackButton();
      patchShotMultiQuick();
      installGPSFeature("shot", shotCanvas);
      enableWheelZoom(shotCanvas);
    } else if (byId("shotFrame")) {
      installShotFrameBridge();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
