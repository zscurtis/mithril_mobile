# MITHRIL Mobile

**MITHRIL Mobile** is a field-focused drill log, shot diagram, loading, timing, and blast-data application designed for phones, tablets, and desktop browsers.

It is the mobile field-entry component of the broader **MITHRIL** project:

> **Modular Integrated Timing & Hole-pattern Reporting, Inventory & Logistics**

MITHRIL Mobile is built as an offline-capable static web application hosted through GitHub Pages. Current development emphasizes fast field entry, reliable local saving, clear QA, practical exports, and controlled cross-device data transfer.

## Live App

**https://zscurtis.github.io/mithril_mobile/**

The live production entry point is:

```text
index.html
```

## Current Version

**MITHRIL Mobile m39.9.1 — Cloud Download Compatibility Fix**

Current release line:

- **m39.7** — Added Shot Diagram Timing Sequence Mode and expanded field-entry workflows.
- **m39.8** — Added Drill Log-to-Shot Diagram conversion while preserving the physical hole layout.
- **m39.9** — Added private manual Firebase cloud upload and download.
- **m39.9.1** — Fixed cross-device Drill Log restoration after the first live Firebase test.

## Current Application Areas

### Drill Log

- 16-column by 34-row construction drill-log template
- Columns `A–P` and rows `1–34`
- Multi-page layouts
- Depth and overburden entry
- Wet, dirt, bad, and breakthrough conditions
- Notes and structured hole-condition data
- Pattern definitions and assignments
- Quick Entry and Single Field Fill
- JSON, CSV, and PDF export
- Drill Log-to-Shot Diagram conversion

### Shot Diagram

- Multi-page shot diagram canvas
- Zoom, fit, pan, and page navigation
- Add pages left, right, up, and down
- Hole-by-hole editing
- Overburden, depth, stemming, load, timing, and condition entry
- Physical Keyboard and Touch Keypad modes
- Quick Entry and Single Field Fill
- Timing Sequence Mode
- Hole, row, column, selection, and page movement tools
- GPS and page-position support
- JSON backup and restore
- CSV export
- PDF summary and print packet
- QA warnings and calculated totals

### Cloud Sync Prototype

The current cloud-sync system is intentionally manual and local-first.

It supports:

- Firebase email/password sign-in
- Private records scoped to the signed-in account
- Device naming
- Manual upload of the current Drill Log or Shot Diagram
- Cloud document listing
- Revision numbers
- Updated date, time, and source-device information
- Confirmed download onto another device
- Delete Cloud Copy without deleting the local document

The cloud system does **not** yet automatically synchronize every edit. Local browser storage remains the primary working copy, and field entry continues to work without an internet connection.

## Drill Log-to-Shot Diagram Import

MITHRIL can convert populated Drill Log pages into a new Shot Diagram.

The Drill Log uses a `16 × 34` layout. The Shot Diagram uses a `16 × 15` layout. Each populated Drill Log page can therefore become up to three vertically stacked Shot Diagram pages.

Examples:

```text
Drill A1  → Shot A1
Drill B1  → Shot A2
Drill A2  → Shot B1
Drill A16 → Next Shot page A1
Drill A31 → Third Shot page A1
```

The import copies compatible drilling data while intentionally leaving loading and timing fields blank for the blaster to complete.

Copied data includes:

- Depth
- Overburden
- Wet, dirt, and bad flags
- Notes
- Hole conditions
- Pattern assignments
- Hole diameter
- Pattern definitions
- Header information

Intentionally blank after import:

- Stemming
- Primary load
- Secondary load
- Timing

## Hole Data Fields

The main Shot Diagram entry order is:

1. Overburden
2. Depth
3. Stemming
4. Primary Load
5. Secondary / Special Load
6. Timing
7. Dirt Hole
8. Bad Hole
9. Wet Hole
10. Notes

## Load Entry Format

Load entries are stored as compact text strings.

Examples:

```text
15A
2D
12A 1D
```

Meaning:

- `A` = feet of ANFO column
- `D` = number of dinks

For a 3.5-inch hole, the current ANFO conversion used by the project is:

```text
3.55 lb/ft
```

`15A` means 15 feet of ANFO column, not 15 pounds.

## Timing Sequence Mode

Timing Sequence Mode supports repetitive row timing without manually typing every hole value.

Current capabilities include:

- User-defined starting time
- User-defined interval
- Left-to-right or right-to-left fill
- Reset next row start
- Blank-only or overwrite behavior
- Row, column, selection, and page-based timing workflows
- Timing-specific undo
- Clear indication when Timing Fill is active

## QA and Calculations

MITHRIL provides field-level warnings and summary calculations.

Typical QA categories include:

### Red warnings

- Missing required load information

### Yellow warnings

- Missing overburden
- Missing depth
- Missing stemming

Bad and dirt holes can be exempted from load warnings where appropriate.

Current summary metrics include:

- Total holes
- Loaded holes
- Unloaded holes
- Dirt holes
- Bad holes
- Wet holes
- Total depth
- Total stemming
- Total loaded column
- Total rock blasted
- Average depth
- Average stemming
- QA warning counts

## PDF Packet

The Shot Diagram print packet includes:

1. Summary sheet
2. Full project overview
3. Individual landscape shot-diagram pages

The Drill Log also supports PDF export for field records and review.

## Export Naming

Exports use job, document number, and date where available.

Example:

```text
Job Name - Shot ID - MM-DD-YYYY.pdf
```

JSON, CSV, and PDF exports follow the same general naming approach.

## Hosting and Data Architecture

MITHRIL currently uses two separate systems:

```text
GitHub Pages
└── Hosts the application files and update packages

Firebase
└── Stores authenticated private cloud copies of MITHRIL documents
```

GitHub is the application distribution and rollback system. It is **not** used to store live shot, drill, explosives, or customer data.

The device retains a local working copy so MITHRIL can remain usable offline.

## Repository Structure

Important production files include:

```text
index.html                  Main MITHRIL home and Drill Log
shot_diagram_m38.html       Shot Diagram wrapper
shot_diagram_m34.html       Stable Shot Diagram core
mithril-menu-m397.js        m39.7 field workflow and timing features
mithril-menu-m398.js        Drill Log-to-Shot Diagram import
mithril-menu-m399.js        Firebase cloud-sync prototype
mithril-update.js           User-controlled update system
service-worker.js           Offline cache and release helper injection
version.json                Published release metadata
manifest.webmanifest        Installable web-app metadata
```

The current release strategy preserves stable HTML cores and adds new functionality through versioned helper scripts where practical.

## Publishing a New Version

Each release package includes exact upload instructions. Follow that package README rather than assuming every release replaces the same files.

Typical process:

1. Download and extract the release ZIP.
2. Upload the listed files to the top level of the repository.
3. Replace existing files only when instructed.
4. Commit directly to `main`.
5. Confirm the GitHub Pages deployment completes.
6. Check `version.json` on the live site.
7. Use **Check for Updates** inside MITHRIL.
8. Run the release-specific PASS test.

GitHub Pages occasionally fails to rebuild immediately. A harmless committed edit to `version.json` can be used to trigger a new deployment.

## Rollback

GitHub commits are retained as rollback checkpoints.

To roll back:

1. Locate the last known-good release package or commit.
2. Restore the files listed in that release.
3. Commit the rollback to `main`.
4. Confirm GitHub Pages republishes.
5. Reopen MITHRIL and verify the restored version.

Local MITHRIL documents and Firebase cloud records are separate from the GitHub code repository and are not normally deleted by an application rollback.

## Repository Safety

This repository is public.

Do not commit:

- Completed Drill Log or Shot Diagram JSON files
- Customer names, addresses, or jobsite coordinates
- Explosives inventory records
- Seismograph records
- Internal company documents
- Firebase account passwords
- Service-account files
- Private keys or administrative credentials
- Real operational PDFs
- Any field data that should remain private

Only application code, non-sensitive examples, and public documentation should be stored here.

## Current Development Priorities

Near-term priorities include:

- Prove reliable Drill Log and Shot Diagram transfer across devices
- Strengthen revision and conflict protection
- Add cloud-document search and clearer metadata
- Improve download recovery and undo protection
- Measure real document sizes and operation counts
- Continue preserving complete offline operation
- Evaluate controlled user roles only after the private prototype is stable

Longer-term possibilities include:

- Automatic synchronization with an offline queue
- Company users and role-based permissions
- Job and shot assignments
- Shared operational records
- MITHRIL Desktop / SQLite integration
- Structured exchange with existing company systems
- Strayos data integration where useful
- B2W-generated PDF import into the broader MITHRIL workflow

## Development Approach

- Keep the interface simple and field-focused
- Preserve working features unless intentionally changing them
- Use small, testable releases
- Keep rollback packages
- Save locally before depending on cloud services
- Require confirmation before replacing local data
- Prefer explicit uncertainty over silent assumptions
- Test on desktop, iPad, and field devices before treating a release as stable

## Status

MITHRIL Mobile is under active development and should be treated as a working prototype until its cloud workflows, access controls, conflict handling, and field testing are complete.
