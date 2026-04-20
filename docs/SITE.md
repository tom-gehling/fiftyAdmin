# The Weekly Fifty — Site Documentation

A top-to-bottom reference for the `fiftyAdmin` Angular application. Covers the stack, repository layout, routing, styling, every page, shared components, services, data models, and the Firebase/Cloud Functions surface. Read linearly to rebuild a complete mental model of the app, or jump to a section via the table of contents.

---

## Table of contents

1. [Overview](#1-overview)
2. [Stack](#2-stack)
3. [Repository layout](#3-repository-layout)
4. [Routing & guards](#4-routing--guards)
5. [Styling & theming](#5-styling--theming)
6. [Layout chrome](#6-layout-chrome)
7. [Pages — deep dive](#7-pages--deep-dive)
8. [Shared components catalog](#8-shared-components-catalog)
9. [Services reference](#9-services-reference)
10. [Data models](#10-data-models)
11. [Firebase & Cloud Functions](#11-firebase--cloud-functions)
12. [Development workflows](#12-development-workflows)

---

## 1. Overview

**The Weekly Fifty** is a quiz/game SaaS platform. Users can:

- Play the free **Weekly Quiz** (public, refreshed weekly).
- Subscribe to **Fifty+** for access to archives, exclusives, collab quizzes, and question-style quizzes.
- Discover pub quiz **venues** on an interactive map.
- Submit scores, tag teammates, and see themselves on the dashboard.
- Access a **profile**, follower/following network, and billing portal.

**Admins** additionally manage quizzes, tags, venues, submission forms, users, and contact-form submissions — all from inside the same app shell under `/fiftyPlus/admin/*`.

### Membership tiers

| Tier | Grants |
|---|---|
| **Anonymous / Free** | Home, weekly quiz, find a venue, contact, signup, login. Can view Fifty+ pages but content is blurred behind a lock overlay. |
| **Member** (`isMember: true`) | Full Fifty+ (archives, exclusives, collabs, question quizzes), dashboard widgets (user summary, quiz history), profile billing portal. |
| **Admin** (`isAdmin: true`) | Everything above, plus the entire `/fiftyPlus/admin/*` area. |

### Architecture

```
┌──────────────────────┐        ┌──────────────────────────────┐
│  Browser (Angular)   │◀──────▶│  Firebase Auth (email/Google │
│  standalone, PrimeNG │        │                       /Apple)│
│  Tailwind 4, Signals │        └──────────────────────────────┘
│  RxJS services       │                 ▲         ▲
└──────────┬───────────┘                 │         │
           │                             │         │
           │  real-time Firestore        │         │
           │  (collectionData/docData)   │         │
           ▼                             │         │
┌──────────────────────┐        ┌────────┴─────────┴───────────┐
│  Firestore (quizzes, │        │ Cloud Functions (api Express │
│  users, venues,      │◀──────▶│ + Firestore triggers +       │
│  quizResults, tags,  │        │ Stripe callables +           │
│  submissionForms)    │        │ IP geolocation / MaxMind)    │
└──────────────────────┘        └──────────────────────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────┐
                            │ Stripe (subscriptions,   │
                            │ customer portal, refunds)│
                            └──────────────────────────┘
```

Client-side never touches payment logic directly — every Stripe action is proxied through a Cloud Functions callable.

---

## 2. Stack

### Frontend

- **Angular 20** — standalone components only, no NgModules. Uses new control-flow (`@if`, `@for`, `@switch`) and `loadComponent` where lazy loading applies. `OnPush` detection in performance-sensitive components.
- **TypeScript 5.8** (strict).
- **PrimeNG 20** — UI library (buttons, tables, dialogs, tabs, OrderList, SpeedDial, etc.). Themed via `@primeuix/themes` v1.2.1 with the **Aura** preset.
- **Tailwind CSS 4.1** via `@tailwindcss/postcss` — utility-first classes, bridged to PrimeNG tokens via the `tailwindcss-primeui` plugin.
- **RxJS 7.8** — primary reactive primitive for services (BehaviorSubjects).
- **Angular Signals** — used exclusively inside `LayoutService` for UI chrome state (dark mode, menu, theme config). Not mixed with BehaviorSubjects.

### Backend

- **Firebase** project `weeklyfifty-7617b`:
  - **Auth** — email/password, Google, Apple, anonymous.
  - **Firestore** — primary datastore; real-time streams via `@angular/fire`.
  - **Storage** — quiz and venue imagery.
  - **Analytics** — Google Analytics (measurement ID `G-G0GB39G4F3`).
  - **Cloud Functions** — Express `api` router, Firestore triggers, Stripe callables, MaxMind GeoLite2 IP lookups.

### Integrations

- **Stripe** via `ngx-stripe` — Payment Element for checkout; all intent/portal creation through Cloud Functions callables.
- **Google Maps JavaScript API** — venue discovery map, Places Autocomplete, geocoding (lazy-loaded through `GoogleMapsService`).
- **jsPDF** + `jspdf-customfonts` — multi-page quiz PDF generation (`QuizPdfService`).
- **Quill** (via `ngx-quill`) — rich text editor inside the admin quiz editor.
- **Swiper** — touch carousels (used in `contactus.ts` and marketing widgets).
- **Chart.js** + `chartjs-chart-geo` — admin statistics dashboards.
- **Luxon** — date/time handling.
- **XLSX** — spreadsheet export in admin views.

### App bootstrap

Every provider is wired in one place — `src/app.config.ts`:

```ts
// src/app.config.ts
export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            withEnabledBlockingInitialNavigation()
        ),
        provideHttpClient(withFetch()),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        provideFirebaseApp(() => initializeApp({
            projectId: 'weeklyfifty-7617b',
            appId: '1:826354289266:web:67f1a0dcad32a87f2010eb',
            storageBucket: 'weeklyfifty-7617b.firebasestorage.app',
            apiKey: 'AIzaSyCAXtKw-nTmIWPHDc1U4OLfGmdLH0o73Ls',
            authDomain: 'weeklyfifty-7617b.firebaseapp.com',
            messagingSenderId: '826354289266',
            measurementId: 'G-G0GB39G4F3',
        })),
        provideStorage(() => getStorage()),
        provideAnalytics(() => getAnalytics()),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore()),
        provideFunctions(() => getFunctions()),
        provideNgxStripe(environment.stripePublishableKey),
        DialogService,
        MessageService
    ]
};
```

### Key `package.json` versions

| Package | Version |
|---|---|
| `@angular/core`, `@angular/router`, `@angular/forms` | `^20` |
| `@angular/fire` | `^20.0.1` |
| `@angular/cdk` | `^20.2.3` |
| `primeng` | `^20` |
| `@primeuix/themes` | `^1.2.1` |
| `@tailwindcss/postcss` / `tailwindcss` | `^4.1.11` |
| `tailwindcss-primeui` | `^0.6.1` |
| `firebase` | `^12.2.1` |
| `ngx-stripe` | `^20.8.0` |
| `ngx-quill` | `^28.0.1` |
| `chart.js` | `4.4.2` |
| `swiper` | `^12.0.1` |
| `jspdf` | `^4.1.0` |
| `luxon` | `^3.7.2` |
| `rxjs` | `~7.8.2` |
| `typescript` | `~5.8.3` |

---

## 3. Repository layout

```
fiftyAdmin/
├── src/
│   ├── app.config.ts              # ApplicationConfig with all providers
│   ├── app.routes.ts              # All routes (no lazy routing file today)
│   ├── index.html                 # <link rel> for Lato font
│   ├── main.ts                    # bootstrapApplication(App, appConfig)
│   ├── app/
│   │   ├── layout/
│   │   │   ├── component/         # AppLayout, AppTopbar, AppSidebar, AppMenu,
│   │   │   │                      # AppMenuitem, AppFooter, AppConfigurator,
│   │   │   │                      # AppFloatingConfigurator, PublicLayout
│   │   │   └── service/layout.service.ts
│   │   ├── pages/
│   │   │   ├── public/            # home, landing, quiz, findavenue, contactus,
│   │   │   │                      # fiftyshop, join/, components/
│   │   │   ├── auth/              # login.ts (+ unused Sakai starter files)
│   │   │   ├── profile/           # profile.ts
│   │   │   ├── dashboard/         # dashboard.ts, totalStats.ts, weeklyStats.ts,
│   │   │   │                      # statsDashboard.ts, components/ (15 widgets)
│   │   │   ├── fiftyPlus/         # fiftyPage.ts, fiftyLayout.ts
│   │   │   ├── admin/             # quiz/, quizTags/, venues/, submissionForms/,
│   │   │   │                      # users/, contactForms/
│   │   │   ├── common/            # quiz-display, quizTemplate, quizCollection,
│   │   │   │                      # question, retroQuizResult, userTagSelector
│   │   │   └── notfound/          # notfound.ts
│   │   └── shared/
│   │       ├── services/          # 20 services (see §9)
│   │       ├── guards/            # authGuard.ts, adminGuard.ts
│   │       ├── models/            # TypeScript interfaces for Firestore docs
│   │       ├── enums/             # QuizTypeEnum
│   │       └── components/        # auth-modal/
│   ├── assets/
│   │   ├── tailwind.css           # Tailwind entry, @custom-variant dark, @theme
│   │   ├── styles.scss            # Brand CSS vars, global overrides
│   │   ├── layout/                # SCSS partials for layout chrome
│   │   │   ├── layout.scss
│   │   │   ├── variables/         # _common.scss, _light.scss, _dark.scss
│   │   │   ├── _core.scss
│   │   │   ├── _typography.scss
│   │   │   ├── _main.scss
│   │   │   ├── _topbar.scss
│   │   │   ├── _menu.scss
│   │   │   ├── _footer.scss
│   │   │   ├── _responsive.scss
│   │   │   ├── _utils.scss
│   │   │   ├── _mixins.scss
│   │   │   └── _preloading.scss
│   │   ├── demo/                  # Sakai demo styles (mostly unused)
│   │   ├── logos/                 # Fifty+ brand logos (home page wall)
│   │   └── submissions/           # Sample submission photos (home page strips)
│   └── environments/
│       ├── environment.example.ts # template (googleMapsApiKey, etc.)
│       ├── environment.ts         # gitignored — real secrets
│       └── environment.prod.ts
├── functions/                     # Cloud Functions (Express api + triggers)
├── CLAUDE.md                      # Terse Claude-facing guidance
├── docs/
│   └── SITE.md                    # This file
└── package.json
```

### Unused / template leftovers

Several files from the Sakai PrimeNG starter template remain in `src/app/pages/` but are **not routed or imported** by the app:

- `pages/auth/access.ts`, `pages/auth/error.ts`, `pages/auth/auth.routes.ts`
- `pages/crud/crud.ts`, `pages/empty/empty.ts`
- `pages/uikit/**` (`buttondemo.ts`, `chartdemo.ts`, `formlayoutdemo.ts`, etc.)
- `pages/service/**` (`country.service.ts`, `customer.service.ts`, demo data)
- `assets/demo/**` styles

Safe to ignore when exploring the live app. They're kept so the template's UI kit sink is available as a reference.

---

## 4. Routing & guards

### Route tree

All routes are defined in `src/app.routes.ts`. There is no per-area routing file — it's a single flat array with nested `children`.

```
/                       → redirect /home
/home                   HomePage            (standalone, no layout)
/login                  Login               (standalone)
/signup                 Landing             (standalone)

/   (PublicLayout children, topbarColor from data)
  weekly-quiz           WeeklyQuizPage      topbar: green
  find-a-venue          FindAVenuePage      topbar: green
  fiftyshop             FiftyShopPage       topbar: green
  contact-us            ContactUsPage       topbar: green
  join                  JoinPage            topbar: black
  join/success          JoinSuccessPage     topbar: black
  profile               ProfilePage         topbar: black   [AuthGuard]
  profile/:userId       ProfilePage         topbar: black   [AuthGuard]

/checkout               Landing (placeholder)               [AuthGuard]
/checkout/cart          Landing (placeholder)

/   (AppLayout children, topbar + sidebar)
  fiftyPlus                          Dashboard
  fiftyPlus/archives                 FiftyPageComponent  data.type: 1
  fiftyPlus/archives/:quizid         FiftyPageComponent  data.type: 1
  fiftyPlus/exclusives               FiftyPageComponent  data.type: 2
  fiftyPlus/exclusives/:quizid       FiftyPageComponent  data.type: 2
  fiftyPlus/collabs                  FiftyPageComponent  data.type: 3
  fiftyPlus/collabs/:quizid          FiftyPageComponent  data.type: 3
  fiftyPlus/questionQuizzes          FiftyPageComponent  data.type: 4
  fiftyPlus/questionQuizzes/:quizid  FiftyPageComponent  data.type: 4

  fiftyPlus/admin/**                                        [AdminGuard]
    stats                (redirect to total)
    stats/total                      TotalStats
    stats/weekly                     WeeklyStats
    quizzes                          QuizTableComponent
    quizzes/:id                      QuizDetailComponent
    quizTags                         QuizTagsComponent
    venues                           VenuesComponent
    submissionForms                  SubmissionFormTableComponent
    submissionForms/:id              SubmissionFormDetailComponent
    users                            UserTableComponent
    contactForms                     ContactFormTableComponent

/notfound               Notfound
/**                     → redirect /notfound
```

### Layout wrappers

Three wrappers are used:

1. **Standalone** — `home`, `login`, `signup`/`landing`, `join`, `join/success`, `notfound`. The component renders its own chrome (or none).
2. **`PublicLayout`** — thin wrapper over `AppTopbar`. `topbarColor` comes from route `data` (`'green'` or `'black'`). Used for public pages plus `/profile`.
3. **`AppLayout`** — full authenticated shell (topbar, sidebar, footer, router outlet). Wraps all `/fiftyPlus/*` content — both member and admin.

Because Angular 20 standalone doesn't use NgModules, the layout choice is made by the shape of the routes array: each child route inherits the parent's component.

### Guards

Two guards live in `src/app/shared/guards/` and share the same pattern: wait for Firebase to initialize, then take one snapshot of the relevant stream.

```ts
// src/app/shared/guards/authGuard.ts
canActivate(): Observable<boolean> {
    return this.auth.initialized$.pipe(
        filter(init => init),
        take(1),
        switchMap(() => this.auth.user$),
        take(1),
        map(user => {
            const allowed = !!user && !user.isAnon;
            if (!allowed) this.router.navigate(['/login']);
            return allowed;
        })
    );
}
```

```ts
// src/app/shared/guards/adminGuard.ts
canActivate(): Observable<boolean> {
    return this.auth.initialized$.pipe(
        filter(init => init),
        take(1),
        switchMap(() => this.auth.isAdmin$),
        take(1),
        map(isAdmin => {
            if (!isAdmin) this.router.navigate(['/fiftyPlus']);
            return !!isAdmin;
        })
    );
}
```

- **`AuthGuard`** — used only on `/profile`, `/profile/:userId`, and `/checkout`. Rejects anonymous users.
- **`AdminGuard`** — gates the entire `/fiftyPlus/admin/**` subtree.

Member-only content (archives, exclusives, collabs, question quizzes) is **not** guard-protected. The routes are publicly navigable; the content is rendered blurred with a lock overlay (see `FiftyPageComponent`, §7.3). This lets non-members preview the layout and discover the paywall.

### Lazy loading

The current `app.routes.ts` uses **direct component imports** rather than `loadComponent`. No games folder exists in `src/app/pages/` — CLAUDE.md references games under `/fiftyPlus/games/*` (makeTen, chainGame, movieEmoji, rushHour, countryJumble, tileRun), but those routes are not wired in this revision. Treat that bullet as aspirational until the routes + components land.

---

## 5. Styling & theming

### Tailwind CSS 4

Tailwind 4 uses PostCSS and a single-file entry (no `tailwind.config.js`).

```json
// .postcssrc.json
{ "plugins": { "@tailwindcss/postcss": {} } }
```

```css
/* src/assets/tailwind.css */
@import 'tailwindcss';
@import 'tailwindcss-primeui';
@custom-variant dark (&:where(.app-dark, .app-dark *));

@theme {
    --breakpoint-sm: 576px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 992px;
    --breakpoint-xl: 1200px;
    --breakpoint-2xl: 1920px;
}
```

Key points:
- `tailwindcss-primeui` bridges Tailwind utility classes with PrimeNG design tokens (so `bg-surface-0`, `text-muted-color`, etc. resolve to the active PrimeNG theme).
- `@custom-variant dark` rebinds the `dark:` variant to the `.app-dark` class (not Tailwind's default `prefers-color-scheme`), matching PrimeNG's dark-mode selector.
- Breakpoints are customised: Bootstrap-style 576 / 768 / 992 / 1200 / 1920. 992 is the desktop/mobile pivot used by `LayoutService.isDesktop()`.

### PrimeNG theming

PrimeNG is provided with the Aura preset:

```ts
// src/app.config.ts
providePrimeNG({
    theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } }
})
```

Every PrimeNG component reads colours from the active preset's CSS variables (`--p-primary-color`, `--p-surface-0`, etc.). The brand layer maps these into app-level variables (see below).

Available presets inside `AppConfigurator`: **Aura**, **Lara**, **Nora**. Primary-color palettes: emerald, green, lime, orange, amber, yellow, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, noir (17 total). Surface palettes: slate, gray, zinc, neutral, stone, soho, viva, ocean (8).

### Global styles chain

```
src/assets/styles.scss
├── @use './tailwind.css'
├── @use './layout/layout.scss'
│    ├── @use './variables/_common'    # maps --primary-color, --surface-*, etc.
│    ├── @use './variables/_light'     # light-mode values
│    ├── @use './variables/_dark'      # dark-mode overrides on :root[class*='app-dark']
│    ├── @use './_mixins'
│    ├── @use './_preloading'
│    ├── @use './_core'                # html, body
│    ├── @use './_main'                # .layout-main-container
│    ├── @use './_topbar'
│    ├── @use './_menu'
│    ├── @use './_footer'
│    ├── @use './_responsive'
│    ├── @use './_utils'
│    └── @use './_typography'
├── @use 'primeicons/primeicons.css'
├── @use './demo/demo.scss'            # Sakai template demo — rarely hit
├── @import 'swiper/css'
├── @import 'swiper/css/pagination'
└── @import 'swiper/css/scrollbar'
```

### Brand CSS variables

Defined at the end of `src/assets/styles.scss` (light mode) and overridden under `:root[class*='app-dark']`:

```scss
/* src/assets/styles.scss */
:root {
    --primary-color: #677c73;       /* fifty green */
    --primary-color-text: #ffffff;
    --highlight-bg: #282828;
    --highlight-text-color: #ffffff;

    --fifty-green: #677c73;
    --fifty-pink:  #fbe2df;
    --fifty-neon-green: #4cfbab;
}

:root[class*='app-dark'] {
    --primary-color: #4cfbab;       /* neon green in dark */
    --primary-color-text: #ffffff;
    --highlight-bg: #282828;
    --highlight-text-color: #ffffff;
}

html { background-color: #677c73; }
```

The layout layer adds a few more tokens for per-surface use:

```scss
/* src/assets/layout/variables/_common.scss (excerpt) */
:root {
    --primary-color: var(--p-primary-color);
    --text-color: var(--p-text-color);
    --text-color-secondary: var(--p-text-muted-color);
    --surface-border: var(--p-content-border-color);
    --surface-card: var(--p-content-background);
    --surface-hover: var(--p-content-hover-background);
    --surface-overlay: var(--p-overlay-popover-background);
    --layout-section-transition-duration: 0.2s;
}

/* _light.scss */
:root {
    --surface-ground: var(--p-surface-100);
    --fifty-border:  #677c73;
    --accent-green:  #677c73;
    --accent-green-contrast: #ffffff;
}

/* _dark.scss */
:root[class*='app-dark'] {
    --surface-ground: #282828;
    --fifty-border:  #4cfbab;
    --accent-green:  #4cfbab;
    --accent-green-contrast: #282828;
}
```

This is why components like the dashboard CTA read `style="background: var(--accent-green); color: var(--accent-green-contrast)"` — the colours flip automatically when dark mode toggles.

### Dark mode

Dark mode is driven entirely by the `.app-dark` class on `document.documentElement`. `LayoutService` toggles it and, when supported, routes the toggle through the **View Transitions API** for a cross-fade effect.

```ts
// src/app/layout/service/layout.service.ts:102
private handleDarkModeTransition(config: layoutConfig): void {
    if ((document as any).startViewTransition) {
        this.startViewTransition(config);
    } else {
        this.toggleDarkMode(config);
        this.onTransitionEnd();
    }
}

private startViewTransition(config: layoutConfig): void {
    const transition = (document as any).startViewTransition(() => {
        this.toggleDarkMode(config);
    });
    transition.ready.then(() => this.onTransitionEnd()).catch(() => {});
}

toggleDarkMode(config?: layoutConfig): void {
    const _config = config || this.layoutConfig();
    if (_config.darkTheme) {
        document.documentElement.classList.add('app-dark');
    } else {
        document.documentElement.classList.remove('app-dark');
    }
}
```

Default: `darkTheme: true` in `LayoutService._config`, so the app boots dark.

### Fonts

Lato is loaded from a CDN in `src/index.html`:

```html
<link href="https://fonts.cdnfonts.com/css/lato" rel="stylesheet" />
```

`_core.scss` sets 14 px base size and `font-family: 'Lato', sans-serif`. `_typography.scss` defines heading weights (700) and sizes (h1 2.5 rem through h6 1 rem), with a line-height of 1.5.

### Component styling approach

Mixed. Three patterns show up:

1. **Inline Tailwind classes** (most pages and widgets). Example from the dashboard CTA:
   ```html
   <a routerLink="/join"
      class="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-bold text-xl cursor-pointer no-underline transition-opacity hover:opacity-90"
      style="background: var(--accent-green); color: var(--accent-green-contrast)">
       <i class="pi pi-star text-2xl"></i>
       Become A Fifty+ Member
   </a>
   ```
2. **Scoped CSS/SCSS files** (complex components with many states). Example: `src/app/pages/common/question/question.component.css` uses CSS custom properties driven from the quiz's theme (`--primary`, `--secondary`, `--font`).
3. **Host class strings** (overlay components). Example: `AppConfigurator`'s `host: { class: '...' }` sets an absolutely-positioned surface card with dark-mode variants.

Brand utility classes `.fiftyBorder` and `.fiftyBorderBottom` in `styles.scss` produce a recognisable 5 px offset shadow used on topbars and cards.

### AppConfigurator (user-facing theme switcher)

`src/app/layout/component/app.configurator.ts` is a small floating panel letting the user switch:

- **Primary color** — updates via `@primeuix/themes` `updatePreset(...)`.
- **Surface palette** — updates via `updateSurfacePalette(...)`.
- **Preset** — Aura / Lara / Nora.
- **Menu mode** — `static` vs `overlay`.
- **Dark mode** — flips `layoutConfig().darkTheme` signal.

All mutations flow through `LayoutService.layoutConfig.update(...)`, which fires the `effect()` that re-applies the theme and triggers the view transition.

### Responsive design

- Breakpoints: the five Tailwind values above. `lg: 992 px` is the desktop/mobile switch.
- `LayoutService.isDesktop()` = `window.innerWidth > 991` — used by `onMenuToggle()` to decide between `staticMenuDesktopInactive` (desktop) and `staticMenuMobileActive` / `overlayMenuActive` (mobile).
- Layout SCSS includes `@media screen and (min-width: 1960px)` (max container width) and `@media (min-width: 992px)` (desktop menu behaviour).
- Mobile nav is an overlay drawer; desktop is a static sidebar (collapsible).

### Miscellaneous global tweaks

From `styles.scss`:
- Quill placeholder restyled to match PrimeNG inputs.
- Notes editors default to centre alignment (`.notes-quill .ql-editor`).
- Google Maps autocomplete z-index bumped to 100000 so it sits above PrimeNG dialogs.
- InfoWindow padding removed for a tighter venue popup.
- `.question-tooltip` widened to 90 vw with wrapping text.

---

## 6. Layout chrome

Every layout component lives in `src/app/layout/component/`. The glue is `LayoutService` — signals-based, see below.

### `AppLayout` (`app.layout.ts`)

The main authenticated shell. Composes `AppTopbar` + `AppSidebar` + `<router-outlet>` + `AppFooter`. Listens to `NavigationEnd` events to resolve the current route's `data.topbarColor` and propagate it to the topbar, and to close the mobile menu on every navigation. Background colour and mask transitions come from `_main.scss`.

### `AppTopbar` (`app.topbar.ts`)

Universal header. Two render modes:
- **Public mode** — shows nav links (Home, Weekly Quiz, Fifty+, Find a Venue, Shop, Contact) plus a Login/Register CTA that opens `AuthModalService`.
- **App mode** — shows the hamburger menu toggle (calls `layoutService.onMenuToggle()`), a user avatar/profile menu, and admin shortcut links when `isAdmin$`.

Background is `[style.background-color]="bgColor"` driven by route data (`'green'` → `--fifty-green`; `'black'` → `--highlight-bg`). Uses `.fiftyBorderBottom` for the characteristic offset shadow.

### `AppSidebar` (`app.sidebar.ts`)

Minimal flex column wrapping `AppMenu`. All scrolling / width logic is in `_menu.scss`.

### `AppMenu` (`app.menu.ts`)

Builds the hierarchical menu reactively from auth state. Subscribes to `auth.user$`, `auth.isMember$`, `auth.isAdmin$` and rebuilds the `model` array on any change:

- **Always** — Home, Dashboard.
- **If member** — Fifty+ section (Archives, Exclusives, Collaborations, Question Quizzes).
- **If admin** — Admin section (Stats → Total/Weekly, Quizzes, Tags, Venues, Submission Forms, Users, Contact Forms).

Each entry is rendered recursively via `AppMenuitem`.

### `AppMenuitem` (`app.menuitem.ts`)

Recursive submenu container with Angular animations (`@children` trigger for the expand/collapse). Listens to `router.events` to highlight the active item and `layoutService.menuSource$` to synchronise parent/child active state.

### `AppFooter` (`app.footer.ts`)

Static copyright line with a link to [theweeklyfifty.com](https://theweeklyfifty.com/). Rendered at the bottom of `AppLayout`.

### `AppConfigurator` (`app.configurator.ts`)

Floating theme panel. Styled entirely with Tailwind via its host class — absolute positioning, dark-mode surface overrides, soft shadow. Colour swatches and preset selector drive `layoutService.layoutConfig.update(...)` and then push the change into `@primeuix/themes`.

### `AppFloatingConfigurator` (`app.floatingconfigurator.ts`)

Floating toggle button. Currently has a minimal template — hosts `isDarkTheme` computed from the layout service and exposes a slot for the configurator overlay.

### `PublicLayout` (`public-layout.component.ts`)

Lightweight wrapper used by public pages. Reads `route.firstChild.data.topbarColor` on every `NavigationEnd` and passes it to `AppTopbar`. Renders `<app-topbar [bgColor]="..." />` then `<router-outlet>`. No sidebar, no footer.

### `LayoutService` (`service/layout.service.ts`)

The single source of truth for UI chrome state. Uses Angular signals exclusively:

| Signal | Type | Role |
|---|---|---|
| `layoutConfig` | `{ preset, primary, surface, darkTheme, menuMode }` | Theme + mode selection. Written by `AppConfigurator`. |
| `layoutState` | `{ staticMenuDesktopInactive, overlayMenuActive, configSidebarVisible, staticMenuMobileActive, menuHoverActive }` | Sidebar visibility on desktop/mobile. |
| `transitionComplete` | `boolean` | Flips briefly after `startViewTransition` resolves. |

Computed derivatives: `theme`, `isSidebarActive`, `isDarkTheme`, `getPrimary`, `getSurface`, `isOverlay`.

Event streams (Subjects) for imperative menu/overlay interactions:
- `menuSource$` — when a menu item becomes active (submenus collapse siblings).
- `resetSource$` — clears active state across the menu tree.
- `overlayOpen$` — fires when the mobile overlay menu opens (used for `body` scroll lock).
- `configUpdate$` — fires after every `layoutConfig` write.

Two `effect()` blocks in the constructor wire the signals together: one calls `onConfigUpdate()` on any config change, the other triggers `handleDarkModeTransition()` (skipping the first run to avoid a transition at boot).

---

## 7. Pages — deep dive

Twenty-five routable pages. Each entry below gives: route(s), component file, layout, guard, purpose, composition, data/state flow, template structure, styling notes, and any notable implementation detail.

### 7.1 Public

#### `/home` — Animated hero

- **Component**: `src/app/pages/public/home.ts`
- **Layout**: standalone (no wrapper — the component itself is a full-bleed scroll experience).
- **Guard**: none.

**Purpose** — The marketing entry point. A single sticky 600 vh scroll container narrates five scenes: (1) hero intro, (2) "a fresh fifty every week", (3) Fifty+ unlock, (4) Quiz Nights (video background), (5) Fifty Shop tease.

**Composition** — Everything is inline inside one component. Layers stack absolutely:

1. Scrolling background strip of submission photos (two rows, alternating scroll-left/scroll-right).
2. Logos wall (fades in during scene 3, one logo pulses at a time).
3. Green overlay whose `clip-path` interpolates between 5 preset polygons as the user scrolls.
4. Video layer (`assets/videos/nearly.mp4`) for scene 4.
5. Section overlays with copy and CTAs (`s2Alpha`, `s3Alpha`, `s4Alpha`).

**State & data flow** — Pure local state. On scroll, the component runs `lerp` / `lp` / `toCp` helpers to compute each layer's opacity and the green overlay's `clipPath`. No services.

**Key snippet** (the clip-path presets):

```ts
const CLIP_RIGHT    = [65,0,  100,0, 100,100, 45,100];
const CLIP_LEFT     = [0,0,   35,0,  55,100,  0,100 ];
const CLIP_PEAK     = [0,0,  100,0, 100,100,  0,100 ];
const CLIP_TOP_HALF = [0,0,  100,0, 100,50,   0,50  ];
const CLIP_BOTTOM   = [0,50, 100,50, 100,100, 0,100 ];
```

**Styling** — Heavy custom CSS in the component's stylesheet (sticky scene, absolute overlays, keyframe marquee for submission strips). Uses brand tokens via `background: var(--fifty-green)` overlays.

**Notable** — This is the only page that intentionally fights the default scroll restoration — the long scroll container is the whole interactive surface.

---

#### `/signup` (and fallback for marketing links) — Landing page

- **Component**: `src/app/pages/public/landing.ts`
- **Layout**: standalone (renders its own widgets).
- **Guard**: none.

**Purpose** — Traditional SaaS landing page: hero, features, highlights, pricing, footer. Used as the signup landing surface and as a placeholder for unimplemented pages (currently reached by `/checkout`, `/checkout/cart`, and `/signup`).

**Composition** — Pure widget composition:

```
<topbar-widget />
<hero-widget />
<features-widget />
<highlights-widget />
<pricing-widget />
<footer-widget />
```

Each widget is a standalone component in `src/app/pages/public/components/`.

**State** — None (the page is purely presentational). Auth modal opens from the topbar widget when the user clicks "Login".

**Styling** — Tailwind-first. Each widget owns its own section styling; the page itself is just a flex column of widgets.

---

#### `/weekly-quiz` — Weekly Quiz (public)

- **Component**: `src/app/pages/public/quiz.ts`
- **Layout**: `PublicLayout` (topbar green).
- **Guard**: none — public.

**Purpose** — Plays the currently-active weekly quiz. Anyone can play — no login required.

**Composition** — Wraps `QuizDisplayComponent` (`pages/common/quiz-display/quiz-display.ts`), which renders the question flow, timer, answer capture, and final score view.

**State & data flow** — Subscribes to `QuizzesService.getActiveQuiz()` which streams the single latest weekly quiz from Firestore. Submission goes through `QuizResultsService` (writes to `quizResults`) and, in anonymous mode, logs start/finish through the `/api/logQuizStart` + `/api/logQuizFinish` Cloud Functions endpoints for IP geolocation.

**Template structure** — Full-viewport quiz canvas under the green topbar. The `QuizDisplayComponent` handles all internal layout (progress bar, current question, answer entry, PrimeNG toasts).

**Styling** — Leans on the shared quiz display component's theme overrides (`--primary`, `--secondary`, `--font` are driven from the quiz document's `theme` field).

---

#### `/find-a-venue` — Venue finder

- **Component**: `src/app/pages/public/findavenue.ts`
- **Layout**: `PublicLayout` (topbar green).
- **Guard**: none.

**Purpose** — Discover pub quiz venues on a Google Map with filter/sort/detail.

**Composition** — Two-pane layout:
- **Desktop**: left column is the map (takes full height), right column is a scrollable list of venue cards with a selected-venue detail panel pinned to the top.
- **Mobile**: map on top, list below (no split).

**State & data flow** — `VenueService.getActiveVenues()` streams all venues with `isActive: true`. `GoogleMapsService.init(...)` lazy-loads the Maps JS API, geocodes user location, and places markers. Filters: text search (name/suburb), state dropdown, quiz day multi-select.

**Template structure**:
1. Filter bar (search input, state select, day select, reset button).
2. Map container (`<div #mapContainer>`).
3. Venue list (cards with `venueName`, address, next schedule, call/website icons).
4. Selected venue detail panel (full address, hours, description, directions CTA).

**Styling** — Tailwind grid breakpoints drive the desktop/mobile split. Custom CSS tweaks Google InfoWindow padding and Places autocomplete z-index (see `styles.scss`).

**Notable** — `GoogleMapsService.formatSchedule(...)` converts the `VenueSchedule` union (weekly / biweekly / monthly / custom / one-off) into a human-readable string.

---

#### `/contact-us` — Contact form

- **Component**: `src/app/pages/public/contactus.ts`
- **Layout**: `PublicLayout` (topbar green).
- **Guard**: none.

**Purpose** — Collects general enquiries and routes them to the admin inbox.

**Composition** — Top carousel (PrimeNG Carousel) advertising four service offerings: Quiz Nights, Advertise, Corporate Events, One-off Events. Below, a form captures name, email, mobile, message.

**State & data flow** — On submit, `ContactFormService.submit(form)` either calls the local emulator or the production Cloud Function endpoint depending on `isDevMode()`. Success/error toasts via `NotifyService`.

**Anti-spam** — Includes a honeypot field (hidden, must stay empty) and a minimum fill-duration check (submissions faster than a threshold are silently dropped).

**Styling** — Tailwind card layout; PrimeNG `InputText`, `Textarea`, `Button`, `Carousel`.

---

#### `/fiftyshop` — Shop placeholder

- **Component**: `src/app/pages/public/fiftyshop.ts`
- **Layout**: `PublicLayout` (topbar green).
- **Guard**: none.

**Purpose** — Placeholder for the future Fifty Shop ecommerce flow. Currently renders a large "FIFTY SHOP COMING SOON" banner.

**Notable** — No services; exists only to reserve the route and show intent in the nav.

---

#### `/join` — Fifty+ subscription

- **Component**: `src/app/pages/public/join/join.ts`
- **Layout**: `PublicLayout` (topbar black).
- **Guard**: none — but redirects anonymous users to `/login` internally.

**Purpose** — Purchase flow for Fifty+ membership. Quarterly / yearly toggle, Stripe Payment Element, confirmation on success.

**Composition**:
1. Scrolling logo collage background (same asset set as `/home` and `/login`).
2. Benefits card (bullet list of what Fifty+ unlocks).
3. Billing-period toggle (`quarterly` | `yearly`).
4. Tier selector (basic / standard / gold — mapped to Stripe price IDs in `functions/src/stripe-config.ts`).
5. `<ngx-stripe-payment>` Payment Element bound to a `clientSecret`.
6. Submit button → Stripe confirm → redirect to `/join/success`.

**State & data flow** — On mount, subscribes to `AuthService.user$`. If anonymous → `router.navigate(['/login'])`. Otherwise calls `SubscriptionService.createSubscriptionIntent(priceId)` which hits the `createSubscriptionIntent` Cloud Function and returns `{ clientSecret, subscriptionId }`. On confirm, Stripe handles 3-D Secure and redirects back.

**Styling** — Tailwind two-column layout (benefits on left, checkout on right); Stripe's hosted Payment Element inherits its own styles.

---

#### `/join/success` — Confirmation

- **Component**: `src/app/pages/public/join/join-success.ts`
- **Layout**: `PublicLayout` (topbar black).
- **Guard**: none.

**Purpose** — Brief "welcome to Fifty+" confirmation shown after a successful Stripe return. One big button ("Let's Go!") that routes to the `returnUrl` query param (defaults to `/fiftyPlus`).

---

### 7.2 Auth

#### `/login` (also `/signup` via alias) — Unified sign-in / register

- **Component**: `src/app/pages/auth/login.ts`
- **Layout**: standalone.
- **Guard**: none — but redirects already-authenticated users out.

**Purpose** — Single screen for both login and registration. Toggle switches mode; OAuth buttons are identical in both modes.

**Composition**:
1. Animated logo collage background (same pattern as `/join`).
2. Central card with:
   - Mode toggle (Sign In ↔ Create Account).
   - Email input + PrimeNG `Password` (with strength meter in register mode).
   - "Sign in with Google" / "Sign in with Apple" buttons.
   - "Forgot password?" link (triggers Firebase `sendPasswordResetEmail`).
3. `AppFloatingConfigurator` for dark-mode toggle.

**State & data flow** — Uses `AuthService.loginEmailPassword`, `registerEmailPassword`, `signInWithGoogle`, `signInWithApple`. On success:
- If `isMember || isAdmin` → navigate to `/fiftyPlus`.
- Else → navigate to `/landing`.

Errors surface via `NotifyService.error(...)`.

**Styling** — Centered card, Tailwind gap utilities, PrimeNG button severity variants. Background collage uses absolute-positioned strips of logo images with CSS keyframe marquees.

---

### 7.3 Member area (AppLayout)

#### `/fiftyPlus` — Dashboard

- **Component**: `src/app/pages/dashboard/dashboard.ts`
- **Layout**: `AppLayout` (topbar black + sidebar).
- **Guard**: none on the route; content is rendered conditionally on role.

**Purpose** — The post-login hub. Shows different things to anonymous/free, members, and admins.

**Composition** — A 12-column CSS grid with role-conditional widgets:

```
@if (!isMember && !isAdmin)
  → "Become A Fifty+ Member" CTA banner

@if (isAdmin)
  → <app-stats-widget> (admin-only high-level stats)

Left column (xl:col-span-6):
  @if (isMember) <app-user-summary-widget>
  <app-fifty-quizzes-dashboard>
  @if (isMember) <app-user-quiz-history-widget>

Right column (xl:col-span-6):
  <app-venue-calendar>
  <app-submissions-wall-widget>
```

(Some widgets — `notificationswidget`, `membershipreport`, `bestsellingwidget`, `recentsaleswidget`, `quizstatswidget` — are imported in `dashboard.ts` but currently commented out in the template.)

**State & data flow** — Direct subscription to `AuthService.isMember$` / `isAdmin$` via `AsyncPipe`. Each widget owns its own data fetching.

**Template excerpt** (the "Become a Member" CTA):

```html
<a routerLink="/join"
   class="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-bold text-xl cursor-pointer no-underline transition-opacity hover:opacity-90"
   style="background: var(--accent-green); color: var(--accent-green-contrast)">
    <i class="pi pi-star text-2xl"></i>
    Become A Fifty+ Member
</a>
```

**Styling** — Tailwind grid; widgets bring their own card styles. Grid collapses to a single column below `xl` (1200 px).

---

#### `/fiftyPlus/archives`, `/exclusives`, `/collabs`, `/questionQuizzes` — Fifty+ quiz collections

- **Component**: `src/app/pages/fiftyPlus/fiftyPage.ts` (one component, four route-data flavours).
- **Layout**: `AppLayout` (topbar black).
- **Guard**: none — non-members see the content blurred with a lock overlay.

**Purpose** — Four similar pages that list Fifty+ quizzes by type. A `:quizid` child route opens the selected quiz inline.

**Composition**:

```html
<div class="relative">
    <div [class.blur-sm]="!isMember"
         [class.pointer-events-none]="!isMember"
         [class.select-none]="!isMember">
        <app-quiz-collection
            [title]="title"
            [quizType]="quizType"
            [selectedQuizId]="selectedQuizId"/>
    </div>

    @if (!isMember) {
        <div class="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
             style="background: rgba(0,0,0,0.6); min-height: 400px">
            <i class="pi pi-lock text-primary mb-4" style="font-size: 3rem"></i>
            <h2 class="text-2xl font-semibold text-surface-0 mb-3">Fifty+ Members Only</h2>
            <p class="text-surface-300 mb-8 text-center px-8 max-w-sm">
                Subscribe to unlock all exclusive quizzes, archives, and member content.
            </p>
            <p-button label="Become a Member" icon="pi pi-star"
                      (click)="router.navigate(['/join'], { queryParams: { returnUrl: router.url } })"/>
        </div>
    }
</div>
```

**State & data flow** — Reads `route.data.type` (1–4) and maps it to the discriminator used by `QuizCollectionComponent`:

| `type` | Internal enum | Path | Title |
|---|---|---|---|
| 1 | `archives` | `/fiftyPlus/archives` | Archives |
| 2 | `exclusives` | `/fiftyPlus/exclusives` | Exclusives |
| 3 | `collaborations` | `/fiftyPlus/collabs` | Collaborations |
| 4 | `questions` | `/fiftyPlus/questionQuizzes` | Question Quizzes |

`selectedQuizId` is read from `:quizid` and subscribed to so navigation within the page updates the open quiz without reloading.

**Styling** — The lock overlay is 60 %-opaque black with a centered PrimeNG icon + button; the underlying collection is blurred with `blur-sm` and stripped of pointer events. When `isMember`, the blur/overlay vanish.

---

#### `/profile`, `/profile/:userId` — User profile

- **Component**: `src/app/pages/profile/profile.ts`
- **Layout**: `PublicLayout` (topbar black).
- **Guard**: `AuthGuard`.

**Purpose** — View/edit own profile (or view someone else's when `:userId` is provided).

**Composition**:
1. Avatar + display name header with editable pencil for own profile.
2. Membership badge (Free / Member / Admin).
3. Followers / Following counts with drill-down (uses `UserSearchService`).
4. "Change password" button → Firebase `sendPasswordResetEmail`.
5. For members: "Manage Billing" button → `SubscriptionService.createPortalSession(returnUrl)` → Stripe customer portal.
6. Preferences section (notification toggles, team name default, etc.).

**State & data flow** — On init, reads `:userId` or falls back to `AuthService.user$`. Profile updates go through `UserService`, which writes to `users/{uid}`. All changes surface via `NotifyService`.

**Styling** — Single-column card, Tailwind gap utilities, PrimeNG `Avatar`, `InputText`, `Button`.

---

### 7.4 Admin (AdminGuard)

Every admin route sits under `/fiftyPlus/admin` and is gated by `AdminGuard`. All render inside `AppLayout`.

#### `/fiftyPlus/admin/stats/total` — Total stats

- **Component**: `src/app/pages/dashboard/totalStats.ts`
- **Purpose**: Cumulative stats across all quizzes. Wraps `WeeklyQuizStatsComponent` with the "all time" mode.
- **State & data flow**: Pulls aggregates from `QuizStatsService` (which in turn calls the `/api/quizStats/:quizId` Cloud Functions endpoint for server-side aggregates and queries Firestore for local counts).
- **Template**: Chart.js line/bar charts (quiz participation over time), top venues, average score distribution.

#### `/fiftyPlus/admin/stats/weekly` — Weekly stats

- **Component**: `src/app/pages/dashboard/weeklyStats.ts`
- **Purpose**: Stats for the current week's quiz. Wraps `QuizStatsSummaryComponent`.
- **State & data flow**: Gets the current active quiz from `QuizzesService.getActiveQuiz()`, then resolves stats via `QuizStatsService`.
- **Template**: Participation count, average score, location heatmap (`chartjs-chart-geo` TopoJSON map), completion rate.

#### `/fiftyPlus/admin/quizzes` — Quiz table

- **Component**: `src/app/pages/admin/quiz/quizTable.ts`
- **Purpose**: Master list of every quiz with search, type filter, and bulk edit.
- **Composition**: Header bar (search input + quiz-type dropdown + "New Quiz" button + "Bulk Edit" toggle + "Save All"); PrimeNG `Table` with rows for each quiz; action buttons (edit → navigate to detail, delete with confirm).
- **State & data flow**: `QuizzesService.getAll()` for the list; inline edits are buffered client-side and committed via `QuizzesService.update(...)` on "Save All". `CollaboratorsService.list()` populates the collaborator dropdown.
- **Notable**: Bulk edit mode turns title, deployment date, publish status, and tags into inline editors; one button commits all dirty rows.

#### `/fiftyPlus/admin/quizzes/:id` — Quiz editor

- **Component**: `src/app/pages/admin/quiz/quizDetail.ts` (+ `quizDetail.html` template).
- **Purpose**: Full CRUD for a single quiz. Multi-tab interface driven by PrimeNG `Tabs`.
- **Tabs**:
  1. **General** — Title, slug, description (Quill rich-text, `ngx-quill`), quiz type (select), deployment date (`DatePicker`), publish/active toggle (Checkbox), colour theme (three `ColorPicker` for primary/secondary/tertiary), collaborator multi-select.
  2. **Questions** — Drag-and-drop list (`@angular/cdk/drag-drop`) of questions. Each question card shows number, text, answer, category, "timeless" flag. `SpeedDial` FAB adds a new question.
  3. **Images** — Upload quiz cover and gallery images via `StorageService` to Firebase Storage.
  4. **Tags** — `MultiSelect` populated from `QuizTagsService`.
  5. **Submission Forms** — Pick a `SubmissionForm` from `SubmissionFormService` to attach user submissions.
  6. **Preview** — Embedded `QuizDisplayComponent` renders the quiz exactly as a user would see it; updates live as the editor is edited (uses a `debounceTime(...)` on the form value stream).
- **State & data flow**: Loads the quiz by `:id` from `QuizzesService`; form is a `FormGroup` with a `FormArray` of questions. Save writes back through `QuizzesService.update`. Auth check via `AuthService` before destructive actions.
- **Notable**: Uses `QuizExtractComponent` (opened as a `DynamicDialog`) to paste raw quiz text and auto-extract Q/A pairs.

#### `/fiftyPlus/admin/quizTags` — Quiz tags manager

- **Component**: `src/app/pages/admin/quizTags/quizTags.ts`
- **Purpose**: Manage the tag vocabulary. Drag-reorder, add/edit/delete, see how many quizzes reference each tag.
- **Composition**: PrimeNG `OrderList` of tags with name + usage count + action buttons. Add/edit opens a small dialog. "Save Order" button commits the new `order` field.
- **State & data flow**: `QuizTagsService.list()` for tags; `QuizzesService` supplies usage counts. Soft delete sets `isActive: false` + `deletionTime` / `deletionUser`.

#### `/fiftyPlus/admin/venues` — Venue manager

- **Component**: `src/app/pages/admin/venues/venues.ts`
- **Purpose**: CRUD for pub quiz venues.
- **Composition**: Table of venues (name, city, state, next schedule, active toggle). Row click opens a detail dialog with:
  - Name, description, capacity.
  - Places Autocomplete for address (populates lat/lng via `GoogleMapsService`).
  - Contact block (website, phone, email).
  - Schedule editor — one or more `VenueSchedule` entries, each with a type (weekly / biweekly / monthly / custom / one-off), day of week, times, exclusion dates.
  - Image upload (`StorageService`) + active toggle.
- **State & data flow**: `VenueService.getAll()` / `create` / `update` / `softDelete`. Soft delete sets `isActive: false` + `deletionTime` + `deletionUser` — records stay in Firestore for audit.

#### `/fiftyPlus/admin/submissionForms` — Submission form list

- **Component**: `src/app/pages/admin/submissionForms/submissionFormTable.ts`
- **Purpose**: Browse submission form templates (e.g., "Weekly Quiz submission", "Collab submission").
- **Composition**: Searchable list of forms (name, description, field count). "New form" button creates and navigates to detail.

#### `/fiftyPlus/admin/submissionForms/:id` — Submission form editor

- **Component**: `src/app/pages/admin/submissionForms/submissionFormDetail.ts`
- **Purpose**: Edit a submission form's fields. Tabbed interface:
  - **General** — name, description, default flag, associated quizzes.
  - **Fields** — `OrderList` of fields. Each field has a type (text / number / dropdown / file / userTag), label, placeholder, required flag, validation rules, options (for dropdown). Add/edit in a dialog.
  - **Preview** — live render of the form as a user would see it.
- **State & data flow**: `SubmissionFormService.get(id)` / `save`. Changes reflected in `quizSubmissions` downstream.

#### `/fiftyPlus/admin/users` — User manager

- **Component**: `src/app/pages/admin/users/userTable.ts` (+ `userDetail.ts` panel).
- **Purpose**: Browse every registered user. Sortable by display name, membership type, last login.
- **Composition**: PrimeNG `Table` with search. Double-click (or action button) opens the detail panel.
- **Detail panel** (`userDetail.ts`): Profile fields, follower/following lists, recent quiz results, subscription status. Admin overrides available: grant guest access (`adminGrantGuestAccess` callable), refund a payment (`adminRefundPayment`), cancel subscription (`adminCancelSubscription`).
- **State & data flow**: `UserService` for reads; Cloud Functions callables for sensitive writes.

#### `/fiftyPlus/admin/contactForms` — Contact form inbox

- **Component**: `src/app/pages/admin/contactForms/contactFormTable.ts`
- **Purpose**: Read and triage public contact-form submissions.
- **Composition**: Table with expandable rows (full message in the expansion). Columns: name, email, mobile, snippet, submitted date, read/unread `Tag`. Double-click toggles read state.
- **State & data flow**: `ContactFormService.listSubmissions()` streams from Firestore; `markRead(id, value)` writes the boolean back.

---

### 7.5 Error

#### `/notfound` and wildcard `**`

- **Component**: `src/app/pages/notfound/notfound.ts`
- **Layout**: standalone.
- **Purpose**: 404 landing page. Displays "Error 404 — Oops! Page Not Found" and a single button to return home. Any unknown route redirects here.

---

## 8. Shared components catalog

Domain-grouped inventory. File paths are relative to `src/app/`.

### Quiz-rendering core (used by public quiz + member pages + admin preview)

| File | Component | Used by |
|---|---|---|
| `pages/common/quiz-display/quiz-display.ts` | `QuizDisplayComponent` | `/weekly-quiz`, admin quiz preview, retro results |
| `pages/common/quizTemplate/quizTemplate.component.ts` | `QuizTemplateComponent` | Shared chrome around a single question (timer, progress) |
| `pages/common/quizCollection/quizCollection.ts` | `QuizCollectionComponent` | All four `FiftyPageComponent` variants (archives / exclusives / collabs / questions) |
| `pages/common/question/question.component.ts` | `QuestionComponent` | Inside `QuizDisplay` — single question renderer with CSS variable theming |
| `pages/common/retroQuizResult/retroQuizResult.component.ts` | `RetroQuizResultComponent` | Shown when a user revisits a past attempt |
| `pages/common/userTagSelector/userTagSelector.component.ts` | `UserTagSelectorComponent` | Tag teammates on submission forms and quiz results |

### Dashboard widgets (`pages/dashboard/components/`)

| Component | Purpose |
|---|---|
| `StatsWidget` | Top-of-dashboard admin KPI row (revenue, users, quizzes, submissions) |
| `UserSummaryWidget` | Greeting + member streak + recent personal stats |
| `UserQuizHistoryWidget` | Table of quizzes the current user has played |
| `RecentQuizzesWidget` (`userrecentquizzes.ts`) | Carousel of recently played quizzes |
| `FiftyQuizzesDashboardComponent` (`fiftyquizzes.ts`) | Tiles linking to Archives / Exclusives / Collabs / Questions |
| `VenueCalendarComponent` | Upcoming quiz nights near the user (date-ordered) |
| `SubmissionsWallWidget` | Masonry of recent user submissions with tagging |
| `QuizStatsWidgetComponent` | Per-quiz score histogram and leaderboard (currently disabled in template) |
| `QuizStatsSummary` | Summary stats shown on the weekly admin page |
| `WeeklyQuizStats` | Admin detail chart set for "total stats" page |
| `MembershipReportWidget` (`membershipreport.ts`) | Subscription breakdown chart (disabled in template) |
| `NotificationsWidget` | Notification centre (disabled in template) |
| `BestSellingWidget` | Sakai leftover (disabled) |
| `RecentSalesWidget` (`recentsaleswidget.ts`) | Sakai leftover (disabled) |

### Public marketing widgets (`pages/public/components/`)

| Component | Used by |
|---|---|
| `HeroWidget` | `/signup` / `/landing` |
| `FeaturesWidget` | `/signup` / `/landing` |
| `HighlightsWidget` | `/signup` / `/landing` |
| `PricingWidget` | `/signup` / `/landing` |
| `FooterWidget` | `/signup` / `/landing` |
| `TopbarWidgetComponent` | `/signup` / `/landing` (standalone variant of the topbar) |
| `PublicTopbar` (`public-topbar.ts`) | Alternative public header (some pages) |
| `VenueCard` (`venue-card.ts`) | Venue finder list items |

### UI / global

| File | Component | Purpose |
|---|---|---|
| `shared/components/auth-modal/auth-modal.component.ts` | `AuthModalComponent` | Global login/register modal triggered by `AuthModalService` |
| `layout/component/app.configurator.ts` | `AppConfigurator` | Theme customization panel |
| `layout/component/app.floatingconfigurator.ts` | `AppFloatingConfigurator` | Floating toggle for the configurator |

---

## 9. Services reference

All services live in `src/app/shared/services/` and are `providedIn: 'root'`. Grouped by domain.

### Auth & user

#### `AuthService` (`auth.service.ts`)
The source of truth for the signed-in user. Exposes:
- `user$: BehaviorSubject<AppUser | null>`
- `isMember$: BehaviorSubject<boolean>`
- `isAdmin$: BehaviorSubject<boolean>`
- `initialized$: BehaviorSubject<boolean>` (flips true once Firebase has settled).

Methods: `loginEmailPassword`, `registerEmailPassword`, `signInWithGoogle`, `signInWithApple`, `signOut`, `sendPasswordReset`. On auth state change, it reads `users/{uid}` to hydrate `isMember` / `isAdmin`.

#### `AuthModalService` (`auth-modal.service.ts`)
Controls the global auth modal via BehaviorSubjects:
- `visible$` — boolean.
- `mode$` — `'login' | 'register'`.

Methods: `open(mode)`, `close()`.

#### `UserService` (`user.service.ts`)
CRUD on `users/{uid}`: profile reads, display-name updates, login-count increments, preferences.

#### `UserSearchService` (`user-search.service.ts`)
Searches a user's follower/following network. Handles Firestore's 30-item `in` query limit by batching.

#### `AdminService` (`admin.service.ts`)
Manages the `admins/{sanitizedEmail}` collection. Sanitizes email keys by replacing `.` and `@` with `_` (Firestore rules match on the sanitized key).

#### `SubscriptionService` (`subscription.service.ts`)
Wraps Cloud Functions callables — never touches Stripe directly:
- `createSubscriptionIntent(priceId)` → `{ clientSecret, subscriptionId }`.
- `createPortalSession(returnUrl)` → portal URL.
- Admin-only: `adminCancelSubscription`, `adminRefundPayment`, `adminGrantGuestAccess`.

### Quiz content

#### `QuizzesService` (`quizzes.service.ts`)
Quiz CRUD and streams. Uses `defer()` to lazy-load heavy queries. Methods: `getActiveQuiz`, `getAll`, `getByType`, `get(id)`, `getBySlug`, `create`, `update`, `softDelete`.

#### `QuizResultsService` (`quiz-result.service.ts`)
User quiz attempts and scoring. Writes `quizResults/{resultId}` and, on completion, the `events/` subcollection.

#### `QuizSessionsService` (`quiz-session.service.ts`)
Per-question session state. Writes under `users/{uid}/quizSessions/{sessionId}/events/{eventId}` so partial progress can be resumed.

#### `QuizStatsService` (`quiz-stats.service.ts`)
Aggregates stats from both the Cloud Functions HTTP API (`/api/quizStats/:quizId`) and client-side Firestore queries.

#### `QuizPdfService` (`quiz-pdf.service.ts`)
Multi-page PDF generation for quizzes via `jsPDF` + `jspdf-customfonts`. Used by an admin export action.

#### `QuizTagsService` (`quizTags.service.ts`)
CRUD on `quizTags`. Supports the drag-reorderable `order` field and soft delete (`isActive` + `deletionTime` + `deletionUser`).

#### `CollaboratorsService` (`collaborators.service.ts`)
Manages the `collaborators/` collection — partners credited on collab quizzes.

### Venues

#### `VenueService` (`venue.service.ts`)
CRUD for venues. Handles geocoding indirectly (by requesting `GoogleMapsService` when saving an address) and supports the `VenueSchedule` union (weekly, biweekly, monthly, custom, one-off).

#### `GoogleMapsService` (`google-maps.service.ts`)
Dynamic script loader for the Maps JS API (loaded once, cached). Helpers: `initMap`, `geocode`, `placesAutocomplete`, `formatSchedule`, `getUserLocation`.

### Submissions & forms

#### `QuizSubmissionService` (`quiz-submission.service.ts`)
Write-only on the public side — records user submissions. Read side used by `SubmissionsWallWidget`.

#### `SubmissionFormService` (`submission-form.service.ts`)
CRUD on `submissionForms/` — the form template collection used by `/admin/submissionForms`.

### Infrastructure

#### `StorageService` (`storage.service.ts`)
Firebase Storage uploads (quiz cover, question media, venue photos). Returns public download URLs.

#### `NotifyService` (`notify.service.ts`)
Wrapper around PrimeNG's `MessageService`. Methods: `success(msg)`, `error(msg)`, `warn(msg)`, `info(msg)`. Keeps toast styling consistent across the app.

#### `ContactFormService` (`contact-form.service.ts`)
Contact form submission endpoint. Uses `isDevMode()` to switch between the local emulator URL and production Cloud Functions.

#### `LayoutService` (`src/app/layout/service/layout.service.ts`)
See §6 — UI chrome state (signals only).

---

## 10. Data models

All interfaces live in `src/app/shared/models/`. Notable patterns:

- **Timestamps** come from Firestore as `Timestamp` objects. Services call `.toDate()` before emitting to components.
- **Soft delete** — venues and tags use `isActive: boolean` + `deletionTime` + `deletionUser` fields; hard deletes are avoided so audit trails survive.

### `AppUser` (`user.model.ts`)

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `email` | string | |
| `displayName` | string | User-editable |
| `photoUrl` | string | From OAuth or upload |
| `createdAt` | Date | |
| `lastLoginAt` | Date | |
| `updatedAt` | Date | |
| `isAdmin` | boolean | Drives `AdminGuard` + admin UI |
| `isMember` | boolean | Drives Fifty+ access |
| `isAnon` | boolean | Firebase anonymous auth |
| `followers[]` | string[] | UIDs |
| `following[]` | string[] | UIDs |
| `loginCount` | number | |
| `externalQuizId` | string | Optional linkage |
| `disableStats` | boolean | Opt out of stats |
| `defaultTeamName` | string | Pre-fill for submissions |

### `Quiz` (`quiz.model.ts`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Firestore doc id |
| `quizId` | number | Human-readable numeric id |
| `quizTitle` | string | |
| `quizSlug` | string | URL-safe |
| `quizType` | `QuizTypeEnum` | Weekly / FiftyPlus / Collab / QuestionType |
| `isPremium` | boolean | |
| `isActive` | boolean | Published flag |
| `creationTime` | Date | |
| `createdBy` | string | UID |
| `deploymentDate` | Date | Release date |
| `questions[]` | `QuizQuestion[]` | |
| `theme` | `QuizTheme` | `{ fontColor, backgroundColor, tertiaryColor }` |
| `notesAbove` | string | Rich HTML |
| `notesBelow` | string | Rich HTML |
| `imageUrl` | string | Storage URL |
| `collabId` | string | Optional link into `collaborators/` |
| `submissionFormId` | string | Optional link into `submissionForms/` |

`QuizQuestion`: `{ id, questionId, question, answer, category, timeless }`.

`QuizTypeEnum` values (`shared/enums/QuizTypeEnum.ts`):
- `Weekly = 1`
- `FiftyPlus = 2`
- `Collab = 3`
- `QuestionType = 4`

### `QuizResult` (`quizResult.model.ts`)

`{ resultId, quizId, userId, status, startedAt, completedAt, answers: QuizAnswer[], score, total, ip, geo: GeoLocation, retro, taggedUsers: TaggedUser[], userHidden }`.

- `QuizAnswer`: `{ questionId, correct, clickedAt }`.
- `GeoLocation`: `{ country, city, latitude, longitude }` (populated by Cloud Functions from MaxMind GeoLite2).

### `Venue` (`venue.model.ts`)

`{ id, venueName, location: VenueLocation, websiteUrl, phoneNumber, email, quizSchedules: VenueSchedule[], isActive, createdBy, createdAt, updatedBy, updatedAt, deletedBy, deletedAt, description, imageUrl, tags[], capacity }`.

- `VenueLocation`: `{ address, city, state, country, postalCode, latitude, longitude, placeId }`.
- `VenueSchedule`: `{ type: 'weekly' | 'biweekly' | 'monthly' | 'custom' | 'one-off', dayOfWeek, weekOfMonth, customDates[], startTime, endTime, isActive, notes, exclusionDates[] }`.

### `QuizTag` (`quizTags.model.ts`)

`{ id, name, creationUser, creationTime, deletionUser, deletionTime, isActive, quizIds[], order }`.

### `QuizSubmission` (`quizSubmission.model.ts`)

`{ id, quizId, quizDocId, formId, submitterId, submitterName, teamName, location, score, pictureUrl, taggedUsers: TaggedUser[], customFields, submittedAt }`.

- `TaggedUser`: `{ uid, displayName, photoUrl }`.
- Also defines `UserSubmissionStats` (per-user aggregate) and `QuizSubmissionSummary` (for profile pages).

### `SubmissionForm` (`submissionForm.model.ts`)

`{ id, name, description, isActive, isDefault, createdBy, createdAt, updatedAt, fields: SubmissionFormField[] }`.

- `SubmissionFormField`: `{ fieldId, fieldType: 'text' | 'number' | 'dropdown' | 'file' | 'userTag', label, placeholder, required, order, options[], validation }`.

### Smaller models

- `Admin` (`admin.model.ts`): `{ id, emailAddress, addedAt }`.
- `Collaborator` (`collaborator.model.ts`): `{ id, name, createdAt }`.
- `Submission` (`submission.model.ts`): legacy/simple variant — `{ id, userId, teamName, location, score, pictureUrl, submittedAt }`.

---

## 11. Firebase & Cloud Functions

### Firestore collections

```
quizzes/{quizDocId}
quizResults/{resultId}/events/{eventId}
users/{uid}
  ├── following/{followedUid}
  ├── followers/{followerUid}
  └── quizSessions/{sessionId}/events/{eventId}
admins/{sanitized_email}          # email with . and @ replaced by _
venues/{venueId}
quizTags/{tagId}
collaborators/{collabId}
submissionForms/{formId}
quizSubmissions/{submissionId}
payments/                          # writable only from Cloud Functions
userEvents/                        # writable only from Cloud Functions
quizAccess/                        # writable only from Cloud Functions
```

### Security rules (summary)

Custom functions defined in `firestore.rules`:
- `isAdmin()` — checks `users/{uid}.isAdmin == true`.
- `isMember(uid)` — checks `users/{uid}.isMember == true`.
- Writes to `payments`, `userEvents`, `quizAccess` are locked to Cloud Functions only. Clients read only as allowed.
- `users/{uid}` — read-your-own; admins can read all.
- `admins/{sanitized_email}` — admin-only.

### Cloud Functions — Express `api` (HTTP, all under `/api/`)

- `getLatestQuiz`
- `getLatestCollabQuiz`
- `getQuizArchiveHeaders`
- `getQuizByQuizId`
- `getQuizByQuizSlug`
- `quizStats/:quizId`
- `quizLocationStats/:quizId`
- `logQuizStart`, `logQuizFinish`
- `logFiftyPlusQuizStart`, `logFiftyPlusQuizFinish`
- `updateUserEmail`
- `getVenues`
- `submitContactForm`

### Cloud Functions — Firestore triggers

- `quizStarted` — `onDocumentCreated` on `quizResults/{id}` — enriches with IP geolocation via MaxMind GeoLite2.
- `quizFinished` — `onDocumentUpdated` on `quizResults/{id}` — finalizes score, tags teammates.

### Stripe callables

- `createSubscriptionIntent(priceId)` → `{ clientSecret, subscriptionId }` — bound to the Stripe Payment Element on `/join`.
- `createPortalSession(returnUrl)` → portal URL — called from `/profile` "Manage Billing".
- `adminCancelSubscription`, `adminRefundPayment`, `adminGrantGuestAccess` — admin overrides used from the admin user detail panel.
- Price tiers live in `functions/src/stripe-config.ts` (basic / standard / gold × quarterly / yearly).

---

## 12. Development workflows

### Commands

```bash
npm start      # ng serve — local dev on http://localhost:4200
npm run build  # production build (angular.json → dist/)
npm test       # Karma/Jasmine (no spec files currently exist)
npm run format # Prettier across js, mjs, ts, mts, d.ts, html
```

To run a single spec once one is added: `ng test --include=path/to/spec.ts`.

### Code style

**Prettier** (`.prettierrc.json`):
- 4-space indent, single quotes, semicolons on.
- `trailingComma: 'none'`, `printWidth: 250`.

**ESLint** — flat config, enforces:
- PrimeNG component selector prefix `p` (kebab-case).
- `no-console: off`, `prefer-const: off`.
- `any` types allowed (relaxed, given the Firestore/PrimeNG surface).

Run `npm run format` before committing to avoid lint noise.

### Environment setup

1. Copy `src/environments/environment.example.ts` to `environment.ts`.
2. Fill in required keys:
   - `production: boolean`
   - `googleMapsApiKey: string` — for Places Autocomplete + map tiles.
   - `stripePublishableKey: string` — for `ngx-stripe`.
   - `functionsBaseUrl: string` — used by `ContactFormService` to pick between emulator and production.
3. Firebase project is hard-coded to `weeklyfifty-7617b` in `app.config.ts`; no Firebase env switching today.

### Testing status

No spec files exist yet. Karma + Jasmine are configured and ready. Tests would live alongside their sources as `*.spec.ts`.

### Commit hygiene

Current working branch is `dev`; main is `master`. PRs typically go `dev → master-ready → master`. Recent history shows small merge-driven releases (`quiz preview fix`, `small fixes`, merges from `master`).

---

*End of SITE.md. Keep this file current when routes, major pages, or the styling layer change — it's the contract between the app and new contributors.*
