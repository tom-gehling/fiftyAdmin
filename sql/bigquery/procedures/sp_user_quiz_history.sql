-- sp_user_quiz_history
-- Powers trajectory-chart.widget.ts. One row per completed weekly quiz for
-- the user, ordered oldest-first so the chart's running PB calc is trivial.
-- Capped at the most recent 200 weekly quizzes to keep the payload bounded.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_quiz_history`(IN target_user_id STRING)
BEGIN
    WITH quiz_avg AS (
        SELECT
            quiz_id,
            AVG(IF(status = 'completed', score, NULL)) AS quiz_avg_score
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE quiz_type = 1
        GROUP BY quiz_id
    ),
    user_history AS (
        SELECT
            SAFE_CAST(r.quiz_id AS INT64)                       AS quiz_id,
            r.score                                             AS score,
            r.total                                             AS total,
            r.completed_at                                      AS completed_at,
            qa.quiz_avg_score                                   AS quiz_avg_score
        FROM `weeklyfifty_analytics.quiz_results_flat` AS r
        LEFT JOIN quiz_avg AS qa ON qa.quiz_id = r.quiz_id
        WHERE r.user_id = target_user_id
          AND r.status = 'completed'
          AND r.quiz_type = 1
          AND r.completed_at IS NOT NULL
        ORDER BY r.completed_at DESC
        LIMIT 200
    )
    SELECT
        quiz_id,
        score,
        total,
        completed_at,
        quiz_avg_score,
        score > COALESCE(
            MAX(score) OVER (
                ORDER BY completed_at ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ),
            -1
        ) AS was_personal_best_at_time,
        score - quiz_avg_score AS score_vs_avg
    FROM user_history
    ORDER BY completed_at ASC;
END;
