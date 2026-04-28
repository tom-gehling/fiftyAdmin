-- sp_user_time_patterns
-- Powers time-patterns.widget.ts and completion-times.widget.ts.
-- Hour and day-of-week are bucketed in Australia/Sydney (matches AEST default;
-- can be parameterised per-user later).
-- DOW: Sunday = 0 to match the JS Date convention used by the UI's labels.
-- slowest_seconds is computed at P95 to suppress users who left a tab open.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_time_patterns`(IN target_user_id STRING)
BEGIN
    WITH user_sessions AS (
        SELECT
            completed_at,
            TIMESTAMP_DIFF(completed_at, started_at, SECOND) AS duration_seconds
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE user_id = target_user_id
          AND status = 'completed'
          AND completed_at IS NOT NULL
          AND started_at IS NOT NULL
          AND was_abandoned IS NOT TRUE
    ),
    by_hour AS (
        SELECT
            EXTRACT(HOUR FROM completed_at AT TIME ZONE 'Australia/Sydney') AS hour,
            COUNT(*) AS c
        FROM user_sessions
        GROUP BY hour
    ),
    by_dow AS (
        -- BQ DAYOFWEEK: 1=Sunday..7=Saturday → subtract 1 to get 0=Sun..6=Sat
        SELECT
            EXTRACT(DAYOFWEEK FROM completed_at AT TIME ZONE 'Australia/Sydney') - 1 AS dow,
            COUNT(*) AS c
        FROM user_sessions
        GROUP BY dow
    ),
    hour_buckets_arr AS (
        SELECT ARRAY(
            SELECT COALESCE(b.c, 0)
            FROM UNNEST(GENERATE_ARRAY(0, 23)) AS h
            LEFT JOIN by_hour AS b ON b.hour = h
            ORDER BY h
        ) AS hour_buckets
    ),
    dow_buckets_arr AS (
        SELECT ARRAY(
            SELECT COALESCE(b.c, 0)
            FROM UNNEST(GENERATE_ARRAY(0, 6)) AS d
            LEFT JOIN by_dow AS b ON b.dow = d
            ORDER BY d
        ) AS dow_buckets
    ),
    most_common_hour_calc AS (
        SELECT hour FROM by_hour ORDER BY c DESC, hour ASC LIMIT 1
    ),
    most_common_dow_calc AS (
        SELECT dow FROM by_dow ORDER BY c DESC, dow ASC LIMIT 1
    ),
    durations AS (
        SELECT duration_seconds FROM user_sessions WHERE duration_seconds IS NOT NULL
    )
    SELECT
        (SELECT hour FROM most_common_hour_calc)            AS most_common_hour,
        (SELECT dow  FROM most_common_dow_calc)             AS most_common_dow,
        (SELECT hour_buckets FROM hour_buckets_arr)         AS hour_buckets,
        (SELECT dow_buckets  FROM dow_buckets_arr)          AS dow_buckets,
        (SELECT MIN(duration_seconds) FROM durations)       AS fastest_seconds,
        (SELECT CAST(APPROX_QUANTILES(duration_seconds, 100)[OFFSET(95)] AS INT64)
            FROM durations)                                 AS slowest_seconds,
        (SELECT CAST(ROUND(AVG(duration_seconds)) AS INT64)
            FROM durations)                                 AS average_seconds;
END;
