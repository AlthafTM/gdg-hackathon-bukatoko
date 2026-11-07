"""Export only public sample fixtures and frontend assets for GitHub Pages."""
import ast
import argparse
import json
from html import escape
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'


def https_origin(value):
    origin = urlsplit(value)
    if (origin.scheme != 'https' or not origin.hostname or origin.username or origin.password
            or origin.path not in ('', '/') or origin.query or origin.fragment):
        raise SystemExit('Use an HTTPS origin without credentials, path, query or fragment.')
    return f'https://{origin.netloc}'


def build(api_origin='', app_url=''):
    api_origin = https_origin(api_origin) if api_origin else ''
    app_url = https_origin(app_url) if app_url else api_origin
    if OUTPUT.exists() and any(OUTPUT.iterdir()):
        raise SystemExit('Use an empty _site directory; refusing to overwrite existing output.')
    (OUTPUT / 'assets').mkdir(parents=True, exist_ok=True)
    constants = {}
    for node in ast.parse((ROOT / 'app/server.py').read_text(encoding='utf8')).body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in {'SEED_USERS', 'SEED_LISTINGS', 'SEED_WANTED'}:
                    constants[target.id] = ast.literal_eval(node.value)
    users = {name: {'id': i, 'name': name, 'joined': '2026-11'}
             for i, (name, _) in enumerate(constants['SEED_USERS'], 1)}
    listings = [dict(zip(('id', 'username', 'title', 'price', 'old_price', 'category',
                         'condition', 'city', 'description', 'photo_count', 'created_at'), row))
                for row in constants['SEED_LISTINGS']]
    wanted = [dict(zip(('id', 'username', 'title', 'category', 'price_min', 'price_max',
                       'city', 'note', 'created_at'), row)) for row in constants['SEED_WANTED']]
    for item in listings + wanted:
        item['owner'] = users[item.pop('username')]
    for item in listings:
        item.update(status='active', photo_urls=[], saved=False, open_offers=0)
    (OUTPUT / 'assets/preview-data.json').write_text(
        json.dumps({'listings': listings, 'wanted': wanted, 'users': list(users.values())},
                   ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    notice = ('Pratinjau GitHub Pages: hanya lihat. Semua barang, penjual dan permintaan adalah '
              'data contoh; foto stok hanya referensi. Masuk, jual, pesan dan tawaran memerlukan server Python lokal.')
    if api_origin:
        notice = 'Demo terhubung ke server. Foto stok hanya referensi. Jangan gunakan kata sandi pribadi atau data sensitif.'
        (OUTPUT / 'assets/runtime-config.js').write_text(
            'window.BukatokoConfig = ' + json.dumps({'apiOrigin': api_origin}).replace('<', '\\u003c') + ';\n', encoding='utf8')
    for name in ('index.html', 'jelajah.html', 'listing.html', 'jual.html', 'cari.html', 'akun.html', 'profil.html'):
        source = ROOT / 'app' / name
        html = source.read_text(encoding='utf8')
        html = re.sub(r'(<div class="strip">\s*<div class="wrap"><p>).*?(</p>)',
                      lambda m: m[1] + notice + m[2], html, count=1, flags=re.S)
        if app_url:
            direct = '"' + escape(app_url + '/index.html', quote=True) + '"'
            html = html.replace(notice + '</p>', notice + ' <a href=' + direct + '>Buka aplikasi langsung</a></p>', 1)
        html = re.sub(r'(<p class="foot-note">).*?(</p>)',
                      lambda m: m[1] + notice + m[2], html, flags=re.S)
        adapter = 'runtime-config.js' if api_origin else 'preview.js'
        html = re.sub(r'(<script src="assets/app\.js(?:\?[^\"]*)?"></script>)',
                      lambda m: '<script src="assets/' + adapter + '?v=20261107-4"></script>\n' + m[1], html)
        (OUTPUT / source.name).write_text(html, encoding='utf8')
    for name in ('styles.css', 'app.js', 'locale.js', 'motion.js', 'react-ui.js', 'react-ui.css', 'THIRD-PARTY-NOTICES.txt', 'preview.js', 'favicon.svg', 'logo.svg'):
        shutil.copyfile(ROOT / 'app/assets' / name, OUTPUT / 'assets' / name)
    shutil.copytree(ROOT / 'app/assets/fonts', OUTPUT / 'assets/fonts')
    shutil.copytree(ROOT / 'app/assets/stock', OUTPUT / 'assets/stock')
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {OUTPUT}: mode={"connected" if api_origin else "read-only"}; no database or uploads bundled.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--api-origin', default='')
    parser.add_argument('--app-url', default='', help='Link to the live app without changing the preview data source.')
    parser.add_argument('--output', choices=('_site', '_site-live'), default='_site')
    args = parser.parse_args()
    OUTPUT = ROOT / args.output
    build(args.api_origin, args.app_url)
