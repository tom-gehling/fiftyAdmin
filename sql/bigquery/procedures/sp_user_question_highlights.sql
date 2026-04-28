-- sp_user_question_highlights
-- Powers highlights.widget.ts. Two flavours of brag/regret rolled into one
-- result set discriminated by `kind`:
--   'hardGotRight' — user got a question right that almost nobody else did
--   'easyGotWrong' — user got a question wrong that almost everyone else got
-- Question text is hydrated client-side from the cached quizzes Firestore doc.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_question_highlights`(IN target_user_id STRING)
BEGIN
    WITH global_question_rate AS (
        SELECT
            quiz_id,
            question_id,
            SAFE_DIVIDE(COUNTIF(is_correct) * 100.0, NULLIF(COUNT(*), 0)) AS global_correct_rate,
            COUNT(*) AS global_attempts
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        GROUP BY quiz_id, question_id
    ),
    user_answers AS (
        SELECT
            a.quiz_id,
            a.question_id,
            a.is_correct,
            a.completed_at,
            g.global_correct_rate,
            g.global_attempts
        FROM `weeklyfifty_analytics.quiz_answers_flat` AS a
        JOIN global_question_rate AS g
            ON g.quiz_id = a.quiz_id AND g.question_id = a.question_id
        WHERE a.user_id = target_user_id
          AND g.global_attempts >= 50  -- keep "global" meaningful
    ),
    hard_got_right AS (
        SELECT
            'hardGotRight'                                       AS kind,
            SAFE_CAST(quiz_id AS INT64)                          AS quiz_id,
            CONCAT('q', CAST(question_id AS STRING))             AS question_id,
            global_correct_rate
        FROM user_answers
        WHERE is_correct = TRUE
        ORDER BY global_correct_rate ASC, completed_at DESC
        LIMIT 5
    ),
    easy_got_wrong AS (
        SELECT
            'easyGotWrong'                                       AS kind,
            SAFE_CAST(quiz_id AS INT64)                          AS quiz_id,
            CONCAT('q', CAST(question_id AS STRING))             AS question_id,
            global_correct_rate
        FROM user_answers
        WHERE is_correct = FALSE
        ORDER BY global_correct_rate DESC, completed_at DESC
        LIMIT 5
    )
    SELECT * FROM hard_got_right
    UNION ALL
    SELECT * FROM easy_got_wrong;
END;
