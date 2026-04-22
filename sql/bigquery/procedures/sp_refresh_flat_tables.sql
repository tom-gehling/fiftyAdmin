-- sp_refresh_flat_tables
-- Rebuilds quiz_results_flat and quiz_answers_flat from the extension's raw view.
-- This is the procedure the scheduled query should call every 5 minutes:
--   CALL `weeklyfifty_analytics.sp_refresh_flat_tables`();

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_refresh_flat_tables`()
BEGIN
    CREATE OR REPLACE TABLE `weeklyfifty_analytics.quiz_results_flat`
    PARTITION BY DATE(started_at)
    CLUSTER BY quiz_id AS
    SELECT
        document_id                                               AS session_id,
        JSON_VALUE(data, '$.quizId')                              AS quiz_id,
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
    FROM `weeklyfifty_analytics.quiz_results_raw_latest`
    WHERE operation != 'DELETE'
      AND (JSON_VALUE(data, '$.retro') IS NULL OR JSON_VALUE(data, '$.retro') = 'false');

    CREATE OR REPLACE TABLE `weeklyfifty_analytics.quiz_answers_flat`
    PARTITION BY DATE(completed_at)
    CLUSTER BY quiz_id, question_id AS
    SELECT
        r.session_id,
        r.quiz_id,
        r.user_id,
        r.completed_at,
        SAFE_CAST(JSON_VALUE(a, '$.questionId') AS INT64) AS question_id,
        SAFE_CAST(JSON_VALUE(a, '$.correct')    AS BOOL)  AS is_correct,
        TIMESTAMP(JSON_VALUE(a, '$.clickedAt'))           AS clicked_at
    FROM `weeklyfifty_analytics.quiz_results_flat` AS r,
        UNNEST(r.answers_json) AS a
    WHERE r.status = 'completed';
END;
