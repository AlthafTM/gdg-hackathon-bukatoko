"""Publish the checked-out main commit; idempotent reruns never replace history."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from repo_workflow import version_tuple


class GitHub:
    def __init__(self, repository, token):
        if not repository or len(repository.split('/')) != 2 or not token:
            raise ValueError('A repository and workflow token are required.')
        self.base = f'https://api.github.com/repos/{repository}'
        self.token = token

    def request(self, method, path, data=None, missing_ok=False, binary=False):
        url = path if path.startswith('https://uploads.github.com/') else self.base + path
        body = data if binary else (json.dumps(data).encode() if data is not None else None)
        headers = {'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json',
                   'Content-Type': 'application/octet-stream' if binary else 'application/json',
                   'User-Agent': 'Bukatoko-release-workflow'}
        try:
            with urlopen(Request(url, data=body, headers=headers, method=method), timeout=90) as response:
                return json.load(response)
        except HTTPError as exc:
            if missing_ok and exc.code == 404:
                return None
            # Do not include credential-bearing headers or request bodies in logs.
            raise RuntimeError(f'GitHub {method} returned HTTP {exc.code} for {path.split("?")[0]}') from None


def ensure_tag(api, tag, sha):
    ref = api.request('GET', '/git/ref/tags/' + quote(tag, safe=''), missing_ok=True)
    if ref is None:
        api.request('POST', '/git/refs', {'ref': 'refs/tags/' + tag, 'sha': sha})
        return
    obj = ref['object']
    for _ in range(5):
        if obj['type'] != 'tag': break
        obj = api.request('GET', '/git/tags/' + obj['sha'])['object']
    if obj['type'] != 'commit' or obj['sha'] != sha:
        raise ValueError(f'{tag} already identifies a different object. Never move or replace a release tag.')


def publish(api, root, repository, sha):
    root = Path(root)
    version = (root / 'VERSION').read_text(encoding='utf8').strip()
    version_tuple(version)
    tag = 'v' + version
    notes = (root / 'releases' / f'{version}.md').read_text(encoding='utf8')
    ensure_tag(api, tag, sha)
    release = api.request('GET', '/releases/tags/' + quote(tag, safe=''), missing_ok=True)
    if release is None:
        body = notes + f'\n\nCommit: `{sha}`\n\n[Repository at this release](https://github.com/{repository}/tree/{tag})\n'
        release = api.request('POST', '/releases', {'tag_name': tag, 'target_commitish': sha,
                             'name': f'Bukatoko {version}', 'body': body,
                             'draft': False, 'prerelease': False, 'make_latest': 'legacy'})
    if release.get('draft'):
        raise ValueError('Existing release is a draft; inspect it rather than silently changing its status.')
    # Upload independently so a retry can finish an interrupted first publication.
    assets = {a['name']: a for a in api.request('GET', f'/releases/{release["id"]}/assets?per_page=100')}
    downloads = [root / 'REA' / 'carousell-indonesia' / name
                 for name in ('CAROUSELL-DESIGN-DOCUMENT.pdf', 'CAROUSELL-DESIGN-DOCUMENT.txt')]
    downloads.append(root / 'artifacts' / f'bukatoko-frontend-{version}.zip')
    for p in downloads:
        name = p.name
        if not p.is_file(): continue
        data = p.read_bytes()
        if name in assets:
            a = assets[name]
            digest = a.get('digest')
            if a.get('state') != 'uploaded' or a['size'] != len(data) or (digest and digest != 'sha256:' + hashlib.sha256(data).hexdigest()):
                raise ValueError(f'Existing release asset differs or is incomplete: {name}. Inspect it; never overwrite automatically.')
            continue
        upload = release['upload_url'].split('{')[0] + '?name=' + quote(name)
        api.request('POST', upload, data, binary=True)
    return release['html_url']


def main():
    if os.environ.get('GITHUB_REF') != 'refs/heads/main' or os.environ.get('GITHUB_EVENT_NAME') not in ('push', 'workflow_dispatch'):
        raise ValueError('Release publication runs only for main push/manual workflow events, never a PR or local test.')
    sha = os.environ['GITHUB_SHA']
    root = Path(__file__).resolve().parents[1]
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if actual != sha:
        raise ValueError('Checkout does not match the workflow commit.')
    repository = os.environ['GITHUB_REPOSITORY']
    api = GitHub(repository, os.environ.get('GH_TOKEN', ''))
    url = publish(api, root, repository, sha)
    print('Release ready: ' + url)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf8') as f:
            f.write(f'## Release published\n\n{url}\n\nCommit: `{sha}`\n')


if __name__ == '__main__':
    try: main()
    except (ValueError, RuntimeError, OSError) as exc:
        print(f'Release failed: {exc}', file=sys.stderr)
        sys.exit(1)
