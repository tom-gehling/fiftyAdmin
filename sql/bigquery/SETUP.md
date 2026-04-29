# Wire Firebase → BigQuery (operational setup)

Walkthrough for connecting a Firebase project to BigQuery using the `firestore-bigquery-export` extension, then deploying the flat tables and procedures in this directory. Browser-first; CLI fallback noted where the browser doesn't cover it.

Do **dev** (`weeklyfifty-dev`) first, validate end-to-end, then repeat for **prod** (`weeklyfifty-7617b`). Both projects use Firestore in `nam5` (US multi-region), so BigQuery and Cloud Functions both go in US.

## Locations (both projects)

| Component | Location |
|---|---|
| Firestore | `nam5` (existing — fixed) |
| Extension Cloud Functions | `us-central1` |
| BigQuery dataset | `US` (multi-region) |
| BigQuery scheduled query | `US` |
 
## Constants (both projects)

- Dataset ID: `weeklyfifty_analytics`
- Extension instance A — instance ID `firestore-bigquery-export-quizzes`, collection `quizzes`, table prefix `quizzes`
- Extension instance B — instance ID `firestore-bigquery-export-users`, collection `users`, table prefix `users`
- Extension instance C — instance ID `firestore-bigquery-export`, collection `quizResults`, table prefix `quiz_results`

> Instance ID is the label Firebase shows in the Extensions list. Naming each one after the collection makes it obvious which is which. Lowercase + hyphens only, ≤45 chars.

---

## Step 0 — Verify current state

**Firebase Console** → switch to the target project (top-left switcher).

- [ ] Build → **Extensions** — list any installed `firestore-bigquery-export` instances (none expected on first run).
- [ ] Build → **Firestore** — confirm `quizzes`, `users`, and `quizResults` collections exist.

Direct URLs:
- Dev extensions: https://console.firebase.google.com/project/weeklyfifty-dev/extensions
- Prod extensions: https://console.firebase.google.com/project/weeklyfifty-7617b/extensions

**BigQuery Console** → https://console.cloud.google.com/bigquery, switch project (top bar).

- [ ] Expand the project in **Explorer** — note whether `weeklyfifty_analytics` exists.
- [ ] If it exists, expand it and list which of these are present: `quizzes_raw_latest`, `quizzes_raw_changelog`, `users_raw_latest`, `users_raw_changelog`, `quiz_results_raw_latest`, `quiz_results_raw_changelog`, `quizzes_flat`, `users_flat`, `quiz_results_flat`, `quiz_answers_flat`.

Outcomes:
- Nothing exists → run all steps below.
- Extensions installed but no flat tables → skip to Step 4.
- Everything exists → skip to Step 6 (verify).

---

## Step 1 — Install the three extension instances

Firebase Console → **Extensions** → **Explore Hub** → search **"Stream Firestore to BigQuery"** (publisher: Firebase) → **Install in Firebase console**.

Pre-install: Firebase will require Blaze plan + enabling BigQuery API + granting IAM roles. Click through.

### Instance A — `quizzes`

| Field | Value |
|---|---|
| Instance ID | `firestore-bigquery-export-quizzes` |
| Cloud Functions location | `us-central1` |
| BigQuery Dataset location | `US` |
| Collection path | `quizzes` |
| Enable Wildcard Column field with Parent Firestore Document IDs | `No` |
| Dataset ID | `weeklyfifty_analytics` |
| Table ID | `quizzes` |
| BigQuery SQL table Time Partitioning option type | leave default (`NONE`) |
| BigQuery Time Partitioning column name | blank |
| Firestore document field name for BigQuery SQL Time Partitioning Field option | blank |
| BigQuery SQL Time Partitioning table schema field(s) | blank |
| BigQuery SQL table clustering | blank |
| Backup Collection | blank |
| Transform function URL | blank |
| Use new query syntax for snapshots | `Yes` |
| Exclude old data payloads | `No` |
| Maximum number of synced documents per second | `100` (default) |

Click **Install extension**. Wait for "Installed" badge (~2 min).

### Instance B — `users`

Click **Install another instance**. Same form, same values, **except**:

- Instance ID: `firestore-bigquery-export-users`
- Collection path: `users`
- Table ID: `users`

### Instance C — `quizResults`

Click **Install another instance**. Same form, same values, **except**:

- Instance ID: `firestore-bigquery-export-quizresults`
- Collection path: `quizResults`
- Table ID: `quiz_results`

After all three finish, BigQuery Explorer should show `weeklyfifty_analytics` with six objects: `quizzes_raw_changelog`, `quizzes_raw_latest`, `users_raw_changelog`, `users_raw_latest`, `quiz_results_raw_changelog`, `quiz_results_raw_latest`.

---

## Step 2 — Backfill historical Firestore data

The extension only captures *new* writes. To pull existing docs in:

**Option A — in-console backfill (if available):** Firebase Console → Extensions → click each installed instance → look for a **Run backfill** button on the detail page. If it's there, run it for all three instances and watch the Cloud Run jobs in **GCP Console → Cloud Run**.

**Option B — CLI (one-off):**

> Note: `--non-interactive` requires *every* flag below. Missing any will error with `[ERROR] X is not specified.` The flag set here is the minimal working one — leave nothing out.

```bash
npx @firebaseextensions/fs-bq-import-collection --non-interactive --project=weeklyfifty-dev --big-query-project=weeklyfifty-dev --query-collection-group=false --source-collection-path=quizzes --dataset=weeklyfifty_analytics --table-name-prefix=quizzes --dataset-location=us --multi-threaded=true --use-new-snapshot-query-syntax=true

npx @firebaseextensions/fs-bq-import-collection --non-interactive --project=weeklyfifty-dev --big-query-project=weeklyfifty-dev --query-collection-group=false --source-collection-path=users --dataset=weeklyfifty_analytics --table-name-prefix=users --dataset-location=us --multi-threaded=true --use-new-snapshot-query-syntax=true

npx @firebaseextensions/fs-bq-import-collection --non-interactive --project=weeklyfifty-dev --big-query-project=weeklyfifty-dev --query-collection-group=false --source-collection-path=quizResults --dataset=weeklyfifty_analytics --table-name-prefix=quiz_results --dataset-location=us --multi-threaded=true --use-new-snapshot-query-syntax=true
```

Verify in BigQuery Studio:

```sql
SELECT COUNT(*) FROM `weeklyfifty_analytics.quizzes_raw_latest`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.users_raw_latest`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.quiz_results_raw_latest`;
```

Prod backfill is large (200+ weeks × 20k weekly users) — run during a quiet window, expect minutes-to-hours. Can pass `--batch-size=300`.

---

## Step 3 — Confirm `_raw_latest` views exist

In BigQuery Explorer, expand `weeklyfifty_analytics`. All six expected:

- `quizzes_raw_changelog` (table)
- `quizzes_raw_latest` (view)
- `users_raw_changelog` (table)
- `users_raw_latest` (view)
- `quiz_results_raw_changelog` (table)
- `quiz_results_raw_latest` (view)

If a `_raw_latest` view is missing (older extension version), regenerate it:

```bash
npx @firebaseextensions/fs-bq-schema-views \
  --non-interactive \
  --project=weeklyfifty-dev \
  --dataset=weeklyfifty_analytics \
  --table-name-prefix=quizzes
```

Repeat for `users` and `quiz_results`.

---

## Step 4 — Deploy flat tables and procedures

**Option A — CLI (recommended, ~30 sec):**

```bash
cd functions
BQ_PROJECT_ID=weeklyfifty-dev BQ_LOCATION=US npm run deploy:bq
```

For prod:

```bash
cd functions
BQ_PROJECT_ID=weeklyfifty-7617b BQ_LOCATION=US npm run deploy:bq
```

The script (`functions/scripts/deploy-bq.ts`) deploys every `.sql` file under `sql/bigquery/tables/` then `sql/bigquery/procedures/` in alphabetical order. Every statement is `CREATE OR REPLACE` — safe to re-run.

Auth: the script uses Application Default Credentials. If you haven't set them:

```bash
gcloud auth application-default login
```

**Option B — paste each file into BQ Studio:**

In BigQuery Studio → **Compose new query**, paste and run each in this order:

1. `sql/bigquery/tables/users_flat.sql` (independent)
2. `sql/bigquery/tables/quizzes_flat.sql`
3. `sql/bigquery/tables/quiz_results_flat.sql` (joins quizzes_flat)
4. `sql/bigquery/tables/quiz_answers_flat.sql` (joins both)
5. All files in `sql/bigquery/procedures/` (any order — independent)

After deploy, Explorer should show four flat tables (`users_flat`, `quizzes_flat`, `quiz_results_flat`, `quiz_answers_flat`) and the procedures under **Routines**.

---

## Step 5 — Schedule the refresh procedure (every 5 min)

In BigQuery Studio → **Compose new query** (project = target project):

```sql
CALL `weeklyfifty_analytics.sp_refresh_flat_tables`();
```

Run once manually first — should succeed in seconds.

Then click **Schedule** → **Create new scheduled query**:

| Field | Value |
|---|---|
| Name | `refresh_flat_tables_5min` |
| Repeat frequency | Custom → `every 5 minutes` |
| Start | now, no end date |
| Region | `US` (auto-picked from dataset) |
| Destination | leave blank (CALL has no result destination) |
| Service account | default BQ scheduled-queries SA |
| Send email notifications on failure | **Yes** |

Save. View later under BigQuery Studio → **Scheduled queries** in left nav.

---

## Step 6 — Verify end-to-end

In BigQuery Studio:

```sql
-- Wait one 5-min cycle after Step 5, then:
SELECT COUNT(*) FROM `weeklyfifty_analytics.users_flat`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.quizzes_flat`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.quiz_results_flat`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.quiz_answers_flat`;

-- Replace 123 with a real quizId for the project:
CALL `weeklyfifty_analytics.sp_quiz_summary`('123');
```

All counts > 0; the CALL returns rows in the Results pane.

**HTTP endpoint check** (assuming Cloud Functions deployed against the project):

```
GET https://<region>-<project>.cloudfunctions.net/api/quizStats/123
```

Should return non-empty JSON. The BigQuery client in `functions/src/index.ts:50-59` initialises with no explicit `projectId`, so it picks up the runtime project — correct as long as functions are deployed in the matching Firebase project.

---

## Step 7 — Repeat for prod

Switch project selector in both consoles to `weeklyfifty-7617b` and walk Steps 1–6 again. Same locations (`us-central1` / `US`), same dataset name, same extension config. Backfill will be much larger.

---

## What this does NOT cover

- Branch merge of `BQconvert` → `dev` → `master` (separate task in `TODO.md`).
- Cloud Functions deployment (handled by existing GitHub Actions CI).
- PostHog or Firebase Analytics setup (independent stacks).
- Cost monitoring — set up BigQuery billing alerts in GCP Console → Billing → Budgets after first prod month.

## Files referenced

- `sql/bigquery/tables/users_flat.sql` — sourced from `users_raw_latest`, mirrors `AppUser` shape (`src/app/shared/models/user.model.ts`)
- `sql/bigquery/tables/quizzes_flat.sql` — sourced from `quizzes_raw_latest`
- `sql/bigquery/tables/quiz_results_flat.sql` — sourced from `quiz_results_raw_latest`, joins `quizzes_flat`
- `sql/bigquery/tables/quiz_answers_flat.sql` — derived from `quiz_results_flat` × `quizzes_flat`
- `sql/bigquery/procedures/*.sql` — quiz/user-stats stored procedures
- `sql/bigquery/procedures/sp_refresh_flat_tables.sql` — called by the scheduled query (rebuilds all four flat tables)
- `functions/scripts/deploy-bq.ts` — `BQ_PROJECT_ID` / `BQ_LOCATION` env overrides
- `functions/package.json` — `npm run deploy:bq`
- `functions/src/index.ts` — runtime BigQuery endpoints (`/api/quizStats/:quizId` etc.)
- `.firebaserc` — `dev` / `prod` project aliases
