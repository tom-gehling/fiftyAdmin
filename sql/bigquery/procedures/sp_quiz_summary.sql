-- sp_quiz_summary
-- Replaces the top-line numbers currently stored on quizAggregates/{quizId}.
-- Time per session is capped at 3h (10 800s) to match functions/src/index.ts:631.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_quiz_summary`(IN target_quiz_id STRING)
BEGIN
    SELECT
        target_quiz_id                                                                     AS quiz_id,
        COUNT(*)                                                                           AS attempts,
        COUNTIF(status = 'completed')                                                      AS completed_count,
        COUNTIF(was_abandoned)                                                             AS abandoned_count,
        AVG(IF(status = 'completed', score, NULL))                                         AS avg_score,
        AVG(IF(status = 'completed',
               LEAST(TIMESTAMP_DIFF(completed_at, started_at, SECOND), 10800),
               NULL))                                                                      AS avg_time_seconds,
        MAX(IF(status = 'completed', score, NULL))                                         AS max_score,
        MIN(IF(status = 'completed', score, NULL))                                         AS min_score
    FROM `weeklyfifty_analytics.quiz_results_flat`
    WHERE quiz_id = target_quiz_id;
END;
