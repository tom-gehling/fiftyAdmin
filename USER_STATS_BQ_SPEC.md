# User Stats — BigQuery procedure spec

Source-of-truth contract for the BigQuery stored procedures that power the `/fiftyPlus/stats` page.
The Angular UI is built and live on `dev` against a mocked `UserStatsService`. Once `BQconvert` merges and these procs are deployed, swap `getMyStats()` from `of(buildFixture)` to a real HTTP call against `/api/userStats/:userId`.

The TypeScript contract is at `src/app/shared/models/userStats.model.ts` — every proc below must return columns that map cleanly into one of those interfaces.

---

## API surface

A single Cloud Function endpoint fans out into all procs in parallel:

```
GET /api/userStats/:userId   →  UserStatsResponse
GET /api/userQuizDeepDive/:userId/:quizId   →  QuizDeepDive   (lazy / on selector change)
```

`UserStatsResponse` shape:

```ts
{
  summary: UserStatsSummary,
  history: UserHistoryPoint[],
  categories: UserCategoryStat[],
  timePatterns: UserTimePatterns,
  highlights: UserHighlights,
  localRank: UserLocalRank,
  byQuizType: QuizTypeBreakdown[],
  deepDives: QuizDeepDive[],          // first N (e.g. 5) pre-loaded; further fetched per-quiz
  dailyGames: DailyGamesSummary | null
}
```

---

## Source tables expected

| Table | Grain | Notes |
|---|---|---|
| `quiz_results_flat` | one row per quiz attempt | Must include `quiz_type` (1=Weekly, 2=FiftyPlus, 3=Collab, 4=Question). Add to flatten proc if missing. |
| `quiz_answers_flat` | one row per answered question | Must include `category` (joined from quiz definition). Tolerates NULL for un-tagged questions. |
| `quizzes_flat` *(new)* | one row per question across all quizzes | `quiz_id, question_id, question_number, category` — sourced from Firestore `quizzes` extension. Used to enrich `quiz_answers_flat` and to look up question text client-side. |
| `puzzle_results_flat` *(new)* | one row per daily-game attempt | Sourced from Firestore `puzzleResults` collection. Schema: `puzzle_id, game_type, user_id, date_key, is_correct, time_taken_seconds, completed_at`. |

### Conventions across all procs

- **Filter** `is_retro = FALSE` and `was_abandoned = FALSE` for "real performance" stats. `total_weeks_played` may include retros.
- **Filter** `status = 'completed'` for everything except funnel/abandonment metrics.
- **Location** `australia-southeast1` (matches existing procs).
- **Naming** `sp_user_*` — alphabetical in `functions/scripts/deploy-bq.ts`.
- All procs accept `user_id STRING` as first param.

---

## Procedures

### `sp_user_stats(user_id STRING)`

**Powers:** `hero-summary.widget.ts`, `loyalty-card.widget.ts`, `improvement-callout.widget.ts` (commented in container — re-enable when ready).

Returns a single row mapping to `UserStatsSummary`.

| Column | Type | Source / aggregation |
|---|---|---|
| `total_completed` | INT64 | `COUNT(*)` from `quiz_results_flat` (status=completed, both retro/non-retro) |
| `total_questions_answered` | INT64 | `SUM(total)` |
| `correct_total` | INT64 | `SUM(score)` |
| `correct_rate` | FLOAT64 | `100 * correct_total / NULLIF(total_questions_answered, 0)` |
| `lifetime_score` | INT64 | `SUM(score)` (alias of correct_total — kept for clarity) |
| `personal_best_score` | INT64 | `MAX(score)` |
| `personal_best_quiz_id` | INT64 | `ARRAY_AGG(quiz_id ORDER BY score DESC, completed_at ASC LIMIT 1)[OFFSET(0)]` |
| `first_quiz_completed_at` | TIMESTAMP | `MIN(completed_at)` |
| `most_recent_quiz_id` | INT64 | `ARRAY_AGG(quiz_id ORDER BY completed_at DESC LIMIT 1)[OFFSET(0)]` |
| `most_recent_score` | INT64 | matching score |
| `most_recent_completed_at` | TIMESTAMP | `MAX(completed_at)` |
| `weekly_streak` | INT64 | Walk back from the most recently deployed weekly quiz (`quiz_type = 1`); count consecutive weeks where the user has a `completed_at >= deployment_date`. Mirrors the existing JS logic in `src/app/pages/dashboard/components/usersummary.ts`. |
| `longest_weekly_streak` | INT64 | Same walk over all history; track the maximum run length. |
| `total_weeks_played` | INT64 | `COUNT(DISTINCT quiz_id)` where `quiz_type = 1` (retros allowed). |
| `improvement_4w_vs_first_4w` | FLOAT64 | `AVG(score) over last 4 weekly quizzes by completed_at` − `AVG(score) over first 4 weekly quizzes by completed_at`. NULL if fewer than 4 entries. |

Streak math requires either a `weekly_quizzes_flat` companion (quiz_id + deployment_date) or a JOIN to a `quizzes_flat` aggregate. Document whichever you pick — the UI doesn't care.

---

### `sp_user_quiz_history(user_id STRING)`

**Powers:** `trajectory-chart.widget.ts`.

Returns one row per completed weekly quiz, ordered by `completed_at ASC`. Maps to `UserHistoryPoint[]`.

| Column | Type | Source / aggregation |
|---|---|---|
| `quiz_id` | INT64 | from `quiz_results_flat` |
| `score` | INT64 | user's score |
| `total` | INT64 | quiz total |
| `completed_at` | TIMESTAMP | |
| `quiz_avg_score` | FLOAT64 | site-wide avg for this quiz; either join `quiz_aggregates` cache or compute via `AVG(score) OVER quiz_id`. |
| `was_personal_best_at_time` | BOOL | Window: `score > MAX(score) OVER (ORDER BY completed_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)`. First row is `was_personal_best_at_time = TRUE` if `score > 0`. |
| `score_vs_avg` | FLOAT64 | `score - quiz_avg_score` |

Recommend a hard cap (e.g. `LIMIT 200` or last 5 years) so the chart payload stays bounded.

---

### `sp_user_quiz_type_breakdown(user_id STRING)`

**Powers:** `quiz-type-breakdown.widget.ts`.

Returns up to 4 rows (one per quiz_type 1–4). Map to `QuizTypeBreakdown[]`. Always emit all 4 rows — zero-fill missing types so the UI's "not played yet" empty state can render.

| Column | Type |
|---|---|
| `type` | STRING — one of `'weekly' \| 'fiftyPlus' \| 'collab' \| 'questionType'` |
| `label` | STRING — `'Weekly' \| 'Fifty+' \| 'Collabs' \| 'Question Quizzes'` |
| `completed` | INT64 |
| `average_score` | FLOAT64 |
| `best_score` | INT64 |
| `correct_rate` | FLOAT64 — `100 * SUM(score) / NULLIF(SUM(total), 0)` |
| `last_played_at` | TIMESTAMP NULL |

---

### `sp_user_category_stats(user_id STRING)`

**Powers:** `category-strengths.widget.ts` (radar + sorted bars).

Returns one row per non-NULL category. Maps to `UserCategoryStat[]`.

| Column | Type | Source |
|---|---|---|
| `category` | STRING | `quiz_answers_flat.category` |
| `attempts` | INT64 | `COUNT(*)` for this user × category |
| `correct` | INT64 | `SUM(IF(is_correct, 1, 0))` |
| `correct_rate` | FLOAT64 | `100 * correct / attempts` |
| `correct_rate_vs_global` | FLOAT64 | `correct_rate - global_correct_rate_for_category`. Compute global via `WITH global AS (SELECT category, 100*AVG(IF(is_correct,1,0)) AS rate FROM quiz_answers_flat WHERE category IS NOT NULL GROUP BY category)`. Or pre-cache. |

Drop categories with `attempts < 5` to keep the radar legible (UI already filters specialty pick to `attempts >= 20`, but lets the others show in the bar list).

---

### `sp_user_time_patterns(user_id STRING)`

**Powers:** `time-patterns.widget.ts` (hour heatmap, DOW grid) and `completion-times.widget.ts` (fastest/avg/longest hh:mm:ss).

Returns a single row mapping to `UserTimePatterns`.

| Column | Type | Source |
|---|---|---|
| `most_common_hour` | INT64 | `MODE(EXTRACT(HOUR FROM completed_at AT TIME ZONE 'Australia/Sydney'))`. AEST is the right default; could parameterise per-user TZ later. |
| `most_common_dow` | INT64 | 0–6, Sunday=0 (matches JS Date convention; UI uses `['Sun','Mon',...]`) |
| `hour_buckets` | ARRAY\<INT64\> | length-24 array of completion counts. Use `GENERATE_ARRAY(0,23)` LEFT JOIN counts, then `ARRAY_AGG(c ORDER BY h)`. |
| `dow_buckets` | ARRAY\<INT64\> | length-7 array, Sun→Sat. |
| `fastest_seconds` | INT64 NULL | `MIN(TIMESTAMP_DIFF(completed_at, started_at, SECOND))` over completed, non-abandoned, non-retro. |
| `slowest_seconds` | INT64 NULL | `MAX(...)` |
| `average_seconds` | INT64 NULL | `AVG(...)` rounded |

Cap `slowest_seconds` at a sane upper bound (e.g. 6h) to filter out users who left a tab open. Or compute as a percentile (P95) — pick one and document.

---

### `sp_user_question_highlights(user_id STRING)`

**Powers:** `highlights.widget.ts`.

Returns two result sets (or one with a `kind` column). Maps to `UserHighlights`.

**Hardest you nailed** — top 5:
- `quiz_id`, `question_id`, `global_correct_rate`
- WHERE the user's `is_correct = TRUE` AND `global_correct_rate` is the lowest. Tie-break by most recent `completed_at`.

**Easy got wrong** — top 5:
- Same shape; user's `is_correct = FALSE` AND `global_correct_rate` is the highest.

Question text is **not** returned by the proc — the Angular widget hydrates it client-side from the cached `quizzes/{quizId}` Firestore doc (already in `QuizzesService`). Keeps the proc cheap.

`global_correct_rate` is computed across all users (filter `is_retro=FALSE`, `was_abandoned=FALSE`) from `quiz_answers_flat`. Cache as a quiz×question aggregate if the cross-join is too heavy.

---

### `sp_user_local_rank(user_id STRING)`

**Powers:** `local-rank.widget.ts`. The widget self-suppresses if the user is bottom-50% in their city, so it's safe to always return data.

Returns a single row mapping to `UserLocalRank`. Window: rolling **12 weeks** ending now.

| Column | Type | Source |
|---|---|---|
| `city` | STRING NULL | user's most-common city in window (`MODE(city)`) |
| `city_rank` | INT64 NULL | `DENSE_RANK() OVER (PARTITION BY city ORDER BY SUM(score) DESC)` for users in this city |
| `city_total_players` | INT64 NULL | `COUNT(DISTINCT user_id)` in this city in window |
| `city_avg_score` | FLOAT64 NULL | `AVG(score)` in this city |
| `country` | STRING NULL | most-common country |
| `country_rank` | INT64 NULL | same logic, country-scoped |
| `country_total_players` | INT64 NULL | |

Rank by *total score over the window*, not avg — reward consistency. Document the choice.

---

### `sp_user_quiz_deep_dive(user_id STRING, quiz_id INT64)`

**Powers:** `quiz-deep-dive.widget.ts`. Called once per quiz selection. The container pre-loads the most recent N (e.g. 5–7) deep-dives via `sp_user_recent_deep_dives` so the dropdown isn't a cold start.

Returns an envelope row + a per-question array. Maps to `QuizDeepDive`.

**Envelope** (single row):

| Column | Type | Source |
|---|---|---|
| `quiz_id` | INT64 | param |
| `quiz_label` | STRING | `'Quiz #' \|\| quiz_id` (or richer name from `quizzes_flat`) |
| `quiz_type` | STRING | `'weekly' \| 'fiftyPlus' \| 'collab' \| 'questionType'` |
| `completed_at` | TIMESTAMP | user's completed_at for this quiz |
| `user_score` | INT64 | |
| `total` | INT64 | |
| `avg_score` | FLOAT64 | site-wide avg for this quiz |
| `questions` | ARRAY\<STRUCT\> | see below — return as STRUCT array or as a second result set |

**Questions array** — one entry per question in `quiz_answers_flat` for this quiz:

| Field | Type | Source |
|---|---|---|
| `question_number` | INT64 | from `quizzes_flat.question_number` |
| `question_id` | STRING | `qN` style |
| `global_correct_rate` | FLOAT64 | across all users |
| `user_correct` | BOOL | this user's `is_correct` |
| `user_answered` | BOOL | TRUE if a row exists for this user × question, FALSE if user didn't reach it |

Order by `question_number ASC` — the widget renders them as bars left-to-right, indexed by question.

### `sp_user_recent_deep_dives(user_id STRING, n INT64 DEFAULT 5)`

Convenience proc: returns the last `n` quizzes' deep-dives in one call so the page paints fully on first load. Implementation: `WITH recent AS (... ORDER BY completed_at DESC LIMIT n) ...` then a CALL per quiz folded into a single `UNION ALL`. Or just have the Cloud Function loop and parallelise.

---

### `sp_user_daily_games(user_id STRING)`

**Powers:** `daily-games.widget.ts`. Returns NULL when the daily-games table is empty for this user — the widget renders a "coming soon" empty state.

Sources: `puzzle_results_flat` (new — sourced from Firestore `puzzleResults` via the BQ extension).

**Envelope** (single row, mapping to `DailyGamesSummary`):

| Column | Type |
|---|---|
| `total_days_played` | INT64 — `COUNT(DISTINCT date_key)` across all games |
| `total_solves` | INT64 — `SUM(IF(is_correct, 1, 0))` |
| `active_streak` | INT64 — current cross-game streak: consecutive `date_key`s ending today where `ANY(is_correct)` |

**Per-game array** — one row per `game_type` (in CLAUDE.md's enum: `makeTen, chainGame, movieEmoji, rushHour, countryJumble, tileRun`). Map to `DailyGameStat[]`. Always emit all six even if zero, so the UI's "Untouched — your blank canvas" empty tile renders.

| Field | Type | Source |
|---|---|---|
| `game` | STRING | normalised key |
| `label` | STRING | display name |
| `icon` | STRING | PrimeNG class (e.g. `'pi-calculator'`); UI may also hardcode this — pick one source of truth |
| `days_played` | INT64 | `COUNT(DISTINCT date_key)` for this game |
| `days_solved` | INT64 | distinct days where `is_correct=TRUE` |
| `current_streak` | INT64 | consecutive days ending today with `is_correct=TRUE` |
| `longest_streak` | INT64 | max run of consecutive `is_correct=TRUE` days |
| `best_time_seconds` | INT64 NULL | `MIN(time_taken_seconds)` where `is_correct=TRUE` |
| `success_rate` | FLOAT64 | `100 * days_solved / days_played` |

Streak math is the painful part — use `LAG(date_key)` partitioned by user/game over `is_correct=TRUE` rows.

---

## Cloud Function fan-out

The single endpoint should run **most procs in parallel** (`Promise.all`) and assemble the response. Suggested structure:

```ts
const [summary, history, byType, categories, timePatterns, highlights, localRank, recentDeepDives, dailyGames] = await Promise.all([
    bq.callProc('sp_user_stats', { user_id: uid }),
    bq.callProc('sp_user_quiz_history', { user_id: uid }),
    bq.callProc('sp_user_quiz_type_breakdown', { user_id: uid }),
    bq.callProc('sp_user_category_stats', { user_id: uid }),
    bq.callProc('sp_user_time_patterns', { user_id: uid }),
    bq.callProc('sp_user_question_highlights', { user_id: uid }),
    bq.callProc('sp_user_local_rank', { user_id: uid }),
    bq.callProc('sp_user_recent_deep_dives', { user_id: uid, n: 5 }),
    bq.callProc('sp_user_daily_games', { user_id: uid }).catch(() => null)
]);
```

Auth: verify Firebase ID token; reject if `decodedToken.uid !== :userId` AND user is not admin (mirror existing admin-stats pattern).

Cache: `Cache-Control: private, max-age=300` (matches `sp_refresh_flat_tables` cadence).

---

## Mapping table — proc ↔ widget ↔ TS type

| Widget | Powered by | TS slice |
|---|---|---|
| `hero-summary.widget.ts` | `sp_user_stats` | `summary: UserStatsSummary` |
| `improvement-callout.widget.ts` | `sp_user_stats.improvement_4w_vs_first_4w` | `summary.improvement4wVsFirst4w` |
| `loyalty-card.widget.ts` | `sp_user_stats` | `summary` (streak fields) |
| `quiz-type-breakdown.widget.ts` | `sp_user_quiz_type_breakdown` | `byQuizType: QuizTypeBreakdown[]` |
| `trajectory-chart.widget.ts` | `sp_user_quiz_history` | `history: UserHistoryPoint[]` |
| `category-strengths.widget.ts` | `sp_user_category_stats` | `categories: UserCategoryStat[]` |
| `quiz-deep-dive.widget.ts` | `sp_user_recent_deep_dives` (initial), `sp_user_quiz_deep_dive` (on-change) | `deepDives: QuizDeepDive[]` |
| `daily-games.widget.ts` | `sp_user_daily_games` | `dailyGames: DailyGamesSummary \| null` |
| `time-patterns.widget.ts` | `sp_user_time_patterns` | `timePatterns: UserTimePatterns` (hour/dow buckets) |
| `completion-times.widget.ts` | `sp_user_time_patterns` | `timePatterns.{fastestSeconds, averageSeconds, slowestSeconds}` |
| `highlights.widget.ts` | `sp_user_question_highlights` | `highlights: UserHighlights` |
| `local-rank.widget.ts` | `sp_user_local_rank` | `localRank: UserLocalRank` |

---

## Verification checklist

When the procs land:

1. `npm run deploy:bq` against `weeklyfifty-dev`.
2. `bq query --use_legacy_sql=false 'CALL \`weeklyfifty-dev.weeklyfifty_analytics.sp_user_stats\`("<known-uid>")'` and walk every proc.
3. Cross-check against `usersummary.ts` widget on the dashboard for any overlapping stat (correct rate, weekly streak) — they should match.
4. Replace `getMyStats(): of(buildFixture(...))` in `user-stats.service.ts` with an HTTP call to `/api/userStats/:userId`.
5. Open `/fiftyPlus/stats` (real account), `/fiftyPlus/stats?fixture=lowScorer`, `/fiftyPlus/stats?fixture=newcomer` — fixture variants stay valid as a "what should it look like" reference for QA.
6. Mobile width sanity check (overflow guards already in place across all widgets).
