# JualinAja

JualinAja is a local marketplace for selling things you own and finding things you want to buy. Browse by category or city, or post a request with your budget so nearby sellers can respond.

- [Open the live app](https://mictlan.pythonanywhere.com/) to create an account, post listings and requests, and message other users.
- [Explore the GitHub Pages demo](https://althaftm.github.io/jualinaja/) to browse sample listings and requests without an account.

## What you can do

- **Sell:** post an item with photos, price, condition, and city.
- **Find:** search and filter listings, view seller profiles, and save items for later.
- **Request:** describe an item you want and set a minimum and maximum budget.
- **Arrange a purchase:** message the seller, make an offer, and confirm the handoff. Payment happens between the buyer and seller.

## Development

The frontend uses HTML, React, and Tailwind; the Python API stores data in SQLite and serves uploaded photos. Run `python app/server.py 8123` and open `http://127.0.0.1:8123/`. See [local setup](app/README.md) and the [contributor workflow](CONTRIBUTING.md).

[REA](REA/README.md) contains the Carousell research and design references. [Releases](https://github.com/AlthafTM/jualinaja/releases) track published changes.

## Contributors

- [DHO212](https://github.com/DHO212) — marketplace app, Python/SQLite API and API smoke tests ([PR #1](https://github.com/AlthafTM/jualinaja/pull/1)).
- [ColdCloverr](https://github.com/ColdCloverr) — purple, lavender and green palette ([PR #2](https://github.com/AlthafTM/jualinaja/pull/2)).
- [AlthafTM](https://github.com/AlthafTM) — project maintenance, research references and collaboration workflow.
