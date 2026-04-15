# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server (ng serve)
npm run build      # Production build
npm test           # Unit tests (Karma/Jasmine)
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

Guards: `authGuard` (requires authenticated non-anon user), `adminGuard` (requires `isAdmin`).

### State Management

No NgRx — service-based reactive pattern using **RxJS BehaviorSubjects**. Services hold state and expose observables; components subscribe and react. `AuthService` is the root source of truth for user state (`user$`, `isMember$`, `isAdmin$`, `initialized$`).

### Firestore Access Pattern

Use `@angular/fire` (`collectionData`, `docData`) for real-time streams. Rules enforce roles:
- `isAdmin()` — checks `users/{uid}.isAdmin == true`
- `isMember(uid)` — checks `users/{uid}.isMember == true`
- Write access on sensitive collections (payments, userEvents, quizAccess) is Cloud Functions only.

### Key Models

| Model | Key fields |
|-------|-----------|
| `AppUser` | uid, isAdmin, isMember, isAnon, followers[], following[] |
| `Quiz` | quizId (numeric), quizType (1=Weekly/2=FiftyPlus/3=Collab/4=Question), questions[], isPremium |
| `QuizResult` | quizId, userId, status, answers[], score, geo |
| `Puzzle` | gameType ('movieEmoji'/'rushHour'), dateKey, isActive |
| `PuzzleResult` | puzzleId, gameType, userId, dateKey, isCorrect, timeTaken |
| `Venue` | location, quizSchedules[], isActive |

### Angular Patterns

- **Standalone components only** — no NgModules.
- **Control flow**: use `@if`/`@for`/`@switch` (not `*ngIf`/`*ngFor`).
- Lazy loading via `loadComponent` on game and admin-game routes.
- OnPush change detection used in performance-sensitive components (games-hub, etc.).

## Code Style

**Prettier** (`.prettierrc.json`): 4-space indent, single quotes, semicolons, trailing commas off, print width 250.

**ESLint**: flat config, component selector prefix `p` (kebab-case), `no-console` off, `prefer-const` off, `any` types allowed.

Run `npm run format` before committing to avoid lint noise.

## Firebase

Project ID: `weeklyfifty-7617b`. Config lives in `src/app/app.config.ts`.

Cloud Functions (`functions/src/index.ts`) handle: Stripe payments, IP geolocation (MaxMind GeoLite2), quiz access grants, and event logging. Do not replicate this logic client-side.
