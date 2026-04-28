-- users_flat
-- One row per user. Sourced from a Firestore-to-BigQuery extension instance
-- watching the `users` collection. The managed view is expected to be
-- `weeklyfifty_analytics.users_raw_latest`.
--
-- Columns mirror the AppUser TypeScript interface
-- (src/app/shared/models/user.model.ts). followers/following are flattened
-- to counts; if you need the full uid arrays for cohort work, add columns
-- using JSON_QUERY_ARRAY.

CREATE OR REPLACE TABLE `weeklyfifty_analytics.users_flat`
CLUSTER BY user_id AS
SELECT
    document_id                                                  AS user_id,
    JSON_VALUE(data, '$.email')                                  AS email,
    JSON_VALUE(data, '$.displayName')                            AS display_name,
    JSON_VALUE(data, '$.photoUrl')                               AS photo_url,
    TIMESTAMP(JSON_VALUE(data, '$.createdAt'))                   AS created_at,
    SAFE_CAST(JSON_VALUE(data, '$.isAdmin')      AS BOOL)        AS is_admin,
    SAFE_CAST(JSON_VALUE(data, '$.isMember')     AS BOOL)        AS is_member,
    SAFE_CAST(JSON_VALUE(data, '$.isAnon')       AS BOOL)        AS is_anon,
    SAFE_CAST(JSON_VALUE(data, '$.loginCount')   AS INT64)       AS login_count,
    ARRAY_LENGTH(JSON_QUERY_ARRAY(data, '$.followers'))          AS followers_count,
    ARRAY_LENGTH(JSON_QUERY_ARRAY(data, '$.following'))          AS following_count,
    JSON_VALUE(data, '$.externalQuizId')                         AS external_quiz_id,
    TIMESTAMP(JSON_VALUE(data, '$.lastLoginAt'))                 AS last_login_at,
    TIMESTAMP(JSON_VALUE(data, '$.updatedAt'))                   AS updated_at,
    SAFE_CAST(JSON_VALUE(data, '$.disableStats') AS BOOL)        AS disable_stats,
    JSON_VALUE(data, '$.defaultTeamName')                        AS default_team_name
FROM `weeklyfifty_analytics.users_raw_latest`
WHERE operation != 'DELETE';
