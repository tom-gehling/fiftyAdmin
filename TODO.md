# Cutover TODO — WordPress → Angular

**Last reviewed:** 2026-04-27
**Goal:** retire the legacy WordPress site, move this Angular app to the primary URL.
**Source of truth:** this file. Edit it when things change.

---

## Critical path (must ship before cutover)

- [ ] **301 SEO redirect map**
  - **What:** Map every legacy WP URL (`/quiz/`, `/quiz/{slug}/`, `/archive/`, `/find-a-venue/`, etc.) → Angular routes.
  - **Where:** `firebase.json` `hosting.redirects` array (currently has SPA rewrites only — zero redirects).
  - **Why gating:** ~200 weeks of indexed pages would 404 on cutover day, killing organic traffic from ~20k weekly users.
  - **Effort:** hours, not days. Pull live WP sitemap, write the map, verify against staging before flipping DNS.

- [ ] **MemberPress → RevenueCat user importer**
  - **What:** Batch script to copy paying WP members into Firebase Auth + grant RevenueCat entitlements with no subscription interruption.
  - **Where:** new script under `/scripts` or `/batch`. Existing client-side RevenueCat is wired (commit `f3c0548`).
  - **Why gating:** without this, paying members lose access on cutover day. Highest stakes piece of the migration.
  - **Effort:** discovery + dry-run on dev project + cutover playbook. Several days.
  - **Skill:** use `memberpress-migrate` skill when starting.

- [ ] **BigQuery merge** *(elevated to pre-ship 2026-04-27)*
  - **What:** Wire each Firebase project to BigQuery (extensions + backfill + scheduled refresh), merge `BQconvert` → `dev` → `master`, deploy BQ tables/procs to dev then prod, switch stats endpoints from Firestore counters to BQ-backed.
  - **Where:** `BQconvert` branch. `sql/bigquery/tables/`, `sql/bigquery/procedures/`, `functions/src/index.ts` (BQ-backed endpoints already written).
  - **How:** Follow `sql/bigquery/SETUP.md` — browser-first walkthrough, dev first then prod. Locations: `us-central1` Cloud Functions, `US` BigQuery dataset (Firestore is `nam5`).
  - **Why gating:** Tom wants the analytics layer in place at launch, not bolted on after. Instrumentation designed in is richer than retro-fitted.
  - **Effort:** integration + verification. The build is done.

- [ ] **Admin RevenueCat REST wiring**
  - **What:** Replace TODO stubs in `functions/src/index.ts:1597` (`adminCancelSubscription`) and `:1606` (`adminRefundPayment`) with RevenueCat REST API calls.
  - **Why gating:** small but you can't service members without it.
  - **Effort:** half a day each.

---

## Post-cutover (ship in parallel or after)

- [ ] **WooCommerce shop port**
  - **What:** Replace `src/app/pages/public/fiftyshop.ts` "FIFTY SHOP COMING SOON" placeholder with a real merch store.
  - **Why deferred:** revenue arm — important, but cutover is not gated on it. WP shop can stay live during transition.
  - **Skill:** `revenue-feature` (merch drop variant).

- [ ] **`testWPQuiz.html` decision**
  - **What:** Confirm `WPUpgrades/testWPQuiz.html` is scratch and can be deleted (only WP template without an Angular equivalent).

---

## Done ✅

- [x] **CI/CD + dev/prod env split** — `weeklyfifty-dev` + `weeklyfifty-7617b` projects, GitHub Actions workflows on `dev`/`master` branches, env secrets wired. Commits `79b86ed` → `c3dc740`.
- [x] **Public weekly-quiz UX parity** — self-marking (`markAnswer()`) + team-photo submission (`onFileChange()`) + teammate tagging (`UserTagSelectorComponent`) live in `src/app/pages/common/quiz-display/quiz-display.ts`.
- [x] **WP template parity (7 of 8)** — `quiz.html`, `normalQuiz.html`, `fiftyQuiz.html`, `questionQuizzes.html`, `archivesPage.html`, `oldarchives.html`, `fiftyplusTest.html` all mapped to Angular pages. Only `testWPQuiz.html` outstanding (likely scratch).
- [x] **Historical content import** — all historical quizzes already in Firestore (imported out-of-band, confirmed 2026-04-27).

---

## How to use this file

- Tom edits this file by hand when status changes.
- Claude reads this file first when asked about roadmap progress, then verifies against current code.
- When something completes, move it from Critical/Post-cutover → Done with a short evidence line (file path, commit, etc.).
- If priority shifts (something elevated to / dropped from critical path), update in place with a `*(date note)*` annotation.
