# Public policy pages and support

The Indonesian and English content in `app/syarat.html`, `app/privasi.html`, and `app/assets/locale.js` describes the checked-in application. The footer on every public source page links to both policies and `app/bantuan.html`.

## Implementation evidence

- `app/server.py`: users store display name, email, password hash, verification and account timestamps; listing/request/social, saved search, message/offer/transaction, notification and moderation tables persist their respective features. Public listing/profile APIs expose display names and public content; authenticated endpoints control private account views.
- `SESSION_DAYS = 30`, login/logout cookie headers: `bk_session` is HttpOnly; `bk_csrf` is readable for write protection. This documentation does not claim end-to-end encryption or a universally Secure cookie flag.
- `log_message` records IP/method/path. Reset/verification demo mail can write codes to logs and, when configured, return demo codes to the interface. Do not describe this as production email delivery.
- `app/assets/location.js` chooses a supported city locally after a user requests geolocation; API filters use the city name. Coordinates are not sent to the API by that module.
- `app/assets/app.js` and `locale.js` store theme/language/recent IDs locally and the last query in sessionStorage. Reference photos/fonts are local assets. No application analytics or advertising SDK is bundled.
- Item deletion does not establish a general retention policy for messages/logs/backups. There is no self-service account deletion endpoint or universal retention schedule. Hosting-provider retention and backup configuration have not been verified.

## Bug portal

`support.js` uses only explicitly entered fields. It creates a local preview and an encoded link to this repository's new-issue form. There is no network submission, automatic diagnostics collection, backend bug inbox, or claim of successful delivery. The user must open GitHub, review, and submit; GitHub may require an account. Reports submitted as Issues are public. A text download works as an alternative; unusually long encoded URLs use the download path.

The portal asks users to request a private contact channel for privacy/security matters without including sensitive details in a public issue. A dedicated verified private support address is not configured. Maintainers must supply one before inviting sensitive reports or operating a production service. Do not invent an email address or claim a response deadline.

## Legal reference and limits

The reference for Indonesian data-protection rights is the official [UU 27/2022 text from JDIH Komdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/). Product descriptions are based on source evidence, not a claim of legal certification. The current text does not settle the identity of a production data controller, provider locations, legal bases for every production purpose, retention periods, or a private rights-request channel. Confirm those operational facts and review the policies before a public production launch.

Policies are published information, not a new account-consent mechanism. This update does not silently mark existing users as having accepted new terms.
