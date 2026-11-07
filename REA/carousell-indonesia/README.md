# Carousell Indonesia investigation

Start with [the PDF](CAROUSELL-DESIGN-DOCUMENT.pdf), [editable design document](CAROUSELL-DESIGN-DOCUMENT.md), and [collaborator handoff](HANDOFF.md). The PDF includes the complete findings, source ledger, reproduction and implementation steps, nine screenshots, and all 326 endpoint-registration candidates. Research date: 7 November 2026, Asia/Jakarta.

For AI-assisted work, use the [complete plain-text reference](CAROUSELL-DESIGN-DOCUMENT.txt). It preserves all human-readable findings, source URLs, repository context, procedures, screenshot file references and all endpoint candidates. It does not replace the image evidence or raw REA export. Regenerate it with `python tools/export_txt.py` after changing the source documents or root README.

Historical file references in the original report use the acquisition folder layout. In this repository, JSON evidence is under `evidence/`, browser DOM/accessibility captures are under `evidence/browser/`, and the full REA export is gzip-compressed under `evidence/rea-evidence-bundle.json.gz`. Screenshots remain under `screenshots/` and downloaded bundles under `web-assets/`.

The three DOM HTML exports are partial and end with `[Truncated]` at approximately 200,000 characters. Do not parse them as complete page source or interpret omitted content as absent. Their limits are also recorded in the report.

## Compact reading set

- `CAROUSELL-DESIGN-DOCUMENT.md`: main report and reconstruction design.
- `app-research.md`: 17 official app/help sources, including Indonesia restrictions.
- `rea-static-summary.json`: REA summary, artifact identity and analysis limits.
- `asset-manifest.json`: exact public bundle URLs, sizes and SHA-256 digests.
- `endpoint-candidates.json`: static endpoint-registration occurrences, not live API verification.
- `framework-markers.json`, `search-code-observations.json`, `static-candidates.json`: supporting literal-code observations with file offsets/context.
- `screenshots/`, `*-ax.txt`, `*-dom.html`: successful in-app browser observations, distinct from the blocked REA browser attempt.
- `verification.json`: local deliverable integrity checks.

## Full evidence

`evidence/rea-evidence-bundle.json.gz` expands to the 233,639,453-byte canonical REA export, with nine evidence records and one open unknown. Read the small summary first. `web-assets/` preserves the 43 acquired public JavaScript files. The full export includes earlier/narrower analysis and the blocked browser attempt as well as the 43-file analysis; use the exact evidence IDs in the report.

Run `node tools/inspect-assets.cjs` to regenerate the asset manifest, endpoint candidates and framework markers from local bytes. Run `python tools/build_pdf.py` to rebuild the PDF and `python tools/verify_package.py` to verify package identity. Full setup instructions and dependencies are in the handoff.

No authenticated transaction, app installation, native package decompilation, upload, message, offer, publication or purchase was performed. Backend schemas and architecture in the design document are expressly proposed. Native internals and authenticated behavior remain open. The evidence does not authorize copying production content or analytics configuration into a new product.
