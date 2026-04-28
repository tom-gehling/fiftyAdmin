-- quiz_results_flat
-- Curated, flattened view of the Firestore `quizResults` collection.
-- Source: extension-maintained view `quiz_results_raw_latest` (JSON data column).
-- Refreshed by a scheduled query (see docs — every 5 minutes recommended).
-- Rows with retro=true are excluded (they are hand-entered and skew stats).
--
-- quiz_type is denormalised from quizzes_flat so per-user procedures can
-- group by Weekly / Fifty+ / Collab / Question without re-joining.

CREATE OR REPLACE TABLE `weeklyfifty_analytics.quiz_results_flat`
PARTITION BY DATE(started_at)
CLUSTER BY quiz_id AS
WITH quiz_type_lookup AS (
    SELECT quiz_id, ANY_VALUE(quiz_type) AS quiz_type
    FROM `weeklyfifty_analytics.quizzes_flat`
    GROUP BY quiz_id
)
SELECT
    document_id                                               AS session_id,
    JSON_VALUE(data, '$.quizId')                              AS quiz_id,
    qtl.quiz_type                                             AS quiz_type,
    JSON_VALUE(data, '$.userId')                              AS user_id,
    JSON_VALUE(data, '$.status')                              AS status,
    JSON_VALUE(data, '$.submittedFrom')                       AS submitted_from,
    TIMESTAMP(JSON_VALUE(data, '$.startedAt'))                AS started_at,
    TIMESTAMP(JSON_VALUE(data, '$.completedAt'))              AS completed_at,
    TIMESTAMP(JSON_VALUE(data, '$.lastActivityAt'))           AS last_activity_at,
    SAFE_CAST(JSON_VALUE(data, '$.score') AS INT64)           AS score,
    SAFE_CAST(JSON_VALUE(data, '$.total') AS INT64)           AS total,
    JSON_VALUE(data, '$.geo.country')                         AS country,
    JSON_VALUE(data, '$.geo.city')                            AS city,
    SAFE_CAST(JSON_VALUE(data, '$.geo.latitude')  AS FLOAT64) AS latitude,
    SAFE_CAST(JSON_VALUE(data, '$.geo.longitude') AS FLOAT64) AS longitude,
    SAFE_CAST(JSON_VALUE(data, '$.retro')        AS BOOL)     AS is_retro,
    SAFE_CAST(JSON_VALUE(data, '$.wasAbandoned') AS BOOL)     AS was_abandoned,
    JSON_QUERY_ARRAY(data, '$.answers')                       AS answers_json
FROM `weeklyfifty_analytics.quiz_results_raw_latest` AS r
LEFT JOIN quiz_type_lookup AS qtl
    ON qtl.quiz_id = JSON_VALUE(r.data, '$.quizId')
WHERE r.operation != 'DELETE'
  AND (JSON_VALUE(r.data, '$.retro') IS NULL OR JSON_VALUE(r.data, '$.retro') = 'false');
