const admin = require('firebase-admin');
const path = require('path');
const luxon = require('luxon');

const serviceAccount = require(path.join(__dirname, '../secrets/adminSDK.json'));

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err);
    process.exit(1);
}

const db = admin.firestore();

// Set to true to delete all quizAggregates docs with quizId >= 10000 before building
const CLEANUP_FIFTY_PLUS = false;

// Range of quizIds to process (numeric comparison, quizIds are strings)
const QUIZ_ID_MIN = 9999; // exclusive
const QUIZ_ID_MAX = 50000; // exclusive

async function buildQuizAggregates() {
    const quizzesSnapshot = await db.collection('quizzes').get();
    const quizIds = quizzesSnapshot.docs
        .map((doc) => doc.data().quizId)
        .filter((id) => {
            const numId = parseInt(id, 10);
            return !isNaN(numId) && numId > QUIZ_ID_MIN && numId < QUIZ_ID_MAX;
        })
        .map((id) => String(id))
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    console.log(`Found ${quizIds.length} quizzes in range (${QUIZ_ID_MIN}, ${QUIZ_ID_MAX}): ${quizIds.join(', ')}`);

    for (const quizId of quizIds) {
        console.log(`\n=== Processing quizId ${quizId} ===`);
        let snapshot;
        try {
            snapshot = await db.collection('quizResults').where('quizId', '==', quizId).get();
            console.log(`Found ${snapshot.size} results`);
        } catch (err) {
            console.error(`❌ Failed to fetch quizResults for quizId ${quizId}:`, err);
            continue;
        }

        const aggregates = {};
        const retroAggregates = {};

        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                const qId = data['quizId'];
                if (qId !== quizId) continue;

                const isRetro = data['retro'] === true;

                const aggMap = isRetro ? retroAggregates : aggregates;
                const aggKey = isRetro ? `${qId}_retro` : qId;

                if (!aggMap[aggKey]) {
                    aggMap[aggKey] = {
                        completedCount: 0,
                        inProgressCount: 0,
                        abandonedCount: 0,
                        totalScore: 0,
                        totalTime: 0,
                        hourlyCounts: {},
                        locationCounts: {},
                        questionStats: {},
                        sequentialQuestionTimes: [],
                        maxScore: Number.NEGATIVE_INFINITY,
                        minScore: Number.POSITIVE_INFINITY,
                        validStatsCount: 0
                    };
                }

                const agg = aggMap[aggKey];

                // Parse timestamps
                let startedAt, completedAt;
                try {
                    startedAt = data['startedAt'] && data['startedAt'].toDate ? data['startedAt'].toDate() : new Date(data['startedAt']);
                    completedAt = data['completedAt'] && data['completedAt'].toDate ? data['completedAt'].toDate() : data['completedAt'] ? new Date(data['completedAt']) : null;
                } catch (err) {
                    console.error(`❌ Failed to parse timestamps for quizId ${qId}:`, err);
                    continue;
                }

                // Hourly counts (Adelaide time)
                if (startedAt) {
                    const startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone('Australia/Adelaide');
                    const hourKey = startedAdelaide.toFormat('yyyy-MM-dd HH');
                    agg.hourlyCounts[hourKey] = (agg.hourlyCounts[hourKey] || 0) + 1;
                }

                // Location counts (placeholder)
                const locKey = 'Unknown - Unknown';
                agg.locationCounts[locKey] = (agg.locationCounts[locKey] || 0) + 1;

                // Status-based logic
                if (completedAt) {
                    const answers = data['answers'] || [];
                    const score = data['score'] || 0;
                    const isShort = answers.length < 5;

                    agg.completedCount++;
                    agg.totalScore += score;

                    let duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
                    if (duration > 3 * 60 * 60) duration = 3 * 60 * 60;
                    agg.totalTime += duration;

                    for (const ans of answers) {
                        const qid = String(ans['questionId']);
                        if (!agg.questionStats[qid]) agg.questionStats[qid] = { correct: 0, total: 0 };
                        agg.questionStats[qid].total++;
                        if (ans['correct']) agg.questionStats[qid].correct++;
                    }

                    if (!isShort) {
                        agg.validStatsCount++;
                        if (score > agg.maxScore) agg.maxScore = score;
                        if (score < agg.minScore) agg.minScore = score;

                        const sortedAnswers = answers.filter((a) => a.timestamp).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                        for (let i = 1; i < sortedAnswers.length; i++) {
                            const prev = new Date(sortedAnswers[i - 1].timestamp).getTime();
                            const curr = new Date(sortedAnswers[i].timestamp).getTime();
                            const diffSec = (curr - prev) / 1000;
                            if (diffSec > 0 && diffSec <= 10 * 60) {
                                agg.sequentialQuestionTimes.push({
                                    questionId: sortedAnswers[i - 1].questionId,
                                    diffSec: diffSec
                                });
                            }
                        }
                    }
                } else if (data['status'] === 'in_progress') {
                    const duration = (new Date().getTime() - startedAt.getTime()) / 1000;
                    if (duration > 3 * 60 * 60) agg.abandonedCount++;
                    else agg.inProgressCount++;
                } else {
                    agg.abandonedCount++;
                }
            } catch (err) {
                console.error('❌ Failed to process document:', err);
            }
        }

        // Compute derived aggregates for both normal and retro
        for (const agg of [...Object.values(aggregates), ...Object.values(retroAggregates)]) {
            agg.avgTimeBetweenQuestions = agg.sequentialQuestionTimes.length > 0 ? agg.sequentialQuestionTimes.reduce((a, b) => a + b.diffSec, 0) / agg.sequentialQuestionTimes.length : 0;

            const perQuestion = {};
            for (const entry of agg.sequentialQuestionTimes) {
                if (!perQuestion[entry.questionId]) perQuestion[entry.questionId] = { total: 0, count: 0 };
                perQuestion[entry.questionId].total += entry.diffSec;
                perQuestion[entry.questionId].count++;
            }

            agg.avgTimeBetweenByQuestion = Object.entries(perQuestion).map(([questionId, stat]) => ({
                questionId,
                avgDiffSec: stat.total / stat.count
            }));

            if (agg.maxScore === Number.NEGATIVE_INFINITY) agg.maxScore = 0;
            if (agg.minScore === Number.POSITIVE_INFINITY) agg.minScore = 0;
        }

        function buildAggDocPayload(docId, agg) {
            const averageScore = agg.validStatsCount > 0 ? agg.totalScore / agg.validStatsCount : 0;
            const averageTime = agg.validStatsCount > 0 ? agg.totalTime / agg.validStatsCount : 0;
            const questionAccuracy = Object.entries(agg.questionStats).map(([qid, stat]) => ({
                questionId: qid,
                totalAttempts: stat.total,
                correctCount: stat.correct,
                correctRate: stat.total > 0 ? stat.correct / stat.total : 0
            }));
            return {
                quizId: docId,
                completedCount: agg.completedCount,
                inProgressCount: agg.inProgressCount,
                abandonedCount: agg.abandonedCount,
                totalScore: agg.totalScore,
                totalTime: agg.totalTime,
                averageScore,
                averageTime,
                hourlyCounts: agg.hourlyCounts,
                locationCounts: agg.locationCounts,
                questionStats: agg.questionStats,
                questionAccuracy,
                hardestQuestions: [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5),
                easiestQuestions: [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5),
                avgTimeBetweenQuestions: agg.avgTimeBetweenQuestions,
                avgTimeBetweenByQuestion: agg.avgTimeBetweenByQuestion,
                maxScore: agg.maxScore,
                minScore: agg.minScore,
                validStatsCount: agg.validStatsCount,
                updatedAt: new Date()
            };
        }

        // Write to Firestore
        try {
            const batch = db.batch();

            for (const [docId, agg] of Object.entries(aggregates)) {
                const docRef = db.collection('quizAggregates').doc(String(docId));
                batch.set(docRef, buildAggDocPayload(docId, agg));
            }

            for (const [docId, agg] of Object.entries(retroAggregates)) {
                const docRef = db.collection('quizAggregates').doc(String(docId));
                batch.set(docRef, { ...buildAggDocPayload(docId, agg), retro: true });
            }

            await batch.commit();
            console.log(`✅ Wrote ${Object.keys(aggregates).length} normal + ${Object.keys(retroAggregates).length} retro aggregates for quizId ${quizId}.`);
        } catch (err) {
            console.error(`❌ Failed to write aggregates to Firestore for quizId ${quizId}:`, err);
        }
    }
}

async function cleanupFiftyPlusAggregates() {
    console.log('\n=== Cleaning up quizAggregates for quizId >= 10000 (including retro) ===');
    const snapshot = await db.collection('quizAggregates').get();
    const toDelete = snapshot.docs.filter((doc) => {
        // parseInt handles both "10001" and "10001_retro" (stops at underscore)
        const numId = parseInt(doc.id, 10);
        return !isNaN(numId) && numId >= 10000;
    });

    if (toDelete.length === 0) {
        console.log('No documents found to delete.');
        return;
    }

    const batch = db.batch();
    toDelete.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✅ Deleted ${toDelete.length} quizAggregates documents.`);
}

async function main() {
    if (CLEANUP_FIFTY_PLUS) {
        await cleanupFiftyPlusAggregates();
    }
    await buildQuizAggregates();
}

main()
    .then(() => {
        console.log('All done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    });
