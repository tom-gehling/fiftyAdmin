-- sp_quiz_thinking_times
-- Average time (seconds) between consecutive question clicks, per question.
-- Intervals are capped at 600s (10 min) to match functions/src/index.ts:659.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_quiz_thinking_times`(IN target_quiz_id STRING)
BEGIN
    WITH intervals AS (
        SELECT
            session_id,
            question_id,
            LEAST(
                TIMESTAMP_DIFF(
                    clicked_at,
                    LAG(clicked_at) OVER (PARTITION BY session_id ORDER BY question_id),
                    SECOND
                ),
                600
            ) AS diff_sec
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE quiz_id = target_quiz_id
    )
    SELECT
        question_id,
        AVG(diff_sec)   AS avg_diff_sec,
        COUNT(*)        AS sample_count
    FROM intervals
    WHERE diff_sec IS NOT NULL AND diff_sec > 0
    GROUP BY question_id
    ORDER BY question_id;
END;
