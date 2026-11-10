# GitHub Pages read-only preview

Version 0.5.2 restores the Pages workflow's selection of `_site`, the self-contained read-only artifact, rather than `_site-live`. The preview adapter fetches its bundled `assets/preview-data.json` from the same Pages repository path. Browsing does not depend on the Instabox API. A separate **Buka aplikasi langsung** link opens the live Instabox app. See [the existing backend contract](BACKEND-CONNECTION.md); do not replace that backend for this preview repair.

URL: https://althaftm.github.io/jualinaja/

The read-only preview uses the existing app design and built-in sample listings. It supports browsing, search, category/city/price filters, sorting, pagination, item details, seller profiles and wanted requests with price ranges. Seed listings use credited reference stock photos bundled with the app.

Accounts, listing creation, uploads, saved items/searches, offers, messages, reviews, reports and blocking require the Python server described in `app/README.md`. Preview authentication buttons explain this boundary without collecting credentials. Non-GET API requests are rejected locally. Theme and language preferences can still use browser storage.

## Build and check locally

For the React/Tailwind update, run `npm ci --ignore-scripts` and `npm run build` before exporting. `npm test` checks the UI components; `python tools/check_app.py` runs the integrated backend suites using a disposable application/database copy. Node is needed for frontend development, not for serving the checked-in compiled assets with Python.

1. Synchronize `main` using the contributor workflow.
2. Run `python tools/build_pages.py --app-url https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech` with an empty or absent `_site` directory. The link option does not change the data source or inject the remote API configuration.
3. Run `node --test tests/test_pages.cjs` and `node --check app/assets/app.js`.
4. Serve the generated directory with `python -m http.server 8124 --directory _site` and open `http://127.0.0.1:8124/`.
5. Check search, filters, details, seller links, wanted requests, mobile layout and the sign-in explanation. Shared listing URLs must retain the repository subpath on Pages.

The builder reads only literal `SEED_*` constants via Python AST; it never imports or starts the server. It writes an allowlisted frontend artifact and public sample fixtures. No database, uploads, email addresses, password hashes, server source, tests or research evidence are deployed. The adapter is inserted only into generated HTML; running the full app with Python keeps its normal API behavior. Build output is ignored by Git. The builder refuses to overwrite nonempty output; remove only your verified generated `_site` directory before rebuilding.

## Deployment and updates

The repository's Pages publishing source is **GitHub Actions**. `.github/workflows/pages.yml` builds and tests the static preview, separately exercises the optional connected-export fixture, then deploys only `_site` to the `github-pages` environment. Official action dependencies are pinned. Only the deployment job has Pages and OIDC write permissions. PRs do not deploy.

Work on `main` unless the user explicitly requests a separate branch. Local work does not authorize publication. An authorized push to `main` deploys the preview and independently runs repository checks and release publication. Include the required version/changelog/release notes for every published update. Verify all three workflows and the live URL before reporting success. To recover a deployment, rerun its failed job or publish a reviewed correction with the next version; do not rewrite published tags.
