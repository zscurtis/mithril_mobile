(function () {
  "use strict";

  var RELEASE = "m40.9.6.9.9";
  var FIREBASE_VERSION = "12.16.0";
  var ORGANIZATION_ID = "trinity";
  var PROFILE_COLLECTION = "userProfiles";
  var PENDING_KEY = "mithrilSharedCloudPendingM40969";
  var firebaseConfig = {
    apiKey: ["AIzaSyBOb0pXdI", "DMqr5mMKdKOCpP84jSRjyjnhY"].join(""),
    authDomain: "mithril-mobile.firebaseapp.com",
    projectId: "mithril-mobile",
    storageBucket: "mithril-mobile.firebasestorage.app",
    messagingSenderId: "797958678485",
    appId: "1:797958678485:web:e19ab69e74e00cd8587f5c"
  };

  if (window.__mithrilCloudSearchM409698Installed) return;
  window.__mithrilCloudSearchM409698Installed = true;

  var fbPromise = null;
  var currentUser = null;
  var currentProfile = null;
  var documents = [];
  var jobs = [];
  var loadingPromise = null;
  var modal = null;

  function byId(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? "" : value).trim(); }
  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }
  function isLanding() { return !!byId("templateStart"); }
  function profileActive() {
    return !!currentProfile && !/^(?:disabled|inactive)$/i.test(text(currentProfile.status));
  }
  function role() { return text(currentProfile && currentProfile.role).toLowerCase() || "member"; }
  function canReadCloud() {
    return profileActive() &&
      ["administrator", "blaster", "driller", "driver", "viewer"].indexOf(role()) >= 0;
  }
  function canOpenType(type) {
    if (role() === "administrator" || role() === "blaster" || role() === "viewer") {
      return type === "shotDiagram" || type === "drillLog";
    }
    if (role() === "driller") return type === "drillLog";
    if (role() === "driver") return type === "shotDiagram";
    return false;
  }
  function docLabel(type) {
    return type === "shotDiagram" ? "Shot Diagram" : "Drill Log";
  }
  function roleLabel(value) {
    var labels = {
      administrator: "Administrator",
      blaster: "Blaster",
      driller: "Driller",
      driver: "Driver",
      viewer: "Viewer",
      member: "Pending"
    };
    return labels[text(value).toLowerCase()] || "Pending";
  }
  function serverSeconds(value) {
    return value && Number(value.seconds) || 0;
  }
  function formatTimestamp(value) {
    try {
      if (value && typeof value.toDate === "function") return value.toDate().toLocaleString();
      if (value && Number(value.seconds)) return new Date(Number(value.seconds) * 1000).toLocaleString();
    } catch (error) {}
    return "Unknown update time";
  }

  function loadFirebase() {
    if (fbPromise) return fbPromise;
    fbPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/firebase-firestore.js")
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1], storeMod = mods[2];
      var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
      var auth = authMod.getAuth(app);
      var db = storeMod.getFirestore(app);
      try { authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (error) {}

      authMod.onAuthStateChanged(auth, function (user) {
        currentUser = user || null;
        currentProfile = null;
        documents = [];
        jobs = [];
        if (!user) {
          updateLaunchVisibility();
          return;
        }
        loadProfile({ auth: auth, db: db, authMod: authMod, storeMod: storeMod }, user)
          .then(updateLaunchVisibility)
          .catch(updateLaunchVisibility);
      });

      return { auth: auth, db: db, authMod: authMod, storeMod: storeMod };
    });
    return fbPromise;
  }

  function loadProfile(fb, user) {
    return fb.storeMod.getDoc(
      fb.storeMod.doc(fb.db, PROFILE_COLLECTION, user.uid)
    ).then(function (snap) {
      var data = snap.exists() ? snap.data() : {};
      currentProfile = {
        uid: user.uid,
        email: text(data.email || user.email),
        displayName: text(data.displayName || user.displayName || user.email),
        role: text(data.role || "member").toLowerCase(),
        status: text(data.status || "active").toLowerCase()
      };
      return currentProfile;
    }).catch(function () {
      currentProfile = {
        uid: user.uid,
        email: text(user.email),
        displayName: text(user.displayName || user.email),
        role: "member",
        status: "active"
      };
      return currentProfile;
    });
  }

  function ensureStyles() {
    if (byId("m409698Styles")) return;
    var style = document.createElement("style");
    style.id = "m409698Styles";
    style.textContent = [
      ".m409698Launch{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin:0 0 12px;padding:11px;border:1px solid #566274;border-radius:12px;background:#1c2128}",
      ".m409698LaunchText{min-width:0}.m409698LaunchText strong{display:block;color:#fff;font-size:14px;font-weight:950}.m409698LaunchText span{display:block;margin-top:3px;color:#aeb8c6;font-size:11px;font-weight:750;line-height:1.35}",
      ".m409698Launch button{min-height:42px;border:1px solid #d86b14;border-radius:9px;background:#d86b14;color:#fff;padding:8px 13px;font-size:13px;font-weight:950}",
      ".m409698Modal{display:none;position:fixed;inset:0;z-index:36000;padding:12px;background:rgba(0,0,0,.76);font-family:Arial,sans-serif;overflow:auto;-webkit-overflow-scrolling:touch}",
      ".m409698Modal.show{display:flex;align-items:flex-start;justify-content:center}",
      ".m409698Box{width:min(1080px,100%);margin:auto;background:#f7f9fc;color:#111;border:2px solid #566274;border-radius:16px;box-shadow:0 18px 52px rgba(0,0,0,.5);overflow:hidden}",
      ".m409698Head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;background:#1c2128;color:#fff;border-bottom:3px solid #d86b14}",
      ".m409698Head strong{display:block;font-size:21px;font-weight:950}.m409698Head span{display:block;margin-top:3px;color:#b8c3d0;font-size:11px;font-weight:800}",
      ".m409698Head button{min-height:44px;border:1px solid #95a1b0;border-radius:9px;background:#eef2f7;color:#111;padding:8px 13px;font-size:14px;font-weight:950}",
      ".m409698Body{padding:14px}",
      ".m409698Filters{display:grid;grid-template-columns:minmax(240px,2fr) minmax(145px,.8fr) minmax(190px,1fr) minmax(135px,.7fr);gap:9px;align-items:end}",
      ".m409698Filters label{display:grid;gap:4px;color:#394659;font-size:11px;font-weight:900}",
      ".m409698Filters input,.m409698Filters select{width:100%;min-height:46px;box-sizing:border-box;border:1px solid #8794a3;border-radius:9px;background:#fff;padding:9px;font-size:15px;color:#111}",
      ".m409698Status{margin:11px 0;padding:9px 11px;border:1px solid #aeb8c5;border-radius:9px;background:#eef3f8;color:#374659;font-size:12px;font-weight:850;line-height:1.35}",
      ".m409698Status.good{border-color:#6ca779;background:#eaf7ed;color:#20552c}.m409698Status.bad{border-color:#c66;background:#ffecec;color:#750000}.m409698Status.wait{border-color:#c4a340;background:#fff6cf;color:#5e4900}",
      ".m409698Results{display:grid;gap:9px}",
      ".m409698Result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid #b7c1cd;border-radius:11px;background:#fff}",
      ".m409698Title{font-size:15px;font-weight:950;line-height:1.25;color:#16202b}.m409698Official{display:inline-flex;align-items:center;margin-left:6px;padding:2px 6px;border:1px solid #70a77b;border-radius:999px;background:#eaf7ed;color:#24552e;font-size:9px;font-weight:950;vertical-align:middle}",
      ".m409698Meta{margin-top:4px;color:#526172;font-size:11px;font-weight:780;line-height:1.42}",
      ".m409698Result button{min-height:44px;border:1px solid #557ba9;border-radius:9px;background:#263b55;color:#fff;padding:8px 12px;font-size:13px;font-weight:950;white-space:nowrap}",
      ".m409698Empty{padding:24px;border:1px dashed #98a6b5;border-radius:10px;background:#fff;text-align:center;color:#586779;font-size:13px;font-weight:850;line-height:1.45}",
      "@media(max-width:760px){.m409698Filters{grid-template-columns:1fr 1fr}.m409698Filters label:first-child{grid-column:1/-1}.m409698Result{grid-template-columns:1fr}.m409698Result button{width:100%}}",
      "@media(max-width:470px){.m409698Launch{grid-template-columns:1fr}.m409698Launch button{width:100%}.m409698Filters{grid-template-columns:1fr}.m409698Filters label:first-child{grid-column:auto}.m409698Body{padding:10px}.m409698Head{align-items:flex-start}}"
    ].join("");
    document.head.appendChild(style);
  }

  function documentParts(data) {
    data = data || {};
    var payload = data.payload || {};
    var metadata = payload.metadata || {};
    var header = payload.headerData || payload.shotInfo || payload.header || {};

    var jobId = text(
      data.jobId ||
      metadata.jobId ||
      header.JobId ||
      header.MithrilJobId
    );
    var jobName = text(
      data.jobOfficialName ||
      metadata.jobName ||
      header.JobOfficialName ||
      data.jobName ||
      header.JobName ||
      header.Job
    );
    var jobCode = text(
      data.jobCode ||
      metadata.jobCode ||
      header.JobCode
    );
    var customerName = text(
      data.customerName ||
      metadata.customerName ||
      header.CustomerName
    );
    var shotId = text(
      data.shotId ||
      metadata.shotId ||
      data.documentNumber ||
      header.ShotID ||
      header.shotID
    );

    return {
      jobId: jobId,
      jobName: jobName,
      jobCode: jobCode,
      customerName: customerName,
      shotId: shotId
    };
  }

  function normalizeJob(id, data) {
    data = data || {};
    var aliases = Array.isArray(data.aliases) ? data.aliases.map(text).filter(Boolean) : [];
    return {
      id: id,
      name: text(data.name || data.jobName),
      normalizedName: normalize(data.normalizedName || data.name || data.jobName),
      code: text(data.code || data.jobCode).toUpperCase(),
      customerName: text(data.customerName || data.customer),
      aliases: aliases,
      normalizedAliases: (
        Array.isArray(data.normalizedAliases)
          ? data.normalizedAliases
          : aliases.map(normalize)
      ).map(normalize).filter(Boolean),
      status: text(data.status || "active").toLowerCase()
    };
  }

  function resolveOfficialJob(parts) {
    var i, key = normalize(parts.jobName);
    if (parts.jobId) {
      for (i = 0; i < jobs.length; i += 1) {
        if (jobs[i].id === parts.jobId) return jobs[i];
      }
    }
    if (!key) return null;
    for (i = 0; i < jobs.length; i += 1) {
      if (jobs[i].normalizedName === key) return jobs[i];
      if (jobs[i].normalizedAliases.indexOf(key) >= 0) return jobs[i];
    }
    return null;
  }

  function loadCloudData(force) {
    if (!currentUser || !canReadCloud()) return Promise.resolve([]);
    if (loadingPromise && !force) return loadingPromise;

    loadingPromise = loadFirebase().then(function (fb) {
      var documentsCollection = fb.storeMod.collection(
        fb.db, "organizations", ORGANIZATION_ID, "documents"
      );
      var jobsCollection = fb.storeMod.collection(
        fb.db, "organizations", ORGANIZATION_ID, "jobs"
      );
      var documentQuery = documentsCollection;

      if (role() === "driller") {
        documentQuery = fb.storeMod.query(
          documentsCollection,
          fb.storeMod.where("type", "==", "drillLog")
        );
      } else if (role() === "driver") {
        documentQuery = fb.storeMod.query(
          documentsCollection,
          fb.storeMod.where("type", "==", "shotDiagram")
        );
      }

      return Promise.all([
        fb.storeMod.getDocs(documentQuery),
        fb.storeMod.getDocs(jobsCollection)
      ]).then(function (snaps) {
        var nextDocuments = [];
        var nextJobs = [];

        snaps[0].forEach(function (item) {
          var data = item.data();
          if (!data || !canOpenType(data.type)) return;
          if (data.type !== "shotDiagram" && data.type !== "drillLog") return;
          nextDocuments.push({ id: item.id, data: data });
        });

        snaps[1].forEach(function (item) {
          var job = normalizeJob(item.id, item.data());
          if (job.name) nextJobs.push(job);
        });

        nextDocuments.sort(function (a, b) {
          return serverSeconds(b.data.updatedAt) - serverSeconds(a.data.updatedAt);
        });
        nextJobs.sort(function (a, b) { return a.name.localeCompare(b.name); });

        documents = nextDocuments;
        jobs = nextJobs;
        return documents;
      });
    }).finally(function () {
      loadingPromise = null;
    });

    return loadingPromise;
  }

  function ensureModal() {
    if (modal) return modal;
    ensureStyles();

    modal = document.createElement("div");
    modal.id = "m409698Modal";
    modal.className = "m409698Modal";
    modal.innerHTML = [
      '<div class="m409698Box">',
      '<div class="m409698Head">',
      '<div><strong>Search Cloud Documents</strong><span>Jobs, Shot IDs, customers, creators, dates, and document types · ' + RELEASE + '</span></div>',
      '<button type="button" id="m409698Close">Close</button>',
      '</div>',
      '<div class="m409698Body">',
      '<div class="m409698Filters">',
      '<label>Search<input id="m409698Query" type="search" placeholder="Job, Shot ID, customer, creator…"></label>',
      '<label>Document type<select id="m409698Type"><option value="">All documents</option><option value="shotDiagram">Shot Diagrams</option><option value="drillLog">Drill Logs</option></select></label>',
      '<label>Official job<select id="m409698Job"><option value="">All jobs</option></select></label>',
      '<label>Sort<select id="m409698Sort"><option value="newest">Newest updated</option><option value="oldest">Oldest updated</option><option value="job">Job name</option></select></label>',
      '</div>',
      '<div id="m409698Status" class="m409698Status">Ready.</div>',
      '<div id="m409698Results" class="m409698Results"></div>',
      '</div></div>'
    ].join("");
    document.body.appendChild(modal);

    byId("m409698Close").addEventListener("click", closeSearch);
    modal.addEventListener("pointerdown", function (event) {
      if (event.target === modal) closeSearch();
    });

    ["m409698Query", "m409698Type", "m409698Job", "m409698Sort"].forEach(function (id) {
      var control = byId(id);
      if (!control) return;
      control.addEventListener(id === "m409698Query" ? "input" : "change", renderSearchResults);
    });

    return modal;
  }

  function setStatus(message, kind) {
    var node = byId("m409698Status");
    if (!node) return;
    node.textContent = message;
    node.className = "m409698Status " + (kind || "");
  }

  function populateJobFilter() {
    var select = byId("m409698Job");
    if (!select) return;
    var selected = select.value;
    select.innerHTML = '<option value="">All jobs</option>';

    jobs.forEach(function (job) {
      if (job.status === "archived") return;
      var option = document.createElement("option");
      option.value = job.id;
      option.textContent = job.name + (job.code ? " (" + job.code + ")" : "");
      select.appendChild(option);
    });

    if (selected && jobs.some(function (job) { return job.id === selected; })) {
      select.value = selected;
    }
  }

  function resultSearchText(item, parts, officialJob) {
    var data = item.data || {};
    var payload = data.payload || {};
    var aliases = officialJob ? officialJob.aliases.join(" ") : "";
    return normalize([
      data.title,
      docLabel(data.type),
      data.type,
      data.jobName,
      data.documentNumber,
      data.fieldDate,
      data.person,
      data.createdByName,
      data.createdByUid,
      data.updatedByName,
      data.updatedBy,
      parts.jobName,
      parts.jobCode,
      parts.customerName,
      parts.shotId,
      officialJob && officialJob.name,
      officialJob && officialJob.code,
      officialJob && officialJob.customerName,
      aliases,
      payload.metadata && JSON.stringify(payload.metadata)
    ].filter(Boolean).join(" "));
  }

  function filteredDocuments() {
    var query = normalize(byId("m409698Query") && byId("m409698Query").value);
    var terms = query ? query.split(" ").filter(Boolean) : [];
    var type = text(byId("m409698Type") && byId("m409698Type").value);
    var jobId = text(byId("m409698Job") && byId("m409698Job").value);
    var sort = text(byId("m409698Sort") && byId("m409698Sort").value) || "newest";

    var output = documents.filter(function (item) {
      var data = item.data || {};
      if (type && data.type !== type) return false;

      var parts = documentParts(data);
      var officialJob = resolveOfficialJob(parts);
      if (jobId && (!officialJob || officialJob.id !== jobId)) return false;

      if (terms.length) {
        var haystack = resultSearchText(item, parts, officialJob);
        if (!terms.every(function (term) { return haystack.indexOf(term) >= 0; })) return false;
      }
      return true;
    });

    output.sort(function (a, b) {
      if (sort === "oldest") {
        return serverSeconds(a.data.updatedAt) - serverSeconds(b.data.updatedAt);
      }
      if (sort === "job") {
        var aParts = documentParts(a.data);
        var bParts = documentParts(b.data);
        var aJob = resolveOfficialJob(aParts);
        var bJob = resolveOfficialJob(bParts);
        var aName = text(aJob && aJob.name || aParts.jobName || a.data.title);
        var bName = text(bJob && bJob.name || bParts.jobName || b.data.title);
        return aName.localeCompare(bName) ||
          serverSeconds(b.data.updatedAt) - serverSeconds(a.data.updatedAt);
      }
      return serverSeconds(b.data.updatedAt) - serverSeconds(a.data.updatedAt);
    });

    return output;
  }

  function forceFreshShotNavigation(documentId) {
    var href = String(window.location.href || "");
    var openedFromDeviceStorage = href.indexOf("content:") === 0 || href.indexOf("file:") === 0;
    var base = openedFromDeviceStorage
      ? "https://zscurtis.github.io/mithril_mobile/shot_diagram_m38.html"
      : "./shot_diagram_m38.html";
    var query = [
      "cloudOpen=" + encodeURIComponent(text(documentId)),
      "refresh=" + Date.now()
    ].join("&");
    window.location.href = base + "?" + query;
  }

  function retriggerPendingDrillLoad() {
    // Drill Log opens within the existing Home document rather than through a
    // new page load. Re-dispatch the event already used by the shared-cloud
    // module so it consumes the newly selected pending record immediately.
    [0, 80, 250, 700].forEach(function (delay) {
      window.setTimeout(function () {
        try {
          window.dispatchEvent(new CustomEvent("mithril-document-ready", {
            detail: { source: "cloud-search", release: RELEASE }
          }));
        } catch (error) {
          window.dispatchEvent(new Event("mithril-document-ready"));
        }
      }, delay);
    });
  }

  function openCloudDocument(item) {
    var data = item && item.data;
    if (!data || !canOpenType(data.type)) return;

    var pending = {
      id: item.id,
      type: data.type,
      title: data.title,
      revision: Number(data.revision || 1),
      record: clone(data),
      selectedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    } catch (error) {
      setStatus("This browser could not prepare the cloud document.", "bad");
      return;
    }

    setStatus("Opening " + (data.title || docLabel(data.type)) + "…", "wait");

    if (data.type === "shotDiagram") {
      forceFreshShotNavigation(item.id);
      return;
    }

    if (data.type === "drillLog" && typeof window.openDrillLog === "function") {
      closeSearch();
      window.openDrillLog();
      retriggerPendingDrillLoad();
      return;
    }

    setStatus("MITHRIL could not open this document type from the current screen.", "bad");
  }

  function renderSearchResults() {
    var host = byId("m409698Results");
    if (!host) return;

    var items = filteredDocuments();
    host.innerHTML = "";

    if (!items.length) {
      host.innerHTML = '<div class="m409698Empty">No cloud documents match the current search and filters.</div>';
      setStatus("0 matching documents.", "");
      return;
    }

    items.forEach(function (item) {
      var data = item.data || {};
      var parts = documentParts(data);
      var officialJob = resolveOfficialJob(parts);
      var displayJob = text(officialJob && officialJob.name || parts.jobName || "Job not entered");
      var displayCode = text(officialJob && officialJob.code || parts.jobCode);
      var displayCustomer = text(officialJob && officialJob.customerName || parts.customerName);
      var displayShot = text(parts.shotId);
      var creator = text(data.createdByName || data.createdByUid || data.person || "Unknown user");
      var loaded = Number(data.loadedHoleCount != null ? data.loadedHoleCount : data.holeCount || 0);

      var row = document.createElement("div");
      row.className = "m409698Result";
      row.innerHTML = [
        '<div>',
        '<div class="m409698Title">' + escapeHtml(data.title || displayJob || docLabel(data.type)) +
          (officialJob ? '<span class="m409698Official">Official job</span>' : '') +
        '</div>',
        '<div class="m409698Meta">' +
          escapeHtml(displayJob) +
          (displayCode ? ' · ' + escapeHtml(displayCode) : '') +
          (displayShot ? ' · ' + escapeHtml(displayShot) : '') +
          '<br>' +
          escapeHtml(docLabel(data.type)) +
          ' · Revision ' + escapeHtml(data.revision || 1) +
          ' · ' + escapeHtml(loaded) + ' loaded holes' +
          (data.fieldDate ? ' · Field date ' + escapeHtml(data.fieldDate) : '') +
          '<br>Created by ' + escapeHtml(creator) +
          ' · Updated ' + escapeHtml(formatTimestamp(data.updatedAt)) +
          (displayCustomer ? '<br>Customer: ' + escapeHtml(displayCustomer) : '') +
        '</div>',
        '</div>',
        '<button type="button">Load Cloud</button>'
      ].join("");

      row.querySelector("button").addEventListener("click", function () {
        openCloudDocument(item);
      });
      host.appendChild(row);
    });

    setStatus(
      items.length + " matching document" + (items.length === 1 ? "" : "s") +
      " out of " + documents.length + " accessible cloud documents.",
      "good"
    );
  }

  function openSearch() {
    if (!currentUser || !canReadCloud()) return;
    ensureModal().classList.add("show");
    document.documentElement.style.overflow = "hidden";
    setStatus("Loading accessible cloud documents and official jobs…", "wait");
    byId("m409698Results").innerHTML = '<div class="m409698Empty">Loading cloud documents…</div>';

    loadCloudData(true).then(function () {
      populateJobFilter();
      renderSearchResults();
      var query = byId("m409698Query");
      if (query) query.focus();
    }).catch(function (error) {
      var message = text(error && error.message) || "Cloud documents could not be loaded.";
      setStatus(message, "bad");
      byId("m409698Results").innerHTML =
        '<div class="m409698Empty">' + escapeHtml(message) + '</div>';
    });
  }

  function closeSearch() {
    if (modal) modal.classList.remove("show");
    document.documentElement.style.overflow = "";
  }

  function installLaunch() {
    if (!isLanding()) return false;
    var recent = byId("m407CloudRecent");
    if (!recent || byId("m409698Launch")) return !!byId("m409698Launch");

    ensureStyles();
    var launch = document.createElement("div");
    launch.id = "m409698Launch";
    launch.className = "m409698Launch";
    launch.innerHTML = [
      '<div class="m409698LaunchText">',
      '<strong>Find any cloud document</strong>',
      '<span>Search by job, Shot ID, customer, creator, date, or document type.</span>',
      '</div>',
      '<button type="button">Search Cloud</button>'
    ].join("");

    launch.querySelector("button").addEventListener("click", openSearch);
    recent.parentNode.insertBefore(launch, recent);
    updateLaunchVisibility();
    return true;
  }

  function updateLaunchVisibility() {
    var launch = byId("m409698Launch");
    if (!launch) return;
    launch.style.display = currentUser && canReadCloud() ? "" : "none";
    var button = launch.querySelector("button");
    if (button) {
      button.title = currentUser && canReadCloud()
        ? "Search " + roleLabel(role()) + "-accessible cloud documents"
        : "Cloud search is unavailable for this account";
    }
  }

  function boot() {
    ensureStyles();
    loadFirebase().catch(function () {});
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (installLaunch() || attempts >= 100) window.clearInterval(timer);
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.MithrilCloudSearch = {
    version: RELEASE,
    open: openSearch,
    refresh: function () {
      return loadCloudData(true).then(function () {
        populateJobFilter();
        renderSearchResults();
      });
    }
  };
})();