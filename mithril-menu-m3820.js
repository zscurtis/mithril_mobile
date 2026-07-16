(function () {
  "use strict";

  var RELEASE_VERSION = "m38.20";
  var RELEASE_LABEL = "compact coordinate-only GPS callouts, GPS blank-tag fix, precision quick-fill targeting, multi quick fill, and canvas themes";
  var THEME_STORAGE_KEY = "mithrilCanvasThemeV1";
  var THEME_CLASS_PREFIX = "m3820-theme-";
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
    if (!canvas || canvas.getAttribute("data-m3820-precision-coordinates") === "true") return;

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

    canvas.setAttribute("data-m3820-precision-coordinates", "true");
  }

  function enableWheelZoom(canvas) {
    if (!canvas || canvas.getAttribute("data-m3820-wheel-zoom") === "true") return;
    canvas.setAttribute("data-m3820-wheel-zoom", "true");

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
    if (!modal || byId("m3820ShotInfoBack")) return;
    var grid = modal.querySelector(".buttonGrid");
    if (!grid) return;

    var button = document.createElement("button");
    button.id = "m3820ShotInfoBack";
    button.type = "button";
    button.className = "m3820BackMenu";
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
    if (!frame || frame.getAttribute("data-m3820-bridge") === "true") return;
    frame.setAttribute("data-m3820-bridge", "true");

    function injectChildScript() {
      try {
        var childDocument = frame.contentDocument;
        if (!childDocument || !childDocument.documentElement) return false;
        if (childDocument.getElementById("mithrilMenuM3820ChildLoader")) return true;

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM3820ChildLoader";
        script.src = "./mithril-menu-m3820.js?v=38.20-frame";
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
    if (byId("mithrilMenuM3820Styles")) return;

    var style = document.createElement("style");
    style.id = "mithrilMenuM3820Styles";
    style.textContent = [
      ".m3820MenuIntro{margin:0 0 10px;color:#4b4b4b;font-size:13px;font-weight:750;line-height:1.35}",
      ".m3820MenuStack{display:grid;grid-template-columns:1fr;gap:8px}",
      ".m3820MenuStack>button{width:100%;min-height:52px;text-align:left;padding:10px 13px;font-size:16px}",
      ".m3820MenuStack>button.m3820Home{text-align:center}",
      ".m3820Section{display:none;margin-top:9px;padding:10px;border:1px solid #bcbcbc;border-radius:11px;background:#f8f8f8}",
      ".m3820Section.show{display:block}",
      ".m3820SectionTitle{margin:0 0 8px;font-size:16px;font-weight:950}",
      ".m3820SectionHelp{margin:0 0 9px;color:#555;font-size:12px;font-weight:750;line-height:1.35}",
      ".m3820ActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3820ActionGrid button{min-height:49px}",
      ".m3820ActionGrid .wide{grid-column:1/-1}",
      ".m3820Subpanel{display:none;grid-column:1/-1;padding:9px;border:1px solid #c7c7c7;border-radius:10px;background:white}",
      ".m3820Subpanel.show{display:block}",
      ".m3820DirectionGrid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-areas:'. up .' 'left center right' '. down .';gap:8px}",
      ".m3820DirectionGrid button{min-height:50px;padding:7px 5px}",
      ".m3820Up{grid-area:up}.m3820Left{grid-area:left}.m3820Center{grid-area:center}.m3820Right{grid-area:right}.m3820Down{grid-area:down}",
      ".m3820Spacer{visibility:hidden;pointer-events:none}",
      ".m3820DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m3820DangerZone button{width:100%;min-height:50px}",
      ".m3820BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      ".m3820ThemePanel{max-height:46vh;overflow:auto;padding-right:2px}",
      ".m3820ThemeGroupTitle{margin:10px 0 6px;font-size:12px;font-weight:950;color:#555;text-transform:uppercase;letter-spacing:.04em}",
      ".m3820ThemeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3820ThemeButton{min-height:44px;font-size:13px;line-height:1.25;text-align:left}",
      ".m3820ThemeButton.active{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "html.m3820-theme-gray,body.m3820-theme-gray{background:#2e2e2e !important}",
      "html.m3820-theme-dark-slate,body.m3820-theme-dark-slate{background-color:#232a31 !important;background-image:radial-gradient(circle at 18% 18%, rgba(255,255,255,.06) 0 3px, transparent 4px),radial-gradient(circle at 76% 70%, rgba(0,0,0,.2) 0 18px, transparent 20px),linear-gradient(135deg,#20262d 0%,#313b46 100%) !important;background-size:140px 140px,220px 220px,cover !important;background-attachment:fixed !important}",
      "html.m3820-theme-blue-steel,body.m3820-theme-blue-steel{background-color:#566575 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.08) 0 2px, transparent 3px),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0) 38%),linear-gradient(135deg,#4b5a68 0%,#6b7d8f 100%) !important;background-size:150px 150px,cover,cover !important;background-attachment:fixed !important}",
      "html.m3820-theme-subtle-grid,body.m3820-theme-subtle-grid{background-color:#252e38 !important;background-image:radial-gradient(circle at center, rgba(255,255,255,.03) 1px, transparent 1px),repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 26px),linear-gradient(135deg,#232b34,#2e3945) !important;background-size:26px 26px,26px 26px,26px 26px,cover !important;background-attachment:fixed !important}",
      "html.m3820-theme-gradient-slate,body.m3820-theme-gradient-slate{background:#54606f !important;background-image:linear-gradient(135deg,#6b7786 0%,#3c4653 100%) !important;background-attachment:fixed !important}",
      "html.m3820-theme-dark-paper,body.m3820-theme-dark-paper{background-color:#35383d !important;background-image:radial-gradient(circle at 25% 25%, rgba(255,255,255,.05) 0 2px, transparent 3px),radial-gradient(circle at 75% 60%, rgba(255,255,255,.03) 0 1px, transparent 2px),linear-gradient(135deg,#2c3035 0%,#44484f 100%) !important;background-size:120px 120px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m3820-theme-soft-quarry-tan,body.m3820-theme-soft-quarry-tan{background-color:#b9aea0 !important;background-image:radial-gradient(circle at 20% 20%, rgba(255,255,255,.12) 0 2px, transparent 3px),radial-gradient(circle at 80% 70%, rgba(0,0,0,.08) 0 2px, transparent 3px),linear-gradient(135deg,#c8bdae 0%,#a89b8b 100%) !important;background-size:70px 70px,90px 90px,cover !important;background-attachment:fixed !important}",
      "html.m3820-theme-blast-ember,body.m3820-theme-blast-ember{background-color:#111 !important;background-image:radial-gradient(circle at 15% 78%, rgba(255,110,0,.72) 0 2%, transparent 8%),radial-gradient(circle at 82% 22%, rgba(255,90,0,.48) 0 1.4%, transparent 7%),repeating-linear-gradient(135deg, rgba(255,120,0,.0) 0 18px, rgba(255,110,0,.18) 18px 19px, transparent 19px 34px),linear-gradient(135deg,#090909,#262626) !important;background-attachment:fixed !important}",
      "html.m3820-theme-electric-steel,body.m3820-theme-electric-steel{background-color:#0e2032 !important;background-image:radial-gradient(circle at 50% 60%, rgba(0,150,255,.34) 0 18%, transparent 42%),repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 18px),linear-gradient(135deg,#091521,#27425f) !important;background-attachment:fixed !important}",
      "html.m3820-theme-blast-placard,body.m3820-theme-blast-placard{background-color:#111 !important;background-image:linear-gradient(45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),linear-gradient(-45deg, transparent 38%, rgba(255,150,30,.78) 38% 62%, transparent 62%),radial-gradient(circle at 80% 25%, rgba(255,165,0,.22) 0 12%, transparent 26%),repeating-linear-gradient(135deg, rgba(255,150,30,.22) 0 12px, transparent 12px 36px),linear-gradient(135deg,#090909,#1b1b1b) !important;background-size:280px 280px,280px 280px,cover,cover,cover !important;background-attachment:fixed !important}",
      "html.m3820-theme-copper-quarry,body.m3820-theme-copper-quarry{background-color:#5a2b11 !important;background-image:radial-gradient(circle at 25% 30%, rgba(255,170,100,.28) 0 14%, transparent 26%),radial-gradient(circle at 72% 68%, rgba(255,210,130,.16) 0 10%, transparent 24%),repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0 12px, rgba(0,0,0,.08) 12px 22px),linear-gradient(135deg,#4c200c,#8a481f) !important;background-attachment:fixed !important}",
      "html.m3820-theme-cobalt-topo,body.m3820-theme-cobalt-topo{background-color:#041c3a !important;background-image:radial-gradient(circle at 18% 72%, transparent 0 40px, rgba(0,180,255,.24) 41px 42px, transparent 43px 54px, rgba(0,180,255,.18) 55px 56px, transparent 57px),radial-gradient(circle at 78% 62%, transparent 0 50px, rgba(0,180,255,.22) 51px 52px, transparent 53px 66px, rgba(0,180,255,.18) 67px 68px, transparent 69px),radial-gradient(circle at 56% 22%, transparent 0 32px, rgba(0,180,255,.18) 33px 34px, transparent 35px 48px, rgba(0,180,255,.15) 49px 50px, transparent 51px),linear-gradient(135deg,#031325,#09447a) !important;background-attachment:fixed !important}",
      "html.m3820-theme-signal-red-slate,body.m3820-theme-signal-red-slate{background-color:#120b0b !important;background-image:radial-gradient(circle at 18% 78%, rgba(255,70,40,.34) 0 18%, transparent 30%),radial-gradient(circle at 84% 20%, rgba(255,60,30,.28) 0 12%, transparent 24%),repeating-linear-gradient(90deg, rgba(255,60,30,.16) 0 2px, transparent 2px 48px),linear-gradient(135deg,#0b0b0b,#272222) !important;background-attachment:fixed !important}",
      "@media(max-width:520px){.m3820QuickButton{font-size:0}.m3820QuickButton:after{content:'Quick';font-size:14px}.m3820FitButton{font-size:0}.m3820FitButton:after{content:'Fit';font-size:14px}.m3820ActionGrid{grid-template-columns:1fr}.m3820ActionGrid .wide{grid-column:auto}.m3820DirectionGrid{grid-template-columns:1fr 1fr 1fr}.m3820ThemeGrid{grid-template-columns:1fr}}"
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
        topButtons[i].classList.add("m3820QuickButton");
      }
    }

    var zoomButtons = header.querySelectorAll(".zoomRow button");
    if (zoomButtons.length && String(zoomButtons[0].textContent || "").trim() === "Fit") {
      zoomButtons[0].textContent = "Fit Page";
      zoomButtons[0].classList.add("m3820FitButton");
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
    var sections = box.querySelectorAll(".m3820Section");
    var buttons = box.querySelectorAll("[data-m3820-section]");
    var i;

    for (i = 0; i < sections.length; i += 1) {
      if (sections[i].id !== exceptId) sections[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3820-section");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function hideSubpanels(section, exceptId) {
    var panels = section.querySelectorAll(".m3820Subpanel");
    var buttons = section.querySelectorAll("[data-m3820-subpanel]");
    var i;

    for (i = 0; i < panels.length; i += 1) {
      if (panels[i].id !== exceptId) panels[i].classList.remove("show");
    }
    for (i = 0; i < buttons.length; i += 1) {
      var target = buttons[i].getAttribute("data-m3820-subpanel");
      if (target !== exceptId) setButtonArrow(buttons[i], false);
    }
  }

  function wireExpandableSections(box) {
    box.addEventListener("click", function (event) {
      var sectionButton = event.target.closest("[data-m3820-section]");
      if (sectionButton && box.contains(sectionButton)) {
        event.preventDefault();
        var sectionId = sectionButton.getAttribute("data-m3820-section");
        var section = byId(sectionId);
        if (!section) return;
        var opening = !section.classList.contains("show");
        hideAllSections(box, opening ? sectionId : "");
        section.classList.toggle("show", opening);
        setButtonArrow(sectionButton, opening);
        return;
      }

      var subButton = event.target.closest("[data-m3820-subpanel]");
      if (subButton && box.contains(subButton)) {
        event.preventDefault();
        var subId = subButton.getAttribute("data-m3820-subpanel");
        var subpanel = byId(subId);
        if (!subpanel) return;
        var parentSection = subButton.closest(".m3820Section");
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
      var sections = menu.querySelectorAll(".m3820Section,.m3820Subpanel");
      var buttons = menu.querySelectorAll("[data-m3820-section],[data-m3820-subpanel]");
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
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3820-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var label = button.getAttribute('data-label') || button.textContent.replace(/^✓\s*/, '').trim();
      button.setAttribute('data-label', label);
      var active = button.getAttribute('data-m3820-theme-choice') === current;
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
        html += '<button type="button" class="m3820ThemeButton" data-m3820-theme-choice="' + THEME_OPTIONS[i].key + '" data-label="' + THEME_OPTIONS[i].label + '">' + THEME_OPTIONS[i].label + '</button>';
      }
      return html;
    }

    return [
      '<button type="button" class="wide" data-m3820-subpanel="' + panelId + '" data-label="Canvas Background" aria-expanded="false">Canvas Background  ›</button>',
      '<div id="' + panelId + '" class="m3820Subpanel">',
      '  <div class="m3820ThemePanel">',
      '    <p class="m3820SectionHelp">Pick a canvas background. The theme applies immediately and stays saved on this device.</p>',
      '    <div class="m3820ThemeGroupTitle">Classic Themes</div>',
      '    <div class="m3820ThemeGrid">' + buildThemeButtons('classic') + '</div>',
      '    <div class="m3820ThemeGroupTitle">Bold Themes</div>',
      '    <div class="m3820ThemeGrid">' + buildThemeButtons('bold') + '</div>',
      '    <div class="m3820ThemeGroupTitle">Default</div>',
      '    <div class="m3820ThemeGrid">' + buildThemeButtons('reset') + '</div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function wireThemeButtons(root) {
    var buttons = root.querySelectorAll ? root.querySelectorAll('[data-m3820-theme-choice]') : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function () {
        chooseTheme(this.getAttribute('data-m3820-theme-choice'));
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
    if (!menu || menu.getAttribute("data-m3820-patched") === "drill") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3820-patched", "drill");
    box.innerHTML = [
      '<div class="boxHead"><span>Drill Log Menu</span><button type="button" data-m3820-action="close">Close</button></div>',
      '<p class="m3820MenuIntro">Daily tools stay visible. Setup, exports, and recovery tools open only when needed.</p>',
      '<div class="m3820MenuStack">',
      '  <button type="button" data-m3820-action="info">Drill Log Info</button>',
      '  <button type="button" data-m3820-section="m3820DrillPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3820DrillPages" class="m3820Section">',
      '    <div class="m3820SectionTitle">Page Tools</div>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" class="wide" data-m3820-subpanel="m3820DrillAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3820DrillAdd" class="m3820Subpanel">',
      '        <p class="m3820SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3820DirectionGrid">',
      '          <button type="button" class="m3820Up" data-m3820-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3820Left" data-m3820-add="left">← Add Left</button>',
      '          <button type="button" class="m3820Center m3820Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3820Right" data-m3820-add="right">Add Right →</button>',
      '          <button type="button" class="m3820Down" data-m3820-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3820-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3820-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3820-section="m3820DrillExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3820DrillExport" class="m3820Section">',
      '    <div class="m3820SectionTitle">Export &amp; Share</div>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" class="primary wide" data-m3820-action="finish">Finish &amp; Send to Blaster</button>',
      '      <button type="button" data-m3820-action="pdf">Download PDF</button>',
      '      <button type="button" data-m3820-action="csv">Export CSV</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3820-section="m3820DrillBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3820DrillBackup" class="m3820Section">',
      '    <div class="m3820SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3820SectionHelp">Download a recovery copy or restore a previously saved Drill Log.</p>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" data-m3820-action="backup">Download Backup</button>',
      '      <button type="button" data-m3820-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3820-section="m3820DrillSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3820DrillSettings" class="m3820Section">',
      '    <div class="m3820SectionTitle">Settings</div>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" class="wide" data-m3820-action="calibrate">Calibrate Employee / Job</button>',
      buildThemePickerHtml("m3820DrillTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3820-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3820DangerZone"><button type="button" class="danger" data-m3820-action="clear">Clear Drill Log Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3820Home" data-m3820-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonInput" type="file" accept=".json,application/json" hidden onchange="loadJSON(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3820-action="close"]', closeMenu);
    wireAction(box, '[data-m3820-action="info"]', function () { runAndClose("openInfo"); });
    wireAction(box, '[data-m3820-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3820-action="deletePage"]', function () { runAndClose("deletePage"); });
    wireAction(box, '[data-m3820-action="finish"]', function () { runAndClose("finishAndSendToBlaster"); });
    wireAction(box, '[data-m3820-action="pdf"]', function () { runAndClose("downloadPDF"); });
    wireAction(box, '[data-m3820-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3820-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3820-action="restore"]', function () {
      closeMenu();
      var input = byId("jsonInput");
      if (input) input.click();
    });
    wireAction(box, '[data-m3820-action="calibrate"]', function () { runAndClose("startHeaderCalibration"); });
    wireAction(box, '[data-m3820-action="updates"]', function () { runAndClose("checkUpdatesFromDrillLog"); });
    wireAction(box, '[data-m3820-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3820-action="home"]', function () { runAndClose("returnToSelector"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3820-add]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3820-add")]);
      });
    }
  }

  function patchShotMenu() {
    var menu = byId("menuModal");
    if (!menu || menu.getAttribute("data-m3820-patched") === "shot") return;
    var box = menu.querySelector(".box");
    if (!box) return;

    menu.setAttribute("data-m3820-patched", "shot");
    box.innerHTML = [
      '<div class="boxHead"><span>Shot Diagram Menu</span><button type="button" data-m3820-action="close">Close</button></div>',
      '<p class="m3820MenuIntro">Daily tools stay visible. Page layout, exports, backups, and setup tools open only when needed.</p>',
      '<div class="m3820MenuStack">',
      '  <button type="button" data-m3820-action="info">Shot Info</button>',
      '  <button type="button" data-m3820-section="m3820ShotPages" data-label="Page Tools" aria-expanded="false">Page Tools  ›</button>',
      '  <div id="m3820ShotPages" class="m3820Section">',
      '    <div class="m3820SectionTitle">Page Tools</div>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" class="wide" data-m3820-subpanel="m3820ShotAdd" data-label="Add Page" aria-expanded="false">Add Page  ›</button>',
      '      <div id="m3820ShotAdd" class="m3820Subpanel">',
      '        <p class="m3820SectionHelp">Add a blank page beside the current page.</p>',
      '        <div class="m3820DirectionGrid">',
      '          <button type="button" class="m3820Up" data-m3820-add="up">↑ Add Above</button>',
      '          <button type="button" class="m3820Left" data-m3820-add="left">← Add Left</button>',
      '          <button type="button" class="m3820Center m3820Spacer" tabindex="-1" aria-hidden="true">Current</button>',
      '          <button type="button" class="m3820Right" data-m3820-add="right">Add Right →</button>',
      '          <button type="button" class="m3820Down" data-m3820-add="down">↓ Add Below</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" class="wide" data-m3820-subpanel="m3820ShotShift" data-label="Shift Hole Data" aria-expanded="false">Shift Hole Data  ›</button>',
      '      <div id="m3820ShotShift" class="m3820Subpanel">',
      '        <p class="m3820SectionHelp">Shift every saved hole entry on the current page. The page itself does not move.</p>',
      '        <div class="m3820DirectionGrid">',
      '          <button type="button" class="m3820Up" data-m3820-shift="up">↑ Shift Up</button>',
      '          <button type="button" class="m3820Left" data-m3820-shift="left">← Shift Left</button>',
      '          <button type="button" class="m3820Center" data-m3820-action="undoShift">Undo</button>',
      '          <button type="button" class="m3820Right" data-m3820-shift="right">Shift Right →</button>',
      '          <button type="button" class="m3820Down" data-m3820-shift="down">↓ Shift Down</button>',
      '        </div>',
      '      </div>',
      '      <button type="button" data-m3820-action="fitAll">Fit All Pages</button>',
      '      <button type="button" class="danger" data-m3820-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3820-section="m3820ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m3820ShotExport" class="m3820Section">',
      '    <div class="m3820SectionTitle">Export &amp; Share</div>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" class="primary wide" data-m3820-action="finish">Finish &amp; Export PDF</button>',
      '      <button type="button" data-m3820-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m3820-action="csv">Download CSV</button>',
      '      <button type="button" class="wide" data-m3820-action="pdf">Download PDF</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3820-section="m3820ShotBackup" data-label="Backup & Restore" aria-expanded="false">Backup &amp; Restore  ›</button>',
      '  <div id="m3820ShotBackup" class="m3820Section">',
      '    <div class="m3820SectionTitle">Backup &amp; Restore</div>',
      '    <p class="m3820SectionHelp">Download a recovery copy or restore a previously saved Shot Diagram.</p>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" data-m3820-action="backup">Download Backup</button>',
      '      <button type="button" data-m3820-action="restore">Restore Backup</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m3820-section="m3820ShotSettings" data-label="Settings" aria-expanded="false">Settings  ›</button>',
      '  <div id="m3820ShotSettings" class="m3820Section">',
      '    <div class="m3820SectionTitle">Settings</div>',
      '    <div class="m3820ActionGrid">',
      '      <button type="button" class="wide" data-m3820-action="calibrate">Field Calibration</button>',
      buildThemePickerHtml("m3820ShotTheme"),
      '      <button id="mithrilUpdateMenuButton" type="button" class="wide" data-m3820-action="updates">Check for Updates</button>',
      '    </div>',
      '    <div class="m3820DangerZone"><button type="button" class="danger" data-m3820-action="clear">Clear Shot Data</button></div>',
      '  </div>',
      '  <button id="mithrilHomeMenuButton" type="button" class="m3820Home" data-m3820-action="home">MITHRIL Home</button>',
      '</div>',
      '<input id="jsonFileInput" type="file" accept=".json,application/json" hidden onchange="loadJSONBackup(event)" />'
    ].join("");

    wireExpandableSections(box);
    resetMenuPanelsWhenClosed(menu);

    wireAction(box, '[data-m3820-action="close"]', closeMenu);
    wireAction(box, '[data-m3820-action="info"]', function () { runAndClose("openShotInfo"); });
    wireAction(box, '[data-m3820-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m3820-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
    wireAction(box, '[data-m3820-action="finish"]', function () { runAndClose("finishAndSend"); });
    wireAction(box, '[data-m3820-action="shareCsv"]', function () { runAndClose("emailCSV"); });
    wireAction(box, '[data-m3820-action="csv"]', function () { runAndClose("exportCSV"); });
    wireAction(box, '[data-m3820-action="pdf"]', function () { runAndClose("exportPDFReport"); });
    wireAction(box, '[data-m3820-action="backup"]', function () { runAndClose("downloadJSON"); });
    wireAction(box, '[data-m3820-action="restore"]', function () { runAndClose("triggerLoadJSON"); });
    wireAction(box, '[data-m3820-action="calibrate"]', function () { runAndClose("openFieldCalibration"); });
    wireAction(box, '[data-m3820-action="updates"]', checkShotUpdates);
    wireAction(box, '[data-m3820-action="clear"]', function () { callGlobal("clearAll"); });
    wireAction(box, '[data-m3820-action="home"]', function () { closeMenu(); homeFromShot(); });
    wireAction(box, '[data-m3820-action="undoShift"]', function () { runAndClose("undoLastPageMove"); });
    wireThemeButtons(box);

    var addButtons = box.querySelectorAll("[data-m3820-add]");
    var shiftButtons = box.querySelectorAll("[data-m3820-shift]");
    var i;
    for (i = 0; i < addButtons.length; i += 1) {
      addButtons[i].addEventListener("click", function () {
        runAndClose("addPageAtDirection", [this.getAttribute("data-m3820-add")]);
      });
    }
    for (i = 0; i < shiftButtons.length; i += 1) {
      shiftButtons[i].addEventListener("click", function () {
        runAndClose("moveCurrentPageData", [this.getAttribute("data-m3820-shift")]);
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
    if (byId("mithrilMultiQuickM3820Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilMultiQuickM3820Styles";
    style.textContent = [
      ".m3820QuickIntro{margin:0 0 12px;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m3820QuickRows{display:grid;gap:10px}",
      ".m3820QuickRow{display:grid;grid-template-columns:78px minmax(130px,1.15fr) minmax(110px,.85fr);gap:8px;align-items:end;padding:9px;border:1px solid #bbb;border-radius:10px;background:#f8f8f8}",
      ".m3820QuickRow.inactive{opacity:.68}",
      ".m3820QuickUse{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:6px;border:1px solid #aaa;border-radius:8px;background:#fff;font-size:13px;font-weight:950}",
      ".m3820QuickUse input{width:24px;height:24px;min-height:24px;margin:0;padding:0}",
      ".m3820QuickRow label{min-width:0}",
      ".m3820QuickRow select,.m3820QuickRow input{width:100%;min-height:46px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;background:#fff}",
      ".m3820QuickValueCell{min-width:0}",
      ".m3820QuickActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}",
      ".m3820QuickActions button{min-height:48px}",
      ".m3820QuickBarSummary{min-width:0;font-size:14px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".m3820QuickBarHint{grid-column:1/-1;font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#333}",
      "#quickBar.m3820MultiQuickBar,#singleFillBar.m3820MultiQuickBar{grid-template-columns:minmax(0,1fr) auto auto!important}",
      "#quickModal .box.m3820QuickModalBox{width:min(650px,96vw)}",
      "#quickModal .box.m3820QuickKeypadOpen{padding-bottom:365px!important}",
      "@media(max-width:520px){.m3820QuickRow{grid-template-columns:68px 1fr}.m3820QuickValueCell{grid-column:2}.m3820QuickActions{grid-template-columns:1fr}.m3820QuickBarSummary{font-size:13px}}"
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
        '<div id="' + prefix + 'Row' + i + '" class="m3820QuickRow">',
        '  <label class="m3820QuickUse"><input id="' + prefix + 'Use' + i + '" type="checkbox" /> Use ' + i + '</label>',
        '  <label>Field<select id="' + prefix + 'Field' + i + '">' + options + '</select></label>',
        '  <label class="m3820QuickValueCell">Value',
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
    if (!canvas || canvas.getAttribute("data-m3820-theme-canvas") === "true") return;
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context || context.__mithrilM3820FillRect) return;
    var originalFillRect = context.fillRect.bind(context);
    context.__mithrilM3820FillRect = originalFillRect;
    context.fillRect = function (x, y, width, height) {
      var color = String(context.fillStyle || "").replace(/\s+/g, "").toLowerCase();
      var rect = canvas.getBoundingClientRect();
      var gray = color === "#2e2e2e" || color === "rgb(46,46,46)" || color === "rgba(46,46,46,1)";
      var fullSurface = Math.abs(Number(x || 0)) < 1 && Math.abs(Number(y || 0)) < 1 && Number(width || 0) >= rect.width - 2 && Number(height || 0) >= rect.height - 2;
      if (gray && fullSurface) return;
      return originalFillRect(x, y, width, height);
    };
    canvas.setAttribute("data-m3820-theme-canvas", "true");
  }

  function ensureDrillQuickState() {
    var entries = normalizeMultiQuickEntries(quick, DRILL_MULTI_QUICK_FIELDS, ["Overburden", "Depth", "Breakthrough"]);
    quick.entries = entries;
    var first = activeMultiQuickEntries(entries)[0] || entries[0];
    quick.field = first.field;
    quick.value = first.value;
    return quick;
  }

  function drillQuickPrefix() { return "m3820DrillQuick"; }

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
    var summary = byId("m3820DrillQuickSummary");
    var hint = byId("m3820DrillQuickHint");
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
    if (window.__mithrilM3820DrillPad) return;
    window.__mithrilM3820DrillPad = true;
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
      if (box && byId("quickModal").classList.contains("show")) box.classList.add("m3820QuickKeypadOpen");
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
      if (box) box.classList.remove("m3820QuickKeypadOpen");
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
    if (!modal || !bar || modal.getAttribute("data-m3820-multi-quick") === "drill") return;
    modal.setAttribute("data-m3820-multi-quick", "drill");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m3820QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m3820DrillQuickClose">Close</button></div>',
      '<p class="m3820QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m3820QuickRows">' + buildMultiQuickRows(drillQuickPrefix(), DRILL_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m3820QuickActions">',
      '  <button type="button" class="primary" id="m3820DrillQuickOn">Turn On</button>',
      '  <button type="button" id="m3820DrillQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m3820DrillQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m3820MultiQuickBar");
    bar.innerHTML = [
      '<div id="m3820DrillQuickSummary" class="m3820QuickBarSummary"></div>',
      '<button type="button" id="m3820DrillQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m3820DrillQuickBarOff">Off</button>',
      '<div id="m3820DrillQuickHint" class="m3820QuickBarHint"></div>'
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

    byId("m3820DrillQuickClose").addEventListener("click", function () { window.closeQuickModal(); });
    byId("m3820DrillQuickOn").addEventListener("click", function () { saveDrillMultiQuick(true); });
    byId("m3820DrillQuickOff").addEventListener("click", function () { saveDrillMultiQuick(false); });
    byId("m3820DrillQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hidePad === "function") window.hidePad();
    });
    byId("m3820DrillQuickEdit").addEventListener("click", function () { window.openQuickModal(); });
    byId("m3820DrillQuickBarOff").addEventListener("click", function () { window.turnQuickOff(); });

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

  function shotQuickPrefix() { return "m3820ShotQuick"; }

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
    var summary = byId("m3820ShotQuickSummary");
    var hint = byId("m3820ShotQuickHint");
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
    if (window.__mithrilM3820ShotPad) return;
    window.__mithrilM3820ShotPad = true;
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
        if (box) box.classList.add("m3820QuickKeypadOpen");
      }
    };
    window.hideLoadKeypad = function () {
      if (typeof originalHideLoadKeypad === "function") originalHideLoadKeypad();
      var box = byId("quickModal") && byId("quickModal").querySelector(".box");
      if (box) box.classList.remove("m3820QuickKeypadOpen");
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
    if (!modal || !bar || modal.getAttribute("data-m3820-multi-quick") === "shot") return;
    modal.setAttribute("data-m3820-multi-quick", "shot");
    var box = modal.querySelector(".box");
    if (!box) return;
    box.classList.add("m3820QuickModalBox");
    box.innerHTML = [
      '<div class="boxHead"><span>Quick Fill</span><button type="button" id="m3820ShotQuickClose">Close</button></div>',
      '<p class="m3820QuickIntro">Use up to three different fields. One tap on a hole applies every active row together.</p>',
      '<div class="m3820QuickRows">' + buildMultiQuickRows(shotQuickPrefix(), SHOT_MULTI_QUICK_FIELDS) + '</div>',
      '<div class="m3820QuickActions">',
      '  <button type="button" class="primary" id="m3820ShotQuickOn">Turn On</button>',
      '  <button type="button" id="m3820ShotQuickOff">Turn Off</button>',
      '  <button type="button" class="danger" id="m3820ShotQuickClear">Clear Values</button>',
      '</div>'
    ].join("");

    bar.classList.add("m3820MultiQuickBar");
    bar.innerHTML = [
      '<div id="m3820ShotQuickSummary" class="m3820QuickBarSummary"></div>',
      '<button type="button" id="m3820ShotQuickEdit">Edit</button>',
      '<button type="button" class="danger" id="m3820ShotQuickBarOff">Off</button>',
      '<div id="m3820ShotQuickHint" class="m3820QuickBarHint"></div>'
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

    byId("m3820ShotQuickClose").addEventListener("click", function () { window.closeQuickEntry(); });
    byId("m3820ShotQuickOn").addEventListener("click", function () { saveShotMultiQuick(true); });
    byId("m3820ShotQuickOff").addEventListener("click", function () { saveShotMultiQuick(false); });
    byId("m3820ShotQuickClear").addEventListener("click", function () {
      for (var i = 1; i <= 3; i += 1) {
        byId(prefix + "Value" + i).value = "";
        byId(prefix + "Bool" + i).value = "Yes";
      }
      if (typeof window.hideLoadKeypad === "function") window.hideLoadKeypad();
    });
    byId("m3820ShotQuickEdit").addEventListener("click", function () { window.openQuickEntry(); });
    byId("m3820ShotQuickBarOff").addEventListener("click", function () { window.quickEnabledOff(); });

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
    if (byId("mithrilGPSM3820Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilGPSM3820Styles";
    style.textContent = [
      ".m3820GPSDetails{margin-top:12px;border:1px solid #9ab5d6;border-radius:10px;background:#f6faff;overflow:hidden}",
      ".m3820GPSDetails summary{min-height:48px;display:flex;align-items:center;padding:8px 11px;font-size:15px;font-weight:950;cursor:pointer;user-select:none}",
      ".m3820GPSBody{padding:0 10px 10px}",
      ".m3820GPSGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}",
      ".m3820GPSGrid label{min-width:0}",
      ".m3820GPSGrid input{width:100%;min-height:44px;font-size:17px;padding:8px;border:1px solid #999;border-radius:8px;box-sizing:border-box}",
      ".m3820GPSGrid .wide{grid-column:1/-1}",
      ".m3820GPSActions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:9px}",
      ".m3820GPSActions button{min-height:46px}",
      ".m3820GPSStatus{margin-top:8px;min-height:18px;font-size:12px;font-weight:800;color:#365b82;line-height:1.3}",
      ".m3820GPSMenuGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m3820GPSMenuGrid button{min-height:48px}",
      ".m3820GPSMenuGrid .wide{grid-column:1/-1}",
      ".m3820GPSArrangeBar{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:240;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;background:rgba(255,255,255,.98);border:2px solid #8a4fff;border-radius:12px;padding:8px;box-shadow:0 5px 18px rgba(0,0,0,.38)}",
      ".m3820GPSArrangeBar.show{display:grid}",
      ".m3820GPSArrangeHint{font-size:13px;line-height:1.25;font-weight:900;color:#333;min-width:0}",
      ".m3820GPSArrangeBar button{min-height:44px}",
      "@media(max-width:520px){.m3820GPSGrid{grid-template-columns:1fr}.m3820GPSGrid .wide{grid-column:auto}.m3820GPSActions{grid-template-columns:1fr}.m3820GPSMenuGrid{grid-template-columns:1fr}.m3820GPSMenuGrid .wide{grid-column:auto}.m3820GPSArrangeBar{grid-template-columns:1fr 1fr}.m3820GPSArrangeHint{grid-column:1/-1}}"
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

  function gpsHoleCenter(type, holeId) {
    try {
      var pos = parseHoleID(holeId);
      if (!pos) return null;
      if (type === "drill") return holeCenter(pos.row, pos.col);
      var rect = holeRect(pos.row, pos.col);
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    } catch (error) {
      return null;
    }
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
    targetCtx.beginPath();
    targetCtx.arc(end.x, end.y, 10, 0, Math.PI * 2);
    targetCtx.fillStyle = "rgba(255,255,255,.95)";
    targetCtx.fill();
    targetCtx.strokeStyle = color;
    targetCtx.lineWidth = 4;
    targetCtx.stroke();
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
      drawGPSArrow(targetCtx, start, center, color);

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
    if (window.__mithrilM3820GPSDrawing) return;
    window.__mithrilM3820GPSDrawing = true;
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
    return type === "drill" ? "m3820DrillGPS" : "m3820ShotGPS";
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
    if (!modal || modal.getAttribute("data-m3820-gps-editor") === type) return;
    var box = type === "drill" ? byId("holeBox") : byId("holeEditorBox");
    if (!box) return;
    var buttonGrid = box.querySelector(".buttonGrid");
    if (!buttonGrid) return;
    var prefix = gpsEditorPrefix(type);
    var details = document.createElement("details");
    details.id = prefix + "Details";
    details.className = "m3820GPSDetails";
    details.innerHTML = [
      '<summary>Manual GPS Tag (optional)</summary>',
      '<div class="m3820GPSBody">',
      '  <p class="m3820GPSStatus">Enter coordinates collected with your external GPS equipment. MITHRIL does not request or capture this device\'s location.</p>',
      '  <div class="m3820GPSGrid">',
      '    <label>Latitude<input id="' + prefix + 'Latitude" type="text" inputmode="decimal" autocomplete="off" placeholder="40.123456" /></label>',
      '    <label>Longitude<input id="' + prefix + 'Longitude" type="text" inputmode="decimal" autocomplete="off" placeholder="-76.123456" /></label>',
      '  </div>',
      '  <div class="m3820GPSActions">',
      '    <button type="button" class="danger" id="' + prefix + 'Clear">Clear GPS Tag</button>',
      '  </div>',
      '  <div id="' + prefix + 'Status" class="m3820GPSStatus">No manual GPS tag saved for this hole.</div>',
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
    modal.setAttribute("data-m3820-gps-editor", type);
  }

  function gpsCountForPage(pageNum) {
    var data = gpsPageData(pageNum);
    return Object.keys(data).filter(function (id) { return rowHasGPS(data[id]); }).length;
  }

  function updateGPSMenuState(type) {
    var button = byId(type === "drill" ? "m3820DrillGPSToggle" : "m3820ShotGPSToggle");
    var count = byId(type === "drill" ? "m3820DrillGPSCount" : "m3820ShotGPSCount");
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
    var bar = byId("m3820GPSArrangeBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "m3820GPSArrangeBar";
      bar.className = "m3820GPSArrangeBar";
      bar.innerHTML = [
        '<div id="m3820GPSArrangeHint" class="m3820GPSArrangeHint">Drag GPS boxes to move them. The arrows follow automatically.</div>',
        '<button type="button" id="m3820GPSArrangeReset">Reset Page</button>',
        '<button type="button" class="primary" id="m3820GPSArrangeDone">Done</button>'
      ].join("");
      document.body.appendChild(bar);
      byId("m3820GPSArrangeDone").addEventListener("click", function () { finishGPSArrange(); });
      byId("m3820GPSArrangeReset").addEventListener("click", function () { resetGPSPositions(gpsArrangeType || type); });
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
    if (!gpsCountForPage(currentPage)) {
      alert("Manually tag at least one hole with coordinates on the current page before arranging callouts.");
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
    byId("m3820GPSArrangeHint").textContent = "Page " + currentPage + ": drag GPS boxes to clear important hole data. The arrows follow automatically.";
    if (typeof window.draw === "function") window.draw();
  }

  function finishGPSArrange() {
    var type = gpsArrangeType;
    gpsArrangeMode = false;
    gpsArrangeType = "";
    gpsDragState = null;
    var bar = byId("m3820GPSArrangeBar");
    if (bar) bar.classList.remove("show");
    if (type) {
      saveGPSLayout(type);
      resumeQuickAfterGPSArrange(type);
    }
    if (typeof window.draw === "function") window.draw();
  }

  function buildGPSMenuHtml(type) {
    var prefix = type === "drill" ? "m3820DrillGPS" : "m3820ShotGPS";
    return [
      '<button type="button" class="wide" data-m3820-subpanel="' + prefix + 'Panel" data-label="GPS Callouts" aria-expanded="false">GPS Callouts  ›</button>',
      '<div id="' + prefix + 'Panel" class="m3820Subpanel">',
      '  <p class="m3820SectionHelp">Coordinates entered manually are stored on each hole. Visible callouts and arrows are also included in PDF exports.</p>',
      '  <div id="' + prefix + 'Count" class="m3820GPSStatus"></div>',
      '  <div class="m3820GPSMenuGrid">',
      '    <button type="button" class="wide" id="' + prefix + 'Toggle"></button>',
      '    <button type="button" id="' + prefix + 'Arrange">Arrange Callouts</button>',
      '    <button type="button" id="' + prefix + 'Reset">Reset Current Page</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function installGPSMenuTools(type) {
    var settings = byId(type === "drill" ? "m3820DrillSettings" : "m3820ShotSettings");
    if (!settings || settings.getAttribute("data-m3820-gps-menu") === "true") return;
    var grid = settings.querySelector(".m3820ActionGrid");
    if (!grid) return;
    var holder = document.createElement("div");
    holder.style.display = "contents";
    holder.innerHTML = buildGPSMenuHtml(type);
    var updateButton = grid.querySelector("#mithrilUpdateMenuButton");
    while (holder.firstChild) grid.insertBefore(holder.firstChild, updateButton || null);
    var prefix = type === "drill" ? "m3820DrillGPS" : "m3820ShotGPS";
    byId(prefix + "Toggle").addEventListener("click", function () { setGPSCalloutsVisible(type, !gpsCalloutsVisible(type)); });
    byId(prefix + "Arrange").addEventListener("click", function () { startGPSArrange(type); });
    byId(prefix + "Reset").addEventListener("click", function () { resetGPSPositions(type); });
    settings.setAttribute("data-m3820-gps-menu", "true");
    updateGPSMenuState(type);
    if (!window.__mithrilM3820GPSMenuOpenWrapped && typeof window.openMenu === "function") {
      var originalOpenMenuForGPS = window.openMenu;
      window.openMenu = function () {
        updateGPSMenuState(type);
        return originalOpenMenuForGPS.apply(this, arguments);
      };
      window.__mithrilM3820GPSMenuOpenWrapped = true;
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
    var pageNum = currentPage;
    var local = gpsLocalPoint(eventPoint, pageNum);
    var hit = hitGPSBox(type, pageNum, local);
    if (!hit) return false;
    gpsDragState = {
      type: type,
      pageNum: pageNum,
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
    if (!canvas || canvas.getAttribute("data-m3820-gps-drag") === "true") return;
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
    canvas.setAttribute("data-m3820-gps-drag", "true");
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
      updateToolbar(false);
      patchDrillMenu();
      patchDrillMultiQuick();
      installGPSFeature("drill", drillCanvas);
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
