import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));

function extractFunction(source, name) {
  const start = source.indexOf("function " + name + "(");
  assert.notEqual(start, -1, "Missing function " + name);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unclosed function " + name);
}

function localReferences(html) {
  const refs = [];
  const pattern = /<(?:script|link|iframe|img)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const value = match[1].split(/[?#]/)[0];
    if (value.includes("${")) continue;
    if (value.startsWith("./")) refs.push(value.slice(2));
    else if (!/^(?:https?:|data:|mailto:|#)/i.test(value)) refs.push(value);
  }
  return refs;
}

function inlineScripts(html, filename) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    if (match[2].trim()) scripts.push({ filename, source: match[2] });
  }
  return scripts;
}

const configSource = read("mithril-config.js");
const configContext = { self: {} };
vm.createContext(configContext);
vm.runInContext(configSource, configContext, { filename: "mithril-config.js" });
const config = configContext.self.MITHRIL_CONFIG;
const versionMetadata = JSON.parse(read("version.json"));
assert.equal(config.version, versionMetadata.version, "Config and update metadata versions differ");
assert.ok(config.cacheName.includes(config.version.replaceAll(".", "-")), "Cache name does not contain the release version");

const javascriptFiles = [
  "mithril-config.js",
  "mithril-update.js",
  "mithril-menu.js",
  "mithril-core.js",
  "mithril-cloud.js",
  "mithril-jobs.js",
  "mithril-search.js",
  "service-worker.js"
];
for (const file of javascriptFiles) new vm.Script(read(file), { filename: file });

const htmlFiles = ["index.html", "shot_diagram_m38.html", "shot_diagram_m34.html"];
for (const file of htmlFiles) {
  const html = read(file);
  for (const script of inlineScripts(html, file)) {
    new vm.Script(script.source, { filename: script.filename + "#inline" });
  }
  for (const reference of localReferences(html)) {
    assert.ok(exists(reference), file + " references missing file " + reference);
  }
}

const expectedModuleOrder = [
  "mithril-update.js",
  "mithril-menu.js",
  "mithril-core.js",
  "mithril-cloud.js",
  "mithril-jobs.js",
  "mithril-search.js"
];
for (const file of ["index.html", "shot_diagram_m38.html"]) {
  const source = read(file);
  const actual = [...source.matchAll(/<script\s+src=["']\.\/([^"']+)["']><\/script>/g)]
    .map(match => match[1])
    .filter(name => name !== "mithril-config.js");
  assert.deepEqual(actual, expectedModuleOrder, file + " has the wrong module order");
}

const worker = read("service-worker.js");
assert.ok(!/patchCoreResponse|patchHTMLResponse|shouldPatchCore|shouldPatchHTML/.test(worker), "Service worker still contains runtime patching");
const shellMatch = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
assert.ok(shellMatch, "Service worker app shell was not found");
const shellFiles = [...shellMatch[1].matchAll(/["']\.\/([^"']+)["']/g)].map(match => match[1]);
for (const file of shellFiles) {
  if (file === "") continue;
  assert.ok(exists(file), "Service worker references missing file " + file);
}
for (const required of ["mithril-config.js", ...expectedModuleOrder]) {
  assert.ok(shellFiles.includes(required), "Service worker does not cache " + required);
}

const allPaths = fs.readdirSync(root, { recursive: true }).map(value => String(value));
const legacyPattern = /(?:mithril-menu-m\d+\.js|mithril-core-m400\.js|mithril-company-cloud|mithril-pending-home-hotfix|mithril-jobs-m410|mithril-cloud-search|mithril_canvas_mobile_m3[567]_test|README_M3[567]_TESTING|README\(1\)\.md)$/;
assert.equal(allPaths.filter(file => legacyPattern.test(file)).length, 0, "Legacy production files remain in the working tree");

const coreSource = read("mithril-core.js");
const documentMock = {
  readyState: "loading",
  title: "MITHRIL",
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
const windowMock = {
  MITHRIL_CONFIG: config,
  MITHRIL_UPDATE_CONFIG: {},
  addEventListener: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  console
};
const coreContext = {
  window: windowMock,
  document: documentMock,
  navigator: {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  alert: () => {},
  confirm: () => true,
  console,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  URL,
  Blob,
  TextEncoder,
  structuredClone
};
windowMock.document = documentMock;
windowMock.window = windowMock;
vm.createContext(coreContext);
vm.runInContext(coreSource, coreContext, { filename: "mithril-core.js" });
const coreApi = windowMock.__MITHRIL_M400_TEST__;
assert.ok(coreApi, "Core diagnostic API did not load");

const timingData = coreApi.collectTimingCheckData({
  1: {
    A1: { HoleID: "A1", Timing: "0", PrimaryLoad: "10A" },
    A2: { HoleID: "A2", Timing: "17", DirtHole: "Yes" },
    A3: { HoleID: "A3", Timing: "34", PrimaryLoad: "10A" }
  },
  2: {
    A1: { HoleID: "A1", Timing: "51", BadHole: "Yes" },
    A2: { HoleID: "A2", Timing: "7", PrimaryLoad: "10A" }
  }
});
assert.equal(timingData.excluded, 2, "Dirt/bad holes entered the compliance calculation");
assert.equal(timingData.entries.length, 3, "Loaded timing entries were not collected across both pages");
assert.equal(coreApi.maximumHolesPerDelay(timingData.entries, 8), 2, "Shot-wide holes-per-delay result is incorrect");
assert.equal(coreApi.findTimingConflicts([{ timing: 0 }, { timing: 8 }], 8).length, 0, "Exactly 8 ms should pass");

const roles = {
  blaster: coreApi.permissionsFor("blaster"),
  driller: coreApi.permissionsFor("driller"),
  driver: coreApi.permissionsFor("driver"),
  member: coreApi.permissionsFor("member")
};
assert.equal(roles.blaster.cloudDelete, false);
assert.equal(roles.driller.cloudDelete, false);
assert.equal(roles.driver.shot, true);
assert.equal(roles.driver.cloudWrite, true);
assert.equal(roles.member.drill, false);
assert.equal(roles.member.shot, false);
assert.equal(coreApi.roleLabel("member"), "Pending");

const menuSource = read("mithril-menu.js");
const timingContext = {};
vm.createContext(timingContext);
vm.runInContext(
  extractFunction(menuSource, "m397SequenceValues") + "\n" +
  extractFunction(menuSource, "m397TimingRecordEligible") + "\n" +
  "result = { values: m397SequenceValues(0, 17, 3), dirtEligible: m397TimingRecordEligible({ DirtHole: 'Yes' }), badEligible: m397TimingRecordEligible({ BadHole: 'Yes' }) };",
  timingContext
);
assert.deepEqual(Array.from(timingContext.result.values), [0, 17, 34], "Timing sequence did not advance across all saved positions");
assert.equal(timingContext.result.dirtEligible, true, "Dirt hole is not eligible for timing fill");
assert.equal(timingContext.result.badEligible, true, "Bad hole is not eligible for timing fill");

const shotSource = read("shot_diagram_m34.html");
const visibilityContext = { headerData: { TimingSequence: { hideDirtBadTiming: true } } };
vm.createContext(visibilityContext);
vm.runInContext(
  extractFunction(shotSource, "yesNoToBool") + "\n" +
  extractFunction(shotSource, "shouldDisplayHoleTiming") + "\n" +
  "result = { dirt: shouldDisplayHoleTiming({ DirtHole: 'Yes' }), bad: shouldDisplayHoleTiming({ BadHole: true }), loaded: shouldDisplayHoleTiming({ PrimaryLoad: '10A' }) };",
  visibilityContext
);
assert.equal(visibilityContext.result.dirt, false);
assert.equal(visibilityContext.result.bad, false);
assert.equal(visibilityContext.result.loaded, true);

console.log("MITHRIL release checks: PASS");
console.log("Version:", config.version);
console.log("Cached app-shell files:", shellFiles.length + 1);
console.log("Timing regression: 0, 17, 34 with dirt/bad timing retained and display-only hiding");
console.log("Shot-wide compliance regression: PASS across multiple pages; dirt/bad excluded; exactly 8 ms accepted");
