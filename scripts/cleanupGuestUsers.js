'use strict';

/**
 * One-off script: Delete all Firestore users where isAdmin and isMember are both falsy (Guests).
 *
 * Usage (from scripts dir):
 *   node cleanupGuestUsers.js
 *
 * Add --dry-run to preview without deleting:
 *   node cleanupGuestUsers.js --dry-run
 */

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

const DRY_RUN = process.argv.includes('--dry-run');

const db = admin.firestore();

async function main() {
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE — documents will be deleted'}\n`);

    const snap = await db.collection('users').get();
    console.log(`Total users fetched: ${snap.size}`);

    const toDelete = snap.docs.filter((doc) => {
        const data = doc.data();
        return !data.isAdmin && !data.isMember;
    });

    console.log(`Users to delete (guests): ${toDelete.length}`);

    if (toDelete.length === 0) {
        console.log('Nothing to do.');
        return;
    }

    // Preview
    console.log('\nGuest users:');
    toDelete.forEach((doc) => {
        const { displayName, email } = doc.data();
        console.log(`  [${doc.id}] ${displayName || '(no name)'} — ${email || '(no email)'}`);
    });

    if (DRY_RUN) {
        console.log('\nDry run complete. Re-run without --dry-run to delete.');
        return;
    }

    // Delete in batches of 500 (Firestore limit)
    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = db.batch();
        toDelete.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        deleted += Math.min(BATCH_SIZE, toDelete.length - i);
        console.log(`Deleted ${deleted} / ${toDelete.length}...`);
    }

    console.log(`\nDone. ${deleted} guest user(s) removed.`);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
