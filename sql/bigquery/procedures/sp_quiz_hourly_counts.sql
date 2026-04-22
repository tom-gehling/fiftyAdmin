-- sp_quiz_hourly_counts
-- Hourly completion buckets keyed 'YYYY-MM-DD HH' in Australia/Adelaide TZ,
-- matching the existing bucketing at functions/src/index.ts:635-638.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_quiz_hourly_counts`(IN target_quiz_id STRING)
BEGIN
    SELECT
        FORMAT_TIMESTAMP('%F %H', completed_at, 'Australia/Adelaide') AS hour_key,
        COUNT(*)                                                      AS completions
    FROM `weeklyfifty_analytics.quiz_results_flat`
    WHERE quiz_id = target_quiz_id
      AND status = 'completed'
      AND completed_at IS NOT NULL
    GROUP BY hour_key
    ORDER BY hour_key;
END;
