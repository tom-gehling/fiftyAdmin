<?php
/**
 * Plugin Name: Fifty Venues Sync
 * Description: Syncs quiz venues from the Fifty API into WP Go Maps (map ID 1).
 *              Runs hourly via WP-Cron. Supports manual sync from Tools → Sync Venues.
 * Version: 1.0
 */
defined('ABSPATH') || exit;

define('FIFTY_VENUES_API',      'https://weeklyfifty-7617b.web.app/api/getVenues');
define('FIFTY_VENUES_MAP_ID',   3);
define('FIFTY_VENUES_MAPPING',  'fifty_venues_marker_mapping');
define('FIFTY_VENUES_LAST',     'fifty_venues_last_sync');
define('FIFTY_VENUES_CRON',     'fifty_venues_sync_event');

// Maps day-of-week (0=Sun … 6=Sat) to WP Go Maps category IDs
define('FIFTY_DAY_CATEGORY_MAP', [1 => 1, 2 => 2, 3 => 3, 4 => 4, 5 => 5, 6 => 6, 7 => 7]);

// ---------------------------------------------------------------------------
// Activation / Deactivation
// ---------------------------------------------------------------------------

register_activation_hook(__FILE__, function () {
    if (!wp_next_scheduled(FIFTY_VENUES_CRON)) {
        wp_schedule_event(time(), 'hourly', FIFTY_VENUES_CRON);
    }
    fifty_venues_sync();
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook(FIFTY_VENUES_CRON);
});

// ---------------------------------------------------------------------------
// Cron handler
// ---------------------------------------------------------------------------

add_action(FIFTY_VENUES_CRON, 'fifty_venues_sync');

function fifty_venues_sync(): void {
    global $wpdb;

    $response = wp_remote_get(FIFTY_VENUES_API, ['timeout' => 15]);
    if (is_wp_error($response)) {
        error_log('[Fifty Venues] API error: ' . $response->get_error_message());
        return;
    }

    $venues = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($venues)) {
        error_log('[Fifty Venues] Invalid API response');
        return;
    }

    $table   = $wpdb->prefix . 'wpgmza';
    $mapping = get_option(FIFTY_VENUES_MAPPING, []);   // [ firebase_id => marker_db_id ]
    $seen    = [];

    foreach ($venues as $venue) {
        $fid = $venue['id'] ?? null;
        if (!$fid) continue;
        $seen[] = $fid;

        $day_map  = FIFTY_DAY_CATEGORY_MAP;
        $day      = isset($venue['dayOfWeek']) && $venue['dayOfWeek'] !== null ? intval($venue['dayOfWeek']) : null;
        $category = ($day !== null && isset($day_map[$day])) ? $day_map[$day] : '';

        $row = [
            'map_id'      => FIFTY_VENUES_MAP_ID,
            'title'       => sanitize_text_field($venue['title']       ?? ''),
            'address'     => sanitize_text_field($venue['address']     ?? ''),
            'lat'         => floatval($venue['lat']                    ?? 0),
            'lng'         => floatval($venue['lng']                    ?? 0),
            'description' => wp_kses_post($venue['description']        ?? ''),
            'link'        => esc_url_raw($venue['link']                ?? ''),
            'pic'         => esc_url_raw($venue['pic']                 ?? ''),
            'approved'    => 1,
            'anim'        => 0,
            'infoopen'    => 0,
            'category'    => $category,
        ];

        if (isset($mapping[$fid])) {
            $wpdb->update($table, $row, ['id' => intval($mapping[$fid])]);
        } else {
            $wpdb->insert($table, $row);
            $mapping[$fid] = $wpdb->insert_id;
        }
    }

    // Remove markers for venues no longer in the API response
    $removed = array_diff(array_keys($mapping), $seen);
    foreach ($removed as $fid) {
        $wpdb->delete($table, ['id' => intval($mapping[$fid])]);
        unset($mapping[$fid]);
    }

    update_option(FIFTY_VENUES_MAPPING, $mapping);
    update_option(FIFTY_VENUES_LAST, current_time('mysql'));
}

// ---------------------------------------------------------------------------
// Admin page: Tools → Sync Venues
// ---------------------------------------------------------------------------

add_action('admin_menu', function () {
    add_management_page(
        'Sync Venues',
        'Sync Venues',
        'manage_options',
        'fifty-venues-sync',
        'fifty_venues_admin_page'
    );
});

function fifty_venues_admin_page(): void {
    $message = '';

    if (isset($_POST['fifty_sync_now']) && check_admin_referer('fifty_sync_now')) {
        fifty_venues_sync();
        $message = 'Venues synced successfully.';
    }

    if (isset($_POST['fifty_clear']) && check_admin_referer('fifty_sync_now')) {
        global $wpdb;
        $mapping = get_option(FIFTY_VENUES_MAPPING, []);
        $table   = $wpdb->prefix . 'wpgmza';
        foreach ($mapping as $marker_id) {
            $wpdb->delete($table, ['id' => intval($marker_id)]);
        }
        delete_option(FIFTY_VENUES_MAPPING);
        delete_option(FIFTY_VENUES_LAST);
        $message = 'All synced markers removed.';
    }

    $last     = get_option(FIFTY_VENUES_LAST, 'Never');
    $mapping  = get_option(FIFTY_VENUES_MAPPING, []);
    $next_ts  = wp_next_scheduled(FIFTY_VENUES_CRON);
    $next     = $next_ts ? get_date_from_gmt(date('Y-m-d H:i:s', $next_ts), 'D j M Y, g:i a') : 'Not scheduled';
    ?>
    <div class="wrap">
        <h1>Fifty Venues Sync</h1>

        <?php if ($message): ?>
            <div class="notice notice-success is-dismissible"><p><?php echo esc_html($message); ?></p></div>
        <?php endif; ?>

        <table class="form-table">
            <tr><th>Venues synced</th><td><?php echo count($mapping); ?></td></tr>
            <tr><th>Last sync</th>     <td><?php echo esc_html($last); ?></td></tr>
            <tr><th>Next auto-sync</th><td><?php echo esc_html($next); ?></td></tr>
            <tr><th>API endpoint</th>  <td><code><?php echo esc_html(FIFTY_VENUES_API); ?></code></td></tr>
            <tr><th>Map ID</th>        <td><?php echo FIFTY_VENUES_MAP_ID; ?></td></tr>
        </table>

        <form method="post" style="display:inline-block;margin-right:10px;">
            <?php wp_nonce_field('fifty_sync_now'); ?>
            <input type="submit" name="fifty_sync_now" class="button button-primary" value="Sync Now">
        </form>

        <form method="post" style="display:inline-block;"
              onsubmit="return confirm('This will delete all synced markers from the map. Continue?');">
            <?php wp_nonce_field('fifty_sync_now'); ?>
            <input type="submit" name="fifty_clear" class="button button-secondary" value="Clear All Synced Markers">
        </form>
    </div>
    <?php
}
