-- fs_ts(json_subtree)
-- Parses a Firestore-exported timestamp into a BigQuery TIMESTAMP.
-- The Firebase→BigQuery extension exports Firestore Timestamps as
-- {"_seconds": N, "_nanoseconds": M} objects, but legacy rows can also be
-- ISO-8601 strings. JSON_VALUE returns NULL for objects, so naive
-- TIMESTAMP(JSON_VALUE(...)) silently produces NULL on every modern row.
--
-- Pass the field already extracted via JSON_VALUE for ISO-string fields, OR
-- the field name path so the UDF can probe for ._seconds. Easiest call site:
--   weeklyfifty_analytics.fs_ts(JSON_VALUE(data, '$.completedAt'),
--                               JSON_VALUE(data, '$.completedAt._seconds'))

CREATE OR REPLACE FUNCTION `weeklyfifty_analytics.fs_ts`(iso_str STRING, fs_seconds STRING)
RETURNS TIMESTAMP AS (
    COALESCE(
        TIMESTAMP_SECONDS(SAFE_CAST(fs_seconds AS INT64)),
        SAFE.TIMESTAMP(iso_str)
    )
);
