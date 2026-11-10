import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

SOURCE = Path(__file__).resolve().parents[1] / 'tools/package_frontend.py'


class FrontendPackageTests(unittest.TestCase):
    def test_frontend_only_archive_is_repeatable_and_has_hash_manifest(self):
        spec = importlib.util.spec_from_file_location('frontend_package_test', SOURCE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module.ROOT = root
            (root / 'VERSION').write_text('0.6.0\n')
            (root / 'app/assets').mkdir(parents=True)
            for page in module.PAGES:
                (root / 'app' / page).write_text('<html>fixture</html>')
            for name in ('react-ui.js', 'react-ui.css', 'app.js', 'locale.js', 'motion.js', 'router.js', 'support.js'):
                (root / 'app/assets' / name).write_text('fixture')
            (root / 'app/server.py').write_text('not public')
            (root / 'app/bukatoko.db').write_text('not public')
            (root / 'app/uploads').mkdir()
            (root / 'app/uploads/fixture.png').write_text('not public')
            output = root / 'artifacts/jualinaja-frontend-0.6.0.zip'
            with contextlib.redirect_stdout(io.StringIO()):
                module.package()
                first = output.read_bytes()
                module.package()
            self.assertEqual(first, output.read_bytes())
            with zipfile.ZipFile(output) as archive:
                self.assertEqual(len(module.PAGES) + 8, len(archive.namelist()))
                self.assertFalse(any(name.endswith(('.db', '.py')) or name.startswith('uploads/') for name in archive.namelist()))
                manifest = json.loads(archive.read('FRONTEND-MANIFEST.json'))
                self.assertEqual('0.6.0', manifest['version'])
                self.assertTrue(all(len(item['sha256']) == 64 for item in manifest['files']))
