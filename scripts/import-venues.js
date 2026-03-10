/**
 * One-off script: import venues from WP Go Maps JSON export into Firestore.
 *
 * Skips any venue whose lat/lng is within ~100m of an existing Firestore venue.
 *
 * Usage:
 *   cd functions
 *   node ../scripts/import-venues.js
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const serviceAccount = require('../secrets/adminSDK.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'weeklyfifty-7617b'
});

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Category ID → JS day-of-week (0=Sun … 6=Sat)
// ---------------------------------------------------------------------------

const CATEGORY_TO_DAY = {
    1: 1, // Monday
    2: 2, // Tuesday
    3: 3, // Wednesday
    4: 4, // Thursday
    5: 5 // Friday
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags from a string */
function stripHtml(str) {
    return str
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .trim();
}

/**
 * Parse start time from a description string.
 * Looks for patterns like "6pm", "6.30pm", "7.30pm".
 * Returns "HH:MM" in 24-hour format, defaults to "19:00".
 */
function parseStartTime(description) {
    const text = stripHtml(description);
    const match = text.match(/(\d{1,2})(?:[.:](\d{2}))?\s*pm/i);
    if (!match) return '19:00';
    const hours = (parseInt(match[1], 10) % 12) + 12;
    const minutes = match[2] ? match[2] : '00';
    return `${hours}:${minutes}`;
}

/**
 * Parse schedule type from description text.
 * Returns 'weekly' | 'biweekly' | 'monthly'
 */
function parseScheduleType(description) {
    const text = stripHtml(description).toLowerCase();
    if (text.includes('fortnightly') || text.includes('biweekly')) return 'biweekly';
    if (text.includes('monthly')) return 'monthly';
    return 'weekly';
}

/**
 * Parse a WP Go Maps address string into structured location fields.
 * Format: "[Venue Name], [Street], [Suburb STATE], [Country]"
 */
function parseAddress(raw) {
    const parts = raw.split(', ').map((p) => p.trim());

    if (parts.length < 3) {
        return { address: raw, city: '', state: undefined, country: 'Australia' };
    }

    const country = parts[parts.length - 1];
    const cityStateStr = parts[parts.length - 2];

    // "Unley SA" → city="Unley", state="SA"
    // "McLaren Vale SA" → city="McLaren Vale", state="SA"
    const cityStateParts = cityStateStr.split(' ');
    const state = cityStateParts.length > 1 ? cityStateParts[cityStateParts.length - 1] : undefined;
    const city = cityStateParts.slice(0, -1).join(' ');

    // Everything between the first part (venue name) and the city/country parts
    const streetParts = parts.slice(1, parts.length - 2);
    const streetAddr = streetParts.join(', ');

    return {
        address: streetAddr || parts[0], // fallback to first part if no street
        city,
        state,
        country
    };
}

/**
 * Check whether two lat/lng pairs are within ~100 metres of each other.
 */
function isNearby(lat1, lng1, lat2, lng2) {
    return Math.abs(lat1 - lat2) < 0.001 && Math.abs(lng1 - lng2) < 0.001;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const jsonPath = path.resolve(__dirname, '..', 'theweeklyfifty.wpgooglemaps.2026-03-10.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const markers = raw.markers || [];

    console.log(`Found ${markers.length} markers in export file.`);

    // Load all existing venues from Firestore
    const existingSnap = await db.collection('venues').get();
    const existing = existingSnap.docs.map((d) => {
        const data = d.data();
        return {
            lat: data.location?.latitude ?? 0,
            lng: data.location?.longitude ?? 0
        };
    });

    console.log(`Found ${existing.length} existing venues in Firestore.`);

    let imported = 0;
    let skipped = 0;

    for (const marker of markers) {
        if (marker.approved !== '1') {
            console.log(`  SKIP (not approved): ${marker.title}`);
            skipped++;
            continue;
        }

        const lat = parseFloat(marker.lat);
        const lng = parseFloat(marker.lng);

        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
            console.log(`  SKIP (no coordinates): ${marker.title}`);
            skipped++;
            continue;
        }

        // Dedup check against existing Firestore venues
        const duplicate = existing.some((e) => isNearby(lat, lng, e.lat, e.lng));
        if (duplicate) {
            console.log(`  SKIP (already exists): ${marker.title}`);
            skipped++;
            continue;
        }

        const locParsed = parseAddress(marker.address || '');
        const schedType = parseScheduleType(marker.description || '');
        const startTime = parseStartTime(marker.description || '');
        const dayOfWeek = CATEGORY_TO_DAY[String(marker.category)];

        const schedule = {
            type: schedType,
            isActive: true,
            startTime,
            ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
            // For monthly, weekOfMonth defaults to 1 — review and update in the admin UI as needed.
            ...(schedType === 'monthly' ? { weekOfMonth: 1 } : {})
        };

        const venue = {
            venueName: (marker.title || '').trim(),
            location: {
                address: locParsed.address,
                city: locParsed.city,
                state: locParsed.state,
                country: locParsed.country,
                latitude: lat,
                longitude: lng
            },
            websiteUrl: marker.link || '',
            quizSchedules: [schedule],
            isActive: true,
            createdBy: 'import-script',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
            // imageUrl intentionally omitted — user will re-upload images
        };
        // Remove undefined values (Firestore rejects them)
        if (!venue.location.state) delete venue.location.state;

        await db.collection('venues').add(venue);

        // Track for dedup within this run
        existing.push({ lat, lng });

        // console.log(`\n  WOULD IMPORT: ${marker.title}`);
        // console.log(JSON.stringify(venue, null, 2));
        imported++;
    }

    console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
});
