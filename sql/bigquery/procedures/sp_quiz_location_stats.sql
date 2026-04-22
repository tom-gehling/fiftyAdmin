-- sp_quiz_location_stats
-- Country and city aggregates for one quiz. Returns a single result set with a
-- `level` discriminator ('country' | 'city'). The Node handler splits this and
-- takes top-20 cities to match the existing endpoint's response shape.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_quiz_location_stats`(IN target_quiz_id STRING)
BEGIN
    SELECT
        'country' AS level,
        COALESCE(country, 'Unknown')                                    AS name,
        COUNT(*)                                                        AS count,
        AVG(score)                                                      AS average_score,
        AVG(TIMESTAMP_DIFF(completed_at, started_at, SECOND))           AS average_time,
        AVG(latitude)                                                   AS latitude,
        AVG(longitude)                                                  AS longitude
    FROM `weeklyfifty_analytics.quiz_results_flat`
    WHERE quiz_id = target_quiz_id
      AND status = 'completed'
    GROUP BY name

    UNION ALL

    SELECT
        'city' AS level,
        CONCAT(COALESCE(city, 'Unknown'), ', ', COALESCE(country, 'Unknown')) AS name,
        COUNT(*)                                                              AS count,
        AVG(score)                                                            AS average_score,
        AVG(TIMESTAMP_DIFF(completed_at, started_at, SECOND))                 AS average_time,
        AVG(latitude)                                                         AS latitude,
        AVG(longitude)                                                        AS longitude
    FROM `weeklyfifty_analytics.quiz_results_flat`
    WHERE quiz_id = target_quiz_id
      AND status = 'completed'
    GROUP BY name

    ORDER BY level, count DESC;
END;
