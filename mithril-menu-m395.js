(function () {
  "use strict";

  var RELEASE_VERSION = "m39.5";
  var RELEASE_LABEL = "Shot Diagram and Drill Log multi-pattern calculations, separate rock-only and total shot volumes, corrected Drill Log summary layout, closable Shot Diagram PDF preview, explosive-load extremes, selection tools, GPS callouts, and structured hole conditions";
  var THEME_STORAGE_KEY = "mithrilCanvasThemeV1";
  var THEME_CLASS_PREFIX = "m395-theme-";
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
    if (!canvas || canvas.getAttribute("data-m395-precision-coordinates") === "true") return;

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

    canvas.setAttribute("data-m395-precision-coordinates", "true");
  }

  function enableWheelZoom(canvas) {
    if (!canvas || canvas.getAttribute("data-m395-wheel-zoom") === "true") return;
    canvas.setAttribute("data-m395-wheel-zoom", "true");

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
    if (!modal || byId("m395ShotInfoBack")) return;
    var grid = modal.querySelector(".buttonGrid");
    if (!grid) return;

    var button = document.createElement("button");
    button.id = "m395ShotInfoBack";
    button.type = "button";
    button.className = "m395BackMenu";
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
    if (!frame || frame.getAttribute("data-m395-bridge") === "true") return;
    frame.setAttribute("data-m395-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childDocument.getElementById("mithrilMenuM395ChildLoader")) return true;

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM395ChildLoader";
        script.src = "./mithril-menu-m395.js?v=39.5-frame";
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
    if (byId("mithrilMenuM395Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM395Styles";
    style.textContent = [
      ".m395MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m395MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m395MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m395MenuStack>button.m395Home{text-align:center}",
      ".m395Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m395Section.show{display:block}",
      ".m395SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m395SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m395ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m395ActionGrid button{min-height:49px}",
      ".m395ActionGrid .wide{grid-column:1/-1}",
      ".m395Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m395Subpanel.show{display:block}",
      ".m395DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m395DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m395Up{grid-area:up}.m395Left{grid-area:left}.m395Center{grid-area:center}.m395Right{grid-area:right}.m395Down{grid-area:down}",
      ".m395Spacer{visibility:hidden;pointer-events:none}",
      ".m395DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m395DangerZone button{width:100%;min-height:50px}",
      ".m395BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      ".m395ThemePanel{max-height:46vh;overflow:auto;padding-right:2px}",
      ".m395ThemeGroupTitle{margin:10px 0 6px;font-size:12px;font-weight:950;color:#555;text-transform:uppercase;letter-spacing:.04em}",
      ".m395ThemeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m395ThemeButton{min-height:44px;font-size:13px;line-height:1.25;text-align:left}",
      ".m395ThemeButton.active{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "html.m395-theme-gray,body.m395-theme-gray{background:#2e2e2e !important}",
      "html.m395-theme-dark-slate,body.m395-theme-dark-slate{background-color:#232a31 !important;background-image:radial-gradient(circle at 18% 18%, rgba(255,255,255,.06) 0 3px, transparent 4px),radial-gradient(circle at 76% 70%, rgba(0,0,0,.2) 0 18px, transparent 20px),linear-gradient(135deg,#20262d 0%,#313b46 100%) !important;background-size:140px 140px,220px 220px,cover !important;background-attachment:fixed !important}",
      "html.m395-theme-blue-steel,body.m395-theme-blue-steel{background-color:#566575 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.08) 0 2px, transparent 3px),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0) 38%),linear-gradient(135deg,#4b5a68 0%,#6b7d8f 100%) !important;background-size:150px 150px,cover,cover !important;background-attachment:fixed !important}",
      "html.m395-theme-subtle-grid,body.m395-theme-subtle-grid{background-color:#252e38 !important;background-image:radial-gradient(circle at center, rgba(255,255,255,.03) 1px, transparent 1px),repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),linear-gradient(135deg,#232b34,#2e3945) !important;background-size:26px 26px,26px 26px,26px 26px,cover !important;background-attachment:fixed !important}",
      "html.m395-theme-gradient-slate,body.m395-theme-gradient-slate{background:#54606f !important;background-image:linear-gradient(135deg,#6b7786 0%,#3c4653 100%) !important;background-attachment:fixed !important}",
      "html.m395-theme-dark-paper,body.m395-theme-dark-paper{background-color:#35383d !important;background-image:radial-gradient(circle at 25% 25%, rgba(255,255,255,.05) 0 2px, transparent 3px),radial-gradient(circle at 75% 60%, rgba(255,255,255,.03) 0 1px, transparent 2px),linear-gradient(135deg,#2c3035 0%,#44484f 100%) !important;background-size:120px 120px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m395-theme-soft-quarry-tan,body.m395-theme-soft-quarry-tan{background-color:#b9aea0 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.12) 0 2px, transparent 3px),radial-gradient(circle at 80% 70%, rgba(0,0,0,.08) 0 2px, transparent 3px),linear-gradient(135deg,#c8bdae 0%,#a89b8b 100%) !important;background-size:70px 70px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m395-theme-blast-ember,body.m395-theme-blast-ember{background-color:#111 !important;background-image:radial-gradient(circle at 15% 78%, rgba(255,110,0,.72) 0 2%, transparent 8%),radial-gradient(circle at 82% 22%, rgba(255,90,0,.48) 0 1.4%, transparent 7%),repeating-linear-gradient(135deg, rgba(255,120,0,.0) 0 18px, rgba(255,110,0,.18) 18px 19px, transparent 19px 34px),linear-gradient(135deg,#090909,#262626) !important;background-attachment:fixed !important}",
      "html.m395-theme-electric-steel,body.m395-theme-electric-steel{background-color:#0e2032 !important;background-image:radial-gradient(circle at 50% 60%, rgba(0,150,255,.34) 0 18%, transparent 42%),repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 18px),linear-gradient(135deg,#091521,#27425f) !important;background-attachment:fixed !important}",
      "html.m395-theme-blast-placard,body.m395-theme-blast-placard{background-color:#111 !important;background-image:linear-gradient(45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),linear-gradient(-45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),radial-gradient(circle at 80% 25%, rgba(255,165,0,.22) 0 12%, transparent 26%),repeating-linear-gradient(135deg, rgba(255,150,30,.22) 0 12px, transparent 12px 36px),linear-gradient(135deg,#090909,#1b1b1b) !important;background-size:280px 280px,280px 280px,cover,cover,cover !important;background-attachment:fixed !important}",
      "html.m395-theme-copper-quarry,body.m395-theme-copper-quarry{background-color:#5a2b11 !important;background-image:radial-gradient(circle at 25% 30%, rgba(255,170,100,.28) 0 14%, transparent 26%),radial-gradient(circle at 72% 68%, rgba(255,210,130,.16) 0 10%, transparent 24%),repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0 12px, rgba(0,0,0,.08) 12px 22px),linear-gradient(135deg,#4c200c,#8a481f) !important;background-attachment:fixed !important}",
      "html.m395-theme-cobalt-topo,body.m395-theme-cobalt-topo{background-color:#041c3a !important;background-image:radial-gradient(circle at 18% 72%, transparent 0 40px, rgba(0,180,255,.24) 41px 42px, transparent 43px 54px, rgba(0,180,255,.18) 55px 56px, transparent 57px),radial-gradient(circle at 78% 62%, transparent 0 50px, rgba(0,180,255,.22) 51px 52px, transparent 53px 66px, rgba(0,180,255,.18) 67px 68px, transparent 69px),radial-gradient(circle at 56% 22%, transparent 0 32px, rgba(0,180,255,.18) 33px 34px, transparent 35px 48px, rgba(0,180,255,.15) 49px 50px, transparent 51px),linear-gradient(135deg,#031325,#09447a) !important;background-attachment:fixed !important}",
      "html.m395-theme-signal-red-slate,body.m395-theme-signal-red-slate{background-color:#120b0b !important;background-image:radial-gradient(circle at 18% 78%, rgba(255,70,40,.34) 0 18%, transparent 30%),radial-gradient(circle at 84% 20%, rgba(255,60,30,.28) 0 12%, transparent 24%),repeating-linear-gradient(90deg, rgba(255,60,30,.16) 0 2px, transparent 2px 48px),linear-gradient(135deg,#0b0b0b,#272222) !important;background-attachment:fixed !important}",
      "@media(max-width:520px){.m395QuickButton{font-size:0}.m395QuickButton:after{content:'Quick';font-size:14px}.m395FitButton{font-size:0}.m395FitButton:after{content:'Fit';font-size:14px}.m395ActionGrid{grid-template-columns:1fr}.m395ActionGrid .wide{grid-column:auto}.m395DirectionGrid{grid-template-columns:1fr 1fr 1fr}.m395ThemeGrid{grid-template-columns:1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function updateRuntimeLabels() {
    document.title = String(document.title || "MITHRIL").replace(/m(?:38\.\d+|39(?:\.\d+)?)/g, RELEASE_VERSION);

    var startVersion = document.querySelector(".startVersion");
    if (startVersion) startVersion.textContent = RELEASE_VERSION + " " + RELEASE_LABEL;

    var installedVersion = document.querySelector(".updateHomeVersion");
    if (installedVersion) installedVersion.textContent = "Installed version: " + RELEASE_VERSION;

    var versionLabels = document.querySelectorAll(".version");
    for (var i = 0; i < versionLabels.length; i += 1) {
      if (/m(?:38\.|39(?:\.|$))/i.test(versionLabels[i].textContent || "")) versionLabels[i].textContent = RELEASE_VERSION;
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
        topButtons[i].classList.add("m395QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m395FitButton");
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
    var sections = box.querySelectorAll(".m395Section");
    var buttons = box.querySelectorAll("[data-m395-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m395-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m395Subpanel");
    var buttons = section.querySelectorAll("[data-m395-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m395-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m395-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m395-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m395-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m395-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m395Section");
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
      var sections = menu.querySelectorAll(".m395Section,.m395Subpanel");
      var buttons = menu.querySelectorAll("[data-m395-section],[data-m395-subpanel]");
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
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m395-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var label = button.getAttribute('data-label') || button.textContent.replace(/^✓\s*/, '').trim();
      button.setAttribute('data-label', label);
      var active = button.getAttribute('data-m395-theme-choice') === current;
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
        html += '<button type="button" class="m395ThemeButton" data-m395-theme-choice="' + THEME_OPTIONS[i].key + '" data-label="' + THEME_OPTIONS[i].label + '">' + THEME_OPTIONS[i].label + '</button>';
      }
      return html;
    }

    return [
      '<button type="button" class="wide" data-m395-subpanel="' + panelId + '" data-label="Canvas Background" aria-expanded="false">Canvas Background  ›</button>',
      '<div id="' + panelId + '" class="m395Subpanel">',
      '  <div class="m395ThemePanel">',
      '    <p class="m395SectionHelp">Pick a canvas background. The theme applies immediately and stays saved on this device.</p>',
      '    <div class="m395ThemeGroupTitle">Classic Themes</div>',
      '    <div class="m395ThemeGrid">' + buildThemeButtons('classic') + '</div>',
      '    <div class="m395ThemeGroupTitle">Bold Themes</div>',
      '    <div class="m395ThemeGrid">' + buildThemeButtons('bold') + '</div>',
      '    <div class="m395ThemeGroupTitle">Default</div>',
      '    <div class="m395ThemeGrid">' + buildThemeButtons('reset') + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function wireThemeButtons(root) {
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m395-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function () {
        chooseTheme(this.getAttribute('data-m395-theme-choice'));
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
    if (!menu || menu.getAttribute("data-m395-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m395-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m395-action="close">Close</button></div>',
      '<p class="m395MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m395MenuStack">',
      '  <button type="button" data-m395-action="info">Drill Log Info</button>',
      '  <button type="button" class="primary" data-m395-action="editHoles">Edit Holes</button>',
      '  <button type="button" data-m395-section="m395DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m395DrillPages" class="m395Section">',
      '    <div class="m395SectionTitle">Page Tools</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" class="wide" data-m395-subpanel="m395DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m395DrillAdd" class="m395Subpanel">',
      '        <p class="m395SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m395DirectionGrid">',
      '          <button type="button" class="m395Up" data-m395-add="up">↑ Add Above</button>',
      '          <button type="button" class="m395Left" data-m395-add="left">← Add Left</button>',
      '          <button type="button" class="m395Center m395Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m395Right" data-m395-add="right">Add Right →</button>',
      '          <button type="button" class="m395Down" data-m395-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m395-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m395-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m395DrillExport" class="m395Section">',
      '    <div class="m395SectionTitle">Export &amp; Share</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" class="primary wide" data-m395-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m395-action="pdf">Download PDF</button>',
      '      <button type="button" data-m395-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m395DrillBackup" class="m395Section">',
      '    <div class="m395SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m395SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" data-m395-action="backup">Download Backup</button>',
      '      <button type="button" data-m395-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m395DrillSettings" class="m395Section">',
      '    <div class="m395SectionTitle">Settings</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" class="wide" data-m395-action="calibrate">Calibrate Employee / Job</button>',
      buildThemePickerHtml("m395DrillTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m395-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m395DangerZone"><button type="button" class="danger" data-m395-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m395Home" data-m395-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m395-action="close"]', closeMenu);
    wireAction(box, '[data-m395-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m395-action="editHoles"]', function () { closeMenu(); startDrillEditMode(); });
    wireAction(box, '[data-m395-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m395-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m395-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m395-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m395-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m395-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m395-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m395-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m395-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m395-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m395-action="home"]', function () { runAndClose("returnToSelector"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m395-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m395-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m395-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m395-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m395-action="close">Close</button></div>',
      '<p class="m395MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m395MenuStack">',
      '  <button type="button" data-m395-action="info">Shot Info</button>',
      '  <button type="button" class="primary" data-m395-action="editHoles">Edit Holes</button>',
      '  <button type="button" data-m395-section="m395ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m395ShotPages" class="m395Section">',
      '    <div class="m395SectionTitle">Page Tools</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" class="wide" data-m395-subpanel="m395ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m395ShotAdd" class="m395Subpanel">',
      '        <p class="m395SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m395DirectionGrid">',
      '          <button type="button" class="m395Up" data-m395-add="up">↑ Add Above</button>',
      '          <button type="button" class="m395Left" data-m395-add="left">← Add Left</button>',
      '          <button type="button" class="m395Center m395Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m395Right" data-m395-add="right">Add Right →</button>',
      '          <button type="button" class="m395Down" data-m395-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m395-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m395-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m395ShotExport" class="m395Section">',
      '    <div class="m395SectionTitle">Export &amp; Share</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" class="primary wide" data-m395-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m395-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m395-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m395-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m395ShotBackup" class="m395Section">',
      '    <div class="m395SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m395SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" data-m395-action="backup">Download Backup</button>',
      '      <button type="button" data-m395-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m395ShotSettings" class="m395Section">',
      '    <div class="m395SectionTitle">Settings</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" class="wide" data-m395-action="calibrate">Field Calibration</button>',
      buildThemePickerHtml("m395ShotTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m395-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m395DangerZone"><button type="button" class="danger" data-m395-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m395Home" data-m395-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m395-action="close"]', closeMenu);
    wireAction(box, '[data-m395-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m395-action="editHoles"]', function () { closeMenu(); startShotEditMode(); });
    wireAction(box, '[data-m395-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m395-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m395-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m395-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m395-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m395-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m395-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m395-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m395-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m395-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m395-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m395-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m395-add]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m395-add")]);
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
    if (byId("mithrilMultiQuickM395Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilMultiQuickM395Styles";
    style.textContent = [
      ".m395QuickIntro{margin:0 0 12px;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m395QuickRows{display:grid;gap:10px}",
      ".m395QuickRow{display:grid;grid-template-columns:78px minmax(130px,1.15fr) minmax(110px,.85fr);gap:8px;align-items:end;padding:9px;border:1px solid #bbb;border-radius:10px;background:#f8f8f8}",
      ".m395QuickRow.inactive{opacity:.68}",
      ".m395QuickUse{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:6px;border:1px solid #aaa;border-radius:8px;background:#fff;font-size:13px;font-weight:950}",
      ".m395QuickUse input{width:24px;height:24px;min-height:24px;margin:0;padding:0}",
      ".m395QuickRow label{min-width:0}",
      ".m395QuickRow select,.m395QuickRow input{width:100%;min-height:46px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;background:#fff}",
      ".m395QuickValueCell{min-width:0}",
      ".m395QuickActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}",
      ".m395QuickActions button{min-height:48px}",
      ".m395QuickBarSummary{min-width:0;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".m395QuickBarHint{grid-column:1/-1;font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#333}",
      "#quickBar.m395MultiQuickBar,#singleFillBar.m395MultiQuickBar{grid-template-columns:minmax(0,1fr) auto auto!important}",
      "#quickModal .box.m395QuickModalBox{width:min(650px,96vw)}",
      "#quickModal .box.m395QuickKeypadOpen{padding-bottom:365px!important}",
      "@media(max-width:520px){.m395QuickRow{grid-template-columns:68px 1fr}.m395QuickValueCell{grid-column:2}.m395QuickActions{grid-template-columns:1fr}.m395QuickBarSummary{font-size:13px}}"
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
        '<div id="' + prefix + 'Row' + i + '" class="m395QuickRow">',
        '  <label class="m395QuickUse"><input id="' + prefix + 'Use' + i + '" type="checkbox" /> Use ' + i + '</label>',
        '  <label>Field<select id="' + prefix + 'Field' + i + '">' + options + '</select></label>',
        '  <label class="m395QuickValueCell">Value',
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
    if (!canvas || canvas.getAttribute("data-m395-theme-canvas") === "true") return;
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context || context.__mithrilM395FillRect) return;
    var originalFillRect = context.fillRect.bind(context);
    context.__mithrilM395FillRect = originalFillRect;
    context.fillRect = function (x, y, width, height) {
      var color = String(context.fillStyle || "").replace(/\s+/g, "").toLowerCase();
      var rect = canvas.getBoundingClientRect();
      var gray = color === "#2e2e2e" || color === "rgb(46,46,46)" || color === "rgba(46,46,46,1)";
      var fullSurface = Math.abs(Number(x || 0)) < 1 && Math.abs(Number(y || 0)) < 1 && Number(width || 0) >= rect.width - 2 && Number(height || 0) >= rect.height - 2;
      if (gray && fullSurface) return;
      return originalFillRect(x, y, width, height);
    };
    canvas.setAttribute("data-m395-theme-canvas", "true");
  }

  function ensureDrillQuickState() {
    var entries = normalizeMultiQuickEntries(quick, DRILL_MULTI_QUICK_FIELDS, ["Overburden", "Depth", "Breakthrough"]);
    quick.entries = entries;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quick.field = first.field;
    quick.value = first.value;
    return quick;
  }

  function drillQuickPrefix() { return "m395DrillQuick"; }

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
    var summary = byId("m395DrillQuickSummary");
    var hint = byId("m395DrillQuickHint");
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
    if (window.__mithrilM395DrillPad) return;
    window.__mithrilM395DrillPad = true;
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
      if (box && byId("quickModal").classList.contains("show")) box.classList.add("m395QuickKeypadOpen");
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
      if (box) box.classList.remove("m395QuickKeypadOpen");
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
    if (!modal || !bar || modal.getAttribute("data-m395-multi-quick") === "drill") return;
    modal.setAttribute("data-m395-multi-quick", "drill");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m395QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m395DrillQuickClose">Close</button></div>',
      '<p class="m395QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m395QuickRows">' + buildMultiQuickRows(drillQuickPrefix(), DRILL_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m395QuickActions">',
      '  <button type="button" class="primary" id="m395DrillQuickOn">Turn On</button>',
      '  <button type="button" id="m395DrillQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m395DrillQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m395MultiQuickBar");
    bar.innerHTML = [
      '<div id="m395DrillQuickSummary" class="m395QuickBarSummary"></div>',
      '<button type="button" id="m395DrillQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m395DrillQuickBarOff">Off</button>',
      '<div id="m395DrillQuickHint" class="m395QuickBarHint"></div>'
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

    byId("m395DrillQuickClose").addEventListener("click", function () { window.closeQuickModal(); });
    byId("m395DrillQuickOn").addEventListener("click", function () { saveDrillMultiQuick(true); });
    byId("m395DrillQuickOff").addEventListener("click", function () { saveDrillMultiQuick(false); });
    byId("m395DrillQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hidePad === "function") window.hidePad();
    });
    byId("m395DrillQuickEdit").addEventListener("click", function () { window.openQuickModal(); });
    byId("m395DrillQuickBarOff").addEventListener("click", function () { window.turnQuickOff(); });

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

  function shotQuickPrefix() { return "m395ShotQuick"; }

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
    var summary = byId("m395ShotQuickSummary");
    var hint = byId("m395ShotQuickHint");
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
    if (window.__mithrilM395ShotPad) return;
    window.__mithrilM395ShotPad = true;
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
        if (box) box.classList.add("m395QuickKeypadOpen");
      }
    };
    window.hideLoadKeypad = function () {
      if (typeof originalHideLoadKeypad === "function") originalHideLoadKeypad();
      var box = byId("quickModal") && byId("quickModal").querySelector(".box");
      if (box) box.classList.remove("m395QuickKeypadOpen");
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
    if (!modal || !bar || modal.getAttribute("data-m395-multi-quick") === "shot") return;
    modal.setAttribute("data-m395-multi-quick", "shot");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m395QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m395ShotQuickClose">Close</button></div>',
      '<p class="m395QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m395QuickRows">' + buildMultiQuickRows(shotQuickPrefix(), SHOT_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m395QuickActions">',
      '  <button type="button" class="primary" id="m395ShotQuickOn">Turn On</button>',
      '  <button type="button" id="m395ShotQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m395ShotQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m395MultiQuickBar");
    bar.innerHTML = [
      '<div id="m395ShotQuickSummary" class="m395QuickBarSummary"></div>',
      '<button type="button" id="m395ShotQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m395ShotQuickBarOff">Off</button>',
      '<div id="m395ShotQuickHint" class="m395QuickBarHint"></div>'
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

    byId("m395ShotQuickClose").addEventListener("click", function () { window.closeQuickEntry(); });
    byId("m395ShotQuickOn").addEventListener("click", function () { saveShotMultiQuick(true); });
    byId("m395ShotQuickOff").addEventListener("click", function () { saveShotMultiQuick(false); });
    byId("m395ShotQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hideLoadKeypad === "function") window.hideLoadKeypad();
    });
    byId("m395ShotQuickEdit").addEventListener("click", function () { window.openQuickEntry(); });
    byId("m395ShotQuickBarOff").addEventListener("click", function () { window.quickEnabledOff(); });

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
    if (byId("mithrilGPSM395Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilGPSM395Styles";
    style.textContent = [
      ".m395GPSDetails{margin-top:12px;border:1px solid #9ab5d6;border-radius:10px;background:#f6faff;overflow:hidden}",
      ".m395GPSDetails summary{min-height:48px;display:flex;align-items:center;padding:8px 11px;font-size:15px;font-weight:950;cursor:pointer;user-select:none}",
      ".m395GPSBody{padding:0 10px 10px}",
      ".m395GPSGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}",
      ".m395GPSGrid label{min-width:0}",
      ".m395GPSGrid input{width:100%;min-height:44px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;box-sizing:border-box}",
      ".m395GPSGrid .wide{grid-column:1/-1}",
      ".m395GPSActions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:9px}",
      ".m395GPSActions button{min-height:46px}",
      ".m395GPSStatus{margin-top:8px;min-height:18px;font-size:12px;font-weight:800;color:#365b82;line-height:1.3}",
      ".m395GPSMenuGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m395GPSMenuGrid button{min-height:48px}",
      ".m395GPSMenuGrid .wide{grid-column:1/-1}",
      ".m395GPSArrangeBar{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:240;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;background:rgba(255,255,255,.98);border:2px solid #8a4fff;border-radius:12px;padding:8px;box-shadow:0 5px 18px rgba(0,0,0,.38)}",
      ".m395GPSArrangeBar.show{display:grid}",
      ".m395GPSArrangeHint{font-size:13px;line-height:1.25;font-weight:900;color:#333;min-width:0}",
      ".m395GPSArrangeBar button{min-height:44px}",
      "@media(max-width:520px){.m395GPSGrid{grid-template-columns:1fr}.m395GPSGrid .wide{grid-column:auto}.m395GPSActions{grid-template-columns:1fr}.m395GPSMenuGrid{grid-template-columns:1fr}.m395GPSMenuGrid .wide{grid-column:auto}.m395GPSArrangeBar{grid-template-columns:1fr 1fr}.m395GPSArrangeHint{grid-column:1/-1}}"
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
    if (window.__mithrilM395GPSDrawing) return;
    window.__mithrilM395GPSDrawing = true;
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
    return type === "drill" ? "m395DrillGPS" : "m395ShotGPS";
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
    if (!modal || modal.getAttribute("data-m395-gps-editor") === type) return;
    var box = type === "drill" ? byId("holeBox") : byId("holeEditorBox");
    if (!box) return;
    var buttonGrid = box.querySelector(".buttonGrid");
    if (!buttonGrid) return;
    var prefix = gpsEditorPrefix(type);
    var details = document.createElement("details");
    details.id = prefix + "Details";
    details.className = "m395GPSDetails";
    details.innerHTML = [
      '<summary>Manual GPS Tag (optional)</summary>',
      '<div class="m395GPSBody">',
      '  <p class="m395GPSStatus">Enter coordinates collected with your external GPS equipment. MITHRIL does not request or capture this device\'s location.</p>',
      '  <div class="m395GPSGrid">',
      '    <label>Latitude<input id="' + prefix + 'Latitude" type="text" inputmode="decimal" autocomplete="off" placeholder="40.123456" /></label>',
      '    <label>Longitude<input id="' + prefix + 'Longitude" type="text" inputmode="decimal" autocomplete="off" placeholder="-76.123456" /></label>',
      '  </div>',
      '  <div class="m395GPSActions">',
      '    <button type="button" class="danger" id="' + prefix + 'Clear">Clear GPS Tag</button>',
      '  </div>',
      '  <div id="' + prefix + 'Status" class="m395GPSStatus">No manual GPS tag saved for this hole.</div>',
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
    modal.setAttribute("data-m395-gps-editor", type);
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
    var button = byId(type === "drill" ? "m395DrillGPSToggle" : "m395ShotGPSToggle");
    var count = byId(type === "drill" ? "m395DrillGPSCount" : "m395ShotGPSCount");
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
    var bar = byId("m395GPSArrangeBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "m395GPSArrangeBar";
      bar.className = "m395GPSArrangeBar";
      bar.innerHTML = [
        '<div id="m395GPSArrangeHint" class="m395GPSArrangeHint">Drag GPS boxes to move them. The arrows follow automatically.</div>',
        '<button type="button" id="m395GPSArrangeReset">Reset Page</button>',
        '<button type="button" class="primary" id="m395GPSArrangeDone">Done</button>'
      ].join("");
      document.body.appendChild(bar);
      byId("m395GPSArrangeDone").addEventListener("click", function () { finishGPSArrange(); });
      byId("m395GPSArrangeReset").addEventListener("click", function () { resetGPSPositions(gpsArrangeType || type); });
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
    byId("m395GPSArrangeHint").textContent = "Drag GPS boxes on any visible page. Touching a box automatically activates its page.";
    if (typeof window.draw === "function") window.draw();
  }

  function finishGPSArrange() {
    var type = gpsArrangeType;
    gpsArrangeMode = false;
    gpsArrangeType = "";
    gpsDragState = null;
    var bar = byId("m395GPSArrangeBar");
    if (bar) bar.classList.remove("show");
    if (type) {
      saveGPSLayout(type);
      resumeQuickAfterGPSArrange(type);
    }
    if (typeof window.draw === "function") window.draw();
  }

  function buildGPSMenuHtml(type) {
    var prefix = type === "drill" ? "m395DrillGPS" : "m395ShotGPS";
    return [
      '<button type="button" class="wide" data-m395-subpanel="' + prefix + 'Panel" data-label="GPS Callouts" aria-expanded="false">GPS Callouts  ›</button>',
      '<div id="' + prefix + 'Panel" class="m395Subpanel">',
      '  <p class="m395SectionHelp">Coordinates entered manually are stored on each hole. Visible callouts and arrows are also included in PDF exports.</p>',
      '  <div id="' + prefix + 'Count" class="m395GPSStatus"></div>',
      '  <div class="m395GPSMenuGrid">',
      '    <button type="button" class="wide" id="' + prefix + 'Toggle"></button>',
      '    <button type="button" id="' + prefix + 'Arrange">Arrange Callouts</button>',
      '    <button type="button" id="' + prefix + 'Reset">Reset Current Page</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function installGPSMenuTools(type) {
    var settings = byId(type === "drill" ? "m395DrillSettings" : "m395ShotSettings");
    if (!settings || settings.getAttribute("data-m395-gps-menu") === "true") return;
    var grid = settings.querySelector(".m395ActionGrid");
    if (!grid) return;
    var holder = document.createElement("div");
    holder.style.display = "contents";
    holder.innerHTML = buildGPSMenuHtml(type);
    var updateButton = grid.querySelector("#mithrilUpdateMenuButton");
    while (holder.firstChild) grid.insertBefore(holder.firstChild, updateButton || null);
    var prefix = type === "drill" ? "m395DrillGPS" : "m395ShotGPS";
    byId(prefix + "Toggle").addEventListener("click", function () { setGPSCalloutsVisible(type, !gpsCalloutsVisible(type)); });
    byId(prefix + "Arrange").addEventListener("click", function () { startGPSArrange(type); });
    byId(prefix + "Reset").addEventListener("click", function () { resetGPSPositions(type); });
    settings.setAttribute("data-m395-gps-menu", "true");
    updateGPSMenuState(type);
    if (!window.__mithrilM395GPSMenuOpenWrapped && typeof window.openMenu === "function") {
      var originalOpenMenuForGPS = window.openMenu;
      window.openMenu = function () {
        updateGPSMenuState(type);
        return originalOpenMenuForGPS.apply(this, arguments);
      };
      window.__mithrilM395GPSMenuOpenWrapped = true;
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
      var hint = byId("m395GPSArrangeHint");
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
    if (!canvas || canvas.getAttribute("data-m395-gps-drag") === "true") return;
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
    canvas.setAttribute("data-m395-gps-drag", "true");
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
    if (byId("mithrilHoleConditionsM395Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilHoleConditionsM395Styles";
    style.textContent = [
      ".m395ConditionEditButton{grid-column:1/-1;min-height:46px;background:#fff8c9;border-color:#c8a600;color:#3d3300}",
      ".m395ConditionEditButton.hidden{display:none}",
      "#m395ConditionModal{z-index:260}",
      "#m395ConditionModal .box{width:min(720px,97vw)}",
      ".m395ConditionIntro{margin:0 0 10px;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m395ConditionRows{display:grid;gap:10px}",
      ".m395ConditionRow{position:relative;display:grid;grid-template-columns:minmax(145px,1.25fr) minmax(100px,.7fr) minmax(120px,.85fr);gap:8px;padding:10px;border:1px solid #c8ad44;border-radius:11px;background:#fffbea}",
      ".m395ConditionRow label{min-width:0}",
      ".m395ConditionRow select,.m395ConditionRow input[type=number],.m395ConditionRow input[type=text]{width:100%;min-height:44px;padding:8px;border:1px solid #999;border-radius:8px;background:#fff;font-size:17px}",
      ".m395ConditionBottom{grid-column:1/3;display:flex;align-items:center;gap:9px;min-height:44px;padding:7px 9px;border:1px solid #aaa;border-radius:8px;background:#fff;font-size:14px;font-weight:900}",
      ".m395ConditionBottom input{width:25px;height:25px;min-height:25px;margin:0}",
      ".m395ConditionRemove{align-self:end;min-height:44px;background:#fff1f1;border-color:#c66}",
      ".m395ConditionOther{grid-column:1/-1}",
      ".m395ConditionOther.hidden{display:none}",
      ".m395ConditionTools{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}",
      ".m395ConditionPreview{margin-top:10px;padding:10px;border:1px solid #9f8a2d;border-radius:9px;background:#fffdf3;font-size:14px;font-weight:850;line-height:1.4;color:#342d0b}",
      ".m395ConditionActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}",
      ".m395ConditionActions button{min-height:48px}",
      "@media(max-width:620px){.m395ConditionRow{grid-template-columns:1fr 1fr}.m395ConditionRow>label:first-child{grid-column:1/-1}.m395ConditionBottom{grid-column:1/-1}.m395ConditionRemove{grid-column:1/-1}.m395ConditionActions{grid-template-columns:1fr}.m395ConditionTools{grid-template-columns:1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureHoleConditionModal() {
    var modal = byId("m395ConditionModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m395ConditionModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span id="m395ConditionTitle">Hole Conditions</span><button type="button" id="m395ConditionClose">Close</button></div>',
      '  <p class="m395ConditionIntro">Record where a loading condition begins and where competent rock resumes. These intervals are informational and never reduce Total Rock.</p>',
      '  <div id="m395ConditionRows" class="m395ConditionRows"></div>',
      '  <div class="m395ConditionTools"><button type="button" id="m395ConditionAdd">+ Add another condition</button><button type="button" id="m395ConditionClear" class="danger">Clear all</button></div>',
      '  <div id="m395ConditionPreview" class="m395ConditionPreview">No condition intervals entered.</div>',
      '  <div class="m395ConditionActions"><button type="button" class="primary" id="m395ConditionSave">Save Conditions</button><button type="button" id="m395ConditionCancel">Cancel</button><button type="button" id="m395ConditionDoneHole">Save Conditions + Hole</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);

    byId("m395ConditionClose").addEventListener("click", cancelHoleConditionModal);
    byId("m395ConditionCancel").addEventListener("click", cancelHoleConditionModal);
    byId("m395ConditionAdd").addEventListener("click", function () {
      if (conditionDraft.length >= 8) { alert("A maximum of eight condition intervals can be entered for one hole."); return; }
      conditionDraft.push({ type: "Breakthrough", other: "", start: "", end: "", toBottom: true });
      renderHoleConditionRows();
    });
    byId("m395ConditionClear").addEventListener("click", function () {
      conditionDraft = [];
      renderHoleConditionRows();
    });
    byId("m395ConditionSave").addEventListener("click", function () { saveHoleConditionModal(false); });
    byId("m395ConditionDoneHole").addEventListener("click", function () { if (saveHoleConditionModal(false)) window.saveHole(false); });
    byId("m395ConditionRows").addEventListener("input", readConditionRowsIntoDraft);
    byId("m395ConditionRows").addEventListener("change", function (event) {
      readConditionRowsIntoDraft();
      if (event.target && event.target.classList.contains("m395ConditionType")) renderHoleConditionRows();
      else updateHoleConditionPreview();
    });
    byId("m395ConditionRows").addEventListener("click", function (event) {
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
    var rows = document.querySelectorAll("#m395ConditionRows .m395ConditionRow");
    var next = [];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var type = row.querySelector(".m395ConditionType");
      var other = row.querySelector(".m395ConditionOtherInput");
      var start = row.querySelector(".m395ConditionStart");
      var end = row.querySelector(".m395ConditionEnd");
      var bottom = row.querySelector(".m395ConditionToBottom");
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
    var container = byId("m395ConditionRows");
    if (!container) return;
    var html = "";
    for (var i = 0; i < conditionDraft.length; i += 1) {
      var entry = conditionDraft[i];
      var otherClass = entry.type === "Other" ? "m395ConditionOther" : "m395ConditionOther hidden";
      html += [
        '<div class="m395ConditionRow" data-condition-index="' + i + '">',
        '  <label>Condition<select class="m395ConditionType">' + conditionOptionsHtml(entry.type) + '</select></label>',
        '  <label>Starts at (ft)<input class="m395ConditionStart" type="number" inputmode="decimal" step="0.1" min="0" value="' + String(entry.start || "") + '" /></label>',
        '  <label>Competent rock resumes (ft)<input class="m395ConditionEnd" type="number" inputmode="decimal" step="0.1" min="0" value="' + String(entry.end || "") + '"' + (entry.toBottom ? ' disabled' : '') + ' /></label>',
        '  <label class="m395ConditionBottom"><input class="m395ConditionToBottom" type="checkbox"' + (entry.toBottom ? ' checked' : '') + ' /> Continues to bottom</label>',
        '  <button type="button" class="m395ConditionRemove" data-condition-remove="' + i + '">Remove</button>',
        '  <label class="' + otherClass + '">Other condition name<input class="m395ConditionOtherInput" type="text" value="' + String(entry.other || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;") + '" /></label>',
        '</div>'
      ].join("");
    }
    if (!conditionDraft.length) html = '<div class="m395ConditionPreview">No condition intervals. Tap “Add another condition” to begin.</div>';
    container.innerHTML = html;
    updateHoleConditionPreview();
    updateConditionEditorControls();
  }

  function updateConditionEditorControls() {
    var rows = document.querySelectorAll("#m395ConditionRows .m395ConditionRow");
    for (var i = 0; i < rows.length; i += 1) {
      var bottom = rows[i].querySelector(".m395ConditionToBottom");
      var end = rows[i].querySelector(".m395ConditionEnd");
      var type = rows[i].querySelector(".m395ConditionType");
      var otherWrap = rows[i].querySelector(".m395ConditionOther");
      if (end && bottom) {
        end.disabled = bottom.checked;
        if (bottom.checked) end.value = "";
      }
      if (otherWrap && type) otherWrap.classList.toggle("hidden", type.value !== "Other");
    }
  }

  function updateHoleConditionPreview() {
    var preview = byId("m395ConditionPreview");
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
    byId("m395ConditionTitle").textContent = "Hole Conditions — " + (typeof currentHole !== "undefined" ? currentHole : "Hole");
    renderHoleConditionRows();
    byId("m395ConditionModal").classList.add("show");
    window.setTimeout(function () {
      var input = document.querySelector("#m395ConditionRows .m395ConditionStart");
      if (input) input.focus();
    }, 80);
  }

  function closeHoleConditionModal() {
    var modal = byId("m395ConditionModal");
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
    var button = byId("m395EditHoleConditions");
    var checkbox = byId("breakthrough");
    if (!button || !checkbox) return;
    var count = conditionDraft.length;
    button.classList.toggle("hidden", !checkbox.checked && !count);
    button.textContent = count ? "Edit Hole Conditions (" + count + ")" : "Add Hole Condition Details";
  }

  function installDrillHoleConditions() {
    if (window.__mithrilM395HoleConditions) return;
    var checkbox = byId("breakthrough");
    var holeBox = byId("holeBox");
    if (!checkbox || !holeBox) return;
    window.__mithrilM395HoleConditions = true;
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
    edit.id = "m395EditHoleConditions";
    edit.type = "button";
    edit.className = "m395ConditionEditButton hidden";
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
    if (window.__mithrilM395ConditionCSV || typeof window.exportCSV !== "function") return;
    window.__mithrilM395ConditionCSV = true;
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
    if (window.__mithrilM395DrillSummaryPatched) return;
    if (typeof window.getDrillSummary !== "function" || typeof window.renderDrillSummaryCanvas !== "function") return;
    window.__mithrilM395DrillSummaryPatched = true;

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
    if (window.__mithrilM395DrillNotesPatched) return;
    if (typeof window.collectNoteEntries !== "function" || typeof window.renderNotesCanvases !== "function") return;
    window.__mithrilM395DrillNotesPatched = true;

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



  // ---------------------------------------------------------------------------
  // m39.5 Drill Log selection, clipboard, and cross-page transform engine.
  // This mirrors the proven Shot Diagram workflow while using the Drill Log's
  // zero-based row/column coordinates and cached page renderer.
  // ---------------------------------------------------------------------------

  var drillEditMode = false;
  var drillEditSelectMode = "hole";
  var drillEditSelection = {};
  var drillEditClipboard = null;
  var drillEditPasteArmed = false;
  var drillEditUndoHistory = [];
  var drillEditPointerStarts = {};
  var drillEditTouchStart = null;
  var drillEditQuickWasEnabled = false;

  function drillEditKey(pageNum, holeId) {
    return String(pageNum) + "|" + String(holeId);
  }

  function drillRecordHasData(record) {
    if (!record) return false;
    try { if (typeof holeHasSavedData === "function" && holeHasSavedData(record)) return true; } catch (error) {}
    try { return rowHasGPS(record); } catch (error2) { return false; }
  }

  function drillEditSelectionList() {
    return Object.keys(drillEditSelection).map(function (key) { return drillEditSelection[key]; });
  }

  function drillPageGrid(pageNum, metaSource) {
    var source = metaSource || pageMeta || {};
    var meta = source[String(pageNum)];
    if (meta) {
      return {
        gx: isFinite(Number(meta.gx)) ? Number(meta.gx) : 0,
        gy: isFinite(Number(meta.gy)) ? Number(meta.gy) : 0
      };
    }
    return { gx: Math.max(0, Number(pageNum || 1) - 1), gy: 0 };
  }

  function drillFindPageAtGrid(gx, gy, metaSource, pageSource) {
    var meta = metaSource || pageMeta || {};
    var pages = pageSource || pagesData || {};
    var seen = {};
    var keys = Object.keys(meta).concat(Object.keys(pages));
    for (var i = 0; i < keys.length; i += 1) {
      var key = String(keys[i]);
      if (seen[key]) continue;
      seen[key] = true;
      var pageNum = Number(key);
      var grid = drillPageGrid(pageNum, meta);
      if (grid.gx === gx && grid.gy === gy) return pageNum;
    }
    return null;
  }

  function drillLocationToGlobal(pageNum, holeId, metaSource) {
    var pos = parseHoleID(holeId);
    var grid = drillPageGrid(pageNum, metaSource);
    return {
      row: grid.gy * ROWS + Number(pos.row),
      col: grid.gx * COLS + Number(pos.col)
    };
  }

  function drillGlobalToGrid(globalRow, globalCol) {
    var gy = Math.floor(globalRow / ROWS);
    var gx = Math.floor(globalCol / COLS);
    return {
      gx: gx,
      gy: gy,
      row: globalRow - gy * ROWS,
      col: globalCol - gx * COLS
    };
  }

  function drillNextPageNumber(pageSource) {
    var keys = Object.keys(pageSource || {}).map(Number);
    return keys.length ? Math.max.apply(Math, keys) + 1 : 1;
  }

  function drillEnsurePageAtGrid(gx, gy, pageSource, metaSource, counter) {
    var existing = drillFindPageAtGrid(gx, gy, metaSource, pageSource);
    if (existing !== null) return existing;
    var pageNum = counter.next;
    counter.next += 1;
    pageSource[String(pageNum)] = {};
    metaSource[String(pageNum)] = { gx: gx, gy: gy, name: "Page " + pageNum };
    return pageNum;
  }

  function drillGlobalDestination(globalRow, globalCol, pageSource, metaSource, counter) {
    var grid = drillGlobalToGrid(globalRow, globalCol);
    var pageNum = drillEnsurePageAtGrid(grid.gx, grid.gy, pageSource, metaSource, counter);
    return { pageNum: pageNum, holeId: holeID(grid.row, grid.col), row: grid.row, col: grid.col };
  }

  function drillEditSortedSelection() {
    return drillEditSelectionList().sort(function (a, b) {
      var ga = drillLocationToGlobal(a.pageNum, a.holeId);
      var gb = drillLocationToGlobal(b.pageNum, b.holeId);
      return ga.row - gb.row || ga.col - gb.col;
    });
  }

  function drillRecordExists(pageNum, holeId, pageSource) {
    var source = pageSource || pagesData || {};
    return drillRecordHasData((source[String(pageNum)] || {})[holeId]);
  }

  function drillStripCopiedGPS(record) {
    delete record.GPSLatitude;
    delete record.GPSLongitude;
    delete record.GPSCalloutX;
    delete record.GPSCalloutY;
    return record;
  }

  function drillPrepareMovedRecord(record, pageNum, holeId, isCopy) {
    var next = deepClone(record || {});
    if (isCopy) drillStripCopiedGPS(next);
    else {
      delete next.GPSCalloutX;
      delete next.GPSCalloutY;
    }
    next.PageNumber = Number(pageNum);
    next.HoleID = String(holeId);
    if (isCopy) next.Timestamp = new Date().toLocaleString();
    return next;
  }

  function drillPersistEditedState() {
    try { if (typeof invalidatePageCache === "function") invalidatePageCache(); } catch (error) {}
    try { if (typeof saveState === "function") saveState(); } catch (error2) {}
    try { if (typeof markDirty === "function") markDirty(); } catch (error3) {}
    try { if (typeof refreshPageSelect === "function") refreshPageSelect(); } catch (error4) {}
    try { if (typeof updateStatus === "function") updateStatus(); } catch (error5) {}
  }

  function drillPushUndo(label) {
    drillEditUndoHistory.push({
      label: label,
      pagesData: deepClone(pagesData),
      pageMeta: deepClone(pageMeta),
      currentPage: Number(currentPage),
      selection: deepClone(drillEditSelection)
    });
    if (drillEditUndoHistory.length > 10) drillEditUndoHistory.shift();
  }

  function drillUndoLastEdit() {
    if (!drillEditUndoHistory.length) {
      drillEditSetHint("Nothing to undo yet.");
      return;
    }
    var snapshot = drillEditUndoHistory.pop();
    pagesData = deepClone(snapshot.pagesData);
    pageMeta = deepClone(snapshot.pageMeta);
    currentPage = Number(snapshot.currentPage);
    if (!pagesData[String(currentPage)]) currentPage = getPageNumbers()[0] || 1;
    drillEditSelection = deepClone(snapshot.selection || {});
    drillEditClipboard = null;
    drillEditPasteArmed = false;
    drillPersistEditedState();
    draw();
    drillEditSetHint("Undid: " + snapshot.label + ".");
  }

  function drillEditSetHint(message) {
    var hint = byId("m395DrillEditHint");
    if (hint) hint.textContent = message || "";
    drillUpdateEditBar();
  }

  function drillSelectionDescription() {
    var count = drillEditSelectionList().length;
    var clipboardCount = drillEditClipboard && drillEditClipboard.items ? drillEditClipboard.items.length : 0;
    var text = count + " selected";
    if (drillEditPasteArmed) text += " — tap a destination hole";
    else if (clipboardCount) text += " — " + (drillEditClipboard.mode === "cut" ? "cut" : "copied") + " " + clipboardCount;
    return text;
  }

  function drillUpdateEditBar() {
    var count = drillEditSelectionList().length;
    var status = byId("m395DrillEditStatus");
    if (status) status.textContent = drillSelectionDescription();
    var modes = ["hole", "row", "column"];
    for (var i = 0; i < modes.length; i += 1) {
      var button = byId("m395DrillMode" + modes[i].charAt(0).toUpperCase() + modes[i].slice(1));
      if (button) button.classList.toggle("active", drillEditSelectMode === modes[i]);
    }
    var hasSelection = count > 0;
    var copyButton = byId("m395DrillCopy");
    var cutButton = byId("m395DrillCut");
    var pasteButton = byId("m395DrillPaste");
    if (copyButton) copyButton.disabled = !hasSelection;
    if (cutButton) cutButton.disabled = !hasSelection;
    if (pasteButton) pasteButton.disabled = !(drillEditClipboard && drillEditClipboard.items && drillEditClipboard.items.length);
    var bar = byId("m395DrillEditBar");
    var arrows = bar ? bar.querySelectorAll("[data-m395-drill-shift]") : [];
    for (var a = 0; a < arrows.length; a += 1) arrows[a].disabled = !hasSelection;
    var undoButton = byId("m395DrillUndo");
    if (undoButton) undoButton.disabled = !drillEditUndoHistory.length;
  }

  function injectDrillEditStyles() {
    if (byId("mithrilDrillEditM395Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilDrillEditM395Styles";
    style.textContent = [
      ".m395DrillEditBar{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:245;background:rgba(255,255,255,.985);border:2px solid #8a4fff;border-radius:13px;padding:8px;box-shadow:0 6px 22px rgba(0,0,0,.42);gap:7px}",
      ".m395DrillEditBar.show{display:grid}",
      ".m395DrillEditHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}",
      ".m395DrillEditTitle{font-size:14px;font-weight:950;color:#222}",
      ".m395DrillEditStatus{font-size:12px;font-weight:850;color:#5d3b96;margin-top:2px}",
      ".m395DrillEditModes,.m395DrillEditActions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}",
      ".m395DrillEditModes button,.m395DrillEditActions button{min-height:43px;padding:5px;font-size:13px}",
      ".m395DrillEditModes button.active{background:#8a4fff;color:#fff;border-color:#6f35da}",
      ".m395DrillEditDirections{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}",
      ".m395DrillEditDirections button{min-height:45px;font-size:18px;padding:4px}",
      ".m395DrillEditHint{min-height:17px;font-size:11px;line-height:1.25;font-weight:800;color:#444}",
      ".m395DrillEditDone{min-width:76px;background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "@media(max-width:520px){.m395DrillEditModes,.m395DrillEditActions{grid-template-columns:repeat(2,1fr)}.m395DrillEditDirections{grid-template-columns:repeat(5,1fr)}.m395DrillEditDirections button{font-size:17px}.m395DrillEditHead{grid-template-columns:1fr auto}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureDrillEditBar() {
    var bar = byId("m395DrillEditBar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "m395DrillEditBar";
    bar.className = "m395DrillEditBar";
    bar.innerHTML = [
      '<div class="m395DrillEditHead">',
      '  <div><div class="m395DrillEditTitle">Edit Drill Holes</div><div id="m395DrillEditStatus" class="m395DrillEditStatus">0 selected</div></div>',
      '  <button type="button" id="m395DrillEditDone" class="m395DrillEditDone">Done</button>',
      '</div>',
      '<div class="m395DrillEditModes">',
      '  <button type="button" id="m395DrillModeHole">Hole</button>',
      '  <button type="button" id="m395DrillModeRow">Row</button>',
      '  <button type="button" id="m395DrillModeColumn">Column</button>',
      '  <button type="button" id="m395DrillSelectAll">All Page</button>',
      '</div>',
      '<div class="m395DrillEditActions">',
      '  <button type="button" id="m395DrillCopy">Copy</button>',
      '  <button type="button" id="m395DrillCut">Cut</button>',
      '  <button type="button" id="m395DrillPaste">Paste</button>',
      '  <button type="button" id="m395DrillClearSelection">Clear Selection</button>',
      '</div>',
      '<div class="m395DrillEditDirections">',
      '  <button type="button" data-m395-drill-shift="left" aria-label="Shift left">←</button>',
      '  <button type="button" data-m395-drill-shift="up" aria-label="Shift up">↑</button>',
      '  <button type="button" id="m395DrillUndo" aria-label="Undo">↶</button>',
      '  <button type="button" data-m395-drill-shift="down" aria-label="Shift down">↓</button>',
      '  <button type="button" data-m395-drill-shift="right" aria-label="Shift right">→</button>',
      '</div>',
      '<div id="m395DrillEditHint" class="m395DrillEditHint">Tap saved holes to select them. Pan and pinch zoom still work.</div>'
    ].join("");
    document.body.appendChild(bar);

    byId("m395DrillEditDone").addEventListener("click", finishDrillEditMode);
    byId("m395DrillModeHole").addEventListener("click", function () { drillSetSelectionMode("hole"); });
    byId("m395DrillModeRow").addEventListener("click", function () { drillSetSelectionMode("row"); });
    byId("m395DrillModeColumn").addEventListener("click", function () { drillSetSelectionMode("column"); });
    byId("m395DrillSelectAll").addEventListener("click", drillSelectAllCurrentPage);
    byId("m395DrillCopy").addEventListener("click", function () { drillBuildClipboard("copy"); });
    byId("m395DrillCut").addEventListener("click", function () { drillBuildClipboard("cut"); });
    byId("m395DrillPaste").addEventListener("click", drillArmPaste);
    byId("m395DrillClearSelection").addEventListener("click", function () {
      drillEditSelection = {};
      drillEditPasteArmed = false;
      draw();
      drillEditSetHint("Selection cleared.");
    });
    byId("m395DrillUndo").addEventListener("click", drillUndoLastEdit);
    var arrows = bar.querySelectorAll("[data-m395-drill-shift]");
    for (var i = 0; i < arrows.length; i += 1) {
      arrows[i].addEventListener("click", function () { drillShiftSelection(this.getAttribute("data-m395-drill-shift")); });
    }
    return bar;
  }

  function pauseQuickForDrillEdit() {
    drillEditQuickWasEnabled = false;
    try {
      if (typeof quick !== "undefined") {
        drillEditQuickWasEnabled = !!quick.enabled;
        quick.enabled = false;
        if (typeof saveState === "function") saveState();
        if (typeof updateQuickBar === "function") updateQuickBar();
      }
    } catch (error) {}
  }

  function resumeQuickAfterDrillEdit() {
    try {
      if (typeof quick !== "undefined") {
        quick.enabled = !!drillEditQuickWasEnabled;
        if (typeof saveState === "function") saveState();
        if (typeof updateQuickBar === "function") updateQuickBar();
      }
    } catch (error) {}
    drillEditQuickWasEnabled = false;
  }

  function startDrillEditMode() {
    if (drillEditMode) return;
    try { if (gpsArrangeMode && typeof finishGPSArrange === "function") finishGPSArrange(); } catch (error) {}
    try { if (typeof hidePad === "function") hidePad(); } catch (error2) {}
    drillEditMode = true;
    drillEditSelectMode = "hole";
    drillEditSelection = {};
    drillEditClipboard = null;
    drillEditPasteArmed = false;
    pauseQuickForDrillEdit();
    closeMenu();
    var bar = ensureDrillEditBar();
    bar.classList.add("show");
    drillEditSetHint("Tap saved holes to select them. Use Row, Column, or All Page for groups.");
    draw();
  }

  function finishDrillEditMode() {
    drillEditMode = false;
    drillEditSelection = {};
    drillEditClipboard = null;
    drillEditPasteArmed = false;
    drillEditPointerStarts = {};
    drillEditTouchStart = null;
    var bar = byId("m395DrillEditBar");
    if (bar) bar.classList.remove("show");
    resumeQuickAfterDrillEdit();
    draw();
  }

  function drillSetSelectionMode(mode) {
    drillEditSelectMode = mode;
    drillEditPasteArmed = false;
    drillEditSetHint("Selection mode: " + (mode === "column" ? "Column" : mode.charAt(0).toUpperCase() + mode.slice(1)) + ". Tap a saved hole.");
  }

  function drillToggleSelectionEntry(pageNum, holeId) {
    var key = drillEditKey(pageNum, holeId);
    if (drillEditSelection[key]) delete drillEditSelection[key];
    else drillEditSelection[key] = { pageNum: Number(pageNum), holeId: String(holeId) };
  }

  function drillToggleGroup(pageNum, holeIds) {
    if (!holeIds.length) return;
    var allSelected = true;
    for (var i = 0; i < holeIds.length; i += 1) {
      if (!drillEditSelection[drillEditKey(pageNum, holeIds[i])]) { allSelected = false; break; }
    }
    for (var j = 0; j < holeIds.length; j += 1) {
      var key = drillEditKey(pageNum, holeIds[j]);
      if (allSelected) delete drillEditSelection[key];
      else drillEditSelection[key] = { pageNum: Number(pageNum), holeId: String(holeIds[j]) };
    }
  }

  function drillMakePageActive(pageNum) {
    if (Number(pageNum) === Number(currentPage)) return;
    try { if (typeof switchPage === "function") switchPage(Number(pageNum), false); }
    catch (error) {
      currentPage = Number(pageNum);
      if (!pagesData[String(currentPage)]) pagesData[String(currentPage)] = {};
      try { refreshPageSelect(); } catch (error2) {}
    }
  }

  function drillHandleSelectionTap(hit) {
    drillMakePageActive(hit.pageNum);
    var data = pagesData[String(hit.pageNum)] || {};
    if (drillEditSelectMode === "hole") {
      if (!drillRecordHasData(data[hit.holeId])) {
        drillEditSetHint("Hole " + hit.holeId + " has no saved data to select.");
        return;
      }
      drillToggleSelectionEntry(hit.pageNum, hit.holeId);
    } else {
      var target = parseHoleID(hit.holeId);
      var ids = Object.keys(data).filter(function (id) {
        if (!drillRecordHasData(data[id])) return false;
        var pos = parseHoleID(id);
        return drillEditSelectMode === "row" ? pos.row === target.row : pos.col === target.col;
      });
      if (!ids.length) {
        drillEditSetHint("That " + drillEditSelectMode + " has no saved holes.");
        return;
      }
      drillToggleGroup(hit.pageNum, ids);
    }
    drillEditPasteArmed = false;
    draw();
    drillEditSetHint(drillSelectionDescription() + ".");
  }

  function drillSelectAllCurrentPage() {
    var data = pagesData[String(currentPage)] || {};
    var ids = Object.keys(data).filter(function (id) { return drillRecordHasData(data[id]); });
    if (!ids.length) {
      drillEditSetHint("Page " + currentPage + " has no saved holes.");
      return;
    }
    drillEditSelection = {};
    for (var i = 0; i < ids.length; i += 1) {
      drillEditSelection[drillEditKey(currentPage, ids[i])] = { pageNum: Number(currentPage), holeId: ids[i] };
    }
    drillEditPasteArmed = false;
    draw();
    drillEditSetHint("Selected all " + ids.length + " saved holes on Page " + currentPage + ".");
  }

  function drillBuildClipboard(mode) {
    var selected = drillEditSortedSelection();
    if (!selected.length) {
      drillEditSetHint("Select at least one saved hole first.");
      return;
    }
    var globals = selected.map(function (entry) { return drillLocationToGlobal(entry.pageNum, entry.holeId); });
    var minRow = Math.min.apply(Math, globals.map(function (g) { return g.row; }));
    var minCol = Math.min.apply(Math, globals.map(function (g) { return g.col; }));
    var items = [];
    for (var i = 0; i < selected.length; i += 1) {
      var source = selected[i];
      var record = (pagesData[String(source.pageNum)] || {})[source.holeId];
      if (!drillRecordHasData(record)) continue;
      items.push({
        dr: globals[i].row - minRow,
        dc: globals[i].col - minCol,
        record: deepClone(record),
        sourcePageNum: Number(source.pageNum),
        sourceHoleId: String(source.holeId)
      });
    }
    drillEditClipboard = { mode: mode, items: items };
    drillEditPasteArmed = false;
    draw();
    drillEditSetHint((mode === "cut" ? "Cut" : "Copied") + " " + items.length + " hole" + (items.length === 1 ? "" : "s") + ". Tap Paste, then tap the new top-left anchor hole.");
  }

  function drillArmPaste() {
    if (!drillEditClipboard || !drillEditClipboard.items || !drillEditClipboard.items.length) {
      drillEditSetHint("Copy or cut holes before pasting.");
      return;
    }
    drillEditPasteArmed = true;
    drillEditSetHint("Paste armed — tap the destination for the selection's top-left anchor.");
  }

  function drillCollisionMessage(collisions) {
    return collisions.slice(0, 12).map(function (entry) { return "Page " + entry.pageNum + " " + entry.holeId; }).join(", ") + (collisions.length > 12 ? " …" : "");
  }

  function drillCommitWorkingState(workingPages, workingMeta, destinations, label) {
    pagesData = workingPages;
    pageMeta = workingMeta;
    if (destinations.length) currentPage = Number(destinations[0].pageNum);
    if (!pagesData[String(currentPage)]) pagesData[String(currentPage)] = {};
    drillEditSelection = {};
    for (var i = 0; i < destinations.length; i += 1) {
      drillEditSelection[drillEditKey(destinations[i].pageNum, destinations[i].holeId)] = {
        pageNum: Number(destinations[i].pageNum),
        holeId: String(destinations[i].holeId)
      };
    }
    drillPersistEditedState();
    draw();
    drillEditSetHint(label + " — " + destinations.length + " hole" + (destinations.length === 1 ? "" : "s") + ".");
  }

  function drillShiftSelection(direction) {
    var selected = drillEditSortedSelection();
    if (!selected.length) {
      drillEditSetHint("Select at least one saved hole first.");
      return;
    }
    var dr = 0, dc = 0;
    if (direction === "up") dr = -1;
    if (direction === "down") dr = 1;
    if (direction === "left") dc = -1;
    if (direction === "right") dc = 1;

    var workingPages = deepClone(pagesData);
    var workingMeta = deepClone(pageMeta);
    var counter = { next: drillNextPageNumber(workingPages) };
    var sourceKeys = {};
    var moves = [];
    for (var i = 0; i < selected.length; i += 1) {
      var source = selected[i];
      var record = (pagesData[String(source.pageNum)] || {})[source.holeId];
      if (!drillRecordHasData(record)) continue;
      sourceKeys[drillEditKey(source.pageNum, source.holeId)] = true;
      var global = drillLocationToGlobal(source.pageNum, source.holeId, workingMeta);
      var destination = drillGlobalDestination(global.row + dr, global.col + dc, workingPages, workingMeta, counter);
      moves.push({ source: source, destination: destination, record: record });
    }

    var collisions = [];
    for (var c = 0; c < moves.length; c += 1) {
      var dest = moves[c].destination;
      if (drillRecordExists(dest.pageNum, dest.holeId, workingPages) && !sourceKeys[drillEditKey(dest.pageNum, dest.holeId)]) collisions.push(dest);
    }
    if (collisions.length && !confirm("The move would replace " + collisions.length + " occupied destination hole(s):\n\n" + drillCollisionMessage(collisions) + "\n\nReplace the existing data?")) {
      drillEditSetHint("Move canceled. No data changed.");
      return;
    }

    drillPushUndo("shift selection " + direction);
    for (var d = 0; d < moves.length; d += 1) delete workingPages[String(moves[d].source.pageNum)][moves[d].source.holeId];
    var destinations = [];
    for (var m = 0; m < moves.length; m += 1) {
      var move = moves[m];
      if (!workingPages[String(move.destination.pageNum)]) workingPages[String(move.destination.pageNum)] = {};
      workingPages[String(move.destination.pageNum)][move.destination.holeId] = drillPrepareMovedRecord(move.record, move.destination.pageNum, move.destination.holeId, false);
      destinations.push(move.destination);
    }
    drillEditClipboard = null;
    drillEditPasteArmed = false;
    drillCommitWorkingState(workingPages, workingMeta, destinations, "Shifted " + direction);
  }

  function drillPasteAt(hit) {
    if (!drillEditClipboard || !drillEditClipboard.items || !drillEditClipboard.items.length) return;
    drillMakePageActive(hit.pageNum);
    var anchor = drillLocationToGlobal(hit.pageNum, hit.holeId);
    var workingPages = deepClone(pagesData);
    var workingMeta = deepClone(pageMeta);
    var counter = { next: drillNextPageNumber(workingPages) };
    var sourceKeys = {};
    if (drillEditClipboard.mode === "cut") {
      for (var s = 0; s < drillEditClipboard.items.length; s += 1) {
        var sourceItem = drillEditClipboard.items[s];
        sourceKeys[drillEditKey(sourceItem.sourcePageNum, sourceItem.sourceHoleId)] = true;
      }
    }

    var placements = [];
    for (var i = 0; i < drillEditClipboard.items.length; i += 1) {
      var item = drillEditClipboard.items[i];
      var destination = drillGlobalDestination(anchor.row + item.dr, anchor.col + item.dc, workingPages, workingMeta, counter);
      placements.push({ item: item, destination: destination });
    }

    var collisions = [];
    for (var c = 0; c < placements.length; c += 1) {
      var dest = placements[c].destination;
      if (drillRecordExists(dest.pageNum, dest.holeId, workingPages) && !sourceKeys[drillEditKey(dest.pageNum, dest.holeId)]) collisions.push(dest);
    }
    if (collisions.length && !confirm("Paste would replace " + collisions.length + " occupied destination hole(s):\n\n" + drillCollisionMessage(collisions) + "\n\nReplace the existing data?")) {
      drillEditSetHint("Paste canceled. No data changed.");
      return;
    }

    drillPushUndo(drillEditClipboard.mode + " and paste");
    if (drillEditClipboard.mode === "cut") {
      for (var d = 0; d < drillEditClipboard.items.length; d += 1) {
        var cutItem = drillEditClipboard.items[d];
        if (workingPages[String(cutItem.sourcePageNum)]) delete workingPages[String(cutItem.sourcePageNum)][cutItem.sourceHoleId];
      }
    }

    var destinations = [];
    for (var p = 0; p < placements.length; p += 1) {
      var placement = placements[p];
      var isCopy = drillEditClipboard.mode === "copy";
      if (!workingPages[String(placement.destination.pageNum)]) workingPages[String(placement.destination.pageNum)] = {};
      workingPages[String(placement.destination.pageNum)][placement.destination.holeId] = drillPrepareMovedRecord(
        placement.item.record,
        placement.destination.pageNum,
        placement.destination.holeId,
        isCopy
      );
      destinations.push(placement.destination);
    }

    var label = drillEditClipboard.mode === "cut" ? "Moved selection" : "Pasted copy";
    if (drillEditClipboard.mode === "cut") drillEditClipboard = null;
    drillEditPasteArmed = false;
    drillCommitWorkingState(workingPages, workingMeta, destinations, label);
  }

  function drawDrillEditOverlay() {
    if (!drillEditMode || !ctx || !view) return;
    var selected = drillEditSelectionList();
    if (!selected.length) return;
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    for (var i = 0; i < selected.length; i += 1) {
      var entry = selected[i];
      var pos = parseHoleID(entry.holeId);
      var center = holeCenter(pos.row, pos.col);
      var origin = pageOrigin(entry.pageNum);
      ctx.save();
      ctx.translate(origin.x, origin.y);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, 27, 25, 0, 0, Math.PI * 2);
      ctx.fillStyle = drillEditClipboard && drillEditClipboard.mode === "cut" ? "rgba(255,145,0,.20)" : "rgba(138,79,255,.18)";
      ctx.strokeStyle = drillEditClipboard && drillEditClipboard.mode === "cut" ? "#e57900" : "#8a4fff";
      ctx.lineWidth = Math.max(3, 5 / Math.max(.08, view.scale));
      if (drillEditClipboard && drillEditClipboard.mode === "cut") ctx.setLineDash([12 / view.scale, 7 / view.scale]);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function patchDrillEditDrawing() {
    if (window.__mithrilM395DrillEditDrawing) return;
    window.__mithrilM395DrillEditDrawing = true;
    var originalDrawNow = window.drawNow;
    if (typeof originalDrawNow !== "function") return;
    window.drawNow = function () {
      var result = originalDrawNow.apply(this, arguments);
      drawDrillEditOverlay();
      return result;
    };
  }

  function drillHandleEditPoint(point) {
    var world = screenToWorld(point.x, point.y);
    var hit = hitTestWorld(world.x, world.y);
    if (!hit) {
      drillEditSetHint("Tap inside a hole circle.");
      return;
    }
    if (drillEditPasteArmed) drillPasteAt(hit);
    else drillHandleSelectionTap(hit);
  }

  function installDrillEditInteraction(canvas) {
    if (!canvas || canvas.getAttribute("data-m395-drill-edit") === "true") return;
    canvas.setAttribute("data-m395-drill-edit", "true");

    if ("PointerEvent" in window) {
      canvas.addEventListener("pointerdown", function (event) {
        if (!drillEditMode) return;
        var point = preciseCanvasPoint(event, canvas);
        drillEditPointerStarts[String(event.pointerId)] = { x: point.x, y: point.y, moved: false };
      }, true);

      canvas.addEventListener("pointermove", function (event) {
        if (!drillEditMode) return;
        var start = drillEditPointerStarts[String(event.pointerId)];
        if (!start) return;
        var point = preciseCanvasPoint(event, canvas);
        if (Math.abs(point.x - start.x) > 7 || Math.abs(point.y - start.y) > 7) start.moved = true;
      }, true);

      canvas.addEventListener("pointerup", function (event) {
        if (!drillEditMode) return;
        var key = String(event.pointerId);
        var start = drillEditPointerStarts[key];
        delete drillEditPointerStarts[key];
        if (!start || start.moved) return;
        try { if (typeof gesture !== "undefined" && gesture) gesture.moved = true; } catch (error) {}
        drillHandleEditPoint(preciseCanvasPoint(event, canvas));
      }, true);

      canvas.addEventListener("pointercancel", function (event) {
        delete drillEditPointerStarts[String(event.pointerId)];
      }, true);
    }

    canvas.addEventListener("touchstart", function (event) {
      if (!drillEditMode || ("PointerEvent" in window)) return;
      if (!event.touches || event.touches.length !== 1) {
        drillEditTouchStart = null;
        return;
      }
      var point = preciseCanvasPoint(event, canvas);
      drillEditTouchStart = { x: point.x, y: point.y, moved: false };
    }, true);

    canvas.addEventListener("touchmove", function (event) {
      if (!drillEditMode || ("PointerEvent" in window) || !drillEditTouchStart) return;
      if (!event.touches || event.touches.length !== 1) {
        drillEditTouchStart.moved = true;
        return;
      }
      var point = preciseCanvasPoint(event, canvas);
      if (Math.abs(point.x - drillEditTouchStart.x) > 7 || Math.abs(point.y - drillEditTouchStart.y) > 7) drillEditTouchStart.moved = true;
    }, true);

    canvas.addEventListener("touchend", function (event) {
      if (!drillEditMode || ("PointerEvent" in window)) return;
      var start = drillEditTouchStart;
      drillEditTouchStart = null;
      if (!start || start.moved || (event.touches && event.touches.length)) return;
      try { if (typeof gesture !== "undefined" && gesture) gesture.moved = true; } catch (error) {}
      drillHandleEditPoint(preciseCanvasPoint(event, canvas));
    }, true);

    canvas.addEventListener("touchcancel", function () { drillEditTouchStart = null; }, true);
  }

  function installDrillEditFeature(canvas) {
    injectDrillEditStyles();
    ensureDrillEditBar();
    patchDrillEditDrawing();
    installDrillEditInteraction(canvas);
    window.startDrillEditMode = startDrillEditMode;
    window.finishDrillEditMode = finishDrillEditMode;
  }


  // ---------------------------------------------------------------------------
  // m39 Shot Diagram selection, clipboard, and cross-page transform engine.
  // The stable m34 core remains intact; this engine intercepts taps only while
  // Edit Holes mode is active and treats the page layout as one continuous grid.
  // ---------------------------------------------------------------------------

  var shotEditMode = false;
  var shotEditSelectMode = "hole";
  var shotEditSelection = {};
  var shotEditClipboard = null;
  var shotEditPasteArmed = false;
  var shotEditUndoHistory = [];
  var shotEditPointerStarts = {};
  var shotEditQuickWasEnabled = false;

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function shotEditKey(pageNum, holeId) {
    return String(pageNum) + "|" + String(holeId);
  }

  function shotEditSelectionList() {
    return Object.keys(shotEditSelection).map(function (key) { return shotEditSelection[key]; });
  }

  function shotEditSortedSelection() {
    return shotEditSelectionList().sort(function (a, b) {
      var ga = shotLocationToGlobal(a.pageNum, a.holeId);
      var gb = shotLocationToGlobal(b.pageNum, b.holeId);
      return ga.row - gb.row || ga.col - gb.col;
    });
  }

  function shotPageGrid(pageNum, metaSource) {
    var source = metaSource || pageMeta || {};
    var meta = source[String(pageNum)];
    if (meta) {
      return {
        gx: isFinite(Number(meta.gx)) ? Number(meta.gx) : 0,
        gy: isFinite(Number(meta.gy)) ? Number(meta.gy) : 0
      };
    }
    // Very old backups may not include page metadata. Keep Page 1 at the
    // origin and place additional pages horizontally until metadata is saved.
    return { gx: Math.max(0, Number(pageNum || 1) - 1), gy: 0 };
  }

  function shotFindPageAtGrid(gx, gy, metaSource) {
    var source = metaSource || pageMeta || {};
    var keys = Object.keys(source);
    for (var i = 0; i < keys.length; i += 1) {
      var pageNum = Number(keys[i]);
      var grid = shotPageGrid(pageNum, source);
      if (grid.gx === gx && grid.gy === gy) return pageNum;
    }
    return null;
  }

  function shotLocationToGlobal(pageNum, holeId, metaSource) {
    var pos = parseHoleID(holeId);
    var grid = shotPageGrid(pageNum, metaSource);
    return {
      row: grid.gy * ROWS + (Number(pos.row) - 1),
      col: grid.gx * COLS + (Number(pos.col) - 1)
    };
  }

  function shotGlobalToGrid(globalRow, globalCol) {
    var gy = Math.floor(globalRow / ROWS);
    var gx = Math.floor(globalCol / COLS);
    return {
      gx: gx,
      gy: gy,
      row: globalRow - gy * ROWS + 1,
      col: globalCol - gx * COLS + 1
    };
  }

  function shotNextPageNumber(pageSource) {
    var keys = Object.keys(pageSource || {}).map(Number);
    return keys.length ? Math.max.apply(Math, keys) + 1 : 1;
  }

  function shotEnsurePageAtGrid(gx, gy, pageSource, metaSource, counter) {
    var existing = shotFindPageAtGrid(gx, gy, metaSource);
    if (existing !== null) return existing;
    var pageNum = counter.next;
    counter.next += 1;
    pageSource[String(pageNum)] = {};
    metaSource[String(pageNum)] = { gx: gx, gy: gy, name: "Page " + pageNum };
    return pageNum;
  }

  function shotGlobalDestination(globalRow, globalCol, pageSource, metaSource, counter) {
    var grid = shotGlobalToGrid(globalRow, globalCol);
    var pageNum = shotEnsurePageAtGrid(grid.gx, grid.gy, pageSource, metaSource, counter);
    return { pageNum: pageNum, holeId: holeID(grid.row, grid.col), row: grid.row, col: grid.col };
  }

  function shotRecordExists(pageNum, holeId, pageSource) {
    var source = pageSource || pagesData || {};
    var data = source[String(pageNum)] || {};
    return !!data[holeId];
  }

  function shotStripCopiedGPS(record) {
    delete record.GPSLatitude;
    delete record.GPSLongitude;
    delete record.GPSCalloutX;
    delete record.GPSCalloutY;
    return record;
  }

  function shotPrepareMovedRecord(record, pageNum, holeId, isCopy) {
    var next = deepClone(record || {});
    if (isCopy) shotStripCopiedGPS(next);
    else {
      // Coordinates move with a corrected hole. Reset only the visual callout
      // placement so it defaults near the new cell instead of staying stranded.
      delete next.GPSCalloutX;
      delete next.GPSCalloutY;
    }
    next.PageNumber = Number(pageNum);
    next.HoleID = String(holeId);
    if (typeof headerData !== "undefined" && headerData) {
      next.FieldDate = typeof formatShotDate === "function" ? (formatShotDate(headerData.FieldDate) || "") : (headerData.FieldDate || "");
      next.ShotID = headerData.ShotID || "";
      next.JobName = headerData.JobName || "";
      next.Blaster = headerData.Blaster || "";
      next.EnteredBy = headerData.EnteredByDefault || next.EnteredBy || "";
    }
    if (isCopy) next.Timestamp = new Date().toLocaleString();
    return next;
  }

  function shotPersistEditedState() {
    try {
      localStorage.setItem("mithrilCanvasPagesM01", JSON.stringify(pagesData));
      localStorage.setItem("mithrilCanvasPageMetaM03", JSON.stringify(pageMeta));
    } catch (error) {}
    try { if (typeof savePageMeta === "function") savePageMeta(); } catch (error2) {}
    try { if (typeof saveData === "function") saveData(); } catch (error3) {}
    try { if (typeof markDirty === "function") markDirty(); } catch (error4) {}
    try { if (typeof refreshPageSelect === "function") refreshPageSelect(); } catch (error5) {}
    try { if (typeof updateStatus === "function") updateStatus(); } catch (error6) {}
  }

  function shotPushUndo(label) {
    shotEditUndoHistory.push({
      label: label,
      pagesData: deepClone(pagesData),
      pageMeta: deepClone(pageMeta),
      currentPage: Number(currentPage),
      selection: deepClone(shotEditSelection)
    });
    if (shotEditUndoHistory.length > 10) shotEditUndoHistory.shift();
  }

  function shotUndoLastEdit() {
    if (!shotEditUndoHistory.length) {
      shotEditSetHint("Nothing to undo yet.");
      return;
    }
    var snapshot = shotEditUndoHistory.pop();
    pagesData = deepClone(snapshot.pagesData);
    pageMeta = deepClone(snapshot.pageMeta);
    currentPage = Number(snapshot.currentPage);
    if (!pagesData[String(currentPage)]) currentPage = getPageNumbers()[0] || 1;
    holeData = pagesData[String(currentPage)] || {};
    shotEditSelection = deepClone(snapshot.selection || {});
    shotEditClipboard = null;
    shotEditPasteArmed = false;
    shotPersistEditedState();
    draw();
    shotEditSetHint("Undid: " + snapshot.label + ".");
  }

  function shotEditSetHint(message) {
    var hint = byId("m395ShotEditHint");
    if (hint) hint.textContent = message || "";
    shotUpdateEditBar();
  }

  function shotSelectionDescription() {
    var count = shotEditSelectionList().length;
    var clipboardCount = shotEditClipboard && shotEditClipboard.items ? shotEditClipboard.items.length : 0;
    var text = count + " selected";
    if (shotEditPasteArmed) text += " — tap a destination hole";
    else if (clipboardCount) text += " — " + (shotEditClipboard.mode === "cut" ? "cut" : "copied") + " " + clipboardCount;
    return text;
  }

  function shotUpdateEditBar() {
    var count = shotEditSelectionList().length;
    var status = byId("m395ShotEditStatus");
    if (status) status.textContent = shotSelectionDescription();
    var modes = ["hole", "row", "column"];
    for (var i = 0; i < modes.length; i += 1) {
      var button = byId("m395ShotMode" + modes[i].charAt(0).toUpperCase() + modes[i].slice(1));
      if (button) button.classList.toggle("active", shotEditSelectMode === modes[i]);
    }
    var hasSelection = count > 0;
    var copyButton = byId("m395ShotCopy");
    var cutButton = byId("m395ShotCut");
    var pasteButton = byId("m395ShotPaste");
    if (copyButton) copyButton.disabled = !hasSelection;
    if (cutButton) cutButton.disabled = !hasSelection;
    if (pasteButton) pasteButton.disabled = !(shotEditClipboard && shotEditClipboard.items && shotEditClipboard.items.length);
    var arrows = document.querySelectorAll("[data-m395-edit-shift]");
    for (var a = 0; a < arrows.length; a += 1) arrows[a].disabled = !hasSelection;
    var undoButton = byId("m395ShotUndo");
    if (undoButton) undoButton.disabled = !shotEditUndoHistory.length;
  }

  function injectShotEditStyles() {
    if (byId("mithrilShotEditM395Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilShotEditM395Styles";
    style.textContent = [
      ".m395ShotEditBar{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:245;background:rgba(255,255,255,.985);border:2px solid #8a4fff;border-radius:13px;padding:8px;box-shadow:0 6px 22px rgba(0,0,0,.42);gap:7px}",
      ".m395ShotEditBar.show{display:grid}",
      ".m395ShotEditHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}",
      ".m395ShotEditTitle{font-size:14px;font-weight:950;color:#222}",
      ".m395ShotEditStatus{font-size:12px;font-weight:850;color:#5d3b96;margin-top:2px}",
      ".m395ShotEditModes,.m395ShotEditActions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}",
      ".m395ShotEditModes button,.m395ShotEditActions button{min-height:43px;padding:5px;font-size:13px}",
      ".m395ShotEditModes button.active{background:#8a4fff;color:#fff;border-color:#6f35da}",
      ".m395ShotEditDirections{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:6px}",
      ".m395ShotEditDirections button{min-height:45px;font-size:18px;padding:4px}",
      ".m395ShotEditHint{min-height:17px;font-size:11px;line-height:1.25;font-weight:800;color:#444}",
      ".m395ShotEditDone{min-width:76px;background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "@media(max-width:520px){.m395ShotEditModes,.m395ShotEditActions{grid-template-columns:repeat(2,1fr)}.m395ShotEditDirections{grid-template-columns:repeat(5,1fr)}.m395ShotEditDirections button{font-size:17px}.m395ShotEditHead{grid-template-columns:1fr auto}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureShotEditBar() {
    var bar = byId("m395ShotEditBar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "m395ShotEditBar";
    bar.className = "m395ShotEditBar";
    bar.innerHTML = [
      '<div class="m395ShotEditHead">',
      '  <div><div class="m395ShotEditTitle">Edit Holes</div><div id="m395ShotEditStatus" class="m395ShotEditStatus">0 selected</div></div>',
      '  <button type="button" id="m395ShotEditDone" class="m395ShotEditDone">Done</button>',
      '</div>',
      '<div class="m395ShotEditModes">',
      '  <button type="button" id="m395ShotModeHole">Hole</button>',
      '  <button type="button" id="m395ShotModeRow">Row</button>',
      '  <button type="button" id="m395ShotModeColumn">Column</button>',
      '  <button type="button" id="m395ShotSelectAll">All Page</button>',
      '</div>',
      '<div class="m395ShotEditActions">',
      '  <button type="button" id="m395ShotCopy">Copy</button>',
      '  <button type="button" id="m395ShotCut">Cut</button>',
      '  <button type="button" id="m395ShotPaste">Paste</button>',
      '  <button type="button" id="m395ShotClearSelection">Clear Selection</button>',
      '</div>',
      '<div class="m395ShotEditDirections">',
      '  <button type="button" data-m395-edit-shift="left" aria-label="Shift left">←</button>',
      '  <button type="button" data-m395-edit-shift="up" aria-label="Shift up">↑</button>',
      '  <button type="button" id="m395ShotUndo" aria-label="Undo">↶</button>',
      '  <button type="button" data-m395-edit-shift="down" aria-label="Shift down">↓</button>',
      '  <button type="button" data-m395-edit-shift="right" aria-label="Shift right">→</button>',
      '</div>',
      '<div id="m395ShotEditHint" class="m395ShotEditHint">Tap saved holes to select them. Pan and pinch zoom still work.</div>'
    ].join("");
    document.body.appendChild(bar);

    byId("m395ShotEditDone").addEventListener("click", finishShotEditMode);
    byId("m395ShotModeHole").addEventListener("click", function () { shotSetSelectionMode("hole"); });
    byId("m395ShotModeRow").addEventListener("click", function () { shotSetSelectionMode("row"); });
    byId("m395ShotModeColumn").addEventListener("click", function () { shotSetSelectionMode("column"); });
    byId("m395ShotSelectAll").addEventListener("click", shotSelectAllCurrentPage);
    byId("m395ShotCopy").addEventListener("click", function () { shotBuildClipboard("copy"); });
    byId("m395ShotCut").addEventListener("click", function () { shotBuildClipboard("cut"); });
    byId("m395ShotPaste").addEventListener("click", shotArmPaste);
    byId("m395ShotClearSelection").addEventListener("click", function () {
      shotEditSelection = {};
      shotEditPasteArmed = false;
      draw();
      shotEditSetHint("Selection cleared.");
    });
    byId("m395ShotUndo").addEventListener("click", shotUndoLastEdit);
    var arrows = bar.querySelectorAll("[data-m395-edit-shift]");
    for (var i = 0; i < arrows.length; i += 1) {
      arrows[i].addEventListener("click", function () { shotShiftSelection(this.getAttribute("data-m395-edit-shift")); });
    }
    return bar;
  }

  function pauseQuickForShotEdit() {
    shotEditQuickWasEnabled = false;
    try {
      if (typeof quickEntry !== "undefined") {
        shotEditQuickWasEnabled = !!quickEntry.enabled;
        quickEntry.enabled = false;
        localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
        if (typeof updateSingleFillBar === "function") updateSingleFillBar();
      }
    } catch (error) {}
  }

  function resumeQuickAfterShotEdit() {
    try {
      if (typeof quickEntry !== "undefined") {
        quickEntry.enabled = !!shotEditQuickWasEnabled;
        localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
        if (typeof updateSingleFillBar === "function") updateSingleFillBar();
      }
    } catch (error) {}
    shotEditQuickWasEnabled = false;
  }

  function startShotEditMode() {
    if (shotEditMode) return;
    if (gpsArrangeMode && typeof finishGPSArrange === "function") finishGPSArrange();
    shotEditMode = true;
    shotEditSelectMode = "hole";
    shotEditSelection = {};
    shotEditClipboard = null;
    shotEditPasteArmed = false;
    pauseQuickForShotEdit();
    closeMenu();
    var bar = ensureShotEditBar();
    bar.classList.add("show");
    shotEditSetHint("Tap saved holes to select them. Use Row, Column, or All Page for groups.");
    draw();
  }

  function finishShotEditMode() {
    shotEditMode = false;
    shotEditSelection = {};
    shotEditClipboard = null;
    shotEditPasteArmed = false;
    shotEditPointerStarts = {};
    var bar = byId("m395ShotEditBar");
    if (bar) bar.classList.remove("show");
    resumeQuickAfterShotEdit();
    draw();
  }

  function shotSetSelectionMode(mode) {
    shotEditSelectMode = mode;
    shotEditPasteArmed = false;
    shotEditSetHint("Selection mode: " + (mode === "column" ? "Column" : mode.charAt(0).toUpperCase() + mode.slice(1)) + ". Tap a saved hole.");
  }

  function shotToggleSelectionEntry(pageNum, holeId) {
    var key = shotEditKey(pageNum, holeId);
    if (shotEditSelection[key]) delete shotEditSelection[key];
    else shotEditSelection[key] = { pageNum: Number(pageNum), holeId: String(holeId) };
  }

  function shotToggleGroup(pageNum, holeIds) {
    if (!holeIds.length) return;
    var allSelected = true;
    for (var i = 0; i < holeIds.length; i += 1) {
      if (!shotEditSelection[shotEditKey(pageNum, holeIds[i])]) { allSelected = false; break; }
    }
    for (var j = 0; j < holeIds.length; j += 1) {
      var key = shotEditKey(pageNum, holeIds[j]);
      if (allSelected) delete shotEditSelection[key];
      else shotEditSelection[key] = { pageNum: Number(pageNum), holeId: String(holeIds[j]) };
    }
  }

  function shotHandleSelectionTap(hit) {
    var data = pagesData[String(hit.pageNum)] || {};
    if (shotEditSelectMode === "hole") {
      if (!data[hit.holeId]) {
        shotEditSetHint("Hole " + hit.holeId + " has no saved data to select.");
        return;
      }
      shotToggleSelectionEntry(hit.pageNum, hit.holeId);
    } else {
      var target = parseHoleID(hit.holeId);
      var ids = Object.keys(data).filter(function (id) {
        var pos = parseHoleID(id);
        return shotEditSelectMode === "row" ? pos.row === target.row : pos.col === target.col;
      });
      if (!ids.length) {
        shotEditSetHint("That " + shotEditSelectMode + " has no saved holes.");
        return;
      }
      shotToggleGroup(hit.pageNum, ids);
    }
    shotEditPasteArmed = false;
    draw();
    shotEditSetHint(shotSelectionDescription() + ".");
  }

  function shotSelectAllCurrentPage() {
    var data = pagesData[String(currentPage)] || {};
    var ids = Object.keys(data);
    if (!ids.length) {
      shotEditSetHint("Page " + currentPage + " has no saved holes.");
      return;
    }
    shotEditSelection = {};
    for (var i = 0; i < ids.length; i += 1) {
      shotEditSelection[shotEditKey(currentPage, ids[i])] = { pageNum: Number(currentPage), holeId: ids[i] };
    }
    shotEditPasteArmed = false;
    draw();
    shotEditSetHint("Selected all " + ids.length + " saved holes on Page " + currentPage + ".");
  }

  function shotBuildClipboard(mode) {
    var selected = shotEditSortedSelection();
    if (!selected.length) {
      shotEditSetHint("Select at least one saved hole first.");
      return;
    }
    var globals = selected.map(function (entry) { return shotLocationToGlobal(entry.pageNum, entry.holeId); });
    var minRow = Math.min.apply(Math, globals.map(function (g) { return g.row; }));
    var minCol = Math.min.apply(Math, globals.map(function (g) { return g.col; }));
    var items = [];
    for (var i = 0; i < selected.length; i += 1) {
      var source = selected[i];
      var record = (pagesData[String(source.pageNum)] || {})[source.holeId];
      if (!record) continue;
      items.push({
        dr: globals[i].row - minRow,
        dc: globals[i].col - minCol,
        record: deepClone(record),
        sourcePageNum: Number(source.pageNum),
        sourceHoleId: String(source.holeId)
      });
    }
    shotEditClipboard = { mode: mode, items: items };
    shotEditPasteArmed = false;
    draw();
    shotEditSetHint((mode === "cut" ? "Cut" : "Copied") + " " + items.length + " hole" + (items.length === 1 ? "" : "s") + ". Tap Paste, then tap the new top-left anchor hole.");
  }

  function shotArmPaste() {
    if (!shotEditClipboard || !shotEditClipboard.items || !shotEditClipboard.items.length) {
      shotEditSetHint("Copy or cut holes before pasting.");
      return;
    }
    shotEditPasteArmed = true;
    shotEditSetHint("Paste armed — tap the destination for the selection's top-left anchor.");
  }

  function shotCollisionMessage(collisions) {
    return collisions.slice(0, 12).map(function (entry) { return "Page " + entry.pageNum + " " + entry.holeId; }).join(", ") + (collisions.length > 12 ? " …" : "");
  }

  function shotCommitWorkingState(workingPages, workingMeta, destinations, label) {
    pagesData = workingPages;
    pageMeta = workingMeta;
    if (destinations.length) currentPage = Number(destinations[0].pageNum);
    if (!pagesData[String(currentPage)]) pagesData[String(currentPage)] = {};
    holeData = pagesData[String(currentPage)];
    shotEditSelection = {};
    for (var i = 0; i < destinations.length; i += 1) {
      shotEditSelection[shotEditKey(destinations[i].pageNum, destinations[i].holeId)] = {
        pageNum: Number(destinations[i].pageNum),
        holeId: String(destinations[i].holeId)
      };
    }
    shotPersistEditedState();
    draw();
    shotEditSetHint(label + " — " + destinations.length + " hole" + (destinations.length === 1 ? "" : "s") + ".");
  }

  function shotShiftSelection(direction) {
    var selected = shotEditSortedSelection();
    if (!selected.length) {
      shotEditSetHint("Select at least one saved hole first.");
      return;
    }
    var dr = 0, dc = 0;
    if (direction === "up") dr = -1;
    if (direction === "down") dr = 1;
    if (direction === "left") dc = -1;
    if (direction === "right") dc = 1;

    var workingPages = deepClone(pagesData);
    var workingMeta = deepClone(pageMeta);
    var counter = { next: shotNextPageNumber(workingPages) };
    var sourceKeys = {};
    var moves = [];
    for (var i = 0; i < selected.length; i += 1) {
      var source = selected[i];
      var record = (pagesData[String(source.pageNum)] || {})[source.holeId];
      if (!record) continue;
      sourceKeys[shotEditKey(source.pageNum, source.holeId)] = true;
      var global = shotLocationToGlobal(source.pageNum, source.holeId, workingMeta);
      var destination = shotGlobalDestination(global.row + dr, global.col + dc, workingPages, workingMeta, counter);
      moves.push({ source: source, destination: destination, record: record });
    }

    var collisions = [];
    for (var c = 0; c < moves.length; c += 1) {
      var dest = moves[c].destination;
      if (shotRecordExists(dest.pageNum, dest.holeId, workingPages) && !sourceKeys[shotEditKey(dest.pageNum, dest.holeId)]) collisions.push(dest);
    }
    if (collisions.length && !confirm("The move would replace " + collisions.length + " occupied destination hole(s):\n\n" + shotCollisionMessage(collisions) + "\n\nReplace the existing data?")) {
      shotEditSetHint("Move canceled. No data changed.");
      return;
    }

    shotPushUndo("shift selection " + direction);
    for (var d = 0; d < moves.length; d += 1) delete workingPages[String(moves[d].source.pageNum)][moves[d].source.holeId];
    var destinations = [];
    for (var m = 0; m < moves.length; m += 1) {
      var move = moves[m];
      if (!workingPages[String(move.destination.pageNum)]) workingPages[String(move.destination.pageNum)] = {};
      workingPages[String(move.destination.pageNum)][move.destination.holeId] = shotPrepareMovedRecord(move.record, move.destination.pageNum, move.destination.holeId, false);
      destinations.push(move.destination);
    }
    shotEditClipboard = null;
    shotEditPasteArmed = false;
    shotCommitWorkingState(workingPages, workingMeta, destinations, "Shifted " + direction);
  }

  function shotPasteAt(hit) {
    if (!shotEditClipboard || !shotEditClipboard.items || !shotEditClipboard.items.length) return;
    var anchor = shotLocationToGlobal(hit.pageNum, hit.holeId);
    var workingPages = deepClone(pagesData);
    var workingMeta = deepClone(pageMeta);
    var counter = { next: shotNextPageNumber(workingPages) };
    var sourceKeys = {};
    if (shotEditClipboard.mode === "cut") {
      for (var s = 0; s < shotEditClipboard.items.length; s += 1) {
        var sourceItem = shotEditClipboard.items[s];
        sourceKeys[shotEditKey(sourceItem.sourcePageNum, sourceItem.sourceHoleId)] = true;
      }
    }

    var placements = [];
    for (var i = 0; i < shotEditClipboard.items.length; i += 1) {
      var item = shotEditClipboard.items[i];
      var destination = shotGlobalDestination(anchor.row + item.dr, anchor.col + item.dc, workingPages, workingMeta, counter);
      placements.push({ item: item, destination: destination });
    }

    var collisions = [];
    for (var c = 0; c < placements.length; c += 1) {
      var dest = placements[c].destination;
      if (shotRecordExists(dest.pageNum, dest.holeId, workingPages) && !sourceKeys[shotEditKey(dest.pageNum, dest.holeId)]) collisions.push(dest);
    }
    if (collisions.length && !confirm("Paste would replace " + collisions.length + " occupied destination hole(s):\n\n" + shotCollisionMessage(collisions) + "\n\nReplace the existing data?")) {
      shotEditSetHint("Paste canceled. No data changed.");
      return;
    }

    shotPushUndo(shotEditClipboard.mode + " and paste");
    if (shotEditClipboard.mode === "cut") {
      for (var d = 0; d < shotEditClipboard.items.length; d += 1) {
        var cutItem = shotEditClipboard.items[d];
        if (workingPages[String(cutItem.sourcePageNum)]) delete workingPages[String(cutItem.sourcePageNum)][cutItem.sourceHoleId];
      }
    }

    var destinations = [];
    for (var p = 0; p < placements.length; p += 1) {
      var placement = placements[p];
      var isCopy = shotEditClipboard.mode === "copy";
      if (!workingPages[String(placement.destination.pageNum)]) workingPages[String(placement.destination.pageNum)] = {};
      workingPages[String(placement.destination.pageNum)][placement.destination.holeId] = shotPrepareMovedRecord(
        placement.item.record,
        placement.destination.pageNum,
        placement.destination.holeId,
        isCopy
      );
      destinations.push(placement.destination);
    }

    var label = shotEditClipboard.mode === "cut" ? "Moved selection" : "Pasted copy";
    if (shotEditClipboard.mode === "cut") shotEditClipboard = null;
    shotEditPasteArmed = false;
    shotCommitWorkingState(workingPages, workingMeta, destinations, label);
  }

  function drawShotEditOverlay() {
    if (!shotEditMode || !ctx || !view) return;
    var selected = shotEditSelectionList();
    if (!selected.length) return;
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    for (var i = 0; i < selected.length; i += 1) {
      var entry = selected[i];
      var pos = parseHoleID(entry.holeId);
      var rect = holeRect(pos.row, pos.col);
      var origin = pageOrigin(entry.pageNum);
      ctx.save();
      ctx.translate(origin.x, origin.y);
      ctx.fillStyle = shotEditClipboard && shotEditClipboard.mode === "cut" ? "rgba(255,145,0,.20)" : "rgba(138,79,255,.18)";
      ctx.strokeStyle = shotEditClipboard && shotEditClipboard.mode === "cut" ? "#e57900" : "#8a4fff";
      ctx.lineWidth = Math.max(3, 5 / Math.max(.25, view.scale));
      if (shotEditClipboard && shotEditClipboard.mode === "cut") ctx.setLineDash([12 / view.scale, 7 / view.scale]);
      ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
      ctx.restore();
    }
    ctx.restore();
  }

  function patchShotEditDrawing() {
    if (window.__mithrilM395ShotEditDrawing) return;
    window.__mithrilM395ShotEditDrawing = true;
    var originalDraw = window.draw;
    if (typeof originalDraw !== "function") return;
    window.draw = function () {
      var result = originalDraw.apply(this, arguments);
      drawShotEditOverlay();
      return result;
    };
  }

  function shotEditCanvasPoint(event, canvas) {
    return preciseCanvasPoint(event, canvas);
  }

  function installShotEditInteraction(canvas) {
    if (!canvas || canvas.getAttribute("data-m395-shot-edit") === "true") return;
    canvas.setAttribute("data-m395-shot-edit", "true");

    canvas.addEventListener("pointerdown", function (event) {
      if (!shotEditMode) return;
      var point = shotEditCanvasPoint(event, canvas);
      shotEditPointerStarts[String(event.pointerId)] = { x: point.x, y: point.y, moved: false };
    }, true);

    canvas.addEventListener("pointermove", function (event) {
      if (!shotEditMode) return;
      var start = shotEditPointerStarts[String(event.pointerId)];
      if (!start) return;
      var point = shotEditCanvasPoint(event, canvas);
      if (Math.abs(point.x - start.x) > 7 || Math.abs(point.y - start.y) > 7) start.moved = true;
    }, true);

    canvas.addEventListener("pointerup", function (event) {
      if (!shotEditMode) return;
      var key = String(event.pointerId);
      var start = shotEditPointerStarts[key];
      delete shotEditPointerStarts[key];
      if (!start || start.moved) return;

      // Let the stable core finish its pointer bookkeeping, but mark the tap as
      // moved so it does not open the ordinary hole editor or run Quick Fill.
      try { if (typeof pointerState !== "undefined" && pointerState) pointerState.moved = true; } catch (error) {}

      var point = shotEditCanvasPoint(event, canvas);
      var world = screenToWorld(point.x, point.y);
      var hit = hitTestHole(world.x, world.y);
      if (!hit) {
        shotEditSetHint("Tap inside a hole cell.");
        return;
      }
      if (shotEditPasteArmed) shotPasteAt(hit);
      else shotHandleSelectionTap(hit);
    }, true);

    canvas.addEventListener("pointercancel", function (event) {
      delete shotEditPointerStarts[String(event.pointerId)];
    }, true);
  }

  function installShotEditFeature(canvas) {
    injectShotEditStyles();
    ensureShotEditBar();
    patchShotEditDrawing();
    installShotEditInteraction(canvas);
    window.startShotEditMode = startShotEditMode;
    window.finishShotEditMode = finishShotEditMode;
  }



  // ---------------------------------------------------------------------------
  // m39.5 summary calculations
  // ---------------------------------------------------------------------------
  var M395_DEFAULT_HOLE_DIAMETER = 3.5;
  var M395_HOLE_DIAMETERS = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5];
  var M395_ANFO_LB_PER_FT = {
    "3.0": 2.61,
    "3.5": 3.55,
    "4.0": 4.64,
    "4.5": 5.87,
    "5.0": 7.24,
    "5.5": 8.77
  };

  function m395NormalizeHoleDiameter(value) {
    var number = Number(value);
    for (var i = 0; i < M395_HOLE_DIAMETERS.length; i += 1) {
      if (Math.abs(number - M395_HOLE_DIAMETERS[i]) < 0.0001) return M395_HOLE_DIAMETERS[i];
    }
    return M395_DEFAULT_HOLE_DIAMETER;
  }

  function m395FormatHoleDiameter(value) {
    return m395NormalizeHoleDiameter(value).toFixed(1) + " in";
  }

  function m395AnfoRate(value) {
    var key = m395NormalizeHoleDiameter(value).toFixed(1);
    return M395_ANFO_LB_PER_FT[key] || M395_ANFO_LB_PER_FT["3.5"];
  }

  function m395StrictPositiveNumber(value) {
    var text = String(value == null ? "" : value).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    var number = Number(text);
    return isFinite(number) && number > 0 ? number : null;
  }

  function m395FormatNumber(value, decimals) {
    if (!isFinite(Number(value))) return "";
    var places = typeof decimals === "number" ? decimals : 2;
    var factor = Math.pow(10, places);
    var rounded = Math.round(Number(value) * factor) / factor;
    return rounded.toLocaleString(undefined, { maximumFractionDigits: places });
  }

  function m395DepthRangeFromValues(values) {
    var valid = [];
    for (var i = 0; i < (values || []).length; i += 1) {
      var parsed = m395StrictPositiveNumber(values[i]);
      if (parsed !== null) valid.push(parsed);
    }
    if (!valid.length) return { count: 0, min: null, max: null, label: "Drilled Depth Range", value: "Not available" };
    var minimum = Math.min.apply(Math, valid);
    var maximum = Math.max.apply(Math, valid);
    if (Math.abs(minimum - maximum) < 0.0000001) {
      return { count: valid.length, min: minimum, max: maximum, label: "Drilled Depth", value: m395FormatNumber(minimum, 2) + " ft" };
    }
    return {
      count: valid.length,
      min: minimum,
      max: maximum,
      label: "Drilled Depth Range",
      value: m395FormatNumber(minimum, 2) + "–" + m395FormatNumber(maximum, 2) + " ft"
    };
  }

  function m395ParseLoad(value, anfoRate) {
    var text = String(value == null ? "" : value).trim();
    if (!text) return { valid: true, hasValue: false, weight: 0, tokens: [] };
    if (text.indexOf("-") !== -1) return { valid: false, hasValue: true, weight: null, tokens: [] };

    var tokenPattern = /((?:\d+(?:\.\d*)?|\.\d+))([aAdD]?)/g;
    var tokens = [];
    var match;
    var lastEnd = 0;
    var previousSuffix = null;
    var weight = 0;

    while ((match = tokenPattern.exec(text)) !== null) {
      var between = text.slice(lastEnd, match.index);
      if (!/^[\s,+]*$/.test(between)) return { valid: false, hasValue: true, weight: null, tokens: [] };
      if (!between && tokens.length && previousSuffix === "") {
        // Adjacent components are valid only when the previous component has an
        // A or D designator, as in 12A1D20. This rejects malformed 1..2 values.
        return { valid: false, hasValue: true, weight: null, tokens: [] };
      }

      var amount = Number(match[1]);
      if (!isFinite(amount) || amount < 0) return { valid: false, hasValue: true, weight: null, tokens: [] };
      var suffix = String(match[2] || "").toUpperCase();
      var pounds = suffix === "A" ? amount * Number(anfoRate) : suffix === "D" ? amount * 7 : amount;
      weight += pounds;
      tokens.push({ amount: amount, designator: suffix || "LB", pounds: pounds });
      previousSuffix = suffix;
      lastEnd = match.index + match[0].length;
    }

    if (!tokens.length || !/^[\s,+]*$/.test(text.slice(lastEnd))) {
      return { valid: false, hasValue: true, weight: null, tokens: [] };
    }
    return { valid: true, hasValue: true, weight: weight, tokens: tokens };
  }

  function m395PageHoleLabel(row, multiPage) {
    var hole = String(row && row.HoleID || "").trim() || "Unknown hole";
    var page = Number(row && row.PageNumber || 1);
    return multiPage ? "P" + page + " " + hole : hole;
  }

  function m395FormatTiedLabels(labels) {
    var visible = (labels || []).slice(0, 5);
    var text = visible.join(", ");
    if ((labels || []).length > 5) text += " + " + ((labels || []).length - 5) + " more";
    return text;
  }

  function m395ShotLoadSummary(rows, holeDiameter) {
    var rate = m395AnfoRate(holeDiameter);
    var candidates = [];
    var invalid = [];
    var pageSet = {};
    var i;

    for (i = 0; i < (rows || []).length; i += 1) pageSet[String(Number(rows[i].PageNumber || 1))] = true;
    var multiPage = Object.keys(pageSet).length > 1;

    for (i = 0; i < (rows || []).length; i += 1) {
      var row = rows[i] || {};
      var dirt = String(row.DirtHole || "").toLowerCase() === "yes" || row.DirtHole === true;
      var bad = String(row.BadHole || "").toLowerCase() === "yes" || row.BadHole === true;
      if (dirt || bad) continue;

      var primaryText = String(row.PrimaryLoad || "").trim();
      var secondaryText = String(row.SecondaryLoad || "").trim();
      if (!primaryText && !secondaryText) continue;

      var primary = m395ParseLoad(primaryText, rate);
      var secondary = m395ParseLoad(secondaryText, rate);
      var label = m395PageHoleLabel(row, multiPage);
      if (!primary.valid || !secondary.valid) {
        invalid.push(label);
        continue;
      }

      var total = primary.weight + secondary.weight;
      if (total > 0) candidates.push({ label: label, weight: total, row: row });
    }

    if (!candidates.length) {
      return { rate: rate, lightest: null, heaviest: null, invalid: invalid, candidates: [] };
    }

    var minimum = candidates[0].weight;
    var maximum = candidates[0].weight;
    for (i = 1; i < candidates.length; i += 1) {
      minimum = Math.min(minimum, candidates[i].weight);
      maximum = Math.max(maximum, candidates[i].weight);
    }

    var lightLabels = [];
    var heavyLabels = [];
    for (i = 0; i < candidates.length; i += 1) {
      if (Math.abs(candidates[i].weight - minimum) < 0.000001) lightLabels.push(candidates[i].label);
      if (Math.abs(candidates[i].weight - maximum) < 0.000001) heavyLabels.push(candidates[i].label);
    }

    return {
      rate: rate,
      lightest: { weight: minimum, labels: lightLabels, text: m395FormatTiedLabels(lightLabels) + " — " + m395FormatNumber(minimum, 2) + " lb" },
      heaviest: { weight: maximum, labels: heavyLabels, text: m395FormatTiedLabels(heavyLabels) + " — " + m395FormatNumber(maximum, 2) + " lb" },
      invalid: invalid,
      candidates: candidates
    };
  }

  function m395EscapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function m395DiameterOptions(selectedValue) {
    var selected = m395NormalizeHoleDiameter(selectedValue);
    return M395_HOLE_DIAMETERS.map(function (diameter) {
      var value = diameter.toFixed(1);
      return '<option value="' + value + '"' + (Math.abs(selected - diameter) < 0.0001 ? ' selected' : '') + '>' + value + ' in</option>';
    }).join("");
  }

  function m395EnsureDiameterField(modalId, selectId) {
    var modal = byId(modalId);
    if (!modal || byId(selectId)) return byId(selectId);
    var form = modal.querySelector(".formGrid");
    if (!form) return null;
    var label = document.createElement("label");
    label.className = "m395HoleDiameterField";
    label.textContent = "Hole Diameter";
    var select = document.createElement("select");
    select.id = selectId;
    select.innerHTML = m395DiameterOptions(M395_DEFAULT_HOLE_DIAMETER);
    select.value = m395NormalizeHoleDiameter(M395_DEFAULT_HOLE_DIAMETER).toFixed(1);
    label.appendChild(select);
    form.appendChild(label);
    return select;
  }

  function m395EnsureHeaderDiameter() {
    if (typeof headerData === "undefined" || !headerData) return M395_DEFAULT_HOLE_DIAMETER;
    headerData.HoleDiameter = m395NormalizeHoleDiameter(headerData.HoleDiameter);
    return headerData.HoleDiameter;
  }

  function installDrillSummaryCalculations() {
    if (window.__mithrilM395DrillSummaryCalculations) return;
    if (typeof headerData === "undefined" || typeof pagesData === "undefined") return;
    window.__mithrilM395DrillSummaryCalculations = true;

    var select = m395EnsureDiameterField("infoModal", "m395DrillHoleDiameter");
    m395EnsureHeaderDiameter();
    try { if (typeof saveState === "function") saveState(); } catch (error) {}

    var originalOpenInfo = window.openInfo;
    if (typeof originalOpenInfo === "function") {
      window.openInfo = function () {
        var result = originalOpenInfo.apply(this, arguments);
        var field = byId("m395DrillHoleDiameter");
        if (field) field.value = m395NormalizeHoleDiameter(headerData.HoleDiameter).toFixed(1);
        return result;
      };
    }

    var originalSaveInfo = window.saveInfo;
    if (typeof originalSaveInfo === "function") {
      window.saveInfo = function () {
        var field = byId("m395DrillHoleDiameter");
        var selected = m395NormalizeHoleDiameter(field ? field.value : headerData.HoleDiameter);
        var result = originalSaveInfo.apply(this, arguments);
        headerData.HoleDiameter = selected;
        try { if (typeof saveState === "function") saveState(); } catch (error) {}
        try { if (typeof invalidatePageCache === "function") invalidatePageCache(); } catch (error2) {}
        return result;
      };
    }

    var originalBuildBackupPayload = window.buildBackupPayload;
    if (typeof originalBuildBackupPayload === "function") {
      window.buildBackupPayload = function () {
        m395EnsureHeaderDiameter();
        var payload = originalBuildBackupPayload.apply(this, arguments) || {};
        payload.headerData = payload.headerData || headerData || {};
        payload.headerData.HoleDiameter = m395NormalizeHoleDiameter(payload.headerData.HoleDiameter);
        return payload;
      };
    }

    var originalGetDrillSummary = window.getDrillSummary;
    if (typeof originalGetDrillSummary === "function") {
      window.getDrillSummary = function () {
        var summary = originalGetDrillSummary.apply(this, arguments) || {};
        var depths = [];
        Object.keys(pagesData || {}).forEach(function (pageKey) {
          Object.keys(pagesData[pageKey] || {}).forEach(function (holeId) {
            depths.push((pagesData[pageKey][holeId] || {}).Depth);
          });
        });
        summary.depthRange = m395DepthRangeFromValues(depths);
        summary.holeDiameter = m395EnsureHeaderDiameter();
        return summary;
      };
    }

  }

  function installShotSummaryCalculations() {
    if (window.__mithrilM395ShotSummaryCalculations) return;
    if (typeof headerData === "undefined" || typeof pagesData === "undefined") return;
    window.__mithrilM395ShotSummaryCalculations = true;

    m395EnsureDiameterField("shotInfoModal", "m395ShotHoleDiameter");
    m395EnsureHeaderDiameter();
    try { localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData)); } catch (error) {}

    var originalOpenShotInfo = window.openShotInfo;
    if (typeof originalOpenShotInfo === "function") {
      window.openShotInfo = function () {
        var result = originalOpenShotInfo.apply(this, arguments);
        var field = byId("m395ShotHoleDiameter");
        if (field) field.value = m395NormalizeHoleDiameter(headerData.HoleDiameter).toFixed(1);
        return result;
      };
    }

    var originalSaveHeaderData = window.saveHeaderData;
    if (typeof originalSaveHeaderData === "function") {
      window.saveHeaderData = function () {
        var field = byId("m395ShotHoleDiameter");
        var selected = m395NormalizeHoleDiameter(field ? field.value : headerData.HoleDiameter);
        var result = originalSaveHeaderData.apply(this, arguments);
        headerData.HoleDiameter = selected;
        try { localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData)); } catch (error) {}
        return result;
      };
    }

    var originalGetCurrentShotInfoForBackup = window.getCurrentShotInfoForBackup;
    if (typeof originalGetCurrentShotInfoForBackup === "function") {
      window.getCurrentShotInfoForBackup = function () {
        var info = originalGetCurrentShotInfoForBackup.apply(this, arguments) || {};
        info.HoleDiameter = m395EnsureHeaderDiameter();
        return info;
      };
    }

    var originalNormalizeLoadedHeaderData = window.normalizeLoadedHeaderData;
    if (typeof originalNormalizeLoadedHeaderData === "function") {
      window.normalizeLoadedHeaderData = function (payload) {
        var normalized = originalNormalizeLoadedHeaderData.apply(this, arguments) || {};
        var source = payload && (payload.headerData || payload.shotInfo || payload.header) || {};
        normalized.HoleDiameter = m395NormalizeHoleDiameter(
          source.HoleDiameter || source.holeDiameter || payload && (payload.HoleDiameter || payload.holeDiameter)
        );
        return normalized;
      };
    }

    var originalGetPrintableReportHTML = window.getPrintableReportHTML;
    if (typeof originalGetPrintableReportHTML === "function") {
      window.getPrintableReportHTML = function () {
        var html = originalGetPrintableReportHTML.apply(this, arguments);
        var rows = typeof window.getAllHoleRows === "function" ? window.getAllHoleRows() : [];
        var depthRange = m395DepthRangeFromValues(rows.map(function (row) { return row.Depth; }));
        var diameter = m395EnsureHeaderDiameter();
        var loads = m395ShotLoadSummary(rows, diameter);
        var extraRows = [
          ["Hole Diameter", m395FormatHoleDiameter(diameter)],
          [depthRange.label, depthRange.value],
          ["Lightest Explosive Load", loads.lightest ? loads.lightest.text : "Not available"],
          ["Heaviest Explosive Load", loads.heaviest ? loads.heaviest.text : "Not available"]
        ];
        if (loads.invalid.length) {
          var warningText = loads.invalid.length + " hole" + (loads.invalid.length === 1 ? "" : "s") + " excluded because load entries could not be interpreted";
          var shown = loads.invalid.slice(0, 5).join(", ");
          if (shown) warningText += ": " + shown + (loads.invalid.length > 5 ? " + " + (loads.invalid.length - 5) + " more" : "");
          extraRows.push(["Load Calculation Warning", warningText]);
        }
        var extraHTML = extraRows.map(function (pair) {
          return "<tr><th>" + m395EscapeHTML(pair[0]) + "</th><td>" + m395EscapeHTML(pair[1]) + "</td></tr>";
        }).join("");
        return String(html).replace('<table class="summary">', '<table class="summary">' + extraHTML);
      };
    }

    var originalGetSummaryText = window.getSummaryText;
    if (typeof originalGetSummaryText === "function") {
      window.getSummaryText = function () {
        var base = originalGetSummaryText.apply(this, arguments);
        var rows = typeof window.getAllHoleRows === "function" ? window.getAllHoleRows() : [];
        var depthRange = m395DepthRangeFromValues(rows.map(function (row) { return row.Depth; }));
        var loads = m395ShotLoadSummary(rows, m395EnsureHeaderDiameter());
        return base + "\nHole Diameter: " + m395FormatHoleDiameter(headerData.HoleDiameter) +
          "\n" + depthRange.label + ": " + depthRange.value +
          "\nLightest Explosive Load: " + (loads.lightest ? loads.lightest.text : "Not available") +
          "\nHeaviest Explosive Load: " + (loads.heaviest ? loads.heaviest.text : "Not available");
      };
    }
  }



  // ---------------------------------------------------------------------------
  // m39.5 Drill Log summary prominence
  // ---------------------------------------------------------------------------
  function installDrillSummaryProminence() {
    if (window.__mithrilM395DrillSummaryProminence) return;
    if (typeof window.renderDrillSummaryCanvas !== "function") return;
    window.__mithrilM395DrillSummaryProminence = true;

    var originalRender = window.renderDrillSummaryCanvas;
    window.renderDrillSummaryCanvas = function () {
      var canvas = originalRender.apply(this, arguments);
      if (!canvas || !canvas.getContext) return canvas;
      var summary = typeof window.getDrillSummary === "function" ? window.getDrillSummary() : {};
      var range = summary.depthRange || m395DepthRangeFromValues([]);
      var pattern = summary.patternSummary || m395BuildPatternSummary([], m395EnsurePatternState());
      var x = canvas.getContext("2d");

      x.save();
      // Keep all callouts below the Drill Log / Date header and its divider.
      // This clears only the old statistics row, never the header text.
      x.fillStyle = "#fff";
      x.fillRect(62, 258, IMG_W - 124, 232);

      function callout(left, width, label, value) {
        x.fillStyle = "#eef4ff";
        x.strokeStyle = "#1f6feb";
        x.lineWidth = 3;
        x.fillRect(left, 270, width, 98);
        x.strokeRect(left, 270, width, 98);
        x.textBaseline = "top";
        x.fillStyle = "#34506f";
        x.font = "900 20px Arial";
        x.fillText(label, left + 16, 280);
        x.fillStyle = "#111";
        x.font = "950 36px Arial";
        x.fillText(value, left + 16, 310);
      }

      function compactStat(left, width, label, value, sub) {
        x.fillStyle = "#f5f7fa";
        x.strokeStyle = "#b8c0ca";
        x.lineWidth = 2;
        x.fillRect(left, 386, width, 96);
        x.strokeRect(left, 386, width, 96);
        x.fillStyle = "#555";
        x.font = "800 17px Arial";
        x.fillText(label, left + 12, 395);
        x.fillStyle = "#111";
        x.font = "950 30px Arial";
        x.fillText(String(value), left + 12, 420);
        if (sub) {
          x.fillStyle = "#666";
          x.font = "700 14px Arial";
          x.fillText(sub, left + 12, 457);
        }
      }

      callout(70, 600, "HOLE DIAMETER", m395FormatHoleDiameter(summary.holeDiameter));
      callout(695, 600, String(range.label || "Drilled Depth Range").toUpperCase(), String(range.value || "Not available"));
      compactStat(70, 285, "Pages", summary.pages || 0, "");
      compactStat(385, 285, "Holes entered", summary.saved || 0, "");
      compactStat(700, 285, "Loaded holes", summary.loaded || 0, "Excludes dirt / bad");
      compactStat(1015, 280, "Needs review", (summary.incomplete || 0) + (summary.invalid || 0), (summary.incomplete || 0) + " incomplete / " + (summary.invalid || 0) + " invalid");

      // Replace the former rules panel with prominent pattern and shot-volume totals.
      x.fillStyle = "#fff";
      x.fillRect(62, 1340, IMG_W - 124, 700);
      x.fillStyle = "#111";
      x.font = "950 35px Arial";
      x.fillText("Pattern & Shot Volume", 70, 1360);

      function volumeBox(left, width, label, value, sub) {
        x.fillStyle = "#eef4ff";
        x.strokeStyle = "#1f6feb";
        x.lineWidth = 3;
        x.fillRect(left, 1420, width, 170);
        x.strokeRect(left, 1420, width, 170);
        x.fillStyle = "#34506f";
        x.font = "900 19px Arial";
        x.fillText(label, left + 16, 1435);
        x.fillStyle = "#111";
        x.font = "950 34px Arial";
        x.fillText(value, left + 16, 1480);
        x.fillStyle = "#666";
        x.font = "700 16px Arial";
        x.fillText(sub, left + 16, 1535);
      }

      var areaValue = pattern.areaHoleCount ? m395FormatNumber(pattern.totalAreaSqFt, 1) + " ft²" : "Not available";
      var rockOnlyValue = pattern.rockOnlyVolumeHoleCount ? m395FormatNumber(pattern.totalShotVolumeRockOnlyCubicYards, 1) + " yd³" : "Not available";
      var totalValue = pattern.rockAndOverburdenVolumeHoleCount ? m395FormatNumber(pattern.totalShotVolumeRockAndOverburdenCubicYards, 1) + " yd³" : "Not available";
      volumeBox(70, 385, "ESTIMATED PATTERN AREA", areaValue, pattern.areaHoleCount ? m395FormatNumber(pattern.totalAreaSqYd, 1) + " yd²" : "Set burden and spacing");
      volumeBox(490, 385, "SHOT VOLUME (ROCK ONLY)", rockOnlyValue, "Depth minus overburden");
      volumeBox(910, 385, "SHOT VOLUME (ROCK + OVERBURDEN)", totalValue, "Uses total drilled depth");

      x.fillStyle = "#222";
      x.font = "800 23px Arial";
      x.fillText("Calculation warnings: " + m395PatternWarningsText(pattern), 90, 1635);
      x.font = "700 20px Arial";
      x.fillStyle = "#555";
      x.fillText("Dirt and bad holes are excluded. See the Pattern & Shot Volume Breakdown page for pattern-by-pattern details.", 90, 1685);

      x.fillStyle = "#f7f7f7";
      x.strokeStyle = "#ccc";
      x.lineWidth = 2;
      x.fillRect(70, 1740, IMG_W - 140, 275);
      x.strokeRect(70, 1740, IMG_W - 140, 275);
      x.fillStyle = "#111";
      x.font = "950 28px Arial";
      x.fillText("Calculation rules", 95, 1765);
      x.font = "700 21px Arial";
      var rules = [
        "• Pattern area = burden × spacing for each eligible hole.",
        "• Shot Volume (Rock Only) = area × (depth − overburden) ÷ 27.",
        "• Shot Volume (Rock and Overburden) = area × total depth ÷ 27.",
        "• Missing values are not guessed; details are listed on the breakdown page."
      ];
      for (var r = 0; r < rules.length; r += 1) x.fillText(rules[r], 105, 1815 + r * 48);
      x.restore();
      return canvas;
    };
  }


  // ---------------------------------------------------------------------------
  // m39.5 Shot Diagram pattern, area, and dual shot-volume system
  // ---------------------------------------------------------------------------
  var M395_PATTERN_DEFAULT_ID = "default";
  var M395_PATTERN_PALETTE = ["#1f6feb", "#e57900", "#2b8a3e", "#9c36b5", "#008b9a", "#b7791f", "#c92a2a", "#5f3dc4"];
  var m395PatternOverlayVisible = false;
  var m395PatternDraft = [];
  var m395PatternSequence = 2;

  function m395CleanPatternId(value) {
    var id = String(value == null ? "" : value).trim().replace(/[^A-Za-z0-9_-]/g, "");
    return id || ("pattern" + (m395PatternSequence++));
  }

  function m395NormalizePatternDimension(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text) return "";
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return "";
    var number = Number(text);
    if (!isFinite(number) || number <= 0) return "";
    return String(number);
  }

  function m395PositivePatternNumber(value) {
    var normalized = m395NormalizePatternDimension(value);
    return normalized === "" ? null : Number(normalized);
  }

  function m395NonnegativeNumber(value) {
    var text = String(value == null ? "" : value).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    var number = Number(text);
    return isFinite(number) && number >= 0 ? number : null;
  }

  function m395NormalizePatternArray(rawGroups, defaultBurden, defaultSpacing) {
    var source = Array.isArray(rawGroups) ? rawGroups : [];
    var groups = [];
    var used = {};
    var i;

    function addGroup(raw, forceDefault) {
      raw = raw || {};
      var id = forceDefault ? M395_PATTERN_DEFAULT_ID : m395CleanPatternId(raw.id || raw.PatternID || raw.patternId);
      if (used[id]) return;
      used[id] = true;
      var name = String(raw.name || raw.Name || "").trim();
      if (!name) name = forceDefault ? "Main Pattern" : "Pattern " + (groups.length + 1);
      var burden = m395NormalizePatternDimension(raw.burden != null ? raw.burden : raw.Burden);
      var spacing = m395NormalizePatternDimension(raw.spacing != null ? raw.spacing : raw.Spacing);
      groups.push({ id: id, name: name, burden: burden, spacing: spacing });
    }

    var foundDefault = null;
    for (i = 0; i < source.length; i += 1) {
      if (String(source[i] && (source[i].id || source[i].PatternID || source[i].patternId)) === M395_PATTERN_DEFAULT_ID) {
        foundDefault = source[i];
        break;
      }
    }
    foundDefault = foundDefault || {};
    if (foundDefault.burden == null && foundDefault.Burden == null) foundDefault.burden = defaultBurden;
    if (foundDefault.spacing == null && foundDefault.Spacing == null) foundDefault.spacing = defaultSpacing;
    addGroup(foundDefault, true);

    for (i = 0; i < source.length; i += 1) {
      var raw = source[i] || {};
      if (String(raw.id || raw.PatternID || raw.patternId) === M395_PATTERN_DEFAULT_ID) continue;
      addGroup(raw, false);
    }
    return groups;
  }

  function m395EnsurePatternState() {
    if (typeof headerData === "undefined" || !headerData) return [{ id: M395_PATTERN_DEFAULT_ID, name: "Main Pattern", burden: "", spacing: "" }];
    var groups = m395NormalizePatternArray(headerData.PatternGroups, headerData.DefaultBurden, headerData.DefaultSpacing);
    headerData.PatternGroups = groups;
    headerData.DefaultPatternID = M395_PATTERN_DEFAULT_ID;
    headerData.DefaultBurden = groups[0].burden;
    headerData.DefaultSpacing = groups[0].spacing;
    return groups;
  }

  function m395PersistPatternHeader() {
    if (typeof headerData === "undefined" || !headerData) return;
    m395EnsurePatternState();
    // Shot Diagram and Drill Log use separate header stores. Never write Drill
    // Log header data into the Shot Diagram localStorage key.
    if (byId("drillCanvas")) {
      try { if (typeof saveState === "function") saveState(); } catch (error) {}
    } else {
      try { localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData)); } catch (error2) {}
    }
  }

  function m395PatternMap(groups) {
    var map = {};
    for (var i = 0; i < (groups || []).length; i += 1) map[groups[i].id] = groups[i];
    return map;
  }

  function m395EffectivePatternId(record, groups) {
    var map = m395PatternMap(groups || m395EnsurePatternState());
    var id = String(record && record.PatternID || M395_PATTERN_DEFAULT_ID);
    return map[id] ? id : M395_PATTERN_DEFAULT_ID;
  }

  function m395PatternLabel(group) {
    if (!group) return "Main Pattern";
    var burden = m395PositivePatternNumber(group.burden);
    var spacing = m395PositivePatternNumber(group.spacing);
    var dims = burden !== null && spacing !== null ? " — " + m395FormatNumber(burden, 2) + " × " + m395FormatNumber(spacing, 2) + " ft" : " — dimensions not set";
    return group.name + dims;
  }

  function m395EnsurePatternStyles() {
    if (byId("mithrilPatternM395Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilPatternM395Styles";
    style.textContent = [
      ".m395ShotInfoPatternActions{grid-column:1/-1;display:grid;grid-template-columns:1fr;gap:6px}",
      ".m395ShotInfoPatternActions button{min-height:44px}",
      ".m395PatternRows{display:grid;gap:9px}",
      ".m395PatternRow{display:grid;grid-template-columns:minmax(120px,1.4fr) minmax(90px,.8fr) minmax(90px,.8fr) auto;gap:7px;align-items:end;padding:9px;border:1px solid #bbb;border-radius:10px;background:#f8f8f8}",
      ".m395PatternRow label{font-size:12px}",
      ".m395PatternRow input{font-size:16px;min-height:40px;padding:7px}",
      ".m395PatternDefaultBadge{font-size:11px;font-weight:950;color:#1f5a9a;margin-top:4px}",
      ".m395PatternDelete{min-width:74px;min-height:40px}",
      ".m395PatternHelp{font-size:13px;font-weight:750;line-height:1.35;color:#444;margin:0 0 10px}",
      ".m395PatternEditRow{display:grid;grid-template-columns:1fr 1fr;gap:6px}",
      ".m395PatternEditRow button{min-height:43px;font-size:13px}",
      ".m395ShotPdfPreview{display:none;position:fixed;inset:0;z-index:400;background:#d9d9d9}",
      ".m395ShotPdfPreview.show{display:grid;grid-template-rows:auto 1fr}",
      ".m395ShotPdfToolbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px;background:#f7f7f7;border-bottom:1px solid #999;min-height:50px;box-sizing:border-box}",
      ".m395ShotPdfToolbarTitle{text-align:center;font-size:15px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".m395ShotPdfToolbar button{min-height:38px}",
      ".m395ShotPdfFrame{width:100%;height:100%;border:0;background:#fff}",
      "@media(max-width:600px){.m395PatternRow{grid-template-columns:1fr 1fr}.m395PatternRow .m395PatternName{grid-column:1/-1}.m395PatternDelete{grid-column:1/-1}.m395ShotPdfToolbarTitle{font-size:13px}.m395ShotPdfToolbar button{font-size:13px;padding:5px 7px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function m395EnsureShotPatternInfoFields() {
    var modal = byId("shotInfoModal");
    if (!modal) return;
    var form = modal.querySelector(".formGrid");
    if (!form) return;

    function addNumberField(id, labelText) {
      var existing = byId(id);
      if (existing) return existing;
      var label = document.createElement("label");
      label.textContent = labelText;
      var input = document.createElement("input");
      input.id = id;
      input.type = "number";
      input.step = "0.1";
      input.min = "0";
      input.setAttribute("inputmode", "decimal");
      input.placeholder = "ft";
      label.appendChild(input);
      form.appendChild(label);
      return input;
    }

    addNumberField("m395DefaultBurden", "Default Burden (ft)");
    addNumberField("m395DefaultSpacing", "Default Spacing (ft)");

    if (!byId("m395ManagePatternsFromInfo")) {
      var actions = document.createElement("div");
      actions.className = "m395ShotInfoPatternActions";
      var button = document.createElement("button");
      button.id = "m395ManagePatternsFromInfo";
      button.type = "button";
      button.textContent = "Manage Multiple Patterns";
      button.addEventListener("click", function () { m395OpenPatternManager(true); });
      actions.appendChild(button);
      form.appendChild(actions);
    }
  }

  function m395SyncShotPatternInfoFields() {
    var groups = m395EnsurePatternState();
    var burden = byId("m395DefaultBurden");
    var spacing = byId("m395DefaultSpacing");
    if (burden) burden.value = groups[0].burden;
    if (spacing) spacing.value = groups[0].spacing;
  }

  function m395ApplyShotInfoPatternFields() {
    var groups = m395EnsurePatternState();
    var burden = byId("m395DefaultBurden");
    var spacing = byId("m395DefaultSpacing");
    groups[0].burden = m395NormalizePatternDimension(burden ? burden.value : groups[0].burden);
    groups[0].spacing = m395NormalizePatternDimension(spacing ? spacing.value : groups[0].spacing);
    headerData.PatternGroups = groups;
    headerData.DefaultBurden = groups[0].burden;
    headerData.DefaultSpacing = groups[0].spacing;
    m395PersistPatternHeader();
  }

  function m395EnsurePatternManagerModal() {
    var modal = byId("m395PatternManagerModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m395PatternManagerModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span>Patterns &amp; Shot Volume</span><button type="button" id="m395PatternManagerClose">Close</button></div>',
      '  <p class="m395PatternHelp">The Main Pattern is used automatically for holes without a separate assignment. Add another pattern for back rows, trenches, tighter rows, or other sections. Pattern colors appear only while editing and do not print on the final report pages.</p>',
      '  <div id="m395PatternRows" class="m395PatternRows"></div>',
      '  <div class="buttonGrid">',
      '    <button type="button" id="m395AddPattern">Add Pattern</button>',
      '    <button type="button" class="primary" id="m395SavePatterns">Save Patterns</button>',
      '    <button type="button" class="wide" id="m395CancelPatterns">Cancel</button>',
      '  </div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m395PatternManagerClose").addEventListener("click", m395ClosePatternManager);
    byId("m395CancelPatterns").addEventListener("click", m395ClosePatternManager);
    byId("m395AddPattern").addEventListener("click", m395AddPatternDraftRow);
    byId("m395SavePatterns").addEventListener("click", m395SavePatternManager);
    return modal;
  }

  function m395ReadPatternDraftFromDOM() {
    var rows = document.querySelectorAll("#m395PatternRows .m395PatternRow");
    var result = [];
    for (var i = 0; i < rows.length; i += 1) {
      result.push({
        id: rows[i].getAttribute("data-pattern-id"),
        name: (rows[i].querySelector('[data-pattern-field="name"]') || {}).value || "",
        burden: (rows[i].querySelector('[data-pattern-field="burden"]') || {}).value || "",
        spacing: (rows[i].querySelector('[data-pattern-field="spacing"]') || {}).value || ""
      });
    }
    return result;
  }

  function m395RenderPatternDraft() {
    var root = byId("m395PatternRows");
    if (!root) return;
    root.innerHTML = "";
    for (var i = 0; i < m395PatternDraft.length; i += 1) {
      (function (index) {
        var group = m395PatternDraft[index];
        var row = document.createElement("div");
        row.className = "m395PatternRow";
        row.setAttribute("data-pattern-id", group.id);
        row.style.borderLeft = "8px solid " + M395_PATTERN_PALETTE[index % M395_PATTERN_PALETTE.length];

        var nameLabel = document.createElement("label");
        nameLabel.className = "m395PatternName";
        nameLabel.textContent = "Pattern " + (index + 1) + " Name";
        var nameInput = document.createElement("input");
        nameInput.setAttribute("data-pattern-field", "name");
        nameInput.value = group.name;
        nameLabel.appendChild(nameInput);
        if (group.id === M395_PATTERN_DEFAULT_ID) {
          var badge = document.createElement("div");
          badge.className = "m395PatternDefaultBadge";
          badge.textContent = "DEFAULT FOR UNASSIGNED HOLES";
          nameLabel.appendChild(badge);
        }

        function dimensionLabel(text, field, value) {
          var label = document.createElement("label");
          label.textContent = text;
          var input = document.createElement("input");
          input.type = "number";
          input.step = "0.1";
          input.min = "0";
          input.setAttribute("inputmode", "decimal");
          input.setAttribute("data-pattern-field", field);
          input.value = value;
          label.appendChild(input);
          return label;
        }

        row.appendChild(nameLabel);
        row.appendChild(dimensionLabel("Burden (ft)", "burden", group.burden));
        row.appendChild(dimensionLabel("Spacing (ft)", "spacing", group.spacing));

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger m395PatternDelete";
        remove.textContent = group.id === M395_PATTERN_DEFAULT_ID ? "Main" : "Remove";
        remove.disabled = group.id === M395_PATTERN_DEFAULT_ID;
        if (!remove.disabled) {
          remove.addEventListener("click", function () {
            m395PatternDraft = m395ReadPatternDraftFromDOM().filter(function (entry) { return entry.id !== group.id; });
            m395RenderPatternDraft();
          });
        }
        row.appendChild(remove);
        root.appendChild(row);
      })(i);
    }
  }

  function m395OpenPatternManager(fromShotInfo) {
    m395EnsurePatternManagerModal();
    var groups = m395EnsurePatternState();
    m395PatternDraft = JSON.parse(JSON.stringify(groups));
    if (fromShotInfo) {
      var burden = byId("m395DefaultBurden");
      var spacing = byId("m395DefaultSpacing");
      if (burden) m395PatternDraft[0].burden = m395NormalizePatternDimension(burden.value);
      if (spacing) m395PatternDraft[0].spacing = m395NormalizePatternDimension(spacing.value);
    }
    m395RenderPatternDraft();
    byId("m395PatternManagerModal").classList.add("show");
  }

  function m395ClosePatternManager() {
    var modal = byId("m395PatternManagerModal");
    if (modal) modal.classList.remove("show");
  }

  function m395AddPatternDraftRow() {
    m395PatternDraft = m395ReadPatternDraftFromDOM();
    var id;
    do { id = "pattern" + (m395PatternSequence++); } while (m395PatternDraft.some(function (group) { return group.id === id; }));
    m395PatternDraft.push({ id: id, name: "Pattern " + (m395PatternDraft.length + 1), burden: "", spacing: "" });
    m395RenderPatternDraft();
  }

  function m395SavePatternManager() {
    var draft = m395ReadPatternDraftFromDOM();
    if (!draft.length || draft[0].id !== M395_PATTERN_DEFAULT_ID) {
      alert("The Main Pattern could not be found. Close this window and try again.");
      return;
    }
    var names = {};
    for (var i = 0; i < draft.length; i += 1) {
      draft[i].name = String(draft[i].name || "").trim() || (i === 0 ? "Main Pattern" : "Pattern " + (i + 1));
      draft[i].burden = m395NormalizePatternDimension(draft[i].burden);
      draft[i].spacing = m395NormalizePatternDimension(draft[i].spacing);
      var key = draft[i].name.toLowerCase();
      if (names[key]) {
        alert("Pattern names must be unique. Rename one of the “" + draft[i].name + "” patterns.");
        return;
      }
      names[key] = true;
      if (i > 0 && (!draft[i].burden || !draft[i].spacing)) {
        alert("Enter a positive burden and spacing for " + draft[i].name + ".");
        return;
      }
    }

    var allowed = {};
    for (i = 0; i < draft.length; i += 1) allowed[draft[i].id] = true;
    var reassignedCount = 0;
    if (typeof pagesData !== "undefined") {
      Object.keys(pagesData || {}).forEach(function (pageKey) {
        Object.keys(pagesData[pageKey] || {}).forEach(function (holeId) {
          var record = pagesData[pageKey][holeId];
          if (record && record.PatternID && !allowed[record.PatternID]) reassignedCount += 1;
        });
      });
    }
    if (reassignedCount && !confirm("Removing this pattern will reassign " + reassignedCount + " hole" + (reassignedCount === 1 ? "" : "s") + " to the Main Pattern. Continue?")) return;
    if (reassignedCount && typeof pagesData !== "undefined") {
      Object.keys(pagesData || {}).forEach(function (pageKey) {
        Object.keys(pagesData[pageKey] || {}).forEach(function (holeId) {
          var record = pagesData[pageKey][holeId];
          if (record && record.PatternID && !allowed[record.PatternID]) record.PatternID = M395_PATTERN_DEFAULT_ID;
        });
      });
    }

    headerData.PatternGroups = draft;
    headerData.DefaultBurden = draft[0].burden;
    headerData.DefaultSpacing = draft[0].spacing;
    headerData.DefaultPatternID = M395_PATTERN_DEFAULT_ID;
    m395PersistPatternHeader();
    m395SyncShotPatternInfoFields();
    try { if (typeof m395SyncDrillPatternInfoFields === "function") m395SyncDrillPatternInfoFields(); } catch (error) {}
    try { if (typeof saveData === "function") saveData(); } catch (error2) {}
    try { if (typeof saveState === "function") saveState(); } catch (error3) {}
    try { if (typeof markDirty === "function") markDirty(); } catch (error4) {}
    m395ClosePatternManager();
    m395PatternOverlayVisible = draft.length > 1;
    m395DrillPatternOverlayVisible = draft.length > 1;
    try { draw(); } catch (error5) {}
  }

  function m395AugmentShotMenu() {
    var menu = byId("menuModal");
    if (!menu || byId("m395PatternMenuButton")) return;
    var info = menu.querySelector('[data-m395-action="info"]');
    if (!info || !info.parentNode) return;
    var button = document.createElement("button");
    button.id = "m395PatternMenuButton";
    button.type = "button";
    button.textContent = "Patterns & Shot Volume";
    button.addEventListener("click", function () { closeMenu(); m395OpenPatternManager(false); });
    info.parentNode.insertBefore(button, info.nextSibling);
  }

  function m395EnsureAssignPatternModal() {
    var modal = byId("m395AssignPatternModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m395AssignPatternModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span>Assign Pattern</span><button type="button" id="m395AssignPatternClose">Close</button></div>',
      '  <p id="m395AssignPatternCount" class="m395PatternHelp"></p>',
      '  <label>Pattern<select id="m395AssignPatternSelect"></select></label>',
      '  <div class="buttonGrid"><button type="button" class="primary" id="m395AssignPatternSave">Assign to Selection</button><button type="button" id="m395AssignPatternCancel">Cancel</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m395AssignPatternClose").addEventListener("click", m395CloseAssignPattern);
    byId("m395AssignPatternCancel").addEventListener("click", m395CloseAssignPattern);
    byId("m395AssignPatternSave").addEventListener("click", m395AssignPatternToSelection);
    return modal;
  }

  function m395OpenAssignPattern() {
    var selected = shotEditSortedSelection();
    if (!selected.length) {
      shotEditSetHint("Select at least one saved hole before assigning a pattern.");
      return;
    }
    m395EnsureAssignPatternModal();
    var groups = m395EnsurePatternState();
    var select = byId("m395AssignPatternSelect");
    select.innerHTML = "";
    for (var i = 0; i < groups.length; i += 1) {
      var option = document.createElement("option");
      option.value = groups[i].id;
      option.textContent = m395PatternLabel(groups[i]);
      select.appendChild(option);
    }
    byId("m395AssignPatternCount").textContent = selected.length + " selected hole" + (selected.length === 1 ? "" : "s") + ".";
    byId("m395AssignPatternModal").classList.add("show");
  }

  function m395CloseAssignPattern() {
    var modal = byId("m395AssignPatternModal");
    if (modal) modal.classList.remove("show");
  }

  function m395AssignPatternToSelection() {
    var selected = shotEditSortedSelection();
    if (!selected.length) { m395CloseAssignPattern(); return; }
    var groups = m395EnsurePatternState();
    var map = m395PatternMap(groups);
    var selectedId = byId("m395AssignPatternSelect").value;
    if (!map[selectedId]) selectedId = M395_PATTERN_DEFAULT_ID;
    shotPushUndo("assign pattern");
    for (var i = 0; i < selected.length; i += 1) {
      var record = (pagesData[String(selected[i].pageNum)] || {})[selected[i].holeId];
      if (record) record.PatternID = selectedId;
    }
    shotPersistEditedState();
    m395PatternOverlayVisible = true;
    m395CloseAssignPattern();
    draw();
    shotEditSetHint("Assigned " + selected.length + " hole" + (selected.length === 1 ? "" : "s") + " to " + map[selectedId].name + ".");
  }

  function m395DrawPatternOverlay() {
    if (!m395PatternOverlayVisible || typeof shotEditMode === "undefined" || !shotEditMode || !ctx || !view) return;
    var groups = m395EnsurePatternState();
    var map = m395PatternMap(groups);
    var indexById = {};
    for (var g = 0; g < groups.length; g += 1) indexById[groups[g].id] = g;

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    Object.keys(pagesData || {}).forEach(function (pageKey) {
      var pageNum = Number(pageKey);
      var origin = pageOrigin(pageNum);
      Object.keys(pagesData[pageKey] || {}).forEach(function (holeId) {
        var record = pagesData[pageKey][holeId];
        if (!record) return;
        var id = m395EffectivePatternId(record, groups);
        var groupIndex = indexById[id] || 0;
        var color = M395_PATTERN_PALETTE[groupIndex % M395_PATTERN_PALETTE.length];
        var pos = parseHoleID(holeId);
        var rect = holeRect(pos.row, pos.col);
        ctx.save();
        ctx.translate(origin.x, origin.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, 4 / Math.max(.25, view.scale));
        ctx.strokeRect(rect.x + 7, rect.y + 7, Math.max(8, rect.w - 14), Math.max(8, rect.h - 14));
        ctx.fillStyle = color;
        ctx.fillRect(rect.x + 8, rect.y + 8, 19, 17);
        ctx.fillStyle = "#fff";
        ctx.font = "900 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(groupIndex + 1), rect.x + 17.5, rect.y + 16.5);
        ctx.restore();
      });
    });
    ctx.restore();
  }

  function m395InstallPatternDrawing() {
    if (window.__mithrilM395PatternDrawing || typeof window.draw !== "function") return;
    window.__mithrilM395PatternDrawing = true;
    var originalDraw = window.draw;
    window.draw = function () {
      var result = originalDraw.apply(this, arguments);
      m395DrawPatternOverlay();
      return result;
    };
  }

  function m395RefreshPatternEditButtons() {
    var assign = byId("m395AssignPatternButton");
    if (assign) assign.disabled = !shotEditSelectionList().length;
    var toggle = byId("m395ShowPatternsButton");
    if (toggle) {
      toggle.textContent = m395PatternOverlayVisible ? "Hide Pattern Colors" : "Show Pattern Colors";
      toggle.classList.toggle("active", m395PatternOverlayVisible);
    }
  }

  function m395AugmentShotEditBar() {
    var bar = byId("m395ShotEditBar");
    if (!bar || byId("m395AssignPatternButton")) return;
    var row = document.createElement("div");
    row.className = "m395PatternEditRow";
    row.innerHTML = '<button type="button" id="m395AssignPatternButton">Assign Pattern</button><button type="button" id="m395ShowPatternsButton">Show Pattern Colors</button>';
    var hint = byId("m395ShotEditHint");
    bar.insertBefore(row, hint || null);
    byId("m395AssignPatternButton").addEventListener("click", m395OpenAssignPattern);
    byId("m395ShowPatternsButton").addEventListener("click", function () {
      m395PatternOverlayVisible = !m395PatternOverlayVisible;
      m395RefreshPatternEditButtons();
      draw();
    });

    var originalUpdateBar = shotUpdateEditBar;
    shotUpdateEditBar = function () {
      var result = originalUpdateBar.apply(this, arguments);
      m395RefreshPatternEditButtons();
      return result;
    };

    var originalStartEdit = startShotEditMode;
    startShotEditMode = function () {
      m395PatternOverlayVisible = m395EnsurePatternState().length > 1;
      var result = originalStartEdit.apply(this, arguments);
      m395RefreshPatternEditButtons();
      draw();
      return result;
    };
    window.startShotEditMode = startShotEditMode;

    var done = byId("m395ShotEditDone");
    if (done) done.addEventListener("click", function () { m395PatternOverlayVisible = false; });
    m395RefreshPatternEditButtons();
  }

  function m395RowMeaningfulForPattern(row) {
    var fields = ["Depth", "Overburden", "Stemming", "PrimaryLoad", "SecondaryLoad", "Timing", "Notes"];
    for (var i = 0; i < fields.length; i += 1) if (String(row && row[fields[i]] || "").trim()) return true;
    return !!(row && (row.Wet === true || String(row.Wet).toLowerCase() === "yes" || row.BadHole === true || String(row.BadHole).toLowerCase() === "yes" || row.DirtHole === true || String(row.DirtHole).toLowerCase() === "yes"));
  }

  function m395UniqueLabels(values) {
    var seen = {}, result = [];
    for (var i = 0; i < (values || []).length; i += 1) {
      var value = String(values[i]);
      if (!seen[value]) { seen[value] = true; result.push(value); }
    }
    return result;
  }

  function m395BuildPatternSummary(rows, rawGroups) {
    var groups = m395NormalizePatternArray(rawGroups, "", "");
    var map = m395PatternMap(groups);
    var breakdown = [];
    var breakdownMap = {};
    var pages = {};
    var i;
    for (i = 0; i < (rows || []).length; i += 1) pages[String(Number(rows[i].PageNumber || 1))] = true;
    var multiPage = Object.keys(pages).length > 1;

    for (i = 0; i < groups.length; i += 1) {
      var item = {
        id: groups[i].id,
        name: groups[i].name,
        burden: m395PositivePatternNumber(groups[i].burden),
        spacing: m395PositivePatternNumber(groups[i].spacing),
        holes: 0,
        areaHoles: 0,
        rockOnlyVolumeHoles: 0,
        rockAndOverburdenVolumeHoles: 0,
        areaSqFt: 0,
        shotVolumeRockOnlyCubicYards: 0,
        shotVolumeRockAndOverburdenCubicYards: 0
      };
      breakdown.push(item);
      breakdownMap[item.id] = item;
    }

    var missingDimensions = [];
    var missingDepth = [];
    var missingOverburden = [];
    var invalidRockDepth = [];
    var excludedDirtBad = 0;
    var eligible = 0;

    for (i = 0; i < (rows || []).length; i += 1) {
      var row = rows[i] || {};
      if (!m395RowMeaningfulForPattern(row)) continue;
      var dirt = row.DirtHole === true || String(row.DirtHole || "").toLowerCase() === "yes";
      var bad = row.BadHole === true || String(row.BadHole || "").toLowerCase() === "yes";
      if (dirt || bad) { excludedDirtBad += 1; continue; }
      eligible += 1;

      var id = String(row.PatternID || M395_PATTERN_DEFAULT_ID);
      if (!map[id]) id = M395_PATTERN_DEFAULT_ID;
      var detail = breakdownMap[id] || breakdownMap[M395_PATTERN_DEFAULT_ID];
      var label = m395PageHoleLabel(row, multiPage);
      detail.holes += 1;

      if (detail.burden === null || detail.spacing === null) {
        missingDimensions.push(label);
        continue;
      }

      var area = detail.burden * detail.spacing;
      detail.areaHoles += 1;
      detail.areaSqFt += area;

      var depth = m395StrictPositiveNumber(row.Depth);
      if (depth === null) {
        missingDepth.push(label);
        continue;
      }

      // Total shot volume uses total drilled depth and therefore does not need
      // an overburden value.
      detail.rockAndOverburdenVolumeHoles += 1;
      detail.shotVolumeRockAndOverburdenCubicYards += area * depth / 27;

      var overburden = m395NonnegativeNumber(row.Overburden);
      if (overburden === null) {
        missingOverburden.push(label);
        continue;
      }
      if (overburden > depth) {
        invalidRockDepth.push(label);
        continue;
      }
      detail.rockOnlyVolumeHoles += 1;
      detail.shotVolumeRockOnlyCubicYards += area * Math.max(depth - overburden, 0) / 27;
    }

    var totalArea = 0;
    var totalRockOnlyVolume = 0;
    var totalRockAndOverburdenVolume = 0;
    var totalAreaHoles = 0;
    var totalRockOnlyVolumeHoles = 0;
    var totalRockAndOverburdenVolumeHoles = 0;
    for (i = 0; i < breakdown.length; i += 1) {
      totalArea += breakdown[i].areaSqFt;
      totalRockOnlyVolume += breakdown[i].shotVolumeRockOnlyCubicYards;
      totalRockAndOverburdenVolume += breakdown[i].shotVolumeRockAndOverburdenCubicYards;
      totalAreaHoles += breakdown[i].areaHoles;
      totalRockOnlyVolumeHoles += breakdown[i].rockOnlyVolumeHoles;
      totalRockAndOverburdenVolumeHoles += breakdown[i].rockAndOverburdenVolumeHoles;
    }

    return {
      groups: groups,
      breakdown: breakdown,
      eligibleHoles: eligible,
      excludedDirtBad: excludedDirtBad,
      totalAreaSqFt: totalArea,
      totalAreaSqYd: totalArea / 9,
      totalShotVolumeRockOnlyCubicYards: totalRockOnlyVolume,
      totalShotVolumeRockAndOverburdenCubicYards: totalRockAndOverburdenVolume,
      areaHoleCount: totalAreaHoles,
      rockOnlyVolumeHoleCount: totalRockOnlyVolumeHoles,
      rockAndOverburdenVolumeHoleCount: totalRockAndOverburdenVolumeHoles,
      missingDimensions: m395UniqueLabels(missingDimensions),
      missingDepth: m395UniqueLabels(missingDepth),
      missingOverburden: m395UniqueLabels(missingOverburden),
      invalidRockDepth: m395UniqueLabels(invalidRockDepth)
    };
  }

  function m395PatternWarningsText(summary) {
    var parts = [];
    if (summary.missingDimensions.length) parts.push(summary.missingDimensions.length + " missing pattern dimensions");
    if (summary.missingDepth.length) parts.push(summary.missingDepth.length + " missing depth");
    if (summary.missingOverburden.length) parts.push(summary.missingOverburden.length + " missing overburden for rock-only volume");
    if (summary.invalidRockDepth.length) parts.push(summary.invalidRockDepth.length + " with overburden greater than depth");
    return parts.length ? parts.join("; ") : "None";
  }

  function m395PatternSystemConfigured(summary, rows) {
    if (!summary) return false;
    if ((summary.groups || []).length > 1) return true;
    for (var i = 0; i < (summary.groups || []).length; i += 1) {
      if (m395PositivePatternNumber(summary.groups[i].burden) !== null || m395PositivePatternNumber(summary.groups[i].spacing) !== null) return true;
    }
    for (var r = 0; r < (rows || []).length; r += 1) {
      if (rows[r] && rows[r].PatternID && rows[r].PatternID !== M395_PATTERN_DEFAULT_ID) return true;
    }
    return false;
  }

  function m395PatternBreakdownHTML(summary) {
    var rows = [];
    for (var i = 0; i < summary.breakdown.length; i += 1) {
      var item = summary.breakdown[i];
      if (!item.holes) continue;
      var dims = item.burden !== null && item.spacing !== null ? m395FormatNumber(item.burden, 2) + " × " + m395FormatNumber(item.spacing, 2) + " ft" : "Not set";
      rows.push("<tr><td>" + m395EscapeHTML(item.name) + "</td><td>" + m395EscapeHTML(dims) + "</td><td>" + item.holes + "</td><td>" +
        (item.areaHoles ? m395FormatNumber(item.areaSqFt, 1) + " ft²" : "Not available") + "</td><td>" +
        (item.rockOnlyVolumeHoles ? m395FormatNumber(item.shotVolumeRockOnlyCubicYards, 1) + " yd³" : "Not available") + "</td><td>" +
        (item.rockAndOverburdenVolumeHoles ? m395FormatNumber(item.shotVolumeRockAndOverburdenCubicYards, 1) + " yd³" : "Not available") + "</td></tr>");
    }
    if (!rows.length) rows.push('<tr><td colspan="6">No eligible pattern holes were available.</td></tr>');

    function warningLine(label, values) {
      if (!values.length) return "";
      var shown = values.slice(0, 10).join(", ");
      if (values.length > 10) shown += " + " + (values.length - 10) + " more";
      return "<li><b>" + m395EscapeHTML(label) + ":</b> " + m395EscapeHTML(shown) + "</li>";
    }

    var warnings = warningLine("Missing burden or spacing", summary.missingDimensions) +
      warningLine("Missing depth", summary.missingDepth) +
      warningLine("Missing overburden for rock-only volume", summary.missingOverburden) +
      warningLine("Overburden greater than depth", summary.invalidRockDepth);

    return [
      '<section class="m395PatternSheet break">',
      '  <h1>MITHRIL Pattern &amp; Shot Volume Breakdown</h1>',
      '  <div class="m395PatternSub">Estimated from burden × spacing for each eligible hole. Rock-only volume uses depth minus overburden. Rock-and-overburden volume uses total drilled depth. Dirt and bad holes are excluded.</div>',
      '  <div class="m395PatternTotals">',
      '    <div><b>Estimated Pattern Area</b><span>' + (summary.areaHoleCount ? m395FormatNumber(summary.totalAreaSqFt, 1) + ' ft² / ' + m395FormatNumber(summary.totalAreaSqYd, 1) + ' yd²' : 'Not available') + '</span></div>',
      '    <div><b>Shot Volume (Rock Only)</b><span>' + (summary.rockOnlyVolumeHoleCount ? m395FormatNumber(summary.totalShotVolumeRockOnlyCubicYards, 1) + ' yd³' : 'Not available') + '</span></div>',
      '    <div><b>Shot Volume (Rock and Overburden)</b><span>' + (summary.rockAndOverburdenVolumeHoleCount ? m395FormatNumber(summary.totalShotVolumeRockAndOverburdenCubicYards, 1) + ' yd³' : 'Not available') + '</span></div>',
      '  </div>',
      '  <table class="m395PatternTable"><thead><tr><th>Pattern</th><th>Burden × Spacing</th><th>Holes</th><th>Area</th><th>Rock Only</th><th>Rock + Overburden</th></tr></thead><tbody>' + rows.join("") + '</tbody></table>',
      warnings ? '<div class="m395PatternWarnings"><h2>Calculation Warnings</h2><ul>' + warnings + '</ul></div>' : '<div class="m395PatternGood">All eligible holes had the information required for their assigned calculations.</div>',
      '  <div class="m395PatternNote">These are planning/reporting estimates based on rectangular burden × spacing cells. Irregular edges, partial cells, angled drilling, face geometry, and surveyed boundaries can change the actual area or volume.</div>',
      '</section>'
    ].join("");
  }

  function installShotPatternSystem() {
    if (window.__mithrilM395ShotPatternSystem) return;
    if (typeof headerData === "undefined" || typeof pagesData === "undefined") return;
    window.__mithrilM395ShotPatternSystem = true;
    m395EnsurePatternStyles();
    m395EnsureShotPatternInfoFields();
    m395EnsurePatternState();
    m395PersistPatternHeader();
    m395EnsurePatternManagerModal();
    m395EnsureAssignPatternModal();
    m395AugmentShotMenu();

    var originalOpenShotInfo = window.openShotInfo;
    if (typeof originalOpenShotInfo === "function") {
      window.openShotInfo = function () {
        var result = originalOpenShotInfo.apply(this, arguments);
        m395SyncShotPatternInfoFields();
        return result;
      };
    }

    var originalSaveHeaderData = window.saveHeaderData;
    if (typeof originalSaveHeaderData === "function") {
      window.saveHeaderData = function () {
        var burdenValue = byId("m395DefaultBurden") ? byId("m395DefaultBurden").value : "";
        var spacingValue = byId("m395DefaultSpacing") ? byId("m395DefaultSpacing").value : "";
        var result = originalSaveHeaderData.apply(this, arguments);
        var groups = m395EnsurePatternState();
        groups[0].burden = m395NormalizePatternDimension(burdenValue);
        groups[0].spacing = m395NormalizePatternDimension(spacingValue);
        headerData.PatternGroups = groups;
        headerData.DefaultBurden = groups[0].burden;
        headerData.DefaultSpacing = groups[0].spacing;
        m395PersistPatternHeader();
        return result;
      };
    }

    var originalBackupInfo = window.getCurrentShotInfoForBackup;
    if (typeof originalBackupInfo === "function") {
      window.getCurrentShotInfoForBackup = function () {
        var info = originalBackupInfo.apply(this, arguments) || {};
        var groups = m395EnsurePatternState();
        info.DefaultBurden = groups[0].burden;
        info.DefaultSpacing = groups[0].spacing;
        info.DefaultPatternID = M395_PATTERN_DEFAULT_ID;
        info.PatternGroups = JSON.parse(JSON.stringify(groups));
        return info;
      };
    }

    var originalNormalizeHeader = window.normalizeLoadedHeaderData;
    if (typeof originalNormalizeHeader === "function") {
      window.normalizeLoadedHeaderData = function (payload) {
        var normalized = originalNormalizeHeader.apply(this, arguments) || {};
        var source = payload && (payload.headerData || payload.shotInfo || payload.header) || {};
        var groups = m395NormalizePatternArray(
          source.PatternGroups || source.patternGroups,
          source.DefaultBurden || source.defaultBurden,
          source.DefaultSpacing || source.defaultSpacing
        );
        normalized.PatternGroups = groups;
        normalized.DefaultBurden = groups[0].burden;
        normalized.DefaultSpacing = groups[0].spacing;
        normalized.DefaultPatternID = M395_PATTERN_DEFAULT_ID;
        return normalized;
      };
    }

    var originalReport = window.getPrintableReportHTML;
    if (typeof originalReport === "function") {
      window.getPrintableReportHTML = function () {
        var html = String(originalReport.apply(this, arguments));
        var rows = typeof window.getAllHoleRows === "function" ? window.getAllHoleRows() : [];
        var summary = m395BuildPatternSummary(rows, m395EnsurePatternState());
        var configured = m395PatternSystemConfigured(summary, rows);
        if (!configured) return html;
        var areaValue = summary.areaHoleCount ? m395FormatNumber(summary.totalAreaSqFt, 1) + " ft² / " + m395FormatNumber(summary.totalAreaSqYd, 1) + " yd²" : "Not available";
        var rockOnlyValue = summary.rockOnlyVolumeHoleCount ? m395FormatNumber(summary.totalShotVolumeRockOnlyCubicYards, 1) + " yd³" : "Not available";
        var totalShotValue = summary.rockAndOverburdenVolumeHoleCount ? m395FormatNumber(summary.totalShotVolumeRockAndOverburdenCubicYards, 1) + " yd³" : "Not available";
        var extraRows = '<tr><th>Estimated Pattern Area</th><td>' + m395EscapeHTML(areaValue) + '</td></tr>' +
          '<tr><th>Shot Volume (Rock Only)</th><td>' + m395EscapeHTML(rockOnlyValue) + '</td></tr>' +
          '<tr><th>Shot Volume (Rock and Overburden)</th><td>' + m395EscapeHTML(totalShotValue) + '</td></tr>' +
          '<tr><th>Pattern Calculation Warnings</th><td>' + m395EscapeHTML(m395PatternWarningsText(summary)) + '</td></tr>';
        var firstTableEnd = html.indexOf("</table>");
        if (firstTableEnd !== -1) html = html.slice(0, firstTableEnd) + extraRows + html.slice(firstTableEnd);

        var css = [
          '.m395PatternSheet{width:8.25in;min-height:10.4in;box-sizing:border-box;padding:.15in .18in;background:#fff}',
          '.m395PatternSheet h1{font-size:24px;margin:0 0 6px}',
          '.m395PatternSub{font-size:12px;color:#555;margin-bottom:12px}',
          '.m395PatternTotals{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}',
          '.m395PatternTotals>div{border:2px solid #1f6feb;background:#eef4ff;padding:10px}',
          '.m395PatternTotals b{display:block;font-size:12px;color:#34506f;text-transform:uppercase}',
          '.m395PatternTotals span{display:block;font-size:21px;font-weight:950;margin-top:4px}',
          '.m395PatternTable{font-size:9.5px;margin-top:10px}',
          '.m395PatternTable th{width:auto;background:#e8eef6}',
          '.m395PatternWarnings{margin-top:12px;border:1px solid #c98b00;background:#fff5d6;padding:9px;font-size:12px}',
          '.m395PatternWarnings h2{margin:0 0 5px}',
          '.m395PatternWarnings ul{margin:5px 0 0 20px;padding:0}',
          '.m395PatternGood{margin-top:12px;border:1px solid #5c9b66;background:#e9f7e9;padding:10px;font-size:12px;font-weight:800}',
          '.m395PatternNote{margin-top:14px;font-size:11px;color:#555;border-top:1px solid #aaa;padding-top:8px}'
        ].join("");
        html = html.replace("</style>", css + "</style>");
        html = html.replace('<section class="overviewSheet break">', m395PatternBreakdownHTML(summary) + '<section class="overviewSheet break">');
        return html;
      };
    }

    m395InstallPatternDrawing();
  }




  // ---------------------------------------------------------------------------
  // m39.5 Drill Log pattern assignment and shot-volume reporting
  // ---------------------------------------------------------------------------
  var m395DrillPatternOverlayVisible = false;

  function m395EnsureDrillPatternInfoFields() {
    var modal = byId("infoModal");
    if (!modal) return;
    var form = modal.querySelector(".formGrid");
    if (!form) return;

    function addNumberField(id, labelText) {
      if (byId(id)) return byId(id);
      var label = document.createElement("label");
      label.textContent = labelText;
      var input = document.createElement("input");
      input.id = id;
      input.type = "number";
      input.step = "0.1";
      input.min = "0";
      input.setAttribute("inputmode", "decimal");
      input.placeholder = "ft";
      label.appendChild(input);
      form.appendChild(label);
      return input;
    }

    addNumberField("m395DrillDefaultBurden", "Default Burden (ft)");
    addNumberField("m395DrillDefaultSpacing", "Default Spacing (ft)");
    if (!byId("m395DrillManagePatternsFromInfo")) {
      var actions = document.createElement("div");
      actions.className = "m395ShotInfoPatternActions";
      var button = document.createElement("button");
      button.id = "m395DrillManagePatternsFromInfo";
      button.type = "button";
      button.textContent = "Manage Multiple Patterns";
      button.addEventListener("click", function () {
        m395ApplyDrillPatternInfoFields();
        m395OpenPatternManager(false);
      });
      actions.appendChild(button);
      form.appendChild(actions);
    }
  }

  function m395SyncDrillPatternInfoFields() {
    var groups = m395EnsurePatternState();
    var burden = byId("m395DrillDefaultBurden");
    var spacing = byId("m395DrillDefaultSpacing");
    if (burden) burden.value = groups[0].burden;
    if (spacing) spacing.value = groups[0].spacing;
  }

  function m395ApplyDrillPatternInfoFields(existingGroups) {
    var groups = m395NormalizePatternArray(existingGroups || headerData.PatternGroups, headerData.DefaultBurden, headerData.DefaultSpacing);
    var burden = byId("m395DrillDefaultBurden");
    var spacing = byId("m395DrillDefaultSpacing");
    groups[0].burden = m395NormalizePatternDimension(burden ? burden.value : groups[0].burden);
    groups[0].spacing = m395NormalizePatternDimension(spacing ? spacing.value : groups[0].spacing);
    headerData.PatternGroups = groups;
    headerData.DefaultBurden = groups[0].burden;
    headerData.DefaultSpacing = groups[0].spacing;
    headerData.DefaultPatternID = M395_PATTERN_DEFAULT_ID;
    m395PersistPatternHeader();
  }

  function m395AugmentDrillPatternMenu() {
    var menu = byId("menuModal");
    if (!menu || byId("m395DrillPatternMenuButton")) return;
    var info = menu.querySelector('[data-m395-action="info"]');
    if (!info || !info.parentNode) return;
    var button = document.createElement("button");
    button.id = "m395DrillPatternMenuButton";
    button.type = "button";
    button.textContent = "Patterns & Shot Volume";
    button.addEventListener("click", function () {
      closeMenu();
      m395OpenPatternManager(false);
    });
    info.parentNode.insertBefore(button, info.nextSibling);
  }

  function m395EnsureDrillAssignPatternModal() {
    var modal = byId("m395DrillAssignPatternModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m395DrillAssignPatternModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span>Assign Drill Pattern</span><button type="button" id="m395DrillAssignPatternClose">Close</button></div>',
      '  <p id="m395DrillAssignPatternCount" class="m395PatternHelp"></p>',
      '  <label>Pattern<select id="m395DrillAssignPatternSelect"></select></label>',
      '  <div class="buttonGrid"><button type="button" class="primary" id="m395DrillAssignPatternSave">Assign to Selection</button><button type="button" id="m395DrillAssignPatternCancel">Cancel</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m395DrillAssignPatternClose").addEventListener("click", m395CloseDrillAssignPattern);
    byId("m395DrillAssignPatternCancel").addEventListener("click", m395CloseDrillAssignPattern);
    byId("m395DrillAssignPatternSave").addEventListener("click", m395AssignDrillPatternToSelection);
    return modal;
  }

  function m395OpenDrillAssignPattern() {
    var selected = drillEditSortedSelection();
    if (!selected.length) {
      drillEditSetHint("Select at least one saved hole before assigning a pattern.");
      return;
    }
    m395EnsureDrillAssignPatternModal();
    var groups = m395EnsurePatternState();
    var select = byId("m395DrillAssignPatternSelect");
    select.innerHTML = "";
    for (var i = 0; i < groups.length; i += 1) {
      var option = document.createElement("option");
      option.value = groups[i].id;
      option.textContent = m395PatternLabel(groups[i]);
      select.appendChild(option);
    }
    byId("m395DrillAssignPatternCount").textContent = selected.length + " selected hole" + (selected.length === 1 ? "" : "s") + ".";
    byId("m395DrillAssignPatternModal").classList.add("show");
  }

  function m395CloseDrillAssignPattern() {
    var modal = byId("m395DrillAssignPatternModal");
    if (modal) modal.classList.remove("show");
  }

  function m395AssignDrillPatternToSelection() {
    var selected = drillEditSortedSelection();
    if (!selected.length) { m395CloseDrillAssignPattern(); return; }
    var groups = m395EnsurePatternState();
    var map = m395PatternMap(groups);
    var selectedId = byId("m395DrillAssignPatternSelect").value;
    if (!map[selectedId]) selectedId = M395_PATTERN_DEFAULT_ID;
    drillPushUndo("assign pattern");
    for (var i = 0; i < selected.length; i += 1) {
      var record = (pagesData[String(selected[i].pageNum)] || {})[selected[i].holeId];
      if (record) record.PatternID = selectedId;
    }
    drillPersistEditedState();
    m395DrillPatternOverlayVisible = true;
    m395CloseDrillAssignPattern();
    draw();
    drillEditSetHint("Assigned " + selected.length + " hole" + (selected.length === 1 ? "" : "s") + " to " + map[selectedId].name + ".");
  }

  function m395DrawDrillPatternOverlay() {
    if (!m395DrillPatternOverlayVisible || !drillEditMode || !ctx || !view) return;
    var groups = m395EnsurePatternState();
    var indexById = {};
    for (var g = 0; g < groups.length; g += 1) indexById[groups[g].id] = g;
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    Object.keys(pagesData || {}).forEach(function (pageKey) {
      var pageNum = Number(pageKey);
      var origin = pageOrigin(pageNum);
      Object.keys(pagesData[pageKey] || {}).forEach(function (holeId) {
        var record = pagesData[pageKey][holeId];
        if (!drillRecordHasData(record)) return;
        var id = m395EffectivePatternId(record, groups);
        var groupIndex = indexById[id] || 0;
        var color = M395_PATTERN_PALETTE[groupIndex % M395_PATTERN_PALETTE.length];
        var pos = parseHoleID(holeId);
        var center = holeCenter(pos.row, pos.col);
        ctx.save();
        ctx.translate(origin.x, origin.y);
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, 28, 26, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, 4 / Math.max(.08, view.scale));
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(center.x - 27, center.y - 27, 18, 17);
        ctx.fillStyle = "#fff";
        ctx.font = "900 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(groupIndex + 1), center.x - 18, center.y - 18.5);
        ctx.restore();
      });
    });
    ctx.restore();
  }

  function m395InstallDrillPatternDrawing() {
    if (window.__mithrilM395DrillPatternDrawing || typeof window.drawNow !== "function") return;
    window.__mithrilM395DrillPatternDrawing = true;
    var originalDrawNow = window.drawNow;
    window.drawNow = function () {
      var result = originalDrawNow.apply(this, arguments);
      m395DrawDrillPatternOverlay();
      return result;
    };
  }

  function m395RefreshDrillPatternEditButtons() {
    var assign = byId("m395DrillAssignPatternButton");
    if (assign) assign.disabled = !drillEditSelectionList().length;
    var toggle = byId("m395DrillShowPatternsButton");
    if (toggle) {
      toggle.textContent = m395DrillPatternOverlayVisible ? "Hide Pattern Colors" : "Show Pattern Colors";
      toggle.classList.toggle("active", m395DrillPatternOverlayVisible);
    }
  }

  function m395AugmentDrillEditBar() {
    var bar = byId("m395DrillEditBar");
    if (!bar || byId("m395DrillAssignPatternButton")) return;
    var row = document.createElement("div");
    row.className = "m395PatternEditRow";
    row.innerHTML = '<button type="button" id="m395DrillAssignPatternButton">Assign Pattern</button><button type="button" id="m395DrillShowPatternsButton">Show Pattern Colors</button>';
    var hint = byId("m395DrillEditHint");
    bar.insertBefore(row, hint || null);
    byId("m395DrillAssignPatternButton").addEventListener("click", m395OpenDrillAssignPattern);
    byId("m395DrillShowPatternsButton").addEventListener("click", function () {
      m395DrillPatternOverlayVisible = !m395DrillPatternOverlayVisible;
      m395RefreshDrillPatternEditButtons();
      draw();
    });

    var originalUpdate = drillUpdateEditBar;
    drillUpdateEditBar = function () {
      var result = originalUpdate.apply(this, arguments);
      m395RefreshDrillPatternEditButtons();
      return result;
    };

    var originalStart = startDrillEditMode;
    startDrillEditMode = function () {
      m395DrillPatternOverlayVisible = m395EnsurePatternState().length > 1;
      var result = originalStart.apply(this, arguments);
      m395RefreshDrillPatternEditButtons();
      draw();
      return result;
    };
    window.startDrillEditMode = startDrillEditMode;
    var done = byId("m395DrillEditDone");
    if (done) done.addEventListener("click", function () { m395DrillPatternOverlayVisible = false; });
    m395RefreshDrillPatternEditButtons();
  }

  function m395GetDrillPatternRows() {
    var rows = [];
    getPageNumbers().forEach(function (pageNum) {
      Object.keys(pagesData[String(pageNum)] || {}).sort(function (a, b) {
        var pa = parseHoleID(a), pb = parseHoleID(b);
        return pa.row - pb.row || pa.col - pb.col;
      }).forEach(function (holeId) {
        var record = pagesData[String(pageNum)][holeId];
        if (!drillRecordHasData(record)) return;
        var row = deepClone(record || {});
        row.PageNumber = pageNum;
        row.HoleID = holeId;
        rows.push(row);
      });
    });
    return rows;
  }

  function m395DrillPatternSummary() {
    return m395BuildPatternSummary(m395GetDrillPatternRows(), m395EnsurePatternState());
  }

  function m395RenderDrillPatternBreakdownCanvases() {
    var summary = m395DrillPatternSummary();
    var items = summary.breakdown.filter(function (item) { return item.holes > 0; });
    if (!items.length) items = summary.breakdown.slice(0, 1);
    var chunks = [];
    for (var i = 0; i < items.length; i += 8) chunks.push(items.slice(i, i + 8));
    if (!chunks.length) chunks.push([]);
    var canvases = [];

    function valueOrNA(count, value) { return count ? m395FormatNumber(value, 1) + " yd³" : "Not available"; }
    function warningText(label, values) {
      if (!values.length) return "";
      var shown = values.slice(0, 12).join(", ");
      if (values.length > 12) shown += " + " + (values.length - 12) + " more";
      return label + ": " + shown;
    }

    for (var pageIndex = 0; pageIndex < chunks.length; pageIndex += 1) {
      var c = document.createElement("canvas");
      c.width = IMG_W; c.height = IMG_H;
      var x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, IMG_W, IMG_H);
      x.textBaseline = "top"; x.fillStyle = "#111";
      x.font = "950 48px Arial"; x.fillText("PATTERN & SHOT VOLUME BREAKDOWN", 70, 60);
      x.font = "800 25px Arial";
      x.fillText("Job: " + (headerData.Job || ""), 70, 130);
      x.fillText("Drill Log: " + (headerData.DrillLogNumber || ""), 70, 168);
      x.fillText("Page " + (pageIndex + 1) + " of " + chunks.length, 1080, 130);

      var tableTop = 255;
      if (pageIndex === 0) {
        function totalBox(left, width, label, value, sub) {
          x.fillStyle = "#eef4ff"; x.strokeStyle = "#1f6feb"; x.lineWidth = 3;
          x.fillRect(left, 235, width, 160); x.strokeRect(left, 235, width, 160);
          x.fillStyle = "#34506f"; x.font = "900 18px Arial"; x.fillText(label, left + 14, 250);
          x.fillStyle = "#111"; x.font = "950 31px Arial"; x.fillText(value, left + 14, 292);
          x.fillStyle = "#666"; x.font = "700 15px Arial"; x.fillText(sub, left + 14, 345);
        }
        totalBox(70, 385, "ESTIMATED PATTERN AREA", summary.areaHoleCount ? m395FormatNumber(summary.totalAreaSqFt, 1) + " ft²" : "Not available", summary.areaHoleCount ? m395FormatNumber(summary.totalAreaSqYd, 1) + " yd²" : "Set burden and spacing");
        totalBox(490, 385, "SHOT VOLUME (ROCK ONLY)", valueOrNA(summary.rockOnlyVolumeHoleCount, summary.totalShotVolumeRockOnlyCubicYards), "Depth minus overburden");
        totalBox(910, 385, "SHOT VOLUME (ROCK + OVERBURDEN)", valueOrNA(summary.rockAndOverburdenVolumeHoleCount, summary.totalShotVolumeRockAndOverburdenCubicYards), "Uses total depth");
        tableTop = 455;
      }

      var cols = [70, 410, 610, 730, 900, 1100, 1295];
      x.fillStyle = "#e8eef6"; x.fillRect(70, tableTop, 1225, 55);
      x.strokeStyle = "#999"; x.lineWidth = 2; x.strokeRect(70, tableTop, 1225, 55);
      x.fillStyle = "#111"; x.font = "900 17px Arial";
      var headers = ["Pattern", "B × S", "Holes", "Area", "Rock Only", "Rock + OB"];
      for (var h = 0; h < headers.length; h += 1) x.fillText(headers[h], cols[h] + 8, tableTop + 17);
      for (var v = 1; v < cols.length - 1; v += 1) { x.beginPath(); x.moveTo(cols[v], tableTop); x.lineTo(cols[v], tableTop + 55 + chunks[pageIndex].length * 92); x.stroke(); }

      var y = tableTop + 55;
      for (var r = 0; r < chunks[pageIndex].length; r += 1) {
        var item = chunks[pageIndex][r];
        x.fillStyle = r % 2 ? "#fafafa" : "#fff"; x.fillRect(70, y, 1225, 92);
        x.strokeStyle = "#aaa"; x.strokeRect(70, y, 1225, 92);
        x.fillStyle = "#111"; x.font = "800 18px Arial";
        var dims = item.burden !== null && item.spacing !== null ? m395FormatNumber(item.burden, 2) + " × " + m395FormatNumber(item.spacing, 2) : "Not set";
        var values = [item.name, dims, String(item.holes), item.areaHoles ? m395FormatNumber(item.areaSqFt, 1) + " ft²" : "N/A", valueOrNA(item.rockOnlyVolumeHoles, item.shotVolumeRockOnlyCubicYards), valueOrNA(item.rockAndOverburdenVolumeHoles, item.shotVolumeRockAndOverburdenCubicYards)];
        for (var cidx = 0; cidx < values.length; cidx += 1) {
          var text = String(values[cidx]);
          if (text.length > 24 && cidx === 0) text = text.slice(0, 22) + "…";
          x.fillText(text, cols[cidx] + 8, y + 32);
        }
        y += 92;
      }

      if (pageIndex === chunks.length - 1) {
        var warnings = [
          warningText("Missing burden or spacing", summary.missingDimensions),
          warningText("Missing depth", summary.missingDepth),
          warningText("Missing overburden for rock-only volume", summary.missingOverburden),
          warningText("Overburden greater than depth", summary.invalidRockDepth)
        ].filter(Boolean);
        var wy = Math.max(y + 45, 1450);
        x.fillStyle = warnings.length ? "#fff5d6" : "#e9f7e9";
        x.strokeStyle = warnings.length ? "#c98b00" : "#5c9b66";
        x.fillRect(70, wy, 1225, Math.min(470, IMG_H - wy - 140));
        x.strokeRect(70, wy, 1225, Math.min(470, IMG_H - wy - 140));
        x.fillStyle = "#111"; x.font = "950 27px Arial"; x.fillText(warnings.length ? "Calculation Warnings" : "Calculation Review", 95, wy + 20);
        x.font = "700 20px Arial";
        if (!warnings.length) x.fillText("All eligible holes had the required information.", 105, wy + 75);
        else {
          for (var w = 0; w < warnings.length && w < 6; w += 1) {
            var line = warnings[w];
            if (line.length > 110) line = line.slice(0, 107) + "…";
            x.fillText("• " + line, 105, wy + 75 + w * 50);
          }
        }
        x.fillStyle = "#555"; x.font = "700 18px Arial";
        x.fillText("Dirt and bad holes are excluded. Results are estimates based on rectangular burden × spacing cells.", 95, wy + Math.min(390, IMG_H - wy - 190));
      }
      x.fillStyle = "#666"; x.font = "700 19px Arial"; x.fillText("Generated by MITHRIL Mobile " + APP_VERSION, 70, IMG_H - 80);
      canvases.push(c);
    }
    return canvases;
  }

  function installDrillPatternSystem() {
    if (window.__mithrilM395DrillPatternSystem) return;
    if (typeof headerData === "undefined" || typeof pagesData === "undefined") return;
    window.__mithrilM395DrillPatternSystem = true;
    m395EnsurePatternStyles();
    m395EnsureDrillPatternInfoFields();
    m395EnsurePatternState();
    m395PersistPatternHeader();
    m395EnsurePatternManagerModal();
    m395EnsureDrillAssignPatternModal();
    m395AugmentDrillPatternMenu();

    var originalOpenInfo = window.openInfo;
    if (typeof originalOpenInfo === "function") {
      window.openInfo = function () {
        var result = originalOpenInfo.apply(this, arguments);
        m395SyncDrillPatternInfoFields();
        return result;
      };
    }

    var originalSaveInfo = window.saveInfo;
    if (typeof originalSaveInfo === "function") {
      window.saveInfo = function () {
        var existing = JSON.parse(JSON.stringify(m395EnsurePatternState()));
        var burdenValue = byId("m395DrillDefaultBurden") ? byId("m395DrillDefaultBurden").value : existing[0].burden;
        var spacingValue = byId("m395DrillDefaultSpacing") ? byId("m395DrillDefaultSpacing").value : existing[0].spacing;
        var result = originalSaveInfo.apply(this, arguments);
        existing[0].burden = m395NormalizePatternDimension(burdenValue);
        existing[0].spacing = m395NormalizePatternDimension(spacingValue);
        headerData.PatternGroups = existing;
        headerData.DefaultBurden = existing[0].burden;
        headerData.DefaultSpacing = existing[0].spacing;
        headerData.DefaultPatternID = M395_PATTERN_DEFAULT_ID;
        m395PersistPatternHeader();
        return result;
      };
    }

    var originalSaveState = window.saveState;
    if (typeof originalSaveState === "function") {
      window.saveState = function () {
        m395EnsurePatternState();
        return originalSaveState.apply(this, arguments);
      };
    }

    var originalGetSummary = window.getDrillSummary;
    if (typeof originalGetSummary === "function") {
      window.getDrillSummary = function () {
        var summary = originalGetSummary.apply(this, arguments) || {};
        summary.patternSummary = m395DrillPatternSummary();
        return summary;
      };
    }

    var originalBuildPDFBlob = window.buildPDFBlob;
    if (typeof originalBuildPDFBlob === "function") {
      window.buildPDFBlob = function () {
        if (!templateImg.complete || !templateImg.naturalWidth) throw new Error("The drill-log template is still loading.");
        var rows = m395GetDrillPatternRows();
        var summary = m395DrillPatternSummary();
        var patternPages = m395PatternSystemConfigured(summary, rows) ? m395RenderDrillPatternBreakdownCanvases() : [];
        var canvases = [renderDrillSummaryCanvas()].concat(patternPages, getPageNumbers().map(renderDrillPageCanvas), renderNotesCanvases());
        return new Blob([buildPDFBytes(canvases)], { type: "application/pdf" });
      };
    }

    m395InstallDrillPatternDrawing();
    m395AugmentDrillEditBar();
  }

  // ---------------------------------------------------------------------------
  // m39.5 closable Shot Diagram PDF preview
  // ---------------------------------------------------------------------------
  var m395ShotPreviewBlobURL = "";
  var m395ShotPreviewPrintPending = false;
  var m395ShotPreviewInitialized = false;

  function m395ShotPreviewHostDocument() {
    try {
      if (window.parent && window.parent !== window && window.parent.document && window.parent.document.body) return window.parent.document;
    } catch (error) {}
    return document;
  }

  function m395ShotPreviewElement(id) {
    return m395ShotPreviewHostDocument().getElementById(id);
  }

  function m395EnsureShotPdfPreview() {
    var hostDocument = m395ShotPreviewHostDocument();
    var preview = hostDocument.getElementById("m395ShotPdfPreview");
    if (preview && m395ShotPreviewInitialized) return preview;
    if (preview && preview.parentNode) preview.parentNode.removeChild(preview);

    if (!hostDocument.getElementById("mithrilShotPdfPreviewM395Styles")) {
      var style = hostDocument.createElement("style");
      style.id = "mithrilShotPdfPreviewM395Styles";
      style.textContent = [
        ".m395ShotPdfPreview{display:none;position:fixed;inset:0;z-index:10000;background:#d9d9d9}",
        ".m395ShotPdfPreview.show{display:grid;grid-template-rows:auto 1fr}",
        ".m395ShotPdfToolbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px;background:#f7f7f7;border-bottom:1px solid #999;min-height:50px;box-sizing:border-box;font-family:Arial,sans-serif}",
        ".m395ShotPdfToolbarTitle{text-align:center;font-size:15px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        ".m395ShotPdfToolbar button{min-height:38px;border:1px solid #777;border-radius:7px;background:#f5f5f5;font-size:15px;font-weight:800;padding:6px 8px}",
        ".m395ShotPdfToolbar button.primary{background:#1f6feb;color:#fff;border-color:#1f6feb}",
        ".m395ShotPdfFrame{width:100%;height:100%;border:0;background:#fff}",
        "@media(max-width:600px){.m395ShotPdfToolbarTitle{font-size:13px}.m395ShotPdfToolbar button{font-size:13px;padding:5px 7px}}"
      ].join("");
      hostDocument.head.appendChild(style);
    }

    preview = hostDocument.createElement("div");
    preview.id = "m395ShotPdfPreview";
    preview.className = "m395ShotPdfPreview";
    preview.innerHTML = [
      '<div class="m395ShotPdfToolbar">',
      '  <button type="button" id="m395ShotPdfDone">Done</button>',
      '  <div class="m395ShotPdfToolbarTitle">Shot Diagram PDF Preview</div>',
      '  <button type="button" class="primary" id="m395ShotPdfShare">Share / Save PDF</button>',
      '</div>',
      '<iframe id="m395ShotPdfFrame" class="m395ShotPdfFrame" title="Shot Diagram PDF Preview"></iframe>'
    ].join("");
    hostDocument.body.appendChild(preview);
    hostDocument.getElementById("m395ShotPdfDone").addEventListener("click", m395CloseShotPdfPreview);
    hostDocument.getElementById("m395ShotPdfShare").addEventListener("click", m395PrintShotPdfPreview);
    m395ShotPreviewInitialized = true;
    return preview;
  }

  function m395CloseShotPdfPreview() {
    var preview = m395ShotPreviewElement("m395ShotPdfPreview");
    var frame = m395ShotPreviewElement("m395ShotPdfFrame");
    if (preview) preview.classList.remove("show");
    if (frame) {
      try { frame.srcdoc = ""; } catch (error) {}
      try { frame.removeAttribute("src"); } catch (error2) {}
    }
    if (m395ShotPreviewBlobURL) {
      try { URL.revokeObjectURL(m395ShotPreviewBlobURL); } catch (error3) {}
      m395ShotPreviewBlobURL = "";
    }
    m395ShotPreviewPrintPending = false;
  }

  function m395PrintShotPdfPreview() {
    var frame = m395ShotPreviewElement("m395ShotPdfFrame");
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (error) {
      alert("The PDF preview could not open the share/print screen. Tap Share / Save PDF again.");
    }
  }

  function m395OpenShotPdfPreview(html, autoPrint) {
    m395EnsureShotPdfPreview();
    var preview = m395ShotPreviewElement("m395ShotPdfPreview");
    var frame = m395ShotPreviewElement("m395ShotPdfFrame");
    preview.classList.add("show");
    m395ShotPreviewPrintPending = !!autoPrint;

    frame.onload = function () {
      try {
        var doc = frame.contentDocument;
        if (doc && doc.head) {
          var style = doc.createElement("style");
          style.textContent = ".noPrint{display:none!important}";
          doc.head.appendChild(style);
        }
      } catch (error) {}
      if (m395ShotPreviewPrintPending) {
        m395ShotPreviewPrintPending = false;
        setTimeout(m395PrintShotPdfPreview, 350);
      }
    };

    if ("srcdoc" in frame) {
      frame.srcdoc = html;
    } else {
      var blob = new Blob([html], { type: "text/html;charset=utf-8" });
      m395ShotPreviewBlobURL = URL.createObjectURL(blob);
      frame.src = m395ShotPreviewBlobURL;
    }
  }

  function installShotPdfPreview() {
    if (window.__mithrilM395ShotPdfPreview || typeof window.exportPDFReport !== "function") return;
    window.__mithrilM395ShotPdfPreview = true;
    m395EnsurePatternStyles();
    m395EnsureShotPdfPreview();

    window.exportPDFReport = function (skipQA) {
      if (!skipQA && typeof hasQAWarnings === "function" && hasQAWarnings()) {
        if (typeof openQAModal === "function") openQAModal("pdf");
        return;
      }
      var total = typeof getShotSummary === "function" ? getShotSummary().total : 0;
      if (!total) {
        alert("No hole data has been entered yet.");
        return;
      }
      var html = typeof getPrintableReportHTML === "function" ? getPrintableReportHTML() : "";
      m395OpenShotPdfPreview(html, true);
    };

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && m395ShotPreviewElement("m395ShotPdfPreview") && m395ShotPreviewElement("m395ShotPdfPreview").classList.contains("show")) m395CloseShotPdfPreview();
    });
  }

  window.MithrilM395PatternCalculations = {
    normalizePatternArray: m395NormalizePatternArray,
    normalizePatternDimension: m395NormalizePatternDimension,
    buildPatternSummary: m395BuildPatternSummary,
    warningsText: m395PatternWarningsText,
    patternBreakdownHTML: m395PatternBreakdownHTML,
    patternSystemConfigured: m395PatternSystemConfigured,
    drillPatternRows: function () { return typeof pagesData === "undefined" ? [] : m395GetDrillPatternRows(); },
    parseLoad: m395ParseLoad,
    anfoRate: m395AnfoRate,
    depthRangeFromValues: m395DepthRangeFromValues,
    shotLoadSummary: m395ShotLoadSummary
  };


  function initialize() {
    window.MithrilM395Calculations = {
      normalizeHoleDiameter: m395NormalizeHoleDiameter,
      anfoRate: m395AnfoRate,
      parseLoad: m395ParseLoad,
      depthRangeFromValues: m395DepthRangeFromValues,
      shotLoadSummary: m395ShotLoadSummary
    };
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
      installDrillSummaryCalculations();
      installDrillSummaryProminence();
      patchDrillNotesPages();
      updateToolbar(false);
      patchDrillMenu();
      patchDrillMultiQuick();
      installGPSFeature("drill", drillCanvas);
      installDrillHoleConditions();
      patchDrillConditionCSV();
      installDrillEditFeature(drillCanvas);
      installDrillPatternSystem();
      enableWheelZoom(drillCanvas);
    } else if (shotCanvas) {
      installPrecisionCanvasCoordinates(shotCanvas, "shot");
      updateToolbar(true);
      patchShotMenu();
      addShotInfoBackButton();
      installShotSummaryCalculations();
      installShotPatternSystem();
      installShotPdfPreview();
      patchShotMultiQuick();
      installGPSFeature("shot", shotCanvas);
      installShotEditFeature(shotCanvas);
      m395AugmentShotEditBar();
      enableWheelZoom(shotCanvas);
    } else if (byId("shotFrame")) {
      installShotFrameBridge();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
