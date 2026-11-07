# Changelog

Each published `main` update gets a new version and matching release notes. Local experiments and uncommitted work do not create releases.

## [0.5.1] - 2026-11-07

- Correct translation scanning of inline theme code and add the missing CORS preflight error translation to unblock Pages deployment. See [release notes](releases/0.5.1.md).

## [0.5.0] - 2026-11-07

- Refresh search/navigation, responsive panel widths, charcoal/violet/lime colors, real reference photography and theme/scroll motion.
- Prepare the supplied Instabox backend connection with opt-in CORS/cookie configuration and connected Pages export. See [validation and limits](releases/0.5.0.md).

## [0.4.0] - 2026-11-07

- Polish rounded typography, search alignment, controls, contextual sample illustrations and required-field labels.
- Add complete UI translation coverage and the requested BukaToko browser title/favicon; preserve product link metadata. See [validation and limits](releases/0.4.0.md).

## [0.3.0] - 2026-11-07

- Rebuild the marketplace layout, filters, cards, account panels and shared spacing system.
- Use square catalog images, a 4:3 detail gallery, light mode by default and reduced-motion-aware transitions. See [validation and limits](releases/0.3.0.md).

## [0.2.0] - 2026-11-07

- Refresh the UI with the supplied logo, local Exo 2 font, consistent three-color theme, labeled icons and mobile navigation.
- Restore category links and fix backend condition filtering. See [validation and known limits](releases/0.2.0.md).

## [0.1.1] - 2026-11-07

- See [release notes](releases/0.1.1.md).

## [0.1.0] - 2026-11-07

- Apply the purple/lavender/green palette across all seven pages, shared controls, light/dark themes, favicon and demo illustrations; initialize the system theme correctly while preserving manual selection.
- Add `app/`: Bukatoko marketplace running on a dependency-free Python server with SQLite storage and photo upload.
- Accounts: email and password (PBKDF2-HMAC-SHA256, 200k rounds) with HttpOnly cookie sessions; ownership checked server-side on every write.
- Marketplace flows: listings (create, mark sold, delete), wanted board with price range, offers with proposed/accepted/declined/withdrawn states, per-listing chat, reviews limited to accepted offers, reports, blocks, saved items, saved searches with new-match counts.
- Discovery: server-side filters (keyword, category, city, condition, price range, status, sort), pagination with "load more", URL-backed state.
- `/p/<id>` serves the listing page with Open Graph tags so link previews are correct.
- Add `app/tests/api_smoke.py` covering 38 API checks, including negative cases. See [release notes](releases/0.1.0.md).

## [0.0.2] - 2026-11-07

- Recommend Cloudflare's official `security-audit` skill in repository rules, contributor instructions and the README, with optional installation and explicit audit scope.
- Document the verified upstream revision and portable setup choices in [skill setup](docs/SKILLS.md). See [release notes](releases/0.0.2.md).

## [0.0.1] - 2026-11-07

- Establish the shared GDGoC ITB Stack Hackathon workspace and Bukatoko product context.
- Include the Carousell REA PDF, full text, screenshots and source evidence.
- Add AI collaboration rules, explicit publish authorization, remote-overlap checks and versioned GitHub Releases.
- Add reproducible workflow tests and release validation. See [release notes](releases/0.0.1.md).
