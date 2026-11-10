"""Remote-overlap checks and release metadata preparation; never commit or push."""
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
import subprocess
import sys

VERSION_RE = re.compile(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)')


def version_tuple(value):
    if not VERSION_RE.fullmatch(value.strip()):
        raise ValueError('Use three integers, for example 0.0.1; no v prefix or leading zeros.')
    return tuple(map(int, value.strip().split('.')))


def valid_increment(previous, current):
    a, b, c = version_tuple(previous)
    return current in (f'{a}.{b}.{c + 1}', f'{a}.{b + 1}.0')


class Repo:
    def __init__(self, root, remote='origin', branch='main'):
        self.root = Path(root).resolve()
        self.remote, self.branch = remote, branch

    def git(self, *args, optional=False, raw=False):
        p = subprocess.run(['git', '-C', str(self.root), *args], capture_output=True,
                           encoding='utf8', errors='replace', timeout=60)
        if p.returncode and not optional:
            raise RuntimeError(f'git {args[0]} failed: {p.stderr.strip()}')
        return None if p.returncode else (p.stdout if raw else p.stdout.rstrip('\n'))

    @property
    def tracking(self):
        return f'refs/remotes/{self.remote}/{self.branch}'

    @property
    def baseline_path(self):
        p = Path(self.git('rev-parse', '--git-path', 'bukatoko-task-baseline.json'))
        return p if p.is_absolute() else self.root / p

    def current_branch(self):
        branch = self.git('symbolic-ref', '--short', 'HEAD', optional=True)
        if not branch:
            raise RuntimeError('Use a task branch, not a detached HEAD, for local work.')
        return branch

    def names(self, *args):
        raw = self.git(*args)
        return {s for s in raw.split('\0') if s}

    def fetch_checked(self):
        # Inspect local work before any network operation or ref update.
        print('Local state before fetch:', flush=True)
        print(self.git('status', '--short', '--branch'), flush=True)
        old = self.git('rev-parse', '--verify', self.tracking, optional=True)
        advertised = self.git('ls-remote', '--exit-code', self.remote,
                              f'refs/heads/{self.branch}').split()[0]
        print(f'Remote before fetch: cached={old or "none"}, advertised={advertised}', flush=True)
        self.git('fetch', '--no-tags', self.remote,
                 f'refs/heads/{self.branch}:{self.tracking}')
        tip = self.git('rev-parse', self.tracking)
        active = self.current_branch()
        self.branch_tip = tip
        if active != self.branch:
            advertised_branch = self.git('ls-remote', '--heads', self.remote, f'refs/heads/{active}')
            self.branch_tip = None
            if advertised_branch:
                print(f'Task-branch remote before fetch: {advertised_branch.split()[0]}', flush=True)
                tracking = f'refs/remotes/{self.remote}/{active}'
                self.git('fetch', '--no-tags', self.remote, f'refs/heads/{active}:{tracking}')
                self.branch_tip = self.git('rev-parse', tracking)
        return tip

    def ancestor(self, older, newer):
        return self.git('merge-base', '--is-ancestor', older, newer, optional=True) is not None

    def begin(self):
        branch = self.current_branch()
        tip = self.fetch_checked()
        head = self.git('rev-parse', 'HEAD')
        if not self.ancestor(tip, head):
            raise RuntimeError('Checkout is behind/diverged from main. Review/integrate first; no baseline saved.')
        if self.branch_tip and not self.ancestor(self.branch_tip, head):
            raise RuntimeError('Task branch is behind/diverged from its remote. Review/integrate first; no baseline saved.')
        state = {'branch': branch, 'head': head, 'remote_tip': tip,
                 'remote': self.remote, 'target': self.branch, 'branch_tip': self.branch_tip}
        self.baseline_path.write_text(json.dumps(state, indent=2) + '\n', encoding='utf8')
        print('Task baseline saved inside this worktree Git metadata. No project files changed.')
        return state

    def check(self):
        if not self.baseline_path.is_file():
            raise RuntimeError('No task baseline. Run begin at task start; review and integrate remote work first.')
        state = json.loads(self.baseline_path.read_text(encoding='utf8'))
        if (state['branch'], state['remote'], state['target']) != (self.current_branch(), self.remote, self.branch):
            raise RuntimeError('Baseline belongs to another branch/remote. Review the checkout and run begin.')
        tip = self.fetch_checked()
        if not self.ancestor(state['remote_tip'], tip):
            raise RuntimeError('Remote history was rewritten. Inspect it; do not overwrite or silently reset the baseline.')
        base = self.git('merge-base', 'HEAD', tip)
        local = self.names('diff', '--name-only', '--no-renames', '-z', base, 'HEAD')
        local |= self.names('diff', '--name-only', '--no-renames', '-z', 'HEAD')
        local |= self.names('ls-files', '--others', '--exclude-standard', '-z')
        incoming = self.names('diff', '--name-only', '--no-renames', '-z', state['remote_tip'], tip)
        advanced = tip != state['remote_tip']
        old_branch_tip = state.get('branch_tip', state['remote_tip'] if state['branch'] == self.branch else None)
        branch_advanced = self.branch_tip != old_branch_tip
        if self.branch_tip and state['branch'] != self.branch:
            branch_base = old_branch_tip or self.git('merge-base', 'HEAD', self.branch_tip)
            if not self.ancestor(branch_base, self.branch_tip):
                raise RuntimeError('Task branch remote history was rewritten. Inspect before continuing.')
            incoming |= self.names('diff', '--name-only', '--no-renames', '-z', branch_base, self.branch_tip)
        result = {'remote_tip': tip, 'remote_advanced': advanced,
                  'task_branch_remote_tip': self.branch_tip, 'task_branch_remote_advanced': branch_advanced,
                  'remote_integrated': self.ancestor(tip, 'HEAD'),
                  'incoming_paths': sorted(incoming), 'local_paths': sorted(local),
                  'overlapping_paths': sorted(local & incoming)}
        print(json.dumps(result, indent=2))
        if advanced:
            print('Incoming commits since task baseline:')
            print(self.git('log', '--oneline', f'{state["remote_tip"]}..{tip}'))
            raise RuntimeError('Main advanced. Review incoming work/overlaps, integrate and retest, then run begin again.')
        if branch_advanced:
            if self.branch_tip:
                print('Task-branch commits to review:')
                print(self.git('log', '--oneline', f'{branch_base}..{self.branch_tip}'))
            raise RuntimeError('Task branch remote advanced. Review incoming work/overlaps, integrate and retest, then run begin again.')
        if not result['remote_integrated']:
            raise RuntimeError('Current HEAD does not contain current main. Reconcile before committing/pushing.')
        return result

    def read(self, name, source='worktree', optional=False):
        if source == 'worktree':
            p = self.root / name
            if optional and not p.is_file():
                return None
            return p.read_text(encoding='utf8')
        spec = f':{name}' if source == 'index' else f'{source}:{name}'
        return self.git('show', spec, optional=optional, raw=True)

    def validate_release(self, base_ref, source='worktree'):
        current = self.read('VERSION', source).strip()
        version_tuple(current)
        old = self.git('show', f'{base_ref}:VERSION', optional=True)
        previous = old.strip() if old is not None else '0.0.0'
        # Resolve the ref even when VERSION did not exist at that ref.
        self.git('rev-parse', '--verify', f'{base_ref}^{{commit}}')
        if not valid_increment(previous, current):
            raise ValueError(f'Invalid release transition {previous} -> {current}; use patch +1 or minor +1/reset patch.')
        notes_path = f'releases/{current}.md'
        notes = self.read(notes_path, source)
        for section in ('Summary', 'Changes', 'Validation', 'Known limits'):
            if not re.search(rf'^## {re.escape(section)}\s*$', notes, re.M):
                raise ValueError(f'{notes_path} needs a {section} section.')
        if re.search(r'\b(TODO|TBD)\b', notes, re.I):
            raise ValueError('Complete the release-note placeholders before committing.')
        if not notes.startswith(f'# JualinAja {current}\n'):
            raise ValueError('Release-note heading must match VERSION.')
        changelog = self.read('CHANGELOG.md', source)
        if not re.search(rf'^## \[{re.escape(current)}\] - \d{{4}}-\d{{2}}-\d{{2}}$', changelog, re.M):
            raise ValueError('CHANGELOG.md needs a dated heading matching VERSION.')
        old_notes = self.git('ls-tree', '-r', '--name-only', base_ref, '--', 'releases')
        for name in old_notes.splitlines():
            if name.endswith('.md') and self.read(name, source, optional=True) != self.read(name, base_ref):
                raise ValueError(f'Preserve previously released notes: {name}')
        result = {'previous': previous, 'version': current, 'tag': 'v' + current, 'source': source}
        print(json.dumps(result))
        return result

    def bump(self, kind):
        # A bump itself changes files, so first perform the live overlap guard.
        self.check()
        current = self.read('VERSION').strip()
        remote_version = self.git('show', f'{self.tracking}:VERSION', optional=True)
        remote_version = remote_version.strip() if remote_version else '0.0.0'
        if current != remote_version:
            raise ValueError('An unpublished version is already prepared; edit its notes rather than bumping again.')
        major, minor, patch = version_tuple(current)
        new = f'{major}.{minor}.{patch + 1}' if kind == 'patch' else f'{major}.{minor + 1}.0'
        notes = self.root / 'releases' / f'{new}.md'
        if notes.exists():
            raise ValueError(f'{notes.name} already exists; do not overwrite it.')
        notes.parent.mkdir(parents=True, exist_ok=True)
        notes.write_text(f'# JualinAja {new}\n\n## Summary\n\nTODO: Describe the update.\n\n## Changes\n\nTODO: List the changes.\n\n## Validation\n\nTODO: Record actual checks.\n\n## Known limits\n\nTODO: State limitations or explicitly say none known.\n', encoding='utf8')
        date = datetime.now(timezone(timedelta(hours=7))).date().isoformat()
        changelog = self.root / 'CHANGELOG.md'
        text = changelog.read_text(encoding='utf8')
        marker = re.search(r'^## \[', text, re.M)
        at = marker.start() if marker else len(text)
        entry = f'## [{new}] - {date}\n\n- See [release notes](releases/{new}.md).\n\n'
        changelog.write_text(text[:at] + entry + text[at:], encoding='utf8')
        (self.root / 'VERSION').write_text(new + '\n', encoding='utf8')
        print(f'Prepared {new}. Complete release-note placeholders; nothing was committed or pushed.')
        return new


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default='.')
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('begin', 'check', 'precommit'):
        sub.add_parser(name)
    bump = sub.add_parser('bump')
    bump.add_argument('kind', choices=['patch', 'minor'])
    validate = sub.add_parser('validate-release')
    validate.add_argument('--base-ref', required=True)
    validate.add_argument('--source', choices=['worktree', 'index', 'HEAD'], default='worktree')
    args = parser.parse_args()
    repo = Repo(args.repo)
    if args.command == 'begin': repo.begin()
    elif args.command == 'check': repo.check()
    elif args.command == 'bump': repo.bump(args.kind)
    elif args.command == 'validate-release': repo.validate_release(args.base_ref, args.source)
    elif args.command == 'precommit':
        repo.check()
        if not repo.git('diff', '--cached', '--name-only'):
            raise ValueError('Nothing staged. Stage only reviewed paths before precommit.')
        repo.validate_release(repo.tracking, 'index')
        print('Staged release metadata and remote checks passed. User authorization is still required to commit.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as exc:
        print(f'BLOCKED: {exc}', file=sys.stderr)
        sys.exit(1)
