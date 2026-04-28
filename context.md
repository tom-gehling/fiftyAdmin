# Domain & cutover context

## Current state

- **Domain:** `theweeklyfifty.com.au` is owned and currently points at the legacy WordPress site (VPS/shared host).
- **New site:** this Angular + Firebase app is deployed via GitHub Actions to `weeklyfifty-dev` (dev) and `weeklyfifty-7617b` (prod) — both currently serve from default `*.web.app` URLs. No custom domain configured yet.

## Cutover intent

When the new site goes live on `theweeklyfifty.com.au`:

- **Almost all WP pages are retired** — quiz, archives, find-a-venue, contact, join, etc. all served by the new Angular app.
- **The shop is the only WP page that stays.** WooCommerce continues to run on WordPress until the shop port lands (`TODO.md` post-cutover).
- **Shop split:** WordPress moves to `shop.theweeklyfifty.com.au`; the apex `theweeklyfifty.com.au` (and `www`) points at Firebase Hosting. Old `/shop/*`, `/cart`, `/checkout`, `/my-account`, `/product/*` URLs on the apex 301 to the new subdomain.
- **Cloud Functions API stays where it is.** WordPress currently consumes `/api/*` from this app; post-cutover those endpoints serve the Angular SPA directly (no WP in the chain).

## Detailed cutover plan

Full step-by-step DNS / Firebase Hosting / SEO runbook lives at:

`~/.claude/plans/apart-of-the-roadmap-fluffy-simon.md`

Cross-referenced as a sub-task of the "301 SEO redirect map" item in `TODO.md`.
