-- sp_user_quiz_type_breakdown
-- Powers quiz-type-breakdown.widget.ts. Always returns exactly 4 rows
-- (one per quiz_type 1–4) so the UI's empty-state per type can render
-- even for users who haven't tried that surface yet.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_quiz_type_breakdown`(IN target_user_id STRING)
BEGIN
    WITH all_types AS (
        SELECT 1 AS quiz_type, 'weekly'       AS type_key, 'Weekly'           AS label UNION ALL
        SELECT 2,                'fiftyPlus',                'Fifty+'                  UNION ALL
        SELECT 3,                'collab',                   'Collabs'                 UNION ALL
        SELECT 4,                'questionType',             'Question Quizzes'
    ),
    user_rows AS (
        SELECT quiz_type, score, total, completed_at
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE user_id = target_user_id
          AND status = 'completed'
          AND quiz_type IS NOT NULL
    ),
    aggregated AS (
        SELECT
            quiz_type,
            COUNT(*)                                              AS completed,
            AVG(score)                                            AS average_score,
            MAX(score)                                            AS best_score,
            SAFE_DIVIDE(SUM(score) * 100.0, NULLIF(SUM(total), 0)) AS correct_rate,
            MAX(completed_at)                                     AS last_played_at
        FROM user_rows
        GROUP BY quiz_type
    )
    SELECT
        t.type_key                       AS type,
        t.label                          AS label,
        COALESCE(a.completed, 0)         AS completed,
        COALESCE(a.average_score, 0.0)   AS average_score,
        COALESCE(a.best_score, 0)        AS best_score,
        COALESCE(a.correct_rate, 0.0)    AS correct_rate,
        a.last_played_at                 AS last_played_at
    FROM all_types AS t
    LEFT JOIN aggregated AS a ON a.quiz_type = t.quiz_type
    ORDER BY t.quiz_type;
END;
