-- sp_user_category_stats
-- Powers category-strengths.widget.ts (radar + sorted bar list).
-- Returns one row per non-NULL category that the user has answered ≥ 5 times.
-- correct_rate_vs_global is the user's rate minus the global rate for the
-- same category (positive = above average).

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_category_stats`(IN target_user_id STRING)
BEGIN
    WITH global_by_category AS (
        SELECT
            category,
            SAFE_DIVIDE(COUNTIF(is_correct) * 100.0, NULLIF(COUNT(*), 0)) AS global_rate
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE category IS NOT NULL
        GROUP BY category
    ),
    user_by_category AS (
        SELECT
            category,
            COUNT(*)                                                       AS attempts,
            COUNTIF(is_correct)                                            AS correct,
            SAFE_DIVIDE(COUNTIF(is_correct) * 100.0, NULLIF(COUNT(*), 0))  AS correct_rate
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE user_id = target_user_id
          AND category IS NOT NULL
        GROUP BY category
    )
    SELECT
        u.category                                   AS category,
        u.attempts                                   AS attempts,
        u.correct                                    AS correct,
        u.correct_rate                               AS correct_rate,
        u.correct_rate - COALESCE(g.global_rate, 0)  AS correct_rate_vs_global
    FROM user_by_category AS u
    LEFT JOIN global_by_category AS g ON g.category = u.category
    WHERE u.attempts >= 5
    ORDER BY u.correct_rate DESC;
END;
