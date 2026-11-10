import hashlib
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from publish_release import ensure_tag, main, publish


class FakeGitHub:
    def __init__(self):
        self.tag = None
        self.release = None
        self.assets = []
        self.calls = []

    def request(self, method, path, data=None, missing_ok=False, binary=False):
        self.calls.append((method, path))
        if path.startswith('/git/ref/tags/'): return self.tag
        if path == '/git/refs':
            self.tag = {'object': {'type': 'commit', 'sha': data['sha']}}
            return self.tag
        if path.startswith('/releases/tags/'): return self.release
        if path == '/releases':
            self.release = dict(data, id=1, html_url='https://example.invalid/release',
                                upload_url='https://uploads.github.com/example/assets{?name,label}')
            return self.release
        if method == 'GET' and path.startswith('/releases/1/assets'): return self.assets
        if path.startswith('https://uploads.github.com/'):
            name = path.split('name=')[1]
            self.assets.append({'name':name, 'size':len(data), 'state':'uploaded',
                                'digest':'sha256:' + hashlib.sha256(data).hexdigest()})
            return self.assets[-1]
        raise AssertionError((method, path))


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'VERSION').write_text('0.0.1\n')
        (self.root / 'releases').mkdir()
        (self.root / 'releases/0.0.1.md').write_text('# JualinAja 0.0.1\n')
        self.assets = self.root / 'REA/carousell-indonesia'
        self.assets.mkdir(parents=True)
        for ext in ('pdf','txt'):
            (self.assets / f'CAROUSELL-DESIGN-DOCUMENT.{ext}').write_bytes(b'fixture')
        self.api = FakeGitHub()

    def test_initial_release_and_rerun_are_idempotent(self):
        first = publish(self.api, self.root, 'owner/repo', 'a'*40)
        second = publish(self.api, self.root, 'owner/repo', 'a'*40)
        self.assertEqual(first, second)
        self.assertEqual(2, len(self.api.assets))
        self.assertEqual(1, self.api.calls.count(('POST','/releases')))
        self.assertEqual(1, self.api.calls.count(('POST','/git/refs')))

    def test_existing_tag_on_different_commit_is_never_replaced(self):
        self.api.tag = {'object': {'type':'commit','sha':'b'*40}}
        with self.assertRaisesRegex(ValueError, 'different object'):
            ensure_tag(self.api, 'v0.0.1', 'a'*40)
        self.assertFalse(any(method=='POST' for method,_ in self.api.calls))

    def test_frontend_package_is_attached_once_when_present(self):
        artifacts = self.root / 'artifacts'
        artifacts.mkdir()
        (artifacts / 'jualinaja-frontend-0.0.1.zip').write_bytes(b'frontend fixture')
        publish(self.api, self.root, 'owner/repo', 'a'*40)
        publish(self.api, self.root, 'owner/repo', 'a'*40)
        self.assertEqual(3, len(self.api.assets))
        self.assertIn('jualinaja-frontend-0.0.1.zip', [item['name'] for item in self.api.assets])

    def test_same_size_asset_change_is_rejected_by_digest(self):
        publish(self.api, self.root, 'owner/repo', 'a'*40)
        (self.assets / 'CAROUSELL-DESIGN-DOCUMENT.pdf').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'differs'):
            publish(self.api, self.root, 'owner/repo', 'a'*40)

    def test_incomplete_asset_does_not_get_silently_overwritten(self):
        publish(self.api, self.root, 'owner/repo', 'a'*40)
        self.api.assets[0]['state'] = 'starter'
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            publish(self.api, self.root, 'owner/repo', 'a'*40)

    def test_retry_can_complete_a_missing_upload(self):
        publish(self.api, self.root, 'owner/repo', 'a'*40)
        self.api.assets.pop()
        publish(self.api, self.root, 'owner/repo', 'a'*40)
        self.assertEqual(2,len(self.api.assets))

    def test_local_or_pr_execution_cannot_publish(self):
        for env in ({},{'GITHUB_REF':'refs/pull/1/merge','GITHUB_EVENT_NAME':'pull_request'}):
            with patch.dict(os.environ,env,clear=True), self.assertRaisesRegex(ValueError,'only for main'):
                main()


if __name__ == '__main__': unittest.main()
