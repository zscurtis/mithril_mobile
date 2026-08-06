(function () {
  "use strict";

  var RELEASE = "m40.9.6.9.7";
  var FIREBASE_VERSION = "12.16.0";
  var JOB_SCHEMA_VERSION = 1;
  var PROFILE_COLLECTION = "userProfiles";
  var FALLBACK_ORGANIZATION = "trinity";
  var firebaseConfig = {
    apiKey: ["AIzaSyBOb0pXdI", "DMqr5mMKdKOCpP84jSRjyjnhY"].join(""),
    authDomain: "mithril-mobile.firebaseapp.com",
    projectId: "mithril-mobile",
    storageBucket: "mithril-mobile.firebasestorage.app",
    messagingSenderId: "797958678485",
    appId: "1:797958678485:web:e19ab69e74e00cd8587f5c"
  };

  if (window.__mithrilJobsM410Installed) return;
  window.__mithrilJobsM410Installed = true;

  var fbPromise = null;
  var currentUser = null;
  var currentProfile = null;
  var jobs = [];
  var jobsPromise = null;
  var selectedJobId = "";
  var selectorOpen = false;
  var selectorHighlightIndex = -1;
  var selectorInstalled = false;
  var adminInstalled = false;

  function byId(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? "" : value).trim(); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function splitAliases(value) {
    var source = Array.isArray(value) ? value : String(value || "").split(/[\n,;]+/);
    var seen = {};
    return source.map(text).filter(function (alias) {
      var key = normalize(alias);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function isDrill() { return !!byId("drillCanvas"); }
  function isShot() { return !!byId("shotCanvas"); }
  function isLanding() { return !!byId("templateStart"); }
  function isShotWrapper() { return !!byId("shotFrame"); }

  function installIntoShotFrame() {
    var frame = byId("shotFrame");
    if (!frame) return false;

    function injectIntoChild() {
      try {
        var childWindow = frame.contentWindow;
        var childDocument = frame.contentDocument;
        if (!childWindow || !childDocument || !childDocument.documentElement) return false;
        if (childWindow.__mithrilJobsM410Installed) return true;
        if (childDocument.getElementById("m410JobsChildScript")) return true;

        var script = childDocument.createElement("script");
        script.id = "m410JobsChildScript";
        script.src = new URL(
          "./mithril-jobs-m410.js?v=40.9.6.9.7-child",
          window.location.href
        ).href;
        script.async = false;
        (childDocument.body || childDocument.head || childDocument.documentElement)
          .appendChild(script);
        return true;
      } catch (error) {
        return false;
      }
    }

    if (!frame.__m410JobsLoadBridgeInstalled) {
      frame.__m410JobsLoadBridgeInstalled = true;
      frame.addEventListener("load", function () {
        [0, 80, 250, 700].forEach(function (delay) {
          window.setTimeout(injectIntoChild, delay);
        });
      });
    }

    [0, 80, 250, 700].forEach(function (delay) {
      window.setTimeout(injectIntoChild, delay);
    });
    return true;
  }
  function headerObject() {
    try { return typeof headerData !== "undefined" && headerData ? headerData : null; }
    catch (error) { return null; }
  }
  function jobInput() { return byId("jobName"); }
  function profileActive(profile) {
    return !!profile && !/^(?:disabled|inactive)$/i.test(text(profile.status));
  }
  function isAdministrator() {
    return profileActive(currentProfile) && normalize(currentProfile.role) === "administrator";
  }
  function organizationId() {
    // MITHRIL currently uses one shared company cloud. Always use the same
    // lowercase Firestore path as the operational cloud and security rules.
    return FALLBACK_ORGANIZATION;
  }
  function jobCollection(fb) {
    return fb.storeMod.collection(fb.db, "organizations", organizationId(), "jobs");
  }
  function jobDocument(fb, id) {
    return fb.storeMod.doc(fb.db, "organizations", organizationId(), "jobs", id);
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
      var auth = authMod.getAuth(app);
      var db = storeMod.getFirestore(app);
      try { authMod.setPersistence(auth, authMod.browserLocalPersistence); } catch (error) {}
      authMod.onAuthStateChanged(auth, function (user) {
        currentUser = user || null;
        currentProfile = null;
        jobs = [];
        jobsPromise = null;
        if (user) {
          loadProfile({ auth: auth, db: db, authMod: authMod, storeMod: storeMod }, user)
            .then(function () {
              installLandingAdminButton();
              loadJobs(true).then(refreshJobSelector).catch(function () {});
            });
        } else {
          refreshJobSelector();
          installLandingAdminButton();
        }
      });
      return { auth: auth, db: db, authMod: authMod, storeMod: storeMod };
    });
    return fbPromise;
  }

  function loadProfile(fb, user) {
    return fb.storeMod.getDoc(fb.storeMod.doc(fb.db, PROFILE_COLLECTION, user.uid))
      .then(function (snap) {
        var data = snap.exists() ? snap.data() : {};
        currentProfile = {
          uid: user.uid,
          email: text(data.email || user.email),
          displayName: text(data.displayName || user.displayName || user.email),
          role: text(data.role || "member").toLowerCase(),
          status: text(data.status || "active").toLowerCase(),
          organizationId: text(data.organizationId || "personal")
        };
        return currentProfile;
      })
      .catch(function () {
        currentProfile = {
          uid: user.uid,
          email: text(user.email),
          displayName: text(user.displayName || user.email),
          role: "member",
          status: "active",
          organizationId: "personal"
        };
        return currentProfile;
      });
  }

  function normalizedJob(id, data) {
    data = data || {};
    return {
      id: id,
      schemaVersion: Number(data.schemaVersion || JOB_SCHEMA_VERSION),
      organizationId: text(data.organizationId) || organizationId(),
      name: text(data.name || data.jobName),
      normalizedName: normalize(data.normalizedName || data.name || data.jobName),
      code: text(data.code || data.jobCode).toUpperCase(),
      customerName: text(data.customerName || data.customer),
      aliases: splitAliases(data.aliases || []),
      normalizedAliases: (data.normalizedAliases || splitAliases(data.aliases || []).map(normalize)).map(normalize).filter(Boolean),
      status: text(data.status || "active").toLowerCase(),
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
  }

  function loadJobs(force) {
    if (!currentUser) return Promise.resolve([]);
    if (jobsPromise && !force) return jobsPromise;
    jobsPromise = loadFirebase().then(function (fb) {
      return fb.storeMod.getDocs(jobCollection(fb)).then(function (snap) {
        var next = [];
        snap.forEach(function (item) {
          var job = normalizedJob(item.id, item.data());
          if (job.name) next.push(job);
        });
        next.sort(function (a, b) {
          var aArchived = a.status === "archived" ? 1 : 0;
          var bArchived = b.status === "archived" ? 1 : 0;
          return aArchived - bArchived || a.name.localeCompare(b.name);
        });
        jobs = next;
        return jobs;
      });
    }).finally(function () { jobsPromise = null; });
    return jobsPromise;
  }

  function findJob(value) {
    var key = normalize(value);
    if (!key) return null;
    for (var i = 0; i < jobs.length; i += 1) {
      if (jobs[i].normalizedName === key) return jobs[i];
      if (jobs[i].normalizedAliases.indexOf(key) >= 0) return jobs[i];
    }
    return null;
  }

  function findJobById(id) {
    id = text(id);
    for (var i = 0; i < jobs.length; i += 1) if (jobs[i].id === id) return jobs[i];
    return null;
  }

  function currentHeaderJobId() {
    var header = headerObject() || {};
    return text(header.JobId || header.MithrilJobId);
  }

  function setJobMetadata(job, inputValue) {
    var header = headerObject();
    if (!header) return;
    if (job) {
      header.JobId = job.id;
      header.MithrilJobId = job.id;
      header.JobOfficialName = job.name;
      header.JobCode = job.code;
      header.CustomerName = job.customerName;
      header.JobOrganizationId = job.organizationId || organizationId();
      if (isDrill()) header.Job = job.name;
      if (isShot()) header.JobName = job.name;
      selectedJobId = job.id;
    } else {
      delete header.JobId;
      delete header.MithrilJobId;
      delete header.JobOfficialName;
      delete header.JobCode;
      delete header.CustomerName;
      delete header.JobOrganizationId;
      if (isDrill()) header.Job = text(inputValue);
      if (isShot()) header.JobName = text(inputValue);
      selectedJobId = "";
    }
  }

  function persistHeader() {
    var header = headerObject();
    if (!header) return;
    try {
      if (isDrill() && typeof KEYS !== "undefined" && KEYS.header) {
        localStorage.setItem(KEYS.header, JSON.stringify(header));
      } else if (isShot()) {
        localStorage.setItem("mithrilCanvasHeaderM01", JSON.stringify(header));
      }
    } catch (error) {}
  }

  function resolveVisibleJob(options) {
    options = options || {};
    var input = jobInput();
    if (!input) return null;
    var job = findJobById(selectedJobId) || findJob(input.value);
    if (job) {
      input.value = job.name;
      setJobMetadata(job, job.name);
      updateJobHint(job, "");
      persistHeader();
      return job;
    }
    setJobMetadata(null, input.value);
    updateJobHint(null, text(input.value) ? "Legacy/unlinked job name. Select an official job when available." : "Select an official job from the company database.");
    persistHeader();
    return null;
  }

  function ensureJobStyles() {
    if (byId("m410JobStyles")) return;
    var style = document.createElement("style");
    style.id = "m410JobStyles";
    style.textContent = [
      ".m410JobHint{margin-top:4px;padding:7px 9px;border:1px solid #aeb8c5;border-radius:7px;background:#f5f8fb;color:#425166;font:750 11px/1.35 Arial,sans-serif}",
      ".m410JobHint.linked{border-color:#69a879;background:#ebf8ee;color:#245c31}",
      ".m410JobHint.legacy{border-color:#c6a94c;background:#fff8dc;color:#644e00}",
      ".m410JobPicker{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:6px;align-items:stretch}",
      ".m410JobPicker>input{min-width:0;margin:0}",
      ".m410JobToggle{min-width:48px!important;width:48px!important;min-height:46px!important;margin:0!important;padding:0!important;border:1px solid #8794a3!important;border-radius:8px!important;background:#eef2f7!important;color:#17202a!important;font-size:20px!important;font-weight:950!important;line-height:1!important;touch-action:manipulation}",
      ".m410JobToggle[aria-expanded=\"true\"]{border-color:#1f6feb!important;background:#e8f1ff!important}",
      ".m410JobChoices{display:none;position:absolute;z-index:32050;left:0;right:0;top:calc(100% + 5px);max-height:min(330px,45vh);overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid #7f8b99;border-radius:10px;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.28);padding:5px}",
      ".m410JobChoices.show{display:grid;gap:4px}",
      ".m410JobChoice{display:block;width:100%;min-height:52px!important;padding:9px 11px!important;border:1px solid transparent!important;border-radius:8px!important;background:#fff!important;color:#111!important;text-align:left!important;font-family:Arial,sans-serif!important;touch-action:manipulation}",
      ".m410JobChoice:hover,.m410JobChoice.active{border-color:#4e86ca!important;background:#eaf3ff!important}",
      ".m410JobChoiceName{display:block;font-size:15px;font-weight:950;line-height:1.2}",
      ".m410JobChoiceMeta{display:block;margin-top:3px;color:#586779;font-size:11px;font-weight:800;line-height:1.3}",
      ".m410JobNoMatch{padding:12px;border:1px dashed #a98b31;border-radius:8px;background:#fff8dc;color:#604b00;font-size:12px;font-weight:800;line-height:1.4}",
      ".m410AdminModal{display:none;position:fixed;inset:0;z-index:31000;background:rgba(0,0,0,.72);padding:12px;overflow:auto;font-family:Arial,sans-serif}",
      ".m410AdminModal.show{display:flex;align-items:flex-start;justify-content:center}",
      ".m410AdminBox{width:min(920px,100%);margin:auto;background:#fff;color:#111;border:2px solid #506b8a;border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.45);overflow:hidden}",
      ".m410AdminHead{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 15px;background:#f5f8fc;border-bottom:1px solid #c6d0dc}",
      ".m410AdminHead strong{font-size:20px}.m410AdminBody{padding:14px}",
      ".m410AdminBox button{min-height:44px;border:1px solid #768495;border-radius:8px;padding:7px 11px;font-weight:850;font-size:14px}",
      ".m410AdminBox button.primary{background:#1f6feb;border-color:#1f6feb;color:#fff}",
      ".m410Form{display:grid;grid-template-columns:2fr .7fr 1.5fr;gap:9px}",
      ".m410Form label{display:grid;gap:4px;font-size:12px;font-weight:850;color:#435064}",
      ".m410Form input,.m410Form select,.m410Form textarea{width:100%;min-height:44px;border:1px solid #8794a3;border-radius:8px;padding:8px;font-size:16px;box-sizing:border-box}",
      ".m410Form textarea{min-height:74px;resize:vertical}.m410Wide{grid-column:1/-1}",
      ".m410Actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}",
      ".m410Status{margin:11px 0;padding:9px;border:1px solid #aeb8c5;border-radius:8px;background:#f5f8fb;font-size:13px;font-weight:800}",
      ".m410Status.good{background:#eaf8ed;border-color:#6aa879}.m410Status.bad{background:#ffecec;border-color:#c66}.m410Status.wait{background:#fff7d8;border-color:#c5a548}",
      ".m410Toolbar{display:grid;grid-template-columns:1fr auto;gap:9px;margin:13px 0 9px}.m410Toolbar input{min-height:44px;border:1px solid #8794a3;border-radius:8px;padding:8px;font-size:16px}",
      ".m410Rows{display:grid;gap:8px}.m410Row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid #bcc5d0;border-radius:10px;background:#fff}",
      ".m410Row.archived{opacity:.62;background:#f2f2f2}.m410RowName{font-size:15px;font-weight:950}.m410RowMeta{margin-top:3px;color:#596777;font-size:12px;font-weight:750;line-height:1.4}",
      ".m410RowActions{display:flex;gap:7px}.m410Empty{padding:18px;border:1px dashed #9da9b7;border-radius:9px;text-align:center;color:#596777;font-weight:800}",
      "@media(max-width:650px){.m410Form,.m410Actions,.m410Toolbar{grid-template-columns:1fr}.m410Wide{grid-column:auto}.m410Row{grid-template-columns:1fr}.m410RowActions button{flex:1}}"
    ].join("");
    document.head.appendChild(style);
  }

  function updateJobHint(job, message) {
    var hint = byId("m410JobHint");
    if (!hint) return;
    if (job) {
      hint.className = "m410JobHint linked";
      hint.textContent = "Official job: " + job.name +
        (job.code ? " · Code " + job.code : "") +
        (job.customerName ? " · " + job.customerName : "");
    } else {
      hint.className = "m410JobHint " + (text(jobInput() && jobInput().value) ? "legacy" : "");
      hint.textContent = message || "Choose an official job, or enter a temporary manual name.";
    }
  }

  function searchableJobText(job) {
    return normalize([
      job.name,
      job.code,
      job.customerName,
      job.status,
      job.aliases.join(" ")
    ].filter(Boolean).join(" "));
  }

  function selectableJobs(query) {
    var key = normalize(query);
    var terms = key ? key.split(" ").filter(Boolean) : [];
    var currentId = currentHeaderJobId();
    var matches = jobs.filter(function (job) {
      if (job.status === "archived" && currentId !== job.id) return false;
      if (!terms.length) return true;
      var haystack = searchableJobText(job);
      return terms.every(function (term) { return haystack.indexOf(term) >= 0; });
    });

    matches.sort(function (a, b) {
      if (!key) return a.name.localeCompare(b.name);
      var aName = normalize(a.name);
      var bName = normalize(b.name);
      var aPrefix = aName.indexOf(key) === 0 ? 0 : 1;
      var bPrefix = bName.indexOf(key) === 0 ? 0 : 1;
      return aPrefix - bPrefix || a.name.localeCompare(b.name);
    });

    return matches.slice(0, 75);
  }

  function closeJobChoices() {
    selectorOpen = false;
    selectorHighlightIndex = -1;
    var choices = byId("m410JobChoices");
    var toggle = byId("m410JobToggle");
    var input = jobInput();
    if (choices) {
      choices.classList.remove("show");
      choices.setAttribute("aria-hidden", "true");
    }
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (input) input.setAttribute("aria-expanded", "false");
  }

  function setChoiceHighlight(index) {
    var choices = byId("m410JobChoices");
    if (!choices) return;
    var buttons = Array.prototype.slice.call(choices.querySelectorAll(".m410JobChoice"));
    if (!buttons.length) {
      selectorHighlightIndex = -1;
      return;
    }
    if (index < 0) index = buttons.length - 1;
    if (index >= buttons.length) index = 0;
    selectorHighlightIndex = index;
    buttons.forEach(function (button, buttonIndex) {
      button.classList.toggle("active", buttonIndex === index);
    });
    buttons[index].scrollIntoView({ block: "nearest" });
  }

  function selectOfficialJob(job) {
    var input = jobInput();
    if (!input || !job) return;
    selectedJobId = job.id;
    input.value = job.name;
    setJobMetadata(job, job.name);
    updateJobHint(job, "");
    persistHeader();
    closeJobChoices();
    try {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) {}
    input.focus();
  }

  function renderJobChoices(openAfterRender) {
    var input = jobInput();
    var choices = byId("m410JobChoices");
    var toggle = byId("m410JobToggle");
    if (!input || !choices) return;

    var matches = selectableJobs(input.value);
    choices.innerHTML = "";
    selectorHighlightIndex = -1;

    if (!matches.length) {
      var empty = document.createElement("div");
      empty.className = "m410JobNoMatch";
      empty.textContent = text(input.value)
        ? "No official job matches this entry. You may keep it as a temporary manual job name; an Administrator can add it later."
        : "No official jobs are available yet. You may enter a temporary manual job name.";
      choices.appendChild(empty);
    } else {
      matches.forEach(function (job) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "m410JobChoice";
        button.setAttribute("role", "option");
        button.setAttribute("data-job-id", job.id);

        var aliasNote = "";
        var queryKey = normalize(input.value);
        if (queryKey && job.normalizedName.indexOf(queryKey) < 0) {
          var matchingAlias = job.aliases.filter(function (alias) {
            return normalize(alias).indexOf(queryKey) >= 0;
          })[0];
          if (matchingAlias) aliasNote = "Alias: " + matchingAlias;
        }

        var meta = [job.code, job.customerName, aliasNote].filter(Boolean).join(" · ");
        button.innerHTML =
          '<span class="m410JobChoiceName">' + escapeHtml(job.name) + '</span>' +
          (meta ? '<span class="m410JobChoiceMeta">' + escapeHtml(meta) + '</span>' : "");

        // Keep the text field active long enough for touch/click selection.
        button.addEventListener("pointerdown", function (event) {
          event.preventDefault();
        });
        button.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          selectOfficialJob(job);
        });
        choices.appendChild(button);
      });
    }

    if (openAfterRender || selectorOpen) {
      selectorOpen = true;
      choices.classList.add("show");
      choices.setAttribute("aria-hidden", "false");
      input.setAttribute("aria-expanded", "true");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }
  }

  function openJobChoices(showAll) {
    var input = jobInput();
    if (!input) return;
    selectorOpen = true;
    if (showAll && !text(input.value)) renderJobChoices(true);
    else renderJobChoices(true);
  }

  function refreshJobSelector() {
    var input = jobInput();
    if (!input) return;

    var linked = findJobById(currentHeaderJobId()) || findJob(input.value);
    if (linked) {
      selectedJobId = linked.id;
      input.value = linked.name;
      setJobMetadata(linked, linked.name);
      updateJobHint(linked, "");
    } else {
      selectedJobId = "";
      updateJobHint(
        null,
        text(input.value)
          ? "Temporary manual job name. Choose an official result to link it when available."
          : "Choose an official job, or enter a temporary manual name."
      );
    }

    if (selectorOpen) renderJobChoices(true);
  }

  function installJobSelector() {
    if (selectorInstalled) return true;
    var input = jobInput();
    if (!input) return false;

    selectorInstalled = true;
    ensureJobStyles();

    input.removeAttribute("list");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "m410JobChoices");
    input.setAttribute("aria-expanded", "false");
    input.placeholder = "Type or choose an official job";

    var picker = document.createElement("div");
    picker.id = "m410JobPicker";
    picker.className = "m410JobPicker";

    var parent = input.parentNode;
    parent.insertBefore(picker, input);
    picker.appendChild(input);

    var toggle = document.createElement("button");
    toggle.id = "m410JobToggle";
    toggle.className = "m410JobToggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Show official job list");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "▾";
    picker.appendChild(toggle);

    var choices = document.createElement("div");
    choices.id = "m410JobChoices";
    choices.className = "m410JobChoices";
    choices.setAttribute("role", "listbox");
    choices.setAttribute("aria-hidden", "true");
    picker.appendChild(choices);

    var hint = document.createElement("div");
    hint.id = "m410JobHint";
    hint.className = "m410JobHint";
    picker.insertAdjacentElement("afterend", hint);

    input.addEventListener("input", function () {
      var exact = findJob(this.value);
      selectedJobId = "";
      if (exact) {
        updateJobHint(exact, "");
      } else {
        updateJobHint(
          null,
          text(this.value)
            ? "No official job selected yet. Choose a result, or keep this temporary manual name."
            : "Choose an official job, or enter a temporary manual name."
        );
      }
      openJobChoices(false);
    });

    input.addEventListener("focus", function () {
      loadJobs(false).then(function () {
        refreshJobSelector();
        openJobChoices(false);
      }).catch(function () {
        updateJobHint(null, "The official job list could not be reached. Manual entry remains available.");
      });
    });

    input.addEventListener("keydown", function (event) {
      var buttons = choices.querySelectorAll(".m410JobChoice");
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!selectorOpen) openJobChoices(false);
        setChoiceHighlight(selectorHighlightIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!selectorOpen) openJobChoices(false);
        setChoiceHighlight(selectorHighlightIndex - 1);
      } else if (event.key === "Enter" && selectorOpen && selectorHighlightIndex >= 0 && buttons[selectorHighlightIndex]) {
        event.preventDefault();
        buttons[selectorHighlightIndex].click();
      } else if (event.key === "Escape") {
        closeJobChoices();
      }
    });

    input.addEventListener("change", function () {
      var exact = findJob(this.value);
      if (exact) selectOfficialJob(exact);
      else resolveVisibleJob();
    });

    input.addEventListener("blur", function () {
      window.setTimeout(function () {
        if (!picker.contains(document.activeElement)) {
          resolveVisibleJob();
          closeJobChoices();
        }
      }, 180);
    });

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (selectorOpen) {
        closeJobChoices();
      } else {
        loadJobs(false).then(function () {
          refreshJobSelector();
          openJobChoices(true);
          input.focus();
        }).catch(function () {
          updateJobHint(null, "The official job list could not be reached. Manual entry remains available.");
        });
      }
    });

    document.addEventListener("pointerdown", function (event) {
      if (selectorOpen && !picker.contains(event.target)) closeJobChoices();
    }, true);

    wrapInfoFunctions();
    loadJobs(false).then(refreshJobSelector).catch(function () {
      updateJobHint(null, "Sign in and connect to load official jobs. Manual entry remains available.");
    });
    return true;
  }

  function wrapInfoFunctions() {
    if (isDrill() && typeof window.openInfo === "function" && !window.openInfo.__m410Wrapped) {
      var originalOpenInfo = window.openInfo;
      window.openInfo = function () {
        var result = originalOpenInfo.apply(this, arguments);
        window.setTimeout(function () {
          var linked = findJobById(currentHeaderJobId()) || findJob(jobInput() && jobInput().value);
          if (linked) {
            selectedJobId = linked.id;
            jobInput().value = linked.name;
            updateJobHint(linked, "");
          } else updateJobHint(null, text(jobInput() && jobInput().value) ? "Legacy/unlinked job name." : "");
        }, 0);
        return result;
      };
      window.openInfo.__m410Wrapped = true;
    }
    if (isDrill() && typeof window.saveInfo === "function" && !window.saveInfo.__m410Wrapped) {
      var originalSaveInfo = window.saveInfo;
      window.saveInfo = function () {
        var job = findJobById(selectedJobId) || findJob(jobInput() && jobInput().value);
        if (job && jobInput()) jobInput().value = job.name;
        var result = originalSaveInfo.apply(this, arguments);
        setJobMetadata(job, jobInput() && jobInput().value);
        persistHeader();
        return result;
      };
      window.saveInfo.__m410Wrapped = true;
    }
    if (isShot() && typeof window.openShotInfo === "function" && !window.openShotInfo.__m410Wrapped) {
      var originalOpenShotInfo = window.openShotInfo;
      window.openShotInfo = function () {
        var result = originalOpenShotInfo.apply(this, arguments);
        window.setTimeout(refreshJobSelector, 0);
        return result;
      };
      window.openShotInfo.__m410Wrapped = true;
    }
    if (isShot() && typeof window.saveHeaderData === "function" && !window.saveHeaderData.__m410Wrapped) {
      var originalSaveHeader = window.saveHeaderData;
      window.saveHeaderData = function () {
        var job = findJobById(selectedJobId) || findJob(jobInput() && jobInput().value);
        if (job && jobInput()) jobInput().value = job.name;
        var result = originalSaveHeader.apply(this, arguments);
        setJobMetadata(job, jobInput() && jobInput().value);
        persistHeader();
        return result;
      };
      window.saveHeaderData.__m410Wrapped = true;
    }
  }

  function installDocumentMetadataAdapter() {
    var adapter = window.MithrilDocument;
    if (!adapter || adapter.__m410MetadataInstalled) return false;
    adapter.__m410MetadataInstalled = true;
    var originalInfo = adapter.getInfo;
    var originalSnapshot = adapter.getSnapshot;
    adapter.getInfo = function () {
      var info = originalInfo.apply(this, arguments) || {};
      var header = headerObject() || {};
      info.jobId = text(header.JobId || header.MithrilJobId);
      info.jobCode = text(header.JobCode);
      info.customerName = text(header.CustomerName);
      info.jobOrganizationId = text(header.JobOrganizationId);
      return info;
    };
    adapter.getSnapshot = function () {
      var snapshot = originalSnapshot.apply(this, arguments) || {};
      snapshot.metadata = snapshot.metadata || {};
      var header = snapshot.headerData || {};
      snapshot.metadata.jobId = text(header.JobId || header.MithrilJobId);
      snapshot.metadata.jobName = text(header.JobOfficialName || (isDrill() ? header.Job : header.JobName));
      snapshot.metadata.jobCode = text(header.JobCode);
      snapshot.metadata.customerName = text(header.CustomerName);
      snapshot.metadata.organizationId = text(header.JobOrganizationId);
      snapshot.metadata.shotId = text(header.ShotID);
      snapshot.metadata.documentType = isDrill() ? "drillLog" : "shotDiagram";
      return snapshot;
    };
    return true;
  }

  function ensureAdminModal() {
    var modal = byId("m410JobsAdminModal");
    if (modal) return modal;
    ensureJobStyles();
    modal = document.createElement("div");
    modal.id = "m410JobsAdminModal";
    modal.className = "m410AdminModal";
    modal.innerHTML = [
      '<div class="m410AdminBox">',
      '<div class="m410AdminHead"><div><strong>Manage Jobs</strong><div style="font-size:12px;font-weight:800;color:#617083;margin-top:3px">Standardized company job names · ' + RELEASE + '</div></div><button type="button" id="m410AdminClose">Close</button></div>',
      '<div class="m410AdminBody">',
      '<div class="m410Form">',
      '<label>Official job name<input id="m410JobName" placeholder="Summer Layne"></label>',
      '<label>Job code<input id="m410JobCode" maxlength="12" placeholder="SL"></label>',
      '<label>Customer<input id="m410Customer" placeholder="Concept Excavating"></label>',
      '<label class="m410Wide">Alternate spellings / aliases<textarea id="m410Aliases" placeholder="Summer Lane&#10;Summerlane"></textarea></label>',
      '<label>Status<select id="m410JobStatus"><option value="active">Active</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>',
      '<input id="m410EditingId" type="hidden">',
      '</div>',
      '<div class="m410Actions"><button type="button" id="m410ClearForm">Clear Form</button><button type="button" class="primary" id="m410SaveJob">Add Job</button></div>',
      '<div id="m410AdminStatus" class="m410Status">Ready.</div>',
      '<div class="m410Toolbar"><input id="m410AdminSearch" placeholder="Search jobs, aliases, codes, or customers"><button type="button" id="m410AdminRefresh">Refresh</button></div>',
      '<div id="m410AdminRows" class="m410Rows"></div>',
      '</div></div>'
    ].join("");
    document.body.appendChild(modal);
    byId("m410AdminClose").addEventListener("click", function () { modal.classList.remove("show"); });
    byId("m410ClearForm").addEventListener("click", clearJobForm);
    byId("m410SaveJob").addEventListener("click", saveJob);
    byId("m410AdminRefresh").addEventListener("click", function () { refreshAdminJobs(true); });
    byId("m410AdminSearch").addEventListener("input", renderAdminRows);
    return modal;
  }

  function setAdminStatus(message, kind) {
    var box = byId("m410AdminStatus");
    if (!box) return;
    box.textContent = message;
    box.className = "m410Status " + (kind || "");
  }

  function clearJobForm() {
    ["m410JobName", "m410JobCode", "m410Customer", "m410Aliases", "m410EditingId"].forEach(function (id) {
      if (byId(id)) byId(id).value = "";
    });
    if (byId("m410JobStatus")) byId("m410JobStatus").value = "active";
    if (byId("m410SaveJob")) byId("m410SaveJob").textContent = "Add Job";
  }

  function editJob(job) {
    byId("m410JobName").value = job.name;
    byId("m410JobCode").value = job.code;
    byId("m410Customer").value = job.customerName;
    byId("m410Aliases").value = job.aliases.join("\n");
    byId("m410JobStatus").value = ["active", "upcoming", "completed", "archived"].indexOf(job.status) >= 0 ? job.status : "active";
    byId("m410EditingId").value = job.id;
    byId("m410SaveJob").textContent = "Save Job";
    byId("m410JobName").focus();
    byId("m410JobsAdminModal").scrollTop = 0;
  }

  function saveJob() {
    if (!isAdministrator() || !currentUser) {
      setAdminStatus("Administrator access is required.", "bad");
      return;
    }
    var name = text(byId("m410JobName").value);
    var code = text(byId("m410JobCode").value).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    var customerName = text(byId("m410Customer").value);
    var aliases = splitAliases(byId("m410Aliases").value);
    var status = text(byId("m410JobStatus").value) || "active";
    var editingId = text(byId("m410EditingId").value);
    if (!name) {
      setAdminStatus("Enter the official job name.", "bad");
      return;
    }
    var duplicate = jobs.filter(function (job) {
      return job.id !== editingId && (job.normalizedName === normalize(name) || job.normalizedAliases.indexOf(normalize(name)) >= 0);
    })[0];
    if (duplicate) {
      setAdminStatus("A matching job already exists: " + duplicate.name + ". Edit that record instead.", "bad");
      return;
    }
    var aliasCollision = null;
    aliases.some(function (alias) {
      aliasCollision = jobs.filter(function (job) {
        return job.id !== editingId && (job.normalizedName === normalize(alias) || job.normalizedAliases.indexOf(normalize(alias)) >= 0);
      })[0];
      return !!aliasCollision;
    });
    if (aliasCollision) {
      setAdminStatus("An alias matches the existing job " + aliasCollision.name + ".", "bad");
      return;
    }

    setAdminStatus(editingId ? "Saving job…" : "Adding job…", "wait");
    loadFirebase().then(function (fb) {
      var record = {
        schemaVersion: JOB_SCHEMA_VERSION,
        type: "job",
        organizationId: organizationId(),
        name: name,
        normalizedName: normalize(name),
        code: code,
        customerName: customerName,
        aliases: aliases,
        normalizedAliases: aliases.map(normalize),
        status: status,
        updatedAt: fb.storeMod.serverTimestamp(),
        updatedByUid: currentUser.uid,
        updatedByName: text(currentProfile && currentProfile.displayName || currentUser.email)
      };
      if (editingId) {
        return fb.storeMod.updateDoc(jobDocument(fb, editingId), record);
      }
      record.createdAt = fb.storeMod.serverTimestamp();
      record.createdByUid = currentUser.uid;
      return fb.storeMod.addDoc(jobCollection(fb), record);
    }).then(function () {
      clearJobForm();
      setAdminStatus(editingId ? "Job updated." : "Job added.", "good");
      return refreshAdminJobs(true);
    }).catch(function (error) {
      setAdminStatus(error && error.message ? error.message : "The job could not be saved.", "bad");
    });
  }

  function renderAdminRows() {
    var box = byId("m410AdminRows");
    if (!box) return;
    var query = normalize(byId("m410AdminSearch") && byId("m410AdminSearch").value);
    var filtered = jobs.filter(function (job) {
      if (!query) return true;
      return [
        job.name, job.code, job.customerName, job.status, job.aliases.join(" ")
      ].some(function (value) { return normalize(value).indexOf(query) >= 0; });
    });
    box.innerHTML = "";
    if (!filtered.length) {
      box.innerHTML = '<div class="m410Empty">No matching jobs.</div>';
      return;
    }
    filtered.forEach(function (job) {
      var row = document.createElement("div");
      row.className = "m410Row " + (job.status === "archived" ? "archived" : "");
      row.innerHTML = [
        '<div><div class="m410RowName">' + escapeHtml(job.name) + '</div>',
        '<div class="m410RowMeta">' +
        escapeHtml([job.code, job.customerName, job.status].filter(Boolean).join(" · ")) +
        (job.aliases.length ? '<br>Aliases: ' + escapeHtml(job.aliases.join(", ")) : "") +
        '</div></div>',
        '<div class="m410RowActions"><button type="button" class="m410Edit">Edit</button></div>'
      ].join("");
      row.querySelector(".m410Edit").addEventListener("click", function () { editJob(job); });
      box.appendChild(row);
    });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function refreshAdminJobs(force) {
    setAdminStatus("Loading jobs…", "wait");
    return loadJobs(force).then(function () {
      renderAdminRows();
      refreshJobSelector();
      setAdminStatus(jobs.length + " standardized job" + (jobs.length === 1 ? "" : "s") + " loaded.", "good");
    }).catch(function (error) {
      setAdminStatus(error && error.message ? error.message : "Jobs could not be loaded.", "bad");
    });
  }

  function openJobsAdmin() {
    if (!isAdministrator()) return;
    var modal = ensureAdminModal();
    modal.classList.add("show");
    refreshAdminJobs(true);
  }

  function installLandingAdminButton() {
    if (!isLanding()) return false;
    var actions = document.querySelector(".m405UserActions");
    if (!actions) return false;
    var existing = byId("m410ManageJobs");
    if (!isAdministrator()) {
      if (existing) existing.style.display = "none";
      return true;
    }
    if (!existing) {
      existing = document.createElement("button");
      existing.id = "m410ManageJobs";
      existing.type = "button";
      existing.textContent = "Manage Jobs";
      existing.addEventListener("click", openJobsAdmin);
      var users = byId("m405ManageUsers");
      if (users && users.nextSibling) actions.insertBefore(existing, users.nextSibling);
      else actions.insertBefore(existing, actions.firstChild);
    }
    existing.style.display = "";
    adminInstalled = true;
    return true;
  }

  function boot() {
    ensureJobStyles();
    if (isShotWrapper()) installIntoShotFrame();
    loadFirebase().catch(function () {});
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (isLanding()) installLandingAdminButton();
      if (isShotWrapper()) installIntoShotFrame();
      if (isDrill() || isShot()) {
        installJobSelector();
        wrapInfoFunctions();
        installDocumentMetadataAdapter();
      }
      if (attempts >= 80 || (selectorInstalled && (!isLanding() || adminInstalled))) window.clearInterval(timer);
    }, 150);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MithrilJobs = {
    release: RELEASE,
    normalize: normalize,
    load: function (force) { return loadJobs(!!force); },
    list: function () { return clone(jobs); },
    find: findJob,
    openAdmin: openJobsAdmin,
    resolveCurrent: resolveVisibleJob
  };
})();