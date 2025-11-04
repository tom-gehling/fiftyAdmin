import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import express from 'express';
import cors from 'cors';

const luxon = require('luxon')

const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();

// Initialize Express app
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Route: /api/getLatestQuiz
app.get('/api/getLatestQuiz', async (req, res) => {
  try {
    const now = Timestamp.fromDate(new Date());
    const snapshot = await db.collection('quizzes')
      .where('quizType', '==', 1)          // only weekly quizzes
      .where('deploymentDate', '<=', now)  // only quizzes deployed in the past or now
      .orderBy('deploymentDate', 'desc')   // most recent first
      .limit(1)
      .get();


    if (snapshot.empty) {
      res.status(404).json({ message: 'No quiz found' });
      return;
    }

    const quiz = snapshot.docs[0].data();
// [x]: send the whole quiz object with formatted questions
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

app.get('/api/quizStats/:quizId', async (req, res): Promise<void> => {
  try {
    const quizId = req.params.quizId;
    const snapshot = await db.collection('quizResults')
      .where('quizId', '==', quizId)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ message: 'No results found for this quiz' });
      return;
    }

    let attempts = 0; // total submissions
    let totalScore = 0;
    let totalTime = 0;
    let completedCount = 0;
    const questionStats: Record<string, { correct: number; total: number }> = {};

    snapshot.forEach(doc => {
      const result = doc.data() as any;
      attempts++;

      // Only include completed sessions in stats
      if (result.completedAt) {
        completedCount++;

        // Add score
        totalScore += result.score ?? 0;

        // Calculate time taken
        const started = result.startedAt?.toDate?.() ?? (result.startedAt ? new Date(result.startedAt) : null);
        const completed = result.completedAt?.toDate?.() ?? (result.completedAt ? new Date(result.completedAt) : null);
        if (started && completed) {
          totalTime += (completed.getTime() - started.getTime()) / 1000;
        }

        // Collect question-level stats
        (result.answers || []).forEach((a: any) => {
          const qid = String(a.questionId);
          if (!questionStats[qid]) questionStats[qid] = { correct: 0, total: 0 };
          questionStats[qid].total++;
          if (a.correct) questionStats[qid].correct++;
        });
      }
    });

    // Calculate averages only on completed quizzes
    const averageScore = completedCount > 0 ? totalScore / completedCount : 0;
    const averageTime = completedCount > 0 ? totalTime / completedCount : 0;

    // Build per-question accuracy
    const questionAccuracy = Object.entries(questionStats).map(([id, stat]) => ({
      questionId: id,
      correctCount: stat.correct,
      totalAttempts: stat.total,
      correctRate: stat.total > 0 ? stat.correct / stat.total : 0
    }));

    // Sort to find hardest/easiest
    const hardestQuestions = [...questionAccuracy]
      .sort((a, b) => a.correctRate - b.correctRate)
      .slice(0, 5);

    const easiestQuestions = [...questionAccuracy]
      .sort((a, b) => b.correctRate - a.correctRate)
      .slice(0, 5);

    // Final response
    res.status(200).json({
      quizId,
      attempts,       // total submissions
      completedCount, // number of completed quizzes
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

app.post('/api/recordQuizSession', async (req, res) => {
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
        // First score for this quiz
        transaction.set(statsRef, {
          totalSessions: 1,
          averageScore: score,
        });
      } else {
        const data = statsDoc.data() || {};
        const oldTotal = data.totalSessions ?? 0;
        const newTotal = oldTotal + 1;
        const newAverage =
          ((data.averageScore ?? 0) * oldTotal + score) / newTotal;

        transaction.update(statsRef, {
          totalSessions: newTotal,
          averageScore: newAverage,
        });
      }
    });

    res.status(200).json({ message: 'Quiz stats updated successfully' });
  } catch (error) {
    console.error('Error updating quiz stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




// Updated logQuizStart without geo lookup
app.post('/api/logQuizStart', async (req, res) => {
  try {
    const { quizId, userId } = req.body;
    if (!quizId) {
      return res.status(400).json({ message: 'quizId is required' });
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
      geo: null, // will fill this later in aggregation
      userAgent: req.get('user-agent') || 'unknown'
    });

    return res.status(200).json({ sessionId: docRef.id });
  } catch (error) {
    console.error('Error starting quiz:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/logQuizFinish', async (req, res) => {
  try {
    const { sessionId, score, total, answers } = req.body;

    // Validate input
    if (!sessionId || score === undefined || !answers) {
      return res.status(400).json({ message: 'sessionId, score, and answers are required' });
    }

    // Update the quizResults document
    await db.collection('quizResults').doc(sessionId).update({
      completedAt: new Date(),
      status: 'completed',
      score,
      total,
      answers
    });

    return res.status(200).json({ message: 'Quiz result saved successfully' });

  } catch (error) {
    console.error('Error finishing quiz:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/quizAggregates/:quizId', async (req, res) => {
  try {
    const quizId = req.params.quizId;
    if (!quizId) return res.status(400).json({ message: 'quizId is required' });

    const snapshot = await db.collection('quizResults')
      .where('quizId', '==', quizId)
      .get();

    if (snapshot.empty) return res.status(404).json({ message: 'No results found' });

    const now = new Date();
    let totalScore = 0;
    let completedCount = 0;
    let totalTime = 0;
    let inProgressCount = 0;
    let abandonedCount = 0;
    const hourlyCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const questionStats: Record<string, { correct: number; total: number }> = {};

    // Track IPs already resolved
    const geoCache: Record<string, { country: string; city: string }> = {};

    for (const doc of snapshot.docs) {
      const result = doc.data() as any;

      // Parse start/completion dates in UTC
      const startedAt = result.startedAt?.toDate?.() ?? new Date(result.startedAt);
      const completedAt = result.completedAt?.toDate?.() ?? (result.completedAt ? new Date(result.completedAt) : null);

      // Convert start time to Adelaide timezone
      const startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone('Australia/Adelaide');
      const hourKey = startedAdelaide.toFormat('yyyy-MM-dd HH'); // e.g., "2025-11-03 20"
      hourlyCounts[hourKey] = (hourlyCounts[hourKey] || 0) + 1;

      // Geo lookup (once per IP)
      let geo = result.geo;
      const ip = result.ip || 'unknown';
      if (!geo) {
        if (!geoCache[ip] && ip !== 'unknown' && !ip.startsWith('127.') && ip !== '::1') {
          try {
            const response = await fetch(`http://ip-api.com/json/${ip}`);
            const geoData = await response.json();
            geoCache[ip] = { country: geoData.country || 'Unknown', city: geoData.city || 'Unknown' };
          } catch (err) {
            console.warn(`Failed to fetch geo for IP ${ip}:`, err);
            geoCache[ip] = { country: 'Unknown', city: 'Unknown' };
          }
        }
        geo = geoCache[ip] || { country: 'Unknown', city: 'Unknown' };
      }
      const locKey = `${geo.country} - ${geo.city}`;
      locationCounts[locKey] = (locationCounts[locKey] || 0) + 1;

      // Completed sessions
      if (completedAt) {
        completedCount++;
        totalScore += result.score ?? 0;

        // Duration capped at 3 hours
        let duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
        if (duration > 3 * 60 * 60) duration = 3 * 60 * 60;
        totalTime += duration;

        // Question-level stats
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

    return res.status(200).json({
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
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});







// Export the Express app as a Firebase function
export const api = onRequest(app);
