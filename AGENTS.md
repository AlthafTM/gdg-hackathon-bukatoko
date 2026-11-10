# JualinAja repository rules

These rules apply to AI work throughout this repository. Read `CONTRIBUTING.md` before starting and `docs/RELEASING.md` before preparing a published update. Follow higher-priority instructions and the user's current scope.

## Project and references

- This is the shared development repository for JualinAja, a local marketplace where the same user can sell owned items and request wanted items with a price range.
- `REA/` is the main inspiration and reference. Read its README and the relevant plain-text report sections before product/UI work. Distinguish observed Carousell behavior from proposals and unknowns. The wanted-item request flow is our own design work; do not pretend the research completely specifies it.
- Preserve historical research bytes and evidence labels. Follow the package's rebuild/verification instructions when changing generated research files.

## Default: work and test locally

- Editing, exploring, running tests, previews and local checks do not authorize a commit, push, merge, tag, release or deployment.
- Do not auto-commit because a task is finished, a test passes, or a workflow document contains commit commands.
- Commit/push only when the user explicitly requests it, for example **"commit to GitHub"** or **"commit the changes here to GitHub"**. That request authorizes publishing the reviewed task changes and their corresponding release through the repository workflow. It does not authorize unrelated files or future tasks.
- If the user asks only to commit locally, do not push or publish. If they deny or revoke publishing, keep the work local. Report uncommitted status plainly.
- Do not install hooks, skills, extensions, dependencies or change global settings just because they are mentioned here. Obtain the permission required by the host or the user for the actual action.

## Avoid overlapping collaborator work

1. Before fetching, inspect branch/status and staged, unstaged and untracked files. Preserve edits made by the user or other collaborators. Never clean, reset, stash or switch away their work without authorization.
2. Run `python tools/repo_workflow.py begin` at task start. It checks local state, compares the advertised remote head, fetches `origin/main`, and records a per-worktree baseline. It never merges or edits project files.
3. Work and commit directly on `main` by default. Create or use a separate branch only when the user explicitly specifies separation for the task. Do not create feature branches or PRs automatically. Before editing, inspect incoming commits and their changed paths. If the checkout is behind/diverged, integrate carefully first; do not build on a knowingly stale base.
4. Before committing, run `python tools/repo_workflow.py check` again. It checks for new remote commits and reports overlapping paths, including staged, unstaged, untracked and task-branch changes. A remote advance must be reviewed and integrated before committing. Same-file overlaps require reviewing the actual hunks, not blindly choosing ours/theirs.
5. After reconciliation, rerun affected tests, refresh the baseline with `begin`, re-evaluate the version, and rerun `check`. This is a review checkpoint, not permission to ignore incoming work.
6. Stage only intended paths. Run `python tools/repo_workflow.py precommit` against the staged release metadata. Inspect the staged diff before making an authorized commit.
7. Run `check` immediately before pushing. Use ordinary pushes only; never force-push shared history or overwrite another contributor's commit. If Git rejects a push, inspect/fetch/reconcile and retest; do not bypass the rejection.

Checks reduce overlap; they cannot lock out commits made a moment later or detect every semantic conflict. A normal push rejects stale shared history. Review the diff and run up-to-date checks before publishing directly to `main`. Branch protection requires separate repository configuration and is not enabled merely by this file.

## Design-skill choice

- For UI/design work, first inspect the skills actually available on the collaborator's device. Use a suitable existing design skill with the user's preferences and REA references.
- If none is available, offer `frontend-design` and explain how to add it through that device's supported skill mechanism. Ask before installing or copying a skill. The user may decline; continue with the REA references and explicit design requirements without blocking the task.
- Do not claim a skill was used when it is unavailable. Do not install it globally or change settings automatically. This rule does not activate a design workflow for non-UI work.

## Security-skill choice

- At the start of implementation or security-review work, inspect the security skills actually available on the collaborator's device. The recommended skill is Cloudflare's official `security-audit` from `cloudflare/security-audit-skill`, path `skills/security-audit`. See `docs/SKILLS.md` for the verified source and setup.
- If it is missing, suggest adding it once per session, explain its purpose, and ask before installing/copying it or changing agent configuration. The user may decline; continue the authorized task and state any limits when relevant. Do not repeatedly prompt or claim it was used when unavailable.
- If it is installed, use its relevant guidance for security questions and focused reviews. A complete audit, its sub-agent workflow and report artifacts require an explicit audit request and the skill's stated prerequisites. Adding a skill is not an audit request or a security certification.
- Keep the existing user-controlled commit, release and deployment boundaries. Skill installation on one device does not install it on other contributors' devices. Do not configure Cloudflare services as part of a skill recommendation.

## Version and release policy

- Every approved update published to `main` includes a new `VERSION`, a matching `CHANGELOG.md` entry, and `releases/<version>.md` with changes, validation and known limits.
- Use three integers: `0.0.1`. Small fixes, docs and narrow updates increment the last number: `0.0.1 -> 0.0.2`. Substantial features, broad redesigns or architecture changes increment the middle number and reset the last: `0.0.1 -> 0.1.0`.
- Prepare a version once for the approved update, not for every edit/test. Unpublished work can remain uncommitted. Recheck against current `main` before committing so concurrent work cannot reuse a version.
- The first tracked release is `0.0.1`. Keep major version `0` unless the team explicitly adopts a major-version policy.
- Use `python tools/repo_workflow.py bump patch` or `bump minor` after synchronizing when preparing the next release. Fill the generated TODOs. Never rewrite published release notes/tags or lower a version.
- GitHub Actions validates PRs and publishes `v<VERSION>` plus a GitHub Release only after an authorized push/merge to `main`. It attaches the reference PDF/TXT when present. It does not commit generated files or deploy the app.
- Wait for release/check success after publishing and report the commit, version, release URL, tests and remaining limitations. If publication fails, report and repair it; do not claim success from a push alone.
