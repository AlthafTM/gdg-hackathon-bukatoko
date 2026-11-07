# Optional collaborator skills

Skills are installed per device or per supported project setup. A repository instruction can recommend a skill, but cannot make it available on every contributor's AI automatically. Check the agent's actual skill inventory first.

## Cloudflare security-audit

The selected security skill is maintained in [Cloudflare's official repository](https://github.com/cloudflare/security-audit-skill). Its skill name is **`security-audit`** and its directory is **`skills/security-audit`**.

| Field | Verified source |
|---|---|
| Upstream | `cloudflare/security-audit-skill` |
| Reviewed installation revision | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` |
| Skill entry point | [SKILL.md at that revision](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/skills/security-audit/SKILL.md) |
| Setup instructions | [Upstream README at that revision](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/README.md) |
| License | [Upstream MIT license](https://github.com/cloudflare/security-audit-skill/blob/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/LICENSE) |

The recorded revision makes the reviewed choice reproducible. A future upgrade should review upstream changes and record the new revision rather than silently assuming the current `main` is identical.

### What contributor AIs should do

1. At the start of implementation or security-review work, inspect available skills.
2. If `security-audit` is already available, read and follow its relevant instructions when the task calls for security guidance or review.
3. If missing, suggest it once per session, identify the official source and purpose, and ask whether the user wants it installed. Respect a refusal and continue the authorized work. Avoid repeated prompts.
4. Use the user's supported skill installer and requested scope. Ask before copying files, changing configuration, or selecting a global installation. Do not assume this repository authorizes installation on another device.
5. Verify the installed entry point and companion files. Tell the user when a new turn or agent reload is needed. Report installation separately from any audit findings.

Example suggestion: "Cloudflare's official security-audit skill is not available on this device. It provides source-based security guidance and structured audits. Would you like to add it? You can decline and continue."

### Installation choices

For Codex, use the built-in skill-installer workflow with:

```text
Repository: cloudflare/security-audit-skill
Path: skills/security-audit
Ref: c1c8a8c1471069fb0e188eeaff69b8e8db6564a8
```

Ask the agent to install that exact source after reviewing the skill. The installer selects the device's supported destination; do not copy another person's home-directory paths from this repository.

The upstream README also documents the Skills CLI:

```text
npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit
```

This command follows the upstream default revision. Review that version before accepting its installation prompts. The `--global` option is a separate user-level scope choice, not a default imposed by this repository. Use the device's agent-selection options as appropriate.

### Guidance and complete audits

The installed skill provides guidance for focused security questions and reviews. Its complete audit mode is for explicit codebase-audit/pen-test or report-artifact requests. That mode has its own sub-agent, Node.js, output-isolation and OS-enforced sandbox requirements. If a prerequisite is missing, follow the skill's incomplete/needs-validation rules rather than claiming a completed audit.

Installation alone does not run an audit, probe a live service, configure Cloudflare infrastructure, publish a report, or certify the app as secure. Repository publication remains governed by `AGENTS.md`: local work stays local until the user explicitly authorizes a GitHub commit/push.

## Design work

For UI work, use an appropriate design skill already available on the contributor's device. If none is available, offer `frontend-design` and let the user accept or decline installation. Use [REA](../REA/README.md) and the team's product requirements as the design reference in either case. Skill suggestions should help the task, not become mandatory setup gates.
