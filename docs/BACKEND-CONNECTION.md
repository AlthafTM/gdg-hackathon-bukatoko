# Existing Instabox backend: frontend connection

Version 0.6.0 unifies the feature-branch backend and the publicly served integration with the React/Tailwind catalog. See [integration evidence and frontend deployment](INTEGRATION-2026-11-08.md). The GitHub Release includes a frontend-only ZIP for the collaborator with hosting access; publishing the repository does not replace the running Instabox files.

For access requirements and a deployment prompt for the collaborator's AI, see
[hosting handoff](HOSTING-HANDOFF.md). The user's supplied deployment report
describes the earlier v0.5.2 deployment. The older investigation and validation
notes below are historical and do not describe the complete v0.6.0 main frontend.

Configured backend origin:
https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech

Correction: the earlier instructions assumed that the deployed backend matched main's older server. That assumption was not verified. The moderator panel supplied by the user corresponds to functionality documented on `feat/bukatoko-0.2`; do not overwrite the existing server, database or uploads to connect the frontend.

## Read the existing contract first

Sources inspected at immutable commit `09394bf8100a348fc153834e90aa5926277a0953`:

- [Existing app guide](https://github.com/AlthafTM/gdg-hackathon-bukatoko/blob/09394bf8100a348fc153834e90aa5926277a0953/app/README.md): one Python service serves HTML, assets, API and uploaded photos; port 8123 is exposed through `instabox-port`.
- [Existing frontend](https://github.com/AlthafTM/gdg-hackathon-bukatoko/blob/09394bf8100a348fc153834e90aa5926277a0953/app/assets/app.js): relative API paths, same-origin credentials and the `bk_csrf` cookie forwarded as `X-CSRF-Token` on writes, including uploads.
- [Existing server](https://github.com/AlthafTM/gdg-hackathon-bukatoko/blob/09394bf8100a348fc153834e90aa5926277a0953/app/server.py): session/CSRF cookies use SameSite=Lax; authenticated writes validate the session's CSRF value. This inspected version does not implement credentialed cross-origin CORS.

These are source observations, not proof of the exact revision currently running at Instabox. The public URL could not be read by the web tool. Moderator credentials from the user's screenshot are not copied into repository files and were not used to sign in.

## Connect without changing backend code

Serve the frontend on the same public origin as the existing backend. Use relative `/api/...` and `/uploads/...` paths, same-origin credentials, and the existing CSRF contract. The local frontend has been updated to send the cookie token on JSON writes and multipart uploads. Tokens are not stored in browser storage or forwarded from an unrelated Pages origin.

Publishing UI assets to the existing frontend directory requires access to that hosting environment. It does not require replacing server.py or restarting/reseeding its database. Preserve the existing moderator page, feature-specific frontend code, uploads and user data. Main v0.6.0 includes the feature-branch screens and the compatibility checks documented in the integration report.

Alternatively, a same-origin reverse proxy can serve the UI and forward API/uploads to the unchanged backend. GitHub Pages alone cannot provide such a proxy. This is an alternative hosting setup, not something configured by this document.

## Current Pages limitation

The published v0.5.1 workflow selected a cross-origin build using the Instabox URL. This does not match the inspected existing backend's same-origin contract and has not been shown to work. Version 0.5.2 restores `_site`, retaining the bundled-data adapter and linking to Instabox for live operations. A successful Pages deployment and mocked connection tests do not verify a working deployed API connection.

The default `python tools/build_pages.py` produces a read-only preview. Adding `--app-url https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech` adds a link to the existing app without changing where preview data is fetched. No frontend assets are published to Instabox by this command. Do not use `mode: no-cors`, disable CSRF, or copy moderator credentials into frontend code.

The optional CORS/cookie changes previously added to main are not a required migration for the user's existing backend. Do not deploy them over the working service merely to accommodate the Pages configuration.

## Validation status

Version 0.5.2 includes the same-origin CSRF adjustment and its regression cases. Syntax checks inspect source without executing it; configured runtime checks run through GitHub Actions after the authorized publication. Local runtime tests require the execution sandbox specified by the installed security-audit skill, which is unavailable on this host. No authenticated live requests or backend modifications were performed.

- In an isolated fixture matching the existing backend revision, verify login, CSRF headers on writes/uploads, normal reads and negative cases for missing/wrong tokens.
- Confirm the existing moderator/transaction/notification pages retain their original behavior before replacing any hosted frontend asset.
- Verify the exact deployed revision and a same-origin browser session before reporting a working live connection.

The two earlier security findings concerned main's older server source. They must not be attributed to the different deployed backend without reviewing its own code and revision.

Protocol references: [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) and [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
