import * as admin from 'firebase-admin';
import * as path from 'path';
const luxon = require('luxon');

const serviceAccount = require(path.join(__dirname, 'adminSDK.json'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin:', err);
  process.exit(1);
}

const db = admin.firestore();

async function buildQuizAggregates() {
  let snapshot;
  try {
    console.log('Loading quizResults for quizId 177...');
    snapshot = await db.collection('quizResults')
      .where('quizId', '==', "177")
      .get();
    console.log(`Found ${snapshot.size} results`);
  } catch (err) {
    console.error('❌ Failed to fetch quizResults:', err);
    return;
  }

  const aggregates: Record<string, any> = {};

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data() as any;
      const quizId = data['quizId'];
      if (quizId !== "177") continue;

      if (!aggregates[quizId]) {
        aggregates[quizId] = {
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

      const agg = aggregates[quizId];

      // Parse timestamps
      let startedAt: Date, completedAt: Date | null;
      try {
        startedAt = data['startedAt']?.toDate?.() ?? new Date(data['startedAt']);
        completedAt = data['completedAt']?.toDate?.() ?? (data['completedAt'] ? new Date(data['completedAt']) : null);
      } catch (err) {
        console.error(`❌ Failed to parse timestamps for quizId ${quizId}:`, err);
        continue;
      }

      // Hourly counts (Adelaide time)
      if (startedAt) {
        const startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone('Australia/Adelaide');
        const hourKey = startedAdelaide.toFormat('yyyy-MM-dd HH');
        agg.hourlyCounts[hourKey] = (agg.hourlyCounts[hourKey] || 0) + 1;
      }

      // Location counts (placeholder)
      const locKey = "Unknown - Unknown";
      agg.locationCounts[locKey] = (agg.locationCounts[locKey] || 0) + 1;

      // Status-based logic
      if (completedAt) {
        const answers = data['answers'] || [];
        const score = data['score'] ?? 0;
        const isShort = answers.length < 5; // exclude short runs from derived stats

        agg.completedCount++;
        agg.totalScore += score;

        // Calculate total duration
        let duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
        if (duration > 3 * 60 * 60) duration = 3 * 60 * 60; // cap at 3 hours
        agg.totalTime += duration;

        // Record question correctness (all)
        for (const ans of answers) {
          const qid = String(ans['questionId']);
          if (!agg.questionStats[qid]) agg.questionStats[qid] = { correct: 0, total: 0 };
          agg.questionStats[qid].total++;
          if (ans['correct']) agg.questionStats[qid].correct++;
        }

        // Derived stats only if valid (>=5 answers)
        if (!isShort) {
          agg.validStatsCount++;

          // Max / Min scores
          if (score > agg.maxScore) agg.maxScore = score;
          if (score < agg.minScore) agg.minScore = score;

          // Calculate sequential question times from answer timestamps
          const sortedAnswers = [...answers]
            .filter(a => a.timestamp)
            .sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

          for (let i = 1; i < sortedAnswers.length; i++) {
            const prev = new Date(sortedAnswers[i - 1].timestamp).getTime();
            const curr = new Date(sortedAnswers[i].timestamp).getTime();
            const diffSec = (curr - prev) / 1000; // seconds
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
    // ✅ Overall average time between questions
    agg.avgTimeBetweenQuestions = agg.sequentialQuestionTimes.length > 0
      ? agg.sequentialQuestionTimes.reduce((a:any, b:any) => a + b.diffSec, 0) / agg.sequentialQuestionTimes.length
      : 0;

    // ✅ Per-question average time between clicks
    const perQuestion: Record<string, { total: number; count: number }> = {};
    for (const entry of agg.sequentialQuestionTimes) {
      if (!perQuestion[entry.questionId]) perQuestion[entry.questionId] = { total: 0, count: 0 };
      perQuestion[entry.questionId].total += entry.diffSec;
      perQuestion[entry.questionId].count++;
    }

    agg.avgTimeBetweenByQuestion = Object.entries(perQuestion).map(([questionId, { total, count }]) => ({
      questionId,
      avgDiffSec: total / count
    }));

    if (agg.maxScore === Number.NEGATIVE_INFINITY) agg.maxScore = 0;
    if (agg.minScore === Number.POSITIVE_INFINITY) agg.minScore = 0;
  }

  // Write to Firestore
  try {
    const batch = db.batch();

    for (const [quizId, agg] of Object.entries(aggregates)) {
      console.log('Sequential:', agg.sequentialQuestionTimes);
      console.log('Per-question avg:', agg.avgTimeBetweenByQuestion);

      const averageScore = agg.validStatsCount > 0 ? agg.totalScore / agg.validStatsCount : 0;
      const averageTime = agg.validStatsCount > 0 ? agg.totalTime / agg.validStatsCount : 0;

      const questionAccuracy = Object.entries(agg.questionStats).map(([qid, stat]: any) => ({
        questionId: qid,
        totalAttempts: stat.total,
        correctCount: stat.correct,
        correctRate: stat.total > 0 ? stat.correct / stat.total : 0
      }));

      const hardestQuestions = [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
      const easiestQuestions = [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

      const docRef = db.collection('quizAggregates').doc(String(quizId));
      batch.set(docRef, {
        quizId,
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
        avgTimeBetweenByQuestion: agg.avgTimeBetweenByQuestion, // ✅ new
        maxScore: agg.maxScore,
        minScore: agg.minScore,
        validStatsCount: agg.validStatsCount,
        updatedAt: new Date()
      });
    }

    await batch.commit();
    console.log(`✅ Wrote ${Object.keys(aggregates).length} quiz aggregates for quizId 177.`);
  } catch (err) {
    console.error('❌ Failed to write aggregates to Firestore:', err);
  }
}

buildQuizAggregates()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  });
