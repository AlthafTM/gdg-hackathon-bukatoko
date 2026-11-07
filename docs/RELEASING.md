# Versions and GitHub Releases

The release system tracks published project snapshots. It never turns ordinary local edits or tests into commits. The user must explicitly request publishing, such as **"commit to GitHub"**. For AI behavior, see [AGENTS.md](../AGENTS.md); for start/check/commit steps, see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Version choice

`VERSION` is the single version source. It contains three integers with no `v` prefix. GitHub tags add the prefix.

| Change | Example | Command |
|---|---|---|
| Small fix, narrow change, docs, maintenance | `0.0.1 -> 0.0.2` | `python tools/repo_workflow.py bump patch` |
| Substantial feature, broad redesign, architectural change | `0.0.1 -> 0.1.0` | `python tools/repo_workflow.py bump minor` |

The first tracked foundation is `0.0.1`. The `0.01` shorthand is not used. A middle-number increment resets the last number to zero. Do not skip versions, reuse a version on another commit, or change the major number without a new team policy.

Prepare one version for an approved update, not for every edit/test. Feature-branch checkpoint commits can share the version being prepared; do not push that version to `main` until ready to release. Every new update on `main`, including docs/workflow updates and reverts, needs the next version. Preserve existing release notes and tags.

## Required files in the update

- `VERSION`, with the next patch/minor value relative to current `main`.
- `CHANGELOG.md`, with `## [<version>] - YYYY-MM-DD`.
- `releases/<version>.md`, headed `# Bukatoko <version>` and containing Summary, Changes, Validation and Known limits sections. Fill all placeholders with the actual result.

Use Jakarta calendar dates for release notes. `bump` creates a template and updates the changelog; it does not stage, commit, push, tag or publish. It first reruns the remote/overlap guard. If a version is already prepared locally, edit its notes rather than incrementing it repeatedly.

## Concurrent updates

Run `begin` at task start and `check` before committing and again before pushing. The check examines local state before fetching, compares advertised/cached heads, fetches `origin/main`, lists new commits and compares changed paths with task/working changes. Both overlapping and non-overlapping remote advances require review.

If someone publishes `0.0.2` while your branch is preparing `0.0.2`, integrate their work, retest your change, and prepare `0.0.3` or `0.1.0` as appropriate. Preserve their release notes; put your changes in a new file. Do not accept a version conflict by replacing theirs.

Use normal pushes. A stale direct push to `main` is rejected by Git; a stale feature-branch push does not lock `main`, so PR base validation/up-to-date review is still needed. File checks do not prove two different files are semantically independent.

## Automation

### Repository checks

`.github/workflows/repository-checks.yml` runs on PRs targeting `main` and pushes to `main`. It runs the helper/publication test suite and validates the committed release files against the event's base commit. Concurrent PRs cannot both reuse a version once their base is updated and checks rerun.

### Publish release

`.github/workflows/release.yml` runs after a push to `main`, or a manual retry on `main`. It checks out the exact event commit, reruns tests and release validation, and uses the workflow token to:

1. Create `v<VERSION>` at that exact commit if absent.
2. Refuse to move an existing tag that points somewhere else.
3. Create a GitHub Release using `releases/<version>.md`.
4. Attach the reference PDF and full TXT when present. GitHub also supplies the source archives for the tag.
5. Reuse an identical existing tag/release on a retry and upload any missing attachment. Refuse mismatched or incomplete existing assets rather than deleting/replacing them.

Different commit releases do not cancel each other. Release jobs have `contents: write`; ordinary repository checks are read-only. PR code does not run with release credentials. The workflows never create a source commit or deploy the app. Their action dependencies are pinned to verified official action commits.

The release and check workflows independently rerun the same tests/validation, so a failed test does not publish a release even if another check is still pending. A failed post-push check cannot undo an already accepted Git commit; use branch protection to block invalid PR merges before they reach `main`.

## Verification and retry

After pushing, inspect the repository's Actions tab, the exact commit, the `v<VERSION>` tag, release notes and PDF/TXT downloads. Do not report a release as published until the job and assets are verified. If a network interruption occurs after tag/release creation, rerun the same release workflow at the same commit. Do not bump a new version merely to retry a failed upload.

A manual workflow run validates against `HEAD^`. Prefer the failed run's **Re-run jobs** action to retain its original push base when the update contained multiple commits. If an existing tag or asset differs, inspect the incident; the publisher deliberately refuses to overwrite it. A corrective source change gets a new version and notes.

To validate release metadata locally:

```text
python tools/repo_workflow.py validate-release --base-ref origin/main
python tools/repo_workflow.py precommit
```

After committing but before pushing, `validate-release --source HEAD --base-ref origin/main` validates committed bytes. The helper does not prove the user's conversational authorization; AI agents must follow `AGENTS.md`.

## Optional repository enforcement

Maintainers may separately configure `main` to require PR review and the up-to-date `Repository checks / validate` check, and to disallow force pushes. These settings are not created by adding workflow YAML. The optional local hook must also be enabled deliberately per checkout. No collaborator's global Git/AI settings are changed by this release system.

## Upstream behavior references

- [Git fetch](https://git-scm.com/docs/git-fetch): remote objects/ref updates are separate from merging work into the checkout.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): required checks and merge rules need repository configuration.
- [GitHub Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency): a shared pending concurrency group can replace pending runs, so this workflow groups by commit.
- [GitHub release API](https://docs.github.com/en/rest/releases/releases): tags, releases and downloadable assets are separate resources.
