(function () {
  "use strict";

  if (window.__mithrilCompanyCloudM40969Installed) return;
  window.__mithrilCompanyCloudM40969Installed = true;

  var RELEASE_VERSION = "m40.9.6.9";
  var FIREBASE_VERSION = "12.16.0";
  var ORGANIZATION_ID = "trinity";
  var ORGANIZATION_NAME = "Trinity";
  var PROFILE_COLLECTION = "userProfiles";
  var PENDING_KEY = "mithrilSharedCloudPendingM40969";
  var SYNC_PREFIX = "mithrilSharedCloudSyncM40969:";
  var RECOVERY_PREFIX = "mithrilSharedCloudRecoveryM40969:";
  var DEVICE_KEY = "mithrilCloudDeviceNameM399";
  var LAST_VERIFIED_USER_KEY = "mithrilLastVerifiedUserM404";

  var firebaseConfig = {
    apiKey: ["AIzaSyBOb0pXdI", "DMqr5mMKdKOCpP84jSRjyjnhY"].join(""),
    authDomain: "mithril-mobile.firebaseapp.com",
    projectId: "mithril-mobile",
    storageBucket: "mithril-mobile.firebasestorage.app",
    messagingSenderId: "797958678485",
    appId: "1:797958678485:web:e19ab69e74e00cd8587f5c"
  };

  var fbPromise = null;
  var currentUser = null;
  var currentProfile = null;
  var sharedItems = [];
  var modal = null;
  var statusNode = null;
  var docsNode = null;
  var landingRefreshTimer = null;
  var authReady = false;

  function byId(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? "" : value).trim(); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch (error) { return null; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { return false; }
  }
  function currentRole() { return text(currentProfile && currentProfile.role).toLowerCase() || "member"; }
  function activeProfile() { return !!currentProfile && !/^(?:disabled|inactive)$/i.test(text(currentProfile.status)); }
  function isAdmin() { return activeProfile() && currentRole() === "administrator"; }
  function isBlaster() { return activeProfile() && currentRole() === "blaster"; }
  function isDriller() { return activeProfile() && currentRole() === "driller"; }
  function isDriver() { return activeProfile() && currentRole() === "driver"; }
  function isViewer() { return activeProfile() && currentRole() === "viewer"; }
  function operationalType(type) { return type === "shotDiagram" || type === "drillLog"; }
  function canReadShared() { return isAdmin() || isBlaster() || isDriller() || isDriver() || isViewer(); }
  function canOpenType(type) {
    if (isAdmin() || isBlaster() || isViewer()) return operationalType(type);
    if (isDriller()) return type === "drillLog";
    if (isDriver()) return type === "shotDiagram";
    return false;
  }
  function canCreateType(type) {
    if (isAdmin() || isBlaster()) return operationalType(type);
    if (isDriller()) return type === "drillLog";
    if (isDriver()) return type === "shotDiagram";
    return false;
  }
  function canEditRecord(data) {
    data = data || {};
    if (isAdmin() || isBlaster()) return operationalType(data.type);
    if (!currentUser || text(data.createdByUid) !== currentUser.uid) return false;
    if (isDriller()) return data.type === "drillLog";
    if (isDriver()) return data.type === "shotDiagram";
    return false;
  }
  function canWriteType(type) { return canCreateType(type); }
  function canDeleteShared() { return isAdmin(); }
  function roleLabel(role) {
    var labels = { administrator: "Administrator", blaster: "Blaster", driller: "Driller", driver: "Driver", viewer: "Viewer", member: "Pending" };
    return labels[text(role).toLowerCase()] || "Pending";
  }
  function docLabel(type) { return type === "shotDiagram" ? "Shot Diagram" : "Drill Log"; }
  function deviceName() {
    try { return text(localStorage.getItem(DEVICE_KEY)) || "Unnamed device"; }
    catch (error) { return "Unnamed device"; }
  }
  function adapter() { return window.MithrilDocument || null; }
  function workspaceType() { var a = adapter(); return a && a.type || ""; }
  function sharedCollection(fb) {
    return fb.storeMod.collection(fb.db, "organizations", ORGANIZATION_ID, "documents");
  }
  function sharedDoc(fb, id) {
    return fb.storeMod.doc(fb.db, "organizations", ORGANIZATION_ID, "documents", id);
  }
  function profileRef(fb, uid) { return fb.storeMod.doc(fb.db, PROFILE_COLLECTION, uid); }
  function formatTime(value) {
    try { if (value && value.toDate) return value.toDate().toLocaleString(); }
    catch (error) {}
    return "Pending server timestamp";
  }
  function serverSeconds(value) { return value && Number(value.seconds) || 0; }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    }).join(",") + "}";
  }
  function hashString(value) {
    var input = String(value || ""), hash = 2166136261;
    for (var i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return ("00000000" + hash.toString(16)).slice(-8);
  }
  function fingerprint(snapshot) {
    var clean = clone(snapshot || {});
    return hashString(stableStringify(clean));
  }
  function syncKey(id) { return SYNC_PREFIX + ORGANIZATION_ID + ":" + id; }
  function recoveryKey(id) { return RECOVERY_PREFIX + ORGANIZATION_ID + ":" + id; }
  function readSync(id) { return readJson(syncKey(id)); }
  function writeSync(id, revision, snapshot, record) {
    return writeJson(syncKey(id), {
      documentId: id,
      revision: Number(revision || 0),
      fingerprint: fingerprint(snapshot),
      cloudFingerprint: text(record && record.fingerprint) || fingerprint(record && record.payload),
      syncedAt: new Date().toISOString()
    });
  }

  function loadFirebase() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-firestore.js")
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], storeMod = mods[2], app;
      app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
      var auth = authMod.getAuth(app), db = storeMod.getFirestore(app);
      try { authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (error) {}
      return { app: app, auth: auth, db: db, authMod: authMod, storeMod: storeMod };
    });
    return fbPromise;
  }

  function normalizeProfile(user, data) {
    data = data || {};
    return {
      uid: text(data.uid) || text(user && user.uid),
      email: text(data.email) || text(user && user.email),
      displayName: text(data.displayName) || text(user && user.displayName) || text(user && user.email).split("@")[0] || "MITHRIL User",
      role: text(data.role).toLowerCase() || "member",
      status: text(data.status).toLowerCase() || "active"
    };
  }
  function loadProfile(fb, user) {
    return fb.storeMod.getDoc(profileRef(fb, user.uid)).then(function (snap) {
      currentProfile = normalizeProfile(user, snap.exists() ? snap.data() : null);
      return currentProfile;
    }).catch(function () {
      var cached = readJson(LAST_VERIFIED_USER_KEY);
      currentProfile = normalizeProfile(user, cached && cached.uid === user.uid ? cached : null);
      return currentProfile;
    });
  }

  function showToast(message, bad) {
    var node = document.createElement("div");
    node.setAttribute("role", bad ? "alert" : "status");
    node.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:35000;max-width:min(720px,calc(100vw - 24px));padding:12px 16px;border:2px solid " + (bad ? "#b42318" : "#2f8a45") + ";border-radius:10px;background:" + (bad ? "#ffeaea" : "#e9f8ec") + ";color:" + (bad ? "#720000" : "#173d20") + ";font:800 14px/1.35 Arial,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35)";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, bad ? 7000 : 4200);
  }
  function setStatus(message, kind) {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.className = "m40969Status " + (kind || "");
  }
  function friendlyError(error) {
    var code = text(error && error.code), message = text(error && error.message);
    if (/permission-denied/i.test(code + " " + message)) return "Firebase blocked this action. Confirm the m40.9.6.9 Firestore rules were published.";
    if (/unavailable|network|offline/i.test(code + " " + message)) return "The shared cloud could not be reached. Check the internet connection and try again.";
    return message || "The shared cloud action could not be completed.";
  }

  function buildRecord() {
    var a = adapter();
    if (!a) return null;
    var info = a.getInfo(), snapshot = a.getSnapshot();
    var id = text(snapshot.documentId);
    if (!id) return null;
    return {
      schemaVersion: 4,
      mithrilVersion: RELEASE_VERSION,
      documentContractVersion: Number(a.contractVersion || 3),
      organizationId: ORGANIZATION_ID,
      type: a.type,
      documentId: id,
      identityCreatedAt: text(snapshot.identityCreatedAt),
      legacyCloudId: text(snapshot.legacyCloudId),
      sourceDocumentId: text(snapshot.sourceDocumentId),
      title: text(info.title) || docLabel(a.type),
      jobName: text(info.jobName),
      documentNumber: text(info.documentNumber),
      fieldDate: text(info.fieldDate),
      person: text(info.person),
      holeCount: Number(info.holeCount || 0),
      loadedHoleCount: Number(info.loadedHoleCount != null ? info.loadedHoleCount : info.holeCount || 0),
      payload: snapshot,
      fingerprint: fingerprint(snapshot)
    };
  }

  function fetchSharedDocuments(type) {
    if (!currentUser || !canReadShared()) return Promise.resolve([]);
    return loadFirebase().then(function (fb) {
      var target = sharedCollection(fb);
      var query = target;
      if (isDriller()) query = fb.storeMod.query(target, fb.storeMod.where("type", "==", "drillLog"));
      else if (isDriver()) query = fb.storeMod.query(target, fb.storeMod.where("type", "==", "shotDiagram"));
      else if (type) query = fb.storeMod.query(target, fb.storeMod.where("type", "==", type));
      return fb.storeMod.getDocs(query).then(function (snap) {
        var items = [];
        snap.forEach(function (item) {
          var data = item.data();
          if (!data || (data.type !== "shotDiagram" && data.type !== "drillLog")) return;
          if (type && data.type !== type) return;
          items.push({ id: item.id, data: data });
        });
        items.sort(function (a, b) { return serverSeconds(b.data.updatedAt) - serverSeconds(a.data.updatedAt); });
        sharedItems = items;
        return items;
      });
    });
  }

  function renderDocs(items) {
    if (!docsNode) return;
    docsNode.innerHTML = "";
    if (!items.length) {
      docsNode.innerHTML = '<div class="m40969Empty">No shared ' + escapeHtml(docLabel(workspaceType())) + 's have been uploaded yet.</div>';
      return;
    }
    items.forEach(function (item) {
      var data = item.data, row = document.createElement("div");
      row.className = "m40969Doc";
      row.innerHTML = [
        '<div class="m40969DocInfo"><strong>' + escapeHtml(data.title || docLabel(data.type)) + '</strong>',
        '<span>' + escapeHtml(docLabel(data.type)) + ' · Revision ' + escapeHtml(data.revision || 1) + ' · ' + escapeHtml(data.loadedHoleCount != null ? data.loadedHoleCount : data.holeCount || 0) + ' loaded holes</span>',
        '<span>Created by ' + escapeHtml(data.createdByName || data.createdByUid || "Unknown user") + ' · Updated ' + escapeHtml(formatTime(data.updatedAt)) + ' · ' + escapeHtml(data.updatedByName || data.updatedBy || "Unknown user") + '</span>',
        '<span>' + (canEditRecord(data) ? 'Editable with your current role' : 'View only — only the creator, a Blaster, or an Administrator can update this file') + '</span></div>',
        '<div class="m40969DocActions"><button type="button" class="m40969Open">Open</button>' + (canDeleteShared() ? '<button type="button" class="m40969Delete">Delete</button>' : '') + '</div>'
      ].join("");
      row.querySelector(".m40969Open").addEventListener("click", function () { openSharedDocument(item.id, data); });
      var del = row.querySelector(".m40969Delete");
      if (del) del.addEventListener("click", function () { deleteSharedDocument(item.id, data); });
      docsNode.appendChild(row);
    });
  }

  function refreshSharedList() {
    var type = workspaceType();
    if (!type) return Promise.resolve();
    setStatus("Loading " + ORGANIZATION_NAME + " shared documents…", "wait");
    return fetchSharedDocuments(type).then(function (items) {
      renderDocs(items);
      setStatus(items.length + " shared " + docLabel(type) + (items.length === 1 ? "" : "s") + " found.", items.length ? "good" : "");
    }).catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }

  function saveSharedDocument(force) {
    var record = buildRecord();
    if (!record) return setStatus("MITHRIL could not read the current document.", "bad");
    if (!canCreateType(record.type)) return setStatus("Your role cannot create or upload this document type.", "bad");
    setStatus("Checking the shared cloud revision…", "wait");
    loadFirebase().then(function (fb) {
      var ref = sharedDoc(fb, record.documentId);
      return fb.storeMod.getDoc(ref).then(function (snap) {
        var existing = snap.exists() ? snap.data() : null;
        if (existing && !canEditRecord(existing)) {
          throw new Error("VIEW ONLY: this file was created by " + (existing.createdByName || "another user") + ". Only its creator, a Blaster, or an Administrator can upload changes.");
        }
        if (!existing && !canCreateType(record.type)) {
          throw new Error("Your role cannot create this document type.");
        }
        var sync = readSync(record.documentId);
        if (existing && !force) {
          var cloudRevision = Number(existing.revision || 1);
          var lastRevision = Number(sync && sync.revision || 0);
          var localChanged = !sync || sync.fingerprint !== record.fingerprint;
          var cloudChanged = lastRevision && cloudRevision > lastRevision;
          if (cloudChanged && localChanged) {
            throw new Error("SYNC CONFLICT: the shared cloud and this device both changed. Open the cloud copy or make a JSON backup before resolving it.");
          }
          if (existing.fingerprint === record.fingerprint) {
            writeSync(record.documentId, cloudRevision, record.payload, existing);
            return { unchanged: true, revision: cloudRevision, record: existing };
          }
          if (!window.confirm("Upload this device as a new shared revision of:\n\n" + record.title + "\n\nCurrent shared revision: " + cloudRevision)) {
            throw { cancelled: true };
          }
        }
        var revision = existing ? Number(existing.revision || 1) + 1 : 1;
        record.revision = revision;
        record.ownerUid = existing && existing.ownerUid || currentUser.uid;
        record.createdByUid = existing && existing.createdByUid || currentUser.uid;
        record.createdByName = existing && existing.createdByName || (currentProfile.displayName || currentProfile.email);
        record.updatedByUid = currentUser.uid;
        record.updatedBy = currentUser.email || currentUser.uid;
        record.updatedByName = currentProfile.displayName || currentProfile.email || currentUser.email;
        record.sourceDevice = deviceName();
        record.createdAt = existing && existing.createdAt || fb.storeMod.serverTimestamp();
        record.updatedAt = fb.storeMod.serverTimestamp();
        return fb.storeMod.setDoc(ref, record).then(function () { return { revision: revision, record: record }; });
      });
    }).then(function (result) {
      if (!result) return;
      writeSync(record.documentId, result.revision, record.payload, result.record);
      setStatus(result.unchanged ? "The device already matches shared revision " + result.revision + "." : record.title + " uploaded as shared revision " + result.revision + ".", "good");
      refreshSharedList();
      refreshLandingSharedDocuments(true);
    }).catch(function (error) {
      if (error && error.cancelled) return setStatus("Upload cancelled. Nothing changed.", "");
      setStatus(friendlyError(error), "bad");
    });
  }

  function openSharedDocument(id, data, skipConfirm) {
    var a = adapter();
    if (!a) return;
    if (!canOpenType(data && data.type)) return showToast("Your role cannot open this document type.", true);
    if (!skipConfirm && !window.confirm("Open shared revision " + (data.revision || 1) + " of:\n\n" + (data.title || docLabel(data.type)) + "\n\nThis replaces the current device copy.")) return;
    try {
      var current = a.getSnapshot();
      writeJson(recoveryKey(id), { savedAt: new Date().toISOString(), snapshot: current, sync: readSync(id) });
      a.applySnapshot(clone(data.payload), { markDirty: false, fitAll: data.type === "shotDiagram" });
      writeSync(id, Number(data.revision || 1), data.payload, data);
      if (modal) modal.classList.remove("show");
      showToast((data.title || docLabel(data.type)) + " loaded from the " + ORGANIZATION_NAME + " shared cloud.");
    } catch (error) { setStatus(friendlyError(error), "bad"); }
  }

  function undoSharedDownload() {
    var record = buildRecord();
    if (!record) return;
    var recovery = readJson(recoveryKey(record.documentId));
    if (!recovery || !recovery.snapshot) return setStatus("No shared-cloud recovery copy is available for this document.", "bad");
    if (!window.confirm("Restore the device document as it was before the last shared-cloud download?")) return;
    try {
      adapter().applySnapshot(recovery.snapshot, { markDirty: true, fitAll: workspaceType() === "shotDiagram" });
      if (recovery.sync) writeJson(syncKey(record.documentId), recovery.sync);
      else localStorage.removeItem(syncKey(record.documentId));
      localStorage.removeItem(recoveryKey(record.documentId));
      setStatus("The previous device copy was restored.", "good");
    } catch (error) { setStatus(friendlyError(error), "bad"); }
  }

  function deleteSharedDocument(id, data) {
    if (!canDeleteShared()) return setStatus("Only an administrator can delete shared documents.", "bad");
    if (!window.confirm("Permanently delete this shared cloud document?\n\n" + (data.title || docLabel(data.type)) + "\n\nDevice copies will not be deleted.")) return;
    setStatus("Deleting shared cloud document…", "wait");
    loadFirebase().then(function (fb) { return fb.storeMod.deleteDoc(sharedDoc(fb, id)); })
      .then(function () { setStatus("Shared cloud document deleted.", "good"); refreshSharedList(); refreshLandingSharedDocuments(true); })
      .catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }

  function migratePrivateDocuments() {
    if (!isAdmin() || !currentUser) return setStatus("Only an administrator can run migration.", "bad");
    if (!window.confirm("Copy your existing private MITHRIL cloud documents into the Trinity shared cloud?\n\nPrivate originals will not be deleted.")) return;
    setStatus("Scanning private cloud documents…", "wait");
    loadFirebase().then(function (fb) {
      var legacy = fb.storeMod.collection(fb.db, "users", currentUser.uid, "documents");
      return fb.storeMod.getDocs(legacy).then(function (snap) {
        var records = [];
        snap.forEach(function (item) {
          var data = item.data();
          if (data && (data.type === "shotDiagram" || data.type === "drillLog") && item.id !== "__mithril_user_profile__") records.push({ id: text(data.documentId) || item.id, data: data });
        });
        var copied = 0, skipped = 0;
        var sequence = Promise.resolve();
        records.forEach(function (item) {
          sequence = sequence.then(function () {
            var target = sharedDoc(fb, item.id);
            return fb.storeMod.getDoc(target).then(function (existing) {
              if (existing.exists()) { skipped += 1; return; }
              var data = clone(item.data);
              data.organizationId = ORGANIZATION_ID;
              data.documentId = item.id;
              data.mithrilVersion = RELEASE_VERSION;
              data.ownerUid = data.ownerUid || currentUser.uid;
              data.createdByUid = data.createdByUid || currentUser.uid;
              data.createdByName = data.createdByName || currentProfile.displayName || currentProfile.email;
              data.updatedByUid = currentUser.uid;
              data.updatedBy = currentUser.email || currentUser.uid;
              data.updatedByName = currentProfile.displayName || currentProfile.email;
              data.migratedFromPrivateCloud = true;
              data.migratedAt = fb.storeMod.serverTimestamp();
              data.updatedAt = fb.storeMod.serverTimestamp();
              if (!data.createdAt) data.createdAt = fb.storeMod.serverTimestamp();
              data.fingerprint = text(data.fingerprint) || fingerprint(data.payload);
              return fb.storeMod.setDoc(target, data).then(function () { copied += 1; });
            });
          });
        });
        return sequence.then(function () { return { found: records.length, copied: copied, skipped: skipped }; });
      });
    }).then(function (result) {
      setStatus("Migration complete: " + result.copied + " copied, " + result.skipped + " already present, " + result.found + " private operational documents found. Private originals were retained.", "good");
      refreshSharedList();
      refreshLandingSharedDocuments(true);
    }).catch(function (error) { setStatus(friendlyError(error), "bad"); });
  }

  function ensureStyles() {
    if (byId("m40969SharedCloudStyles")) return;
    var style = document.createElement("style");
    style.id = "m40969SharedCloudStyles";
    style.textContent = [
      ".m40969Modal{display:none;position:fixed;inset:0;z-index:32000;background:rgba(0,0,0,.72);padding:12px;overflow:auto;font-family:Arial,sans-serif}",
      ".m40969Modal.show{display:flex;align-items:flex-start;justify-content:center}",
      ".m40969Box{width:min(880px,100%);margin:auto;background:#fff;color:#111;border:2px solid #586b82;border-radius:14px;overflow:hidden;box-shadow:0 14px 44px rgba(0,0,0,.55)}",
      ".m40969Head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;background:#f5f7fa;border-bottom:1px solid #cbd3dc}.m40969Head strong{font-size:20px}.m40969Head span{display:block;font-size:12px;color:#5d6b7c;margin-top:2px;font-weight:800}",
      ".m40969Head button,.m40969Box button{min-height:44px;border:1px solid #7f8a97;border-radius:8px;padding:8px 11px;background:#f4f4f4;color:#111;font-weight:850;font-size:14px}",
      ".m40969Body{padding:14px}.m40969Identity{padding:10px;border:1px solid #9ab8df;border-radius:9px;background:#eef4ff;font-size:13px;font-weight:850}",
      ".m40969Actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0}.m40969Actions button.primary{background:#1f6feb;color:#fff;border-color:#1f6feb}.m40969Actions button.admin{background:#fff4d8;border-color:#c5a54a;color:#5f4800}",
      ".m40969Status{padding:10px;border:1px solid #aaa;border-radius:8px;background:#f5f5f5;font-size:13px;font-weight:800;line-height:1.4;margin-bottom:11px}.m40969Status.good{background:#e9f8ec;border-color:#61a86e}.m40969Status.bad{background:#ffeaea;border-color:#c66}.m40969Status.wait{background:#fff7d8;border-color:#c7aa45}",
      ".m40969OwnershipNote{margin:0 0 11px;padding:9px 10px;border:1px solid #b7c2cf;border-radius:8px;background:#f7f9fb;color:#465467;font-size:12px;font-weight:800;line-height:1.4}",
      ".m40969Docs{display:grid;gap:8px}.m40969Doc{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid #bdc6d1;border-radius:10px}.m40969DocInfo{display:grid;gap:3px}.m40969DocInfo strong{font-size:15px}.m40969DocInfo span{font-size:12px;color:#596777;font-weight:750}.m40969DocActions{display:flex;gap:7px}.m40969DocActions .m40969Delete{background:#fff0f0;border-color:#c66}.m40969Empty{padding:14px;border:1px dashed #aab3bf;border-radius:9px;color:#647181;font-weight:800;text-align:center}",
      ".m40969LandingBadge{margin:0 0 10px;padding:8px 10px;border:1px solid #87a8d2;border-radius:8px;background:#eaf3ff;color:#174f91;font-size:12px;font-weight:900}",
      ".m40969PendingOverlay{position:fixed;inset:0;z-index:31000;display:grid;place-items:center;padding:20px;background:rgba(10,16,24,.94);font-family:Arial,sans-serif}.m40969PendingCard{max-width:560px;padding:22px;border:2px solid #c7aa45;border-radius:14px;background:#fff7d8;color:#4f3d00;text-align:center;box-shadow:0 12px 36px rgba(0,0,0,.5)}.m40969PendingCard strong{display:block;font-size:24px;margin-bottom:8px}.m40969PendingCard p{font-size:15px;line-height:1.5;font-weight:750}.m40969PendingCard button{min-height:46px;padding:8px 14px;border:1px solid #7f6b2c;border-radius:8px;background:#fff;color:#3d3100;font-weight:900}",
      "@media(max-width:620px){.m40969Actions{grid-template-columns:1fr}.m40969Doc{grid-template-columns:1fr}.m40969DocActions{justify-content:stretch}.m40969DocActions button{flex:1}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (modal) return modal;
    ensureStyles();
    modal = document.createElement("div");
    modal.id = "m40969SharedCloudModal";
    modal.className = "m40969Modal";
    modal.innerHTML = [
      '<div class="m40969Box"><div class="m40969Head"><div><strong>' + ORGANIZATION_NAME + ' Shared Cloud</strong><span>MITHRIL ' + RELEASE_VERSION + ' · company operational records</span></div><button type="button" id="m40969Close">Close</button></div>',
      '<div class="m40969Body"><div id="m40969Identity" class="m40969Identity"></div>',
      '<div class="m40969Actions"><button type="button" class="primary" id="m40969Sync">Sync Current Document</button><button type="button" id="m40969Refresh">Refresh Shared List</button><button type="button" id="m40969Undo">Undo Shared Download</button><button type="button" class="admin" id="m40969Migrate">Copy My Private Cloud to Trinity</button></div>',
      '<div class="m40969OwnershipNote">Blasters may update all operational records. Drillers may update only Drill Logs they created. Drivers may update only Shot Diagrams they created.</div>',
      '<div id="m40969Status" class="m40969Status">Shared cloud is ready.</div><div id="m40969Docs" class="m40969Docs"></div></div></div>'
    ].join("");
    document.body.appendChild(modal);
    statusNode = byId("m40969Status");
    docsNode = byId("m40969Docs");
    byId("m40969Close").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m40969Sync").addEventListener("click", function () { saveSharedDocument(false); });
    byId("m40969Refresh").addEventListener("click", refreshSharedList);
    byId("m40969Undo").addEventListener("click", undoSharedDownload);
    byId("m40969Migrate").addEventListener("click", migratePrivateDocuments);
    return modal;
  }

  function openSharedCloud() {
    if (!authReady || !currentUser || !currentProfile) return showToast("Sign in on MITHRIL Home before using the shared cloud.", true);
    if (!canReadShared()) return showToast("This account is waiting for an administrator to assign a field role.", true);
    if (!adapter()) return showToast("Open a Drill Log or Shot Diagram before using Shared Cloud.", true);
    ensureModal();
    byId("m40969Identity").textContent = (currentProfile.displayName || currentProfile.email) + " · " + roleLabel(currentRole()) + " · " + ORGANIZATION_NAME;
    byId("m40969Sync").style.display = canCreateType(workspaceType()) ? "" : "none";
    byId("m40969Migrate").style.display = isAdmin() ? "" : "none";
    modal.classList.add("show");
    refreshSharedList();
  }
  window.MithrilSharedCloud = {
    version: RELEASE_VERSION,
    open: openSharedCloud,
    refresh: refreshSharedList,
    migrate: migratePrivateDocuments,
    canEditRecord: canEditRecord,
    canCreateType: canCreateType,
    canOpenType: canOpenType
  };

  function interceptOldCloudButtons() {
    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("#m400CloudSyncButton,#m4091HeaderSync") : null;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openSharedCloud();
    }, true);
  }

  function renderLandingSharedDocuments(force) {
    var host = byId("m407CloudRecent");
    if (!host || !currentUser || !canReadShared() || navigator.onLine === false) return Promise.resolve();
    if (!force && host.getAttribute("data-m40969-loading") === "true") return Promise.resolve();
    host.setAttribute("data-m40969-loading", "true");
    host.innerHTML = '<div class="m40969LandingBadge">' + ORGANIZATION_NAME + ' shared operational cloud · ' + escapeHtml(roleLabel(currentRole())) + '</div><div class="m40969Empty">Loading shared documents…</div>';
    return fetchSharedDocuments("").then(function (items) {
      host.innerHTML = '<div class="m40969LandingBadge">' + ORGANIZATION_NAME + ' shared operational cloud · ' + escapeHtml(roleLabel(currentRole())) + '</div>';
      if (!items.length) {
        host.innerHTML += '<div class="m40969Empty">No shared documents have been uploaded yet.</div>';
        return;
      }
      items.slice(0, 6).forEach(function (item) {
        var data = item.data, row = document.createElement("div"), button = document.createElement("button");
        row.className = "m407CloudItem";
        row.innerHTML = '<div><strong>' + escapeHtml(data.title || docLabel(data.type)) + '</strong><span>' + escapeHtml(docLabel(data.type)) + ' · Revision ' + escapeHtml(data.revision || 1) + ' · ' + escapeHtml(data.loadedHoleCount != null ? data.loadedHoleCount : data.holeCount || 0) + ' loaded holes</span></div>';
        button.type = "button";
        button.textContent = "Load cloud";
        button.addEventListener("click", function () { prepareLandingOpen(item.id, data); });
        row.appendChild(button);
        host.appendChild(row);
      });
    }).catch(function (error) {
      host.innerHTML = '<div class="m40969LandingBadge">' + ORGANIZATION_NAME + ' shared operational cloud</div><div class="m40969Empty">' + escapeHtml(friendlyError(error)) + '</div>';
    }).then(function () { host.setAttribute("data-m40969-loading", "false"); });
  }
  function refreshLandingSharedDocuments(force) {
    clearTimeout(landingRefreshTimer);
    landingRefreshTimer = setTimeout(function () { renderLandingSharedDocuments(force); }, 120);
  }

  function prepareLandingOpen(id, data) {
    if (!canReadShared() || !canOpenType(data && data.type)) return;
    var pending = { id: id, type: data.type, title: data.title, revision: Number(data.revision || 1), record: clone(data), selectedAt: new Date().toISOString() };
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending)); }
    catch (error) { return showToast("This browser could not prepare the shared document.", true); }
    if (data.type === "shotDiagram" && typeof window.openStableShotDiagram === "function") window.openStableShotDiagram();
    else if (data.type === "drillLog" && typeof window.openDrillLog === "function") window.openDrillLog();
  }
  function consumePending() {
    var a = adapter();
    if (!a) return;
    var pending;
    try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch (error) { pending = null; }
    if (!pending || pending.type !== a.type || !pending.record) return;
    try {
      sessionStorage.removeItem(PENDING_KEY);
      openSharedDocument(pending.id, pending.record, true);
    } catch (error2) { showToast(friendlyError(error2), true); }
  }

  function showPendingOverlay() {
    var existing = byId("m40969PendingOverlay");
    if (existing) return;
    ensureStyles();
    var overlay = document.createElement("div");
    overlay.id = "m40969PendingOverlay";
    overlay.className = "m40969PendingOverlay";
    overlay.innerHTML = '<div class="m40969PendingCard"><strong>Account awaiting role assignment</strong><p>This login is valid, but a MITHRIL administrator has not assigned it a Blaster, Driller, Driver, Viewer, or Administrator role yet.</p><button type="button">Return to MITHRIL Home</button></div>';
    overlay.querySelector("button").addEventListener("click", function () { window.location.href = "./index.html"; });
    document.body.appendChild(overlay);
  }
  function removePendingOverlay() {
    var overlay = byId("m40969PendingOverlay");
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  function enforcePendingRole() {
    if (!authReady || !currentProfile) return;
    var pending = currentRole() === "member" || !activeProfile();
    if (pending && adapter()) showPendingOverlay();
    else removePendingOverlay();
    var cards = document.querySelectorAll(".templateCards button,#m407ContinueButton");
    Array.prototype.forEach.call(cards, function (button) {
      if (button.getAttribute("data-m40969-original-disabled") == null) button.setAttribute("data-m40969-original-disabled", button.disabled ? "true" : "false");
      if (pending) button.disabled = true;
      else if (button.getAttribute("data-m40969-original-disabled") === "false") button.disabled = false;
    });
  }

  function bootAuth() {
    loadFirebase().then(function (fb) {
      fb.authMod.onAuthStateChanged(fb.auth, function (user) {
        currentUser = user || null;
        currentProfile = null;
        authReady = true;
        if (!user) {
          enforcePendingRole();
          return;
        }
        loadProfile(fb, user).then(function () {
          enforcePendingRole();
          refreshLandingSharedDocuments(true);
          consumePending();
        });
      });
    }).catch(function () {
      authReady = true;
      var cached = readJson(LAST_VERIFIED_USER_KEY);
      if (cached && cached.uid) currentProfile = normalizeProfile(cached, cached);
      enforcePendingRole();
    });
  }

  function boot() {
    ensureStyles();
    interceptOldCloudButtons();
    bootAuth();
    window.addEventListener("mithril-document-ready", function () { enforcePendingRole(); setTimeout(consumePending, 80); });
    window.addEventListener("online", function () { refreshLandingSharedDocuments(true); });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { setTimeout(function () { enforcePendingRole(); refreshLandingSharedDocuments(true); }, 100); });
    } else setTimeout(function () { enforcePendingRole(); refreshLandingSharedDocuments(true); }, 100);
    var observer = new MutationObserver(function () {
      if (byId("m407CloudRecent") && currentUser && canReadShared()) refreshLandingSharedDocuments(false);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  boot();
})();
