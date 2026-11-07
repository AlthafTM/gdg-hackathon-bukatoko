# Integrated backend and updated UI

## Sources and scope

- Main baseline: `0cbb982` (0.5.2).
- Existing backend feature branch: `09394bf8100a348fc153834e90aa5926277a0953` (`feat/bukatoko-0.2`), incorporated through a real merge.
- The collaborator reported a completed but unpublished frontend integration at the Instabox origin. Twelve public HTML/CSS/JS files were retrieved read-only from that origin and used to resolve the frontend merge. Their URLs, sizes and SHA-256 values are in `integration/frontend-source-manifest.json`.
- The reported private staged patch and backup directory were not accessible from this machine. This document does not claim that their exact private index was copied. Repository backend/tests plus the publicly served frontend were integrated and tested locally instead.
- No live login, application-data export, moderator action, remote filesystem write or remote process restart was performed. The active Instabox database and uploads were not touched.

## Compatibility

The unified server retains the feature branch's same-origin sessions and CSRF contract. The newer frontend retains notifications, transactions, verification, editing, public comments/likes, wanted replies, moderation and search enhancements. The `/p/<id>` Open Graph insertion works independently of the branded document title. The earlier experimental CORS changes from main are not required or included in this unified backend.

The catalog now uses React and compiled Tailwind utilities; existing non-catalog controllers remain. All nine server pages load the shared assets. Pages exports deliberately include only the seven public preview screens, not moderation or server 404 screens. Pages still fetches bundled sample data; the Instabox link remains separate.

The supplied logo was visually checked in the local browser and reads **BukaToko**. It was retained; the collaborator's reported Bukalapak wordmark was not reproduced in this check.

## Validation

- Disposable local application/database copy: 53 API smoke checks, 70 feature/security/lifecycle fixture checks and 40 structural UI checks passed. These are regression tests, not a comprehensive security audit or live backend test.
- Production React/Tailwind compilation passed. Node checks cover preview/export behavior, locale, motion, API connection helpers, keyed React appends/root disposal and React language updates.
- Authorized local browser: seven public screens checked at requested viewport widths 390, 768 and 1440 in both themes; no horizontal document overflow in the recorded measurements. English remained selected across navigation; an Indonesian switch and subsequent page navigation also retained its language. Wanted-list/form tops aligned on desktop.
- Browser actions: mobile filter expansion, keyword filtering, language switching, theme reveal, detail navigation, and local fixture login/reload passed. The eight account tabs and moderator gate were present; notification/transaction empty states and the moderation screen opened without console errors in the local fixture.
- Browser visual checks are samples, not exhaustive click-through of every administrative/destructive action or a measured animation frame-rate guarantee. Reduced-motion behavior is covered by automated tests.

## Updating the existing Instabox frontend

From this repository, run `npm ci --ignore-scripts`, `npm run build`, then `python tools/package_frontend.py`. The resulting `artifacts/bukatoko-frontend-<VERSION>.zip` contains only nine HTML pages, public assets and a hash manifest. It contains no server.py, database, uploads, tests or runtime configuration pointing at another origin.

The collaborator with hosting access should first preserve their unfinished merge/patch and back up the existing HTML/assets. Inspect and extract this frontend package into the existing application directory; do not replace server.py, the database, uploads or service configuration. The service's existing file-serving behavior determines whether a restart is necessary. Verify the same-origin UI, login/CSRF, moderation links and uploaded photos after deployment. Restore only the saved frontend if rollback is needed.

This agent cannot deploy to Instabox through a moderator login: no remote terminal/file access is available. Publishing the repository and GitHub Pages does not update the running Instabox filesystem. The prepared frontend package is the handoff for that final hosting step.
