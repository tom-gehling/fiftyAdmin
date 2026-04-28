-- sp_user_local_rank
-- Powers local-rank.widget.ts. Window: rolling 12 weeks ending now.
-- Rank is by total score in the window (rewards consistency over a single
-- great week). The widget self-suppresses bottom-50% so we always return data.
--
-- City and country are determined by the user's most-frequent location in
-- the same 12-week window.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_user_local_rank`(IN target_user_id STRING)
BEGIN
    DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 12 WEEK);

    WITH window_sessions AS (
        SELECT
            user_id,
            country,
            city,
            score
        FROM `weeklyfifty_analytics.quiz_results_flat`
        WHERE status = 'completed'
          AND completed_at >= window_start
          AND user_id IS NOT NULL
    ),
    user_location AS (
        SELECT
            (SELECT city    FROM window_sessions WHERE user_id = target_user_id AND city    IS NOT NULL GROUP BY city    ORDER BY COUNT(*) DESC LIMIT 1) AS user_city,
            (SELECT country FROM window_sessions WHERE user_id = target_user_id AND country IS NOT NULL GROUP BY country ORDER BY COUNT(*) DESC LIMIT 1) AS user_country
    ),
    city_user_totals AS (
        SELECT user_id, SUM(score) AS lifetime_window_score, AVG(score) AS user_avg_score
        FROM window_sessions, user_location
        WHERE city = user_city
        GROUP BY user_id
    ),
    country_user_totals AS (
        SELECT user_id, SUM(score) AS lifetime_window_score
        FROM window_sessions, user_location
        WHERE country = user_country
        GROUP BY user_id
    ),
    city_ranked AS (
        SELECT
            user_id,
            DENSE_RANK() OVER (ORDER BY lifetime_window_score DESC) AS rank
        FROM city_user_totals
    ),
    country_ranked AS (
        SELECT
            user_id,
            DENSE_RANK() OVER (ORDER BY lifetime_window_score DESC) AS rank
        FROM country_user_totals
    )
    SELECT
        (SELECT user_city FROM user_location)                                         AS city,
        (SELECT rank FROM city_ranked WHERE user_id = target_user_id)                 AS city_rank,
        (SELECT COUNT(*) FROM city_user_totals)                                       AS city_total_players,
        (SELECT AVG(score) FROM window_sessions, user_location WHERE city = user_city) AS city_avg_score,
        (SELECT user_country FROM user_location)                                      AS country,
        (SELECT rank FROM country_ranked WHERE user_id = target_user_id)              AS country_rank,
        (SELECT COUNT(*) FROM country_user_totals)                                    AS country_total_players;
END;
