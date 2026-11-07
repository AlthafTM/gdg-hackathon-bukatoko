# GDGoC ITB Stack Hackathon - Bukatoko

This repository is our shared workspace for the **GDGoC ITB Stack Hackathon**. Collaborators use it to develop Bukatoko, an online local-shop marketplace.

The app concept supports both sides of a local transaction:

- **Sell an item:** users can list items they own for other people to buy.
- **Request an item:** users can post what they want to buy and specify a price range, so other users can respond with suitable items.

The same user can sell their own items and request items they want to buy.

## Repository contents

| Location | Purpose |
|---|---|
| [`REA/`](REA/README.md) | Reference material from the reverse-engineering skill's investigation of Carousell Indonesia. |
| [`REA/carousell-indonesia/`](REA/carousell-indonesia/README.md) | PDF, full plain text, editable report, screenshots, evidence and reproduction tools. |
| [`LICENSE`](LICENSE) | Repository license. Third-party reference material retains its original ownership. |

## Start here

1. Read the [plain-text reference](REA/carousell-indonesia/CAROUSELL-DESIGN-DOCUMENT.txt) for AI-assisted work, or the [PDF](REA/carousell-indonesia/CAROUSELL-DESIGN-DOCUMENT.pdf) for a formatted version with screenshots.
2. Read the [collaborator handoff](REA/carousell-indonesia/HANDOFF.md) for investigation steps, PDF/text generation, verification and a suggested implementation sequence.
3. Use the [editable Markdown report](REA/carousell-indonesia/CAROUSELL-DESIGN-DOCUMENT.md) and its evidence to discuss product decisions before implementing them.

## What the REA folder means

`REA` contains what the reverse-engineering skill found during its Carousell investigation. It is a reference for designing our hackathon app, including browsing, listings, search, seller profiles, chat, offers and trust flows.

The research distinguishes directly observed behavior, static code candidates, official documentation, proposed implementation choices and unresolved questions. Native app internals and authenticated transactions were not inspected. Proposed architectures and API paths are design suggestions, not recovered production contracts.

Our **wanted-item requests with a listed price range** are part of Bukatoko's intended concept. Their exact behavior is a team design decision; the Carousell investigation did not establish a complete equivalent request workflow.

## Working together

- Keep app implementation and research references distinguishable.
- Use focused branches and pull requests to make changes reviewable.
- Preserve dated research evidence; record new observations separately.
- Update the editable report, generated PDF/text and integrity manifest together when changing the research package.
- Do not commit credentials, private account exports or temporary build/review files.

The current handoff provides research and design references. The implementation stack and detailed hackathon feature scope are for the team to choose.
