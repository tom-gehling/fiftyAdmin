-- sp_refresh_flat_tables
-- Rebuilds users_flat, quizzes_flat, quiz_results_flat, and quiz_answers_flat
-- from the extension-maintained raw views. Order matters: results join to
-- quizzes_flat for quiz_type, and answers join to quizzes_flat for category.
-- users_flat is independent so it runs first.
--
-- IMPORTANT: this procedure body must mirror sql/bigquery/tables/*.sql.
-- If you change the DDL of one, change the other. The static .sql files
-- bootstrap the tables on `npm run deploy:bq`; this procedure is invoked by
-- the every-5-min scheduled query to keep them fresh.
--
-- Schedule:
--   CALL `weeklyfifty_analytics.sp_refresh_flat_tables`();

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_refresh_flat_tables`()
BEGIN
    CREATE OR REPLACE TABLE `weeklyfifty_analytics.users_flat`
    CLUSTER BY user_id AS
    SELECT
        document_id                                                  AS user_id,
        JSON_VALUE(data, '$.email')                                  AS email,
        JSON_VALUE(data, '$.displayName')                            AS display_name,
        JSON_VALUE(data, '$.photoUrl')                               AS photo_url,
        `weeklyfifty_analytics.fs_ts`(
            JSON_VALUE(data, '$.createdAt'),
            JSON_VALUE(data, '$.createdAt._seconds')
        )                                                            AS created_at,
        SAFE_CAST(JSON_VALUE(data, '$.isAdmin')      AS BOOL)        AS is_admin,
        SAFE_CAST(JSON_VALUE(data, '$.isMember')     AS BOOL)        AS is_member,
        SAFE_CAST(JSON_VALUE(data, '$.isAnon')       AS BOOL)        AS is_anon,
        SAFE_CAST(JSON_VALUE(data, '$.loginCount')   AS INT64)       AS login_count,
        ARRAY_LENGTH(JSON_QUERY_ARRAY(data, '$.followers'))          AS followers_count,
        ARRAY_LENGTH(JSON_QUERY_ARRAY(data, '$.following'))          AS following_count,
        JSON_VALUE(data, '$.externalQuizId')                         AS external_quiz_id,
        `weeklyfifty_analytics.fs_ts`(
            JSON_VALUE(data, '$.lastLoginAt'),
            JSON_VALUE(data, '$.lastLoginAt._seconds')
        )                                                            AS last_login_at,
        `weeklyfifty_analytics.fs_ts`(
            JSON_VALUE(data, '$.updatedAt'),
            JSON_VALUE(data, '$.updatedAt._seconds')
        )                                                            AS updated_at,
        SAFE_CAST(JSON_VALUE(data, '$.disableStats') AS BOOL)        AS disable_stats,
        JSON_VALUE(data, '$.defaultTeamName')                        AS default_team_name
    FROM `weeklyfifty_analytics.users_raw_latest`
    WHERE operation != 'DELETE';

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
        JSON_VALUE(r.data, '$.quizId')                            AS quiz_id,
        qtl.quiz_type                                             AS quiz_type,
        JSON_VALUE(r.data, '$.userId')                            AS user_id,
        JSON_VALUE(r.data, '$.status')                            AS status,
        JSON_VALUE(r.data, '$.submittedFrom')                     AS submitted_from,
        `weeklyfifty_analytics.fs_ts`(
            JSON_VALUE(r.data, '$.startedAt'),
            JSON_VALUE(r.data, '$.startedAt._seconds')
        )                                                         AS started_at,
        `weeklyfifty_analytics.fs_ts`(
            JSON_VALUE(r.data, '$.completedAt'),
            JSON_VALUE(r.data, '$.completedAt._seconds')
        )                                                         AS completed_at,
        `weeklyfifty_analytics.fs_ts`(
            JSON_VALUE(r.data, '$.lastActivityAt'),
            JSON_VALUE(r.data, '$.lastActivityAt._seconds')
        )                                                         AS last_activity_at,
        SAFE_CAST(JSON_VALUE(r.data, '$.score') AS INT64)         AS score,
        SAFE_CAST(JSON_VALUE(r.data, '$.total') AS INT64)         AS total,
        JSON_VALUE(r.data, '$.geo.country')                       AS country,
        JSON_VALUE(r.data, '$.geo.city')                          AS city,
        SAFE_CAST(JSON_VALUE(r.data, '$.geo.latitude')  AS FLOAT64) AS latitude,
        SAFE_CAST(JSON_VALUE(r.data, '$.geo.longitude') AS FLOAT64) AS longitude,
        SAFE_CAST(JSON_VALUE(r.data, '$.retro')        AS BOOL)   AS is_retro,
        SAFE_CAST(JSON_VALUE(r.data, '$.wasAbandoned') AS BOOL)   AS was_abandoned,
        JSON_QUERY_ARRAY(r.data, '$.answers')                     AS answers_json
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
        -- Legacy WP-bridge writes `timestamp` (ISO string); newer Angular writes
        -- `clickedAt` (Firestore Timestamp). COALESCE both so all rows populate.
        COALESCE(
            `weeklyfifty_analytics.fs_ts`(
                JSON_VALUE(a, '$.clickedAt'),
                JSON_VALUE(a, '$.clickedAt._seconds')
            ),
            `weeklyfifty_analytics.fs_ts`(
                JSON_VALUE(a, '$.timestamp'),
                JSON_VALUE(a, '$.timestamp._seconds')
            )
        )                                                 AS clicked_at,
        qf.category                                       AS category
    FROM `weeklyfifty_analytics.quiz_results_flat` AS r,
        UNNEST(r.answers_json) AS a
    LEFT JOIN `weeklyfifty_analytics.quizzes_flat` AS qf
        ON qf.quiz_id = r.quiz_id
       AND qf.question_id = SAFE_CAST(JSON_VALUE(a, '$.questionId') AS INT64)
    WHERE r.status = 'completed';
END;
