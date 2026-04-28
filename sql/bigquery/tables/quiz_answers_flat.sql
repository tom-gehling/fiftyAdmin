-- quiz_answers_flat
-- One row per (session, question). Derived from quiz_results_flat by UNNEST-ing the
-- answers array, joined to quizzes_flat for category metadata.
-- Refreshed by the same scheduled-query cadence as quiz_results_flat.

CREATE OR REPLACE TABLE `weeklyfifty_analytics.quiz_answers_flat`
PARTITION BY DATE(completed_at)
CLUSTER BY quiz_id, question_id AS
SELECT
    r.session_id,
    r.quiz_id,
    r.user_id,
    r.completed_at,
    r.is_retro,
    r.was_abandoned,
    SAFE_CAST(JSON_VALUE(a, '$.questionId') AS INT64) AS question_id,
    SAFE_CAST(JSON_VALUE(a, '$.correct')    AS BOOL)  AS is_correct,
    TIMESTAMP(JSON_VALUE(a, '$.clickedAt'))           AS clicked_at,
    qf.category                                       AS category
FROM `weeklyfifty_analytics.quiz_results_flat` AS r,
    UNNEST(r.answers_json) AS a
LEFT JOIN `weeklyfifty_analytics.quizzes_flat` AS qf
    ON qf.quiz_id = r.quiz_id
   AND qf.question_id = SAFE_CAST(JSON_VALUE(a, '$.questionId') AS INT64)
WHERE r.status = 'completed';
