# MITHRIL Mobile

MITHRIL Mobile is a field-focused shot diagram and blast data entry application built as a single-file HTML app.

It is designed for use on phones and tablets through GitHub Pages and works as the mobile field-entry companion to the broader MITHRIL system.

## Live App

https://zscurtis.github.io/mithril_mobile/

The live production app is:

```text
index.html
```

## Current Version

**MITHRIL Canvas Mobile m33**

Recent milestones:

- **m31** — Fixed first-keypress loss after using Next Field.
- **m32** — Cleanup and polish, keypad restrictions, version handling, and Undo Last Page Move.
- **m33** — Added Total Rock Blasted to the PDF summary.

## Current Features

- Multi-page shot diagram canvas
- Zoom, fit, pan, and page navigation
- Add pages left, right, up, and down
- Hole-by-hole data entry
- Single Field Fill
- Quick Entry
- Custom MITHRIL keypad
- JSON backup and restore
- CSV export
- PDF print packet
- QA warnings
- Page data movement with undo
- Export filenames based on job, shot, and date

## Hole Data Fields

The primary hole entry order is:

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

Load entries are stored as text strings.

Examples:

```text
15A
2D
12A 1D
```

Meaning:

- `A` = feet of ANFO column
- `D` = number of dinks

For a 3.5-inch hole, the current known ANFO conversion is:

```text
3.55 lb/ft
```

Do not treat `15A` as 15 pounds.

## Current QA Rules

### Red warnings

- Missing load information

### Yellow warnings

- Missing overburden
- Missing depth
- Missing stemming

Bad holes and dirt holes are exempt from missing-load warnings.

## PDF Packet

The print packet includes:

1. Summary sheet
2. Full page-layout overview
3. Individual shot diagram pages

The summary includes:

- Shot information
- Saved, loaded, and unloaded hole counts
- Wet, bad, and dirt hole counts
- Total and average depth
- Total and average stemming
- Total and average loaded column
- Total rock blasted
- Red and yellow QA warning counts
- Diagram legend

## Export Naming

Exports use:

```text
Job Name - Shot ID - MM-DD-YYYY
```

Example:

```text
Broadcast District - 63 - 06-24-2026.pdf
```

This applies to PDF, CSV, and JSON exports.

## Publishing a New Version

1. Generate and test the new HTML file.
2. Open the GitHub repository.
3. Replace `index.html` with the new version.
4. Enter a commit message such as:

```text
Update MITHRIL Mobile to m34
```

5. Commit the change.
6. Wait briefly for GitHub Pages to republish.
7. Refresh the live site and verify the version label.

## Rollback

GitHub keeps every committed version.

To restore an earlier version:

1. Open the repository commit history.
2. Locate the last known-good commit.
3. Restore or re-upload that version as `index.html`.
4. Commit the rollback.

## Repository Safety

This repository is public.

Do not commit:

- Completed shot JSON backups
- Customer or jobsite addresses
- Explosives inventory records
- Internal company documents
- Passwords, API keys, or access tokens
- Any real operational data that should remain private

Only the application code and non-sensitive documentation should be stored here.

## Planned Development

Near-term priorities:

- Parse `A` and `D` load entries
- Total ANFO footage
- Total dink count
- Estimated explosive weights
- Loaded-column mismatch QA
- Undo Last Hole Edit
- Better Copy Previous options
- Individual-hole movement
- Saved shot defaults
- Installable web app support

Long-term goal:

```text
MITHRIL Mobile
      ↓
MITHRIL Shot Package
      ↓
MITHRIL Desktop / SQLite
      ↓
Reports, QA, history, and analytics
```

## Development Approach

- Keep versions practical and field-focused
- Preserve working features unless intentionally changing them
- Use small, testable version steps
- Keep `index.html` as the live production file
- Use GitHub commits as rollback checkpoints
- Keep the interface simple and intuitive
