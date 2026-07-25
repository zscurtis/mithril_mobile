(function () {
  "use strict";

  var RELEASE_VERSION = "m39.9.2";
  var SCRIPT_ID = "mithrilMenuM399ChildLoader";
  var SCRIPT_SRC = "./mithril-menu-m399.js?rev=3992-frame";
  var DEVICE_KEY = "mithrilCloudDeviceNameM399";
  var FIREBASE_VERSION = "12.16.0";
  var firebaseConfig = {
    apiKey: "AIzaSyBOb0pXdIDMqr5mMKdKOCpP84jSRjyjnhY",
    authDomain: "mithril-mobile.firebaseapp.com",
    projectId: "mithril-mobile",
    storageBucket: "mithril-mobile.firebasestorage.app",
    messagingSenderId: "797958678485",
    appId: "1:797958678485:web:e19ab69e74e00cd8587f5c"
  };

  if (window.__mithrilM399Installed) return;
  window.__mithrilM399Installed = true;

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
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function closeMenu() {
    try { if (typeof window.closeMenu === "function") window.closeMenu(); }
    catch (error) {}
    var menu = byId("menuModal"); if (menu) menu.classList.remove("show");
  }
  function setStatus(message, kind) {
    var el = byId("m399CloudStatus"); if (!el) return;
    el.textContent = message;
    el.className = "m399CloudStatus " + (kind || "");
  }
  function friendlyError(error) {
    var code = error && error.code ? String(error.code) : "";
    if (code.indexOf("auth/invalid-credential") >= 0 || code.indexOf("auth/wrong-password") >= 0) return "Email or password was not accepted.";
    if (code.indexOf("auth/too-many-requests") >= 0) return "Firebase temporarily blocked repeated sign-in attempts. Wait a few minutes and try again.";
    if (code.indexOf("permission-denied") >= 0) return "Firestore denied access. Confirm the published rules match the m39.9 README.";
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
  function countHoles(pages) {
    var count = 0;
    Object.keys(pages || {}).forEach(function (pageKey) {
      Object.keys((pages || {})[pageKey] || {}).forEach(function (holeKey) {
        var rec = pages[pageKey][holeKey];
        if (!rec || typeof rec !== "object") return;
        var meaningful = Object.keys(rec).some(function (key) {
          if (/^(HoleID|PageNumber|Timestamp|FieldDate|ShotID|JobName|Blaster|EnteredBy)$/i.test(key)) return false;
          var v = rec[key];
          if (v == null || v === false || v === "") return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === "object") return Object.keys(v).length > 0;
          return true;
        });
        if (meaningful) count += 1;
      });
    });
    return count;
  }

  function loadFirebase() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-firestore.js")
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], storeMod = mods[2];
      var app;
      try { app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig); }
      catch (error) { app = appMod.initializeApp(firebaseConfig); }
      var auth = authMod.getAuth(app);
      var db = storeMod.getFirestore(app);
      try { authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (error2) {}
      if (!authUnsubscribe) {
        authUnsubscribe = authMod.onAuthStateChanged(auth, function (user) {
          currentUser = user || null;
          refreshAuthUI();
          if (currentUser && byId("m399CloudModal") && byId("m399CloudModal").classList.contains("show")) refreshCloudList();
        });
      }
      return { app: app, auth: auth, db: db, authMod: authMod, storeMod: storeMod };
    });
    return fbPromise;
  }

  function ensureStyles() {
    if (byId("m399CloudStyles")) return;
    var style = document.createElement("style");
    style.id = "m399CloudStyles";
    style.textContent = [
      ".m399CloudModal{display:none;position:fixed;inset:0;z-index:15000;background:rgba(0,0,0,.7);padding:12px;box-sizing:border-box;overflow:auto;font-family:Arial,sans-serif}",
      ".m399CloudModal.show{display:flex;align-items:flex-start;justify-content:center}",
      ".m399CloudBox{width:min(760px,100%);margin:auto;background:#fff;color:#111;border:2px solid #1f6feb;border-radius:14px;padding:14px;box-sizing:border-box;box-shadow:0 12px 40px rgba(0,0,0,.5)}",
      ".m399CloudHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.m399CloudHead strong{font-size:21px}",
      ".m399CloudBox button{min-height:44px;border:1px solid #777;border-radius:8px;background:#f4f4f4;color:#111;font-weight:850;padding:7px 10px;font-size:14px}",
      ".m399CloudBox button.primary{background:#1f6feb;border-color:#1f6feb;color:#fff}.m399CloudBox button.danger{background:#fff0f0;border-color:#c66}",
      ".m399CloudLogin,.m399CloudActions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.m399CloudLogin label{display:grid;gap:4px;font-size:12px;font-weight:850;color:#444}",
      ".m399CloudLogin input{width:100%;min-height:43px;border:1px solid #888;border-radius:7px;padding:8px;font-size:16px;box-sizing:border-box}",
      ".m399CloudWide{grid-column:1/-1}.m399CloudStatus{margin:9px 0;padding:9px;border:1px solid #aaa;border-radius:8px;background:#f5f5f5;font-size:13px;font-weight:800;line-height:1.35}.m399CloudStatus.good{background:#e9f8ec;border-color:#61a86e}.m399CloudStatus.bad{background:#ffeaea;border-color:#c66}.m399CloudStatus.wait{background:#fff7d8;border-color:#c7aa45}",
      ".m399CloudIdentity{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:9px;border-radius:8px;background:#eef4ff;border:1px solid #9ab8df;margin-bottom:9px;font-size:13px;font-weight:800}",
      ".m399CloudDocs{display:grid;gap:8px;margin-top:10px}.m399CloudDoc{border:1px solid #aaa;border-radius:9px;padding:9px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center}.m399CloudDocTitle{font-size:15px;font-weight:900}.m399CloudMeta{font-size:12px;color:#555;font-weight:750;line-height:1.35;margin-top:3px}.m399CloudDocActions{display:grid;gap:6px}",
      ".m399CloudNote{font-size:12px;line-height:1.4;color:#555;font-weight:750;margin:8px 0}",
      ".m399CloudToast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:17000;max-width:min(680px,calc(100vw - 24px));padding:12px 16px;border:2px solid #4f9a61;border-radius:10px;background:#e9f8ec;color:#173d20;font-size:14px;font-weight:900;line-height:1.35;box-shadow:0 8px 28px rgba(0,0,0,.35);text-align:center}",
      "@media(max-width:600px){.m399CloudLogin,.m399CloudActions{grid-template-columns:1fr}.m399CloudWide{grid-column:auto}.m399CloudDoc{grid-template-columns:1fr}.m399CloudDocActions{grid-template-columns:1fr 1fr}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureModal() {
    var modal = byId("m399CloudModal"); if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m399CloudModal"; modal.className = "m399CloudModal";
    modal.innerHTML = [
      '<div class="m399CloudBox">',
      '<div class="m399CloudHead"><strong>MITHRIL Cloud Sync — Prototype 1 · m39.9.2</strong><button type="button" id="m399CloudClose">Close</button></div>',
      '<div id="m399CloudSignedOut">',
      '<div class="m399CloudNote">Sign in with the Firebase test account you created. Your password is sent directly to Firebase and is not stored by MITHRIL.</div>',
      '<div class="m399CloudLogin"><label>Email<input type="email" id="m399CloudEmail" autocomplete="username"></label><label>Password<input type="password" id="m399CloudPassword" autocomplete="current-password"></label><label class="m399CloudWide">Device name<input type="text" id="m399CloudDeviceOut" placeholder="Example: Zach Field iPad"></label><button type="button" class="primary m399CloudWide" id="m399CloudSignIn">Sign In</button></div>',
      '</div>',
      '<div id="m399CloudSignedIn" style="display:none">',
      '<div class="m399CloudIdentity"><span id="m399CloudIdentityText"></span><button type="button" id="m399CloudSignOut">Sign Out</button></div>',
      '<div class="m399CloudLogin"><label class="m399CloudWide">Device name<input type="text" id="m399CloudDeviceIn"></label></div>',
      '<div class="m399CloudActions"><button type="button" class="primary" id="m399CloudUpload">Upload Current <span id="m399CloudTypeLabel"></span></button><button type="button" id="m399CloudRefresh">Refresh Cloud List</button></div>',
      '<div class="m399CloudNote">Manual sync only. Uploading never disables local saving. Downloading requires confirmation and replaces only the current local document type.</div>',
      '<div id="m399CloudDocs" class="m399CloudDocs"></div>',
      '</div>',
      '<div id="m399CloudStatus" class="m399CloudStatus">Cloud sync is ready.</div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m399CloudClose").addEventListener("click", function(){ modal.classList.remove("show"); });
    byId("m399CloudSignIn").addEventListener("click", signIn);
    byId("m399CloudSignOut").addEventListener("click", signOut);
    byId("m399CloudUpload").addEventListener("click", uploadCurrent);
    byId("m399CloudRefresh").addEventListener("click", refreshCloudList);
    byId("m399CloudDeviceIn").addEventListener("change", function(){ saveDeviceName(this.value); });
    return modal;
  }

  function refreshAuthUI() {
    var out = byId("m399CloudSignedOut"), inside = byId("m399CloudSignedIn");
    if (!out || !inside) return;
    out.style.display = currentUser ? "none" : "block";
    inside.style.display = currentUser ? "block" : "none";
    var d = deviceName();
    if (byId("m399CloudDeviceOut")) byId("m399CloudDeviceOut").value = d;
    if (byId("m399CloudDeviceIn")) byId("m399CloudDeviceIn").value = d;
    if (byId("m399CloudTypeLabel")) byId("m399CloudTypeLabel").textContent = docTypeLabel(docType());
    if (currentUser && byId("m399CloudIdentityText")) byId("m399CloudIdentityText").textContent = "Signed in: " + (currentUser.email || currentUser.uid);
  }

  function openCloud() {
    closeMenu();
    var type = docType();
    if (!type) { alert("Open a Drill Log or Shot Diagram before using Cloud Sync."); return; }
    var modal = ensureModal();
    modal.classList.add("show");
    setStatus("Connecting to Firebase…", "wait");
    loadFirebase().then(function (fb) {
      currentUser = fb.auth.currentUser || currentUser;
      refreshAuthUI();
      if (currentUser) refreshCloudList(); else setStatus("Sign in to access your private cloud documents.", "");
    }).catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }

  function signIn() {
    var email = text(byId("m399CloudEmail").value), password = byId("m399CloudPassword").value;
    saveDeviceName(byId("m399CloudDeviceOut").value);
    if (!email || !password) { setStatus("Enter the account email and password.", "bad"); return; }
    setStatus("Signing in…", "wait");
    loadFirebase().then(function (fb) { return fb.authMod.signInWithEmailAndPassword(fb.auth, email, password); })
      .then(function (cred) { currentUser = cred.user; byId("m399CloudPassword").value = ""; refreshAuthUI(); setStatus("Signed in successfully.", "good"); return refreshCloudList(); })
      .catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }
  function signOut() {
    setStatus("Signing out…", "wait");
    loadFirebase().then(function (fb) { return fb.authMod.signOut(fb.auth); })
      .then(function () { currentUser = null; refreshAuthUI(); byId("m399CloudDocs").innerHTML = ""; setStatus("Signed out. Local MITHRIL data remains on this device.", "good"); })
      .catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }

  function currentPayload() {
    try { if (typeof saveState === "function") saveState(); } catch (error) {}
    var type = docType();
    if (!type) return null;
    var pages = typeof pagesData !== "undefined" ? clone(pagesData) : {};
    var meta = typeof pageMeta !== "undefined" ? clone(pageMeta) : {};
    var header = typeof headerData !== "undefined" ? clone(headerData) : {};
    var viewData = typeof view !== "undefined" ? clone(view) : null;
    var current = typeof currentPage !== "undefined" ? Number(currentPage) : 1;
    var job = type === "drillLog" ? text(header.Job) : text(header.JobName);
    var number = type === "drillLog" ? text(header.DrillLogNumber) : text(header.ShotID);
    var date = type === "drillLog" ? text(header.Date) : text(header.FieldDate);
    var person = type === "drillLog" ? text(header.Employee) : text(header.Blaster);
    return {
      schemaVersion: 1,
      mithrilVersion: RELEASE_VERSION,
      type: type,
      title: [job, number].filter(Boolean).join(" — ") || (docTypeLabel(type) + " — Untitled"),
      jobName: job,
      documentNumber: number,
      fieldDate: date,
      person: person,
      holeCount: countHoles(pages),
      payload: { pagesData: pages, pageMeta: meta, headerData: header, currentPage: current, view: viewData }
    };
  }
  function logicalId(data) {
    var raw = [data.type, data.jobName || "no-job", data.documentNumber || data.fieldDate || "untitled"].join("__").toLowerCase();
    var slug = raw.replace(/[^a-z0-9_-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,120);
    return slug || (data.type + "__untitled");
  }

  function uploadCurrent() {
    if (!currentUser) { setStatus("Sign in before uploading.", "bad"); return; }
    var data = currentPayload(); if (!data) { setStatus("MITHRIL could not read the current document.", "bad"); return; }
    saveDeviceName(byId("m399CloudDeviceIn").value);
    var id = logicalId(data);
    setStatus("Checking the cloud revision…", "wait");
    loadFirebase().then(function (fb) {
      var ref = fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", id);
      return fb.storeMod.getDoc(ref).then(function (snap) {
        var existing = snap.exists() ? snap.data() : null;
        var revision = existing && Number(existing.revision) ? Number(existing.revision) + 1 : 1;
        if (existing) {
          var when = existing.updatedAt && existing.updatedAt.toDate ? existing.updatedAt.toDate().toLocaleString() : "an earlier time";
          var ok = confirm("A cloud copy already exists.\n\nCloud revision: " + (existing.revision || 1) + "\nSaved from: " + (existing.sourceDevice || "Unknown device") + "\nUpdated: " + when + "\n\nUpload this device as revision " + revision + "?");
          if (!ok) throw { cancelled: true };
        }
        var record = clone(data);
        record.ownerUid = currentUser.uid;
        record.revision = revision;
        record.sourceDevice = deviceName();
        record.updatedBy = currentUser.email || currentUser.uid;
        record.updatedAt = fb.storeMod.serverTimestamp();
        record.createdAt = existing && existing.createdAt ? existing.createdAt : fb.storeMod.serverTimestamp();
        return fb.storeMod.setDoc(ref, record).then(function(){ return revision; });
      });
    }).then(function (revision) {
      setStatus(data.title + " uploaded as revision " + revision + ".", "good");
      return refreshCloudList();
    }).catch(function (error) {
      if (error && error.cancelled) { setStatus("Upload cancelled. Nothing was changed.", ""); return; }
      setStatus(friendlyError(error), "bad");
    });
  }

  function formatTime(value) {
    try { if (value && value.toDate) return value.toDate().toLocaleString(); } catch (error) {}
    return "Pending server timestamp";
  }
  function refreshCloudList() {
    if (!currentUser) return Promise.resolve();
    var type = docType();
    setStatus("Loading private cloud documents…", "wait");
    return loadFirebase().then(function (fb) {
      var col = fb.storeMod.collection(fb.db, "users", currentUser.uid, "documents");
      return fb.storeMod.getDocs(col).then(function (snap) {
        var docs = [];
        snap.forEach(function (item) { var d = item.data(); if (d && d.type === type) docs.push({ id: item.id, data: d }); });
        docs.sort(function(a,b){
          var at=a.data.updatedAt&&a.data.updatedAt.seconds||0, bt=b.data.updatedAt&&b.data.updatedAt.seconds||0; return bt-at;
        });
        renderDocs(docs);
        setStatus(docs.length ? (docs.length + " cloud " + docTypeLabel(type) + (docs.length===1?"":"s") + " found.") : ("No cloud " + docTypeLabel(type) + "s have been uploaded yet."), docs.length ? "good" : "");
      });
    }).catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }
  function renderDocs(items) {
    var box = byId("m399CloudDocs"); if (!box) return;
    box.innerHTML = "";
    items.forEach(function (item) {
      var d = item.data, row = document.createElement("div");
      row.className = "m399CloudDoc";
      row.innerHTML = '<div><div class="m399CloudDocTitle">' + escapeHtml(d.title || docTypeLabel(d.type)) + '</div><div class="m399CloudMeta">Revision ' + escapeHtml(d.revision || 1) + ' • ' + escapeHtml(d.holeCount || 0) + ' populated holes<br>' + escapeHtml(formatTime(d.updatedAt)) + ' • ' + escapeHtml(d.sourceDevice || "Unknown device") + '</div></div><div class="m399CloudDocActions"><button type="button" class="primary">Open on This Device</button><button type="button" class="danger">Delete Cloud Copy</button></div>';
      var buttons = row.querySelectorAll("button");
      buttons[0].addEventListener("click", function(){ downloadDocument(item.id, d); });
      buttons[1].addEventListener("click", function(){ deleteDocument(item.id, d); });
      box.appendChild(row);
    });
  }

  function saveDownloadedState(data) {
    var p = data && data.payload;
    if (!p || !p.pagesData || !p.headerData) throw new Error("The cloud document does not contain a valid MITHRIL payload.");
    pagesData = clone(p.pagesData);
    pageMeta = clone(p.pageMeta || {});
    headerData = clone(p.headerData || {});
    var keys = Object.keys(pagesData || {}).sort(function(a,b){ return Number(a)-Number(b); });
    currentPage = Number(p.currentPage) || Number(keys[0]) || 1;
    if (!pagesData[String(currentPage)]) currentPage = Number(keys[0]) || 1;
    if (isShot()) holeData = pagesData[String(currentPage)] || {};
    if (p.view && typeof view !== "undefined") view = clone(p.view);
    if (typeof saveState === "function") saveState();
  }
  function showCloudToast(message) {
    var old = byId("m399CloudToast");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var toast = document.createElement("div");
    toast.id = "m399CloudToast";
    toast.className = "m399CloudToast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function(){
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 5000);
  }
  function refreshDownloadedDocument(data) {
    var label = data.title || docTypeLabel(data.type);
    var revision = data.revision || 1;
    if (isDrill()) {
      try { if (typeof ensurePageMeta === "function") ensurePageMeta(); } catch (error1) {}
      try { if (typeof invalidatePageCache === "function") invalidatePageCache(); } catch (error2) {}
      try { if (typeof refreshPageSelect === "function") refreshPageSelect(); } catch (error3) {}
      try { if (typeof updateQuickBar === "function") updateQuickBar(); } catch (error4) {}
      try {
        if (typeof resizeCanvas === "function") resizeCanvas();
        else if (typeof draw === "function") draw();
      } catch (error5) {}
      var modal = byId("m399CloudModal");
      if (modal) modal.classList.remove("show");
      showCloudToast(label + " — cloud revision " + revision + " loaded successfully.");
      return;
    }
    try {
      sessionStorage.setItem("mithrilCloudDownloadNoticeM399", JSON.stringify({ title: label, revision: revision }));
    } catch (error6) {}
    setStatus(label + " downloaded. Refreshing the Shot Diagram…", "good");
    setTimeout(function(){ window.location.reload(); }, 500);
  }
  function downloadDocument(id, data) {
    var warning = "Open cloud revision " + (data.revision || 1) + " of:\n\n" + (data.title || docTypeLabel(data.type)) + "\nSaved from " + (data.sourceDevice || "Unknown device") + "\n\nThis replaces the current local " + docTypeLabel(data.type) + " on this device. Make a local JSON backup first if you need to preserve it.";
    if (!confirm(warning)) { setStatus("Download cancelled. Nothing was changed.", ""); return; }
    setStatus("Downloading and applying the cloud document…", "wait");
    try {
      saveDownloadedState(data);
      refreshDownloadedDocument(data);
    } catch (error) { setStatus(friendlyError(error), "bad"); }
  }
  function deleteDocument(id, data) {
    if (!confirm("Delete this cloud copy?\n\n" + (data.title || docTypeLabel(data.type)) + "\n\nThe local copy on this device will not be deleted.")) return;
    setStatus("Deleting cloud copy…", "wait");
    loadFirebase().then(function (fb) { return fb.storeMod.deleteDoc(fb.storeMod.doc(fb.db, "users", currentUser.uid, "documents", id)); })
      .then(function(){ setStatus("Cloud copy deleted. Local data was not changed.", "good"); return refreshCloudList(); })
      .catch(function(error){ setStatus(friendlyError(error), "bad"); });
  }

  function insertMenuButton() {
    var menu = byId("menuModal"); if (!menu || byId("m399CloudSyncButton")) return false;
    var stack = menu.querySelector(".m395MenuStack");
    var target = stack || menu.querySelector(".menuGrid");
    if (!target) return false;
    var button = document.createElement("button");
    button.id = "m399CloudSyncButton"; button.type = "button"; button.textContent = "Cloud Sync";
    button.addEventListener("click", openCloud);
    if (stack) {
      var group = document.createElement("div"); group.className = "m395MenuGroup";
      var title = document.createElement("div"); title.className = "m395MenuGroupTitle"; title.textContent = "Cloud";
      var grid = document.createElement("div"); grid.className = "m395ActionGrid"; grid.appendChild(button);
      group.appendChild(title); group.appendChild(grid); stack.appendChild(group);
    } else { button.className = "wide"; target.appendChild(button); }
    return true;
  }

  function injectIntoShotFrame() {
    var frame = byId("shotFrame"); if (!frame) return;
    function inject() {
      try {
        var doc = frame.contentDocument; if (!doc || !doc.head || doc.getElementById(SCRIPT_ID)) return;
        var script = doc.createElement("script"); script.id = SCRIPT_ID; script.src = SCRIPT_SRC; doc.head.appendChild(script);
      } catch (error) { console.warn("MITHRIL m39.9 could not inject Cloud Sync into the Shot Diagram frame.", error); }
    }
    frame.addEventListener("load", function(){ setTimeout(inject, 80); });
    setTimeout(inject, 150);
  }
  function updateVersionLabels() {
    var labels = document.querySelectorAll(".version,.startVersion,.updateHomeVersion");
    Array.prototype.forEach.call(labels, function (el) {
      var v = text(el.textContent);
      if (/installed version:/i.test(v)) el.textContent = "Installed version: " + RELEASE_VERSION;
      else if (/^m\d/i.test(v)) el.textContent = RELEASE_VERSION + " cloud sync prototype";
      else if (/m\d+\.\d+/i.test(v)) el.textContent = v.replace(/m\d+(?:\.\d+)+/i, RELEASE_VERSION);
    });
    if (/MITHRIL/i.test(document.title)) document.title = document.title.replace(/m\d+(?:\.\d+)+/i, RELEASE_VERSION);
    if (window.MITHRIL_UPDATE_CONFIG) window.MITHRIL_UPDATE_CONFIG.currentVersion = RELEASE_VERSION;
  }
  function boot() {
    updateVersionLabels();
    try {
      var rawNotice = sessionStorage.getItem("mithrilCloudDownloadNoticeM399");
      if (rawNotice && isShot()) {
        sessionStorage.removeItem("mithrilCloudDownloadNoticeM399");
        var notice = JSON.parse(rawNotice);
        ensureStyles();
        setTimeout(function(){ showCloudToast((notice.title || "Shot Diagram") + " — cloud revision " + (notice.revision || 1) + " loaded successfully."); }, 250);
      }
    } catch (noticeError) {}
    if (isWrapper()) injectIntoShotFrame();
    var tries = 0, timer = setInterval(function(){
      tries += 1; updateVersionLabels();
      if (isWrapper()) injectIntoShotFrame();
      if (isDrill() || isShot()) insertMenuButton();
      if (tries >= 40) clearInterval(timer);
    }, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
