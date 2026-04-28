-- sp_refresh_flat_tables
-- Rebuilds quizzes_flat, quiz_results_flat, and quiz_answers_flat from the
-- extension-maintained raw views. Order matters: results join to quizzes_flat
-- for quiz_type, and answers join to quizzes_flat for category.
-- Schedule this every 5 minutes:
--   CALL `weeklyfifty_analytics.sp_refresh_flat_tables`();

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_refresh_flat_tables`()
BEGIN
    CREATE OR REPLACE TABLE `weeklyfifty_analytics.quizzes_flat`
    CLUSTER BY quiz_id, question_id AS
    SELECT
        SAFE_CAST(JSON_VALUE(q.data, '$.quizId')   AS STRING) AS quiz_id,
        SAFE_CAST(JSON_VALUE(q.data, '$.quizType') AS INT64)  AS quiz_type,
        JSON_VALUE(q.data, '$.title')                         AS quiz_title,
        TIMESTAMP(JSON_VALUE(q.data, '$.deploymentDate'))     AS deployment_date,
        SAFE_CAST(JSON_VALUE(question, '$.id')   AS INT64)    AS question_id,
        SAFE_CAST(JSON_VALUE(question, '$.questionNumber') AS INT64) AS question_number,
        UPPER(JSON_VALUE(question, '$.category'))             AS category,
        JSON_VALUE(question, '$.questionText')                AS question_text
    FROM `weeklyfifty_analytics.quizzes_raw_latest` AS q,
        UNNEST(JSON_QUERY_ARRAY(q.data, '$.questions')) AS question
    WHERE q.operation != 'DELETE'
      AND JSON_VALUE(q.data, '$.quizId') IS NOT NULL;

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
END;
