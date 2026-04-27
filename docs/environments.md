# Environments + CI/CD

How environments are wired across this repo, and how to deploy.

## Firebase projects

| Alias | Project ID | Use |
|-------|-----------|-----|
| `dev` | `weeklyfifty-dev` | Development + staging. Auto-deployed from the `dev` branch. |
| `prod` | `weeklyfifty-7617b` | Production. Deployed from the `master` branch with manual approval. |

Aliases live in `.firebaserc`. Switch locally with:

```bash
firebase use dev    # target dev
firebase use prod   # target prod
firebase use        # see current
```

## Branch → environment mapping

| Branch | Trigger | Target | Approval |
|--------|---------|--------|----------|
| Any PR to `dev` or `master` | PR open / push | — (build only) | None |
| Push to `dev` | Auto | `weeklyfifty-dev` | None |
| Push to `master` | Auto | `weeklyfifty-7617b` | **Manual reviewer** |

Workflow files live in `.github/workflows/`:
- `pr-checks.yml` — runs lint + type-check + build for every PR.
- `deploy-dev.yml` — deploys to dev on push to `dev`.
- `deploy-prod.yml` — deploys to prod on push to `master`, gated by the GitHub `production` environment.

## Local dev

Two paths:

### Pure local (Firebase emulators)

Fastest, free. Doesn't touch any hosted Firebase project.

```bash
firebase emulators:start
npm start
```

Auth, Firestore, Functions, Hosting all run locally on the ports defined in `firebase.json`.

### Local against dev Firebase project

For RevenueCat, real Auth providers, deployed Cloud Functions:

```bash
firebase use dev
npm start    # or npx ng serve --configuration dev-deploy if you want optimized build
```

`environment.ts` should hold your dev project's web config + RevenueCat sandbox key + dev Stripe test key. **Never commit it** — the file is gitignored.

## Secrets in GitHub

Set these on the GitHub repo (`TheWeeklyFifty/weeklyFiftyWeb`) in **Settings → Secrets and variables → Actions**:

| Secret | Value | Used by |
|--------|-------|---------|
| `ENVIRONMENT_TS_DEV` | Full contents of the dev `environment.ts` file (with real dev keys) | `deploy-dev.yml` |
| `ENVIRONMENT_TS_PROD` | Full contents of the prod `environment.prod.ts` file (with real prod keys) | `deploy-prod.yml` |
| `FIREBASE_SERVICE_ACCOUNT_DEV` | Service account JSON key for dev project (Firebase Admin + Cloud Functions Developer) | `deploy-dev.yml` |
| `FIREBASE_SERVICE_ACCOUNT_PROD` | Service account JSON key for prod project | `deploy-prod.yml` |

To generate service account JSON keys: Firebase console → Project Settings → Service accounts → Generate new private key. Or in GCP IAM directly.

## Secrets in Cloud Functions

Functions read secrets via Firebase Functions config or Google Secret Manager (current code uses both). Per-env values are set on each Firebase project independently:

```bash
# Dev
firebase use dev
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Prod
firebase use prod
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

(Same keys, different values per env.)

## GitHub `production` environment setup

In the GitHub repo (`TheWeeklyFifty/weeklyFiftyWeb`): **Settings → Environments → New environment → `production`**, then:

- Required reviewers: add yourself
- Deployment branches: restrict to `master`

This makes every prod deploy pause until you approve from the Actions UI.

For the dev environment (`development`), no protection rule is needed — it auto-deploys.

## Manual deploys (escape hatch)

If CI is broken or you need to ship something fast:

```bash
firebase use dev    # or prod
npx ng build --configuration dev-deploy   # or production for prod
cd functions && npm run build && cd ..
firebase deploy --only hosting,functions,firestore,storage
```

Manual deploys bypass the approval gate — use sparingly, especially for prod.

## BigQuery (when `BQconvert` lands)

`BQconvert` introduces `functions/scripts/deploy-bq.ts` for deploying flat tables + stored procedures. **When that branch merges, update the script to be env-aware** — read the target GCP project from `firebase use` (the alias resolves via `.firebaserc`) or from a `--project` CLI arg, defaulting to `dev`. Never hardcode a project ID.

Each Firebase project gets its own GCP project, so each env has isolated BQ datasets, billing, and IAM.

## Common gotchas

- **Building locally fails with "cannot find environment.prod.ts"** — your local checkout is missing the file. Either copy `environment.example.ts` to it (with placeholder values) or pull the real values from your password manager. The file is gitignored.
- **Deploy succeeds but app shows blank screen / wrong data** — almost always a wrong env file in CI secret. Verify the secret matches the target project's web config.
- **RevenueCat shows production charges in dev** — you used the prod RC key in the dev `environment.ts`. RC sandbox vs production are separate dashboards with separate keys.
- **Functions deploy fails with permission error** — the service account is missing the Cloud Functions Developer (or Editor) role on the GCP project.
- **Firestore rules deploy succeeded but app behaviour didn't change** — make sure you're targeting the right project (`firebase use` shows current); rules deploy per-project.

## Rollback

- **Hosting**: every deploy creates a new release; revert from Firebase console → Hosting → Release history.
- **Functions**: redeploy the previous git commit.
- **Firestore rules / indexes**: kept under git history — checkout the previous version of `firestore.rules` / `firestore.indexes.json` and redeploy.
- **Firestore data**: restore from a Firestore export (set up scheduled exports as a separate task — currently not configured).
