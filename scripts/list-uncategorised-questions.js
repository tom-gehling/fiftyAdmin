'use strict';

/**
 * Read-only audit: walk every Weekly quiz (quizType === 1) in Firestore and
 * list every question that has no `category` field (or an empty/whitespace-only one).
 *
 * Output: scripts/category-data/_uncategorised.txt
 *   quiz <quizId> [<n> uncategorised / <total> total]
 *     qid <questionId> | "question text (truncated)"
 *     ...
 *
 * Usage: node scripts/list-uncategorised-questions.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../secrets/adminSDK.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'weeklyfifty-7617b'
});

const db = admin.firestore();

const OUT_DIR = path.join(__dirname, 'category-data');
const OUT_FILE = path.join(OUT_DIR, '_uncategorised.txt');

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const stripHtml = (s) =>
    String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&amp;|&quot;|&#39;|&rsquo;|&lsquo;|&ldquo;|&rdquo;|&#8216;?|&#8217;?|&#8220;?|&#8221;?/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

async function main() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log('Fetching Weekly quizzes (quizType === 1) from Firestore…');
    const snap = await db.collection('quizzes').where('quizType', '==', 1).get();
    console.log(`Loaded ${snap.size} weekly quiz docs.\n`);

    const lines = [];
    let totalQuizzes = 0;
    let totalUncategorised = 0;
    let totalQuestions = 0;
    let quizzesWithGaps = 0;

    const docs = snap.docs.slice().sort((a, b) => {
        const aQid = Number(a.data()?.quizId ?? 0);
        const bQid = Number(b.data()?.quizId ?? 0);
        return aQid - bQid;
    });

    for (const doc of docs) {
        totalQuizzes++;
        const data = doc.data();
        const quizId = data?.quizId ?? '(no quizId)';
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        totalQuestions += questions.length;

        const missing = questions.filter((q) => {
            const c = String(q?.category ?? '').trim();
            return !c;
        });

        if (!missing.length) continue;

        quizzesWithGaps++;
        totalUncategorised += missing.length;

        lines.push(`quiz ${quizId} [${missing.length} uncategorised / ${questions.length} total]`);
        for (const q of missing) {
            const qid = q?.questionId ?? '—';
            lines.push(`  qid ${qid} | "${truncate(stripHtml(q?.question), 160)}"`);
        }
        lines.push('');
    }

    const header = [
        `Uncategorised questions report — generated ${new Date().toISOString()}`,
        `Scope: Weekly quizzes only (quizType === 1)`,
        `Quizzes scanned:           ${totalQuizzes}`,
        `Quizzes with gaps:         ${quizzesWithGaps}`,
        `Questions scanned:         ${totalQuestions}`,
        `Questions uncategorised:   ${totalUncategorised}`,
        '---',
        ''
    ];

    fs.writeFileSync(OUT_FILE, [...header, ...lines].join('\n'));

    console.log(`Quizzes scanned:         ${totalQuizzes}`);
    console.log(`Quizzes with gaps:       ${quizzesWithGaps}`);
    console.log(`Questions scanned:       ${totalQuestions}`);
    console.log(`Questions uncategorised: ${totalUncategorised}`);
    console.log(`\nWrote ${OUT_FILE}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
