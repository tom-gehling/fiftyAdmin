# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product context

**The Weekly Fifty** is an Australian quiz brand — core product is a weekly 50-question quiz, plus quiz nights in every AU state, a recent podcast, merch, and a paid Fifty+ member tier. Scale: ~20,000 weekly public quiz players, 15k Instagram, 200+ consecutive weeks, primary demo 18-35 with ~60% female skew.

**Migration status**: a WordPress site currently serves the public weekly quiz (and fetches quiz data from this Angular site's Cloud Functions API). The roadmap is to retire WordPress and move *this* site to the primary URL. `/WPUpgrades/` holds the legacy WP HTML templates that need parity here before cutover. Key blockers: MemberPress→RevenueCat user migration, WooCommerce shop port, public-quiz UX parity (self-marking + team-photo submission), 301 redirect map, historical content import.

**Brand voice**: social, trendy, cool — not corporate SaaS. Public-facing pages must carry that. Prioritise engagement/retention (the product is weekly; daily return is the gap) and revenue breadth (merch, events, B2B — not just subscriptions).

**Stats are first-class.** Every feature must be designed with both an admin-facing analytics surface (insight Tom can act on) and a user-facing stats surface (numbers users return to check). Moving off WordPress to a fully-controlled stack is the chance to own the data layer end-to-end — instrumentation designed in is always richer than instrumentation bolted on. Analytics events, admin tile, and user-facing visualisation should land in the same PR as the feature, not a v2.

**Aggregations live in BigQuery (active work on `BQconvert` branch)** — Firestore stays the OLTP layer; BigQuery is OLAP. Flat tables in `sql/bigquery/tables/`, stored procs in `sql/bigquery/procedures/`, deployment via `functions/scripts/deploy-bq.ts`. New stats features add a stored proc and expose via Cloud Functions API, not a Firestore counter doc (counters only for sub-second-fresh real-time needs).

**Design is first-class.** Public surfaces must clear the bar set by `src/app/pages/public/home.ts` — motion-led, scroll-driven, on-brand. Two distinct palettes (defined at `src/assets/styles.scss:16-18`):
- **Public** pages (home, weekly-quiz, find-a-venue, /join, /fiftyshop) → light/atmospheric. Use `--fifty-green: #677c73` (sage) + `--fifty-pink: #fbe2df` (soft pink).
- **Fifty+ member area + admin** (`/fiftyPlus/*`) → dark mode (`app-dark` class via `LayoutService`). Use `--fifty-neon-green: #4cfbab` for accents (borders, dividers, badges, focus states) on near-black surfaces.

Don't mix the two — the visual shift is part of the "you've earned the member space" experience. Never use raw Tailwind grays / PrimeNG defaults; always go through the tokens. Always honour `prefers-reduced-motion`. Run a deliberate design pass during the build, not as a polish step.

## Commands

```bash
npm start          # Dev server (ng serve)
npm run build      # Production build
npm test           # Unit tests (Karma/Jasmine) — no spec files exist yet
npm run format     # Prettier format all files
```

No single-test command is configured — use `ng test --include=path/to/spec.ts` if needed.

## Architecture

**The Weekly Fifty** — a quiz/game SaaS platform with membership tiers (free, member, admin), daily games, archived quizzes, venue discovery, and admin analytics.

**Stack**: Angular 20 standalone components, TypeScript 5.8 strict, Firebase (Auth/Firestore/Storage/Analytics), PrimeNG 20, Tailwind CSS 4, RxJS 7.8.

### Route Structure

All authenticated routes live under `AppLayout`. Key prefixes:
- `/` — public pages (home, weekly-quiz, find-a-venue, login, signup)
- `/fiftyPlus/*` — member area (dashboard, archives, exclusives, collabs, questionQuizzes, games)
- `/fiftyPlus/admin/*` — admin-only (stats, quizzes, venues, users, games)
- Games are lazy-loaded under `/fiftyPlus/games/*` (makeTen, chainGame, movieEmoji, rushHour, countryJumble, tileRun)

Guards: `authGuard` (requires authenticated non-anon user), `adminGuard` (requires `isAdmin`). Both use a `filter + take + switchMap` pattern to wait for Firebase initialization before evaluating. No interceptors or resolvers exist.

### State Management

No NgRx — service-based reactive pattern using **RxJS BehaviorSubjects**. Services hold state and expose observables; components subscribe and react. `AuthService` is the root source of truth for user state (`user$`, `isMember$`, `isAdmin$`, `initialized$`).

**LayoutService** is the exception — it uses Angular **signals** (`signal()`, `computed()`, `effect()`) to manage dark mode (with View Transitions API), sidebar state, and theme customization. Don't mix BehaviorSubject patterns into LayoutService.

### Firestore Access Pattern

Use `@angular/fire` (`collectionData`, `docData`) for real-time streams. Rules enforce roles:
- `isAdmin()` — checks `users/{uid}.isAdmin == true`
- `isMember(uid)` — checks `users/{uid}.isMember == true`
- Write access on sensitive collections (payments, userEvents, quizAccess) is Cloud Functions only.

**Subcollections in use**:
- `users/{uid}/following/{followedUid}`, `users/{uid}/followers/{followerUid}`
- `users/{uid}/quizSessions/{sessionId}/events/{eventId}`
- `admins/{sanitized_email}` — admin email with `.` and `@` replaced by `_`

**Soft-delete pattern**: Venues, tags use `isActive`/`deletionTime`/`deletionUser` fields rather than hard deletes.

**Batch limits**: Firestore `in` queries are capped at 30 items; `UserSearchService` handles batching.

**Timestamp handling**: Always call `.toDate()` on Firestore Timestamps before use; services handle conversion before emitting.

### Key Models

| Model | Key fields |
|-------|-----------|
| `AppUser` | uid, isAdmin, isMember, isAnon, followers[], following[] |
| `Quiz` | quizId (numeric), quizType (1=Weekly/2=FiftyPlus/3=Collab/4=Question), questions[], isPremium |
| `QuizResult` | quizId, userId, status, answers[], score, geo |
| `Puzzle` | gameType ('movieEmoji'/'rushHour'), dateKey, isActive |
| `PuzzleResult` | puzzleId, gameType, userId, dateKey, isCorrect, timeTaken |
| `Venue` | location, quizSchedules[], isActive |

### Key Services

| Service | Responsibility |
|---------|---------------|
| `AuthService` | User state source of truth |
| `LayoutService` | Dark mode, sidebar, theme (signals-based) |
| `QuizzesService` | Quiz CRUD, filtering, lazy-loading via `defer()` |
| `QuizResultsService` | User attempts, retro results, tagged teammates |
| `QuizSessionsService` | Per-question session state, subcollection events |
| `QuizStatsService` | Aggregates from both Cloud Functions API and Firestore |
| `SubscriptionService` | Stripe via Cloud Functions callables only |
| `StorageService` | Firebase Storage uploads for quiz/venue images |
| `GoogleMapsService` | Dynamic script loading, Places Autocomplete, geocoding |
| `QuizPdfService` | Multi-page PDF generation via jsPDF |
| `NotifyService` | Wraps PrimeNG MessageService for toasts |
| `AuthModalService` | BehaviorSubject modal state (`visible$`, `mode$`) |
| `VenueService` | Venue CRUD with schedule types (weekly/biweekly/monthly/custom) |
| `UserSearchService` | Search within followers/following networks |
| `AdminService` | Admin management; sanitizes emails for `admins/` collection |
| `ContactFormService` | Uses `isDevMode()` to switch emulator vs. production endpoint |

### Stripe / Payment Flow

All payment logic lives in Cloud Functions — never replicate client-side:
- `createSubscriptionIntent(priceId)` → returns `clientSecret` + `subscriptionId` for Stripe Payment Element
- `createPortalSession(returnUrl)` → Stripe Customer Portal URL
- `adminCancelSubscription`, `adminRefundPayment`, `adminGrantGuestAccess` — admin overrides
- Price tiers (basic/standard/gold, quarterly/yearly) defined in `functions/src/stripe-config.ts`

### Cloud Functions API Routes

The Express app exported as `api` exposes these HTTP endpoints (all under `/api/`):
- `getLatestQuiz`, `getLatestCollabQuiz`, `getQuizArchiveHeaders`, `getQuizByQuizId`, `getQuizByQuizSlug`
- `quizStats/:quizId`, `quizLocationStats/:quizId`
- `logQuizStart`, `logQuizFinish`, `logFiftyPlusQuizStart`, `logFiftyPlusQuizFinish`
- `updateUserEmail`, `getVenues`, `submitContactForm`

Firestore triggers: `quizStarted` (`onDocumentCreated`), `quizFinished` (`onDocumentUpdated`).

### Angular Patterns

- **Standalone components only** — no NgModules.
- **Control flow**: use `@if`/`@for`/`@switch` (not `*ngIf`/`*ngFor`).
- Lazy loading via `loadComponent` on game and admin-game routes.
- OnPush change detection used in performance-sensitive components (games-hub, etc.).
- Use `firstValueFrom()` to convert Observables to Promises when calling Cloud Functions.

## Code Style

**Prettier** (`.prettierrc.json`): 4-space indent, single quotes, semicolons, trailing commas off, print width 250.

**ESLint**: flat config, component selector prefix `p` (kebab-case), `no-console` off, `prefer-const` off, `any` types allowed.

Run `npm run format` before committing to avoid lint noise.

## Firebase

Project ID: `weeklyfifty-7617b`. Config lives in `src/app/app.config.ts`.

Environment files are in `src/environments/` (`environment.ts` is gitignored; use `environment.example.ts` as template). Key env vars: `googleMapsApiKey`, `stripePublishableKey`, `functionsBaseUrl`.

Cloud Functions (`functions/src/index.ts`) handle: Stripe payments, IP geolocation (MaxMind GeoLite2), quiz access grants, and event logging. Do not replicate this logic client-side.
