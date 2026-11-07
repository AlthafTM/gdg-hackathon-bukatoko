# Working together

Read [AGENTS.md](AGENTS.md) for the rules AI collaborators must follow. Development stays local until the user explicitly requests a GitHub commit/push. The research in [REA](REA/README.md) is the main product/design reference.

## Start a task

Use Python 3.11+ and Git. The workflow helpers use only the Python standard library. On a device where `python` is named `python3`, substitute that command. The separate research PDF builder has its own dependencies.

```text
git status --short --branch
python tools/repo_workflow.py begin
```

The helper prints local state before contacting the remote, checks/fetches `main` and the current task branch when it exists remotely, and stores their baseline heads inside Git's per-worktree metadata. It never checks out, merges, rebases, commits or pushes. If the current checkout is stale, review the reported commits and integrate first. Do not discard dirty work to make the check pass.

Create a focused feature branch after synchronizing, then run `begin` again on that branch. Use a separate worktree per independent task. Keep scope clear so two people do not unintentionally edit the same feature. Inspect the relevant REA sections before implementing UI or marketplace flows.

## Implement and test

Make and review local changes. Run checks appropriate to the actual change. Do not publish test edits or create a release just because a preview works. For UI work, check available design skills; if there are none, offer `frontend-design` with the user's choice to accept or decline installation.

For implementation and security-review work, contributor AIs should check whether Cloudflare's official `security-audit` skill is available. If missing, suggest it once per session and ask before installation. Users can decline and continue working. The verified source, installation choices and audit boundaries are in [skill setup](docs/SKILLS.md). Installing it does not start a security audit, and one collaborator's installation does not change anyone else's device.

## Prepare an approved update

Only after the user requests **"commit to GitHub"** (or an equally explicit publishing request):

1. Run `python tools/repo_workflow.py check`. Review any incoming commits and overlap report. Reconcile first, rerun affected checks, and run `begin` again after integration.
2. Prepare the next version with `python tools/repo_workflow.py bump patch` for a small update or `bump minor` for a substantial change. The initial release metadata is already `0.0.1`; do not bump it again for the first workflow publication.
3. Complete `releases/<version>.md` and the matching changelog entry. Include actual checks and unresolved limits; no TODO placeholders.
4. Stage specific intended paths with `git add -- <paths>`. Inspect `git diff --cached` and run `python tools/repo_workflow.py precommit`. This validates the index, not just unstaged working files.
5. Make the authorized commit. Run `check` again immediately before an ordinary push. Prefer feature branches and PR review for shared work. A request to publish a feature branch is not permission to merge it into `main` unless the user's scope includes that merge.
6. If a collaborator moves `main` or the target branch, review/integrate and retest. Never force-push to hide the conflict. Version/changelog/release notes commonly overlap and need explicit reconciliation too.
7. For a `main` update, watch the release workflow and report its outcome. See [release operations](docs/RELEASING.md).

Example commands after authorization, with paths/message chosen for the task:

```text
python tools/repo_workflow.py check
git add -- <reviewed-paths>
python tools/repo_workflow.py precommit
git commit -m "Describe the resulting change"
python tools/repo_workflow.py check
git push origin <your-branch>
```

These examples are not standing permission for an AI to run commit/push.

## Optional local commit hook

After reviewing the hook, a collaborator can opt into this repository's pre-commit guard:

```text
git config --local core.hooksPath .githooks
```

The guard calls `precommit`, performs a remote check, and refuses stale/overlapping work or invalid staged release metadata. It needs `python` or `python3` on PATH and network access. It cannot determine whether a chat user authorized publishing; that remains an AI instruction in `AGENTS.md`. It is not installed automatically.

## Checks

```text
python -m unittest discover -s tests -v
python tools/repo_workflow.py validate-release --base-ref origin/main
```

Before publishing, the base must be freshly fetched. For release validation after committing, use `--source HEAD`; `precommit` uses `--source index`. A default working-tree validation is useful while preparing changes.

GitHub PR checks validate release metadata and workflow helper behavior. Repository maintainers can make `Repository checks / validate` a required up-to-date check on `main` and require PR reviews. This repository does not silently enable branch protection or change who may push.
