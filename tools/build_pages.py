"""Export only public sample fixtures and frontend assets for GitHub Pages."""
import ast
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'


def build():
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
    notice = ('Pratinjau GitHub Pages — hanya lihat. Semua barang, penjual dan permintaan adalah '
              'data contoh; foto berupa placeholder. Masuk, jual, pesan dan tawaran memerlukan server Python lokal.')
    for source in (ROOT / 'app').glob('*.html'):
        html = source.read_text(encoding='utf8')
        html = re.sub(r'(<div class="strip">\s*<div class="wrap"><p>).*?(</p>)',
                      lambda m: m[1] + notice + m[2], html, count=1, flags=re.S)
        html = re.sub(r'(<p class="foot-note">).*?(</p>)',
                      lambda m: m[1] + notice + m[2], html, flags=re.S)
        html = html.replace('<script src="assets/app.js"></script>',
                            '<script src="assets/preview.js"></script>\n<script src="assets/app.js"></script>')
        (OUTPUT / source.name).write_text(html, encoding='utf8')
    for name in ('styles.css', 'app.js', 'preview.js', 'favicon.svg'):
        shutil.copyfile(ROOT / 'app/assets' / name, OUTPUT / 'assets' / name)
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {OUTPUT}: {len(listings)} sample listings, {len(wanted)} wanted requests; no database or uploads.')


if __name__ == '__main__':
    build()
