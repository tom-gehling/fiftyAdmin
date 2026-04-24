# Phase A — Environment Setup Walkthrough

One-time setup of the dev Firebase project, GitHub org migration, service accounts, GitHub secrets, RevenueCat Sandbox, dev data seed, and PostHog. Follow in order. Estimated time: 2-3 hours.

**Note on auto-deploy:** once this walkthrough is complete, pushing to the `dev` branch automatically deploys to the dev Firebase project, and pushing to `master` deploys to prod (behind manual approval). No extra Firebase-CLI auto-deploy config is needed — the three GitHub Actions workflows in `.github/workflows/` handle it.

Prerequisites:
- Firebase CLI installed (`npm install -g firebase-tools` and `firebase login`)
- Billing account linked to your Google account (free tier is fine for dev)
- Admin access to the current `tom-gehling/fiftyAdmin` GitHub repo (moving to `TheWeeklyFifty/weeklyFiftyWeb` in Step 5)
- RevenueCat dashboard access

---

## Step 1 — Create the dev Firebase project

**Why:** Isolates dev from the 20k-user prod project. Auto-creates a paired GCP project so BigQuery, billing, and IAM are also isolated.

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) → **Add project**.
2. Project name: `weeklyfifty-dev`. Confirm the auto-generated Project ID is exactly `weeklyfifty-dev` (edit if not — it must match `.firebaserc`).
3. **Disable** Google Analytics for this project (keeps dev traffic out of prod analytics). You can enable later if needed.
4. Wait for the project to provision.

**Verify:** [console.cloud.google.com](https://console.cloud.google.com/) shows a new GCP project named `weeklyfifty-dev`. It should be on the same billing account as prod (link it if prompted).

**Pitfall:** If the ID `weeklyfifty-dev` is taken globally (Google project IDs are global), pick `weeklyfifty-dev-1` or similar and update `.firebaserc` to match.

---

## Step 2 — Enable services in the dev project

In the dev project's Firebase console:

- **Authentication** → Get started → enable the same sign-in providers as prod (likely Email/Password, Google). Don't enable anonymous unless prod has it.
- **Firestore Database** → Create database → start in **production mode** (we'll deploy the rules via CI) → pick `australia-southeast1` (Sydney) to match prod latency.
- **Storage** → Get started → same region.
- **Hosting** → Get started → click through (no domain needed yet; dev will run at `weeklyfifty-dev.web.app`).
- **Functions** → enabling happens automatically on first deploy. Requires the project to be on **Blaze** (pay-as-you-go) plan. Upgrade now — usage at dev traffic levels is effectively free, but Functions + BQ both require Blaze.

**Verify:** All services show "Enabled" in the Firebase console nav.

**Pitfall:** Blaze plan prompt appears mid-flow. Without it, Functions deploys will fail in CI.

---

## Step 3 — Get the dev web config

**Why:** This is what replaces the Firebase config block in `environment.ts` locally and in the `ENVIRONMENT_TS_DEV` GitHub secret.

1. Dev project → **Project Settings** (gear icon top-left) → **General** tab → scroll to **Your apps**.
2. Click **Add app** → Web (`</>` icon) → nickname `weeklyfifty-dev-web` → skip hosting setup → Register app.
3. Copy the `firebaseConfig` object. It'll look like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "weeklyfifty-dev.firebaseapp.com",
     projectId: "weeklyfifty-dev",
     storageBucket: "weeklyfifty-dev.firebasestorage.app",
     messagingSenderId: "...",
     appId: "...",
     measurementId: "..."   // only if you enabled Analytics
   };
   ```
4. Open `src/environments/environment.ts` locally and **replace the `firebase: { ... }` block** with these values. The file is gitignored so this change is local-only.

**Verify:** Run `npm start` — the app should load and log in. Look at the Network tab: Firestore calls should go to `*.firebaseio.com` / `*.cloud.goog` for the `weeklyfifty-dev` project ID. (It'll be an empty database, so most pages will show empty states — that's expected.)

---

## Step 4 — Generate service account JSON keys (dev + prod)

**Why:** CI uses these to deploy on your behalf. Scoped keys, revocable.

Repeat this for **both** projects (dev + prod):

1. Firebase console → select the project → **Project Settings** → **Service accounts** tab.
2. Click **Generate new private key** → Download the JSON file.
3. **Do not commit this JSON anywhere.** Keep it in your password manager or secrets vault.
4. (Optional hardening) In GCP IAM → Service accounts, you can create a dedicated `github-actions-deploy` service account with only these roles:
   - Firebase Admin SDK Administrator Service Agent
   - Cloud Functions Developer
   - Firebase Hosting Admin
   - Firestore Service Agent (or Cloud Datastore User)
   - Storage Admin

   Then generate the JSON from that account instead. The default "firebase-adminsdk" account works too but has broader permissions than strictly needed.

**Verify:** You now have two JSON files — one per project. Open each and confirm the `project_id` field inside matches the expected project.

**Pitfall:** The default service account JSON has powerful permissions. If it leaks, it can delete your project. Rotate (delete old key in IAM → generate new) if you ever paste it anywhere shared.

---

## Step 5 — Move the repo to the `TheWeeklyFifty` org + rename

**Why:** Consolidate everything under the `TheWeeklyFifty` org ahead of the mobile-app workstream. The web codebase becomes `TheWeeklyFifty/weeklyFiftyWeb`; a future `TheWeeklyFifty/weeklyFiftyApp` will hold the eventual React Native rebuild (the Capacitor intermediate phase stays in `weeklyFiftyWeb` since it wraps the Angular app in-repo). Do this **before** Step 6 so GitHub secrets land on the final repo.

1. **Confirm admin access to `TheWeeklyFifty`.** GitHub → profile menu → **Your organizations** → `TheWeeklyFifty` should appear. You need Owner-level access to receive a repo transfer into the org. If you're not an Owner yet, have a current Owner promote you under Org → People → your row → Change role → Owner.

2. **Transfer the repo.** On `tom-gehling/fiftyAdmin` → **Settings** → **Danger Zone** → **Transfer ownership** → new owner `TheWeeklyFifty`, confirm the repo name (`fiftyAdmin`). Issues, PRs, releases, branch protection rules survive. GitHub keeps HTTP redirects from the old URL live for a period.

3. **Rename.** New location → **Settings** → **General** → rename repository to `weeklyFiftyWeb`.

4. **Update your local git remote:**
   ```bash
   git remote set-url origin https://github.com/TheWeeklyFifty/weeklyFiftyWeb.git
   git remote -v   # verify
   ```

5. **Sanity-check what survived the move:**
   - A recent PR — commits and comments intact.
   - Actions tab — past runs visible.
   - **Secrets are NOT transferred.** That's fine — you haven't added any yet (Step 6 adds them to the new repo).
   - **Deploy keys and webhooks** transfer but audit under Settings → Deploy keys / Webhooks.
   - **Branch protection rules** migrate.

6. **Future note:** when the Capacitor mobile build ships, it stays in `weeklyFiftyWeb` (iOS/Android projects live alongside the Angular codebase). When/if the React Native rebuild kicks off (phase 2 of the mobile strategy), create `TheWeeklyFifty/weeklyFiftyApp` in the same org.

**Verify:**
- `git remote -v` shows the new URL.
- `git push` from a local branch succeeds against the new origin.
- Visiting `https://github.com/tom-gehling/fiftyAdmin` redirects to `https://github.com/TheWeeklyFifty/weeklyFiftyWeb`.

**Pitfalls:**
- **Old clones on other machines still point at `tom-gehling/fiftyAdmin`.** Each needs `git remote set-url`.
- **External integrations** (Slack GitHub app, Linear, Sentry, analytics) referencing the old repo URL may need reconfiguring.
- **Package-lock / CI configs** may reference the old repo. Grep the codebase for `tom-gehling` and update any references found.

---

## Step 6 — Add GitHub secrets

On GitHub: `TheWeeklyFifty/weeklyFiftyWeb` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add four secrets:

| Name | Value |
|------|-------|
| `ENVIRONMENT_TS_DEV` | Paste the **entire contents** of your local `environment.ts` (with dev keys). The CI will write this verbatim to `src/environments/environment.ts` before building. |
| `ENVIRONMENT_TS_PROD` | Paste the **entire contents** of your local `environment.prod.ts` (with real prod keys). |
| `FIREBASE_SERVICE_ACCOUNT_DEV` | Paste the **entire JSON** of the dev service account key (from Step 4). |
| `FIREBASE_SERVICE_ACCOUNT_PROD` | Paste the **entire JSON** of the prod service account key. |

**Verify:** Four secrets visible in the list (values are masked).

**Pitfall:** Secrets cannot start with `GITHUB_` (reserved). Names above are fine. Also: the full JSON must be valid — no extra quoting. If CI complains about JSON parsing, re-paste without wrapping in quotes.

---

## Step 7 — Set up GitHub `production` environment

**Why:** Gates prod deploys behind manual approval. Accidental `master` pushes won't ship.

1. GitHub repo → **Settings** → **Environments** → **New environment**.
2. Name: `production`. Click Configure.
3. Under **Deployment protection rules**:
   - Check **Required reviewers** → add yourself (tom-gehling).
   - **Wait timer**: 0 min (optional — set to 5 min if you want a safety pause).
4. Under **Deployment branches**: select **Selected branches** → add rule `master` only.
5. Save.

**(Optional)** Create a second environment `development` with no rules — purely cosmetic for Actions logs, since dev auto-deploys anyway.

**Verify:** Environment appears in the list. Test later in Step 9.

---

## Step 8 — RevenueCat Sandbox setup

**Why:** Dev purchases must not create real charges or pollute prod cohort data. RC has a Sandbox mode for this.

1. RevenueCat dashboard → top-right project switcher → **+ New project** (or reuse an existing sandbox if you have one).
2. Name: `Weekly Fifty — Dev`. Environment: **Sandbox**.
3. Project Settings → **Apps** → Add a **Web Billing** app. Paste your dev Firebase project ID or domain.
4. Project Settings → **API keys** → copy the **Web (public)** key. Starts with `rcb_`.
5. Update `environment.ts` locally: replace `revenueCatPublicApiKey` with the sandbox key.
6. In the RC dashboard, configure the `fiftyplus` entitlement on the sandbox project to match prod (same identifier).
7. Create a sandbox Product / Package matching your prod tier structure so dev purchase flows resolve.
8. (Important) Re-paste the updated `environment.ts` into the `ENVIRONMENT_TS_DEV` GitHub secret from Step 6.

**Verify:** Running the app locally against dev Firebase + sandbox RC, a purchase flow should either (a) succeed without real billing, or (b) show RC sandbox test cards.

**Pitfall:** RC Web Billing sandbox is different from iOS/Android sandbox — which is relevant later in the Capacitor phase. For now, only web sandbox matters.

---

## Step 9 — Update local `environment.ts` to point fully at dev

By now `environment.ts` should have:
- `production: false`
- `firebase: { ... }` = dev project web config (from Step 3)
- `revenueCatPublicApiKey` = sandbox key (from Step 8)
- `googleMapsApiKey` = either same as prod (acceptable short-term) or a new key restricted to dev domains (better)
- `functionsBaseUrl` = either empty (if you'll test against dev Hosting rewrites) or `https://us-central1-weeklyfifty-dev.cloudfunctions.net` (if hitting dev Functions directly from `ng serve`)

Run locally:
```bash
firebase use dev
npm start
```

The app should load against dev Firebase (empty data, but no errors).

---

## Step 10 — First deploy test (dev)

Time to prove CI works end-to-end.

1. On the `dev` branch, make a trivial commit (e.g. bump a version comment) and push.
2. GitHub → **Actions** tab → watch the `Deploy to Dev` workflow run.
3. It should:
   - Install deps
   - Write `environment.ts` from the `ENVIRONMENT_TS_DEV` secret
   - Build web + functions
   - Authenticate with the dev service account
   - Deploy hosting + functions + firestore rules + storage rules
4. Open [weeklyfifty-dev.web.app](https://weeklyfifty-dev.web.app) — the app should load.

**Pitfalls:**
- **Functions deploy fails with `Project is not on Blaze plan`** → upgrade dev project to Blaze (Step 2 reminder).
- **`Permission denied` on Cloud Functions** → service account missing `Cloud Functions Developer` role. Add in GCP IAM.
- **`Firestore indexes` deploy fails** → expected on first run if `firestore.indexes.json` references collections that don't exist yet in dev. Harmless; re-deploys succeed after first writes.
- **Hosting deploys but page is blank** → `environment.ts` secret was malformed. Check the Actions log for the build step output; re-paste the secret.

---

## Step 11 — Seed dev Firestore with prod data (one-time)

**Why:** Empty dev is hard to test against. Seeding with a snapshot of prod gives realistic data volumes, geo distribution, and edge cases so new features can be validated in dev before hitting prod. Do this **once** after dev deploy is confirmed (Step 10). **Don't** do it on an ongoing schedule — dev should drift from prod so schema changes can be tested safely.

**What's copied:**
- Firestore data: yes (managed export → import)
- Firebase Storage files (team photos, quiz images): optional, large
- Firebase Auth users: **no** — create fresh dev test accounts instead (copying 20k real user emails into dev is PII exposure you don't need)
- BigQuery: handled separately when `BQconvert` branch lands

**Steps:**

1. **Create a GCS bucket for the export** (in the prod GCP project — it's the source of truth):
   ```bash
   gsutil mb -l australia-southeast1 -p weeklyfifty-7617b gs://weeklyfifty-7617b-firestore-exports
   ```
   Or via console: Cloud Storage → Create bucket → `australia-southeast1`, Standard, uniform IAM.

2. **Grant dev's service account read access** to the prod export bucket. In GCP console of the prod project → the new bucket → Permissions → Grant access → paste dev project's default Firebase service account email (`firebase-adminsdk-…@weeklyfifty-dev.iam.gserviceaccount.com`) → role: **Storage Object Viewer**.

3. **Export from prod:**
   ```bash
   gcloud firestore export gs://weeklyfifty-7617b-firestore-exports/seed-$(date +%Y%m%d) \
     --project=weeklyfifty-7617b
   ```
   Managed export. For ~20k users + 200 weeks of quiz data, expect 5-15 min. Status in Firebase console → Firestore → Import/Export tab.

4. **Import to dev:**
   ```bash
   gcloud firestore import gs://weeklyfifty-7617b-firestore-exports/seed-YYYYMMDD \
     --project=weeklyfifty-dev
   ```
   Replace `YYYYMMDD` with the actual export folder name. This MERGES into dev Firestore — since dev is empty, effectively a clean copy.

5. **(Optional) Copy Storage files** — team photos, quiz images. Large, may take an hour+ depending on bandwidth:
   ```bash
   gsutil -m cp -r gs://weeklyfifty-7617b.firebasestorage.app/* \
     gs://weeklyfifty-dev.firebasestorage.app/
   ```
   Skip if dev testing doesn't require real images — photos can be added ad-hoc.

6. **Create fresh Auth users in dev** manually: Firebase console → dev project → Authentication → Add user. Create 1-2 test accounts for your own use. Mark at least one as admin by manually setting `isAdmin: true` in their `users/{uid}` Firestore doc.

**Verify:**
- dev project → Firestore Data tab → collections match prod (`users`, `quizzes`, `quizResults`, `venues`, `submissionForms`, …).
- Browse the dev site → archives page should list real quizzes → quiz details load.
- Rough count check: a couple of collections should have comparable document counts to prod.

**Pitfalls:**
- **PII in dev.** Real emails, real quiz submissions, real team photos now live in dev. Dev is locked behind auth + service accounts, so exposure is low — but don't paste dev data into screenshots, shared pairing sessions, or external tools. Treat as if prod.
- **Non-empty dev.** If you've done any dev manual testing before this step, the import merges by document ID — same-ID docs get overwritten. Back up first if that matters.
- **Security rules lag.** `firestore.rules` deploys per-project via the workflow. If dev rules haven't been deployed yet, reads may 403. Fix: `firebase deploy --only firestore:rules --project dev`.
- **Indexes don't come in the export.** Handled by the deploy workflow, but if you run queries directly before that first deploy, some queries may fail pending index creation.

**Refreshing dev later.** Same flow — new export, new import. Each refresh erases dev-only test data, which is usually acceptable.

---

## Step 12 — First deploy test (prod with approval gate)

1. Open a PR from `dev` → `master` with a tiny change.
2. Confirm PR checks (lint, type-check, build) pass.
3. Merge the PR.
4. GitHub → **Actions** → `Deploy to Prod` workflow starts, then **pauses with a "Waiting for approval"** status.
5. Click **Review deployments** → approve → workflow continues.
6. Confirm prod still works after deploy (smoke-test the live site).

**Verify:** The approval gate fired. If it didn't, recheck Step 7 — the `production` environment needs both the required reviewer rule AND the `environment: production` reference in `deploy-prod.yml` (which is already set).

---

## Step 13 — Set up PostHog product analytics

**Why:** Firebase Analytics is fine for page views and headline counts but weak for product analytics — funnels, cohorts, retention curves, session replays, feature flags. PostHog fills that gap. Running both is standard: **FA for Firebase-native measurement + SEM integration, PostHog for product insight**. Aligns with the "stats first-class" principle.

Do this after both envs are confirmed deployable (Steps 10 + 12).

1. **Sign up at [posthog.com](https://posthog.com).** For an AU audience, **US Cloud** has slightly better latency to Sydney than EU Cloud. If data residency matters for AU Privacy Act, EU Cloud is the compromise (no AU region exists). Free tier = 1M events/month.

2. **Create two projects in PostHog:** `Weekly Fifty — Dev` and `Weekly Fifty — Prod`. Separate projects keep dev noise out of prod analytics. (Alternative: one project with an `environment` property — cheaper on event quota, noisier to filter.)

3. **Copy both project API keys.** PostHog project → Settings → Project API Key. Two keys needed:
   - Dev key → paste into local `environment.ts` as a new `posthogKey` field + re-sync `ENVIRONMENT_TS_DEV` GitHub secret.
   - Prod key → paste into local `environment.prod.ts` as `posthogKey` + re-sync `ENVIRONMENT_TS_PROD` GitHub secret.

4. **Install SDK:**
   ```bash
   npm install posthog-js --save
   ```

5. **Codebase wiring** (pair with me after keys are in — needs decisions on what to track):
   - `environment.example.ts` gets a `posthogKey` + `posthogHost` block
   - `app.config.ts` initialises PostHog after the environment resolves
   - A lightweight `AnalyticsService` wraps PostHog + Firebase Analytics so both fire from one call site (per the "stats first-class" rule)
   - `AuthService.user$` subscription calls `posthog.identify(uid)` on login, `posthog.reset()` on logout
   - Key events instrumented: quiz_start, quiz_finish, submission_submit, upgrade_click, upgrade_success, venue_view, game_start

6. **PostHog dashboard setup** (post-first-data):
   - **Autocapture**: on by default. Captures clicks, form submits, page views with zero extra code.
   - **Session replays**: on, but configure **input masking** for any PII fields (team name, email) before enabling in prod.
   - **Funnels**: signup → first-quiz-complete → first-submission → member-upgrade.
   - **Cohorts**: WAU players, members vs non-members, AU state segmentation.
   - **Feature flags**: useful for staged rollouts post-cutover.

**Pitfalls:**
- **Event quota at scale.** Autocapture at 20k WAU can burn through the 1M/month free tier fast. Watch the Usage dashboard week 1; switch to explicit events only if approaching the cap.
- **Session replay + PII.** Replays can capture team names, emails, addresses in form fields. Configure masking **before** going live in prod, not after.
- **Duplication with Firebase Analytics.** Expected — keep both, they serve different purposes. Don't try to consolidate.
- **Identify timing.** If `posthog.identify(uid)` fires before PostHog is initialised, the event is silently lost. Wire via the auth observable, not inline.

---

## Post-setup follow-ups (not blocking, but worth doing soon)

- [ ] Generate a separate **Google Maps API key** for dev, restricted to `localhost:*` and `weeklyfifty-dev.web.app`. Update `environment.ts` + `ENVIRONMENT_TS_DEV` secret.
- [ ] Set **Cloud Functions secrets** per project (`firebase functions:secrets:set STRIPE_SECRET_KEY` etc.) if any Stripe legacy paths remain active.
- [ ] Set up **scheduled Firestore exports** on prod for disaster recovery (separate small task).
- [ ] Flip the `continue-on-error: true` on the lint step in `.github/workflows/pr-checks.yml` to `false` once lint is clean.
- [ ] When `BQconvert` merges: update `functions/scripts/deploy-bq.ts` to read project from `.firebaserc` alias or `--project` arg (it currently hardcodes).
- [ ] **Align Angular package versions + remove `.npmrc` `legacy-peer-deps`.** Currently most `@angular/*` packages are at `^20` (lockfile resolved to `20.1.3`) while `@angular/platform-server` is at `^20.3.0`. The mismatch forced `legacy-peer-deps=true` to unblock CI. Clean fix: run `npm install @angular/animations@^20.3 @angular/cdk@^20.3 @angular/common@^20.3 @angular/compiler@^20.3 @angular/core@^20.3 @angular/forms@^20.3 @angular/platform-browser@^20.3 @angular/platform-browser-dynamic@^20.3 @angular/router@^20.3 @angular-devkit/build-angular@^20.3 @angular/cli@^20.3 @angular/compiler-cli@^20.3` to align, verify build + test locally, then remove `.npmrc`.

---

## Quick reference — commands after setup

```bash
# Switch target locally
firebase use dev
firebase use prod

# Check current
firebase use

# Deploy manually (escape hatch — bypasses CI gate)
firebase deploy --project dev --only hosting,functions,firestore,storage
firebase deploy --project prod --only hosting,functions,firestore,storage

# Emulators (no Firebase project needed)
firebase emulators:start
```

See `environments.md` for the ongoing-reference doc on branch mapping, common gotchas, and rollback.
