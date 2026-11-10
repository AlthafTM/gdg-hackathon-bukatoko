import importlib.util
import json
import os
import tempfile
import threading
import unittest
from contextlib import closing, contextmanager
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen


@contextmanager
def serve(app):
    app.init_db()
    with app.ThreadingHTTPServer(("127.0.0.1", 0), app.Handler) as server:
        worker = threading.Thread(target=server.serve_forever)
        worker.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}"
        finally:
            server.shutdown()
            worker.join()


def request(base, path, body=None, cookie=""):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Cookie": cookie}
    try:
        response = urlopen(Request(base + path, data=data, headers=headers), timeout=5)
    except HTTPError as error:
        response = error
    with response:
        return response.status, json.load(response), response.headers


class CloudBackendTests(unittest.TestCase):
    def test_cloud_sessions_survive_restart_and_logout_revokes_them(self):
        with tempfile.TemporaryDirectory() as root:
            database = Path(root) / "persistent.db"
            config = {
                "BUKATOKO_CLOUD": "1",
                "BUKATOKO_DB": str(database),
                "BUKATOKO_UPLOAD_DIR": str(Path(root) / "uploads"),
                "BUKATOKO_SMTP_HOST": "",
            }
            source = Path(__file__).resolve().parents[1] / "app/server.py"
            spec = importlib.util.spec_from_file_location("bukatoko_cloud_test", source)
            app = importlib.util.module_from_spec(spec)
            with patch.dict(os.environ, config):
                spec.loader.exec_module(app)
            with serve(app) as base:
                status, catalog, _ = request(base, "/api/listings")
                self.assertEqual(status, 200)
                self.assertEqual(catalog["items"], [])
                with closing(app.db()) as conn:
                    self.assertEqual(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0], 0)
                status, account, headers = request(base, "/api/signup", {
                    "name": "cloud-test", "email": "cloud@example.test", "password": "test-fixture-password"
                })
                self.assertEqual(status, 200)
                self.assertNotIn("demo_verify_code", account)
                cookies = headers.get_all("Set-Cookie")
                self.assertEqual(len(cookies), 2)
                self.assertTrue(all("; Secure" in value for value in cookies))
                cookie = "; ".join(value.split(";", 1)[0] for value in cookies)
                status, _, _ = request(base, "/api/reset/request", {"email": "cloud@example.test"})
                self.assertEqual(status, 503)
            with serve(app) as base:
                # Direct loopback requests stand in for the TLS reverse proxy.
                status, account, _ = request(base, "/api/me", cookie=cookie)
                self.assertEqual(status, 200)
                self.assertEqual(account["name"], "cloud-test")
                status, _, _ = request(base, "/api/logout", {}, cookie)
                self.assertEqual(status, 200)
                status, account, _ = request(base, "/api/me", cookie=cookie)
                self.assertEqual(status, 200)
                self.assertIsNone(account["user"])
            self.assertTrue(database.is_file())
