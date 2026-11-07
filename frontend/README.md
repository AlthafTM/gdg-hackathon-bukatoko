# React catalog and Tailwind build

BukaToko uses progressive React rendering for catalog cards on the home page, browse results, similar items, recently viewed items and seller profiles. The existing same-origin API controller retains authentication, CSRF, uploads, offers, messages, moderation and other integrated features. This is not a complete SPA rewrite.

Run from the repository root:

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
```

The production build writes `app/assets/react-ui.js` and `react-ui.css`, bundled locally with pinned dependencies and a lockfile. Python can serve the checked-in compiled assets without Node. After editing JSX or Tailwind, rebuild those assets. The Pages workflow rebuilds them before its exports and checks. Tailwind utilities use the `tw:` prefix and omit Preflight so they do not reset the integrated forms and moderation screens.

`renderCards` owns one React root per list, keyed by listing ID. Existing callers pass data and formatting helpers. `clearCards` unmounts a root before the controller replaces its children with skeletons or states. Locale observers skip React-owned subtrees; React subscribes to language changes itself. Product titles and other user content stay in their original language.

## Design direction

ENERGY 2 / RHYTHM 2 / MOTION 2. The brief retains Nunito and the charcoal/electric-violet palette while making acid lime more visible in navigation, selected categories, prices and selling actions. Light canvas `#F6F7F9`, charcoal `#202228`, violet `#7038E8`, lime `#C8F542`, surface white; dark surfaces use the existing corresponding tokens. Lime fields use dark text, and prices use a darker green ink on light surfaces.

```text
Desktop: header / search / categories / [filters | catalog]
Tablet:  header / search / categories / [folded filters] / catalog
Phone:   compact header / categories / [folded filters] / two cards / bottom navigation
```

Text stays left-aligned. Catalog photos use a 4:3 frame with proportional cover, following the user's final clarification: a 16:9 photo fills the frame, so its edges can be cropped. Detail zoom keeps the whole source image. Product hover does not add extra cropping. Rounded controls and gentler line icons match the existing wordmark. Violet/lime hover shadows blend instead of a single-color glow; touch devices do not retain hover glow.

Theme reveal lasts 900ms after a 120ms anticipation delay. Other controls respond immediately with a short press movement. Closing dialogs fade out before hiding. Same-origin cross-document transitions keep the header separate; locale starts in the head, and optional font display avoids a late font replacement. Reduced motion bypasses these effects. Native navigation transitions depend on browser support; HTML links and forms remain usable without them.

These changes target clearer layout and reusable/batched rendering. React adds download/runtime cost; no FPS, Lighthouse or net performance gain is claimed without measurement.
