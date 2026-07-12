MITHRIL MOBILE m37 — FINISH & SEND TO BLASTER

NEW
- Top button now says Finish & Send to Blaster.
- Creates the current drill log as a PDF and a JSON backup.
- Opens the device's native share menu with both files already attached.
- Outlook should appear as a share option when installed on the device.
- Clear file names use Job, Drill Log #, and Date.
- PDF contains every drill-log page plus extra notes pages for breakthroughs and hole notes.
- Menu now includes Export PDF as a manual fallback.
- Existing m36 drill data, breakthroughs, spatial pages, quick fill, JSON, and CSV remain compatible.

IMPORTANT LIMITATION
- A browser cannot confirm that Outlook actually sent the email.
- MITHRIL confirms only that the PDF and JSON were handed to the selected share app.
- The driller must choose the recipient in Outlook and tap Send.

GITHUB INSTALL
1. Keep the current production index.html unchanged.
2. Upload mithril_canvas_mobile_m37_test.html to the repository root.
3. Replace service-worker.js with the m37 service worker in this package.
4. Commit to main with: Add m37 finish and send to blaster
5. Wait for GitHub Pages to publish.
6. Open the normal MITHRIL site online once so the updated service worker installs.
7. Test m37 at:
   https://zscurtis.github.io/mithril_mobile/mithril_canvas_mobile_m37_test.html

TEST
1. Open Drill Log and enter Drill Log Info: Date, Drill Log #, Employee, and Job.
2. Enter several holes, including one yellow breakthrough with notes.
3. Add a second page and enter at least one hole there.
4. Tap Finish & Send to Blaster.
5. Confirm the device share menu opens with TWO attachments: one PDF and one JSON.
6. Select Outlook.
7. Confirm the email draft contains the two correct files with matching names.
8. Send the test email to yourself.
9. Open the PDF and confirm:
   - all drill-log pages are present,
   - overburden is in the upper half,
   - depth is in the lower half,
   - breakthrough holes are yellow,
   - breakthrough details/notes appear on appended notes pages.
10. Save the JSON attachment and load it back through Menu > Load Backup.
11. Confirm all pages, holes, breakthroughs, and notes restore correctly.
12. Refresh m37 and confirm existing m36/m37 local data remains.

EXPECTED PASS
- No manual file search is needed.
- Outlook receives the exact PDF and JSON generated from the open drill log.
- File names match the current Job / Drill Log # / Date.
- Existing drill-log features continue to work.

FALLBACK
If the browser cannot share both files, m37 downloads the PDF and JSON and explains that direct sharing should be tested from the GitHub Pages version in Chrome, Edge, or Safari.
