'use strict';

/**
 * One-off script: backfill `category` onto every question in `quizzes/{id}.questions[]`
 * by reading the source-of-truth Excel file at the repo root (`allQuizzes.xlsx`).
 *
 * The xlsx is a stack of quiz blocks. Each block starts with a header row where
 * colB === 'Q' and colC === 'A'; colA of that row is the quizId; colD is 'CATEGORY'.
 * Following rows are questions: colA = q#, colB = question, colC = answer, colD = raw category.
 *
 * Quiz blocks where colA is not an integer (empty or e.g. 'P50') are skipped entirely.
 *
 * Usage (from repo root or scripts dir):
 *   node scripts/backfill-question-categories.js              # dry run
 *   node scripts/backfill-question-categories.js --apply      # write
 *   node scripts/backfill-question-categories.js --quiz 42 --apply   # single quiz
 *
 * Outputs:
 *   stdout       — per-quiz match summary + final stats
 *   scripts/category-data/_unmatched.log — every skipped/unmatched line for review
 *   config/quizCategories — Firestore doc with the canonical set the dropdown reads
 */

const admin = require('firebase-admin');
const XLSX = require('xlsx');
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

const APPLY = process.argv.includes('--apply');
const QUIZ_FLAG_IDX = process.argv.indexOf('--quiz');
const QUIZ_FILTER = QUIZ_FLAG_IDX !== -1 ? Number(process.argv[QUIZ_FLAG_IDX + 1]) : null;
const MAX_FLAG_IDX = process.argv.indexOf('--max');
const MAX_LIMIT = MAX_FLAG_IDX !== -1 ? Number(process.argv[MAX_FLAG_IDX + 1]) : null;

const REPO_ROOT = path.resolve(__dirname, '..');
const XLSX_PATH = path.join(REPO_ROOT, 'allQuizzes.xlsx');
const OUT_DIR = path.join(__dirname, 'category-data');
const UNMATCHED_LOG = path.join(OUT_DIR, '_unmatched.log');
const MATCHED_LOG = path.join(OUT_DIR, '_matched.log');

// ---------------------------------------------------------------------------
// Category normalisation
// ---------------------------------------------------------------------------

const CANONICAL = ['SCIENCE AND TECHNOLOGY', 'FILM AND TV', 'GEOGRAPHY', 'LIT AND ART', 'SPORT', 'BUSINESS AND ECONOMICS', 'MISC', 'HISTORY', 'MUSIC', 'CURRENT EVENTS', 'MATHS AND LOGIC', 'GIMME', 'FOOD AND DRINK'];

function normaliseKey(s) {
    return String(s || '')
        .toUpperCase()
        .replace(/[^A-Z]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const VARIANT_TO_CANONICAL = new Map();
CANONICAL.forEach((c) => VARIANT_TO_CANONICAL.set(normaliseKey(c), c));
[
    ['SCIENCE AND TECH', 'SCIENCE AND TECHNOLOGY'],
    ['SCIENCE AN TECHNOLOGY', 'SCIENCE AND TECHNOLOGY'],
    ['SCIENCE AND TECHNLOGY', 'SCIENCE AND TECHNOLOGY'],
    ['SCIENCE AND TECHNOLOY', 'SCIENCE AND TECHNOLOGY'],
    ['SCIENCE AND TECHONLOGY', 'SCIENCE AND TECHNOLOGY'],
    ['SCIENCE AND TECHNOOGY', 'SCIENCE AND TECHNOLOGY'],
    ['SCIENCE', 'SCIENCE AND TECHNOLOGY'],
    ['FILM AND TELEVISION', 'FILM AND TV'],
    ['FILM ANDTV', 'FILM AND TV'],
    ['GEOGRAHPY', 'GEOGRAPHY'],
    ['GEOGRPAHY', 'GEOGRAPHY'],
    ['GOEGRAPHY', 'GEOGRAPHY'],
    ['GOEOGRAPHY', 'GEOGRAPHY'],
    ['GEOGRAHY', 'GEOGRAPHY'],
    ['LIT ART', 'LIT AND ART'],
    ['LITERATURE', 'LIT AND ART'],
    ['ART AND LITERATURE', 'LIT AND ART'],
    ['BUISNESS AND ECONOMICS', 'BUSINESS AND ECONOMICS'],
    ['BUSINES AND ECONOMICS', 'BUSINESS AND ECONOMICS'],
    ['CURRENT EVENT', 'CURRENT EVENTS'],
    ['CURRENT AFFAIRS', 'CURRENT EVENTS'],
    ['MATH AND LOGIC', 'MATHS AND LOGIC'],
    ['MATHEMATICS AND LOGIC', 'MATHS AND LOGIC']
].forEach(([variant, canonical]) => VARIANT_TO_CANONICAL.set(normaliseKey(variant), canonical));

function resolveCategory(rawCat) {
    if (!rawCat) return null;
    return VARIANT_TO_CANONICAL.get(normaliseKey(rawCat)) ?? null;
}

// ---------------------------------------------------------------------------
// Question normalisation
// ---------------------------------------------------------------------------

function normaliseQuestion(s) {
    return String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&amp;|&quot;|&#39;|&rsquo;|&lsquo;|&ldquo;|&rdquo;|&#8216;?|&#8217;?|&#8220;?|&#8221;?/g, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Jaccard token similarity for "closest match" heuristic in unmatched diagnostics.
function tokenSimilarity(a, b) {
    const ta = new Set(a.split(' ').filter(Boolean));
    const tb = new Set(b.split(' ').filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    const union = ta.size + tb.size - inter;
    return union ? inter / union : 0;
}

// ---------------------------------------------------------------------------
// Parse the xlsx into quiz blocks
// ---------------------------------------------------------------------------

function loadBlocks() {
    if (!fs.existsSync(XLSX_PATH)) {
        throw new Error(`Source xlsx not found at ${XLSX_PATH}`);
    }
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const blocks = [];
    let cur = null;
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const isHeader = String(r[1]).trim() === 'Q' && String(r[2]).trim() === 'A';
        if (isHeader) {
            if (cur) blocks.push(cur);
            const qid = r[0];
            const isInt = qid !== '' && qid !== null && qid !== undefined && Number.isInteger(Number(qid));
            cur = isInt ? { quizId: Number(qid), headerRow: i + 1, questions: [] } : { quizId: null, headerRow: i + 1, skip: true, reason: `non-integer quizId ("${qid}")`, questions: [] };
            continue;
        }
        if (!cur || cur.skip) continue;
        const qText = String(r[1] ?? '').trim();
        if (!qText) continue;
        const rawQNum = r[0];
        const parsedQNum = Number.isInteger(Number(rawQNum)) && rawQNum !== '' ? Number(rawQNum) : null;
        cur.questions.push({
            q: qText,
            a: String(r[2] ?? '').trim(),
            rawCat: String(r[3] ?? '').trim(),
            rowNo: i + 1,
            qNum: parsedQNum ?? cur.questions.length + 1 // fall back to block-local 1-indexed position
        });
    }
    if (cur) blocks.push(cur);
    return blocks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function ensureOutDir() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function main() {
    ensureOutDir();

    console.log(`Mode: ${APPLY ? 'LIVE — Firestore will be updated' : 'DRY RUN (no writes)'}`);
    if (QUIZ_FILTER !== null) console.log(`Filter: only quizId ${QUIZ_FILTER}`);
    if (MAX_LIMIT !== null) console.log(`Limit: first ${MAX_LIMIT} valid quiz blocks`);
    console.log('');

    const blocks = loadBlocks();
    console.log(`Parsed ${blocks.length} quiz blocks from xlsx.`);

    const skippedBlocks = blocks.filter((b) => b.skip);
    let validBlocks = blocks.filter((b) => !b.skip && (QUIZ_FILTER === null || b.quizId === QUIZ_FILTER));
    if (MAX_LIMIT !== null && Number.isFinite(MAX_LIMIT) && MAX_LIMIT > 0) {
        validBlocks = validBlocks.slice(0, MAX_LIMIT);
    }

    if (skippedBlocks.length) console.log(`Skipped (non-integer quizId): ${skippedBlocks.length}`);
    console.log(`Processing: ${validBlocks.length}\n`);

    const unmatchedLines = [];
    skippedBlocks.forEach((b) => unmatchedLines.push(`SKIP block at row ${b.headerRow}: ${b.reason}`));

    const matchedLines = ['quizId | xlsxRow | xQNum→fsQId | matchType | rawCategory | canonicalCategory | action | question'];

    const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
    const stripHtml = (s) =>
        String(s || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|&amp;|&quot;|&#39;|&rsquo;|&lsquo;|&ldquo;|&rdquo;|&#8216;?|&#8217;?|&#8220;?|&#8221;?/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    let totalUpdates = 0;
    let totalQuestionsCategorised = 0;
    let totalUnresolvedCategories = 0;
    let totalUnmatchedQuestions = 0;
    let missingFirestoreQuizzes = 0;
    const usedCanonicalSet = new Set();

    for (const block of validBlocks) {
        const snap = await db.collection('quizzes').where('quizId', '==', block.quizId).limit(1).get();
        if (snap.empty) {
            console.log(`quiz ${block.quizId}: NOT FOUND in Firestore (skipping ${block.questions.length} source rows)`);
            unmatchedLines.push(`MISSING quizId ${block.quizId} (xlsx header row ${block.headerRow}) — no Firestore doc`);
            missingFirestoreQuizzes++;
            continue;
        }
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        const fsQuestions = Array.isArray(data.questions) ? data.questions : [];

        const xlsxByKey = new Map();
        const xlsxByQNum = new Map();
        for (const xq of block.questions) {
            const key = normaliseQuestion(xq.q);
            if (key && !xlsxByKey.has(key)) xlsxByKey.set(key, xq);
            if (xq.qNum != null && !xlsxByQNum.has(xq.qNum)) xlsxByQNum.set(xq.qNum, xq);
        }

        const updated = fsQuestions.map((q) => ({ ...q }));
        let matched = 0;
        let changed = 0;
        const matchedXlsxKeys = new Set();

        // Pre-compute Firestore-side normalised forms for diagnostics on unmatched rows.
        const fsNormalised = fsQuestions.map((q, idx) => ({
            idx,
            questionId: typeof q?.questionId === 'number' ? q.questionId : null,
            raw: String(q?.question ?? ''),
            norm: normaliseQuestion(q?.question)
        }));

        const matchedXlsxQNums = new Set();
        for (let i = 0; i < updated.length; i++) {
            const fq = updated[i];
            const key = normaliseQuestion(fq.question);
            const fsQid = typeof fq?.questionId === 'number' ? fq.questionId : null;

            // Primary: match by normalised text. Fallback: match by questionId == xlsx qNum within the same quiz.
            let xq = key ? xlsxByKey.get(key) : null;
            let matchType = xq ? 'TEXT' : null;
            if (!xq && fsQid != null) {
                const candidate = xlsxByQNum.get(fsQid);
                if (candidate && !matchedXlsxQNums.has(candidate.qNum)) {
                    xq = candidate;
                    matchType = 'QNUM';
                }
            }
            if (!xq) continue;

            matched++;
            if (key) matchedXlsxKeys.add(key);
            matchedXlsxQNums.add(xq.qNum);

            const canonical = resolveCategory(xq.rawCat);
            if (!canonical) {
                if (xq.rawCat) {
                    unmatchedLines.push(`UNRESOLVED CATEGORY quiz ${block.quizId} row ${xq.rowNo} (xlsx qNum ${xq.qNum}, fs qid ${fsQid ?? '—'}): "${xq.rawCat}"`);
                    totalUnresolvedCategories++;
                }
                continue;
            }
            const action = fq.category !== canonical ? 'UPDATE' : 'KEEP';
            if (action === 'UPDATE') {
                updated[i] = { ...fq, category: canonical };
                changed++;
                totalQuestionsCategorised++;
            }
            usedCanonicalSet.add(canonical);
            matchedLines.push(`${block.quizId} | ${xq.rowNo} | xQ${xq.qNum}→fsQ${fsQid ?? '—'} | ${matchType} | ${xq.rawCat} | ${canonical} | ${action} | ${truncate(stripHtml(fq.question), 120)}`);
        }

        const wholeQuizMissed = matched === 0 && fsQuestions.length > 0 && block.questions.length > 0;
        if (wholeQuizMissed) {
            unmatchedLines.push(`--- ZERO MATCHES quiz ${block.quizId} (xlsx ${block.questions.length} qs vs Firestore ${fsQuestions.length} qs) ---`);
            unmatchedLines.push(`  FS  q1 [qid ${fsNormalised[0]?.questionId ?? '—'}] raw : "${truncate(fsNormalised[0]?.raw || '', 200)}"`);
            unmatchedLines.push(`  FS  q1 norm: "${truncate(fsNormalised[0]?.norm || '', 200)}"`);
            unmatchedLines.push(`  XLS q1 [qNum ${block.questions[0]?.qNum}] raw : "${truncate(block.questions[0]?.q || '', 200)}"`);
            unmatchedLines.push(`  XLS q1 norm: "${truncate(normaliseQuestion(block.questions[0]?.q), 200)}"`);
        }

        for (const xq of block.questions) {
            const key = normaliseQuestion(xq.q);
            const matchedByText = key && matchedXlsxKeys.has(key);
            const matchedByQNum = matchedXlsxQNums.has(xq.qNum);
            if (matchedByText || matchedByQNum) continue;

            // Find Firestore neighbour by token similarity AND by questionId == xlsx qNum.
            let best = { sim: 0, fsIdx: -1, fsRaw: '', fsNorm: '', fsQid: null };
            for (const f of fsNormalised) {
                if (!f.norm) continue;
                const sim = tokenSimilarity(key, f.norm);
                if (sim > best.sim) best = { sim, fsIdx: f.idx, fsRaw: f.raw, fsNorm: f.norm, fsQid: f.questionId };
            }
            const sameQid = fsNormalised.find((f) => f.questionId != null && f.questionId === xq.qNum);

            unmatchedLines.push(`UNMATCHED quiz ${block.quizId} row ${xq.rowNo} (xlsx qNum ${xq.qNum})`);
            unmatchedLines.push(`  XLS raw : "${truncate(xq.q, 160)}"`);
            unmatchedLines.push(`  XLS norm: "${truncate(key, 160)}"`);
            if (sameQid) {
                unmatchedLines.push(`  FS @ qid ${sameQid.questionId} (positional match)`);
                unmatchedLines.push(`    FS raw : "${truncate(sameQid.raw, 160)}"`);
                unmatchedLines.push(`    FS norm: "${truncate(sameQid.norm, 160)}"`);
            } else {
                unmatchedLines.push(`  FS @ qid ${xq.qNum}: (no Firestore question with that questionId)`);
            }
            if (best.fsIdx === -1) {
                unmatchedLines.push(`  CLOSEST-TEXT FS : (none — Firestore has no comparable questions)`);
            } else if (!sameQid || best.fsIdx !== sameQid.idx) {
                unmatchedLines.push(`  CLOSEST-TEXT FS [arrIdx ${best.fsIdx}, qid ${best.fsQid ?? '—'}, sim ${best.sim.toFixed(2)}]`);
                unmatchedLines.push(`    FS raw : "${truncate(best.fsRaw, 160)}"`);
                unmatchedLines.push(`    FS norm: "${truncate(best.fsNorm, 160)}"`);
            }
            totalUnmatchedQuestions++;
        }

        console.log(`quiz ${block.quizId}: ${matched}/${block.questions.length} matched, ${changed} updated${wholeQuizMissed ? ' [ZERO MATCHES — see log]' : ''}`);

        if (changed > 0 && APPLY) {
            await docSnap.ref.update({ questions: updated });
            totalUpdates++;
        } else if (changed > 0) {
            totalUpdates++;
        }
    }

    if (APPLY && usedCanonicalSet.size > 0 && QUIZ_FILTER === null) {
        await db.doc('config/quizCategories').set(
            {
                values: admin.firestore.FieldValue.arrayUnion(...usedCanonicalSet),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'backfill-question-categories.js'
            },
            { merge: true }
        );
        console.log(`\nUnioned ${usedCanonicalSet.size} canonical values into config/quizCategories.`);
    }

    fs.writeFileSync(UNMATCHED_LOG, unmatchedLines.join('\n') + '\n');
    fs.writeFileSync(MATCHED_LOG, matchedLines.join('\n') + '\n');

    console.log('\n--- SUMMARY ---');
    console.log(`Quizzes processed:           ${validBlocks.length}`);
    console.log(`Quizzes skipped (non-int):   ${skippedBlocks.length}`);
    console.log(`Quizzes missing in Firestore:${missingFirestoreQuizzes}`);
    console.log(`Quizzes ${APPLY ? 'updated' : 'with pending updates'}: ${totalUpdates}`);
    console.log(`Question categories ${APPLY ? 'written' : 'pending'}: ${totalQuestionsCategorised}`);
    console.log(`Questions in xlsx with no Firestore match: ${totalUnmatchedQuestions}`);
    console.log(`Source rows with unresolvable category:    ${totalUnresolvedCategories}`);
    console.log(`Canonical categories used: ${[...usedCanonicalSet].sort().join(', ') || '(none)'}`);
    console.log(`\nMatched log:   ${MATCHED_LOG} (${matchedLines.length - 1} rows)`);
    console.log(`Unmatched log: ${UNMATCHED_LOG} (${unmatchedLines.length} rows)`);
    if (!APPLY) console.log('\nDRY RUN — re-run with --apply to write changes.');
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
