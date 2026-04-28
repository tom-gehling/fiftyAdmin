-- sp_user_daily_games
-- Powers daily-games.widget.ts.
--
-- Depends on `weeklyfifty_analytics.puzzle_results_flat` — sourced from a
-- Firestore-to-BigQuery extension on the `puzzleResults` collection.
-- Until that extension is installed the proc deploys (CREATE OR REPLACE
-- only validates syntax) but a CALL will fail; the Cloud Function wraps
-- this in .catch(() => null) so the rest of the stats page still renders.
--
-- Returns one envelope row with a STRUCT array of all six daily games
-- (zero-filled so the UI's "untouched" empty tile can render per game).

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_daily_games`(IN target_user_id STRING)
BEGIN
    DECLARE today DATE DEFAULT CURRENT_DATE('Australia/Sydney');

    WITH all_games AS (
        SELECT 'makeTen'       AS game, 'Make Ten'        AS label, 'pi-calculator' AS icon UNION ALL
        SELECT 'chainGame',          'Chain',              'pi-link'                       UNION ALL
        SELECT 'movieEmoji',         'Movie Emoji',        'pi-video'                      UNION ALL
        SELECT 'rushHour',           'Rush Hour',          'pi-car'                        UNION ALL
        SELECT 'countryJumble',      'Country Jumble',     'pi-globe'                      UNION ALL
        SELECT 'tileRun',            'Tile Run',           'pi-th-large'
    ),
    user_results AS (
        SELECT game_type, date_key, is_correct, time_taken_seconds
        FROM `weeklyfifty_analytics.puzzle_results_flat`
        WHERE user_id = target_user_id
    ),
    per_game_basics AS (
        SELECT
            game_type,
            COUNT(DISTINCT date_key)                                 AS days_played,
            COUNT(DISTINCT IF(is_correct, date_key, NULL))           AS days_solved,
            MIN(IF(is_correct, time_taken_seconds, NULL))            AS best_time_seconds
        FROM user_results
        GROUP BY game_type
    ),
    per_game_solved_days AS (
        SELECT game_type, date_key
        FROM user_results
        WHERE is_correct = TRUE
        GROUP BY game_type, date_key
    ),
    per_game_streak_groups AS (
        SELECT
            game_type,
            date_key,
            DATE_SUB(date_key, INTERVAL ROW_NUMBER() OVER (PARTITION BY game_type ORDER BY date_key) DAY) AS grp
        FROM per_game_solved_days
    ),
    per_game_runs AS (
        SELECT
            game_type,
            grp,
            COUNT(*)            AS run_length,
            MAX(date_key)       AS last_day_in_run
        FROM per_game_streak_groups
        GROUP BY game_type, grp
    ),
    per_game_streaks AS (
        SELECT
            game_type,
            COALESCE(MAX(run_length), 0) AS longest_streak,
            COALESCE(MAX(IF(last_day_in_run = today, run_length, 0)), 0) AS current_streak
        FROM per_game_runs
        GROUP BY game_type
    ),
    per_game_combined AS (
        SELECT
            g.game,
            g.label,
            g.icon,
            COALESCE(b.days_played, 0)        AS days_played,
            COALESCE(b.days_solved, 0)        AS days_solved,
            COALESCE(s.current_streak, 0)     AS current_streak,
            COALESCE(s.longest_streak, 0)     AS longest_streak,
            b.best_time_seconds               AS best_time_seconds,
            SAFE_DIVIDE(COALESCE(b.days_solved, 0) * 100.0, NULLIF(b.days_played, 0)) AS success_rate
        FROM all_games AS g
        LEFT JOIN per_game_basics  AS b ON b.game_type = g.game
        LEFT JOIN per_game_streaks AS s ON s.game_type = g.game
    ),
    all_solved_days AS (
        SELECT DISTINCT date_key
        FROM user_results
        WHERE is_correct = TRUE
    ),
    all_streak_groups AS (
        SELECT
            date_key,
            DATE_SUB(date_key, INTERVAL ROW_NUMBER() OVER (ORDER BY date_key) DAY) AS grp
        FROM all_solved_days
    ),
    all_runs AS (
        SELECT grp, COUNT(*) AS run_length, MAX(date_key) AS last_day_in_run
        FROM all_streak_groups
        GROUP BY grp
    )
    SELECT
        (SELECT COUNT(DISTINCT date_key) FROM user_results)                       AS total_days_played,
        (SELECT COUNTIF(is_correct) FROM user_results)                            AS total_solves,
        COALESCE(
            (SELECT MAX(IF(last_day_in_run = today, run_length, 0)) FROM all_runs),
            0
        )                                                                          AS active_streak,
        ARRAY(
            SELECT AS STRUCT
                game,
                label,
                icon,
                days_played,
                days_solved,
                current_streak,
                longest_streak,
                best_time_seconds,
                COALESCE(success_rate, 0.0) AS success_rate
            FROM per_game_combined
            ORDER BY days_played DESC, game ASC
        )                                                                          AS games;
END;
