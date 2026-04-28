-- quizzes_flat
-- One row per (quiz, question). Sourced from a separate Firestore-to-BigQuery
-- extension instance watching the `quizzes` collection. The managed view is
-- expected to be `weeklyfifty_analytics.quizzes_raw_latest`.
--
-- Columns selected here form the contract assumed by every per-user
-- procedure (sp_user_*) — quiz_type lets results be grouped by Weekly /
-- Fifty+ / Collab / Question, and category powers the category-strengths,
-- highlights, and deep-dive widgets.

CREATE OR REPLACE TABLE `weeklyfifty_analytics.quizzes_flat`
CLUSTER BY quiz_id, question_id AS
SELECT
    SAFE_CAST(JSON_VALUE(q.data, '$.quizId')   AS STRING) AS quiz_id,
    SAFE_CAST(JSON_VALUE(q.data, '$.quizType') AS INT64)  AS quiz_type,
    JSON_VALUE(q.data, '$.quizTitle')                     AS quiz_title,
    `weeklyfifty_analytics.fs_ts`(
        JSON_VALUE(q.data, '$.deploymentDate'),
        JSON_VALUE(q.data, '$.deploymentDate._seconds')
    )                                                     AS deployment_date,
    SAFE_CAST(JSON_VALUE(question, '$.questionId') AS INT64)     AS question_id,
    SAFE_CAST(JSON_VALUE(question, '$.questionNumber') AS INT64) AS question_number,
    UPPER(JSON_VALUE(question, '$.category'))             AS category,
    JSON_VALUE(question, '$.question')                    AS question_text
FROM `weeklyfifty_analytics.quizzes_raw_latest` AS q,
    UNNEST(JSON_QUERY_ARRAY(q.data, '$.questions')) AS question
WHERE q.operation != 'DELETE'
  AND JSON_VALUE(q.data, '$.quizId') IS NOT NULL;
