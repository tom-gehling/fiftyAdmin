-- sp_all_quiz_summaries
-- One row per quiz_id. Powers WeeklyQuizStatsComponent's "last N quizzes" chart.
-- The frontend joins rows to Firestore quiz metadata (title, deployment date) by quiz_id.

CREATE OR REPLACE PROCEDURE `weeklyfifty_analytics.sp_all_quiz_summaries`()
BEGIN
    SELECT
        quiz_id,
        COUNTIF(status = 'completed')                                  AS completed_count,
        COUNTIF(was_abandoned)                                         AS abandoned_count,
        AVG(IF(status = 'completed', score, NULL))                     AS avg_score,
        MAX(IF(status = 'completed', score, NULL))                     AS max_score,
        MIN(IF(status = 'completed', score, NULL))                     AS min_score,
        MAX(IF(status = 'completed', completed_at, NULL))              AS latest_completion_at
    FROM `weeklyfifty_analytics.quiz_results_flat`
    WHERE quiz_id IS NOT NULL
    GROUP BY quiz_id
    ORDER BY latest_completion_at DESC;
END;
