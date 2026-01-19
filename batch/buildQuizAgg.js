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

// Static array of quizIds
const quizIds = ['186'];

async function buildQuizAggregates() {
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

        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                const qId = data['quizId'];
                if (qId !== quizId) continue;

                if (!aggregates[qId]) {
                    aggregates[qId] = {
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

                const agg = aggregates[qId];

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

        // Compute derived aggregates
        for (const agg of Object.values(aggregates)) {
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

        // Write to Firestore
        try {
            const batch = db.batch();

            for (const [qId, agg] of Object.entries(aggregates)) {
                const averageScore = agg.validStatsCount > 0 ? agg.totalScore / agg.validStatsCount : 0;
                const averageTime = agg.validStatsCount > 0 ? agg.totalTime / agg.validStatsCount : 0;

                const questionAccuracy = Object.entries(agg.questionStats).map(([qid, stat]) => ({
                    questionId: qid,
                    totalAttempts: stat.total,
                    correctCount: stat.correct,
                    correctRate: stat.total > 0 ? stat.correct / stat.total : 0
                }));

                const hardestQuestions = [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
                const easiestQuestions = [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);
                // console.log(averageScore);
                // console.log(easiestQuestions);
                // console.log(hardestQuestions);
                const docRef = db.collection('quizAggregates').doc(String(qId));
                batch.set(docRef, {
                    quizId: qId,
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
                    hardestQuestions,
                    easiestQuestions,
                    avgTimeBetweenQuestions: agg.avgTimeBetweenQuestions,
                    avgTimeBetweenByQuestion: agg.avgTimeBetweenByQuestion,
                    maxScore: agg.maxScore,
                    minScore: agg.minScore,
                    validStatsCount: agg.validStatsCount,
                    updatedAt: new Date()
                });

                // console.log(averageScore);
                // console.log(hardestQuestions);
                // console.log(easiestQuestions);
            }

            await batch.commit();
            console.log(`✅ Wrote ${Object.keys(aggregates).length} quiz aggregates for quizId ${quizId}.`);
        } catch (err) {
            console.error(`❌ Failed to write aggregates to Firestore for quizId ${quizId}:`, err);
        }
    }
}

buildQuizAggregates()
    .then(() => {
        console.log('All done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Unexpected error:', err);
        process.exit(1);
    });
