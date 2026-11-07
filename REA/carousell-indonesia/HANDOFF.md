# Collaborator handoff and reproduction steps

## What to use

Read the PDF for the complete findings, source ledger, reconstruction design, screenshots and this procedure. Use `CAROUSELL-DESIGN-DOCUMENT.txt` as the complete plain-text reference for AI-assisted work. Use the Markdown design document as the editable source. Raw machine evidence is preserved separately in the repository.

Observed behavior, static code candidates, official documentation, proposed designs and unknowns have distinct labels throughout. Do not implement the proposed API paths as if they were recovered production contracts. Do not enable other-market checkout or AI features for Indonesia from shared-bundle strings alone.

## Folder structure

```text
REA/carousell-indonesia/
  CAROUSELL-DESIGN-DOCUMENT.pdf
  CAROUSELL-DESIGN-DOCUMENT.txt
  CAROUSELL-DESIGN-DOCUMENT.md
  HANDOFF.md
  app-research.md
  screenshots/
  evidence/
    rea-evidence-bundle.json.gz
    asset-manifest.json
    endpoint-candidates.json
    framework-markers.json
    rea-static-summary.json
    rea-search-module.json
    search-code-observations.json
    static-candidates.json
    style-observations.json
    browser/                 # DOM and accessibility snapshots
  web-assets/                # 43 exact downloaded public bundles
  tools/
    build_pdf.py
    export_txt.py
    inspect-assets.cjs
    verify_package.py
  requirements.txt
  package-manifest.json
  pdf-validation.json
```

## Rebuild this PDF

1. Clone the repository and enter `REA/carousell-indonesia`.
2. Use Python 3.11 or later and create a local virtual environment: `python -m venv .venv`.
3. Activate the environment. On Windows use `.venv\Scripts\Activate.ps1`; on macOS/Linux use `source .venv/bin/activate`.
4. Install the pinned authoring dependencies: `python -m pip install -r requirements.txt`.
5. Run `python tools/build_pdf.py` and `python tools/export_txt.py`. The scripts read the Markdown, app source ledger, this handoff, screenshot files and endpoint inventory. They write the PDF and complete plain-text reference. They do not visit Carousell or execute its bundles. The text exporter also includes the root repository README for project context.
6. Run `python tools/verify_package.py` to validate the package hashes and parse the PDF. A deliberately edited source requires regenerating `package-manifest.json` before the integrity check can pass; the verifier explains which file changed. Use `python tools/verify_package.py --write-manifest` only after reviewing the intended changes.
7. Install Poppler separately if needed. Render with `pdftoppm -r 90 -png CAROUSELL-DESIGN-DOCUMENT.pdf review/page` after creating the `review` directory. Inspect every page for clipped tables, missing text, unrendered diagrams and unreadable screenshots. Text extraction alone is insufficient.
8. Commit the updated Markdown, PDF, manifest and validation results together. Keep temporary virtual environments and rendered review images out of Git.

The builder uses Arial/Consolas on Windows and DejaVu or Liberation fonts on common Linux systems, falling back to PDF base fonts if unavailable. Font metrics can change pagination. Recheck all pages after rebuilding on a different machine.

## Recover the full REA export

The canonical export is compressed because its original JSON is 233,639,453 bytes. The gzip file preserves all nine retained evidence records and the open residual unknown. The small `rea-static-summary.json` is the normal first reading target.

```text
python -c "import gzip,shutil; a=gzip.open('evidence/rea-evidence-bundle.json.gz','rb'); b=open('rea-evidence-bundle.json','wb'); shutil.copyfileobj(a,b); b.close(); a.close()"
```

Check the expanded file's SHA-256 against `evidence/rea-export-identity.json`. Do not commit the expanded JSON; it exceeds GitHub's ordinary per-file limit. The package verifier checks the compressed export and its expanded identity without loading the entire JSON into memory.

## Reproduce the investigation

1. Read the project's `AGENTS.md` and the installed `reverse-engineer-anything` skill. Its actual tool names and schemas may differ by version.
2. Record the target country, date, browser build, account state, language, theme and viewport. Start with the Indonesia domain. Use a guest session before any authorized account session.
3. Inspect the REA session once and reuse matching evidence. For a browser action, use a declared REA browser scenario; for an existing user-operated browser, start with target discovery and passive capture. Do not treat a blocked capture as the application's API traffic.
4. The original isolated Chrome attempt reached Cloudflare. The successful public observations used the in-app browser. If protection blocks access, retain that result and use an ordinary supported browser session; do not bypass the protection.
5. Inspect home, category drawer, phone category, global search, price filter, no-results state, a listing, Chat sign-in, seller profile, reviews and photo-first Sell entry. Search for equivalent current items when an old listing disappears. Record changes as new evidence rather than altering historical observations.
6. Capture screenshots and DOM/accessibility snapshots after content settles. Observe desktop and mobile separately, and record whether a theme or language was actually tested. Restore temporary viewport settings.
7. Inventory only public assets actually referenced by the target page. Save original bytes, URL, byte count and SHA-256. Do not execute downloaded bundles as local scripts.
8. Use REA JavaScript analysis with summary delivery. Inspect retained module identities and only the feature boundaries needed. Preserve heap, graph and dynamic-resolution limits. The original 43-file analysis parsed all files but did not fully resolve their semantic graph.
9. To regenerate the syntactic asset inventory, run `node tools/inspect-assets.cjs`. It reads local bundles, produces endpoint/library candidates, and does not contact any candidate API.
10. Consult current official Indonesian help and official app stores. Keep help policy, store marketing, code presence and executed behavior separate. Country-specific restrictions take precedence over assumptions drawn from shared bundles.
11. Native completion needs an official device/build and a legitimately acquired package. Record build identity and use dedicated authorized accounts. No native package was inspected in the original work. Do not infer its framework from the web stack.
12. Export REA evidence and retain exact IDs. Update the coverage/unknown register. Write observed findings first and mark engineering proposals explicitly. Validate the PDF visually before sharing.

## Build the reconstruction from the result

1. Implement market/language/theme configuration, category IDs and attribute schemas, public browsing, cards, URL-backed filters, item details and seller reputation.
2. Add contextual identity, photo drafts and validated publishing. Decide upload limits and authenticated transitions using new evidence where this report is unresolved.
3. Add participant-authorized conversations, idempotent offers, atomic acceptance and server-enforced review eligibility. Use controlled buyer/seller accounts to test concurrency.
4. Add likes, saved searches, notification policy, reporting, narrow blocking semantics and retention jobs.
5. Validate both themes, keyboard use, empty/error/loading states, narrow-width overflow, image failure and stale listing state. Use the acceptance matrix in the design document.
6. Keep native parity, current seller entitlements and live wire contracts as separate follow-up investigations. Do not claim these are complete from this public-web report.

## Change discipline

Preserve the original evidence snapshots and date. Put new captures under a new dated evidence folder and record their identities. Never include passwords, cookies, private message bodies, authorization headers or personal account exports in commits. Historical guest snapshots contain public advertisements and attribution values; they are evidence rather than reusable application configuration.
