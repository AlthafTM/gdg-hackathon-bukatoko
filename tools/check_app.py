"""Run the existing API/UI suites against a disposable loopback application copy."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def main(*, wsgi=False):
    with tempfile.TemporaryDirectory(prefix='bukatoko-check-') as directory:
        scratch = Path(directory)
        app = scratch / 'app'
        shutil.copytree(ROOT / 'app', app, ignore=shutil.ignore_patterns(
            'bukatoko.db*', 'uploads', 'backups', '*.log', '__pycache__', '*.orig', '_review'))
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1', 0))
            port = reservation.getsockname()[1]
        env = {name: os.environ[name] for name in ('PATH', 'SYSTEMROOT', 'COMSPEC', 'LANG') if name in os.environ}
        env.update(BUKATOKO_DB=str(scratch / 'fixture.db'), HOME=str(scratch),
                   TMP=str(scratch), TEMP=str(scratch), PYTHONIOENCODING='utf-8')
        base = f'http://127.0.0.1:{port}'
        with (scratch / 'server.log').open('w', encoding='utf8') as log:
            command = [sys.executable, str(app / 'server.py'), str(port)]
            if wsgi:
                command = [sys.executable, "-c", (
                    "from server import init_db; from wsgi_adapter import application; "
                    "from wsgiref.simple_server import make_server; init_db(); "
                    "import sys; make_server('127.0.0.1', int(sys.argv[1]), application).serve_forever()"
                ), str(port)]
            server = subprocess.Popen(command,
                                      cwd=app, env=env, stdout=log, stderr=log)
            try:
                ready = False
                for _ in range(100):
                    if server.poll() is not None:
                        break
                    try:
                        with urlopen(base + '/api/me', timeout=1):
                            ready = True
                            break
                    except OSError:
                        time.sleep(.1)
                if not ready:
                    raise RuntimeError('Disposable application did not start.')
                for name in ('api_smoke.py', 'api_features.py', 'ui_smoke.py'):
                    result = subprocess.run([sys.executable, str(app / 'tests' / name), base],
                        cwd=app, env=env, capture_output=True, text=True, encoding='utf8', timeout=100)
                    lines = result.stdout.splitlines()
                    print(name + ': ' + (lines[-1] if lines else 'no output'))
                    if result.returncode:
                        print(result.stdout)
                        print(result.stderr)
                        return result.returncode
            finally:
                server.terminate()
                try:
                    server.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait()
    return 0


if __name__ == '__main__':
    sys.exit(main(wsgi="--wsgi" in sys.argv[1:]))
