import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import express, { Request, Response } from 'express';
import cors from 'cors';

const luxon = require('luxon')

const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ===============================
// Helper: process quizResults in batches
// ===============================
async function processQuizResultsInBatches(
  quizId: string,
  batchSize: number,
  callback: (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => Promise<void>
): Promise<void> {
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection('quizResults')
      .where('quizId', '==', quizId)
      .orderBy('startedAt')
      .limit(batchSize);

    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    await callback(snapshot.docs);

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < batchSize) break;
  }
}

// ===============================
// /api/getLatestQuiz
// ===============================
app.get('/api/getLatestQuiz', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = Timestamp.fromDate(new Date());
    const snapshot = await db.collection('quizzes')
      .where('quizType', '==', 1)
      .where('deploymentDate', '<=', now)
      .orderBy('deploymentDate', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ message: 'No quiz found' });
      return;
    }

    const quiz = snapshot.docs[0].data();
    const formattedQuiz = {
      ...quiz,
      quiz_id: quiz.quizId,
      questions: (quiz.questions || []).map((q: any) => ({
        qNum: q.questionId,
        qTitle: q.question,
        qAnswer: q.answer
      }))
    };

    res.status(200).json(formattedQuiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// /api/quizStats/:quizId
// ===============================
app.get('/api/quizStats/:quizId', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizId = req.params.quizId;
    const snapshot = await db.collection('quizResults')
      .where('quizId', '==', quizId)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ message: 'No results found for this quiz' });
      return;
    }

    let attempts = 0;
    let totalScore = 0;
    let totalTime = 0;
    let completedCount = 0;
    const questionStats: Record<string, { correct: number; total: number }> = {};

    snapshot.forEach(doc => {
      const result = doc.data() as any;
      attempts++;

      if (result.completedAt) {
        completedCount++;
        totalScore += result.score ?? 0;

        const started = result.startedAt?.toDate?.() ?? new Date(result.startedAt);
        const completed = result.completedAt?.toDate?.() ?? new Date(result.completedAt);
        if (started && completed) totalTime += (completed.getTime() - started.getTime()) / 1000;

        (result.answers || []).forEach((a: any) => {
          const qid = String(a.questionId);
          if (!questionStats[qid]) questionStats[qid] = { correct: 0, total: 0 };
          questionStats[qid].total++;
          if (a.correct) questionStats[qid].correct++;
        });
      }
    });

    const averageScore = completedCount > 0 ? totalScore / completedCount : 0;
    const averageTime = completedCount > 0 ? totalTime / completedCount : 0;

    const questionAccuracy = Object.entries(questionStats).map(([id, stat]) => ({
      questionId: id,
      correctCount: stat.correct,
      totalAttempts: stat.total,
      correctRate: stat.total > 0 ? stat.correct / stat.total : 0
    }));

    const hardestQuestions = [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
    const easiestQuestions = [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

    res.status(200).json({
      quizId,
      attempts,
      completedCount,
      averageScore,
      averageTime,
      questionAccuracy,
      hardestQuestions,
      easiestQuestions
    });
  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// /api/recordQuizSession
// ===============================
app.post('/api/recordQuizSession', async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId, score } = req.body;
    if (!quizId || quizId.trim() === "" || score === undefined) {
      res.status(400).json({ message: 'quizId and score are required' });
      return;
    }

    const statsRef = db.collection('quizTotalStats').doc(quizId);

    await db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      if (!statsDoc.exists) {
        transaction.set(statsRef, { totalSessions: 1, averageScore: score });
      } else {
        const data = statsDoc.data() || {};
        const oldTotal = data.totalSessions ?? 0;
        const newTotal = oldTotal + 1;
        const newAverage = ((data.averageScore ?? 0) * oldTotal + score) / newTotal;
        transaction.update(statsRef, { totalSessions: newTotal, averageScore: newAverage });
      }
    });

    res.status(200).json({ message: 'Quiz stats updated successfully' });
  } catch (error) {
    console.error('Error updating quiz stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// /api/logQuizStart
// ===============================
app.post('/api/logQuizStart', async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId, userId } = req.body;
    if (!quizId) {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';

    const docRef = await db.collection('quizResults').add({
      quizId,
      userId: userId || null,
      status: 'in_progress',
      startedAt: new Date(),
      completedAt: null,
      score: null,
      total: null,
      answers: [],
      ip,
      geo: null,
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.status(200).json({ sessionId: docRef.id });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// /api/logQuizFinish
// ===============================
app.post('/api/logQuizFinish', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, score, total, answers } = req.body;
    if (!sessionId || score === undefined || !answers) {
      res.status(400).json({ message: 'sessionId, score, and answers are required' });
      return;
    }

    await db.collection('quizResults').doc(sessionId).update({
      completedAt: new Date(),
      status: 'completed',
      score,
      total,
      answers
    });

    res.status(200).json({ message: 'Quiz result saved successfully' });
  } catch (error) {
    console.error('Error finishing quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// /api/quizAggregates/:quizId
// ===============================
app.get('/api/quizAggregates/:quizId', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizId = req.params.quizId;
    if (!quizId) {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }

    const now = new Date();
    let totalScore = 0;
    let completedCount = 0;
    let totalTime = 0;
    let inProgressCount = 0;
    let abandonedCount = 0;
    const hourlyCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const questionStats: Record<string, { correct: number; total: number }> = {};
    const geoCache: Record<string, { country: string; city: string }> = {};
    const batchSize = 500;

    await processQuizResultsInBatches(quizId, batchSize, async (docs) => {
      for (const doc of docs) {
        const result = doc.data() as any;
        const startedAt = result.startedAt?.toDate?.() ?? new Date(result.startedAt);
        const completedAt = result.completedAt?.toDate?.() ?? (result.completedAt ? new Date(result.completedAt) : null);

        const startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone('Australia/Adelaide');
        const hourKey = startedAdelaide.toFormat('yyyy-MM-dd HH');
        hourlyCounts[hourKey] = (hourlyCounts[hourKey] || 0) + 1;

        const ip = result.ip || 'unknown';
        let geo = result.geo;
        if (!geo) {
          if (!geoCache[ip] && ip !== 'unknown' && !ip.startsWith('127.') && ip !== '::1') {
            try {
              const response = await fetch(`http://ip-api.com/json/${ip}`);
              const geoData = await response.json();
              geoCache[ip] = { country: geoData.country || 'Unknown', city: geoData.city || 'Unknown' };
            } catch {
              geoCache[ip] = { country: 'Unknown', city: 'Unknown' };
            }
          }
          geo = geoCache[ip] || { country: 'Unknown', city: 'Unknown' };
        }
        const locKey = `${geo.country} - ${geo.city}`;
        locationCounts[locKey] = (locationCounts[locKey] || 0) + 1;

        if (completedAt) {
          completedCount++;
          totalScore += result.score ?? 0;
          let duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
          if (duration > 3 * 60 * 60) duration = 3 * 60 * 60;
          totalTime += duration;

          (result.answers || []).forEach((a: any) => {
            const qid = String(a.questionId);
            if (!questionStats[qid]) questionStats[qid] = { correct: 0, total: 0 };
            questionStats[qid].total++;
            if (a.correct) questionStats[qid].correct++;
          });
        } else if (result.status === 'in_progress') {
          const duration = (now.getTime() - startedAt.getTime()) / 1000;
          if (duration > 3 * 60 * 60) abandonedCount++;
          else inProgressCount++;
        }
      }
    });

    const averageScore = completedCount > 0 ? totalScore / completedCount : 0;
    const averageTime = completedCount > 0 ? totalTime / completedCount : 0;

    const questionAccuracy = Object.entries(questionStats).map(([qid, stat]) => ({
      questionId: qid,
      totalAttempts: stat.total,
      correctCount: stat.correct,
      correctRate: stat.total > 0 ? stat.correct / stat.total : 0
    }));

    const hardestQuestions = [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
    const easiestQuestions = [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

    res.status(200).json({
      quizId,
      completedCount,
      inProgressCount,
      abandonedCount,
      averageScore,
      averageTime,
      hourlyCounts,
      locationCounts,
      questionAccuracy,
      hardestQuestions,
      easiestQuestions
    });

  } catch (error) {
    console.error('Error generating quiz aggregates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// Export Firebase Function
// ===============================
export const api = onRequest(
  {
    memory: '512MiB',
    timeoutSeconds: 120
  },
  app
);
