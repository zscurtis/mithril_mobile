(function () {
  "use strict";

  var RELEASE_VERSION = "m40.9.6.5";
  var RELEASE_LABEL = "Full Widescreen Theme Set";
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
        var existingLoader = childDocument.getElementById("mithrilMenuM395ChildLoader");
        if (existingLoader) {
          if (existingLoader.getAttribute("data-mithril-release") === RELEASE_VERSION) return true;
          if (existingLoader.parentNode) existingLoader.parentNode.removeChild(existingLoader);
        }

        var script = childDocument.createElement("script");
        script.id = "mithrilMenuM395ChildLoader";
        script.setAttribute("data-mithril-release", RELEASE_VERSION);
        script.src = "./mithril-menu-m397.js?v=40.9.6.4-frame";
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
      ".m4092PageOrderList{display:grid;gap:8px;margin:12px 0}",
      ".m4092PageOrderRow{display:grid;grid-template-columns:58px minmax(0,1fr) 48px 48px;gap:7px;align-items:center;padding:8px;border:1px solid #c7c7c7;border-radius:10px;background:#f8f8f8}",
      ".m4092PageOrderNumber{font-size:12px;font-weight:950;color:#555;text-align:center}",
      ".m4092PageOrderDetails{min-width:0;font-size:14px;font-weight:900;color:#222}",
      ".m4092PageOrderDetails small{display:block;margin-top:2px;font-size:11px;font-weight:750;color:#666}",
      ".m4092PageOrderRow button{min-height:42px;padding:5px;font-size:20px}",
      ".m4092PageOrderRow.active{border-color:#1f6feb;background:#eef5ff}",
      ".m4092PageOrderNote{margin:0;color:#444;font-size:13px;font-weight:750;line-height:1.4}",
      ".m395DangerZone{margin-top:10px;padding-top:10px;border-top:1px solid #d6aaaa}",
      ".m395DangerZone button{width:100%;min-height:50px}",
      ".m395BackMenu{grid-column:1/-1;background:#eef4ff;border-color:#7aa2d8}",
      ".m395ThemePanel{max-height:46vh;overflow:auto;padding-right:2px}",
      ".m395ThemeGroupTitle{margin:10px 0 6px;font-size:12px;font-weight:950;color:#555;text-transform:uppercase;letter-spacing:.04em}",
      ".m395ThemeGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".m395ThemeButton{min-height:44px;font-size:13px;line-height:1.25;text-align:left}",
      ".m395ThemeButton.active{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      "html.m395-theme-gray,body.m395-theme-gray{background:#2e2e2e !important;background-image:none !important}",
      "html.m395-theme-dark-slate,body.m395-theme-dark-slate{background-color:#232a31 !important;background-image:url('./theme_assets/dark-slate.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-blue-steel,body.m395-theme-blue-steel{background-color:#566575 !important;background-image:url('./theme_assets/blue-steel.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-subtle-grid,body.m395-theme-subtle-grid{background-color:#252e38 !important;background-image:url('./theme_assets/subtle-grid.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-gradient-slate,body.m395-theme-gradient-slate{background-color:#54606f !important;background-image:url('./theme_assets/gradient-slate.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-dark-paper,body.m395-theme-dark-paper{background-color:#35383d !important;background-image:url('./theme_assets/dark-paper.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-soft-quarry-tan,body.m395-theme-soft-quarry-tan{background-color:#b9aea0 !important;background-image:url('./theme_assets/soft-quarry-tan.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-blast-ember,body.m395-theme-blast-ember{background-color:#111 !important;background-image:url('./theme_assets/blast-ember.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-electric-steel,body.m395-theme-electric-steel{background-color:#0e2032 !important;background-image:url('./theme_assets/electric-steel.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-blast-placard,body.m395-theme-blast-placard{background-color:#111 !important;background-image:url('./theme_assets/blast-placard.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-copper-quarry,body.m395-theme-copper-quarry{background-color:#5a2b11 !important;background-image:url('./theme_assets/copper-quarry.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-cobalt-topo,body.m395-theme-cobalt-topo{background-color:#041c3a !important;background-image:url('./theme_assets/cobalt-topo.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "html.m395-theme-signal-red-slate,body.m395-theme-signal-red-slate{background-color:#120b0b !important;background-image:url('./theme_assets/signal-red-slate.webp') !important;background-size:cover !important;background-position:center center !important;background-repeat:no-repeat !important;background-attachment:fixed !important}",
      "@media(max-width:520px){.m395QuickButton{font-size:0}.m395QuickButton:after{content:'Quick';font-size:14px}.m395FitButton{font-size:0}.m395FitButton:after{content:'Fit';font-size:14px}.m395ActionGrid{grid-template-columns:1fr}.m395ActionGrid .wide{grid-column:auto}.m395DirectionGrid{grid-template-columns:1fr 1fr 1fr}.m395ThemeGrid{grid-template-columns:1fr}.m4092PageOrderRow{grid-template-columns:48px minmax(0,1fr) 44px 44px;padding:7px 5px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function injectSteelFirstStyles() {
    var existing = byId("mithrilSteelFirstM4096Styles");
    if (existing) {
      // Keep the release layer after older dynamically injected component CSS.
      if (existing.parentNode) existing.parentNode.appendChild(existing);
      return;
    }

    var style = document.createElement("style");
    style.id = "mithrilSteelFirstM4096Styles";
    style.textContent = [
      ":root{--msteel-black:#0b0d0f;--msteel-deep:#14181c;--msteel:#242a30;--msteel-mid:#343b43;--msteel-line:#59616a;--msteel-paper:#f2f4f5;--msteel-paper-2:#e5e9ec;--msteel-ink:#171a1d;--msteel-muted:#aeb7c0;--msteel-orange:#d66a25;--msteel-orange-bright:#ef8737;--msteel-orange-soft:#fff0e4}",
      "#templateStart{background-color:var(--msteel-black)!important;background-image:radial-gradient(ellipse at 8% 68%,rgba(157,43,22,.52) 0,rgba(104,31,21,.30) 20%,transparent 43%),radial-gradient(ellipse at 92% 24%,rgba(164,46,24,.44) 0,rgba(100,29,21,.26) 21%,transparent 44%),repeating-linear-gradient(90deg,transparent 0 35px,rgba(226,94,39,.14) 35px 36px),linear-gradient(90deg,#090b0d 0%,#171b1f 36%,#0c0f12 50%,#171b1f 64%,#090b0d 100%)!important;background-attachment:fixed!important;color:#f7f8f9!important}",
      ".startBrandRow{padding-bottom:14px;border-bottom:1px solid rgba(225,111,43,.34)}",
      ".startLogo,.mark{border:1px solid rgba(239,135,55,.52);box-shadow:0 8px 24px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.04)}",
      ".startBrand{color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.52)}.startVersion{color:#c0c7cf!important}",
      ".m407Panel{border-color:#4b535c!important;background:linear-gradient(145deg,rgba(31,36,41,.97),rgba(14,17,20,.97))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 16px 42px rgba(0,0,0,.38)!important}",
      ".m407Panel::before{content:'';display:block;width:48px;height:3px;margin:-18px 0 15px;border-radius:0 0 3px 3px;background:var(--msteel-orange)}",
      ".m407SectionHelp{color:#aeb7c0!important}.m407SectionTitle{letter-spacing:.01em}",
      ".m407Continue{border-color:#b95b24!important;background:linear-gradient(135deg,#343b43,#20252a)!important;box-shadow:inset 4px 0 0 var(--msteel-orange),0 10px 28px rgba(0,0,0,.3)!important}",
      ".m407Continue:hover{border-color:var(--msteel-orange-bright)!important;background:linear-gradient(135deg,#3b434c,#242a30)!important}.m407ContinueArrow{color:var(--msteel-orange-bright)!important}",
      ".templateCard{border-color:#515a64!important;background:linear-gradient(145deg,#2d333a,#1e2328)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)!important}.templateCard.drill{border-color:#68727c!important;background:linear-gradient(145deg,#343b43,#20252a)!important}.templateCard:hover{border-color:var(--msteel-orange)!important;background:linear-gradient(145deg,#3a4149,#23282e)!important}.templateCard strong::after{content:'';display:block;width:34px;height:2px;margin-top:7px;background:var(--msteel-orange)}",
      ".m407CloudItem,.updateHomeRow{border-color:#4c555e!important;background:#1b2025!important}.m407CloudItem button,.updateCheckButton{border-color:#6a737d!important;background:#30373e!important;color:#fff!important}.m407CloudItem button:hover,.updateCheckButton:hover{border-color:var(--msteel-orange)!important}",
      ".m407Connection{border-color:#5b646e!important;background:rgba(9,11,13,.78)!important}.m407Connection.online::before{background:var(--msteel-orange-bright)!important;box-shadow:0 0 0 3px rgba(239,135,55,.17)!important}",
      ".m404AuthForm button{background:var(--msteel-orange)!important;border-color:#b4531c!important;color:#fff!important}.m404AuthForm input{border-color:#68717b!important;background:#eef1f3!important}.m404SignedIn{border-color:#76533d!important;background:rgba(118,65,35,.24)!important}",
      "header{background:linear-gradient(180deg,#30363d 0%,#1b2025 100%)!important;border-bottom:2px solid var(--msteel-orange)!important;box-shadow:0 5px 18px rgba(0,0,0,.38)!important;color:#f5f6f7!important}",
      "header .brandText{color:#fff!important;letter-spacing:.02em}header .version{color:#c4cbd2!important}header .brandHome{color:#fff!important}",
      "header button:not(.brandHome),header select{border-color:#69727c!important;background:linear-gradient(180deg,#414951,#2e343a)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important}header button:not(.brandHome):active{background:#20252a!important;border-color:var(--msteel-orange)!important}header select option{color:#111;background:#fff}header #zoomSlider{accent-color:var(--msteel-orange-bright)}",
      "#status.m408StatusHost{border-color:#515b65!important;background:rgba(10,13,16,.72)!important;color:#eef1f3!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important}.m408DocTitle{color:#fff!important}.m408DocMeta{color:#aeb7c0!important}.m408StatusChip{border-color:#6a737c!important;background:#313840!important;color:#e8ebee!important}.m408StatusChip::before{background:var(--msteel-orange-bright)!important}.m408StatusChip.synced{border-color:#5b8b66!important;background:#213f29!important;color:#c8f0d1!important}.m408StatusChip.synced::before{background:#50b66a!important}",
      "#canvasWrap{box-shadow:inset 0 14px 22px -18px rgba(0,0,0,.9)!important}",
      ".modal,.m400Modal{background:rgba(4,6,8,.79)!important;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}",
      ".modal>.box,.m400Box{background:linear-gradient(180deg,var(--msteel-paper),#fff 160px)!important;color:var(--msteel-ink)!important;border:1px solid #606a74!important;border-top:3px solid var(--msteel-orange)!important;box-shadow:0 20px 55px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.05)!important}",
      ".modal .boxHead,.m4095Head,.m400Head{background:linear-gradient(180deg,#343b43,#242a30)!important;color:#fff!important;border-bottom:2px solid var(--msteel-orange)!important}.modal .boxHead{margin-left:-14px!important;margin-right:-14px!important;padding-left:14px!important;padding-right:14px!important}.m4095Head{padding-left:16px!important;padding-right:16px!important}.m400Head{padding:11px 12px!important;border-radius:8px!important}.m400Head.m407CloudHead{border-radius:0!important}",
      ".modal .boxHead button,.m4095Head button,.m400Head button{border-color:#68727c!important;background:#e8ebed!important;color:#171a1d!important}",
      ".box button.primary,.m400Box button.primary,.m4095Actions button.primary{background:linear-gradient(180deg,var(--msteel-orange-bright),var(--msteel-orange))!important;border-color:#ad4f18!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)!important}.box button.primary:active,.m400Box button.primary:active{background:#b9551c!important}",
      ".box input,.box select,.box textarea,.m400Box input,.m400Box select,.m400Box textarea{border-color:#8b949d!important;background:#fff!important;color:#171a1d!important}.box input:focus,.box select:focus,.box textarea:focus,.m400Box input:focus,.m400Box select:focus,.m400Box textarea:focus{outline:3px solid rgba(239,135,55,.25)!important;border-color:var(--msteel-orange)!important}",
      ".m395MenuIntro,.m395SectionHelp,.helper{color:#4c555e!important}.m395MenuStack>button{border-color:#8d959d!important;background:linear-gradient(180deg,#fff,#e6eaed)!important;color:#1c2024!important}.m395MenuStack>button:hover{border-color:var(--msteel-orange)!important}.m395MenuStack>button.primary{background:linear-gradient(180deg,var(--msteel-orange-bright),var(--msteel-orange))!important;border-color:#ad4f18!important;color:#fff!important}",
      ".m395Section{border-color:#a3abb3!important;background:linear-gradient(180deg,#e9edf0,#dce1e5)!important;box-shadow:inset 0 1px 0 #fff!important}.m395Subpanel{border-color:#aab1b8!important;background:#f7f8f9!important}.m395SectionTitle,.m395ThemeGroupTitle{color:#343b43!important}.m395ThemeButton.active{background:var(--msteel-orange)!important;border-color:#ad4f18!important;color:#fff!important}",
      ".m406EditDrawer,.m395DrillEditBar,.m395ShotEditBar{border-color:var(--msteel-orange)!important;background:rgba(242,244,245,.985)!important;box-shadow:0 12px 38px rgba(0,0,0,.52)!important}.m406EditTabs button.active{background:var(--msteel-orange)!important;border-color:#ad4f18!important;color:#fff!important}.m406InlinePattern{border-color:#bd7a4f!important;background:#fff8f2!important}",
      ".m4091HeaderSync{border-color:#b85a22!important;background:#fff0e4!important;color:#7b360f!important}.m4091HeaderSync:active{background:#f5d0b6!important}",
      ".m407CloudCurrent,.m400Doc,.m407Advanced,.m4093LoadPanel{border-color:#a3abb3!important;background:#f7f8f9!important}.m400Stat{border-color:#b7a08f!important;background:#fff7f0!important}.m400Stat b{color:#8b3f14!important}.m407DocMenu summary{border-color:#818a93!important;background:#e9ecef!important}.m407DocMenuPanel{border-color:#7c858e!important}",
      ".m408FeedbackHead,.m408FeedbackActions{background:#e7ebee!important}.m408FeedbackHead{border-bottom-color:#b9c0c7!important}.m408FeedbackIcon{background:var(--msteel-orange-soft)!important;color:#a84b15!important}",
      "#numberPad{border-color:#5e6770!important;border-top:3px solid var(--msteel-orange)!important;background:var(--msteel-paper)!important}.padPreview{border-color:var(--msteel-orange)!important;background:#fff8f2!important}.padGrid .done{background:var(--msteel-orange)!important;border-color:#ad4f18!important}",
      "#quickBar{border-color:var(--msteel-orange)!important;background:rgba(242,244,245,.98)!important}.activeInput{outline-color:var(--msteel-orange)!important}",
      ".m4095ReadinessButton{box-shadow:inset 4px 0 0 #2f7a43!important}.m4095ReadinessBox{border-top-color:var(--msteel-orange)!important}",
      "@media(max-width:560px){.startBrandRow{padding-bottom:11px}.m407Panel::before{margin-top:-14px}.modal .boxHead{border-radius:8px 8px 0 0}}",
      "@media(prefers-reduced-motion:reduce){.templateCard,.m407Continue{transition:none!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function injectM406WorkspaceStyles() {
    if (byId("mithrilWorkspaceM406Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilWorkspaceM406Styles";
    style.textContent = [
      ":root{--toolbar-h:140px}",
      "header{height:var(--toolbar-h);padding:6px;gap:6px;grid-template-columns:1fr;grid-template-rows:40px 40px minmax(40px,auto);align-items:center}",
      "header>.topRow{grid-column:1;grid-row:1}",
      "header>.zoomRow{grid-column:1;grid-row:2}",
      "header>#status{grid-column:1;grid-row:3}",
      "header .brandText{overflow:hidden;text-overflow:ellipsis}",
      "header .version{display:none}",
      "header #status{padding:0 2px;color:#48515b}",
      "#canvasWrap{top:var(--toolbar-h);transition:right .18s ease}",
      ".modal .box{overscroll-behavior:contain}",
      ".modal .boxHead{position:sticky;top:-14px;z-index:4;background:#fff;padding:12px 0 8px;margin-top:-12px;border-bottom:1px solid #e1e4e8}",
      ".modal .box>.buttonGrid:last-child{position:sticky;bottom:-14px;z-index:3;background:#fff;padding:10px 0 14px;margin-bottom:-14px;border-top:1px solid #e1e4e8}",
      ".m406EditTabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:2px 0}",
      ".m406EditTabs button{min-height:40px;padding:5px 4px;font-size:12px;background:#f2f3f5;border-color:#b9bec5}",
      ".m406EditTabs button.active{background:#7240c7;color:#fff;border-color:#6031ae}",
      ".m406EditPanel{display:none;gap:6px;min-width:0}",
      ".m406EditPanel.active{display:grid}",
      ".m406EditPanel .m395DrillEditModes,.m406EditPanel .m395DrillEditActions,.m406EditPanel .m395ShotEditModes,.m406EditPanel .m395ShotEditActions{display:grid}",
      ".m406InlinePattern{display:none;gap:8px;padding:9px;border:1px solid #9b79d0;border-radius:10px;background:#faf8ff}",
      ".m406InlinePattern.show{display:grid}",
      ".m406InlinePatternHead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:14px}",
      ".m406InlinePatternHead button{min-height:36px;font-size:12px}",
      ".m406InlinePattern label{gap:5px}",
      ".m406InlinePattern select{width:100%;min-height:44px}",
      ".m406InlinePattern .buttonGrid{margin-top:0}",
      ".m406InlinePattern .buttonGrid button{min-height:44px}",
      ".m406EditDrawer{max-height:min(54vh,480px);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:auto;isolation:isolate;contain:layout paint style;transform:translate3d(0,0,0);-webkit-transform:translate3d(0,0,0);backface-visibility:hidden;-webkit-backface-visibility:hidden}",
      ".m406EditDrawer button,.m406EditDrawer select{touch-action:manipulation}",
      "@media(min-width:1100px){",
      "  :root{--toolbar-h:96px}",
      "  header{grid-template-columns:minmax(0,1fr) minmax(255px,.7fr);grid-template-rows:40px 38px;align-items:center}",
      "  header>.topRow{grid-column:1;grid-row:1;grid-template-columns:minmax(170px,1fr) auto auto auto}",
      "  header>.zoomRow{grid-column:2;grid-row:1}",
      "  header>#status{grid-column:1/-1;grid-row:2}",
      "  header>#status.m408StatusHost{grid-template-columns:minmax(0,1fr) minmax(0,.7fr) auto;min-height:38px;padding:4px 8px!important;gap:8px}",
      "  header>#status.m408StatusHost .m408DocMeta{grid-column:auto;grid-row:auto}",
      "  header .mark{width:32px;height:32px}",
      "  header .brandText{font-size:15px}",
      "}",
      "@media(min-width:900px) and (pointer:fine){",
      "  .m406EditDrawer{left:auto!important;right:8px!important;top:calc(var(--toolbar-h) + 8px)!important;bottom:8px!important;width:360px;max-height:none;overflow:auto;align-content:start}",
      "  html.m406-edit-open #canvasWrap{right:376px}",
      "}",
      "@media(min-width:700px) and (max-height:720px) and (pointer:fine){",
      "  :root{--toolbar-h:96px}",
      "  header{grid-template-columns:minmax(0,1fr) minmax(235px,.65fr);grid-template-rows:40px 38px;align-items:center}",
      "  header>.topRow{grid-column:1;grid-row:1;grid-template-columns:minmax(145px,1fr) auto auto auto}",
      "  header>.zoomRow{grid-column:2;grid-row:1}",
      "  header>#status{grid-column:1/-1;grid-row:2}",
      "  header>#status.m408StatusHost{grid-template-columns:minmax(0,1fr) minmax(0,.7fr) auto;min-height:38px;padding:4px 8px!important;gap:8px}",
      "  header>#status.m408StatusHost .m408DocMeta{grid-column:auto;grid-row:auto}",
      "  .m406EditDrawer{left:auto!important;right:8px!important;top:calc(var(--toolbar-h) + 8px)!important;bottom:8px!important;width:min(360px,38vw);max-height:none;overflow:auto;align-content:start}",
      "  html.m406-edit-open #canvasWrap{right:min(376px,40vw)}",
      "}",
      "@media(pointer:coarse){",
      "  #canvasWrap{transition:none}",
      "  .m406EditDrawer{left:8px!important;right:8px!important;top:auto!important;bottom:max(8px,env(safe-area-inset-bottom))!important;width:auto!important;max-height:min(56vh,480px)!important;contain:layout paint style}",
      "  html.m406-edit-open #canvasWrap{right:0!important}",
      "}",
      "@media(pointer:coarse) and (orientation:landscape) and (min-width:900px){",
      "  :root{--toolbar-h:96px}",
      "  header{grid-template-columns:minmax(0,1fr) minmax(235px,.65fr);grid-template-rows:40px 38px;align-items:center}",
      "  header>.topRow{grid-column:1;grid-row:1}",
      "  header>.zoomRow{grid-column:2;grid-row:1}",
      "  header>#status{grid-column:1/-1;grid-row:2}",
      "  header>#status.m408StatusHost{grid-template-columns:minmax(0,1fr) minmax(0,.7fr) auto;min-height:38px;padding:4px 8px!important;gap:8px}",
      "  header>#status.m408StatusHost .m408DocMeta{grid-column:auto;grid-row:auto}",
      "  .m406EditDrawer{left:auto!important;right:max(8px,env(safe-area-inset-right))!important;top:calc(var(--toolbar-h) + 8px)!important;bottom:max(8px,env(safe-area-inset-bottom))!important;width:min(360px,38vw)!important;max-height:none!important;overflow-x:hidden;overflow-y:auto;align-content:start}",
      "  html.m406-edit-open #canvasWrap{right:min(376px,40vw)!important}",
      "}",
      "@media(min-width:641px) and (max-width:1099px) and (min-height:721px){",
      "  header{grid-template-columns:1fr;grid-template-rows:40px 40px minmax(40px,auto)}",
      "  header>.topRow{grid-column:1/-1;grid-row:1}",
      "  header>.zoomRow{grid-column:1;grid-row:2}",
      "  header>#status{grid-column:1/-1;grid-row:3}",
      "}",
      "@media(max-width:640px){",
      "  :root{--toolbar-h:140px}",
      "  header{grid-template-columns:1fr;grid-template-rows:40px 40px minmax(40px,auto)}",
      "  header>.topRow{grid-column:1/-1;grid-row:1;grid-template-columns:minmax(0,1fr) auto auto auto}",
      "  header>.zoomRow{grid-column:1;grid-row:2;grid-template-columns:auto 1fr auto auto}",
      "  header>.zoomRow input[type=range]{display:none}",
      "  header>#status{grid-column:1/-1;grid-row:3}",
      "  header .mark{width:30px;height:30px}",
      "  header .brandText{font-size:13px}",
      "  .m406EditDrawer{max-height:min(56vh,450px)}",
      "  .m406EditTabs button{font-size:11px}",
      "}",
      "@media(max-height:560px) and (max-width:899px){.m406EditDrawer{max-height:66vh}}"
    ].join("");
    document.head.appendChild(style);
  }

  function m406SetEditPanel(bar, panelName) {
    if (!bar) return;
    var tabs = bar.querySelectorAll("[data-m406-tab]");
    var panels = bar.querySelectorAll("[data-m406-panel]");
    for (var i = 0; i < tabs.length; i += 1) {
      var tabActive = tabs[i].getAttribute("data-m406-tab") === panelName;
      tabs[i].classList.toggle("active", tabActive);
      tabs[i].setAttribute("aria-selected", tabActive ? "true" : "false");
    }
    for (var j = 0; j < panels.length; j += 1) {
      panels[j].classList.toggle("active", panels[j].getAttribute("data-m406-panel") === panelName);
    }
    m406SyncTouchSurface(bar);
  }

  var m406TouchSurfaceFrame = 0;
  var m406TouchRoute = null;
  var m406TouchRouterInstalled = false;

  function m406ActiveEditBar() {
    var drill = byId("m395DrillEditBar");
    if (drill && drill.classList.contains("show")) return drill;
    var shot = byId("m395ShotEditBar");
    if (shot && shot.classList.contains("show")) return shot;
    return null;
  }

  function m406PointInside(rect, x, y) {
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function m406TouchControlAt(bar, x, y) {
    if (!bar) return null;
    var controls = bar.querySelectorAll("button:not([disabled]),select:not([disabled]),input:not([disabled])");
    for (var i = controls.length - 1; i >= 0; i -= 1) {
      var control = controls[i];
      var rect = control.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && m406PointInside(rect, x, y)) return control;
    }
    return null;
  }

  function m406SyncTouchSurface(bar) {
    if (!bar || !bar.classList.contains("show") || typeof window.requestAnimationFrame !== "function") return;
    if (m406TouchSurfaceFrame) window.cancelAnimationFrame(m406TouchSurfaceFrame);
    m406TouchSurfaceFrame = window.requestAnimationFrame(function () {
      m406TouchSurfaceFrame = 0;
      // Force WebKit to commit the fixed drawer's current geometry to its
      // compositor hit-test layer after a canvas redraw or tool-panel change.
      void bar.offsetHeight;
      bar.getBoundingClientRect();
    });
  }

  function m406InstallTouchRouter() {
    if (m406TouchRouterInstalled) return;
    m406TouchRouterInstalled = true;

    document.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "touch") return;
      var bar = m406ActiveEditBar();
      if (!bar) return;
      var barRect = bar.getBoundingClientRect();
      if (!m406PointInside(barRect, event.clientX, event.clientY)) return;
      var intended = m406TouchControlAt(bar, event.clientX, event.clientY);
      var targetIsIntended = !!(intended && (event.target === intended || intended.contains(event.target)));
      m406TouchRoute = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        intended: intended,
        rescue: !!intended && !targetIsIntended
      };
      if (!bar.contains(event.target) || m406TouchRoute.rescue) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener("pointermove", function (event) {
      if (!m406TouchRoute || event.pointerId !== m406TouchRoute.pointerId) return;
      if (Math.abs(event.clientX - m406TouchRoute.startX) > 10 || Math.abs(event.clientY - m406TouchRoute.startY) > 10) {
        m406TouchRoute.moved = true;
      }
      if (m406TouchRoute.rescue) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    function endTouchRoute(event) {
      if (!m406TouchRoute || event.pointerId !== m406TouchRoute.pointerId) return;
      var route = m406TouchRoute;
      m406TouchRoute = null;
      if (!route.rescue) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === "pointercancel" || route.moved || !route.intended || route.intended.disabled) return;
      try { route.intended.focus({ preventScroll: true }); } catch (error) { try { route.intended.focus(); } catch (ignored) {} }
      route.intended.click();
    }

    document.addEventListener("pointerup", endTouchRoute, true);
    document.addEventListener("pointercancel", endTouchRoute, true);
  }

  function m406UpgradeEditBar(bar, kind) {
    if (!bar || bar.classList.contains("m406EditDrawer")) return bar;
    bar.classList.add("m406EditDrawer");
    var prefix = kind === "drill" ? "m395Drill" : "m395Shot";
    var head = bar.querySelector("." + prefix + "EditHead");
    var modes = bar.querySelector("." + prefix + "EditModes");
    var actions = bar.querySelector("." + prefix + "EditActions");
    var directions = bar.querySelector("." + prefix + "EditDirections");
    var rotations = bar.querySelector("." + prefix + "EditRotations");
    var hint = bar.querySelector("." + prefix + "EditHint");
    if (!head || !modes || !actions || !directions || !rotations) return bar;

    var tabs = document.createElement("div");
    tabs.className = "m406EditTabs";
    tabs.setAttribute("role", "tablist");
    tabs.innerHTML = [
      '<button type="button" data-m406-tab="select" class="active" aria-selected="true">Select</button>',
      '<button type="button" data-m406-tab="move" aria-selected="false">Move</button>',
      '<button type="button" data-m406-tab="transform" aria-selected="false">Transform</button>',
      '<button type="button" data-m406-tab="more" aria-selected="false">More</button>'
    ].join("");

    function panel(name) {
      var node = document.createElement("div");
      node.className = "m406EditPanel" + (name === "select" ? " active" : "");
      node.setAttribute("data-m406-panel", name);
      return node;
    }
    var selectPanel = panel("select");
    var movePanel = panel("move");
    var transformPanel = panel("transform");
    var morePanel = panel("more");
    selectPanel.appendChild(modes);
    selectPanel.appendChild(actions);
    movePanel.appendChild(directions);
    transformPanel.appendChild(rotations);

    head.insertAdjacentElement("afterend", tabs);
    tabs.insertAdjacentElement("afterend", selectPanel);
    selectPanel.insertAdjacentElement("afterend", movePanel);
    movePanel.insertAdjacentElement("afterend", transformPanel);
    transformPanel.insertAdjacentElement("afterend", morePanel);
    if (hint) bar.appendChild(hint);

    tabs.addEventListener("click", function (event) {
      var button = event.target.closest("[data-m406-tab]");
      if (!button) return;
      m406SetEditPanel(bar, button.getAttribute("data-m406-tab"));
    });
    m406InstallTouchRouter();
    return bar;
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

  function removeRetiredFinishControls(root) {
    root = root || document;
    var buttons = root.querySelectorAll ? root.querySelectorAll("button") : [];
    for (var i = buttons.length - 1; i >= 0; i -= 1) {
      var button = buttons[i];
      var label = String(button.textContent || "").replace(/\s+/g, " ").trim();
      var action = String(button.getAttribute("onclick") || "");
      var retired = button.classList.contains("finishBtn") ||
        button.id === "finishSendBtn" ||
        /finish\s*(?:&|and)?\s*(?:send|export)/i.test(label) ||
        /send\s+to\s+blaster/i.test(label) ||
        /finishAndSend(?:ToBlaster)?\s*\(/i.test(action);
      if (retired && button.parentNode) button.parentNode.removeChild(button);
    }
  }

  function installWorkspaceHeaderHeightSync() {
    var header = document.querySelector("header");
    if (!header || header.getAttribute("data-m4082-height-sync") === "true") return;
    header.setAttribute("data-m4082-height-sync", "true");

    var scheduled = false;
    function measure() {
      scheduled = false;
      if (!header.isConnected) return;
      var headerRect = header.getBoundingClientRect();
      var children = header.children;
      var contentBottom = headerRect.top;
      for (var i = 0; i < children.length; i += 1) {
        var child = children[i];
        if (window.getComputedStyle(child).display === "none") continue;
        var rect = child.getBoundingClientRect();
        if (rect.height > 0) contentBottom = Math.max(contentBottom, rect.bottom);
      }
      var compact = window.matchMedia &&
        (window.matchMedia("(min-width:1100px)").matches ||
         window.matchMedia("(min-width:700px) and (max-height:720px)").matches ||
         window.matchMedia("(pointer:coarse) and (orientation:landscape) and (min-width:900px)").matches);
      var minimum = compact ? 96 : 140;
      var required = Math.max(minimum, Math.ceil(contentBottom - headerRect.top + 6));
      var current = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue("--toolbar-h")) || 0;
      if (Math.abs(required - current) > 1) {
        document.documentElement.style.setProperty("--toolbar-h", required + "px");
      }
    }
    function scheduleMeasure() {
      if (scheduled) return;
      scheduled = true;
      (window.requestAnimationFrame || function (callback) { return window.setTimeout(callback, 16); })(measure);
    }

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("orientationchange", scheduleMeasure);
    if (typeof window.ResizeObserver === "function") {
      var observer = new window.ResizeObserver(scheduleMeasure);
      observer.observe(header);
      for (var i = 0; i < header.children.length; i += 1) observer.observe(header.children[i]);
    }
    window.setTimeout(scheduleMeasure, 0);
    window.setTimeout(scheduleMeasure, 120);
    window.setTimeout(scheduleMeasure, 600);
  }

  function updateToolbar(isShot) {
    var header = document.querySelector("header");
    if (!header) return;

    removeRetiredFinishControls(document);

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

    installWorkspaceHeaderHeightSync();
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
      '  <button type="button" class="m4095ReadinessButton" data-m395-action="reportReadiness">Report Readiness</button>',
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
      '      <button type="button" class="primary" data-m395-action="pdf">Download PDF</button>',
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
    wireAction(box, '[data-m395-action="reportReadiness"]', function () { closeMenu(); m4095OpenReportReadiness("drill"); });
    wireAction(box, '[data-m395-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m395-action="deletePage"]', function () { runAndClose("deletePage"); });
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

  var m4092PageOrder = [];

  function m4092EnsurePageOrderModal() {
    var modal = byId("m4092PageOrderModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m4092PageOrderModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span>Page Order</span><button type="button" id="m4092PageOrderClose">Close</button></div>',
      '  <p class="m4092PageOrderNote">Arrange the pages in the order they should appear in the report. Applying the order renumbers them 1, 2, 3… without moving any sheet on the canvas.</p>',
      '  <div id="m4092PageOrderList" class="m4092PageOrderList"></div>',
      '  <div class="buttonGrid"><button type="button" class="primary" id="m4092PageOrderApply">Apply Page Order</button><button type="button" id="m4092PageOrderCancel">Cancel</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m4092PageOrderClose").addEventListener("click", m4092ClosePageOrder);
    byId("m4092PageOrderCancel").addEventListener("click", m4092ClosePageOrder);
    byId("m4092PageOrderApply").addEventListener("click", m4092ApplyPageOrder);
    return modal;
  }

  function m4092PagePositionLabel(pageNum) {
    var meta = (typeof pageMeta !== "undefined" && pageMeta) ? pageMeta[String(pageNum)] : null;
    if (!meta) return "Canvas position unchanged";
    var gx = Number(meta.gx || 0);
    var gy = Number(meta.gy || 0);
    return "Canvas position " + gx + ", " + gy;
  }

  function m4092RenderPageOrder() {
    var list = byId("m4092PageOrderList");
    if (!list) return;
    list.innerHTML = "";
    for (var i = 0; i < m4092PageOrder.length; i += 1) {
      var oldPage = Number(m4092PageOrder[i]);
      var row = document.createElement("div");
      row.className = "m4092PageOrderRow" + (Number(currentPage) === oldPage ? " active" : "");
      row.setAttribute("data-m4092-page-index", String(i));
      row.innerHTML = [
        '<div class="m4092PageOrderNumber">NEW<br>' + (i + 1) + '</div>',
        '<div class="m4092PageOrderDetails">Current Page ' + oldPage + (Number(currentPage) === oldPage ? ' — ACTIVE' : '') + '<small>' + m4092PagePositionLabel(oldPage) + '</small></div>',
        '<button type="button" data-m4092-page-up="' + i + '" aria-label="Move Current Page ' + oldPage + ' earlier" ' + (i === 0 ? 'disabled' : '') + '>↑</button>',
        '<button type="button" data-m4092-page-down="' + i + '" aria-label="Move Current Page ' + oldPage + ' later" ' + (i === m4092PageOrder.length - 1 ? 'disabled' : '') + '>↓</button>'
      ].join("");
      list.appendChild(row);
    }
    var upButtons = list.querySelectorAll("[data-m4092-page-up]");
    var downButtons = list.querySelectorAll("[data-m4092-page-down]");
    var j;
    for (j = 0; j < upButtons.length; j += 1) {
      upButtons[j].addEventListener("click", function () {
        var index = Number(this.getAttribute("data-m4092-page-up"));
        if (index <= 0 || index >= m4092PageOrder.length) return;
        var page = m4092PageOrder.splice(index, 1)[0];
        m4092PageOrder.splice(index - 1, 0, page);
        m4092RenderPageOrder();
      });
    }
    for (j = 0; j < downButtons.length; j += 1) {
      downButtons[j].addEventListener("click", function () {
        var index = Number(this.getAttribute("data-m4092-page-down"));
        if (index < 0 || index >= m4092PageOrder.length - 1) return;
        var page = m4092PageOrder.splice(index, 1)[0];
        m4092PageOrder.splice(index + 1, 0, page);
        m4092RenderPageOrder();
      });
    }
  }

  function m4092OpenPageOrder() {
    if (typeof pagesData === "undefined" || typeof pageMeta === "undefined" || typeof getPageNumbers !== "function") {
      alert("MITHRIL could not open Page Order. Refresh the Shot Diagram and try again.");
      return;
    }
    closeMenu();
    m4092EnsurePageOrderModal();
    m4092PageOrder = getPageNumbers().map(Number);
    m4092RenderPageOrder();
    byId("m4092PageOrderModal").classList.add("show");
  }

  function m4092ClosePageOrder() {
    var modal = byId("m4092PageOrderModal");
    if (modal) modal.classList.remove("show");
  }

  function m4092RemapShotSelection(pageMap) {
    if (typeof shotEditSelection === "undefined" || !shotEditSelection) return;
    var remapped = {};
    Object.keys(shotEditSelection).forEach(function (key) {
      var entry = shotEditSelection[key];
      if (!entry || pageMap[String(entry.pageNum)] == null) return;
      var newPage = Number(pageMap[String(entry.pageNum)]);
      var newKey = typeof shotEditKey === "function" ? shotEditKey(newPage, entry.holeId) : (String(newPage) + "|" + String(entry.holeId));
      remapped[newKey] = { pageNum: newPage, holeId: String(entry.holeId) };
    });
    shotEditSelection = remapped;
  }

  function m4092ApplyPageOrder() {
    if (!m4092PageOrder.length || typeof pagesData === "undefined" || typeof pageMeta === "undefined") return;
    var actualPages = typeof getPageNumbers === "function" ? getPageNumbers().map(Number) : [];
    if (actualPages.length !== m4092PageOrder.length) {
      alert("The page list changed while Page Order was open. Close it and try again.");
      return;
    }
    var pageMap = {};
    for (var i = 0; i < m4092PageOrder.length; i += 1) pageMap[String(m4092PageOrder[i])] = i + 1;

    var newPages = {};
    var newMeta = {};
    for (var orderIndex = 0; orderIndex < m4092PageOrder.length; orderIndex += 1) {
      var oldPage = Number(m4092PageOrder[orderIndex]);
      var newPage = orderIndex + 1;
      var records = deepClone(pagesData[String(oldPage)] || {});
      Object.keys(records).forEach(function (holeId) {
        if (!records[holeId]) return;
        records[holeId].PageNumber = newPage;
        records[holeId].HoleID = String(holeId);
      });
      newPages[String(newPage)] = records;
      var meta = deepClone(pageMeta[String(oldPage)] || { gx: orderIndex, gy: 0 });
      meta.name = "Page " + newPage;
      newMeta[String(newPage)] = meta;
    }

    var oldCurrentPage = Number(currentPage);
    pagesData = newPages;
    pageMeta = newMeta;
    currentPage = Number(pageMap[String(oldCurrentPage)] || 1);
    holeData = pagesData[String(currentPage)] || {};
    m4092RemapShotSelection(pageMap);
    if (typeof shotEditUndoHistory !== "undefined") shotEditUndoHistory = [];
    if (typeof m397TimingUndoHistory !== "undefined") m397TimingUndoHistory = [];
    if (typeof shotEditClipboard !== "undefined") shotEditClipboard = null;
    if (typeof shotEditPasteArmed !== "undefined") shotEditPasteArmed = false;
    if (typeof shotPersistEditedState === "function") shotPersistEditedState();
    else {
      try { if (typeof saveData === "function") saveData(); } catch (error) {}
      try { if (typeof markDirty === "function") markDirty(); } catch (error2) {}
      try { if (typeof refreshPageSelect === "function") refreshPageSelect(); } catch (error3) {}
    }
    try { if (typeof draw === "function") draw(); } catch (error4) {}
    try { if (typeof updateStatus === "function") updateStatus(); } catch (error5) {}
    m4092ClosePageOrder();
    alert("Page order updated. The sheets stayed in their existing canvas positions.");
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
      '  <button type="button" class="m4095ReadinessButton" data-m395-action="reportReadiness">Report Readiness</button>',
      '  <button type="button" id="m40932LoadCalculatorButton" data-m405-mutation="true">Load Calculator / Auto ANFO</button>',
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
      '      <button type="button" data-m395-action="pageOrder">Page Order / Renumber</button>',
      '      <button type="button" class="danger" data-m395-action="deletePage">Delete Current Page</button>',
      '    </div>',
      '  </div>',
      '  <button type="button" data-m395-section="m395ShotExport" data-label="Export & Share" aria-expanded="false">Export &amp; Share  ›</button>',
      '  <div id="m395ShotExport" class="m395Section">',
      '    <div class="m395SectionTitle">Export &amp; Share</div>',
      '    <div class="m395ActionGrid">',
      '      <button type="button" data-m395-action="shareCsv">Share CSV</button>',
      '      <button type="button" data-m395-action="csv">Download CSV</button>',
      '      <button type="button" class="primary wide" data-m395-action="pdf">Download PDF</button>',
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
    wireAction(box, '[data-m395-action="reportReadiness"]', function () { closeMenu(); m4095OpenReportReadiness("shot"); });
    wireAction(box, '[data-m395-action="fitAll"]', function () { runAndClose("fitAllPages"); });
    wireAction(box, '[data-m395-action="pageOrder"]', m4092OpenPageOrder);
    wireAction(box, '[data-m395-action="deletePage"]', function () { runAndClose("deleteCurrentPage"); });
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
    var wrap = byId("canvasWrap");
    if (wrap) {
      wrap.style.setProperty("background-color", computed.backgroundColor || "#2e2e2e", "important");
      wrap.style.setProperty("background-image", computed.backgroundImage || "none", "important");
      wrap.style.setProperty("background-size", computed.backgroundSize || "cover", "important");
      wrap.style.setProperty("background-position", computed.backgroundPosition || "center center", "important");
      wrap.style.setProperty("background-repeat", computed.backgroundRepeat || "no-repeat", "important");
      // canvasWrap is already fixed to the viewport. A fixed CSS background
      // inside it can fail to repaint in iPad Safari/WebKit.
      wrap.style.setProperty("background-attachment", "scroll", "important");
    }
    var canvases = [byId("drillCanvas"), byId("shotCanvas")];
    for (var i = 0; i < canvases.length; i += 1) {
      var canvas = canvases[i];
      if (!canvas) continue;
      canvas.style.setProperty("background-color", "transparent", "important");
      canvas.style.setProperty("background-image", "none", "important");
    }
  }

  function isCanvasBaseFill(context, x, y, width, height) {
    var canvas = context && context.canvas;
    if (!canvas || canvas.getAttribute("data-m395-theme-canvas") !== "true") return false;
    var color = String(context.fillStyle || "").replace(/\s+/g, "").toLowerCase();
    var gray = color === "#2e2e2e" || color === "rgb(46,46,46)" || color === "rgba(46,46,46,1)";
    if (!gray) return false;
    var rect = canvas.getBoundingClientRect();
    return Math.abs(Number(x || 0)) < 1 &&
      Math.abs(Number(y || 0)) < 1 &&
      Number(width || 0) >= rect.width - 2 &&
      Number(height || 0) >= rect.height - 2;
  }

  function installCanvasPrototypeBackgroundBridge() {
    var CanvasContext = window.CanvasRenderingContext2D;
    if (!CanvasContext || !CanvasContext.prototype) return;
    var prototype = CanvasContext.prototype;
    if (prototype.__mithrilM40963FillRect) return;
    var nativeFillRect = prototype.fillRect;
    if (typeof nativeFillRect !== "function") return;
    try {
      prototype.__mithrilM40963FillRect = nativeFillRect;
      prototype.fillRect = function (x, y, width, height) {
        if (isCanvasBaseFill(this, x, y, width, height)) return;
        return nativeFillRect.call(this, x, y, width, height);
      };
    } catch (error) {}
  }

  function installCanvasBackgroundBridge(canvas) {
    if (!canvas || canvas.getAttribute("data-m395-theme-canvas") === "true") return;
    // Safari may expose native methods as non-writable properties on an
    // individual context. Patch the shared prototype as the iPad fallback.
    canvas.setAttribute("data-m395-theme-canvas", "true");
    installCanvasPrototypeBackgroundBridge();
    var context = canvas.getContext && canvas.getContext("2d");
    if (!context || context.__mithrilM395FillRect) return;
    try {
      var originalFillRect = context.fillRect.bind(context);
      context.__mithrilM395FillRect = originalFillRect;
      context.fillRect = function (x, y, width, height) {
        if (isCanvasBaseFill(context, x, y, width, height)) return;
        return originalFillRect(x, y, width, height);
      };
    } catch (error) {}
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
    var rotations = bar ? bar.querySelectorAll("[data-m395-drill-rotate]") : [];
    for (var r = 0; r < rotations.length; r += 1) rotations[r].disabled = count < 2;
    var undoButton = byId("m395DrillUndo");
    if (undoButton) undoButton.disabled = !drillEditUndoHistory.length;
    m406SyncTouchSurface(bar);
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
      ".m395DrillEditRotations{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
      ".m395DrillEditRotations button{min-height:43px;padding:5px;font-size:13px}",
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
      '<div class="m395DrillEditRotations">',
      '  <button type="button" data-m395-drill-rotate="left" aria-label="Rotate selection left 90 degrees">↶ Rotate Left</button>',
      '  <button type="button" data-m395-drill-rotate="180" aria-label="Rotate selection 180 degrees">↕ Rotate 180°</button>',
      '  <button type="button" data-m395-drill-rotate="right" aria-label="Rotate selection right 90 degrees">↷ Rotate Right</button>',
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
    var rotations = bar.querySelectorAll("[data-m395-drill-rotate]");
    for (var r = 0; r < rotations.length; r += 1) {
      rotations[r].addEventListener("click", function () { drillRotateSelection(this.getAttribute("data-m395-drill-rotate")); });
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
    m406UpgradeEditBar(bar, "drill");
    document.documentElement.classList.add("m406-edit-open");
    bar.classList.add("show");
    m406SetEditPanel(bar, "select");
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
    document.documentElement.classList.remove("m406-edit-open");
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

  function drillRotateSelection(direction) {
    var selected = drillEditSortedSelection();
    if (selected.length < 2) {
      drillEditSetHint("Select at least two saved holes to rotate.");
      return;
    }

    var globals = selected.map(function (entry) { return drillLocationToGlobal(entry.pageNum, entry.holeId); });
    var minRow = Math.min.apply(Math, globals.map(function (g) { return g.row; }));
    var maxRow = Math.max.apply(Math, globals.map(function (g) { return g.row; }));
    var minCol = Math.min.apply(Math, globals.map(function (g) { return g.col; }));
    var maxCol = Math.max.apply(Math, globals.map(function (g) { return g.col; }));
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
      var global = globals[i];
      var rotatedRow;
      var rotatedCol;
      if (direction === "right") {
        rotatedRow = minRow + (global.col - minCol);
        rotatedCol = minCol + (maxRow - global.row);
      } else if (direction === "left") {
        rotatedRow = minRow + (maxCol - global.col);
        rotatedCol = minCol + (global.row - minRow);
      } else {
        rotatedRow = minRow + (maxRow - global.row);
        rotatedCol = minCol + (maxCol - global.col);
      }
      var destination = drillGlobalDestination(rotatedRow, rotatedCol, workingPages, workingMeta, counter);
      moves.push({ source: source, destination: destination, record: record });
    }

    var collisions = [];
    for (var c = 0; c < moves.length; c += 1) {
      var dest = moves[c].destination;
      if (drillRecordExists(dest.pageNum, dest.holeId, workingPages) && !sourceKeys[drillEditKey(dest.pageNum, dest.holeId)]) collisions.push(dest);
    }
    if (collisions.length && !confirm("Rotation would replace " + collisions.length + " occupied destination hole(s):\n\n" + drillCollisionMessage(collisions) + "\n\nReplace the existing data?")) {
      drillEditSetHint("Rotation canceled. No data changed.");
      return;
    }

    var label = direction === "180" ? "rotate selection 180°" : "rotate selection " + direction + " 90°";
    drillPushUndo(label);
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
    drillCommitWorkingState(workingPages, workingMeta, destinations, direction === "180" ? "Rotated 180°" : "Rotated " + direction + " 90°");
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
  var shotEditOverlayFramePending = false;

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
      selection: deepClone(shotEditSelection),
      timingState: typeof m397TimingState !== "undefined" ? deepClone(m397TimingState) : null
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
    if (snapshot.timingState && typeof m397RestoreTimingState === "function") m397RestoreTimingState(snapshot.timingState);
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
    var rotations = document.querySelectorAll("[data-m395-edit-rotate]");
    for (var r = 0; r < rotations.length; r += 1) rotations[r].disabled = count < 2;
    var undoButton = byId("m395ShotUndo");
    if (undoButton) undoButton.disabled = !shotEditUndoHistory.length;
    m406SyncTouchSurface(byId("m395ShotEditBar"));
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
      ".m395ShotEditRotations{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
      ".m395ShotEditRotations button{min-height:43px;padding:5px;font-size:13px}",
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
      '<div class="m395ShotEditRotations">',
      '  <button type="button" data-m395-edit-rotate="left" aria-label="Rotate selection left 90 degrees">↶ Rotate Left</button>',
      '  <button type="button" data-m395-edit-rotate="180" aria-label="Rotate selection 180 degrees">↕ Rotate 180°</button>',
      '  <button type="button" data-m395-edit-rotate="right" aria-label="Rotate selection right 90 degrees">↷ Rotate Right</button>',
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
    var rotations = bar.querySelectorAll("[data-m395-edit-rotate]");
    for (var r = 0; r < rotations.length; r += 1) {
      rotations[r].addEventListener("click", function () { shotRotateSelection(this.getAttribute("data-m395-edit-rotate")); });
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
    m406UpgradeEditBar(bar, "shot");
    document.documentElement.classList.add("m406-edit-open");
    bar.classList.add("show");
    m406SetEditPanel(bar, "select");
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
    document.documentElement.classList.remove("m406-edit-open");
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

  function shotRotateSelection(direction) {
    var selected = shotEditSortedSelection();
    if (selected.length < 2) {
      shotEditSetHint("Select at least two saved holes to rotate.");
      return;
    }

    var globals = selected.map(function (entry) { return shotLocationToGlobal(entry.pageNum, entry.holeId); });
    var minRow = Math.min.apply(Math, globals.map(function (g) { return g.row; }));
    var maxRow = Math.max.apply(Math, globals.map(function (g) { return g.row; }));
    var minCol = Math.min.apply(Math, globals.map(function (g) { return g.col; }));
    var maxCol = Math.max.apply(Math, globals.map(function (g) { return g.col; }));
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
      var global = globals[i];
      var rotatedRow;
      var rotatedCol;
      if (direction === "right") {
        rotatedRow = minRow + (global.col - minCol);
        rotatedCol = minCol + (maxRow - global.row);
      } else if (direction === "left") {
        rotatedRow = minRow + (maxCol - global.col);
        rotatedCol = minCol + (global.row - minRow);
      } else {
        rotatedRow = minRow + (maxRow - global.row);
        rotatedCol = minCol + (maxCol - global.col);
      }
      var destination = shotGlobalDestination(rotatedRow, rotatedCol, workingPages, workingMeta, counter);
      moves.push({ source: source, destination: destination, record: record });
    }

    var collisions = [];
    for (var c = 0; c < moves.length; c += 1) {
      var dest = moves[c].destination;
      if (shotRecordExists(dest.pageNum, dest.holeId, workingPages) && !sourceKeys[shotEditKey(dest.pageNum, dest.holeId)]) collisions.push(dest);
    }
    if (collisions.length && !confirm("Rotation would replace " + collisions.length + " occupied destination hole(s):\n\n" + shotCollisionMessage(collisions) + "\n\nReplace the existing data?")) {
      shotEditSetHint("Rotation canceled. No data changed.");
      return;
    }

    var label = direction === "180" ? "rotate selection 180°" : "rotate selection " + direction + " 90°";
    shotPushUndo(label);
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
    shotCommitWorkingState(workingPages, workingMeta, destinations, direction === "180" ? "Rotated 180°" : "Rotated " + direction + " 90°");
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
      // The stable Shot Diagram draw() queues its actual canvas repaint with
      // requestAnimationFrame. Drawing the selection synchronously here makes
      // it flash briefly and then disappear when that queued repaint runs.
      // Queue this overlay after the base repaint so it remains the top layer.
      if (!shotEditOverlayFramePending) {
        shotEditOverlayFramePending = true;
        (window.requestAnimationFrame || function (callback) { return window.setTimeout(callback, 16); })(function () {
          shotEditOverlayFramePending = false;
          drawShotEditOverlay();
          if (typeof m397DrawTimingOriginOverlay === "function") m397DrawTimingOriginOverlay();
        });
      }
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
      value: m395FormatNumber(minimum, 2) + " - " + m395FormatNumber(maximum, 2) + " ft"
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

  // ---------------------------------------------------------------------------
  // m40.9.4 standardized export summaries and loading configurations
  // ---------------------------------------------------------------------------
  function m4094FlagYes(value) {
    return value === true || String(value == null ? "" : value).trim().toLowerCase() === "yes";
  }

  function m4094NonNegativeNumber(value) {
    var textValue = String(value == null ? "" : value).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(textValue)) return null;
    var number = Number(textValue);
    return isFinite(number) && number >= 0 ? number : null;
  }

  function m4094RangeText(values, suffix) {
    var usable = (values || []).filter(function (value) { return value !== null && isFinite(Number(value)); }).map(Number);
    if (!usable.length) return "Not available";
    var minimum = Math.min.apply(Math, usable);
    var maximum = Math.max.apply(Math, usable);
    var unit = suffix ? " " + suffix : "";
    if (Math.abs(minimum - maximum) < 0.000001) return m395FormatNumber(minimum, 2) + unit;
    return m395FormatNumber(minimum, 2) + " - " + m395FormatNumber(maximum, 2) + unit;
  }

  function m4094LoadField(value, rate) {
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return { key: "", display: "None", valid: true, weight: 0 };
    var parsed = m395ParseLoad(raw, rate);
    if (!parsed.valid) {
      var invalidText = raw.toUpperCase().replace(/\s+/g, " ");
      return { key: "INVALID:" + invalidText, display: invalidText, valid: false, weight: null };
    }
    var pieces = parsed.tokens.map(function (token) {
      var amount = m395FormatNumber(token.amount, 2);
      return token.designator === "LB" ? amount + " lb" : amount + token.designator;
    });
    return { key: pieces.join("+"), display: pieces.join(" + "), valid: true, weight: parsed.weight };
  }

  function m4094BuildLoadConfigurations(rows, holeDiameter) {
    var rate = m395AnfoRate(holeDiameter);
    var pageSet = {};
    (rows || []).forEach(function (row) { pageSet[String(Number(row && row.PageNumber || 1))] = true; });
    var multiPage = Object.keys(pageSet).length > 1;
    var map = {};
    var order = [];
    var invalid = [];

    (rows || []).forEach(function (row) {
      row = row || {};
      if (m4094FlagYes(row.DirtHole) || m4094FlagYes(row.BadHole)) return;
      var primaryRaw = String(row.PrimaryLoad || "").trim();
      var secondaryRaw = String(row.SecondaryLoad || "").trim();
      if (!primaryRaw && !secondaryRaw) return;

      var primary = m4094LoadField(primaryRaw, rate);
      var secondary = m4094LoadField(secondaryRaw, rate);
      var key = primary.key + "||" + secondary.key;
      if (!map[key]) {
        map[key] = {
          key: key,
          primary: primary,
          secondary: secondary,
          valid: primary.valid && secondary.valid,
          weight: primary.valid && secondary.valid ? primary.weight + secondary.weight : null,
          holes: [],
          depths: [],
          stemmings: [],
          loadedColumns: []
        };
        order.push(key);
      }

      var group = map[key];
      var label = m395PageHoleLabel(row, multiPage);
      group.holes.push(label);
      var depth = m4094NonNegativeNumber(row.Depth);
      var stemming = m4094NonNegativeNumber(row.Stemming);
      if (depth !== null) group.depths.push(depth);
      if (stemming !== null) group.stemmings.push(stemming);
      if (depth !== null && stemming !== null) group.loadedColumns.push(Math.max(depth - stemming, 0));
      if (!group.valid) invalid.push(label);
    });

    var groups = order.map(function (key) { return map[key]; });
    groups.sort(function (a, b) {
      if (a.weight === null && b.weight !== null) return 1;
      if (a.weight !== null && b.weight === null) return -1;
      if (a.weight !== null && b.weight !== null && Math.abs(a.weight - b.weight) > 0.000001) return a.weight - b.weight;
      return (a.primary.display + "|" + a.secondary.display).localeCompare(b.primary.display + "|" + b.secondary.display);
    });

    var validWeights = groups.filter(function (group) { return group.weight !== null && group.weight > 0; }).map(function (group) { return group.weight; });
    var lightestWeight = validWeights.length ? Math.min.apply(Math, validWeights) : null;
    var heaviestWeight = validWeights.length ? Math.max.apply(Math, validWeights) : null;
    groups.forEach(function (group, index) {
      group.number = index + 1;
      group.depthRange = m4094RangeText(group.depths, "ft");
      group.stemmingRange = m4094RangeText(group.stemmings, "ft");
      group.loadedColumnRange = m4094RangeText(group.loadedColumns, "ft");
      group.holeText = m395FormatTiedLabels(group.holes);
      group.isLightest = group.weight !== null && lightestWeight !== null && Math.abs(group.weight - lightestWeight) < 0.000001;
      group.isHeaviest = group.weight !== null && heaviestWeight !== null && Math.abs(group.weight - heaviestWeight) < 0.000001;
    });
    return {
      rate: rate,
      groups: groups,
      invalid: invalid,
      lightestWeight: lightestWeight,
      heaviestWeight: heaviestWeight,
      lightestGroups: groups.filter(function (group) { return group.isLightest; }),
      heaviestGroups: groups.filter(function (group) { return group.isHeaviest; })
    };
  }

  function m4094ShotSummarySnapshot() {
    var rows = typeof window.getAllHoleRows === "function" ? window.getAllHoleRows() : [];
    var base = typeof window.getShotSummary === "function" ? window.getShotSummary() : {};
    var footage = typeof window.getFootageSummary === "function" ? window.getFootageSummary(rows) : {};
    var qa = typeof window.getQAWarnings === "function" ? window.getQAWarnings() : { red: [], yellow: [] };
    var diameter = m395EnsureHeaderDiameter();
    var loaded = 0;
    var unloaded = 0;
    var secondary = 0;
    rows.forEach(function (row) {
      var exempt = m4094FlagYes(row.DirtHole) || m4094FlagYes(row.BadHole);
      var hasPrimary = String(row.PrimaryLoad || "").trim() !== "";
      var hasSecondary = String(row.SecondaryLoad || "").trim() !== "";
      if (exempt) return;
      if (hasPrimary || hasSecondary) loaded += 1;
      else unloaded += 1;
      if (hasSecondary) secondary += 1;
    });
    return {
      rows: rows,
      base: base,
      footage: footage,
      qa: qa,
      diameter: diameter,
      depthRange: m395DepthRangeFromValues(rows.map(function (row) { return row.Depth; })),
      configurations: m4094BuildLoadConfigurations(rows, diameter),
      saved: rows.length,
      loaded: loaded,
      unloaded: unloaded,
      secondary: secondary
    };
  }

  function m4094StatValue(value, suffix) {
    var number = Number(value || 0);
    return m395FormatNumber(number, 1) + (suffix ? " " + suffix : "");
  }

  function m4094ShotMetric(label, value, note, tone) {
    return '<div class="m4094Metric ' + (tone || "") + '"><b>' + m395EscapeHTML(label) + '</b><span>' + m395EscapeHTML(value) + '</span>' + (note ? '<small>' + m395EscapeHTML(note) + '</small>' : '') + '</div>';
  }

  function m4094LoadExtremeHTML(label, groups, weight) {
    if (!groups || !groups.length || weight === null) {
      return '<div class="m4094LoadCard"><b>' + m395EscapeHTML(label) + '</b><span class="m4094LoadWeight">Not available</span><small>No interpretable loaded-hole configuration.</small></div>';
    }
    var group = groups[0];
    var tied = groups.length > 1 ? ' +' + (groups.length - 1) + ' tied configuration' + (groups.length === 2 ? '' : 's') : '';
    return '<div class="m4094LoadCard">' +
      '<b>' + m395EscapeHTML(label) + '</b>' +
      '<span class="m4094LoadWeight">' + m395EscapeHTML(m395FormatNumber(weight, 2) + ' lb') + '</span>' +
      '<div class="m4094Recipe"><strong>Primary:</strong> ' + m395EscapeHTML(group.primary.display) + ' <strong>Secondary:</strong> ' + m395EscapeHTML(group.secondary.display) + '</div>' +
      '<small>Depth ' + m395EscapeHTML(group.depthRange) + ' | Stemming ' + m395EscapeHTML(group.stemmingRange) + '<br>Holes: ' + m395EscapeHTML(group.holeText + tied) + '</small>' +
      '</div>';
  }

  function m4094ConfigurationPagesHTML(configurations) {
    var groups = configurations && configurations.groups || [];
    if (!groups.length) return '';
    var chunks = [];
    for (var i = 0; i < groups.length; i += 10) chunks.push(groups.slice(i, i + 10));
    return chunks.map(function (chunk, pageIndex) {
      var rows = chunk.map(function (group) {
        var tags = [];
        if (group.isLightest) tags.push('<em class="m4094Tag light">Lightest</em>');
        if (group.isHeaviest) tags.push('<em class="m4094Tag heavy">Heaviest</em>');
        var weight = group.weight === null ? 'Needs review' : m395FormatNumber(group.weight, 2) + ' lb';
        return '<tr>' +
          '<td class="m4094ConfigNo">' + group.number + '</td>' +
          '<td><b>Primary:</b> ' + m395EscapeHTML(group.primary.display) + '<br><b>Secondary:</b> ' + m395EscapeHTML(group.secondary.display) + '</td>' +
          '<td><b>' + group.holes.length + '</b><br><small>' + m395EscapeHTML(group.holeText) + '</small></td>' +
          '<td>' + m395EscapeHTML(group.depthRange) + '</td>' +
          '<td>' + m395EscapeHTML(group.stemmingRange) + '</td>' +
          '<td>' + m395EscapeHTML(group.loadedColumnRange) + '</td>' +
          '<td><b>' + m395EscapeHTML(weight) + '</b><br>' + tags.join(' ') + '</td>' +
          '</tr>';
      }).join('');
      return '<section class="m4094ConfigSheet break">' +
        '<div class="m4094ConfigHead"><div><h1>Loading Configurations</h1><p>Cross-section preparation - grouped by Primary and Secondary/Special load recipe.</p></div><b>Page ' + (pageIndex + 1) + ' of ' + chunks.length + '</b></div>' +
        '<div class="m4094ConfigNote">Depth, stemming, and loaded-column values are shown as ranges when holes with the same explosive recipe differ. Dirt and Bad holes are excluded.</div>' +
        '<table class="m4094ConfigTable"><thead><tr><th>#</th><th>Explosive recipe</th><th>Holes</th><th>Depth</th><th>Stemming</th><th>Loaded column</th><th>Calculated load</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<div class="m4094PageFoot">ANFO weight uses ' + m395EscapeHTML(m395FormatNumber(configurations.rate, 2)) + ' lb/ft for the selected hole diameter. Plain numbers remain manually entered pounds.</div>' +
        '</section>';
    }).join('');
  }

  function m4094QAPagesHTML(qa) {
    qa = qa || { red: [], yellow: [] };
    var entries = [];
    (qa.red || []).forEach(function (message) { entries.push({ tone: 'red', label: 'RED', message: message }); });
    (qa.yellow || []).forEach(function (message) { entries.push({ tone: 'yellow', label: 'YELLOW', message: message }); });
    if (!entries.length) return '';
    var chunks = [];
    for (var i = 0; i < entries.length; i += 20) chunks.push(entries.slice(i, i + 20));
    return chunks.map(function (chunk, pageIndex) {
      var items = chunk.map(function (entry) {
        return '<li class="' + entry.tone + '"><b>' + entry.label + '</b><span>' + m395EscapeHTML(entry.message) + '</span></li>';
      }).join('');
      return '<section class="m4094QASheet break">' +
        '<div class="m4094ConfigHead"><div><h1>QA Warnings</h1><p>Exported with unresolved Shot Diagram review items.</p></div><b>Page ' + (pageIndex + 1) + ' of ' + chunks.length + '</b></div>' +
        '<div class="m4094QATotals"><span><b>Red Warnings</b>' + (qa.red || []).length + '</span><span><b>Yellow Warnings</b>' + (qa.yellow || []).length + '</span></div>' +
        '<ol class="m4094QAList">' + items + '</ol>' +
        '<div class="m4094PageFoot">Correct the listed hole records and export again to clear these warnings.</div>' +
        '</section>';
    }).join('');
  }

  function m4094ShotSummaryHTML(snapshot) {
    var f = snapshot.footage || {};
    var base = snapshot.base || {};
    var qa = snapshot.qa || { red: [], yellow: [] };
    var config = snapshot.configurations;
    var qaTotal = qa.red.length + qa.yellow.length;
    var conditionChips = [
      ['Wet', base.wet || 0, 'wet'],
      ['Bad', base.bad || 0, 'bad'],
      ['Dirt', base.dirt || 0, 'dirt'],
      ['Secondary / special', snapshot.secondary, 'special']
    ].map(function (item) { return '<span class="m4094Chip ' + item[2] + '"><b>' + m395EscapeHTML(item[0]) + '</b> ' + item[1] + '</span>'; }).join('');

    return '<section class="m4094SummarySheet">' +
      '<div class="m4094SummaryHead"><div><div class="m4094Eyebrow">MITHRIL FIELD REPORT</div><h1>Shot Diagram Summary</h1><p>' + m395EscapeHTML(headerData.JobName || 'Job not entered') + (headerData.ShotID ? ' - ' + m395EscapeHTML(headerData.ShotID) : '') + '</p></div><div class="m4094DocType">SHOT DIAGRAM</div></div>' +
      '<div class="m4094Identity"><span><b>Date</b>' + m395EscapeHTML(typeof formatShotDate === 'function' ? formatShotDate(headerData.FieldDate) || 'Not entered' : headerData.FieldDate || 'Not entered') + '</span><span><b>Blaster</b>' + m395EscapeHTML(headerData.Blaster || 'Not entered') + '</span><span><b>Entered By</b>' + m395EscapeHTML(headerData.EnteredByDefault || 'Not entered') + '</span><span><b>Pages</b>' + m395EscapeHTML(base.pages || 0) + '</span></div>' +
      '<div class="m4094HeroGrid">' +
        m4094ShotMetric('Hole Diameter', m395FormatHoleDiameter(snapshot.diameter), 'ANFO factor ' + m395FormatNumber(config.rate, 2) + ' lb/ft', 'hero') +
        m4094ShotMetric(snapshot.depthRange.label || 'Drilled Depth Range', snapshot.depthRange.value || 'Not available', snapshot.depthRange.count + ' holes with depth', 'hero') +
      '</div>' +
      '<h2 class="m4094SectionTitle">Production totals</h2>' +
      '<div class="m4094MetricGrid core">' +
        m4094ShotMetric('Saved Holes', String(snapshot.saved), 'All saved hole records') +
        m4094ShotMetric('Loaded Holes', String(snapshot.loaded), 'Primary or secondary/special load', 'good') +
        m4094ShotMetric('Total Hole Footage', m4094StatValue(f.totalDepth, f.depthCount ? 'ft' : ''), f.depthCount + ' holes with depth') +
        m4094ShotMetric('Average Hole Depth', m4094StatValue(f.averageDepth, f.depthCount ? 'ft' : ''), 'Concept production metric') +
      '</div>' +
      '<div class="m4094InlineNote"><b>' + snapshot.unloaded + '</b> blank-load holes | Secondary/special-only holes are included in Loaded Holes. Dirt and Bad holes are not counted as unloaded.</div>' +
      '<h2 class="m4094SectionTitle">Footage and conditions</h2>' +
      '<div class="m4094MetricGrid footage">' +
        m4094ShotMetric('Total Rock Blasted', m4094StatValue(f.totalRockBlasted, f.rockBlastedCount ? 'ft' : ''), 'Depth minus overburden') +
        m4094ShotMetric('Total Stemming', m4094StatValue(f.totalStemming, f.stemmingCount ? 'ft' : ''), 'Average ' + m4094StatValue(f.averageStemming, f.stemmingCount ? 'ft' : '')) +
        m4094ShotMetric('Total Loaded Column', m4094StatValue(f.totalLoadedFootage, f.loadedColumnCount ? 'ft' : ''), 'Average ' + m4094StatValue(f.averageLoadedColumn, f.loadedColumnCount ? 'ft' : '')) +
        m4094ShotMetric('QA Review', qaTotal ? qaTotal + ' warning' + (qaTotal === 1 ? '' : 's') : 'PASS', qa.red.length + ' red / ' + qa.yellow.length + ' yellow', qa.red.length ? 'danger' : qa.yellow.length ? 'warn' : 'good') +
      '</div>' +
      '<div class="m4094ChipRow">' + conditionChips + '</div>' +
      '<h2 class="m4094SectionTitle">Explosive load range</h2>' +
      '<div class="m4094LoadGrid">' +
        m4094LoadExtremeHTML('Lightest loaded-hole configuration', config.lightestGroups, config.lightestWeight) +
        m4094LoadExtremeHTML('Heaviest loaded-hole configuration', config.heaviestGroups, config.heaviestWeight) +
      '</div>' +
      '<div class="m4094ConfigSummary"><b>' + config.groups.length + ' unique loading configuration' + (config.groups.length === 1 ? '' : 's') + '</b><span>' + (config.groups.length ? 'Every recipe is listed on the following Loading Configurations page' + (config.groups.length === 1 ? '.' : 's.') : 'No loaded-hole recipe is available to list.') + '</span></div>' +
      '<div class="m4094Legend"><b>Diagram Legend</b><span><i class="loaded"></i>Loaded</span><span><i class="dirt"></i>Dirt</span><span><i class="bad"></i>Bad</span><span><i class="wet"></i>Wet outline</span><span><i class="blank"></i>Blank / unloaded</span></div>' +
      '<div class="m4094SummaryFoot"><span>Generated by MITHRIL Mobile ' + m395EscapeHTML(RELEASE_VERSION) + '</span><span>Summary values come from the exported Shot Diagram data.</span></div>' +
      '</section>';
  }

  function m4094ShotSummaryStyles() {
    return [
      '.m4094SummarySheet,.m4094ConfigSheet,.m4094QASheet{width:8.45in;height:10.9in;box-sizing:border-box;padding:.28in .3in;background:#fff;overflow:hidden;page-break-inside:avoid;break-inside:avoid}',
      '.m4094SummaryHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin:-.28in -.3in 9px;padding:.24in .3in .18in;background:#17283d}',
      '.m4094SummaryHead h1,.m4094ConfigHead h1{margin:1px 0 2px;font-size:27px;line-height:1.05;color:#17283d}',
      '.m4094SummaryHead h1{color:#fff}.m4094SummaryHead p{margin:3px 0 0;font-size:12px;font-weight:800;color:#dce7f3}.m4094ConfigHead p{margin:3px 0 0;font-size:12px;font-weight:800;color:#4e5d6d}',
      '.m4094Eyebrow{font-size:9px;letter-spacing:.14em;font-weight:950;color:#1f6feb}',
      '.m4094DocType{padding:8px 10px;border:1px solid #80b6ff;border-radius:6px;background:#233a55;color:#fff;font-size:10px;font-weight:950;letter-spacing:.08em}',
      '.m4094Identity{display:grid;grid-template-columns:1.15fr 1fr 1fr .45fr;gap:6px;margin:8px 0}',
      '.m4094Identity span{padding:6px 8px;border:1px solid #c8d0d9;background:#f6f8fa;font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.m4094Identity b{display:block;margin-bottom:2px;color:#667587;font-size:8px;text-transform:uppercase;letter-spacing:.05em}',
      '.m4094HeroGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 9px}',
      '.m4094MetricGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}',
      '.m4094Metric{min-width:0;padding:8px 9px;border:1px solid #b9c3ce;border-radius:6px;background:#f5f7fa}',
      '.m4094Metric.hero{padding:10px 12px;border:2px solid #1f6feb;background:#eef4ff}',
      '.m4094Metric.good{border-color:#6ba778;background:#edf8ef}.m4094Metric.warn{border-color:#c49a32;background:#fff7dc}.m4094Metric.danger{border-color:#c34f4f;background:#ffeaea}',
      '.m4094Metric b{display:block;color:#506175;font-size:9px;text-transform:uppercase;letter-spacing:.045em}',
      '.m4094Metric span{display:block;margin-top:3px;color:#111;font-size:21px;line-height:1;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.m4094Metric.hero span{font-size:25px}.m4094Metric small{display:block;margin-top:5px;color:#66717d;font-size:8.5px;line-height:1.25}',
      '.m4094SectionTitle{margin:10px 0 5px;padding:0;color:#17283d;font-size:13px;text-transform:uppercase;letter-spacing:.055em}',
      '.m4094InlineNote{margin:6px 0 0;padding:5px 8px;border-left:3px solid #1f6feb;background:#f1f5f9;color:#455566;font-size:9px}',
      '.m4094ChipRow{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0 0}.m4094Chip{padding:4px 8px;border:1px solid #adb8c3;border-radius:999px;background:#f7f8fa;font-size:9px}.m4094Chip.wet{border-color:#1f6feb;background:#eaf2ff}.m4094Chip.bad{border-color:#bd5555;background:#ffe9e9}.m4094Chip.dirt{border-color:#8a6846;background:#f0e5da}.m4094Chip.special{border-color:#7357b4;background:#f1edfb}',
      '.m4094LoadGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.m4094LoadCard{min-height:105px;padding:9px 11px;border:2px solid #304c6b;border-radius:7px;background:#f8fafc}.m4094LoadCard>b{display:block;color:#506175;font-size:9px;text-transform:uppercase}.m4094LoadWeight{display:block;margin:3px 0;color:#17283d;font-size:24px;font-weight:950}.m4094Recipe{margin:3px 0 5px;font-size:10px}.m4094LoadCard small{display:block;color:#5c6875;font-size:8.5px;line-height:1.35}',
      '.m4094ConfigSummary{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;padding:8px 10px;border:1px solid #1f6feb;background:#eef4ff;font-size:10px}.m4094ConfigSummary span{color:#506175;text-align:right}',
      '.m4094Legend{display:flex;align-items:center;gap:10px;margin-top:7px;padding:6px 9px;border:1px solid #c1cad4;background:#f7f8fa;font-size:8px}.m4094Legend>b{margin-right:3px;color:#405267;text-transform:uppercase}.m4094Legend span{white-space:nowrap}.m4094Legend i{display:inline-block;width:14px;height:9px;margin-right:4px;border:1px solid #66717d;vertical-align:-1px}.m4094Legend i.loaded{background:#bdf2c3}.m4094Legend i.dirt{background:#b68b6a}.m4094Legend i.bad{background:#ff8c8c}.m4094Legend i.wet{height:7px;border:2px solid #1f6feb;background:#fff}.m4094Legend i.blank{background:#fff}',
      '.m4094SummaryFoot{display:flex;justify-content:space-between;margin-top:10px;padding-top:6px;border-top:1px solid #bcc5cf;color:#66717d;font-size:8px}',
      '.m4094ConfigHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding-bottom:10px;border-bottom:3px solid #1f6feb}.m4094ConfigHead>b{font-size:10px;color:#506175}',
      '.m4094ConfigNote{margin:10px 0;padding:8px 10px;border-left:4px solid #1f6feb;background:#eef4ff;color:#405267;font-size:10px;line-height:1.35}',
      '.m4094ConfigTable{width:100%;table-layout:fixed;border-collapse:collapse;font-size:9px}.m4094ConfigTable th,.m4094ConfigTable td{padding:7px 6px;border:1px solid #98a5b3;vertical-align:top}.m4094ConfigTable th{background:#17283d;color:#fff;font-size:8px;text-transform:uppercase;letter-spacing:.03em}.m4094ConfigTable th:nth-child(1){width:4%}.m4094ConfigTable th:nth-child(2){width:24%}.m4094ConfigTable th:nth-child(3){width:20%}.m4094ConfigTable th:nth-child(4),.m4094ConfigTable th:nth-child(5),.m4094ConfigTable th:nth-child(6){width:12%}.m4094ConfigTable th:nth-child(7){width:16%}.m4094ConfigTable tbody tr:nth-child(even){background:#f5f7fa}.m4094ConfigTable small{color:#596777;font-size:7.8px;line-height:1.25}.m4094ConfigNo{text-align:center;font-weight:950;font-size:12px}',
      '.m4094Tag{display:inline-block;margin-top:4px;padding:2px 4px;border-radius:3px;font-size:7px;font-style:normal;font-weight:950;text-transform:uppercase}.m4094Tag.light{background:#eaf2ff;color:#154f92}.m4094Tag.heavy{background:#ffe8e8;color:#8e2525}',
      '.m4094PageFoot{margin-top:10px;padding-top:7px;border-top:1px solid #abb5c0;color:#596777;font-size:8.5px}',
      '.m4094QATotals{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.m4094QATotals span{padding:10px 12px;border:1px solid #c1cad4;background:#f5f7fa;font-size:22px;font-weight:950}.m4094QATotals b{display:block;margin-bottom:3px;color:#596777;font-size:9px;text-transform:uppercase}.m4094QAList{margin:0;padding:0;list-style:none;display:grid;gap:6px}.m4094QAList li{display:grid;grid-template-columns:62px 1fr;gap:9px;align-items:start;padding:8px 10px;border:1px solid #c1cad4;font-size:10px;line-height:1.3}.m4094QAList li.red{border-color:#c34f4f;background:#ffeaea}.m4094QAList li.yellow{border-color:#c49a32;background:#fff7dc}.m4094QAList li b{font-size:8px;letter-spacing:.05em}',
      '@media print{.m4094SummarySheet,.m4094ConfigSheet,.m4094QASheet{margin:0}.m4094ConfigSheet,.m4094QASheet{page-break-before:always;break-before:page}}'
    ].join('');
  }

  function installM4094ShotExportSummary() {
    if (window.__mithrilM4094ShotExportSummary || typeof window.getPrintableReportHTML !== 'function') return;
    window.__mithrilM4094ShotExportSummary = true;
    var originalReport = window.getPrintableReportHTML;
    window.getPrintableReportHTML = function () {
      var html = String(originalReport.apply(this, arguments));
      var snapshot = m4094ShotSummarySnapshot();
      html = html.replace('</style>', m4094ShotSummaryStyles() + '</style>');
      var bodyMarker = '<body>';
      var bodyStart = html.indexOf(bodyMarker);
      if (bodyStart < 0) return html;
      var anchors = ['<section class="m395PatternSheet break">', '<section class="overviewSheet break">'];
      var anchor = -1;
      for (var i = 0; i < anchors.length; i += 1) {
        var candidate = html.indexOf(anchors[i], bodyStart);
        if (candidate !== -1 && (anchor === -1 || candidate < anchor)) anchor = candidate;
      }
      if (anchor < 0) return html;
      var replacement = '<button class="noPrint" onclick="window.print()" style="font-size:16px;padding:10px 14px;margin-bottom:12px;">Print / Save as PDF</button>' +
        m4094ShotSummaryHTML(snapshot) + m4094ConfigurationPagesHTML(snapshot.configurations) + m4094QAPagesHTML(snapshot.qa);
      return html.slice(0, bodyStart + bodyMarker.length) + replacement + html.slice(anchor);
    };
  }

  function m4094CanvasText(ctx, textValue, x, y, maxWidth, font, color) {
    ctx.font = font;
    ctx.fillStyle = color || '#111';
    var textString = String(textValue == null ? '' : textValue);
    var shortened = textString;
    while (shortened.length > 3 && ctx.measureText(shortened + '...').width > maxWidth) shortened = shortened.slice(0, -1);
    if (shortened !== textString) shortened += '...';
    ctx.fillText(shortened, x, y);
  }

  function m4094CanvasCard(ctx, left, top, width, height, label, value, note, tone) {
    var fill = '#f5f7fa', stroke = '#b9c3ce';
    if (tone === 'hero') { fill = '#eef4ff'; stroke = '#1f6feb'; }
    if (tone === 'good') { fill = '#edf8ef'; stroke = '#6ba778'; }
    if (tone === 'warn') { fill = '#fff7dc'; stroke = '#c49a32'; }
    if (tone === 'danger') { fill = '#ffeaea'; stroke = '#c34f4f'; }
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = tone === 'hero' ? 3 : 2;
    ctx.fillRect(left, top, width, height); ctx.strokeRect(left, top, width, height);
    m4094CanvasText(ctx, String(label).toUpperCase(), left + 15, top + 14, width - 30, '900 18px Arial', '#506175');
    m4094CanvasText(ctx, value, left + 15, top + 48, width - 30, tone === 'hero' ? '950 36px Arial' : '950 33px Arial', '#111');
    if (note) m4094CanvasText(ctx, note, left + 15, top + height - 31, width - 30, '700 15px Arial', '#66717d');
  }

  function m4094RenderDrillSummaryCanvas() {
    var summary = typeof window.getDrillSummary === 'function' ? window.getDrillSummary() : {};
    var range = summary.depthRange || m395DepthRangeFromValues([]);
    var pattern = summary.patternSummary || m395BuildPatternSummary([], m395EnsurePatternState());
    var c = document.createElement('canvas'); c.width = IMG_W; c.height = IMG_H;
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, IMG_W, IMG_H); x.textBaseline = 'top';

    x.fillStyle = '#17283d'; x.fillRect(0, 0, IMG_W, 250);
    x.fillStyle = '#5aa0ff'; x.font = '950 18px Arial'; x.fillText('MITHRIL FIELD REPORT', 70, 43);
    x.fillStyle = '#fff'; x.font = '950 54px Arial'; x.fillText('DRILL LOG SUMMARY', 70, 74);
    x.fillStyle = '#dce7f3'; x.font = '800 24px Arial';
    m4094CanvasText(x, 'Job: ' + (headerData.Job || 'Not entered'), 70, 150, 610, '800 24px Arial', '#dce7f3');
    m4094CanvasText(x, 'Drill Log: ' + (headerData.DrillLogNumber || 'Not entered'), 70, 190, 610, '800 24px Arial', '#dce7f3');
    m4094CanvasText(x, 'Employee: ' + (headerData.Employee || 'Not entered'), 735, 150, 560, '800 24px Arial', '#dce7f3');
    m4094CanvasText(x, 'Date: ' + (headerData.Date || 'Not entered'), 735, 190, 560, '800 24px Arial', '#dce7f3');

    m4094CanvasCard(x, 70, 280, 600, 125, 'Hole Diameter', m395FormatHoleDiameter(summary.holeDiameter), 'Selected report diameter', 'hero');
    m4094CanvasCard(x, 695, 280, 600, 125, range.label || 'Drilled Depth Range', range.value || 'Not available', (range.count || 0) + ' holes with depth', 'hero');

    x.fillStyle = '#17283d'; x.font = '950 29px Arial'; x.fillText('PRODUCTION TOTALS', 70, 445);
    var reviewCount = Number(summary.incomplete || 0) + Number(summary.invalid || 0);
    m4094CanvasCard(x, 70, 495, 285, 145, 'Usable Holes', String(summary.loaded || 0), 'Excludes Dirt / Bad', 'good');
    m4094CanvasCard(x, 385, 495, 285, 145, 'Total Hole Footage', m395FormatNumber(summary.totalDepth || 0, 1) + ' ft', (summary.depthCount || 0) + ' holes with depth');
    m4094CanvasCard(x, 700, 495, 285, 145, 'Average Hole Depth', m395FormatNumber(summary.avgDepth || 0, 1) + ' ft', 'Usable holes');
    m4094CanvasCard(x, 1015, 495, 280, 145, 'Needs Review', String(reviewCount), (summary.incomplete || 0) + ' incomplete / ' + (summary.invalid || 0) + ' invalid', summary.invalid ? 'danger' : summary.incomplete ? 'warn' : 'good');

    x.fillStyle = '#17283d'; x.font = '950 29px Arial'; x.fillText('FOOTAGE', 70, 685);
    m4094CanvasCard(x, 70, 735, 285, 145, 'Total Overburden', m395FormatNumber(summary.totalOverburden || 0, 1) + ' ft', 'Average ' + m395FormatNumber(summary.avgOverburden || 0, 1) + ' ft');
    m4094CanvasCard(x, 385, 735, 285, 145, 'Total Rock', m395FormatNumber(summary.totalRock || 0, 1) + ' ft', 'Average ' + m395FormatNumber(summary.avgRock || 0, 1) + ' ft');
    m4094CanvasCard(x, 700, 735, 285, 145, 'Holes Entered', String(summary.saved || 0), 'Across ' + (summary.pages || 0) + ' page' + (Number(summary.pages || 0) === 1 ? '' : 's'));
    m4094CanvasCard(x, 1015, 735, 280, 145, 'Complete Holes', String(summary.complete || 0), 'Valid depth + overburden', 'good');

    x.fillStyle = '#17283d'; x.font = '950 29px Arial'; x.fillText('HOLE CONDITIONS', 70, 925);
    m4094CanvasCard(x, 70, 975, 285, 112, 'Hole Condition', String(summary.breakthrough || 0), 'Intervals / breakthrough');
    m4094CanvasCard(x, 385, 975, 285, 112, 'Wet', String(summary.wet || 0), 'Blue outline');
    m4094CanvasCard(x, 700, 975, 285, 112, 'Dirt', String(summary.dirt || 0), 'Excluded from totals');
    m4094CanvasCard(x, 1015, 975, 280, 112, 'Bad', String(summary.bad || 0), 'Excluded from totals', summary.bad ? 'danger' : '');

    x.fillStyle = '#17283d'; x.font = '950 29px Arial'; x.fillText('PATTERN AND SHOT VOLUME', 70, 1135);
    var areaValue = pattern.areaHoleCount ? m395FormatNumber(pattern.totalAreaSqFt, 1) + ' sq ft' : 'Not available';
    var rockValue = pattern.rockOnlyVolumeHoleCount ? m395FormatNumber(pattern.totalShotVolumeRockOnlyCubicYards, 1) + ' cu yd' : 'Not available';
    var totalValue = pattern.rockAndOverburdenVolumeHoleCount ? m395FormatNumber(pattern.totalShotVolumeRockAndOverburdenCubicYards, 1) + ' cu yd' : 'Not available';
    m4094CanvasCard(x, 70, 1185, 385, 155, 'Estimated Pattern Area', areaValue, pattern.areaHoleCount ? m395FormatNumber(pattern.totalAreaSqYd, 1) + ' sq yd' : 'Set burden and spacing', 'hero');
    m4094CanvasCard(x, 490, 1185, 385, 155, 'Shot Volume - Rock Only', rockValue, 'Depth minus overburden', 'hero');
    m4094CanvasCard(x, 910, 1185, 385, 155, 'Shot Volume - Rock + OB', totalValue, 'Uses total drilled depth', 'hero');

    x.fillStyle = reviewCount ? '#fff7dc' : '#edf8ef'; x.strokeStyle = reviewCount ? '#c49a32' : '#6ba778'; x.lineWidth = 2;
    x.fillRect(70, 1390, 1225, 190); x.strokeRect(70, 1390, 1225, 190);
    x.fillStyle = '#17283d'; x.font = '950 27px Arial'; x.fillText('REPORT REVIEW', 95, 1415);
    x.font = '800 21px Arial'; x.fillStyle = '#333';
    x.fillText('Missing depth or overburden: ' + (summary.incomplete || 0), 95, 1465);
    x.fillText('Overburden greater than depth: ' + (summary.invalid || 0), 520, 1465);
    x.fillText('Holes with notes: ' + (summary.notes || 0), 980, 1465);
    x.font = '700 18px Arial'; x.fillStyle = '#596777';
    m4094CanvasText(x, 'Pattern warnings: ' + m395PatternWarningsText(pattern), 95, 1515, 1160, '700 18px Arial', '#596777');

    x.fillStyle = '#f5f7fa'; x.strokeStyle = '#b9c3ce'; x.fillRect(70, 1630, 1225, 270); x.strokeRect(70, 1630, 1225, 270);
    x.fillStyle = '#17283d'; x.font = '950 25px Arial'; x.fillText('SUMMARY RULES', 95, 1655);
    x.fillStyle = '#4f5e6e'; x.font = '700 20px Arial';
    x.fillText('- Usable holes exclude holes marked Dirt or Bad.', 105, 1705);
    x.fillText('- Rock footage equals drilled depth minus overburden.', 105, 1750);
    x.fillText('- Hole-condition intervals are informational and do not reduce Total Rock.', 105, 1795);
    x.fillText('- Pattern and volume details continue on the breakdown page when configured.', 105, 1840);

    x.fillStyle = '#66717d'; x.font = '700 18px Arial';
    x.fillText('Generated by MITHRIL Mobile ' + RELEASE_VERSION, 70, IMG_H - 70);
    x.textAlign = 'right'; x.fillText('Standardized export summary', IMG_W - 70, IMG_H - 70); x.textAlign = 'left';
    return c;
  }

  function installM4094DrillExportSummary() {
    if (window.__mithrilM4094DrillExportSummary || typeof window.renderDrillSummaryCanvas !== 'function') return;
    window.__mithrilM4094DrillExportSummary = true;
    window.renderDrillSummaryCanvas = m4094RenderDrillSummaryCanvas;
  }

  window.MithrilM4094SummaryTools = {
    buildLoadConfigurations: m4094BuildLoadConfigurations,
    shotSnapshot: m4094ShotSummarySnapshot,
    rangeText: m4094RangeText
  };

  // ---------------------------------------------------------------------------
  // m40.9.5 Report Readiness / QA Center
  // ---------------------------------------------------------------------------
  function m4095Text(value) {
    return String(value == null ? "" : value).trim();
  }

  function m4095Yes(value) {
    return value === true || m4095Text(value).toLowerCase() === "yes";
  }

  function m4095Number(value) {
    var raw = m4095Text(value);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
    var parsed = Number(raw);
    return isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  function m4095MeaningfulRow(row, type) {
    row = row || {};
    var fields = type === "shot" ?
      ["Depth", "Stemming", "PrimaryLoad", "SecondaryLoad", "Overburden", "Timing", "Notes"] :
      ["Depth", "Overburden", "Notes"];
    for (var i = 0; i < fields.length; i += 1) {
      if (m4095Text(row[fields[i]])) return true;
    }
    return m4095Yes(row.Wet) || m4095Yes(row.BadHole) || m4095Yes(row.DirtHole) || m4095Yes(row.Breakthrough);
  }

  function m4095SortHoleIds(a, b) {
    var parse = function (value) {
      var match = m4095Text(value).match(/^([A-Za-z]+)(\d+)$/);
      return match ? { col: match[1].toUpperCase(), row: Number(match[2]) } : { col: m4095Text(value), row: 0 };
    };
    var left = parse(a), right = parse(b);
    return left.row - right.row || left.col.localeCompare(right.col);
  }

  function m4095RowsFromPages(sourcePages, type) {
    var rows = [];
    Object.keys(sourcePages || {}).map(Number).filter(function (value) { return isFinite(value); }).sort(function (a, b) { return a - b; }).forEach(function (pageNumber) {
      var page = sourcePages[String(pageNumber)] || {};
      Object.keys(page).sort(m4095SortHoleIds).forEach(function (holeId) {
        var record = page[holeId] || {};
        var row = {};
        Object.keys(record).forEach(function (key) { row[key] = record[key]; });
        row.PageNumber = pageNumber;
        row.HoleID = m4095Text(record.HoleID) || holeId;
        if (m4095MeaningfulRow(row, type)) rows.push(row);
      });
    });
    return rows;
  }

  function m4095PageLabels(rows) {
    var pages = {};
    (rows || []).forEach(function (row) { pages[String(Number(row.PageNumber || 1))] = true; });
    var multiPage = Object.keys(pages).length > 1;
    return (rows || []).map(function (row) {
      return {
        row: row,
        label: multiPage ? "P" + Number(row.PageNumber || 1) + " " + (m4095Text(row.HoleID) || "Unknown") : (m4095Text(row.HoleID) || "Unknown")
      };
    });
  }

  function m4095NewReview(type, rows) {
    return {
      type: type,
      rows: rows || [],
      blockers: [],
      advisories: [],
      checks: [],
      metrics: {},
      blockerCount: 0,
      advisoryCount: 0,
      ready: false
    };
  }

  function m4095AddIssue(review, severity, key, title, label, detail) {
    var target = severity === "advisory" ? review.advisories : review.blockers;
    var issue = null;
    for (var i = 0; i < target.length; i += 1) {
      if (target[i].key === key) { issue = target[i]; break; }
    }
    if (!issue) {
      issue = { key: key, title: title, detail: detail || "", items: [] };
      target.push(issue);
    }
    if (label && issue.items.indexOf(label) === -1) issue.items.push(label);
  }

  function m4095FinalizeReview(review) {
    review.blockerCount = review.blockers.reduce(function (total, issue) { return total + Math.max(issue.items.length, 1); }, 0);
    review.advisoryCount = review.advisories.reduce(function (total, issue) { return total + Math.max(issue.items.length, 1); }, 0);
    review.ready = review.blockerCount === 0;
    return review;
  }

  function m4095AddCheck(review, label, issueKey, note) {
    var failed = review.blockers.concat(review.advisories).some(function (issue) { return issue.key === issueKey; });
    review.checks.push({ label: label, passed: !failed, note: note || "" });
  }

  function m4095MissingHeaderFields(header, fields) {
    var missing = [];
    fields.forEach(function (field) {
      if (!m4095Text(header && header[field.key])) missing.push(field.label);
    });
    return missing;
  }

  function m4095AnalyzeDrillRows(rows, header) {
    rows = (rows || []).filter(function (row) { return m4095MeaningfulRow(row, "drill"); });
    var review = m4095NewReview("drill", rows);
    var labeled = m4095PageLabels(rows);
    var totalDepth = 0, complete = 0, condition = 0;

    if (!rows.length) m4095AddIssue(review, "blocker", "no-data", "No Drill Log holes entered", "Drill Log", "Enter field data before producing the report.");

    labeled.forEach(function (entry) {
      var row = entry.row, label = entry.label;
      var exempt = m4095Yes(row.DirtHole) || m4095Yes(row.BadHole);
      var depthText = m4095Text(row.Depth), overburdenText = m4095Text(row.Overburden);
      var depth = m4095Number(row.Depth), overburden = m4095Number(row.Overburden);
      if (exempt) { condition += 1; return; }
      if (!depthText) m4095AddIssue(review, "blocker", "missing-depth", "Missing drilled depth", label, "Each usable Drill Log hole needs a drilled depth.");
      else if (depth === null || depth <= 0) m4095AddIssue(review, "blocker", "invalid-depth", "Invalid drilled depth", label, "Depth must be a positive number.");
      if (!overburdenText) m4095AddIssue(review, "blocker", "missing-overburden", "Missing overburden", label, "Each usable Drill Log hole needs overburden, including zero where appropriate.");
      else if (overburden === null) m4095AddIssue(review, "blocker", "invalid-overburden", "Invalid overburden", label, "Overburden must be zero or greater.");
      if (depth !== null && depth > 0) totalDepth += depth;
      if (depth !== null && depth > 0 && overburden !== null && overburden > depth) {
        m4095AddIssue(review, "blocker", "overburden-depth", "Overburden exceeds drilled depth", label, "This produces an impossible negative rock interval.");
      }
      if (depth !== null && depth > 0 && overburden !== null && overburden <= depth) complete += 1;
    });

    var missingHeader = m4095MissingHeaderFields(header || {}, [
      { key: "Date", label: "Date" },
      { key: "DrillLogNumber", label: "Drill Log number" },
      { key: "Job", label: "Job" },
      { key: "Employee", label: "Employee" }
    ]);
    missingHeader.forEach(function (label) {
      m4095AddIssue(review, "advisory", "document-details", "Document details not entered", label, "These details do not change the hole calculations, but they belong on the finished report.");
    });

    review.metrics = {
      reviewed: rows.length,
      complete: complete,
      loaded: complete,
      totalDepth: totalDepth,
      conditions: condition
    };
    m4095AddCheck(review, "Field data is present", "no-data");
    review.checks.push({
      label: "Required hole dimensions are entered",
      passed: !review.blockers.some(function (issue) { return issue.key === "missing-depth" || issue.key === "missing-overburden"; })
    });
    review.checks.push({
      label: "Hole dimensions are physically valid",
      passed: !review.blockers.some(function (issue) { return ["invalid-depth", "invalid-overburden", "overburden-depth"].indexOf(issue.key) !== -1; }),
      note: "Overburden cannot exceed drilled depth."
    });
    m4095AddCheck(review, "Document details are complete", "document-details", "Missing details are advisory only.");
    return m4095FinalizeReview(review);
  }

  function m4095LoadTokens(row, anfoRate) {
    var primary = m395ParseLoad(m4095Text(row.PrimaryLoad), anfoRate);
    var secondary = m395ParseLoad(m4095Text(row.SecondaryLoad), anfoRate);
    return {
      valid: primary.valid && secondary.valid,
      tokens: (primary.tokens || []).concat(secondary.tokens || []),
      primary: primary,
      secondary: secondary
    };
  }

  function m4095AnalyzeShotRows(rows, header, options) {
    rows = (rows || []).filter(function (row) { return m4095MeaningfulRow(row, "shot"); });
    header = header || {};
    options = options || {};
    var review = m4095NewReview("shot", rows);
    var labeled = m4095PageLabels(rows);
    var holeDiameter = m395NormalizeHoleDiameter(options.holeDiameter || header.HoleDiameter);
    var anfoRate = m395AnfoRate(holeDiameter);
    var dinkLength = m4095Number(options.dinkLengthFeet);
    if (dinkLength === null || dinkLength <= 0) dinkLength = m4095Number(header.LoadCalculationSettings && header.LoadCalculationSettings.dinkLengthFeet);
    if (dinkLength === null || dinkLength <= 0) dinkLength = 3;
    var totalDepth = 0, loaded = 0, conditions = 0, balanceEligible = 0;

    if (!rows.length) m4095AddIssue(review, "blocker", "no-data", "No Shot Diagram holes entered", "Shot Diagram", "Enter or import hole data before producing the report.");

    labeled.forEach(function (entry) {
      var row = entry.row, label = entry.label;
      var exempt = m4095Yes(row.DirtHole) || m4095Yes(row.BadHole);
      var depthText = m4095Text(row.Depth), overburdenText = m4095Text(row.Overburden), stemmingText = m4095Text(row.Stemming);
      var primaryText = m4095Text(row.PrimaryLoad), secondaryText = m4095Text(row.SecondaryLoad);
      var hasLoad = !!(primaryText || secondaryText);
      var depth = m4095Number(row.Depth), overburden = m4095Number(row.Overburden), stemming = m4095Number(row.Stemming);
      if (exempt) { conditions += 1; return; }

      if (!depthText) m4095AddIssue(review, "blocker", "missing-depth", "Missing drilled depth", label, "Every active Shot Diagram hole needs a drilled depth.");
      else if (depth === null || depth <= 0) m4095AddIssue(review, "blocker", "invalid-depth", "Invalid drilled depth", label, "Depth must be a positive number.");
      if (!overburdenText) m4095AddIssue(review, "blocker", "missing-overburden", "Missing overburden", label, "Enter overburden, including zero where appropriate.");
      else if (overburden === null) m4095AddIssue(review, "blocker", "invalid-overburden", "Invalid overburden", label, "Overburden must be zero or greater.");
      if (!stemmingText) m4095AddIssue(review, "blocker", "missing-stemming", "Missing stemming", label, "Every active hole needs a stemming value.");
      else if (stemming === null) m4095AddIssue(review, "blocker", "invalid-stemming", "Invalid stemming", label, "Stemming must be zero or greater.");
      if (!hasLoad) m4095AddIssue(review, "blocker", "missing-load", "Missing explosive load", label, "Enter a Primary or Secondary / Special Load.");
      else {
        loaded += 1;
        if (!m4095Text(row.Timing)) m4095AddIssue(review, "blocker", "missing-timing", "Loaded hole missing timing", label, "Every loaded hole needs a timing value before the report is ready.");
      }
      if (depth !== null && depth > 0) totalDepth += depth;
      if (depth !== null && depth > 0 && overburden !== null && overburden > depth) {
        m4095AddIssue(review, "blocker", "overburden-depth", "Overburden exceeds drilled depth", label, "This produces an impossible negative rock interval.");
      }
      if (hasLoad && depth !== null && depth > 0 && stemming !== null && stemming >= depth) {
        m4095AddIssue(review, "blocker", "stemming-depth", "Stemming leaves no loaded column", label, "Stemming must be less than drilled depth for a loaded hole.");
      }

      if (hasLoad) {
        var load = m4095LoadTokens(row, anfoRate);
        if (!load.valid) {
          m4095AddIssue(review, "blocker", "invalid-load", "Explosive load cannot be interpreted", label, "Use ANFO footage such as 13A, dinks such as 1D, or pumped pounds such as 425.");
        } else {
          var hasFootageToken = load.tokens.some(function (token) { return token.designator === "A" || token.designator === "D"; });
          var allFootageTokens = load.tokens.length && load.tokens.every(function (token) { return token.designator === "A" || token.designator === "D"; });
          if (hasFootageToken && !allFootageTokens) {
            m4095AddIssue(review, "advisory", "mixed-load-unchecked", "Mixed footage and pounds not balance-checked", label, "MITHRIL can total the weight but cannot prove the physical column length of a mixed footage/pounds recipe.");
          } else if (allFootageTokens && depth !== null && depth > 0 && stemming !== null && stemming < depth) {
            balanceEligible += 1;
            var usedColumn = load.tokens.reduce(function (total, token) {
              return total + (token.designator === "A" ? token.amount : token.amount * dinkLength);
            }, 0);
            var availableColumn = depth - stemming;
            if (Math.abs(availableColumn - usedColumn) > 0.051) {
              m4095AddIssue(review, "blocker", "load-balance", "Explosive column does not balance", label + " (available " + m395FormatNumber(availableColumn, 2) + " ft; entered " + m395FormatNumber(usedColumn, 2) + " ft)", "For ANFO/dink loads, Depth minus Stemming must equal ANFO footage plus dink footage.");
            }
          }
        }
      }
    });

    var missingHeader = m4095MissingHeaderFields(header, [
      { key: "FieldDate", label: "Date" },
      { key: "ShotID", label: "Shot number" },
      { key: "JobName", label: "Job name" },
      { key: "Blaster", label: "Blaster" },
      { key: "EnteredByDefault", label: "Entered by" }
    ]);
    missingHeader.forEach(function (label) {
      m4095AddIssue(review, "advisory", "document-details", "Document details not entered", label, "These details do not change hole calculations, but they belong on the finished report.");
    });

    review.metrics = {
      reviewed: rows.length,
      loaded: loaded,
      complete: loaded,
      totalDepth: totalDepth,
      conditions: conditions,
      balanceEligible: balanceEligible,
      holeDiameter: holeDiameter,
      dinkLengthFeet: dinkLength
    };
    m4095AddCheck(review, "Field data is present", "no-data");
    review.checks.push({
      label: "Hole dimensions are complete",
      passed: !review.blockers.some(function (issue) { return ["missing-depth", "missing-overburden", "missing-stemming"].indexOf(issue.key) !== -1; }),
      note: "Depth, overburden, and stemming are required on active holes."
    });
    review.checks.push({
      label: "Hole dimensions are physically valid",
      passed: !review.blockers.some(function (issue) { return ["invalid-depth", "invalid-overburden", "invalid-stemming", "overburden-depth", "stemming-depth"].indexOf(issue.key) !== -1; })
    });
    m4095AddCheck(review, "Explosive data is entered", "missing-load");
    m4095AddCheck(review, "Loaded-hole timing is entered", "missing-timing");
    m4095AddCheck(review, "Load entries are interpretable", "invalid-load");
    m4095AddCheck(review, "ANFO / dink columns balance", "load-balance", balanceEligible + " footage-based hole" + (balanceEligible === 1 ? "" : "s") + " checked.");
    m4095AddCheck(review, "Document details are complete", "document-details", "Missing details are advisory only.");
    return m4095FinalizeReview(review);
  }

  function m4095CurrentReview(type) {
    try { if (typeof window.saveData === "function") window.saveData(); } catch (error) {}
    try { if (typeof window.saveState === "function") window.saveState(); } catch (error2) {}
    var header = typeof headerData !== "undefined" && headerData ? headerData : {};
    if (type === "shot") {
      var shotRows = typeof window.getAllHoleRows === "function" ? window.getAllHoleRows() : m4095RowsFromPages(typeof pagesData !== "undefined" ? pagesData : {}, "shot");
      return m4095AnalyzeShotRows(shotRows, header, {
        holeDiameter: header.HoleDiameter,
        dinkLengthFeet: header.LoadCalculationSettings && header.LoadCalculationSettings.dinkLengthFeet
      });
    }
    return m4095AnalyzeDrillRows(m4095RowsFromPages(typeof pagesData !== "undefined" ? pagesData : {}, "drill"), header);
  }

  function m4095InjectReadinessStyles() {
    if (byId("mithrilM4095ReadinessStyles")) return;
    var style = document.createElement("style");
    style.id = "mithrilM4095ReadinessStyles";
    style.textContent = [
      ".m4095ReadinessButton{border-color:#2f7a43!important;background:#edf8f0!important;color:#245d34!important;font-weight:950!important}",
      ".m4095ReadinessBox{width:min(760px,100%);max-height:min(90vh,900px);overflow:auto;padding:0!important;border-color:#61748a!important}",
      ".m4095Head{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;border-bottom:1px solid #cad2dc;background:#fff}",
      ".m4095Head strong{font-size:19px;color:#17283d}.m4095Head button{min-height:40px}",
      ".m4095Body{display:grid;gap:12px;padding:15px 16px 18px;background:#f5f7fa}",
      ".m4095Status{display:grid;grid-template-columns:58px minmax(0,1fr);gap:12px;align-items:center;padding:16px;border:2px solid;border-radius:13px}",
      ".m4095Status.ready{border-color:#2f8a4b;background:#eaf8ee;color:#1f5e32}.m4095Status.blocked{border-color:#b42318;background:#fff0ef;color:#7f1d17}",
      ".m4095StatusIcon{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:currentColor;color:#fff;font-size:31px;font-weight:950}",
      ".m4095Status h2{margin:0;font-size:24px;line-height:1.05}.m4095Status p{margin:5px 0 0;font-size:13px;font-weight:800;line-height:1.35}",
      ".m4095Metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.m4095Metric{min-width:0;padding:10px;border:1px solid #b8c3cf;border-radius:9px;background:#fff}.m4095Metric b{display:block;color:#607084;font-size:10px;text-transform:uppercase;letter-spacing:.04em}.m4095Metric span{display:block;margin-top:3px;color:#17283d;font-size:22px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".m4095Section{padding:12px;border:1px solid #c2ccd6;border-radius:11px;background:#fff}.m4095Section h3{margin:0 0 9px;color:#17283d;font-size:16px}",
      ".m4095IssueList,.m4095CheckList{display:grid;gap:7px}.m4095Issue{border:1px solid #c6ced7;border-radius:9px;overflow:hidden}.m4095Issue.blocker{border-color:#d28782;background:#fff7f6}.m4095Issue.advisory{border-color:#d4b15a;background:#fffaf0}",
      ".m4095Issue summary{cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px 11px;font-size:13px;font-weight:900}.m4095Issue summary span:last-child{font-size:11px;text-transform:uppercase}",
      ".m4095IssueBody{padding:0 11px 11px;color:#4d5b69;font-size:12px;line-height:1.4}.m4095HoleChips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.m4095HoleChips span{padding:4px 7px;border:1px solid #9da9b7;border-radius:999px;background:#fff;color:#25364a;font-size:11px;font-weight:850}",
      ".m4095Check{display:grid;grid-template-columns:27px minmax(0,1fr);gap:8px;align-items:start;padding:8px 9px;border:1px solid #c6ced7;border-radius:8px;background:#f8fafc;font-size:12px;font-weight:850}.m4095Check i{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#2f8a4b;color:#fff;font-style:normal}.m4095Check.fail i{background:#b42318}.m4095Check.advisory i{background:#b57900}.m4095Check small{display:block;margin-top:2px;color:#697789;font-size:10px;font-weight:700}",
      ".m4095Notice{margin:0;padding:9px 11px;border-left:4px solid #5f7186;background:#eef2f6;color:#46576b;font-size:11px;font-weight:750;line-height:1.4}",
      ".m4095Actions{position:sticky;bottom:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 16px;border-top:1px solid #cad2dc;background:#fff}.m4095Actions button{min-height:50px}",
      "@media(max-width:600px){.m4095Metrics{grid-template-columns:1fr 1fr}.m4095Status{grid-template-columns:46px minmax(0,1fr);padding:12px}.m4095StatusIcon{width:44px;height:44px;font-size:25px}.m4095Status h2{font-size:20px}.m4095Actions{grid-template-columns:1fr}.m4095ReadinessBox{max-height:94vh}}"
    ].join("");
    document.head.appendChild(style);
  }

  function m4095EnsureModal() {
    var modal = byId("m4095ReadinessModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m4095ReadinessModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box m4095ReadinessBox">',
      '  <div class="m4095Head"><strong>Report Readiness</strong><button type="button" id="m4095ReadinessClose">Close</button></div>',
      '  <div id="m4095ReadinessBody" class="m4095Body"></div>',
      '  <div class="m4095Actions"><button type="button" id="m4095ReviewAgain">Run Review Again</button><button type="button" class="primary" id="m4095ReadinessPrimary">Close and Correct</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m4095ReadinessClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m4095ReviewAgain").addEventListener("click", function () { m4095RenderReview(modal.__documentType || "drill"); });
    byId("m4095ReadinessPrimary").addEventListener("click", function () {
      var review = modal.__review;
      if (!review || !review.ready) { modal.classList.remove("show"); return; }
      modal.classList.remove("show");
      if (review.type === "shot" && typeof window.exportPDFReport === "function") window.exportPDFReport(true);
      else if (review.type === "drill" && typeof window.downloadPDF === "function") window.downloadPDF();
    });
    return modal;
  }

  function m4095MetricHTML(label, value) {
    return '<div class="m4095Metric"><b>' + m395EscapeHTML(label) + '</b><span>' + m395EscapeHTML(value) + '</span></div>';
  }

  function m4095IssueHTML(issue, severity) {
    var shown = issue.items.slice(0, 100);
    var chips = shown.map(function (item) { return '<span>' + m395EscapeHTML(item) + '</span>'; }).join("");
    if (issue.items.length > shown.length) chips += '<span>+' + (issue.items.length - shown.length) + ' more</span>';
    return '<details class="m4095Issue ' + severity + '"' + (severity === "blocker" ? ' open' : '') + '>' +
      '<summary><span>' + m395EscapeHTML(issue.title) + '</span><span>' + issue.items.length + ' item' + (issue.items.length === 1 ? '' : 's') + '</span></summary>' +
      '<div class="m4095IssueBody">' + m395EscapeHTML(issue.detail || '') + (chips ? '<div class="m4095HoleChips">' + chips + '</div>' : '') + '</div></details>';
  }

  function m4095CheckHTML(check) {
    var advisory = !check.passed && /advisory/i.test(check.note || "");
    var className = check.passed ? "" : advisory ? " advisory" : " fail";
    return '<div class="m4095Check' + className + '"><i>' + (check.passed ? '&#10003;' : '!') + '</i><div>' + m395EscapeHTML(check.label) + (check.note ? '<small>' + m395EscapeHTML(check.note) + '</small>' : '') + '</div></div>';
  }

  function m4095RenderReview(type) {
    var modal = m4095EnsureModal();
    var review = m4095CurrentReview(type);
    modal.__review = review;
    modal.__documentType = type;
    var body = byId("m4095ReadinessBody");
    var readyText = review.advisoryCount ? review.advisoryCount + ' advisor' + (review.advisoryCount === 1 ? 'y' : 'ies') + ' remain; they do not block export.' : 'No unresolved data issues found.';
    var status = review.ready ?
      '<div class="m4095Status ready"><div class="m4095StatusIcon">&#10003;</div><div><h2>READY FOR REPORT</h2><p>' + m395EscapeHTML(readyText) + '</p></div></div>' :
      '<div class="m4095Status blocked"><div class="m4095StatusIcon">!</div><div><h2>REVIEW REQUIRED — ' + review.blockerCount + ' ISSUE' + (review.blockerCount === 1 ? '' : 'S') + '</h2><p>Correct the blocking field-data issues below, then run the review again.</p></div></div>';
    var metrics = '<div class="m4095Metrics">' +
      m4095MetricHTML('Holes reviewed', String(review.metrics.reviewed || 0)) +
      m4095MetricHTML(type === 'shot' ? 'Loaded holes' : 'Complete holes', String(review.metrics.loaded || review.metrics.complete || 0)) +
      m4095MetricHTML('Total drilled feet', m395FormatNumber(review.metrics.totalDepth || 0, 1) + ' ft') +
      m4095MetricHTML('Dirt / Bad', String(review.metrics.conditions || 0)) +
      '</div>';
    var blockers = review.blockers.length ? '<div class="m4095Section"><h3>Blocking Issues</h3><div class="m4095IssueList">' + review.blockers.map(function (issue) { return m4095IssueHTML(issue, 'blocker'); }).join('') + '</div></div>' : '';
    var advisories = review.advisories.length ? '<div class="m4095Section"><h3>Advisories</h3><div class="m4095IssueList">' + review.advisories.map(function (issue) { return m4095IssueHTML(issue, 'advisory'); }).join('') + '</div></div>' : '';
    var checks = '<div class="m4095Section"><h3>Review Checklist</h3><div class="m4095CheckList">' + review.checks.map(m4095CheckHTML).join('') + '</div></div>';
    body.innerHTML = status + metrics + blockers + advisories + checks + '<p class="m4095Notice">Report Readiness reviews recorded data only. It does not certify blast safety, field conditions, regulatory compliance, or readiness to fire.</p>';
    var primary = byId("m4095ReadinessPrimary");
    primary.textContent = review.ready ? "Download PDF" : "Close and Correct";
    return review;
  }

  function m4095OpenReportReadiness(type) {
    var resolvedType = type === "shot" || byId("shotCanvas") ? "shot" : "drill";
    m4095InjectReadinessStyles();
    var modal = m4095EnsureModal();
    m4095RenderReview(resolvedType);
    modal.classList.add("show");
  }

  window.MithrilM4095ReportReadiness = {
    analyzeDrillRows: m4095AnalyzeDrillRows,
    analyzeShotRows: m4095AnalyzeShotRows,
    currentReview: m4095CurrentReview,
    open: m4095OpenReportReadiness
  };

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
      "#m395AssignPatternModal,#m395DrillAssignPatternModal{z-index:260}",
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
    modal.className = "m406InlinePattern";
    modal.innerHTML = [
      '<div class="m406InlinePatternHead"><strong>Assign Pattern</strong><button type="button" id="m395AssignPatternClose">Close</button></div>',
      '<p id="m395AssignPatternCount" class="m395PatternHelp"></p>',
      '<label>Pattern<select id="m395AssignPatternSelect"></select></label>',
      '<div class="buttonGrid"><button type="button" class="primary" id="m395AssignPatternSave">Assign to Selection</button><button type="button" id="m395AssignPatternCancel">Cancel</button></div>'
    ].join("");
    var bar = byId("m395ShotEditBar");
    m406UpgradeEditBar(bar, "shot");
    var host = bar && bar.querySelector('[data-m406-panel="more"]');
    (host || document.body).appendChild(modal);
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
    var bar = byId("m395ShotEditBar");
    m406SetEditPanel(bar, "more");
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
    m406UpgradeEditBar(bar, "shot");
    var row = document.createElement("div");
    row.className = "m395PatternEditRow";
    row.innerHTML = '<button type="button" id="m395AssignPatternButton">Assign Pattern</button><button type="button" id="m395ShowPatternsButton">Show Pattern Colors</button>';
    var hint = byId("m395ShotEditHint");
    var host = bar.querySelector('[data-m406-panel="more"]');
    if (host) host.appendChild(row);
    else bar.insertBefore(row, hint || null);
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
    modal.className = "m406InlinePattern";
    modal.innerHTML = [
      '<div class="m406InlinePatternHead"><strong>Assign Drill Pattern</strong><button type="button" id="m395DrillAssignPatternClose">Close</button></div>',
      '<p id="m395DrillAssignPatternCount" class="m395PatternHelp"></p>',
      '<label>Pattern<select id="m395DrillAssignPatternSelect"></select></label>',
      '<div class="buttonGrid"><button type="button" class="primary" id="m395DrillAssignPatternSave">Assign to Selection</button><button type="button" id="m395DrillAssignPatternCancel">Cancel</button></div>'
    ].join("");
    var bar = byId("m395DrillEditBar");
    m406UpgradeEditBar(bar, "drill");
    var host = bar && bar.querySelector('[data-m406-panel="more"]');
    (host || document.body).appendChild(modal);
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
    var bar = byId("m395DrillEditBar");
    m406SetEditPanel(bar, "more");
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
    m406UpgradeEditBar(bar, "drill");
    var row = document.createElement("div");
    row.className = "m395PatternEditRow";
    row.innerHTML = '<button type="button" id="m395DrillAssignPatternButton">Assign Pattern</button><button type="button" id="m395DrillShowPatternsButton">Show Pattern Colors</button>';
    var hint = byId("m395DrillEditHint");
    var host = bar.querySelector('[data-m406-panel="more"]');
    if (host) host.appendChild(row);
    else bar.insertBefore(row, hint || null);
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
  // m39.6.3 physical keyboard and numpad entry
  // ---------------------------------------------------------------------------
  var M396_ENTRY_METHOD_KEY = "mithrilEntryMethodV1";
  var M396_ENTRY_TOUCH = "touch";
  var M396_ENTRY_KEYBOARD = "keyboard";
  var m396ActiveFields = { shot: "overburden", drill: "overburden" };

  function m396NormalizeEntryMethod(value) {
    return String(value || "").toLowerCase() === M396_ENTRY_KEYBOARD ? M396_ENTRY_KEYBOARD : M396_ENTRY_TOUCH;
  }

  function m396GetEntryMethod() {
    try { return m396NormalizeEntryMethod(localStorage.getItem(M396_ENTRY_METHOD_KEY)); }
    catch (error) { return M396_ENTRY_TOUCH; }
  }

  function m396KeyboardMode() {
    return m396GetEntryMethod() === M396_ENTRY_KEYBOARD;
  }

  function m396FieldIds(type) {
    return type === "drill"
      ? ["overburden", "depth"]
      : ["overburden", "depth", "stemming", "primaryLoad", "secondaryLoad", "timing"];
  }

  function m396NextFieldId(type, currentId, backwards) {
    var ids = m396FieldIds(type);
    var index = ids.indexOf(String(currentId || ""));
    if (index < 0) return ids[0];
    var step = backwards ? -1 : 1;
    return ids[(index + step + ids.length) % ids.length];
  }

  function m396EntryMethodText() {
    return m396KeyboardMode() ? "Physical Keyboard" : "Touch Keypad";
  }

  function m396HoleBox(type) {
    return type === "drill" ? byId("holeBox") : byId("holeEditorBox");
  }

  function m396HoleModal(type) {
    return byId("holeModal");
  }

  function m396HoleEditorVisible(type) {
    var modal = m396HoleModal(type);
    return !!(modal && modal.classList && modal.classList.contains("show"));
  }

  function m396InjectKeyboardStyles() {
    if (byId("mithrilKeyboardEntryM396Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilKeyboardEntryM396Styles";
    style.textContent = [
      ".m396EntryMethodButton{grid-column:1/-1}",
      ".m396KeyboardHint{margin:0 0 10px;padding:7px 10px;border:1px solid #aeb8c5;border-radius:8px;background:#f4f7fb;color:#354052;font-size:12px;font-weight:850;line-height:1.35}",
      ".m396KeyboardHint.keyboard{border-color:#1f6feb;background:#eaf3ff;color:#113f78}",
      ".m396KeyboardHint strong{font-weight:950}",
      ".m396KeyboardFocus{outline:3px solid #1f6feb!important;outline-offset:1px;caret-color:#111!important}",
      ".m396KeyboardFocus:focus{box-shadow:0 0 0 1px rgba(31,111,235,.18)}",
      "@media(max-width:430px){.m396KeyboardHint{font-size:11px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function m396EnsureIndicator(type) {
    var box = m396HoleBox(type);
    if (!box) return null;
    var id = type === "drill" ? "m396DrillKeyboardHint" : "m396ShotKeyboardHint";
    var existing = byId(id);
    if (existing) return existing;
    var head = box.querySelector(".boxHead");
    if (!head) return null;
    var hint = document.createElement("div");
    hint.id = id;
    hint.className = "m396KeyboardHint";
    if (head.nextSibling) box.insertBefore(hint, head.nextSibling);
    else box.appendChild(hint);
    return hint;
  }

  function m396UpdateIndicator(type) {
    var hint = m396EnsureIndicator(type);
    if (!hint) return;
    if (m396KeyboardMode()) {
      hint.className = "m396KeyboardHint keyboard";
      hint.innerHTML = "<strong>Keyboard Mode</strong> &nbsp; Tab = Next Field &nbsp;•&nbsp; Shift + Tab = Previous &nbsp;•&nbsp; Enter = Save + Next Hole &nbsp;•&nbsp; Ctrl + Enter = Save &amp; Close";
    } else {
      hint.className = "m396KeyboardHint";
      hint.innerHTML = "<strong>Touch Keypad Mode</strong> &nbsp; Tap a field to use the MITHRIL keypad.";
    }
  }

  function m396UpdateEntryButtons() {
    var buttons = document.querySelectorAll ? document.querySelectorAll("[data-m396-entry-method]") : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].textContent = "Entry Method: " + m396EntryMethodText();
      buttons[i].setAttribute("aria-pressed", m396KeyboardMode() ? "true" : "false");
      buttons[i].classList.toggle("primary", m396KeyboardMode());
    }
  }

  function m396HideEditorKeypad(type) {
    if (type === "drill" && typeof window.hidePad === "function") window.hidePad();
    if (type === "shot" && typeof window.hideLoadKeypad === "function") window.hideLoadKeypad();
  }

  function m396MakeFieldEditable(type, field) {
    if (!field || !m396KeyboardMode()) return;
    var ids = m396FieldIds(type);
    if (ids.indexOf(String(field.id || "")) < 0) return;
    field.removeAttribute("readonly");
    field.removeAttribute("data-temp-readonly");
    field.readOnly = false;
    field.disabled = false;
    field.tabIndex = 0;
    field.setAttribute("inputmode", (field.id === "primaryLoad" || field.id === "secondaryLoad") ? "text" : "decimal");
  }

  function m396PaintActiveField(type, id) {
    var ids = m396FieldIds(type);
    var normalized = ids.indexOf(String(id || "")) >= 0 ? String(id) : ids[0];
    m396ActiveFields[type] = normalized;
    var box = m396HoleBox(type);
    if (box) box.setAttribute("data-m396-active-field", normalized);
    for (var i = 0; i < ids.length; i += 1) {
      var field = byId(ids[i]);
      if (field) field.classList.toggle("m396KeyboardFocus", ids[i] === normalized);
    }
    return normalized;
  }

  function m396CurrentActiveFieldId(type) {
    var ids = m396FieldIds(type);
    var box = m396HoleBox(type);
    var stored = box ? String(box.getAttribute("data-m396-active-field") || "") : "";
    if (ids.indexOf(stored) >= 0) return stored;
    if (box && box.querySelector) {
      var highlighted = box.querySelector(".m396KeyboardFocus");
      if (highlighted && ids.indexOf(String(highlighted.id || "")) >= 0) return String(highlighted.id);
    }
    var memory = String(m396ActiveFields[type] || "");
    return ids.indexOf(memory) >= 0 ? memory : ids[0];
  }

  function m396ApplyFieldMode(type) {
    var keyboard = m396KeyboardMode();
    var ids = m396FieldIds(type);
    for (var i = 0; i < ids.length; i += 1) {
      var input = byId(ids[i]);
      if (!input) continue;
      input.classList.remove("m396KeyboardFocus");
      if (keyboard) {
        m396MakeFieldEditable(type, input);
      } else {
        input.readOnly = true;
        input.setAttribute("readonly", "readonly");
        input.setAttribute("inputmode", "none");
      }
    }
    if (keyboard) {
      m396HideEditorKeypad(type);
      m396PaintActiveField(type, m396CurrentActiveFieldId(type));
    }
    m396UpdateIndicator(type);
    m396UpdateEntryButtons();
  }

  function m396SetFieldSelection(field, start, end) {
    if (!field || typeof field.setSelectionRange !== "function") return;
    try { field.setSelectionRange(start, end === undefined ? start : end); } catch (error) {}
  }

  function m396FocusField(type, id, selectValue) {
    if (!m396KeyboardMode()) return;
    var activeId = m396PaintActiveField(type, id);
    var input = byId(activeId);
    if (!input) return;
    var details = input.closest ? input.closest("details") : null;
    if (details) details.open = true;
    m396MakeFieldEditable(type, input);
    m396HideEditorKeypad(type);
    try { input.focus({ preventScroll: true }); } catch (error) { try { input.focus(); } catch (ignore) {} }
    if (selectValue !== false) {
      var length = String(input.value || "").length;
      if (typeof input.select === "function") {
        try { input.select(); } catch (error2) { m396SetFieldSelection(input, 0, length); }
      } else {
        m396SetFieldSelection(input, 0, length);
      }
    }
  }

  function m396FocusFirstField(type) {
    if (!m396KeyboardMode() || !m396HoleEditorVisible(type)) return;
    m396ActiveFields[type] = m396FieldIds(type)[0];
    m396FocusField(type, m396ActiveFields[type], true);
  }

  function m396ApplyEntryMethod(type, focusCurrentEditor) {
    m396ApplyFieldMode(type);
    if (focusCurrentEditor && m396KeyboardMode() && m396HoleEditorVisible(type)) {
      window.setTimeout(function () { m396FocusFirstField(type); }, 0);
    }
  }

  function m396SetEntryMethod(mode, type) {
    var normalized = m396NormalizeEntryMethod(mode);
    try { localStorage.setItem(M396_ENTRY_METHOD_KEY, normalized); } catch (error) {}
    m396ApplyEntryMethod(type, true);
    return normalized;
  }

  function m396ToggleEntryMethod(type) {
    var next = m396KeyboardMode() ? M396_ENTRY_TOUCH : M396_ENTRY_KEYBOARD;
    m396SetEntryMethod(next, type);
  }

  function m396InstallMenuButton(type) {
    var settings = byId(type === "drill" ? "m395DrillSettings" : "m395ShotSettings");
    if (!settings) return;
    var grid = settings.querySelector(".m395ActionGrid");
    if (!grid || grid.querySelector("[data-m396-entry-method]")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "wide m396EntryMethodButton";
    button.setAttribute("data-m396-entry-method", type);
    button.title = "Touch Keypad keeps the existing mobile keypad. Physical Keyboard enables the laptop keyboard, numpad, Tab, and Enter shortcuts.";
    button.addEventListener("click", function () { m396ToggleEntryMethod(type); });
    var updateButton = grid.querySelector("#mithrilUpdateMenuButton");
    if (updateButton) grid.insertBefore(button, updateButton);
    else grid.appendChild(button);
    m396UpdateEntryButtons();
  }

  function m396InstallKeypadGuard(type) {
    if (type === "drill" && typeof window.showPad === "function" && !window.showPad.__m396KeyboardGuard) {
      var originalShowPad = window.showPad;
      var guardedShowPad = function (id) {
        if (m396KeyboardMode() && m396FieldIds(type).indexOf(String(id || "")) >= 0) {
          m396ApplyFieldMode(type);
          m396FocusField(type, id, false);
          return;
        }
        return originalShowPad.apply(this, arguments);
      };
      guardedShowPad.__m396KeyboardGuard = true;
      window.showPad = guardedShowPad;
    }
    if (type === "shot" && typeof window.showEntryKeypad === "function" && !window.showEntryKeypad.__m396KeyboardGuard) {
      var originalShowEntryKeypad = window.showEntryKeypad;
      var guardedShowEntryKeypad = function (id) {
        if (m396KeyboardMode() && m396FieldIds(type).indexOf(String(id || "")) >= 0) {
          m396ApplyFieldMode(type);
          m396FocusField(type, id, false);
          return;
        }
        return originalShowEntryKeypad.apply(this, arguments);
      };
      guardedShowEntryKeypad.__m396KeyboardGuard = true;
      window.showEntryKeypad = guardedShowEntryKeypad;
    }
  }

  function m396InstallOpenHoleFocus(type) {
    if (typeof window.openHole !== "function" || window.openHole.__m396KeyboardFocus) return;
    var originalOpenHole = window.openHole;
    var wrappedOpenHole = function () {
      var result = originalOpenHole.apply(this, arguments);
      m396UpdateIndicator(type);
      if (m396KeyboardMode()) {
        m396ActiveFields[type] = m396FieldIds(type)[0];
        window.setTimeout(function () { m396ApplyFieldMode(type); m396FocusFirstField(type); }, 35);
        window.setTimeout(function () { m396ApplyFieldMode(type); m396FocusFirstField(type); }, 260);
        window.setTimeout(function () { m396ApplyFieldMode(type); }, 520);
      } else {
        window.setTimeout(function () { m396ApplyFieldMode(type); }, 30);
      }
      return result;
    };
    wrappedOpenHole.__m396KeyboardFocus = true;
    window.openHole = wrappedOpenHole;
  }

  function m396SaveFromKeyboard(type, closeAfterSave) {
    if (type === "drill") {
      if (typeof window.saveHole === "function") return window.saveHole(!closeAfterSave);
      return;
    }
    try {
      if (typeof holeModalTouchGuardUntil !== "undefined") holeModalTouchGuardUntil = 0;
    } catch (error) {}
    if (closeAfterSave) {
      if (typeof window.saveHole === "function") return window.saveHole();
      return;
    }
    if (typeof window.saveHoleAndNext === "function") return window.saveHoleAndNext();
  }

  function m396KeyboardToken(type, fieldId, event) {
    var key = String(event && event.key !== undefined ? event.key : "");
    var code = String(event && event.code !== undefined ? event.code : "");
    if (/^[0-9]$/.test(key)) return key;
    if (key === "." || key === "Decimal" || code === "NumpadDecimal") return ".";
    var isLoad = type === "shot" && (fieldId === "primaryLoad" || fieldId === "secondaryLoad");
    if (!isLoad) return null;
    if (/^[aAdD]$/.test(key)) return key.toUpperCase();
    if (key === " " || key === "+" || key === ",") return key;
    return null;
  }

  function m396SelectionRange(field) {
    var length = String(field && field.value || "").length;
    var start = typeof field.selectionStart === "number" ? field.selectionStart : length;
    var end = typeof field.selectionEnd === "number" ? field.selectionEnd : start;
    return { start: Math.max(0, start), end: Math.max(start, end) };
  }

  function m396DispatchFieldInput(field) {
    if (!field) return;
    try { field.dispatchEvent(new Event("input", { bubbles: true })); } catch (error) {}
  }

  function m396InsertKeyboardText(field, text) {
    if (!field) return;
    var current = String(field.value || "");
    var range = m396SelectionRange(field);
    field.value = current.slice(0, range.start) + text + current.slice(range.end);
    var position = range.start + text.length;
    m396SetFieldSelection(field, position);
    m396DispatchFieldInput(field);
  }

  function m396DeleteKeyboardText(field, forward) {
    if (!field) return;
    var current = String(field.value || "");
    var range = m396SelectionRange(field);
    var start = range.start;
    var end = range.end;
    if (start === end) {
      if (forward) end = Math.min(current.length, end + 1);
      else start = Math.max(0, start - 1);
    }
    if (start === end) return;
    field.value = current.slice(0, start) + current.slice(end);
    m396SetFieldSelection(field, start);
    m396DispatchFieldInput(field);
  }

  function m396InstallReadonlyRepair(type) {
    var box = m396HoleBox(type);
    if (!box || box.getAttribute("data-m396-readonly-repair") === "true") return;
    box.setAttribute("data-m396-readonly-repair", "true");
    if (typeof MutationObserver === "function") {
      var observer = new MutationObserver(function (records) {
        if (!m396KeyboardMode() || !m396HoleEditorVisible(type)) return;
        for (var i = 0; i < records.length; i += 1) {
          var target = records[i].target;
          if (target && m396FieldIds(type).indexOf(String(target.id || "")) >= 0 && (target.readOnly || target.hasAttribute("readonly"))) {
            m396MakeFieldEditable(type, target);
          }
        }
      });
      observer.observe(box, { subtree: true, attributes: true, attributeFilter: ["readonly", "inputmode", "data-temp-readonly", "disabled"] });
    }
  }

  function m396StopOriginalFieldEvent(event) {
    if (!event) return;
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }

  function m396InstallFieldActivation(type) {
    var box = m396HoleBox(type);
    if (!box || box.getAttribute("data-m396-field-activation") === "true") return;
    box.setAttribute("data-m396-field-activation", "true");
    var ids = m396FieldIds(type);

    function fieldFromEvent(event) {
      var target = event && event.target;
      if (!target || ids.indexOf(String(target.id || "")) < 0) return null;
      return target;
    }

    function activateFromPointer(event) {
      if (!m396KeyboardMode() || !m396HoleEditorVisible(type)) return;
      var field = fieldFromEvent(event);
      if (!field) return;
      m396StopOriginalFieldEvent(event);
      m396MakeFieldEditable(type, field);
      m396PaintActiveField(type, field.id);
      m396FocusField(type, field.id, true);
      window.setTimeout(function () {
        if (m396CurrentActiveFieldId(type) === field.id && document.activeElement !== field) {
          m396FocusField(type, field.id, false);
        }
      }, 0);
    }

    ["pointerdown", "mousedown", "touchstart", "click"].forEach(function (eventName) {
      box.addEventListener(eventName, activateFromPointer, true);
    });

    // The original mobile code attaches focus handlers that immediately reopen
    // the touch keypad and make the input readonly. Stop those target handlers
    // in keyboard mode while still allowing the browser to focus the field.
    box.addEventListener("focus", function (event) {
      if (!m396KeyboardMode() || !m396HoleEditorVisible(type)) return;
      var field = fieldFromEvent(event);
      if (!field) return;
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      m396MakeFieldEditable(type, field);
      m396PaintActiveField(type, field.id);
    }, true);
  }

  function m396IsOtherInteractiveTarget(target, ids) {
    if (!target || target === document.body || target === document.documentElement) return false;
    if (ids.indexOf(String(target.id || "")) >= 0) return false;
    var tag = String(target.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function m396InstallKeyboardHandler(type) {
    var box = m396HoleBox(type);
    if (!box || box.getAttribute("data-m396-keyboard-handler") === "true") return;
    box.setAttribute("data-m396-keyboard-handler", "true");
    var ids = m396FieldIds(type);

    document.addEventListener("keydown", function (event) {
      if (!m396KeyboardMode() || !m396HoleEditorVisible(type)) return;
      var target = event.target;
      var targetId = target && target.id ? String(target.id) : "";
      var inSequence = ids.indexOf(targetId) >= 0;
      if (!inSequence && m396IsOtherInteractiveTarget(target, ids)) return;

      var highlightedId = m396CurrentActiveFieldId(type);
      var activeId = (inSequence && targetId === highlightedId) ? targetId : highlightedId;
      var field = byId(activeId);
      if (!field) return;
      m396MakeFieldEditable(type, field);
      m396PaintActiveField(type, activeId);

      if ((event.ctrlKey || event.metaKey) && String(event.key || "").toLowerCase() === "a") {
        event.preventDefault();
        event.stopPropagation();
        try { field.focus({ preventScroll: true }); } catch (focusError) { try { field.focus(); } catch (ignore) {} }
        if (typeof field.select === "function") { try { field.select(); } catch (error) {} }
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        m396FocusField(type, m396NextFieldId(type, activeId, !!event.shiftKey), true);
        return;
      }

      if (event.key === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        event.stopPropagation();
        m396SaveFromKeyboard(type, !!(event.ctrlKey || event.metaKey));
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        var token = m396KeyboardToken(type, activeId, event);
        if (token !== null) {
          event.preventDefault();
          event.stopPropagation();
          try { field.focus({ preventScroll: true }); } catch (focusError2) { try { field.focus(); } catch (ignore2) {} }
          m396InsertKeyboardText(field, token);
          return;
        }
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          event.stopPropagation();
          m396DeleteKeyboardText(field, event.key === "Delete");
        }
      }
    }, true);
  }

  function installPhysicalKeyboardEntry(type) {
    var box = m396HoleBox(type);
    if (!box || box.getAttribute("data-m396-entry-installed") === "true") return;
    box.setAttribute("data-m396-entry-installed", "true");
    m396InjectKeyboardStyles();
    m396EnsureIndicator(type);
    m396InstallMenuButton(type);
    m396InstallKeypadGuard(type);
    m396InstallOpenHoleFocus(type);
    m396InstallReadonlyRepair(type);
    m396InstallFieldActivation(type);
    m396InstallKeyboardHandler(type);
    m396ApplyEntryMethod(type, false);
  }

  window.MithrilM396KeyboardEntry = {
    normalizeEntryMethod: m396NormalizeEntryMethod,
    getEntryMethod: m396GetEntryMethod,
    fieldIds: m396FieldIds,
    nextFieldId: m396NextFieldId,
    keyboardToken: m396KeyboardToken,
    insertKeyboardText: m396InsertKeyboardText,
    deleteKeyboardText: m396DeleteKeyboardText,
    setEntryMethod: m396SetEntryMethod,
    focusField: m396FocusField,
    activeFields: m396ActiveFields,
    installForTest: installPhysicalKeyboardEntry
  };

  // ---------------------------------------------------------------------------
  // m40.8 adaptive field entry and shared editor presentation
  // ---------------------------------------------------------------------------

  function m408FieldLabel(id) {
    return {
      overburden: "Overburden",
      depth: "Depth",
      stemming: "Stemming",
      primaryLoad: "Primary Load",
      secondaryLoad: "Secondary Load",
      timing: "Timing"
    }[String(id || "")] || "Field";
  }

  function m408InjectEntryStyles() {
    if (byId("mithrilAdaptiveEntryM408Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilAdaptiveEntryM408Styles";
    style.textContent = [
      "#holeBox,#holeEditorBox{--m408-primary:#1f6feb;--m408-border:#c8d0da}",
      ".m408EntryContext{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 10px;padding:8px 10px;border:1px solid #b8c6d8;border-radius:9px;background:#f6f9fd;color:#243247;font-size:12px;font-weight:850}",
      ".m408EntryContext strong{font-size:15px;font-weight:950;color:#16253a}.m408EntryContext span:last-child{text-align:right;color:#51647c}",
      ".m408FieldActions{position:sticky;bottom:0;z-index:8;margin:10px -4px -4px!important;padding:10px 4px 4px;background:linear-gradient(to bottom,rgba(255,255,255,.72),#fff 24%);border-top:1px solid var(--m408-border)}",
      ".m408FieldActions button{min-height:48px}.m408FieldActions .m408SaveNext{background:var(--m408-primary)!important;border-color:var(--m408-primary)!important;color:#fff!important}.m408FieldActions .m408SaveOnly{background:#eef3f8!important;border-color:#9aa8b7!important;color:#243247!important}",
      "#numberPad.show,#loadKeypad.show{overscroll-behavior:contain;touch-action:manipulation}",
      "#numberPad .padTitle,#loadKeypad .loadKeypadTitle{color:#526277;font-size:11px;text-transform:uppercase;letter-spacing:.06em}",
      "@media (pointer:coarse) and (orientation:portrait){#holeBox.padOpen .m408FieldActions,#holeEditorBox.keypadOpen .m408FieldActions{position:static!important;bottom:auto!important}}",
      "@media (pointer:coarse) and (orientation:landscape) and (min-width:700px){",
      " #numberPad.show,#loadKeypad.show{left:auto!important;right:8px!important;top:max(74px,env(safe-area-inset-top))!important;bottom:8px!important;width:min(360px,42vw)!important;overflow:auto!important}",
      " #holeBox.padOpen,#holeEditorBox.keypadOpen{width:calc(100vw - 390px)!important;max-width:760px!important;margin-left:12px!important;margin-right:auto!important;padding-bottom:14px!important}",
      " #holeBox.padOpen .m408FieldActions,#holeEditorBox.keypadOpen .m408FieldActions{bottom:0}",
      " #numberPad .padGrid button,#loadKeypad .loadKeypadGrid button{min-height:42px}",
      "}",
      "@media (max-width:520px){.m408EntryContext{align-items:flex-start;flex-direction:column;gap:2px}.m408EntryContext span:last-child{text-align:left}.m408FieldActions{grid-template-columns:1fr 1fr!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function m408UpdateEntryContext(type, fieldId) {
    var context = byId(type === "drill" ? "m408DrillEntryContext" : "m408ShotEntryContext");
    if (!context) return;
    var title = byId("holeTitle");
    var hole = title ? String(title.textContent || "Hole") : "Hole";
    var active = String(fieldId || (m396CurrentActiveFieldId ? m396CurrentActiveFieldId(type) : "overburden"));
    context.innerHTML = "<strong>" + hole.replace(/</g, "&lt;") + "</strong><span>Current field: " + m408FieldLabel(active) + "</span>";
  }

  function m408WrapKeypad(type) {
    var name = type === "drill" ? "showPad" : "showEntryKeypad";
    var original = window[name];
    if (typeof original !== "function" || original.__m408EntryContext) return;
    var wrapped = function (id) {
      m408UpdateEntryContext(type, id);
      return original.apply(this, arguments);
    };
    wrapped.__m408EntryContext = true;
    window[name] = wrapped;
  }

  function installAdaptiveFieldEntry(type) {
    var box = m396HoleBox(type);
    if (!box || box.getAttribute("data-m408-adaptive-entry") === "true") return;
    box.setAttribute("data-m408-adaptive-entry", "true");
    m408InjectEntryStyles();
    var head = box.querySelector(".boxHead");
    var context = document.createElement("div");
    context.id = type === "drill" ? "m408DrillEntryContext" : "m408ShotEntryContext";
    context.className = "m408EntryContext";
    context.setAttribute("aria-live", "polite");
    if (head && head.nextSibling) box.insertBefore(context, head.nextSibling);
    else if (head) box.appendChild(context);

    var actions = box.querySelector(".buttonGrid");
    if (actions) {
      actions.classList.add("m408FieldActions");
      var buttons = actions.querySelectorAll("button");
      for (var i = 0; i < buttons.length; i += 1) {
        var action = String(buttons[i].getAttribute("onclick") || "");
        if (/saveHoleAndNext|saveHole\(true\)/.test(action)) buttons[i].classList.add("m408SaveNext", "primary");
        else if (/saveHole\(\)|saveHole\(false\)/.test(action)) {
          buttons[i].classList.add("m408SaveOnly");
          buttons[i].classList.remove("primary");
        }
      }
    }

    var fields = m396FieldIds(type);
    fields.forEach(function (id) {
      var input = byId(id);
      if (!input) return;
      ["pointerdown", "focus"].forEach(function (eventName) {
        input.addEventListener(eventName, function () { m408UpdateEntryContext(type, id); }, true);
      });
    });
    var title = byId("holeTitle");
    if (title && typeof MutationObserver === "function") {
      new MutationObserver(function () { m408UpdateEntryContext(type); }).observe(title, { childList: true, characterData: true, subtree: true });
    }
    m408WrapKeypad(type);
    m408UpdateEntryContext(type, fields[0]);
  }


  // ---------------------------------------------------------------------------
  // m39.7 Shot Diagram Timing Sequence Mode
  // ---------------------------------------------------------------------------
  var M397_TIMING_STORAGE_KEY = "mithrilCanvasTimingSequenceM397";
  var m397TimingState = null;
  var m397TimingUndoHistory = [];
  var m397TimingPointerStarts = {};
  var m397TimingTouchStart = null;
  var m397TimingOrigin = null;
  var m397TimingModalPurpose = "start";
  var m397TimingQuickWasEnabled = false;

  function m397FiniteNumber(value) {
    var text = String(value == null ? "" : value).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    var number = Number(text);
    return isFinite(number) ? number : null;
  }

  function m397NormalizeDirection(value) {
    var direction = String(value || "ltr").toLowerCase();
    return /^(?:ltr|rtl|ttb|btt)$/.test(direction) ? direction : "ltr";
  }

  function m397DirectionLabel(value) {
    var direction = m397NormalizeDirection(value);
    if (direction === "rtl") return "R → L";
    if (direction === "ttb") return "T ↓ B";
    if (direction === "btt") return "B ↑ T";
    return "L → R";
  }

  function m397VerticalDirection(value) {
    var direction = m397NormalizeDirection(value);
    return direction === "ttb" || direction === "btt";
  }

  function m397NormalizeTimingState(raw) {
    var source = raw || {};
    var start = m397FiniteNumber(source.start);
    var interval = m397FiniteNumber(source.interval);
    var next = m397FiniteNumber(source.next);
    if (start === null || start < 0) start = 0;
    if (interval === null || interval <= 0) interval = 25;
    if (next === null || next < 0) next = start;
    return {
      start: start,
      interval: interval,
      next: next,
      direction: m397NormalizeDirection(source.direction),
      overwrite: String(source.overwrite || "blank").toLowerCase() === "overwrite" ? "overwrite" : "blank",
      active: source.active === true || String(source.active || "").toLowerCase() === "true"
    };
  }

  function m397LoadTimingState() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(M397_TIMING_STORAGE_KEY) || "null"); } catch (error) {}
    var headerSaved = null;
    try { if (typeof headerData !== "undefined" && headerData) headerSaved = headerData.TimingSequence; } catch (error2) {}
    return m397NormalizeTimingState(headerSaved || saved || {});
  }

  function m397BackupTimingState() {
    var state = m397NormalizeTimingState(m397TimingState || {});
    return {
      start: state.start,
      interval: state.interval,
      next: state.next,
      direction: state.direction,
      overwrite: state.overwrite,
      active: state.active
    };
  }

  function m397PersistTimingState() {
    m397TimingState = m397NormalizeTimingState(m397TimingState || {});
    try { localStorage.setItem(M397_TIMING_STORAGE_KEY, JSON.stringify(m397TimingState)); } catch (error) {}
    try {
      if (typeof headerData !== "undefined" && headerData) {
        headerData.TimingSequence = m397BackupTimingState();
        localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(headerData));
      }
    } catch (error2) {}
    m397UpdateTimingUI();
  }

  function m397RestoreTimingState(state) {
    m397TimingOrigin = null;
    m397TimingState = m397NormalizeTimingState(state || {});
    m397PersistTimingState();
    try { if (typeof draw === "function") draw(); } catch (error) {}
  }

  function m397FormatTiming(value) {
    var number = Number(value);
    if (!isFinite(number)) return "";
    var rounded = Math.round(number * 1000) / 1000;
    return String(rounded);
  }

  function m397SequenceValues(start, interval, count) {
    var values = [];
    var first = Number(start);
    var step = Number(interval);
    for (var i = 0; i < Number(count || 0); i += 1) values.push(first + step * i);
    return values;
  }

  function m397TimingRecordEligible(record) {
    if (!record) return false;
    var bad = record.BadHole === true || String(record.BadHole || "").toLowerCase() === "yes";
    var dirt = record.DirtHole === true || String(record.DirtHole || "").toLowerCase() === "yes";
    return !bad && !dirt;
  }

  function m397TimingLocationLabel(location) {
    var multiPage = typeof getPageNumbers === "function" && getPageNumbers().length > 1;
    return (multiPage ? "P" + Number(location.pageNum) + " " : "") + String(location.holeId);
  }

  function m397RecordAt(location) {
    var page = pagesData && pagesData[String(location.pageNum)];
    return page ? page[String(location.holeId)] : null;
  }

  function m397TimingRangeDetails(origin, endpoint) {
    var originGlobal = shotLocationToGlobal(origin.pageNum, origin.holeId);
    var endpointGlobal = shotLocationToGlobal(endpoint.pageNum, endpoint.holeId);
    var sameRow = originGlobal.row === endpointGlobal.row;
    var sameColumn = originGlobal.col === endpointGlobal.col;
    if (!sameRow && !sameColumn) {
      return {
        valid: false,
        message: "Timing fill must remain within the origin hole's row or column."
      };
    }

    var rowStep = sameColumn ? (endpointGlobal.row >= originGlobal.row ? 1 : -1) : 0;
    var columnStep = sameRow ? (endpointGlobal.col >= originGlobal.col ? 1 : -1) : 0;
    var direction = sameRow ? (columnStep < 0 ? "rtl" : "ltr") : (rowStep < 0 ? "btt" : "ttb");
    var distance = Math.max(
      Math.abs(endpointGlobal.row - originGlobal.row),
      Math.abs(endpointGlobal.col - originGlobal.col)
    );
    var locations = [];

    for (var step = 0; step <= distance; step += 1) {
      var globalRow = originGlobal.row + rowStep * step;
      var globalColumn = originGlobal.col + columnStep * step;
      var grid = shotGlobalToGrid(globalRow, globalColumn);
      var pageNum = shotFindPageAtGrid(grid.gx, grid.gy);
      if (pageNum === null) continue;
      var location = { pageNum: Number(pageNum), holeId: String(holeID(grid.row, grid.col)) };
      if (m397RecordAt(location)) locations.push(location);
    }

    return { valid: true, direction: direction, locations: locations };
  }

  function m397TimingSortLocations(locations, direction) {
    var dir = m397NormalizeDirection(direction);
    return (locations || []).slice().sort(function (a, b) {
      var ga = shotLocationToGlobal(a.pageNum, a.holeId);
      var gb = shotLocationToGlobal(b.pageNum, b.holeId);
      if (m397VerticalDirection(dir)) {
        if (ga.col !== gb.col) return ga.col - gb.col;
        return dir === "btt" ? gb.row - ga.row : ga.row - gb.row;
      }
      if (ga.row !== gb.row) return ga.row - gb.row;
      return dir === "rtl" ? gb.col - ga.col : ga.col - gb.col;
    });
  }

  function m397TimingRowLocations(hit) {
    var data = pagesData[String(hit.pageNum)] || {};
    var target = parseHoleID(hit.holeId);
    var locations = [];
    Object.keys(data).forEach(function (holeId) {
      var record = data[holeId];
      var pos = parseHoleID(holeId);
      if (pos.row === target.row && m397TimingRecordEligible(record)) locations.push({ pageNum: Number(hit.pageNum), holeId: String(holeId) });
    });
    return m397TimingSortLocations(locations, m397TimingState.direction);
  }

  function m397TimingColumnLocations(hit) {
    var data = pagesData[String(hit.pageNum)] || {};
    var target = parseHoleID(hit.holeId);
    var locations = [];
    Object.keys(data).forEach(function (holeId) {
      var record = data[holeId];
      var pos = parseHoleID(holeId);
      if (pos.col === target.col && m397TimingRecordEligible(record)) locations.push({ pageNum: Number(hit.pageNum), holeId: String(holeId) });
    });
    return m397TimingSortLocations(locations, m397TimingState.direction);
  }

  function m397TimingSelectedLocations() {
    var selected = typeof shotEditSelectionList === "function" ? shotEditSelectionList() : [];
    var eligible = [];
    for (var i = 0; i < selected.length; i += 1) {
      if (m397TimingRecordEligible(m397RecordAt(selected[i]))) eligible.push({ pageNum: Number(selected[i].pageNum), holeId: String(selected[i].holeId) });
    }
    return m397TimingSortLocations(eligible, m397TimingState.direction);
  }

  function m397PersistTimingPages() {
    try {
      if (typeof currentPage !== "undefined" && pagesData[String(currentPage)]) holeData = pagesData[String(currentPage)];
    } catch (error) {}
    try { if (typeof saveData === "function") saveData(); } catch (error2) {}
    try { if (typeof markDirty === "function") markDirty(); } catch (error3) {}
    try { if (typeof draw === "function") draw(); } catch (error4) {}
  }

  function m397PushTimingUndo(label, changes, previousNext) {
    m397TimingUndoHistory.push({
      label: String(label || "timing fill"),
      changes: deepClone(changes || []),
      previousNext: Number(previousNext)
    });
    if (m397TimingUndoHistory.length > 20) m397TimingUndoHistory.shift();
    m397UpdateTimingUI();
  }

  function m397UndoLastTiming() {
    if (!m397TimingUndoHistory.length) {
      m397SetTimingHint("Nothing to undo yet.");
      return;
    }
    var undo = m397TimingUndoHistory.pop();
    for (var i = 0; i < undo.changes.length; i += 1) {
      var change = undo.changes[i];
      if (!pagesData[String(change.pageNum)]) pagesData[String(change.pageNum)] = {};
      if (change.existed) pagesData[String(change.pageNum)][change.holeId] = deepClone(change.record);
      else delete pagesData[String(change.pageNum)][change.holeId];
    }
    m397TimingState.next = undo.previousNext;
    m397PersistTimingState();
    m397PersistTimingPages();
    m397SetTimingHint("Undid: " + undo.label + ".");
  }

  function m397SetTimingHint(message) {
    var hint = byId("m397TimingHint");
    if (hint) hint.textContent = message || "";
  }

  function m397ApplyTimingLocations(locations, label, groupFill, useShotUndo, direction) {
    var fillDirection = m397NormalizeDirection(direction || m397TimingState.direction);
    var ordered = m397TimingSortLocations(locations || [], fillDirection);
    if (!ordered.length) {
      m397SetTimingHint("No eligible saved holes were found. Dirt and bad holes are skipped.");
      if (typeof shotEditSetHint === "function" && typeof shotEditMode !== "undefined" && shotEditMode) shotEditSetHint("No eligible saved holes were found for timing.");
      return { assigned: 0, skippedExisting: 0, skippedIneligible: 0 };
    }

    var previousNext = Number(m397TimingState.next);
    var nextValue = previousNext;
    var changes = [];
    var assigned = 0;
    var skippedExisting = 0;
    var skippedIneligible = 0;

    if (useShotUndo && typeof shotPushUndo === "function") shotPushUndo(label || "fill timing sequence");

    for (var i = 0; i < ordered.length; i += 1) {
      var location = ordered[i];
      var record = m397RecordAt(location);
      if (!m397TimingRecordEligible(record)) {
        skippedIneligible += 1;
        continue;
      }
      var existing = String(record.Timing == null ? "" : record.Timing).trim();
      if (existing && m397TimingState.overwrite !== "overwrite") {
        skippedExisting += 1;
        if (groupFill) nextValue += Number(m397TimingState.interval);
        continue;
      }
      changes.push({ pageNum: Number(location.pageNum), holeId: String(location.holeId), existed: true, record: deepClone(record) });
      record.Timing = m397FormatTiming(nextValue);
      record.PageNumber = Number(location.pageNum);
      record.HoleID = String(location.holeId);
      record.Timestamp = new Date().toLocaleString();
      assigned += 1;
      nextValue += Number(m397TimingState.interval);
    }

    if (!assigned) {
      if (useShotUndo && typeof shotEditUndoHistory !== "undefined" && shotEditUndoHistory.length) shotEditUndoHistory.pop();
      m397SetTimingHint(skippedExisting ? "No timings changed because the eligible holes already had timing. Change Existing Timing to Overwrite or set a different row start." : "No eligible holes were changed.");
      if (typeof shotEditSetHint === "function" && typeof shotEditMode !== "undefined" && shotEditMode) shotEditSetHint("No timings changed.");
      return { assigned: 0, skippedExisting: skippedExisting, skippedIneligible: skippedIneligible };
    }

    if (!useShotUndo) m397PushTimingUndo(label || "timing fill", changes, previousNext);
    m397TimingState.next = nextValue;
    m397PersistTimingState();
    m397PersistTimingPages();

    var message = "Assigned " + assigned + " timing value" + (assigned === 1 ? "" : "s") + ". Next: " + m397FormatTiming(m397TimingState.next) + " ms.";
    if (skippedExisting) message += " Skipped " + skippedExisting + " existing timing" + (skippedExisting === 1 ? "" : "s") + ".";
    if (typeof shotEditSetHint === "function" && typeof shotEditMode !== "undefined" && shotEditMode) shotEditSetHint(message);
    m397SetTimingHint(message);
    return { assigned: assigned, skippedExisting: skippedExisting, skippedIneligible: skippedIneligible };
  }

  function m397FillSingleTiming(hit) {
    var record = m397RecordAt(hit);
    if (!record) {
      m397SetTimingHint("Hole " + m397TimingLocationLabel(hit) + " has no saved data. Timing Fill only applies to saved holes.");
      return;
    }
    if (!m397TimingRecordEligible(record)) {
      m397SetTimingHint("Hole " + m397TimingLocationLabel(hit) + " is marked dirt or bad and was skipped.");
      return;
    }
    if (String(record.Timing || "").trim() && m397TimingState.overwrite !== "overwrite") {
      m397SetTimingHint("Hole " + m397TimingLocationLabel(hit) + " already has timing. It was not changed and Next Time did not advance.");
      return;
    }
    m397ApplyTimingLocations([hit], "timed " + m397TimingLocationLabel(hit), false, false);
  }

  function m397ClearTimingOrigin(message) {
    m397TimingOrigin = null;
    if (message) m397SetTimingHint(message);
    try { if (typeof draw === "function") draw(); } catch (error) {}
    m397UpdateTimingUI();
  }

  function m397SetTimingOrigin(hit) {
    var record = m397RecordAt(hit);
    if (!record) {
      m397SetTimingHint("Hole " + m397TimingLocationLabel(hit) + " has no saved data. Choose a saved loaded hole as the origin.");
      return false;
    }
    if (!m397TimingRecordEligible(record)) {
      m397SetTimingHint("Hole " + m397TimingLocationLabel(hit) + " is marked dirt or bad. Choose a loaded hole as the origin.");
      return false;
    }
    m397TimingOrigin = { pageNum: Number(hit.pageNum), holeId: String(hit.holeId) };
    m397SetTimingHint("Origin " + m397TimingLocationLabel(m397TimingOrigin) + " selected. Tap the ending hole in the same row or column.");
    try { if (typeof draw === "function") draw(); } catch (error) {}
    m397UpdateTimingUI();
    return true;
  }

  function m397HandleTimingTap(hit) {
    if (!m397TimingOrigin) {
      m397SetTimingOrigin(hit);
      return;
    }

    var endpointRecord = m397RecordAt(hit);
    if (!endpointRecord) {
      m397SetTimingHint("Hole " + m397TimingLocationLabel(hit) + " has no saved data. Choose a saved ending hole.");
      return;
    }

    var origin = { pageNum: Number(m397TimingOrigin.pageNum), holeId: String(m397TimingOrigin.holeId) };
    var range = m397TimingRangeDetails(origin, hit);
    if (!range.valid) {
      m397SetTimingHint(range.message + " Origin " + m397TimingLocationLabel(origin) + " remains selected.");
      alert(range.message);
      return;
    }

    m397TimingState.direction = range.direction;
    var label = "filled " + m397TimingLocationLabel(origin) + " to " + m397TimingLocationLabel(hit);
    var result = m397ApplyTimingLocations(range.locations, label, true, false, range.direction);
    m397TimingOrigin = null;
    try { if (typeof draw === "function") draw(); } catch (error) {}
    m397UpdateTimingUI();
    return result;
  }

  function m397FillTimingRow(hit) {
    var locations = m397TimingRowLocations(hit);
    if (!locations.length) {
      m397SetTimingHint("That row has no eligible saved holes.");
      return;
    }
    var rowNumber = parseHoleID(hit.holeId).row;
    var rowLabel = rowNumber >= 1 && rowNumber <= 26 ? String.fromCharCode(64 + rowNumber) : String(rowNumber);
    m397ApplyTimingLocations(locations, "filled row " + rowLabel, true, false);
  }

  function m397FillTimingColumn(hit) {
    var locations = m397TimingColumnLocations(hit);
    if (!locations.length) {
      m397SetTimingHint("That column has no eligible saved holes.");
      return;
    }
    var columnNumber = parseHoleID(hit.holeId).col + 1;
    m397ApplyTimingLocations(locations, "filled column " + columnNumber, true, false);
  }

  function m397FillTimingDirectionGroup(hit) {
    if (m397VerticalDirection(m397TimingState.direction)) m397FillTimingColumn(hit);
    else m397FillTimingRow(hit);
  }

  function m397FillTimingSelection() {
    var locations = m397TimingSelectedLocations();
    if (!locations.length) {
      if (typeof shotEditSetHint === "function") shotEditSetHint("Select at least one eligible saved hole first.");
      return;
    }
    m397ApplyTimingLocations(locations, "fill timing sequence", true, true);
  }

  function m397DrawTimingOriginOverlay() {
    if (!m397TimingState || !m397TimingState.active || !m397TimingOrigin || !ctx || !view) return;
    var pos = parseHoleID(m397TimingOrigin.holeId);
    if (!pos) return;
    var rect = holeRect(pos.row, pos.col);
    var page = pageOrigin(m397TimingOrigin.pageNum);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    ctx.translate(page.x, page.y);
    ctx.fillStyle = "rgba(255,193,7,.24)";
    ctx.strokeStyle = "#d00000";
    ctx.lineWidth = Math.max(4, 6 / Math.max(.25, view.scale));
    ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
    ctx.restore();
  }

  function m397EnsureTimingStyles() {
    if (byId("mithrilTimingM397Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilTimingM397Styles";
    style.textContent = [
      "#m397TimingModal{z-index:280}",
      ".m397TimingBar{display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:247;background:rgba(255,255,255,.985);border:2px solid #d00000;border-radius:13px;padding:8px;box-shadow:0 6px 22px rgba(0,0,0,.42);gap:7px}",
      ".m397TimingBar.show{display:grid}",
      ".m397TimingHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}",
      ".m397TimingTitle{font-size:14px;font-weight:950;color:#9c0000}",
      ".m397TimingStatus{font-size:12px;font-weight:850;color:#333;margin-top:2px}",
      ".m397TimingStats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}",
      ".m397TimingStat{border:1px solid #c7c7c7;border-radius:8px;background:#f8f8f8;padding:6px;text-align:center}",
      ".m397TimingStat b{display:block;font-size:10px;color:#666;text-transform:uppercase}",
      ".m397TimingStat span{display:block;font-size:18px;font-weight:950;color:#111;margin-top:2px}",
      ".m397TimingActions{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}",
      ".m397TimingActions button{min-height:43px;padding:5px;font-size:12px}",
      ".m397TimingDone{background:#1f6feb;color:#fff;border-color:#1f6feb}",
      ".m397TimingHint{min-height:17px;font-size:11px;line-height:1.25;font-weight:800;color:#444}",
      ".m397TimingHelp{font-size:13px;font-weight:750;line-height:1.4;color:#444;margin:0 0 12px}",
      ".m397TimingEditRow{display:grid;grid-template-columns:1fr 1fr;gap:6px}",
      "@media(max-width:650px){.m397TimingActions{grid-template-columns:repeat(3,1fr)}.m397TimingStats{grid-template-columns:repeat(3,1fr)}.m397TimingActions button{font-size:11px}.m397TimingStat span{font-size:16px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function m397EnsureTimingModal() {
    var modal = byId("m397TimingModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "m397TimingModal";
    modal.className = "modal";
    modal.innerHTML = [
      '<div class="box">',
      '  <div class="boxHead"><span id="m397TimingModalTitle">Timing Sequence</span><button type="button" id="m397TimingClose">Close</button></div>',
      '  <p class="m397TimingHelp">Set the first timing value and interval. Then tap the origin hole and the ending hole. MITHRIL will fill in the direction you tap.</p>',
      '  <div class="formGrid">',
      '    <label>Starting Time (ms)<input id="m397TimingStart" type="number" min="0" step="1" inputmode="decimal"></label>',
      '    <label>Interval (ms)<input id="m397TimingInterval" type="number" min="0.001" step="1" inputmode="decimal"></label>',
      '    <label>Existing Timing<select id="m397TimingOverwrite"><option value="blank">Keep existing timing</option><option value="overwrite">Overwrite existing timing</option></select></label>',
      '  </div>',
      '  <div class="buttonGrid"><button type="button" class="primary" id="m397TimingActivate">Activate Timing Fill</button><button type="button" id="m397TimingCancel">Cancel</button></div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m397TimingClose").addEventListener("click", m397CloseTimingModal);
    byId("m397TimingCancel").addEventListener("click", m397CloseTimingModal);
    byId("m397TimingActivate").addEventListener("click", m397ActivateTimingFromModal);
    return modal;
  }

  function m397OpenTimingModal(purpose) {
    m397EnsureTimingModal();
    m397TimingModalPurpose = purpose || "start";
    var startValue = m397TimingModalPurpose === "row" ? m397TimingState.next : m397TimingState.start;
    byId("m397TimingModalTitle").textContent = m397TimingModalPurpose === "row" ? "Set Next Starting Time" : "Timing Sequence";
    byId("m397TimingStart").value = m397FormatTiming(startValue);
    byId("m397TimingInterval").value = m397FormatTiming(m397TimingState.interval);
    byId("m397TimingOverwrite").value = m397TimingState.overwrite;
    byId("m397TimingModal").classList.add("show");
    window.setTimeout(function () {
      var input = byId("m397TimingStart");
      if (input) { try { input.focus(); input.select(); } catch (error) {} }
    }, 50);
  }

  function m397CloseTimingModal() {
    var modal = byId("m397TimingModal");
    if (modal) modal.classList.remove("show");
  }

  function m397PauseQuickFill() {
    if (m397TimingState.active) return;
    try {
      if (typeof quickEntry !== "undefined") {
        m397TimingQuickWasEnabled = !!quickEntry.enabled;
        quickEntry.enabled = false;
        localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
        if (typeof updateSingleFillBar === "function") updateSingleFillBar();
      }
    } catch (error) {}
  }

  function m397ResumeQuickFill() {
    try {
      if (typeof quickEntry !== "undefined") {
        quickEntry.enabled = !!m397TimingQuickWasEnabled;
        localStorage.setItem("mithrilCanvasQuickEntryM06", JSON.stringify(quickEntry));
        if (typeof updateSingleFillBar === "function") updateSingleFillBar();
      }
    } catch (error) {}
    m397TimingQuickWasEnabled = false;
  }

  function m397ActivateTimingFromModal() {
    var start = m397FiniteNumber(byId("m397TimingStart").value);
    var interval = m397FiniteNumber(byId("m397TimingInterval").value);
    if (start === null || start < 0) { alert("Enter a starting time of 0 or greater."); return; }
    if (interval === null || interval <= 0) { alert("Enter an interval greater than 0."); return; }
    m397PauseQuickFill();
    m397TimingState.start = start;
    m397TimingState.next = start;
    m397TimingState.interval = interval;
    m397TimingState.overwrite = byId("m397TimingOverwrite").value === "overwrite" ? "overwrite" : "blank";
    m397TimingState.active = true;
    m397TimingOrigin = null;
    m397PersistTimingState();
    m397CloseTimingModal();
    m397SetTimingHint("Tap the origin hole, then tap the ending hole in the same row or column.");
    try { if (typeof draw === "function") draw(); } catch (error) {}
    m397UpdateTimingUI();
  }

  function m397FinishTimingMode() {
    m397TimingState.active = false;
    m397TimingOrigin = null;
    m397PersistTimingState();
    m397ResumeQuickFill();
    m397SetTimingHint("");
    try { if (typeof draw === "function") draw(); } catch (error) {}
  }

  function m397AdjustNext(multiplier) {
    var next = Number(m397TimingState.next) + Number(multiplier) * Number(m397TimingState.interval);
    m397TimingState.next = Math.max(0, next);
    m397PersistTimingState();
    m397SetTimingHint("Next Time set to " + m397FormatTiming(m397TimingState.next) + " ms.");
  }

  function m397ResetNextToStart() {
    m397TimingState.next = Number(m397TimingState.start);
    m397PersistTimingState();
    m397SetTimingHint("Next Time reset to " + m397FormatTiming(m397TimingState.next) + " ms.");
  }

  function m397EnsureTimingBar() {
    var bar = byId("m397TimingBar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "m397TimingBar";
    bar.className = "m397TimingBar";
    bar.innerHTML = [
      '<div class="m397TimingHead"><div><div class="m397TimingTitle">TIMING FILL ACTIVE</div><div class="m397TimingStatus">Tap origin → tap endpoint in the same row or column</div></div><button type="button" class="m397TimingDone" id="m397TimingDone">Done</button></div>',
      '<div class="m397TimingStats">',
      '  <div class="m397TimingStat"><b>Next</b><span id="m397TimingNextValue">0 ms</span></div>',
      '  <div class="m397TimingStat"><b>Interval</b><span id="m397TimingIntervalValue">25 ms</span></div>',
      '  <div class="m397TimingStat"><b>Origin</b><span id="m397TimingOriginValue">Not set</span></div>',
      '</div>',
      '<div class="m397TimingActions">',
      '  <button type="button" id="m397TimingSetRow">Set Starting Time</button>',
      '  <button type="button" id="m397TimingBack">− Interval</button>',
      '  <button type="button" id="m397TimingAdvance">+ Interval</button>',
      '  <button type="button" id="m397TimingReset">Reset to Start</button>',
      '  <button type="button" id="m397TimingUndo">Undo Timing</button>',
      '  <button type="button" id="m397TimingClearOrigin">Clear Origin</button>',
      '</div>',
      '<div id="m397TimingHint" class="m397TimingHint">Tap the origin hole, then tap the ending hole.</div>'
    ].join("");
    document.body.appendChild(bar);
    byId("m397TimingDone").addEventListener("click", m397FinishTimingMode);
    byId("m397TimingSetRow").addEventListener("click", function () { m397OpenTimingModal("row"); });
    byId("m397TimingBack").addEventListener("click", function () { m397AdjustNext(-1); });
    byId("m397TimingAdvance").addEventListener("click", function () { m397AdjustNext(1); });
    byId("m397TimingReset").addEventListener("click", m397ResetNextToStart);
    byId("m397TimingUndo").addEventListener("click", m397UndoLastTiming);
    byId("m397TimingClearOrigin").addEventListener("click", function () { m397ClearTimingOrigin("Origin cleared. Tap a new origin hole."); });
    return bar;
  }

  function m397UpdateTimingMenuButton() {
    var button = byId("m397TimingMenuButton");
    if (button) button.textContent = m397TimingState && m397TimingState.active ? "Timing Sequence — ACTIVE" : "Timing Sequence";
  }

  function m397UpdateTimingUI() {
    if (!m397TimingState) return;
    var bar = byId("m397TimingBar");
    var editing = typeof shotEditMode !== "undefined" && shotEditMode;
    if (bar) bar.classList.toggle("show", !!m397TimingState.active && !editing);
    var next = byId("m397TimingNextValue");
    var interval = byId("m397TimingIntervalValue");
    var origin = byId("m397TimingOriginValue");
    var undo = byId("m397TimingUndo");
    var clearOrigin = byId("m397TimingClearOrigin");
    if (next) next.textContent = m397FormatTiming(m397TimingState.next) + " ms";
    if (interval) interval.textContent = m397FormatTiming(m397TimingState.interval) + " ms";
    if (origin) origin.textContent = m397TimingOrigin ? m397TimingLocationLabel(m397TimingOrigin) : "Not set";
    if (undo) undo.disabled = !m397TimingUndoHistory.length;
    if (clearOrigin) clearOrigin.disabled = !m397TimingOrigin;
    m397UpdateTimingMenuButton();
    m397RefreshTimingEditButtons();
  }

  function m397AugmentShotMenu() {
    var menu = byId("menuModal");
    if (!menu || byId("m397TimingMenuButton")) return;
    var edit = menu.querySelector('[data-m395-action="editHoles"]');
    if (!edit || !edit.parentNode) return;
    var button = document.createElement("button");
    button.id = "m397TimingMenuButton";
    button.type = "button";
    button.textContent = "Timing Sequence";
    button.addEventListener("click", function () { closeMenu(); m397OpenTimingModal("start"); });
    edit.parentNode.insertBefore(button, edit.nextSibling);
    m397UpdateTimingMenuButton();
  }

  function m397RefreshTimingEditButtons() {
    var fill = byId("m397FillTimingSelected");
    if (fill && typeof shotEditSelectionList === "function") fill.disabled = !shotEditSelectionList().length;
    var set = byId("m397SetTimingFromEdit");
    if (set) set.textContent = "Set Row Start (Next " + m397FormatTiming(m397TimingState ? m397TimingState.next : 0) + ")";
  }

  function m397AugmentShotEditBar() {
    var bar = byId("m395ShotEditBar");
    if (!bar || byId("m397FillTimingSelected")) return;
    var row = document.createElement("div");
    row.className = "m397TimingEditRow";
    row.innerHTML = '<button type="button" id="m397SetTimingFromEdit">Set Row Start</button><button type="button" id="m397FillTimingSelected">Fill Timing Sequence</button>';
    var hint = byId("m395ShotEditHint");
    bar.insertBefore(row, hint || null);
    byId("m397SetTimingFromEdit").addEventListener("click", function () { m397OpenTimingModal("row"); });
    byId("m397FillTimingSelected").addEventListener("click", function () {
      if (!m397TimingState.active) {
        shotEditSetHint("Set a row start and interval first.");
        m397OpenTimingModal("row");
        return;
      }
      m397FillTimingSelection();
    });

    var originalUpdate = shotUpdateEditBar;
    shotUpdateEditBar = function () {
      var result = originalUpdate.apply(this, arguments);
      m397RefreshTimingEditButtons();
      return result;
    };
    m397RefreshTimingEditButtons();
  }

  function m397InstallShotEditTimingBridge() {
    if (window.__mithrilM397ShotEditTimingBridge) return;
    window.__mithrilM397ShotEditTimingBridge = true;
    var originalStart = startShotEditMode;
    startShotEditMode = function () {
      var result = originalStart.apply(this, arguments);
      m397UpdateTimingUI();
      return result;
    };
    window.startShotEditMode = startShotEditMode;

    var originalFinish = finishShotEditMode;
    finishShotEditMode = function () {
      var result = originalFinish.apply(this, arguments);
      m397UpdateTimingUI();
      return result;
    };
    window.finishShotEditMode = finishShotEditMode;
    var done = byId("m395ShotEditDone");
    if (done) done.addEventListener("click", function () { window.setTimeout(m397UpdateTimingUI, 0); });
  }

  function m397CanvasHit(event, canvas) {
    var point = preciseCanvasPoint(event, canvas);
    var world = screenToWorld(point.x, point.y);
    return hitTestHole(world.x, world.y);
  }

  function m397InstallTimingCanvasInteraction(canvas) {
    if (!canvas || canvas.getAttribute("data-m397-timing-interaction") === "true") return;
    canvas.setAttribute("data-m397-timing-interaction", "true");

    if ("PointerEvent" in window) {
      canvas.addEventListener("pointerdown", function (event) {
        if (!m397TimingState.active || shotEditMode) return;
        var point = preciseCanvasPoint(event, canvas);
        m397TimingPointerStarts[String(event.pointerId)] = { x: point.x, y: point.y, moved: false };
      }, true);
      canvas.addEventListener("pointermove", function (event) {
        if (!m397TimingState.active || shotEditMode) return;
        var start = m397TimingPointerStarts[String(event.pointerId)];
        if (!start) return;
        var point = preciseCanvasPoint(event, canvas);
        if (Math.abs(point.x - start.x) > 7 || Math.abs(point.y - start.y) > 7) start.moved = true;
      }, true);
      canvas.addEventListener("pointerup", function (event) {
        if (!m397TimingState.active || shotEditMode) return;
        var key = String(event.pointerId);
        var start = m397TimingPointerStarts[key];
        delete m397TimingPointerStarts[key];
        if (!start || start.moved) return;
        try { if (typeof pointerState !== "undefined" && pointerState) pointerState.moved = true; } catch (error) {}
        var hit = m397CanvasHit(event, canvas);
        if (!hit) { m397SetTimingHint("Tap inside a saved hole cell."); return; }
        m397HandleTimingTap(hit);
      }, true);
      canvas.addEventListener("pointercancel", function (event) { delete m397TimingPointerStarts[String(event.pointerId)]; }, true);
    } else {
      canvas.addEventListener("touchstart", function (event) {
        if (!m397TimingState.active || shotEditMode || event.touches.length !== 1) return;
        var point = preciseCanvasPoint(event, canvas);
        m397TimingTouchStart = { x: point.x, y: point.y, moved: false };
      }, true);
      canvas.addEventListener("touchmove", function (event) {
        if (!m397TimingState.active || shotEditMode || !m397TimingTouchStart || event.touches.length !== 1) return;
        var point = preciseCanvasPoint(event, canvas);
        if (Math.abs(point.x - m397TimingTouchStart.x) > 7 || Math.abs(point.y - m397TimingTouchStart.y) > 7) m397TimingTouchStart.moved = true;
      }, true);
      canvas.addEventListener("touchend", function (event) {
        if (!m397TimingState.active || shotEditMode || !m397TimingTouchStart) return;
        var start = m397TimingTouchStart;
        m397TimingTouchStart = null;
        if (start.moved || !event.changedTouches.length) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        var hit = m397CanvasHit(event, canvas);
        if (!hit) { m397SetTimingHint("Tap inside a saved hole cell."); return; }
        m397HandleTimingTap(hit);
      }, true);
      canvas.addEventListener("touchcancel", function () { m397TimingTouchStart = null; }, true);
    }
  }

  function m397InstallTimingKeyboardShortcuts() {
    if (window.__mithrilM397TimingKeyboardShortcuts) return;
    window.__mithrilM397TimingKeyboardShortcuts = true;
    document.addEventListener("keydown", function (event) {
      if (!m397TimingState || !m397TimingState.active || shotEditMode) return;
      var target = event.target;
      var tag = String(target && target.tagName || "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (target && target.isContentEditable)) return;
      if ((event.ctrlKey || event.metaKey) && String(event.key || "").toLowerCase() === "z") {
        event.preventDefault(); m397UndoLastTiming(); return;
      }
      if (event.key === "[") { event.preventDefault(); m397AdjustNext(-1); return; }
      if (event.key === "]") { event.preventDefault(); m397AdjustNext(1); return; }
      if (event.key === "Escape") { event.preventDefault(); m397FinishTimingMode(); }
    }, true);
  }

  function m397InstallTimingBackupHooks() {
    if (window.__mithrilM397TimingBackupHooks) return;
    window.__mithrilM397TimingBackupHooks = true;

    var originalSaveHeader = window.saveHeaderData;
    if (typeof originalSaveHeader === "function") {
      window.saveHeaderData = function () {
        var currentTiming = m397BackupTimingState();
        var result = originalSaveHeader.apply(this, arguments);
        headerData.TimingSequence = currentTiming;
        m397PersistTimingState();
        return result;
      };
    }

    var originalBackupInfo = window.getCurrentShotInfoForBackup;
    if (typeof originalBackupInfo === "function") {
      window.getCurrentShotInfoForBackup = function () {
        var info = originalBackupInfo.apply(this, arguments) || {};
        info.TimingSequence = m397BackupTimingState();
        return info;
      };
    }

    var originalNormalizeHeader = window.normalizeLoadedHeaderData;
    if (typeof originalNormalizeHeader === "function") {
      window.normalizeLoadedHeaderData = function (payload) {
        var normalized = originalNormalizeHeader.apply(this, arguments) || {};
        var source = payload && (payload.headerData || payload.shotInfo || payload.header) || {};
        m397TimingOrigin = null;
        m397TimingState = m397NormalizeTimingState(source.TimingSequence || source.timingSequence || payload && payload.TimingSequence || m397TimingState || {});
        normalized.TimingSequence = m397BackupTimingState();
        m397PersistTimingState();
        return normalized;
      };
    }
  }

  function installShotTimingSequence(canvas) {
    if (window.__mithrilM397TimingSequence || !canvas) return;
    window.__mithrilM397TimingSequence = true;
    m397TimingState = m397LoadTimingState();
    m397EnsureTimingStyles();
    m397EnsureTimingModal();
    m397EnsureTimingBar();
    m397AugmentShotMenu();
    m397InstallShotEditTimingBridge();
    m397InstallTimingCanvasInteraction(canvas);
    m397InstallTimingKeyboardShortcuts();
    m397InstallTimingBackupHooks();
    m397PersistTimingState();
  }

  window.MithrilM397TimingSequence = {
    normalizeState: m397NormalizeTimingState,
    sequenceValues: m397SequenceValues,
    formatTiming: m397FormatTiming,
    sortLocations: m397TimingSortLocations,
    rangeDetails: m397TimingRangeDetails,
    handleTap: m397HandleTimingTap,
    getOrigin: function () { return m397TimingOrigin ? deepClone(m397TimingOrigin) : null; },
    restoreState: m397RestoreTimingState,
    fillSelection: m397FillTimingSelection,
    undo: m397UndoLastTiming
  };

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

  // ---------------------------------------------------------------------------
  // m40.9.1.1 workspace interaction repair (preserved in m40.9.2)
  // ---------------------------------------------------------------------------

  var m4091HoleClipboard = null;
  var m4091ContextTarget = null;
  var m4091PointerStarts = {};

  function injectM4091InteractionStyles() {
    if (byId("mithrilM4091InteractionStyles")) return;
    var style = document.createElement("style");
    style.id = "mithrilM4091InteractionStyles";
    style.textContent = [
      ".m4091ContextMenu{position:fixed;z-index:28000;width:min(250px,calc(100vw - 20px));padding:7px;border:1px solid #7e8996;border-radius:11px;background:#f8fafc;color:#17202b;box-shadow:0 14px 38px rgba(0,0,0,.38);font-family:Arial,sans-serif}",
      ".m4091ContextTitle{padding:6px 8px 8px;color:#526071;font-size:11px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}",
      ".m4091ContextMenu button{display:block;width:100%;min-height:42px;margin:0 0 5px;text-align:left;border-color:#a9b2bd;background:#fff;color:#17202b;font-size:14px}",
      ".m4091ContextMenu button:last-child{margin-bottom:0}",
      ".m4091ContextMenu button.primary{border-color:#1f6feb;background:#1f6feb;color:#fff}",
      ".m4091ContextMenu button:disabled{background:#eef1f4;color:#8a949f}",
      ".m4091ContextDivider{height:1px;margin:6px 2px;background:#d5dbe2}"
    ].join("");
    document.head.appendChild(style);
  }

  function m4091Notify(message, kind) {
    if (window.MithrilFeedback && typeof window.MithrilFeedback.toast === "function") {
      window.MithrilFeedback.toast(message, kind || "good");
      return;
    }
    alert(message);
  }

  function m4091ScreenPoint(event, canvas) {
    return preciseCanvasPoint(event, canvas);
  }

  function m4091PageAtPoint(type, point) {
    var world;
    try {
      world = screenToWorld(point.x, point.y);
      if (type === "shot" && typeof getPageAtWorldPoint === "function") return getPageAtWorldPoint(world.x, world.y);
      if (type === "drill" && typeof pageAtWorldPoint === "function") return pageAtWorldPoint(world.x, world.y);
    } catch (error) {}
    return gpsPageAtScreenPoint(type, point);
  }

  function m4091HoleAtPoint(type, point) {
    try {
      var world = screenToWorld(point.x, point.y);
      if (type === "shot" && typeof hitTestHole === "function") return hitTestHole(world.x, world.y);
      if (type === "drill" && typeof hitTestWorld === "function") return hitTestWorld(world.x, world.y);
    } catch (error) {}
    return null;
  }

  function m4091ActivatePage(type, pageNum) {
    pageNum = Number(pageNum);
    if (!pageNum) return false;
    try {
      if (Number(currentPage) === pageNum) return true;
      if (type === "shot" && typeof switchToPage === "function") switchToPage(pageNum);
      else if (type === "drill" && typeof switchPage === "function") switchPage(pageNum, false);
      else {
        currentPage = pageNum;
        if (typeof refreshPageSelect === "function") refreshPageSelect();
        if (typeof window.draw === "function") window.draw();
      }
      return true;
    } catch (error) {
      console.warn("MITHRIL could not activate Page " + pageNum + ".", error);
      return false;
    }
  }

  function m4091PointOnShotHeader(point, pageNum) {
    try {
      var world = screenToWorld(point.x, point.y);
      var local = worldToPageLocal(pageNum, world.x, world.y);
      var left = IMG_W * Number(headerPos.leftPct || 67.7) / 100;
      var right = left + IMG_W * Number(headerPos.widthPct || 22.5) / 100;
      var top = IMG_H * Math.max(0, Number(headerPos.dateTop || 5.8) - 1.8) / 100;
      var bottom = IMG_H * Math.min(100, Number(headerPos.blasterTop || 13) + 1.8) / 100;
      return local.x >= left && local.x <= right && local.y >= top && local.y <= bottom;
    } catch (error) {
      return false;
    }
  }

  function m4091EditorIsOpen(type) {
    var bar = byId(type === "shot" ? "m395ShotEditBar" : "m395DrillEditBar");
    return !!bar && bar.classList.contains("show");
  }

  function m4091OpenInfo(type) {
    if (type === "shot") callGlobal("openShotInfo");
    else callGlobal("openInfo");
  }

  function m4091OpenPageTools(type) {
    if (typeof window.openMenu === "function") window.openMenu();
    var sectionId = type === "shot" ? "m395ShotPages" : "m395DrillPages";
    var button = document.querySelector('[data-m395-section="' + sectionId + '"]');
    if (button && button.getAttribute("aria-expanded") !== "true") button.click();
  }

  function m4091OpenEditTool(type) {
    if (type === "shot") startShotEditMode();
    else startDrillEditMode();
  }

  function m4091OpenCloud() {
    if (window.MithrilCloudSync && typeof window.MithrilCloudSync.open === "function") {
      window.MithrilCloudSync.open();
      return;
    }
    var button = byId("m400CloudSyncButton");
    if (button) {
      button.click();
      return;
    }
    m4091Notify("Cloud Sync is still loading. Try again in a moment.", "bad");
  }

  function m4091Clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function m4091CopyHole(type, pageNum, holeId) {
    var source = pagesData && pagesData[String(pageNum)] && pagesData[String(pageNum)][holeId];
    if (!source) {
      m4091Notify("Hole " + holeId + " has no saved data to copy.", "bad");
      return;
    }
    m4091HoleClipboard = {
      type: type,
      pageNum: Number(pageNum),
      holeId: holeId,
      data: m4091Clone(source)
    };
    m4091Notify("Copied Page " + pageNum + " · Hole " + holeId + ".");
  }

  function m4091PasteHole(type, pageNum, holeId) {
    if (!m4091HoleClipboard || m4091HoleClipboard.type !== type) {
      m4091Notify("Copy a " + (type === "shot" ? "Shot Diagram" : "Drill Log") + " hole first.", "bad");
      return;
    }
    if (document.body && document.body.classList.contains("m405ReadOnly")) {
      m4091Notify("This document is read only.", "bad");
      return;
    }
    var pageKey = String(pageNum);
    if (!pagesData[pageKey]) pagesData[pageKey] = {};
    var existing = pagesData[pageKey][holeId];
    if (existing && !confirm("Replace the saved data in Page " + pageNum + " · Hole " + holeId + "?")) return;
    var next = m4091Clone(m4091HoleClipboard.data);
    next.HoleID = holeId;
    next.Timestamp = new Date().toLocaleString();
    pagesData[pageKey][holeId] = next;
    m4091ActivatePage(type, pageNum);
    if (type === "shot") {
      holeData = pagesData[pageKey];
      if (typeof saveData === "function") saveData();
    } else {
      if (typeof invalidatePageCache === "function") invalidatePageCache(pageNum);
      if (typeof saveState === "function") saveState();
    }
    if (typeof markDirty === "function") markDirty();
    if (typeof window.draw === "function") window.draw();
    m4091Notify("Pasted into Page " + pageNum + " · Hole " + holeId + ".");
  }

  function m4091EditHole(type, pageNum, holeId) {
    if (!holeId) return;
    m4091ActivatePage(type, pageNum);
    if (typeof openHole === "function") openHole(holeId);
  }

  function m4091CloseContextMenu() {
    var menu = byId("m4091ContextMenu");
    if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
    m4091ContextTarget = null;
  }

  function m4091ContextButton(label, action, options) {
    options = options || {};
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (options.primary) button.className = "primary";
    button.disabled = !!options.disabled;
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var target = m4091ContextTarget;
      m4091CloseContextMenu();
      if (!button.disabled && target) action(target);
    });
    return button;
  }

  function m4091ContextDivider() {
    var divider = document.createElement("div");
    divider.className = "m4091ContextDivider";
    return divider;
  }

  function m4091ShowContextMenu(type, canvas, event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    m4091CloseContextMenu();
    var point = m4091ScreenPoint(event, canvas);
    var pageNum = m4091PageAtPoint(type, point);
    var hit = m4091HoleAtPoint(type, point);
    if (hit && hit.pageNum) pageNum = hit.pageNum;
    if (pageNum) m4091ActivatePage(type, pageNum);
    m4091ContextTarget = {
      type: type,
      pageNum: Number(pageNum || 0),
      holeId: hit && hit.holeId || ""
    };

    var menu = document.createElement("div");
    menu.id = "m4091ContextMenu";
    menu.className = "m4091ContextMenu";
    menu.setAttribute("role", "menu");
    var title = document.createElement("div");
    title.className = "m4091ContextTitle";
    title.textContent = hit ? ("Page " + pageNum + " · Hole " + hit.holeId) : (pageNum ? "Page " + pageNum : "MITHRIL Workspace");
    menu.appendChild(title);

    var readOnly = document.body && document.body.classList.contains("m405ReadOnly");
    if (hit) {
      menu.appendChild(m4091ContextButton("Edit Hole", function (target) {
        m4091EditHole(target.type, target.pageNum, target.holeId);
      }, { disabled: readOnly }));
      menu.appendChild(m4091ContextButton("Copy Hole", function (target) {
        m4091CopyHole(target.type, target.pageNum, target.holeId);
      }, { disabled: !pagesData[String(pageNum)] || !pagesData[String(pageNum)][hit.holeId] }));
      menu.appendChild(m4091ContextButton("Paste Here", function (target) {
        m4091PasteHole(target.type, target.pageNum, target.holeId);
      }, { disabled: readOnly || !m4091HoleClipboard || m4091HoleClipboard.type !== type }));
      menu.appendChild(m4091ContextButton("Open Edit Holes Tool", function (target) {
        m4091ActivatePage(target.type, target.pageNum);
        m4091OpenEditTool(target.type);
      }, { disabled: readOnly }));
      menu.appendChild(m4091ContextDivider());
    }
    if (pageNum) {
      menu.appendChild(m4091ContextButton(type === "shot" ? "Shot Info" : "Drill Log Info", function (target) {
        m4091ActivatePage(target.type, target.pageNum);
        m4091OpenInfo(target.type);
      }));
      menu.appendChild(m4091ContextButton("Page Tools", function (target) {
        m4091ActivatePage(target.type, target.pageNum);
        m4091OpenPageTools(target.type);
      }));
    }
    menu.appendChild(m4091ContextButton("Cloud Sync", function () {
      m4091OpenCloud();
    }, { primary: true }));
    document.body.appendChild(menu);

    var left = Number(event.clientX || 0);
    var top = Number(event.clientY || 0);
    var rect = menu.getBoundingClientRect();
    left = Math.max(10, Math.min(left, window.innerWidth - rect.width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - rect.height - 10));
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }

  function installM4091WorkspaceInteractions(type, canvas) {
    if (!canvas || canvas.getAttribute("data-m4091-interactions") === "true") return;
    canvas.setAttribute("data-m4091-interactions", "true");
    injectM4091InteractionStyles();

    canvas.addEventListener("contextmenu", function (event) {
      m4091ShowContextMenu(type, canvas, event);
    }, true);

    canvas.addEventListener("pointerdown", function (event) {
      m4091CloseContextMenu();
      if (event.pointerType === "mouse" && event.button !== 0) {
        delete m4091PointerStarts[event.pointerId];
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        return;
      }
      m4091PointerStarts[event.pointerId] = m4091ScreenPoint(event, canvas);
    }, true);

    canvas.addEventListener("pointercancel", function (event) {
      delete m4091PointerStarts[event.pointerId];
    }, true);

    canvas.addEventListener("pointerup", function (event) {
      var start = m4091PointerStarts[event.pointerId];
      delete m4091PointerStarts[event.pointerId];
      if (event.pointerType === "mouse" && event.button !== 0) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        return;
      }
      if (!start) return;
      var point = m4091ScreenPoint(event, canvas);
      if (Math.hypot(point.x - start.x, point.y - start.y) > 7) return;
      var pageNum = m4091PageAtPoint(type, point);
      if (!pageNum) return;
      m4091ActivatePage(type, pageNum);
      if (type === "shot" && !m4091EditorIsOpen(type) && m4091PointOnShotHeader(point, pageNum)) {
        event.preventDefault();
        // Do not stop this pointer-up. The original Shot Diagram handler must
        // finish its normal pointer cleanup before the modal opens.
        window.setTimeout(function () { m4091OpenInfo("shot"); }, 0);
      }
    }, true);

    document.addEventListener("pointerdown", function (event) {
      var menu = byId("m4091ContextMenu");
      if (menu && !menu.contains(event.target)) m4091CloseContextMenu();
    }, true);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") m4091CloseContextMenu();
    });
    window.addEventListener("blur", m4091CloseContextMenu);
    window.addEventListener("resize", m4091CloseContextMenu);
  }

  // ---------------------------------------------------------------------------
  // m40.9.3.3 configurable automatic stemming / ANFO calculation
  // ---------------------------------------------------------------------------
  var M40931_DINK_LENGTH_FT = 3;
  var m40931PreviousSecondaryLoad = "";

  function m40931NonnegativeFootage(value, allowZero) {
    var raw = String(value == null ? "" : value).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return null;
    var number = Number(raw);
    if (!isFinite(number) || number < 0 || (!allowZero && number === 0)) return null;
    return number;
  }

  function m40931FormatFootage(value) {
    var rounded = Math.round(Number(value) * 100) / 100;
    if (!isFinite(rounded)) return "";
    return String(rounded).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }

  function m40931ParseDinkOnlyLoad(value) {
    var raw = String(value == null ? "" : value).trim().toUpperCase();
    if (!raw) return { valid: true, count: 0 };
    var pattern = /(\d+)D/g;
    var count = 0;
    var match;
    var lastEnd = 0;
    while ((match = pattern.exec(raw)) !== null) {
      if (!/^[\s,+]*$/.test(raw.slice(lastEnd, match.index))) return { valid: false, count: 0 };
      var amount = Number(match[1]);
      if (!isFinite(amount) || amount <= 0 || Math.floor(amount) !== amount) return { valid: false, count: 0 };
      count += amount;
      lastEnd = match.index + match[0].length;
    }
    if (!count || !/^[\s,+]*$/.test(raw.slice(lastEnd))) return { valid: false, count: 0 };
    return { valid: true, count: count };
  }

  function m40931AnfoOnly(value) {
    var raw = String(value == null ? "" : value).trim();
    return !raw || /^(?:\d+(?:\.\d*)?|\.\d+)A$/i.test(raw);
  }

  function m40931ApplyDinkAdjustment(row, previousSecondaryLoad) {
    row = row || {};
    var currentDinks = m40931ParseDinkOnlyLoad(row.SecondaryLoad);
    var previousDinks = m40931ParseDinkOnlyLoad(previousSecondaryLoad);
    if (!currentDinks.valid) return { status: "unsupported-secondary", row: row, dinkCount: 0 };
    if (currentDinks.count === 0 && (!previousDinks.valid || previousDinks.count === 0)) {
      return { status: "inactive", row: row, dinkCount: 0 };
    }
    if (!m40931AnfoOnly(row.PrimaryLoad)) {
      return { status: "non-anfo-primary", row: row, dinkCount: currentDinks.count };
    }

    var depth = m40931NonnegativeFootage(row.Depth, false);
    var stemming = m40931NonnegativeFootage(row.Stemming, true);
    if (depth === null || stemming === null || stemming > depth) {
      return { status: "missing-footage", row: row, dinkCount: currentDinks.count };
    }

    var dinkFeet = currentDinks.count * M40931_DINK_LENGTH_FT;
    var anfoFeet = depth - stemming - dinkFeet;
    if (anfoFeet < -0.0000001) {
      row.PrimaryLoad = "";
      return { status: "no-room", row: row, dinkCount: currentDinks.count, dinkFeet: dinkFeet, availableFeet: depth - stemming };
    }
    anfoFeet = Math.max(0, anfoFeet);
    row.PrimaryLoad = anfoFeet > 0 ? m40931FormatFootage(anfoFeet) + "A" : "";
    return { status: "adjusted", row: row, dinkCount: currentDinks.count, dinkFeet: dinkFeet, anfoFeet: anfoFeet };
  }

  function m40932CurrentRules() {
    var source = {};
    try { source = headerData && headerData.LoadCalculationSettings || {}; } catch (error) { source = {}; }
    var minimum = m40931NonnegativeFootage(source.minimumStemming == null ? 7 : source.minimumStemming, true);
    var hold = m40931NonnegativeFootage(source.holdIntoRock == null ? 1 : source.holdIntoRock, true);
    var dinkLength = m40931NonnegativeFootage(source.dinkLengthFeet == null ? 3 : source.dinkLengthFeet, false);
    return {
      enabled: source.enabled == null ? true : source.enabled === true,
      valid: minimum !== null && hold !== null && dinkLength !== null,
      minimumStemming: minimum === null ? 7 : minimum,
      holdIntoRock: hold === null ? 1 : hold,
      dinkLengthFeet: dinkLength === null ? 3 : dinkLength
    };
  }

  function m40932ApplyAutomaticCalculation(row, rules, preserveStemming) {
    row = row || {};
    rules = rules || m40932CurrentRules();
    if (!rules.enabled) return { status: "disabled", row: row, rules: rules };
    if (!rules.valid) return { status: "invalid-rules", row: row, rules: rules };
    if (/^(?:yes|true|1)$/i.test(String(row.DirtHole || "")) || /^(?:yes|true|1)$/i.test(String(row.BadHole || ""))) {
      return { status: "condition", row: row, rules: rules };
    }
    if (!m40931AnfoOnly(row.PrimaryLoad)) return { status: "non-anfo-primary", row: row, rules: rules };
    var dinks = m40931ParseDinkOnlyLoad(row.SecondaryLoad);
    if (!dinks.valid) return { status: "unsupported-secondary", row: row, rules: rules };
    var depth = m40931NonnegativeFootage(row.Depth, false);
    var overburden = m40931NonnegativeFootage(row.Overburden, true);
    if (depth === null || overburden === null) return { status: "missing-footage", row: row, rules: rules };
    var stemming = preserveStemming ? m40931NonnegativeFootage(row.Stemming, true) : Math.max(rules.minimumStemming, overburden + rules.holdIntoRock);
    if (stemming === null || stemming > depth) return { status: "missing-footage", row: row, rules: rules };
    var dinkFeet = dinks.count * rules.dinkLengthFeet;
    var anfoFeet = depth - stemming - dinkFeet;
    if (!(anfoFeet > 0)) {
      return { status: "no-room", row: row, rules: rules, stemming: stemming, dinkCount: dinks.count, dinkFeet: dinkFeet, availableFeet: depth - stemming };
    }
    row.Stemming = m40931FormatFootage(stemming);
    row.PrimaryLoad = m40931FormatFootage(anfoFeet) + "A";
    return { status: "calculated", row: row, rules: rules, stemming: stemming, dinkCount: dinks.count, dinkFeet: dinkFeet, anfoFeet: anfoFeet };
  }

  function m40931EnsureDinkNote() {
    var existing = byId("m40931DinkNote");
    if (existing) return existing;
    var secondary = byId("secondaryLoad");
    var label = secondary && secondary.closest ? secondary.closest("label") : null;
    if (!label || !label.parentNode) return null;
    var note = document.createElement("div");
    note.id = "m40931DinkNote";
    note.className = "m40931DinkNote";
    note.textContent = "Auto calculator: Stemming and ANFO use the document calculation parameters.";
    label.parentNode.insertBefore(note, label.nextSibling);
    return note;
  }

  function m40933EnsureAutoAnfoToggle() {
    var existing = byId("m40933AutoAnfoToggle");
    if (existing) return existing;
    var note = m40931EnsureDinkNote();
    if (!note || !note.parentNode) return null;
    var control = document.createElement("div");
    control.id = "m40933AutoAnfoToggle";
    control.className = "m40933AutoAnfoToggle";
    control.innerHTML = [
      '<span class="m40933AutoAnfoText"><strong>Auto ANFO</strong><small id="m40933AutoAnfoStatus"></small></span>',
      '<button type="button" id="m40933AutoAnfoButton" role="switch" aria-checked="true">ON</button>'
    ].join("");
    note.parentNode.insertBefore(control, note);
    byId("m40933AutoAnfoButton").addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      m40933SetAutoAnfoEnabled(!m40932CurrentRules().enabled);
    });
    return control;
  }

  function m40933SyncAutoAnfoToggle() {
    var control = m40933EnsureAutoAnfoToggle();
    var button = byId("m40933AutoAnfoButton");
    var status = byId("m40933AutoAnfoStatus");
    if (!control || !button || !status) return;
    var enabled = m40932CurrentRules().enabled;
    control.classList.toggle("off", !enabled);
    button.classList.toggle("off", !enabled);
    button.textContent = enabled ? "ON" : "OFF";
    button.setAttribute("aria-checked", enabled ? "true" : "false");
    status.textContent = enabled ? "Stemming and ANFO calculate automatically" : "Manual / emulsion mode — enter pumped pounds";
  }

  function m40933SetAutoAnfoEnabled(enabled) {
    var source = headerData && headerData.LoadCalculationSettings || {};
    headerData.LoadCalculationSettings = {
      enabled: !!enabled,
      minimumStemming: source.minimumStemming == null ? 7 : source.minimumStemming,
      holdIntoRock: source.holdIntoRock == null ? 1 : source.holdIntoRock,
      dinkLengthFeet: source.dinkLengthFeet == null ? 3 : source.dinkLengthFeet,
      loadType: "ANFO"
    };
    try { if (typeof saveState === "function") saveState(); } catch (error1) {}
    try { if (typeof markDirty === "function") markDirty(); } catch (error2) {}
    m40933SyncAutoAnfoToggle();
    window.dispatchEvent(new CustomEvent("mithril-load-settings-changed", { detail: headerData.LoadCalculationSettings }));
    m40931PaintDinkNote({ status: "ready", rules: m40932CurrentRules() });
  }

  function m40931PaintDinkNote(result) {
    var note = m40931EnsureDinkNote();
    if (!note) return;
    note.classList.remove("warning", "success");
    if (!result || result.status === "ready") {
      var readyRules = result && result.rules || m40932CurrentRules();
      note.textContent = readyRules.enabled ?
        "Auto ANFO ON — minimum " + m40931FormatFootage(readyRules.minimumStemming) + " ft, rock hold " + m40931FormatFootage(readyRules.holdIntoRock) + " ft, " + m40931FormatFootage(readyRules.dinkLengthFeet) + " ft per dink." :
        "Auto ANFO OFF — manual/emulsion entries will not be changed.";
      return;
    }
    if (result.status === "disabled") {
      note.textContent = "Auto ANFO OFF — manual/emulsion entries will not be changed.";
      return;
    }
    if (result.status === "calculated") {
      note.classList.add("success");
      note.textContent = "Calculated " + result.row.Stemming + " ft stemming / " + result.row.PrimaryLoad +
        (result.dinkCount ? " after reserving " + m40931FormatFootage(result.dinkFeet) + " ft for " + result.dinkCount + "D." : ".");
      return;
    }
    note.classList.add("warning");
    if (result.status === "no-room") {
      note.textContent = "The current parameters leave no room for a positive ANFO load. Review this hole manually.";
    } else if (result.status === "non-anfo-primary") {
      note.textContent = "MITHRIL did not overwrite this non-ANFO Primary Load.";
    } else if (result.status === "unsupported-secondary") {
      note.textContent = "Automatic calculation requires a blank or dink-only Secondary Load such as 1D or 2D.";
    } else if (result.status === "condition") {
      note.textContent = "Dirt and Bad holes are not automatically loaded.";
    } else if (result.status === "invalid-rules") {
      note.textContent = "Open Load Calculator / Parameters and correct the document settings.";
    } else {
      note.textContent = "Enter valid Overburden and Depth before MITHRIL can calculate this hole.";
    }
  }

  function m40932ReadVisibleHoleForm() {
    var depth = byId("depth");
    var overburden = byId("overburden");
    var stemming = byId("stemming");
    var primary = byId("primaryLoad");
    var secondary = byId("secondaryLoad");
    if (!depth || !overburden || !stemming || !primary || !secondary) return null;
    return {
      Depth: depth.value,
      Overburden: overburden.value,
      Stemming: stemming.value,
      PrimaryLoad: primary.value,
      SecondaryLoad: secondary.value,
      DirtHole: byId("dirtHole") && byId("dirtHole").checked ? "Yes" : "No",
      BadHole: byId("badHole") && byId("badHole").checked ? "Yes" : "No"
    };
  }

  function m40932RefreshAutoCalculation(mode) {
    var row = m40932ReadVisibleHoleForm();
    if (!row) return null;
    var rules = m40932CurrentRules();
    if (mode === "open" && (String(row.Stemming || "").trim() || String(row.PrimaryLoad || "").trim())) {
      var ready = { status: "ready", row: row, rules: rules };
      m40931PaintDinkNote(ready);
      return ready;
    }
    var result = m40932ApplyAutomaticCalculation(row, rules, mode === "stemming");
    if (result.status === "calculated") {
      byId("stemming").value = result.row.Stemming;
      byId("primaryLoad").value = result.row.PrimaryLoad;
    }
    m40931PaintDinkNote(result);
    return result;
  }

  function m40931InjectDinkStyles() {
    if (byId("mithrilDinkCalculatorM40931Styles")) return;
    var style = document.createElement("style");
    style.id = "mithrilDinkCalculatorM40931Styles";
    style.textContent = [
      ".m40931DinkNote{grid-column:1/-1;margin:-2px 0 3px;padding:7px 9px;border:1px solid #9eb1c7;border-radius:8px;background:#f4f7fb;color:#3b4f67;font-size:12px;font-weight:800;line-height:1.35}",
      ".m40931DinkNote.success{border-color:#75a887;background:#edf8f0;color:#245d34}",
      ".m40931DinkNote.warning{border-color:#cf9b48;background:#fff7e7;color:#744b08}",
      ".m40933AutoAnfoToggle{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:1px 0 6px;padding:8px 10px;border:1px solid #75a887;border-radius:9px;background:#edf8f0;color:#245d34}",
      ".m40933AutoAnfoToggle.off{border-color:#9ca6b1;background:#f1f3f5;color:#3e4b59}",
      ".m40933AutoAnfoText{display:grid;gap:1px;text-align:left}",
      ".m40933AutoAnfoText strong{font-size:13px;font-weight:950}",
      ".m40933AutoAnfoText small{font-size:11px;font-weight:750;line-height:1.25}",
      ".m40933AutoAnfoToggle button{flex:0 0 auto;min-width:62px;min-height:38px;padding:6px 12px;border:2px solid #2f7a43;border-radius:19px;background:#2f8a4b;color:#fff;font-size:13px;font-weight:950}",
      ".m40933AutoAnfoToggle button.off{border-color:#727d89;background:#727d89}"
    ].join("");
    document.head.appendChild(style);
  }

  function installDinkAnfoCalculator() {
    if (window.__mithrilM40931DinkCalculator) return;
    var secondary = byId("secondaryLoad");
    if (!secondary || typeof window.readHoleForm !== "function") return;
    window.__mithrilM40931DinkCalculator = true;
    m40931InjectDinkStyles();
    m40931EnsureDinkNote();
    m40933EnsureAutoAnfoToggle();
    m40933SyncAutoAnfoToggle();

    var originalOpenHole = window.openHole;
    if (typeof originalOpenHole === "function") {
      window.openHole = function (holeId) {
        try { m40931PreviousSecondaryLoad = String(holeData && holeData[holeId] && holeData[holeId].SecondaryLoad || ""); }
        catch (error) { m40931PreviousSecondaryLoad = ""; }
        var result = originalOpenHole.apply(this, arguments);
        window.setTimeout(function () { m40933SyncAutoAnfoToggle(); m40932RefreshAutoCalculation("open"); }, 0);
        return result;
      };
    }

    var originalReadHoleForm = window.readHoleForm;
    window.readHoleForm = function () {
      var row = originalReadHoleForm.apply(this, arguments) || {};
      var rules = m40932CurrentRules();
      if (!rules.enabled) return row;
      var secondaryChanged = String(row.SecondaryLoad || "") !== String(m40931PreviousSecondaryLoad || "");
      var needsInitialCalculation = !String(row.Stemming || "").trim() || !String(row.PrimaryLoad || "").trim();
      if (!needsInitialCalculation && !secondaryChanged) return row;
      var calculated = m40932ApplyAutomaticCalculation(row, rules, secondaryChanged && !needsInitialCalculation);
      return calculated.status === "calculated" ? calculated.row : row;
    };

    ["overburden", "depth", "secondaryLoad"].forEach(function (id) {
      var field = byId(id);
      if (field) field.addEventListener("input", function () { m40932RefreshAutoCalculation("full"); });
    });
    var stemmingField = byId("stemming");
    if (stemmingField) stemmingField.addEventListener("input", function () { m40932RefreshAutoCalculation("stemming"); });
    ["dirtHole", "badHole"].forEach(function (id) {
      var field = byId(id);
      if (field) field.addEventListener("change", function () { m40932RefreshAutoCalculation("full"); });
    });
    window.addEventListener("mithril-load-settings-changed", function () {
      m40933SyncAutoAnfoToggle();
      var modal = byId("holeModal");
      if (modal && modal.classList.contains("show")) m40932RefreshAutoCalculation("full");
    });
  }

  window.MithrilM40931DinkCalculator = {
    dinkLengthFeet: M40931_DINK_LENGTH_FT,
    parseDinkOnlyLoad: m40931ParseDinkOnlyLoad,
    apply: m40931ApplyDinkAdjustment
  };

  window.MithrilM40932LoadCalculator = {
    currentRules: m40932CurrentRules,
    calculate: m40932ApplyAutomaticCalculation,
    refreshHoleEntry: m40932RefreshAutoCalculation
  };

  window.MithrilM40933AutoAnfo = {
    setEnabled: m40933SetAutoAnfoEnabled,
    sync: m40933SyncAutoAnfoToggle
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
    injectM406WorkspaceStyles();
    injectM4091InteractionStyles();
    m4095InjectReadinessStyles();
    injectMultiQuickStyles();
    injectGPSStyles();
    injectSteelFirstStyles();
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
      installM4094DrillExportSummary();
      enableWheelZoom(drillCanvas);
      installPhysicalKeyboardEntry("drill");
      installAdaptiveFieldEntry("drill");
      installM4091WorkspaceInteractions("drill", drillCanvas);
    } else if (shotCanvas) {
      installPrecisionCanvasCoordinates(shotCanvas, "shot");
      updateToolbar(true);
      patchShotMenu();
      addShotInfoBackButton();
      installShotSummaryCalculations();
      installShotPatternSystem();
      installM4094ShotExportSummary();
      installShotPdfPreview();
      patchShotMultiQuick();
      installGPSFeature("shot", shotCanvas);
      installShotEditFeature(shotCanvas);
      m395AugmentShotEditBar();
      enableWheelZoom(shotCanvas);
      installPhysicalKeyboardEntry("shot");
      installAdaptiveFieldEntry("shot");
      installDinkAnfoCalculator();
      installShotTimingSequence(shotCanvas);
      installM4091WorkspaceInteractions("shot", shotCanvas);
    } else if (byId("shotFrame")) {
      installShotFrameBridge();
    }

    // Core and component styles are installed by separate modules during the
    // same startup turn. Re-append the release layer after they finish so the
    // visual system remains consistent in the landing page and both workspaces.
    window.setTimeout(injectSteelFirstStyles, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
