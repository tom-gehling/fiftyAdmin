-- sp_quiz_question_accuracy
-- Per-question correct/total/rate. Endpoint derives hardest/easiest (bottom/top 5)
-- in JS to keep the stored proc simple and reusable.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_quiz_question_accuracy`(IN target_quiz_id STRING)
BEGIN
    SELECT
        question_id,
        COUNTIF(is_correct)                               AS correct_count,
        COUNT(*)                                          AS total_attempts,
        SAFE_DIVIDE(COUNTIF(is_correct), COUNT(*))        AS correct_rate
    FROM `weeklyfifty_analytics.quiz_answers_flat`
    WHERE quiz_id = target_quiz_id
    GROUP BY question_id
    ORDER BY question_id;
END;
