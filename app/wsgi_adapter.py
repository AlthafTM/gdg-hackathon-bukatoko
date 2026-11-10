"""Expose the existing request handlers on a managed WSGI host."""

from email.message import Message
from io import BytesIO
from urllib.parse import quote_from_bytes

from server import Handler, ROOT


class WSGIRequest(Handler):
    def __init__(self, environ):
        self.directory = str(ROOT)
        self.command = environ["REQUEST_METHOD"]
        path = environ.get("PATH_INFO", "").lstrip("/").encode("latin-1")
        self.path = "/" + quote_from_bytes(path)
        if environ.get("QUERY_STRING"):
            self.path += "?" + environ["QUERY_STRING"]
        self.request_version = "HTTP/1.1"
        self.requestline = f"{self.command} {self.path} {self.request_version}"
        self.headers = Message()
        for key, value in environ.items():
            if key.startswith("HTTP_") and key not in {"HTTP_CONTENT_LENGTH", "HTTP_CONTENT_TYPE"}:
                self.headers[key[5:].replace("_", "-")] = value
        for key in ("CONTENT_LENGTH", "CONTENT_TYPE"):
            if environ.get(key):
                self.headers[key.replace("_", "-")] = environ[key]
        self.rfile = environ["wsgi.input"]
        self.wfile = BytesIO()
        self.remote_addr = environ.get("REMOTE_ADDR", "")
        self.response_headers = []
        self._headers_buffer = []

    def address_string(self):
        return self.remote_addr

    def send_response_only(self, code, message=None):
        reason = self.responses.get(code, ("Unknown", ""))[0]
        self.status = f"{code} {reason}"

    def send_header(self, keyword, value):
        if keyword.lower() != "connection":
            self.response_headers.append((keyword, value))

    def flush_headers(self):
        self._headers_buffer.clear()


def application(environ, start_response):
    request = WSGIRequest(environ)
    method = request.command
    if method in {"GET", "HEAD"}:
        request.do_GET()
    elif method == "POST":
        request.do_POST()
    elif method == "PATCH":
        request.do_PATCH()
    elif method == "DELETE":
        request.do_DELETE()
    else:
        request.send_error(501)
    start_response(request.status, request.response_headers)
    return [b"" if method == "HEAD" else request.wfile.getvalue()]
