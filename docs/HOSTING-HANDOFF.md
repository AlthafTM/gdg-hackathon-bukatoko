# Update the existing Instabox/VPS deployment

The collaborator's supplied report establishes that the Python service already serves
the frontend, `/api/…`, and `/uploads/…` on one origin:
https://8123-agq3khlycogygkr5hikwu5oeiq.instabox.tech

That report describes frontend v0.5.2 and backend commit `09394bf`. Main v0.6.0
integrated those features and added React/Tailwind catalog rendering. Treat the
reported revision as historical; verify what is running before deployment. A
GitHub push does not update this hosting environment.

## Access needed by another contributor

Provide the terminal/dashboard access route or SSH host, port, username and the
public-key enrollment procedure. Share the absolute application/repository path,
service name, reverse-proxy configuration location, and backup procedure. Grant
access using each contributor's public key; do not put passwords, private keys,
session cookies, or application moderator credentials in this repository.

The moderator account authorizes in-app moderation. It does not authorize access
to server files or `systemctl`. A public URL proves reachability, not shell access.
Instabox may expose a terminal through its own workspace rather than SSH; the
workspace owner should identify the supported access route.

## Prompt for the AI with hosting access

```text
Update the working BukaToko frontend on the existing server from the reviewed main
revision provided by the UI contributor. First report the current deployed Git
revision, application path and service name. Preserve and inspect all local edits,
including any unfinished merge; do not run reset --hard, clean or overwrite them.

Back up app/*.html and app/assets/ outside the served directory. Build the reviewed
frontend using the lockfile (npm ci --ignore-scripts; npm run build), or use the
matching frontend-only release ZIP and check its FRONTEND-MANIFEST.json hashes.
Do not deploy an unpublished local UI patch unless it has been supplied explicitly
for review. Never use _site/ as the Python server frontend: it contains a read-only
preview adapter.

Replace only the reviewed HTML/assets. Preserve server.py, SQLite and its sidecars,
uploads, environment and proxy settings. Use relative /api/... and /uploads/...,
credentials: same-origin and X-CSRF-Token from bk_csrf on JSON and multipart writes.
Do not add CORS to an already working same-origin installation.

Confirm HTTPS serves the UI and API under one public origin. If the service is
already serving static files directly from disk, a frontend-only update normally
does not require restarting Python. Follow the owner's established procedure if
a restart is necessary. Never expose Python's development HTTP service directly
to the public network without the existing TLS reverse proxy.

Run python tools/check_app.py in the source checkout for disposable smoke checks.
Verify the deployed UI, a read-only catalog request, images, browser console and
session persistence. Perform authenticated write checks only with dedicated test
data and the owner's agreement. Verify 404 responses, mobile layout, both languages
and theme changes. Report exact revision, checks, backups and rollback commands.
Do not commit/push, merge or alter release metadata without explicit permission.
```

## Current local UI changes

Theme snapshots use a single CSS reveal with an opaque old layer and no page cross-fade. Hover outlines use a 1px
violet/lime gradient and a narrower glow. The search submit uses lime. Fashion and
sports icons share rounded strokes; backend category identifiers are unchanged.
The 404 is styled for both Python and the repository's GitHub Pages subpath.

Location permission is requested on a button click over HTTPS (or localhost).
Approximate city centres choose among the existing 12 city options within 80km;
coordinates remain in memory and are not sent to the API or stored. This is a city
filter, not exact listing-distance ranking. Wanted filtering applies to the existing
endpoint's latest 60 requests, not the entire database. Users may choose a city
manually or deny location access. No API/database migration is required.

An additional cloud server is unnecessary if this environment is available. Do not
create a paid VM, change DNS or replace the deployment without a reviewed hosting
decision and account access. Persistent SQLite/uploads and backups are requirements
for any future move; an ephemeral free filesystem is unsuitable.
