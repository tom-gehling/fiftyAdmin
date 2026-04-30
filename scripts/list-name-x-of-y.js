'use strict';

/**
 * Read-only audit: walk every quiz in Firestore and list every question whose
 * text matches "Name <number-word> [of|out of] [the] <number-word>" — where the
 * numbers are spelled alphabetically (e.g. "Name three of the five...").
 *
 * Output: scripts/category-data/_name-x-of-y.txt
 *
 * Usage: node scripts/list-name-x-of-y.js
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
const OUT_FILE = path.join(OUT_DIR, '_name-x-of-y.txt');

const NUM = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million)';
const RE = new RegExp(`\\bname\\s+${NUM}\\s+(?:of|out\\s+of)\\s+(?:the\\s+)?${NUM}\\b`, 'i');

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const stripHtml = (s) =>
    String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&amp;|&quot;|&#39;|&rsquo;|&lsquo;|&ldquo;|&rdquo;|&#8216;?|&#8217;?|&#8220;?|&#8221;?/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

async function main() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log('Fetching all quizzes from Firestore…');
    const snap = await db.collection('quizzes').get();
    console.log(`Loaded ${snap.size} quiz docs.\n`);

    const lines = [];
    let totalQuizzes = 0;
    let totalQuestions = 0;
    let totalMatches = 0;
    let quizzesWithMatches = 0;

    const docs = snap.docs.slice().sort((a, b) => {
        const aQid = Number(a.data()?.quizId ?? 0);
        const bQid = Number(b.data()?.quizId ?? 0);
        return aQid - bQid;
    });

    for (const doc of docs) {
        totalQuizzes++;
        const data = doc.data();
        const quizId = data?.quizId ?? '(no quizId)';
        const quizType = data?.quizType ?? '?';
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        totalQuestions += questions.length;

        const matches = questions.filter((q) => RE.test(stripHtml(q?.question)));

        if (!matches.length) continue;

        quizzesWithMatches++;
        totalMatches += matches.length;

        lines.push(`quiz ${quizId} (type ${quizType}) [${matches.length} match(es) / ${questions.length} total]`);
        for (const q of matches) {
            const qid = q?.questionId ?? '—';
            lines.push(`  qid ${qid} | "${truncate(stripHtml(q?.question), 200)}"`);
        }
        lines.push('');
    }

    const header = [
        `"Name X of Y" report — generated ${new Date().toISOString()}`,
        `Scope: all quizzes (all quizTypes)`,
        `Quizzes scanned:        ${totalQuizzes}`,
        `Quizzes with matches:   ${quizzesWithMatches}`,
        `Questions scanned:      ${totalQuestions}`,
        `Matches found:          ${totalMatches}`,
        '---',
        ''
    ];

    fs.writeFileSync(OUT_FILE, [...header, ...lines].join('\n'));

    console.log(`Quizzes scanned:        ${totalQuizzes}`);
    console.log(`Quizzes with matches:   ${quizzesWithMatches}`);
    console.log(`Questions scanned:      ${totalQuestions}`);
    console.log(`Matches found:          ${totalMatches}`);
    console.log(`\nWrote ${OUT_FILE}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
