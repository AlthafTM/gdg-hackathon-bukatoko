"""Package only the public frontend; never include backend code or application data."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PAGES = ('index.html', 'jelajah.html', 'listing.html', 'jual.html', 'cari.html',
         'akun.html', 'profil.html', 'moderasi.html', '404.html')


def package():
    version = (ROOT / 'VERSION').read_text(encoding='utf8').strip()
    assets = ROOT / 'app/assets'
    for required in ('react-ui.js', 'react-ui.css', 'app.js', 'locale.js', 'motion.js'):
        if not (assets / required).is_file():
            raise SystemExit('Run npm run build before packaging the frontend.')
    files = [ROOT / 'app' / name for name in PAGES]
    files += sorted(path for path in assets.rglob('*') if path.is_file())
    for source in files:
        if source.is_symlink() or not source.resolve().is_relative_to((ROOT / 'app').resolve()):
            raise SystemExit('Frontend files must be regular files inside app/.')
    output = ROOT / 'artifacts' / f'bukatoko-frontend-{version}.zip'
    output.parent.mkdir(exist_ok=True)
    manifest = {'version': version, 'scope': 'frontend only; no server, database or uploads', 'files': []}
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for source in files:
            name = source.relative_to(ROOT / 'app').as_posix()
            data = source.read_bytes()
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED)
            manifest['files'].append({'file': name, 'sha256': hashlib.sha256(data).hexdigest()})
        entry = zipfile.ZipInfo('FRONTEND-MANIFEST.json', date_time=(1980, 1, 1, 0, 0, 0))
        entry.create_system = 3
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, json.dumps(manifest, indent=2) + '\n', compress_type=zipfile.ZIP_DEFLATED)
    print(f'Packaged {len(files)} public files: {output}')


if __name__ == '__main__':
    package()
