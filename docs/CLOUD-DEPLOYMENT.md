# JualinAja cloud deployment

## PythonAnywhere without a VM

PythonAnywhere's free plan includes one web app and 512 MiB of persistent storage for code, SQLite, and photos. Renew the web app before its monthly expiry. The free plan restricts outbound connections, so treat account email delivery as unavailable on this deployment. [Free plan limits](https://help.pythonanywhere.com/pages/FreeAccountsFeatures/) · [Network restrictions](https://www.pythonanywhere.com/pricing/)

1. Create a free PythonAnywhere account. Upload the prepared backend ZIP in **Files**, then open a Bash console and extract it with `unzip ~/bukatoko-pythonanywhere.zip -d ~/bukatoko`. The ZIP contains application code and assets. Database and uploads are created separately on the host.
2. In **Web**, add a new app on the provided domain. Choose **Manual configuration** and Python 3.11 or newer. Open its WSGI configuration file and replace the template with:

   ```python
   import sys
   from pathlib import Path

   sys.path.insert(0, str(Path.home() / "bukatoko" / "deploy"))
   from pythonanywhere_wsgi import application
   ```

3. Enable **Force HTTPS**, reload the app and open the assigned domain. Visit `/api/me` and confirm it returns a guest session. Create a test account and verify posting, photo upload and persistence after reload. The database and uploads live under `~/.bukatoko` on PythonAnywhere. [Web app setup](https://help.pythonanywhere.com/pages/WebAppBasics/) · [Force HTTPS](https://help.pythonanywhere.com/pages/ForcingHTTPS/)

Run `python tools/check_app.py --wsgi` to validate the app locally through the same WSGI adapter.

## OCI Always Free VM

Run the app and its API on the same HTTPS origin. Caddy terminates TLS on the VM and forwards requests to Python on loopback. The database, listing photos and avatars live on the VM's persistent cloud disk under `/var/lib/bukatoko`. The browser keeps session cookies and interface preferences.

Render and Koyeb free web instances do not provide a persistent disk for this setup. OCI offers eligible VM and volume resources in the tenancy home region. Select resources marked Always Free eligible and check the console's cost estimate and capacity before creating them. [OCI limits and idle reclamation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) · [Render free filesystem](https://render.com/docs/free) · [Koyeb instance limits](https://www.koyeb.com/docs/reference/instances)

## Provision and install

1. Create an eligible Ubuntu VM in the OCI console. Allow SSH from the maintainer's address and TCP 80/443 for the public site in the cloud and VM firewalls. Keep port 8123 private. Point an existing DNS hostname at the VM.
2. Install Python 3, Git and Caddy using the OS or [official Caddy packages](https://caddyserver.com/docs/install). Create a dedicated service account and install the reviewed repository version.

   ```bash
   sudo useradd --system --no-create-home --shell /usr/sbin/nologin bukatoko
   sudo git clone https://github.com/AlthafTM/jualinaja.git /opt/bukatoko
   sudo git -C /opt/bukatoko checkout --detach REVIEWED_COMMIT
   sudo install -m 0644 /opt/bukatoko/deploy/bukatoko.service /etc/systemd/system/bukatoko.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now bukatoko
   ```

   Replace `REVIEWED_COMMIT` with the reviewed revision containing these changes. If installing from a local branch, copy the reviewed files to the VM and use the same directory layout.
3. Copy `deploy/Caddyfile` to the VM's Caddy configuration and replace `market.example.org` with the actual DNS hostname. On a VM that already serves other sites, add the site block to its existing configuration. Validate with `sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`, then reload Caddy with `sudo systemctl reload caddy`.
4. Open the hostname over HTTPS. Check that the catalog and `/api/me` load, and register a dedicated maintainer account. To grant moderation, run the following in Python on the VM with an authorized operator account. Replace the example username with the one you registered.

   ```bash
   sudo -u bukatoko python3 - <<'PY'
   import sqlite3
   with sqlite3.connect("/var/lib/bukatoko/bukatoko.db") as conn:
       result = conn.execute("UPDATE users SET role = 'moderator' WHERE name = ?", ("your-username",))
       if result.rowcount != 1:
           raise SystemExit("Registered username not found")
   PY
   ```

Cloud mode starts with an empty catalog and uses Secure cookies. Existing local data can be migrated separately. Use an approved SQLite backup and its corresponding uploads, review old accounts before public exposure, and rotate any demo credentials. Keep backups in cloud storage and check restore before switching users to the new host.

## Account email

Configure a provider that supports authenticated SMTP with STARTTLS and a verified sender. Create `/etc/bukatoko/mail.env` with root-only permissions and these settings, then restart the service.

    BUKATOKO_SMTP_HOST=smtp.example.org
    BUKATOKO_SMTP_PORT=587
    BUKATOKO_SMTP_USER=example-user
    BUKATOKO_SMTP_PASSWORD=provider-secret
    BUKATOKO_SMTP_FROM=accounts@example.org

Check provider quotas and whether the VM can connect on the chosen submission port. Test email verification and password reset with a test account. With no SMTP configuration, the cloud app can still register users and run marketplace features, but code delivery is unavailable.

## Acceptance on the cloud host

- Create accounts and verify email, login/logout and reset. Confirm the moderator account is the one you chose.
- Upload a profile photo and listing photos. Create a listing and a wanted post, then verify the avatar and name appear on both cards.
- With a separate test account, exercise search and filters, likes, comments, a wanted reply, chat, offer, handover, review and report. Close a wanted post through Account and verify it disappears from the public board.
- Restart JualinAja and check that accounts, posts, images and interactions persist. Keep the test fixture separate from real user data.
- Use the VM hostname for the interactive app. GitHub Pages is the example catalog.
