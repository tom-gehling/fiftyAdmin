-- sp_user_stats
-- Powers hero-summary, loyalty-card, and improvement-callout widgets on
-- /fiftyPlus/stats. Returns a single row matching the UserStatsSummary
-- TypeScript shape.
--
-- Streak math: ranks weekly quizzes (quiz_type = 1) into a dense week_index
-- sequence (so collabs/fifty+ between weeklies don't break streak counts).
-- weekly_streak counts contiguous played weeks ending at the most recent
-- deployed weekly. longest_weekly_streak is the maximum run anywhere.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_stats`(IN target_user_id STRING)
BEGIN
    WITH user_completed AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64) AS quiz_id_int,
            quiz_id,
            quiz_type,
            score,
            total,
            completed_at
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE user_id = target_user_id
          AND status = 'completed'
          AND completed_at IS NOT NULL
    ),
    weekly_quiz_index AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64) AS quiz_id_int,
            ROW_NUMBER() OVER (ORDER BY SAFE_CAST(quiz_id AS INT64)) AS week_index
        FROM (
            SELECT DISTINCT quiz_id
            FROM `weeklyfifty_analytics.quiz_results_flat`
            WHERE quiz_type = 1 AND quiz_id IS NOT NULL
        )
    ),
    user_weekly_played AS (
        SELECT w.week_index
        FROM weekly_quiz_index AS w
        JOIN (SELECT DISTINCT quiz_id_int FROM user_completed WHERE quiz_type = 1) AS u
            ON u.quiz_id_int = w.quiz_id_int
    ),
    streak_groups AS (
        SELECT
            week_index,
            week_index - ROW_NUMBER() OVER (ORDER BY week_index) AS grp
        FROM user_weekly_played
    ),
    streak_runs AS (
        SELECT grp, COUNT(*) AS run_length, MAX(week_index) AS last_week_in_run
        FROM streak_groups
        GROUP BY grp
    ),
    weekly_anchor AS (
        SELECT MAX(week_index) AS anchor_week_index FROM weekly_quiz_index
    ),
    weekly_ordered AS (
        SELECT
            score,
            completed_at,
            ROW_NUMBER() OVER (ORDER BY completed_at ASC)  AS rn_asc,
            ROW_NUMBER() OVER (ORDER BY completed_at DESC) AS rn_desc,
            COUNT(*) OVER ()                               AS n_weekly
        FROM user_completed
        WHERE quiz_type = 1
    ),
    pb AS (
        SELECT quiz_id_int, score
        FROM user_completed
        ORDER BY score DESC, completed_at ASC
        LIMIT 1
    ),
    most_recent AS (
        SELECT quiz_id_int, score, completed_at
        FROM user_completed
        ORDER BY completed_at DESC
        LIMIT 1
    )
    SELECT
        COUNT(*)                                                   AS total_completed,
        SUM(total)                                                 AS total_questions_answered,
        SUM(score)                                                 AS correct_total,
        SAFE_DIVIDE(SUM(score) * 100.0, NULLIF(SUM(total), 0))     AS correct_rate,
        SUM(score)                                                 AS lifetime_score,
        MAX(score)                                                 AS personal_best_score,
        (SELECT quiz_id_int FROM pb)                               AS personal_best_quiz_id,
        MIN(completed_at)                                          AS first_quiz_completed_at,
        (SELECT quiz_id_int   FROM most_recent)                    AS most_recent_quiz_id,
        (SELECT score         FROM most_recent)                    AS most_recent_score,
        (SELECT completed_at  FROM most_recent)                    AS most_recent_completed_at,
        COALESCE((
            SELECT run_length
            FROM streak_runs, weekly_anchor
            WHERE last_week_in_run = anchor_week_index
        ), 0)                                                      AS weekly_streak,
        COALESCE((SELECT MAX(run_length) FROM streak_runs), 0)     AS longest_weekly_streak,
        (SELECT COUNT(*) FROM user_weekly_played)                  AS total_weeks_played,
        (
            SELECT IF(MAX(n_weekly) >= 4,
                      AVG(IF(rn_desc <= 4, score, NULL)) - AVG(IF(rn_asc <= 4, score, NULL)),
                      NULL)
            FROM weekly_ordered
        )                                                          AS improvement_4w_vs_first_4w
    FROM user_completed;
END;
