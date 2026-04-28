# Release punch list — WP → Angular cutover

**Last updated:** 2026-04-28
**High-level punch list:** `TODO.md` (gating items only)
**Domain runbook:** `~/.claude/plans/apart-of-the-roadmap-fluffy-simon.md`
**Domain context:** `context.md`

Each task is tagged `[Tom]` (needs credentials, dashboards, DNS, money, or judgement) or `[Claude]` (repo-side code, config, scripts, verification). Tick boxes as you go.

## Findings already gathered (informs tasks below)

- `src/app.config.ts:26` reads Firebase config from `environment.firebase` — no hard-coded `authDomain` fallback. Changing the secret is sufficient. ✓
- `functions/src/index.ts:22` uses `cors({ origin: true })` — fully open. No allowlist edit needed for the new domain. ✓
- Hard-coded `weeklyfifty-7617b.web.app/api` URLs found in `src/app/shared/services/contact-form.service.ts:24` and `src/app/shared/services/quiz-stats.service.ts:71`. These should be refactored to use `environment.functionsBaseUrl` (W3e1).
- Hard-coded `theweeklyfifty.com.au/pshop` shop links found in `src/app/layout/component/app.menu.ts:43`, `src/app/pages/public/home.ts:148`, `src/app/pages/public/components/public-topbar.ts:41,65`. Need to point at `shop.theweeklyfifty.com.au` (W3e2).

## Quick wins Claude can do right now (no Tom prereqs)

- [ ] **[Claude] W3e1** — refactor `contact-form.service.ts` + `quiz-stats.service.ts` to use `environment.functionsBaseUrl` instead of hard-coded host. ~10 min.
- [ ] **[Claude] W3e2** — repoint shop links to `https://shop.theweeklyfifty.com.au` across `app.menu.ts`, `home.ts`, `public-topbar.ts`. ~5 min.
- [ ] **[Claude] W3e3** — add `src/assets/sitemap.xml` from current public routes; update `src/assets/robots.txt`. ~10 min.
- [ ] **[Claude] W3a** — implement `adminCancelSubscription` + `adminRefundPayment` REST calls. ~2 h.
- [ ] **[Claude] W4-prep** — write `scripts/smoke-cutover.sh` (curl battery for redirects + API). ~20 min.
- [ ] **[Claude] W1-prep** — write `scripts/verify-bq.ts` (asserts all expected tables/procs exist post-deploy). ~30 min.

Ping me with the IDs to execute.

---

## W1 · BigQuery merge & deploy

**Goal:** analytics layer live on dev + prod. Build is done on `BQconvert`; this is integration + verification.
**Total estimate:** ~half day across both projects.

### W1.1 — Pre-flight ([Claude], 30 min, no prereqs)
- [ ] Read `sql/bigquery/SETUP.md` end-to-end.
- [ ] Diff the DDL on `BQconvert` vs. what `deploy-bq.ts` actually applies. Report any drift.
- [ ] Write `functions/scripts/verify-bq.ts` that connects to a project + location and asserts: dataset `weeklyfifty_analytics` exists; tables `users_flat`, `quizzes_flat`, `quiz_results_flat`, `quiz_answers_flat` exist; procs `sp_quiz_summary`, `sp_quiz_question_accuracy`, `sp_user_local_rank`, `sp_user_recent_deep_dives`, `sp_refresh_flat_tables` exist. Exit non-zero on failure.

### W1.2 — Dev deploy ([Tom], ~30 min)
- [ ] Run `gcloud auth application-default login` and pick the account that has Editor on `weeklyfifty-dev`.
- [ ] From `functions/`: `BQ_PROJECT_ID=weeklyfifty-dev BQ_LOCATION=australia-southeast1 npm run deploy:bq`.
- [ ] Confirm in BQ console → `weeklyfifty-dev` → `weeklyfifty_analytics` that the tables + procs exist.
- [ ] **Done when:** `functions/scripts/verify-bq.ts` against dev exits 0.

### W1.3 — Dev extensions + backfill ([Tom], ~45 min)
- [ ] Firebase Console → `weeklyfifty-dev` → Extensions → install `firestore-bigquery-export` three times with these configs (per `sql/bigquery/SETUP.md` Step 3):
  - Instance ID `firestore-bigquery-export-quizzes`, collection `quizzes`, table `quizzes`.
  - Instance ID `firestore-bigquery-export-users`, collection `users`, table `users`.
  - Instance ID `firestore-bigquery-export-quizresults`, collection `quizResults`, table `quiz_results`.
- [ ] For each instance, after deploy completes: trigger backfill via the extension's "Backfill existing documents" task (or `gcloud firestore export` per SETUP.md, whichever the doc specifies).
- [ ] BQ console → Scheduled queries → create `refresh_flat_tables_5min` calling `CALL weeklyfifty_analytics.sp_refresh_flat_tables();` every 5 min.
- [ ] **Done when:** `quiz_results_flat` row count matches `_raw_latest` row count within tolerance.

### W1.4 — Dev smoke test ([Claude], ~15 min, blocked on W1.3)
- [ ] Curl `https://weeklyfifty-dev.web.app/api/quizStats/<recent-quiz-id>` and compare numbers against the equivalent Firestore counter doc. Report diff.
- [ ] Curl `https://weeklyfifty-dev.web.app/api/allQuizSummaries` and confirm shape.

### W1.5 — Merge ([Tom], ~10 min)
- [ ] Open PR `BQconvert` → `dev`. Merge after CI green + Claude smoke-test report green.
- [ ] After 24 h dev soak, open PR `dev` → `master`. Merge with manual approval.

### W1.6 — Prod deploy ([Tom], ~45 min)
- [ ] `gcloud auth application-default login` against the prod-capable account.
- [ ] `BQ_PROJECT_ID=weeklyfifty-7617b BQ_LOCATION=australia-southeast1 npm run deploy:bq`.
- [ ] Repeat W1.3 against `weeklyfifty-7617b`.

### W1.7 — Prod smoke test ([Claude], ~15 min)
- [ ] Re-run `verify-bq.ts` and stats curls against prod.
- [ ] **Done when:** all green. Tom strikes `BigQuery merge` in `TODO.md`.

---

## W2 · MemberPress → RevenueCat importer

**Goal:** every paying WP member retains access on cutover day. Highest stakes.
**Total estimate:** ~2 days incl. dry run.

### W2.1 — Export ([Tom], ~15 min)
- [ ] WP Admin → MemberPress → Members → Export CSV. Fields needed: `email`, `username`, `plan`, `status`, `subscription_id`, `subscription_status`, `created_at`, `next_billing_date`.
- [ ] Save to `scripts/data/memberpress-export.csv`. Add `scripts/data/` to `.gitignore` if not already.
- [ ] Cross-check the row count vs. MemberPress dashboard active-subscriber number.

### W2.2 — Plan mapping ([Tom decides + Claude documents], ~30 min)
- [ ] **[Tom]** Decide: which WP plans map to which RevenueCat offerings + entitlements. Write the answer in chat.
- [ ] **[Claude]** Codify the mapping at the top of `scripts/import-memberpress.ts` as a typed constant. Include rows for: monthly basic, yearly basic, lifetime, comp/grandfathered, expired-but-recent.

### W2.3 — Importer script ([Claude], ~half day, blocked on W2.1 + W2.2)
- [ ] Write `scripts/import-memberpress.ts` using the `memberpress-migrate` skill. Behaviour:
  - Reads CSV from `scripts/data/memberpress-export.csv`.
  - For each row: find Firebase Auth user by email → if absent, create with random password and `emailVerified: true` → grant RevenueCat entitlement via REST `POST /v1/subscribers/{app_user_id}/entitlements/{entitlement_id}/promotional` with the right duration → upsert Firestore `users/{uid}` with `isMember: true`, `mpSubscriptionId`, `mpPlan`.
  - `--dry-run` flag: log every decision (`would create`, `would grant`, `skipped: already imported`) without writing.
  - Idempotent: re-running should not double-grant.
  - Writes a JSON report at `scripts/data/import-report-{ts}.json` with counts + per-row outcomes.
- [ ] Unit-test the row-mapping logic against 5 fixture rows (active, expired, lifetime, comp, missing email).

### W2.4 — Secrets + RevenueCat config ([Tom], ~15 min)
- [ ] In RevenueCat dashboard → API keys, copy the **secret** v2 REST key.
- [ ] `firebase functions:secrets:set REVENUECAT_SECRET --project weeklyfifty-dev` (paste at prompt).
- [ ] Repeat for prod project.
- [ ] **Never commit** the key. The script reads it from `process.env.REVENUECAT_SECRET` when invoked locally; in functions runtime via `defineSecret`.

### W2.5 — Dev dry run ([Tom], ~30 min, blocked on W2.3 + W2.4)
- [ ] Point script at dev project: `FIREBASE_PROJECT=weeklyfifty-dev REVENUECAT_SECRET=... ts-node scripts/import-memberpress.ts --dry-run`.
- [ ] Eyeball the JSON report. Anything in "would skip — unrecognised plan" needs a mapping update.

### W2.6 — Dev real run ([Tom], ~15 min)
- [ ] Same command without `--dry-run`.
- [ ] Spot-check 10 random imported rows: log into the dev site as that user (use Firebase Console → Auth → Send password reset to one of the 10 to test the welcome flow). Confirm `/fiftyPlus/exclusives` shows member content.

### W2.7 — Welcome email ([Claude drafts, Tom sends], ~30 min)
- [ ] **[Claude]** Draft the "your account is ready" email using the `brand-voice` skill. Variants: (a) brand-new password-set, (b) existing-user-now-upgraded. Save at `scripts/data/welcome-email.md`.
- [ ] **[Tom]** Schedule the send in Mailchimp / SendGrid for the moment after the prod real-run completes.

### W2.8 — Prod real run ([Tom], cutover day W4.2)
- [ ] As above against `weeklyfifty-7617b`. Verify 5 random members can log in. Tom strikes `MemberPress → RevenueCat user importer` in `TODO.md`.

---

## W3 · App + infra prep

### W3a · Admin RevenueCat REST wiring

**Estimate:** ~half day.

- [ ] **[Claude]** At `functions/src/index.ts:1820–1845`, replace the Stripe TODO stubs:
  - `adminCancelSubscription(uid)`: look up `users/{uid}.revenueCatAppUserId` → REST `DELETE https://api.revenuecat.com/v1/subscribers/{appUserId}/subscriptions/{productIdentifier}` with `Authorization: Bearer ${REVENUECAT_SECRET}`. On 200, write `users/{uid}.cancellationTime` and an audit doc under `adminActions/`.
  - `adminRefundPayment(transactionId)`: `POST https://api.revenuecat.com/v1/subscribers/{appUserId}/transactions/{transactionId}/refund`.
  - Both wrapped in `defineSecret('REVENUECAT_SECRET')` so the secret never logs.
- [ ] **[Claude]** Add minimal happy-path + 4xx-error tests against a mock fetch (no Karma spec files exist yet — drop a one-off `functions/test/admin-rc.test.ts` and document how to run it).
- [ ] **[Tom]** Manually exercise both flows from the admin UI on dev.
- [ ] **[Tom]** Strike `Admin RevenueCat REST wiring` in `TODO.md`.

### W3b · 301 redirect map → `firebase.json`

**Estimate:** Tom 30 min sourcing, Claude 30 min mapping, ~1 h verification.

- [ ] **[Tom] W3b.1** — pull `https://theweeklyfifty.com.au/sitemap.xml` (and any nested sitemaps). Save URL list at `scripts/data/wp-urls.txt` (one per line).
- [ ] **[Tom] W3b.2** — Search Console → Performance → top 50 pages last 90 days. Append any URLs not already in the sitemap to `wp-urls.txt`.
- [ ] **[Claude] W3b.3** — group `wp-urls.txt` into the redirect categories per the plan (§ A1) and surface ambiguous ones for Tom to map by hand.
- [ ] **[Claude] W3b.4** — write the `hosting.redirects` array into `firebase.json`. Initial shop redirects use `type: 302` (will swap to 301 in W5 after stability). Wildcards via `:rest*` Firebase syntax. Commit.
- [ ] **[Tom] W3b.5** — push to `dev`; let GitHub Actions deploy.
- [ ] **[Claude] W3b.6** — run `scripts/smoke-cutover.sh https://weeklyfifty-dev.web.app`. Report any pattern that didn't 301 to the right place.
- [ ] **[Tom] W3b.7** — open PR `dev` → `master`, approve prod deploy.
- [ ] **[Claude] W3b.8** — re-run smoke against `https://weeklyfifty-7617b.web.app`.
- [ ] **[Tom] W3b.9** — strike `301 SEO redirect map` in `TODO.md`.

### W3c · Firebase custom domain

**Estimate:** ~30 min wall time + DNS propagation + SSL provisioning (up to 24 h).

- [ ] **[Tom] W3c.1** — Firebase Console → `weeklyfifty-7617b` → Hosting → Add custom domain → enter `theweeklyfifty.com.au`. Firebase shows a TXT record (`google-site-verification=...`).
- [ ] **[Tom] W3c.2** — at the registrar, add the TXT to `@` (apex). Wait 5–60 min for "Verified" status in Firebase.
- [ ] **[Tom] W3c.3** — copy the **two A records** Firebase shows for the apex. Save these — they go into the registrar at cutover (W4.5), not now.
- [ ] **[Tom] W3c.4** — repeat W3c.1–3 for `www.theweeklyfifty.com.au`. When prompted, choose "Redirect to apex".
- [ ] **[Tom] W3c.5** *(optional)* — repeat for `staging.theweeklyfifty.com.au` against `weeklyfifty-dev`. Useful for a real-domain dress rehearsal of W4.
- [ ] **Done when:** Firebase Console shows both apex + www in "Connected (pending DNS)" state, with the A records noted for cutover.

### W3d · Auth + integration allowlists

**Estimate:** ~45 min.

- [ ] **[Tom] W3d.1** — GitHub repo → Settings → Secrets → edit `ENVIRONMENT_TS_PROD`. Change `firebase.authDomain` from `'weeklyfifty-7617b.firebaseapp.com'` to `'theweeklyfifty.com.au'`. Save.
- [ ] **[Tom] W3d.2** — push a no-op commit to `master` (e.g. bump a comment in `RELEASE.md`) to trigger the prod redeploy.
- [ ] **[Claude] W3d.3** — already verified `app.config.ts:26` reads from environment. ✓
- [ ] **[Tom] W3d.4** — Firebase Console → `weeklyfifty-7617b` → Authentication → Settings → **Authorized domains**: click "Add domain" → `theweeklyfifty.com.au`. Repeat for `www.theweeklyfifty.com.au`.
- [ ] **[Tom] W3d.5** — Google Cloud Console → APIs & Services → Credentials → click the OAuth 2.0 Web client used by Firebase Auth. Add to **Authorized JavaScript origins**: `https://theweeklyfifty.com.au`, `https://www.theweeklyfifty.com.au`. Add to **Authorized redirect URIs**: `https://theweeklyfifty.com.au/__/auth/handler`, `https://www.theweeklyfifty.com.au/__/auth/handler`.
- [ ] **[Tom] W3d.6** — RevenueCat dashboard → Project settings → Web Billing → **Allowed origins**: add `https://theweeklyfifty.com.au`.
- [ ] **[Claude] W3d.7** — already verified Express CORS is `origin: true`. ✓ No change.
- [ ] **[Claude] W3d.8** — grep `functions/src/index.ts` for hard-coded host strings in `returnUrl` / Stripe URLs / webhook constants. Report findings; refactor any constants to derive from `req.headers.origin` or `req.headers.host`.
- [ ] **[Tom] W3d.9** — Stripe dashboard → Developers → Webhooks: confirm the endpoint URL is whatever you want post-cutover. If it currently uses `https://us-central1-weeklyfifty-7617b.cloudfunctions.net/...`, that keeps working since Cloud Functions URLs don't move. No DNS-tied URLs are typical here.

### W3e · SEO assets + hard-coded URL cleanup

**Estimate:** ~45 min, all Claude.

- [ ] **[Claude] W3e.1** — refactor `src/app/shared/services/contact-form.service.ts:24` to read from `environment.functionsBaseUrl` instead of hard-coded `https://weeklyfifty-7617b.web.app/api/...`. Same fix at `src/app/shared/services/quiz-stats.service.ts:71`.
- [ ] **[Claude] W3e.2** — repoint shop links to `https://shop.theweeklyfifty.com.au/` in:
  - `src/app/layout/component/app.menu.ts:43`
  - `src/app/pages/public/home.ts:148`
  - `src/app/pages/public/components/public-topbar.ts:41,65`
- [ ] **[Claude] W3e.3** — generate `src/assets/sitemap.xml` from `src/app.routes.ts` listing every public route under `https://theweeklyfifty.com.au`. Include `/`, `/weekly-quiz`, `/find-a-venue`, `/fiftyshop`, `/contact-us`, `/join`. Set `<changefreq>` weekly, `<priority>` 0.8 for `/weekly-quiz` and 0.5 for the rest.
- [ ] **[Claude] W3e.4** — add or update `src/assets/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Disallow: /fiftyPlus/admin/
  Sitemap: https://theweeklyfifty.com.au/sitemap.xml
  ```
- [ ] **[Claude] W3e.5** — grep `src/app/pages/public/*.ts` for `<link rel="canonical">` and OG `meta` tags. None currently exist (verified). Add canonical + OG tags using `Meta`/`Title` services in each public page's `ngOnInit`. (Optional polish — flag if you want to defer.)

### W3f · WordPress side prep

**Estimate:** ~2 h Tom + 48 h DNS-TTL wait window.

- [ ] **[Tom] W3f.1** — at the registrar, add the new subdomain to your DNS zone. Don't point it at WP yet (W4.3 is the activation).
- [ ] **[Tom] W3f.2** — on the WP VPS, configure an Apache/Nginx vhost (or your panel's "Add domain" button) for `shop.theweeklyfifty.com.au`. Doc it inline in your hosting panel notes.
- [ ] **[Tom] W3f.3** — in `wp-config.php` add (or update) `define('WP_HOME', 'https://shop.theweeklyfifty.com.au'); define('WP_SITEURL', 'https://shop.theweeklyfifty.com.au');`. Or use Settings → General if you prefer; either works but `wp-config.php` overrides DB.
- [ ] **[Tom] W3f.4** — install the SSL cert for the subdomain (Let's Encrypt via your panel or `certbot --nginx -d shop.theweeklyfifty.com.au`).
- [ ] **[Tom] W3f.5** — using your hosts file or a curl `--resolve`, run a real $0.01 checkout against the subdomain config before DNS is live.
- [ ] **[Tom] W3f.6** — bulk `noindex` non-shop WP pages. Yoast: Bulk editor → "Meta Robots" → Set to `noindex` for all non-shop URLs. Or `WP-CLI`: `wp post meta update <ID> _yoast_wpseo_meta-robots-noindex 1` per URL.
- [ ] **[Tom] W3f.7** — **48 h before W4 cutover:** at the registrar, lower TTL for `@`, `www`, `shop` to 300 s.

### W3g · `testWPQuiz.html` decision

- [ ] **[Tom]** Confirm `WPUpgrades/testWPQuiz.html` is scratch.
- [ ] **[Claude]** `git rm WPUpgrades/testWPQuiz.html`. Strike the TODO item.

---

## W4 · Cutover day (sequential, ~2 h window, low-traffic AU morning)

**Pre-flight gate:** every box in W1–W3 ticked. TTL = 300 s. All redirect-map curls green on `weeklyfifty-7617b.web.app`.

- [ ] **[Tom] W4.1** — final go/no-go review of this file. Confirm every box above is ticked.
- [ ] **[Tom] W4.2** — run the W2 importer for-real against prod (see W2.8). Verify 5 random members can log in.
- [ ] **[Tom] W4.3 (day before)** — point `shop.theweeklyfifty.com.au` A record at the WP VPS IP. Wait for propagation: `dig +short shop.theweeklyfifty.com.au` should return the VPS IP from multiple resolvers (`dig @1.1.1.1 ...`, `dig @8.8.8.8 ...`).
- [ ] **[Tom] W4.4 (day before)** — run a real $0.01 checkout against `https://shop.theweeklyfifty.com.au/` once propagated.
- [ ] **[Tom] W4.5 (T = 0)** — at the registrar, replace apex `@` (and `www` CNAME if applicable) A records with the Firebase A IPs from W3c.3.
- [ ] **[Tom] W4.6** — Firebase Console → Hosting → watch SSL status flip from "Pending" → "Connected" (15 min – 24 h). Don't proceed with smoke tests until status is "Connected".
- [ ] **[Claude] W4.7** — within 10 min of "Connected": run `scripts/smoke-cutover.sh https://theweeklyfifty.com.au`. Report any failure with exact URL + response code.
- [ ] **[Tom] W4.8** — manual smoke tests:
  - [ ] Google sign-in from the apex.
  - [ ] Stripe + RevenueCat membership purchase end-to-end.
  - [ ] Public weekly quiz: start, answer, submit, view result.
  - [ ] `/fiftyPlus/stats` loads with real data (BQ-backed).
  - [ ] `https://shop.theweeklyfifty.com.au/cart` checkout works.
- [ ] **[Tom] W4.9** — Google Search Console: submit `https://theweeklyfifty.com.au/sitemap.xml` to the apex property. Add + verify `shop.theweeklyfifty.com.au` as a separate property (DNS or HTML-tag verification).
- [ ] **[Tom] W4.10** — send the W2.7 welcome email batch.

**Rollback** (only if broken > 30 min and not fixable in place):
- [ ] **[Tom]** Revert apex A record to WP VPS IP at the registrar (TTL 300 s = ≤ 5 min effective).
- [ ] **[Claude]** Diagnose against `https://weeklyfifty-7617b.web.app` (still live) and post a root-cause summary.

---

## W5 · Post-cutover (first 30 days)

- [ ] **[Claude] W5.1** — **Day 1, 3, 7:** sweep Firebase Hosting logs + Search Console "Pages → Not indexed" for 404 patterns. Open a PR adding any missed patterns to `firebase.json` redirects. (Want me to /schedule this as a recurring agent?)
- [ ] **[Tom] W5.2** — **Day 1–7:** watch BigQuery `quiz_results_flat` + Firebase Analytics. Drop > 15 % WoW = regression — flag in chat and we triage together.
- [ ] **[Tom] W5.3** — **Day 7+:** restore DNS TTL to 3600 s once stable.
- [ ] **[Claude] W5.4** — **Day 30:** swap apex `/shop/*` → subdomain redirects in `firebase.json` from `302` to `301`. Open the PR.
- [ ] **[Tom] W5.5** — **Whenever:** kick off the WooCommerce shop port (use `revenue-feature` skill, merch-drop variant). Once that ships, the `shop.` subdomain retires and shop redirects route to `/fiftyshop`.

---

## How to use this file

- Tick boxes as you go; this file is the single source of progress.
- When a `[Claude]` box is unblocked, ping me with the ID (e.g. "do W3a", "do W1.4") and I'll execute.
- When a `[Tom]` box has a Claude prereq, that prereq is listed above it.
- Update gating items in `TODO.md` so the high-level punch list stays current.
