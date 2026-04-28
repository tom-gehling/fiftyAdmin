-- sp_user_quiz_deep_dive
-- Powers quiz-deep-dive.widget.ts. Returns a single row: envelope columns
-- plus a STRUCT array of every question in the quiz (from quizzes_flat),
-- LEFT-joined against the user's answers so unreached questions are flagged.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_quiz_deep_dive`(IN target_user_id STRING, IN target_quiz_id INT64)
BEGIN
    WITH quiz_meta AS (
        SELECT
            ANY_VALUE(quiz_type)  AS quiz_type,
            ANY_VALUE(quiz_title) AS quiz_title
        FROM `weeklyfifty_analytics.quizzes_flat`
        WHERE SAFE_CAST(quiz_id AS INT64) = target_quiz_id
    ),
    user_session AS (
        SELECT score, total, completed_at
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE user_id = target_user_id
          AND SAFE_CAST(quiz_id AS INT64) = target_quiz_id
          AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
    ),
    quiz_avg AS (
        SELECT AVG(score) AS avg_score
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE SAFE_CAST(quiz_id AS INT64) = target_quiz_id
          AND status = 'completed'
    ),
    global_question_rate AS (
        SELECT
            question_id,
            SAFE_DIVIDE(COUNTIF(is_correct) * 100.0, NULLIF(COUNT(*), 0)) AS global_correct_rate
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE SAFE_CAST(quiz_id AS INT64) = target_quiz_id
        GROUP BY question_id
    ),
    user_question_answers AS (
        SELECT question_id, is_correct
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE user_id = target_user_id
          AND SAFE_CAST(quiz_id AS INT64) = target_quiz_id
    ),
    quiz_questions AS (
        SELECT
            question_id,
            COALESCE(question_number, question_id) AS question_number
        FROM `weeklyfifty_analytics.quizzes_flat`
        WHERE SAFE_CAST(quiz_id AS INT64) = target_quiz_id
    ),
    questions_array AS (
        SELECT ARRAY_AGG(
            STRUCT(
                q.question_number                                AS question_number,
                CONCAT('q', CAST(q.question_id AS STRING))       AS question_id,
                COALESCE(g.global_correct_rate, 0.0)             AS global_correct_rate,
                COALESCE(u.is_correct, FALSE)                    AS user_correct,
                u.question_id IS NOT NULL                        AS user_answered
            )
            ORDER BY q.question_number
        ) AS questions
        FROM quiz_questions AS q
        LEFT JOIN global_question_rate    AS g ON g.question_id = q.question_id
        LEFT JOIN user_question_answers   AS u ON u.question_id = q.question_id
    )
    SELECT
        target_quiz_id                                                            AS quiz_id,
        COALESCE((SELECT quiz_title FROM quiz_meta),
                 CONCAT('Quiz #', CAST(target_quiz_id AS STRING)))                AS quiz_label,
        CASE (SELECT quiz_type FROM quiz_meta)
            WHEN 1 THEN 'weekly'
            WHEN 2 THEN 'fiftyPlus'
            WHEN 3 THEN 'collab'
            WHEN 4 THEN 'questionType'
            ELSE 'weekly'
        END                                                                        AS quiz_type,
        (SELECT completed_at FROM user_session)                                    AS completed_at,
        (SELECT score        FROM user_session)                                    AS user_score,
        (SELECT total        FROM user_session)                                    AS total,
        (SELECT avg_score    FROM quiz_avg)                                        AS avg_score,
        (SELECT questions    FROM questions_array)                                 AS questions;
END;
