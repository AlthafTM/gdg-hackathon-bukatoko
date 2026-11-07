import contextlib
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from repo_workflow import Repo, valid_increment, version_tuple


def git(root, *args):
    result = subprocess.run(['git', '-C', str(root), *args], capture_output=True, text=True)
    if result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()


def note(version):
    return f'# Bukatoko {version}\n\n## Summary\n\nA real change.\n\n## Changes\n\nChanged behavior.\n\n## Validation\n\nChecks passed.\n\n## Known limits\n\nNone known for this fixture.\n'


class VersionTests(unittest.TestCase):
    def test_requested_patch_and_minor_transitions(self):
        for old, new in [('0.0.0', '0.0.1'), ('0.0.1', '0.0.2'), ('0.0.1', '0.1.0'), ('0.4.9', '0.5.0')]:
            self.assertTrue(valid_increment(old, new))

    def test_reuse_skips_regression_and_major_jump_are_rejected(self):
        for new in ['0.0.1', '0.0.0', '0.0.3', '0.1.1', '1.0.0']:
            self.assertFalse(valid_increment('0.0.1', new))

    def test_malformed_versions(self):
        for value in ['0.01', 'v0.0.1', '0.00.1', '0.0.1-beta', '../notes']:
            with self.assertRaises(ValueError): version_tuple(value)


class GitWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.remote, self.local, self.other = root / 'remote.git', root / 'local', root / 'other'
        self.remote.mkdir()
        git(self.remote, 'init', '--bare', '--initial-branch=main')
        git(root, 'clone', str(self.remote), str(self.local))
        self.configure(self.local)
        (self.local / 'VERSION').write_text('0.0.1\n')
        (self.local / 'CHANGELOG.md').write_text('# Changelog\n\n## [0.0.1] - 2026-11-07\n\nInitial fixture.\n')
        (self.local / 'releases').mkdir()
        (self.local / 'releases/0.0.1.md').write_text(note('0.0.1'))
        (self.local / 'shared.txt').write_text('base\n')
        self.commit(self.local, 'Seed fixture')
        git(self.local, 'push', 'origin', 'main')
        self.base = git(self.local, 'rev-parse', 'HEAD')
        git(root, 'clone', str(self.remote), str(self.other))
        self.configure(self.other)
        self.repo = Repo(self.local)
        self.output = io.StringIO()
        with contextlib.redirect_stdout(self.output): self.repo.begin()

    def configure(self, root):
        git(root, 'config', 'user.name', 'Workflow Test')
        git(root, 'config', 'user.email', 'workflow-test@example.invalid')
        git(root, 'config', 'core.autocrlf', 'false')

    def commit(self, root, message):
        git(root, 'add', '--all')
        git(root, 'commit', '-m', message)

    def advance(self, path):
        (self.other / path).write_text('collaborator change\n')
        self.commit(self.other, 'Collaborator change')
        git(self.other, 'push', 'origin', 'main')

    def prepare(self, version='0.0.2'):
        (self.local / 'VERSION').write_text(version + '\n')
        (self.local / f'releases/{version}.md').write_text(note(version))
        changelog = self.local / 'CHANGELOG.md'
        changelog.write_text(f'# Changelog\n\n## [{version}] - 2026-11-07\n\nUpdated.\n\n' + changelog.read_text())

    def test_local_experiments_do_not_create_commits(self):
        (self.local / 'experiment.txt').write_text('local only')
        with contextlib.redirect_stdout(self.output): result = self.repo.check()
        self.assertIn('experiment.txt', result['local_paths'])
        self.assertEqual(self.base, git(self.local, 'rev-parse', 'HEAD'))
        self.assertEqual('', git(self.local, 'diff', '--cached', '--name-only'))

    def test_staged_overlap_blocks_and_preserves_edits(self):
        (self.local / 'shared.txt').write_text('my work\n')
        git(self.local, 'add', 'shared.txt')
        self.advance('shared.txt')
        with contextlib.redirect_stdout(self.output), self.assertRaisesRegex(RuntimeError, 'Main advanced'):
            self.repo.check()
        self.assertIn('"shared.txt"', self.output.getvalue())
        self.assertEqual('my work\n', (self.local / 'shared.txt').read_text())
        self.assertEqual(self.base, git(self.local, 'rev-parse', 'HEAD'))

    def test_remote_advance_blocks_even_without_file_overlap(self):
        (self.local / 'mine.txt').write_text('mine')
        self.advance('other.txt')
        with contextlib.redirect_stdout(self.output), self.assertRaisesRegex(RuntimeError, 'Main advanced'):
            self.repo.check()
        self.assertIn('"overlapping_paths": []', self.output.getvalue())

    def test_untracked_overlap_is_reported(self):
        (self.local / 'new.txt').write_text('my new file')
        self.advance('new.txt')
        with contextlib.redirect_stdout(self.output), self.assertRaises(RuntimeError): self.repo.check()
        self.assertIn('"new.txt"', self.output.getvalue())

    def test_begin_refuses_behind_checkout(self):
        self.advance('other.txt')
        original = self.repo.baseline_path.read_text()
        with contextlib.redirect_stdout(self.output), self.assertRaisesRegex(RuntimeError, 'behind/diverged'):
            self.repo.begin()
        self.assertEqual(original, self.repo.baseline_path.read_text())

    def test_branch_changes_require_a_new_baseline(self):
        git(self.local, 'switch', '-c', 'task')
        with self.assertRaisesRegex(RuntimeError, 'another branch'): self.repo.check()

    def test_same_task_branch_collision_blocks_even_when_main_did_not_move(self):
        git(self.local, 'switch', '-c', 'task')
        with contextlib.redirect_stdout(self.output): self.repo.begin()
        (self.local / 'shared.txt').write_text('local feature work')
        git(self.other, 'switch', '-c', 'task')
        (self.other / 'shared.txt').write_text('collaborator feature work')
        self.commit(self.other, 'Concurrent feature branch')
        git(self.other, 'push', 'origin', 'task')
        with contextlib.redirect_stdout(self.output), self.assertRaisesRegex(RuntimeError, 'Task branch remote advanced'):
            self.repo.check()
        self.assertIn('"shared.txt"', self.output.getvalue())

    def test_staged_metadata_is_not_confused_with_worktree(self):
        self.prepare()
        with contextlib.redirect_stdout(self.output): self.repo.validate_release(self.base)
        with self.assertRaisesRegex(ValueError, 'Invalid release transition'):
            self.repo.validate_release(self.base, 'index')
        git(self.local, 'add', 'VERSION', 'CHANGELOG.md', 'releases/0.0.2.md')
        (self.local / 'VERSION').write_text('0.0.3\n')
        with contextlib.redirect_stdout(self.output): result = self.repo.validate_release(self.base, 'index')
        self.assertEqual('0.0.2', result['version'])

    def test_published_notes_cannot_be_rewritten(self):
        self.prepare()
        (self.local / 'releases/0.0.1.md').write_text('rewritten')
        with self.assertRaisesRegex(ValueError, 'Preserve previously released notes'):
            self.repo.validate_release(self.base)

    def test_patch_preparation_is_local_and_cannot_be_bumped_twice(self):
        with contextlib.redirect_stdout(self.output): self.assertEqual('0.0.2', self.repo.bump('patch'))
        self.assertEqual(self.base, git(self.local, 'rev-parse', 'HEAD'))
        with self.assertRaisesRegex(ValueError, 'placeholders'): self.repo.validate_release(self.base)
        with contextlib.redirect_stdout(self.output), self.assertRaisesRegex(ValueError, 'already prepared'):
            self.repo.bump('patch')

    def test_substantial_change_resets_patch(self):
        with contextlib.redirect_stdout(self.output): self.assertEqual('0.1.0', self.repo.bump('minor'))


if __name__ == '__main__': unittest.main()
