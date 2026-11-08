# React catalog and Tailwind build

BukaToko uses a single `app/index.html` shell for Home, Browse, Wanted, Sell and Account. Only the active screen template is mounted, preventing overlapping form IDs. Catalog cards remain React components; the compatible controller retains same-origin authentication, CSRF, uploads, offers, messages and the other integrated backend features.

`frontend/build-shell.mjs` embeds inert screen templates into the marked generated block in `app/index.html`. Edit Home's first `<main>` outside that block, or edit the four corresponding source HTML files, then run `npm run build`. Do not hand-edit the generated block. The old `.html` entry points bootstrap the shell with their query and fragment intact; normal internal navigation changes history and swaps the active template without loading another document. Detail, profile and moderation screens remain standalone.

The router cleans up page-level listeners and React list roots before switching screens. Request continuations from an abandoned screen cannot mutate the next screen. In-flight server writes are not undone by navigation. Sell/Wanted forms ask before discarding edited values, and successful submissions reset the dirty baseline. New screens receive focus and start at the top; Back/Forward restores the route/query rather than previous scroll positions. No drafts are saved to browser storage by this router.

Run from the repository root:

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

The production build writes the shell templates, `app/assets/react-ui.js` and `react-ui.css`, bundled locally with pinned dependencies and a lockfile. Python can serve the checked-in shell and compiled assets without Node. Rebuild after editing a screen, JSX or Tailwind. The Pages workflow rebuilds before its exports and checks. Tailwind utilities use the `tw:` prefix and omit Preflight so they do not reset integrated forms and moderation screens.

`renderCards` owns one React root per list, keyed by listing ID. Existing callers pass data and formatting helpers. `clearCards` unmounts a root before the controller replaces its children with skeletons or states. Locale observers skip React-owned subtrees; React subscribes to language changes itself. Product titles and other user content stay in their original language.

## Design direction

ENERGY 2 / RHYTHM 2 / MOTION 2. The brief retains Nunito and the charcoal/electric-violet palette while making acid lime more visible in navigation, selected categories, prices and selling actions. Light canvas `#F6F7F9`, charcoal `#202228`, violet `#7038E8`, lime `#C8F542`, surface white; dark surfaces use the existing corresponding tokens. Lime fields use dark text, and prices use a darker green ink on light surfaces.

```text
Desktop: header / search / categories / [filters | catalog]
Tablet:  header / search / categories / [folded filters] / catalog
Phone:   compact header / categories / [folded filters] / two cards / bottom navigation
```

Text stays left-aligned. Catalog photos use a 4:3 frame with proportional cover, following the user's final clarification: a 16:9 photo fills the frame, so its edges can be cropped. Detail zoom keeps the whole source image. Product hover does not add extra cropping. Rounded controls and gentler line icons match the existing wordmark. Violet/lime hover shadows blend instead of a single-color glow; touch devices do not retain hover glow.

Theme reveal lasts 900ms after a 120ms delay. Internal screen changes use a short exit and entrance, with a timer fallback if a background animation pauses. The persistent navigation's lime indicator slides to the selected item. Mobile selections are rounded rectangles inside an inset floating bar, with normal-weight labels in every selection state. Closing dialogs fade out before hiding. Locale starts in the head and optional font display avoids a late font replacement. Reduced motion bypasses animation. Native cross-document transitions are retained for standalone screens.

These changes target clearer layout and reusable/batched rendering. React adds download/runtime cost; no FPS, Lighthouse or net performance gain is claimed without measurement.

The shared footer links to bilingual terms, privacy information and a bug portal. Product cards use the existing saved-item API and link comment counts to the expanded detail discussion. The bug portal prepares a report locally, then offers a GitHub issue link and a text download; it has no backend inbox. See [policy evidence](../docs/POLICY-BEHAVIOR.md) before changing those promises.
