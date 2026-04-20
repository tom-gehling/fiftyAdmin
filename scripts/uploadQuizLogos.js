/**
 * One-off migration script: upload static quiz logo files from src/assets/logos
 * to Firebase Storage (quizLogos/{quizId}/...) and update each quiz's imageUrl
 * in Firestore to the full download URL.
 *
 * Only processes quizzes whose imageUrl is a bare filename (not already a URL).
 *
 * Usage:
 *   cd functions
 *   node ../scripts/uploadQuizLogos.js
 */

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const serviceAccount = require('../secrets/adminSDK.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'weeklyfifty-7617b.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const LOGOS_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'logos');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isUrl(value) {
    return typeof value === 'string' && value.startsWith('https://');
}

async function uploadLogoToStorage(localPath, quizId, filename) {
    const token = crypto.randomUUID();
    const storagePath = `quizLogos/${quizId}/${Date.now()}_${filename}`;

    await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
            metadata: {
                firebaseStorageDownloadTokens: token
            }
        }
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` + `${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

    return downloadUrl;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const snapshot = await db.collection('quizzes').get();
    console.log(`Found ${snapshot.size} quizzes in Firestore.`);

    let migrated = 0;
    let skipped = 0;
    let missing = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const imageUrl = data.imageUrl;

        // Skip quizzes with no imageUrl, or already a full URL
        if (!imageUrl || isUrl(imageUrl)) {
            skipped++;
            continue;
        }

        const filename = imageUrl;
        const localPath = path.join(LOGOS_DIR, filename);

        if (!fs.existsSync(localPath)) {
            console.warn(`  MISSING local file for quiz ${data.quizId} ("${filename}")`);
            missing++;
            continue;
        }

        console.log(`  Uploading "${filename}" for quiz ${data.quizId}…`);

        try {
            const url = await uploadLogoToStorage(localPath, data.quizId, filename);
            await doc.ref.update({ imageUrl: url });
            console.log(`    → ${url}`);
            migrated++;
        } catch (err) {
            console.error(`  ERROR uploading for quiz ${data.quizId}:`, err.message);
        }
    }

    console.log(`\nDone. Migrated: ${migrated}, Already URL / skipped: ${skipped}, Missing file: ${missing}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
