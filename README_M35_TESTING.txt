MITHRIL MOBILE m35 FIX 2

New in Fix 2:
- The upper-left MITHRIL mark now uses the repository icon.
- Tapping the icon or DRILL LOG 16x34 name saves drill-log state, opens index.html, and adds a refresh query so newly published app updates can be requested.
- Direct Android file testing falls back to the live GitHub Pages index.
- Service-worker cache version advanced to m35-test-v3.

MITHRIL Canvas Mobile m35 Fix 1 - Dual Template Prototype
===================================================

REASONING RECOMMENDATION
High - this version begins the permanent multi-template architecture while protecting the stable m34 production app.

FIX 1 - ANDROID LOCAL FILE HANDLING
- Android opens downloaded HTML files with a content:// address.
- A relative ./index.html link cannot resolve from that Android Downloads location.
- Shot Diagram now opens the live production MITHRIL site when the test file is opened locally.
- When the test file is opened from GitHub Pages, Shot Diagram still opens the repository index.html normally.
- This fixes ERR_FILE_NOT_FOUND without changing the drill-log data or calibration.

WHAT THIS TEST BUILD DOES
- Shows a template selector with Shot Diagram and Drill Log.
- Shot Diagram opens the current stable index.html already in the GitHub repository.
- Drill Log opens the new 16 x 34 construction drill-log prototype.
- The drill grid uses columns A-P and rows 1-34.
- Hole IDs run A1, B1 ... P1, then A2 ... P34.
- Upper half of each circle stores Overburden.
- Lower half stores Depth.
- Drill data is stored separately from shot-diagram data.
- Supports drill-log header info, multiple drill pages, quick fill, JSON backup/restore, and CSV export.
- The real uploaded Trinity 16 x 34 form is embedded inside the HTML for offline use after the file is loaded.

IMPORTANT
This is a SAFE TEST FILE. Do not replace index.html yet.
The current m34 production index.html remains unchanged. The included service-worker.js uses the m35 test v2 cache and adds the corrected test file to the offline cache.

GITHUB UPLOAD INSTRUCTIONS
1. Download and unzip this package.
2. Open the zscurtis/mithril_mobile repository on GitHub.
3. Click Add file > Upload files.
4. Upload both files in the same upload:
      mithril_canvas_mobile_m35_test.html
      service-worker.js
5. Confirm GitHub shows both files ready to upload.
6. Commit directly to main with a message such as:
      Add m35 drill log prototype test
7. Wait about 1-3 minutes for GitHub Pages to publish.
8. First open the normal production site once so the updated cache installs:
      https://zscurtis.github.io/mithril_mobile/
9. Then open:
      https://zscurtis.github.io/mithril_mobile/mithril_canvas_mobile_m35_test.html
10. Refresh once if GitHub Pages still shows a 404 immediately after the commit.

TESTING INSTRUCTIONS
A. Template selector
1. Confirm both Shot Diagram and Drill Log choices appear.
2. Tap Shot Diagram.
3. If opened locally from Android Downloads, confirm the live production site opens.
4. If opened from GitHub Pages, confirm the stable repository index.html opens.
5. Use the browser Back button to return to the m35 test file.

B. Drill log grid
1. Tap Drill Log.
2. Tap Fit.
3. Confirm the real 16 x 34 Trinity form appears.
4. Confirm column labels A-P appear above the grid.
5. Confirm row labels 1-34 appear along the left side.
6. Tap several circles in different areas, including A1, P1, A34, and P34.
7. Confirm the hole editor identifies the expected hole.

C. Hole entry
1. Enter Overburden and Depth for A1.
2. Tap Save.
3. Confirm Overburden appears in the upper half of A1.
4. Confirm Depth appears in the lower half.
5. Reopen A1 and confirm both values were retained.
6. Test Save + Next and confirm it advances left-to-right:
      A1 > B1 > C1 ... P1 > A2
7. Test Copy Previous.
8. Test Clear.

D. Storage separation and persistence
1. Add data to several drill holes.
2. Refresh the m35 test page.
3. Open Drill Log again.
4. Confirm the drill data remains.
5. Open Shot Diagram and confirm its existing data remains unchanged.

E. Additional prototype tools
1. Open Menu > Drill Log Info and enter Date, Drill Log #, Employee, and Job.
2. Confirm the values appear on the form.
3. Add Page 2 and enter different data.
4. Switch between pages and confirm each page keeps independent data.
5. Test Quick Fill for Overburden and Depth.
6. Download a JSON backup.
7. Export CSV.
8. Clear the drill data, then reload the JSON backup.

EXPECTED PASS RESULTS
- m34 index.html is untouched.
- Shot Diagram still opens and works normally.
- Drill Log uses the real 16 x 34 construction form.
- Hole selection matches A-P across and 1-34 downward.
- Overburden is drawn above the divider.
- Depth is drawn below the divider.
- Drill pages and shot-diagram data never mix.
- Drill data survives refresh.
- JSON backup and restore work.

KNOWN PROTOTYPE LIMITS
- The drill-log PDF report is not implemented yet.
- The drill-log text and tap calibration may need small field adjustments after device testing.
- Quarry 8 x 16 and 10 x 20 templates are not included yet.
- The m35 selector is not yet the production index.html.
