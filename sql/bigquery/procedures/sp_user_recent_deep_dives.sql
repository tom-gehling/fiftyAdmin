-- sp_user_recent_deep_dives
-- Returns one row per quiz for the user's most recent N completed quizzes,
-- pre-loaded so the deep-dive dropdown isn't a cold start. Each row matches
-- the sp_user_quiz_deep_dive envelope (including the questions STRUCT array).

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_recent_deep_dives`(IN target_user_id STRING, IN n INT64)
BEGIN
    WITH recent_quizzes AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64)                          AS quiz_id_int,
            quiz_id                                              AS quiz_id_str,
            quiz_type                                            AS quiz_type,
            score                                                AS user_score,
            total                                                AS total,
            completed_at                                         AS completed_at,
            ROW_NUMBER() OVER (PARTITION BY quiz_id ORDER BY completed_at DESC) AS rn_per_quiz
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE user_id = target_user_id
          AND status = 'completed'
          AND completed_at IS NOT NULL
        QUALIFY rn_per_quiz = 1
        ORDER BY completed_at DESC
        LIMIT 50  -- safety bound; n still drives final slice below
    ),
    capped AS (
        SELECT *
        FROM recent_quizzes
        QUALIFY ROW_NUMBER() OVER (ORDER BY completed_at DESC) <= n
    ),
    quiz_avgs AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64) AS quiz_id_int,
            AVG(score)                  AS avg_score
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE status = 'completed'
          AND SAFE_CAST(quiz_id AS INT64) IN (SELECT quiz_id_int FROM capped)
        GROUP BY quiz_id_int
    ),
    global_question_rate AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64) AS quiz_id_int,
            question_id,
            SAFE_DIVIDE(COUNTIF(is_correct) * 100.0, NULLIF(COUNT(*), 0)) AS global_correct_rate
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE SAFE_CAST(quiz_id AS INT64) IN (SELECT quiz_id_int FROM capped)
        GROUP BY quiz_id_int, question_id
    ),
    user_question_answers AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64) AS quiz_id_int,
            question_id,
            is_correct
        FROM `weeklyfifty_analytics.quiz_answers_flat`
        WHERE user_id = target_user_id
          AND SAFE_CAST(quiz_id AS INT64) IN (SELECT quiz_id_int FROM capped)
    ),
    quiz_questions AS (
        SELECT
            SAFE_CAST(quiz_id AS INT64) AS quiz_id_int,
            question_id,
            COALESCE(question_number, question_id) AS question_number,
            quiz_title
        FROM `weeklyfifty_analytics.quizzes_flat`
        WHERE SAFE_CAST(quiz_id AS INT64) IN (SELECT quiz_id_int FROM capped)
    ),
    questions_per_quiz AS (
        SELECT
            q.quiz_id_int,
            ANY_VALUE(q.quiz_title) AS quiz_title,
            ARRAY_AGG(
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
        LEFT JOIN global_question_rate AS g
            ON g.quiz_id_int = q.quiz_id_int AND g.question_id = q.question_id
        LEFT JOIN user_question_answers AS u
            ON u.quiz_id_int = q.quiz_id_int AND u.question_id = q.question_id
        GROUP BY q.quiz_id_int
    )
    SELECT
        c.quiz_id_int                                                              AS quiz_id,
        COALESCE(qpq.quiz_title,
                 CONCAT('Quiz #', CAST(c.quiz_id_int AS STRING)))                  AS quiz_label,
        CASE c.quiz_type
            WHEN 1 THEN 'weekly'
            WHEN 2 THEN 'fiftyPlus'
            WHEN 3 THEN 'collab'
            WHEN 4 THEN 'questionType'
            ELSE 'weekly'
        END                                                                         AS quiz_type,
        c.completed_at                                                              AS completed_at,
        c.user_score                                                                AS user_score,
        c.total                                                                     AS total,
        qa.avg_score                                                                AS avg_score,
        qpq.questions                                                               AS questions
    FROM capped AS c
    LEFT JOIN quiz_avgs         AS qa  ON qa.quiz_id_int  = c.quiz_id_int
    LEFT JOIN questions_per_quiz AS qpq ON qpq.quiz_id_int = c.quiz_id_int
    ORDER BY c.completed_at DESC;
END;
