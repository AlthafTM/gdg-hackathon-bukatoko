# Connecting Pages to the Instabox backend

Configured backend origin:
https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech

This is a prepared configuration, not a verified live connection. The running Instabox service must receive the updated server code and configuration below. Its availability, tunnel authentication, CORS and cookie behavior have not been tested against the deployed endpoint.

## Start the updated backend

On the machine hosting the existing Python service, preserve its database and uploads, update the application files, and restart the service with these environment variables. The exact Pages origin has no repository path and no trailing slash.

```bash
export BUKATOKO_CORS_ORIGINS=https://althaftm.github.io,https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech
export BUKATOKO_CROSS_SITE_COOKIES=1
cd app
python3 server.py 8123
```

For PowerShell:

```powershell
$env:BUKATOKO_CORS_ORIGINS = 'https://althaftm.github.io,https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech'
$env:BUKATOKO_CROSS_SITE_COOKIES = '1'
Set-Location app
python server.py 8123
```

Configure these variables in the actual service definition if a process manager starts Python. Restart that service instead of launching a second process on port 8123. Keep the existing tunnel forwarding HTTPS to localhost:8123; the Python listener remains loopback-only. Do not replace the database or uploads with sample files.

Cross-site mode sets HttpOnly, Secure and SameSite=None cookies. It permits credentialed CORS only for exact configured HTTPS origins, rejects untrusted write origins, and handles JSON preflight. Without these variables local development retains same-origin requests and SameSite=Lax cookies. Requests without Origin are rejected for writes when cross-site mode is enabled; API clients in that mode must send a trusted Origin. Origins sharing the same GitHub account are one browser trust boundary, regardless of repository path.

## Build the frontend

```text
python tools/build_pages.py --output _site-live --api-origin https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech
```

Use an absent or empty output directory. The generated pages load `runtime-config.js` before `app.js` and omit the read-only adapter. API requests and uploads use the configured origin with credentials included. Uploaded photos resolve against the backend; bundled photos and other assets stay on Pages. Share links retain the Pages repository path. API failure is shown as an error rather than silently switching to sample data.

The Pages workflow first builds and tests the read-only artifact, then builds the connected artifact and runs connection tests. It publishes `_site-live` only after an explicitly authorized push. The unconfigured `python tools/build_pages.py` command still builds the read-only preview. No commit, deployment or remote service restart is performed by editing this configuration.

Some browsers block third-party cookies even with SameSite=None. The connected-page notice includes **Buka aplikasi langsung**, opening the backend-hosted application in a first-party context. Another lasting option is a shared site/domain with a same-origin reverse proxy. Do not store session tokens in browser storage to bypass this restriction.

## Validation still required

Run the builds and tests only in a sandbox meeting the installed security-audit skill's execution requirements. Current validation is source/syntax inspection only; the host lacks the required sandbox. No deployed endpoint was probed.

- Run existing API smoke checks in default local mode, and both Pages builds plus Node tests.
- In an isolated fixture, allowlist a dummy HTTPS origin and enable cross-site cookies. Verify accepted/rejected OPTIONS requests, credentialed response headers, HttpOnly/Secure/SameSite=None cookie attributes, and rejection of untrusted or missing write Origins.
- Verify sign-in, session persistence, uploads, uploaded images, posting, offers and messages from the Pages origin in an authorized browser session. Repeat with third-party cookies blocked and verify the direct-app link.
- The previously reported logout revocation and cross-owner photo deletion findings are separate unresolved issues. This connection work does not remediate them or certify the public demo for sensitive data.

If the tunnel URL changes, update the connected-build argument in `.github/workflows/pages.yml`, the backend's public-origin entry in the allowlist, and rebuild after publication authorization. Keep the Pages-origin entry. Including the backend's own public origin allows the direct-app fallback to submit forms even when the tunnel rewrites the Host header to localhost.

Protocol references: [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) and [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
