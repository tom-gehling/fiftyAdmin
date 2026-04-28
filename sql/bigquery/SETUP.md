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
- Extension instance A — collection `quizResults`, table prefix `quiz_results`
- Extension instance B — collection `quizzes`, table prefix `quizzes`

---

## Step 0 — Verify current state

**Firebase Console** → switch to the target project (top-left switcher).

- [ ] Build → **Extensions** — list any installed `firestore-bigquery-export` instances (none expected on first run).
- [ ] Build → **Firestore** — confirm `quizResults` and `quizzes` collections exist.

Direct URLs:
- Dev extensions: https://console.firebase.google.com/project/weeklyfifty-dev/extensions
- Prod extensions: https://console.firebase.google.com/project/weeklyfifty-7617b/extensions

**BigQuery Console** → https://console.cloud.google.com/bigquery, switch project (top bar).

- [ ] Expand the project in **Explorer** — note whether `weeklyfifty_analytics` exists.
- [ ] If it exists, expand it and list which of these are present: `quiz_results_raw_latest`, `quiz_results_raw_changelog`, `quizzes_raw_latest`, `quizzes_raw_changelog`, `quiz_results_flat`, `quizzes_flat`, `quiz_answers_flat`.

Outcomes:
- Nothing exists → run all steps below.
- Extensions installed but no flat tables → skip to Step 4.
- Everything exists → skip to Step 6 (verify).

---

## Step 1 — Install the two extension instances

Firebase Console → **Extensions** → **Explore Hub** → search **"Stream Firestore to BigQuery"** (publisher: Firebase) → **Install in Firebase console**.

Pre-install: Firebase will require Blaze plan + enabling BigQuery API + granting IAM roles. Click through.

### Instance A — `quizResults`

| Field | Value |
|---|---|
| Cloud Functions location | `us-central1` |
| BigQuery Dataset location | `US` |
| Collection path | `quizResults` |
| Enable Wildcard Column field with Parent Firestore Document IDs | `No` |
| Dataset ID | `weeklyfifty_analytics` |
| Table ID | `quiz_results` |
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

### Instance B — `quizzes`

Click **Install another instance**. Same form, same values, **except**:

- Collection path: `quizzes`
- Table ID: `quizzes`

After both finish, BigQuery Explorer should show `weeklyfifty_analytics` with four objects: `quiz_results_raw_changelog`, `quiz_results_raw_latest`, `quizzes_raw_changelog`, `quizzes_raw_latest`.

---

## Step 2 — Backfill historical Firestore data

The extension only captures *new* writes. To pull existing docs in:

**Option A — in-console backfill (if available):** Firebase Console → Extensions → click the installed instance → look for a **Run backfill** button on the detail page. If it's there, run it for both instances and watch the Cloud Run job in **GCP Console → Cloud Run**.

**Option B — CLI (one-off):**

```bash
npx @firebaseextensions/fs-bq-import-collection \
  --non-interactive \
  --project=weeklyfifty-dev \
  --source-collection-path=quizResults \
  --dataset=weeklyfifty_analytics \
  --table-name-prefix=quiz_results \
  --dataset-location=US \
  --multi-threaded=true

npx @firebaseextensions/fs-bq-import-collection \
  --non-interactive \
  --project=weeklyfifty-dev \
  --source-collection-path=quizzes \
  --dataset=weeklyfifty_analytics \
  --table-name-prefix=quizzes \
  --dataset-location=US \
  --multi-threaded=true
```

Verify in BigQuery Studio:

```sql
SELECT COUNT(*) FROM `weeklyfifty_analytics.quiz_results_raw_latest`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.quizzes_raw_latest`;
```

Prod backfill is large (200+ weeks × 20k weekly users) — run during a quiet window, expect minutes-to-hours. Can pass `--batch-size=300`.

---

## Step 3 — Confirm `_raw_latest` views exist

In BigQuery Explorer, expand `weeklyfifty_analytics`. All four expected:

- `quiz_results_raw_changelog` (table)
- `quiz_results_raw_latest` (view)
- `quizzes_raw_changelog` (table)
- `quizzes_raw_latest` (view)

If a `_raw_latest` view is missing (older extension version), regenerate it:

```bash
npx @firebaseextensions/fs-bq-schema-views \
  --non-interactive \
  --project=weeklyfifty-dev \
  --dataset=weeklyfifty_analytics \
  --table-name-prefix=quiz_results
```

Repeat for `quizzes`.

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

1. `sql/bigquery/tables/quizzes_flat.sql`
2. `sql/bigquery/tables/quiz_results_flat.sql`
3. `sql/bigquery/tables/quiz_answers_flat.sql`
4. All files in `sql/bigquery/procedures/` (any order — independent)

After deploy, Explorer should show three flat tables and the procedures under **Routines**.

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
SELECT COUNT(*) FROM `weeklyfifty_analytics.quiz_results_flat`;
SELECT COUNT(*) FROM `weeklyfifty_analytics.quizzes_flat`;
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

- `sql/bigquery/tables/*.sql` — flat-table DDL (sourced from extension `*_raw_latest` views)
- `sql/bigquery/procedures/*.sql` — quiz/user-stats stored procedures
- `sql/bigquery/procedures/sp_refresh_flat_tables.sql` — called by the scheduled query
- `functions/scripts/deploy-bq.ts` — `BQ_PROJECT_ID` / `BQ_LOCATION` env overrides
- `functions/package.json` — `npm run deploy:bq`
- `functions/src/index.ts` — runtime BigQuery endpoints (`/api/quizStats/:quizId` etc.)
- `.firebaserc` — `dev` / `prod` project aliases
