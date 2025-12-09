import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { FieldValue } from "firebase-admin/firestore";

const luxon = require('luxon')

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

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
// /api/getQuizArchiveHeaders
// ===============================

app.get('/api/getQuizArchiveHeaders', async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('quizzes')
      .where('quizType', '==', 1)
      .orderBy('deploymentDate', 'desc')
      .get();

    const quizzes = snapshot.docs.map(doc => {
      const q = doc.data();

      return {
        quizId: q.quizId,
        quizNumber: `Quiz ${q.quizId}`,
        deploymentDate: q.deploymentDate?.toDate() ?? null
      };
    });

    res.status(200).json(quizzes);
  } catch (error) {
    console.error('Error fetching archive list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===============================
// /api/getQuizArchiveHeaders
// ===============================

app.get('/api/getQuizByQuizId', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizId = req.query.quizId as string;

    if (!quizId || quizId.trim() === "") {
      
      res.status(400).json({ error: 'quizId is required' });
      return;
    }

    const snapshot = await db.collection('quizzes')
      .where('quizId', '==', quizId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ message: 'Quiz not found' });
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

    let dbUserId: string | null = null;

    if (userId) {
      const usersCol = db.collection('users');
      const existingSnap = await usersCol
        .where('externalQuizId', '==', userId)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        // User already exists → reuse it
        dbUserId = existingSnap.docs[0].id;
      } else {
        // No user → create placeholder
        const placeholderRef = await usersCol.add({
          createdAt: new Date(),
          isAnon: true,
          isMember: false,
          isAdmin: false,
          loginCount: 1,
          followers: [],
          following: [],
          externalQuizId: userId,
          email: null,
          displayName: null,
          photoUrl: null,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });

        // Use doc ID as uid
        await placeholderRef.update({ uid: placeholderRef.id });
        dbUserId = placeholderRef.id;
      }
    }

    // Create the quizResult session
    const quizResultRef = await db.collection('quizResults').add({
      quizId,
      userId: dbUserId,  // null if no userId provided
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

    res.status(200).json({ sessionId: quizResultRef.id });
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

export const quizStarted = onDocumentCreated(
  "quizResults/{sessionId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const quizId = data.quizId;
    if (!quizId) return;

    // Increment inProgressCount
    const aggRef = db.collection("quizAggregates").doc(String(quizId));
    const aggDoc = await aggRef.get();
    if (!aggDoc.exists) {
      await aggRef.set({
        inProgressCount: 0,
        completedCount: 0,
        abandonedCount: 0,
        totalScore: 0,
        totalTime: 0,
        hourlyCounts: {},
        locationCounts: {},
        questionStats: {},
        sequentialQuestionTimes: [],
        maxScore: 0,
        minScore: 0,
        validStatsCount: 0,
        updatedAt: new Date()
      });

    }

    // Now increment
    await aggRef.update({
      inProgressCount: FieldValue.increment(1),
  updatedAt: new Date(),
    });


    console.log(`⬆️ In-progress incremented for quiz ${quizId}`);
  }
);

// ---- Firestore trigger ----
export const quizFinished = onDocumentUpdated(
  "quizResults/{sessionId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return;
    if (before?.completedAt) return; // Only process newly completed quizzes

    const quizId = after.quizId;
    if (!quizId) return;

    const aggRef = db.collection("quizAggregates").doc(String(quizId));

    // Load existing aggregate (or initialize)
    const aggDoc = await aggRef.get();
    const agg: any = aggDoc.exists
      ? aggDoc.data()
      : {
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
          validStatsCount: 0,
        };

    const data = after;
    const startedAt = data.startedAt?.toDate?.() ?? new Date(data.startedAt);
    const completedAt = data.completedAt?.toDate?.() ?? new Date(data.completedAt);
    const answers = data.answers || [];
    const score = data.score ?? 0;

    // --- Update raw aggregates ---
    agg.completedCount = (agg.completedCount || 0) + 1;
    agg.inProgressCount = (agg.inProgressCount || 0) - 1;
    agg.totalScore = (agg.totalScore || 0) + score;

    let duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
    if (duration > 3 * 60 * 60) duration = 3 * 60 * 60;
    agg.totalTime = (agg.totalTime || 0) + duration;

    // Hourly counts
    const startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone("Australia/Adelaide");
    const hourKey = startedAdelaide.toFormat("yyyy-MM-dd HH");
    agg.hourlyCounts = agg.hourlyCounts || {};
    agg.hourlyCounts[hourKey] = (agg.hourlyCounts[hourKey] || 0) + 1;

    // Location counts placeholder
    const locKey = "Unknown - Unknown";
    agg.locationCounts = agg.locationCounts || {};
    agg.locationCounts[locKey] = (agg.locationCounts[locKey] || 0) + 1;

    // Question stats
    agg.questionStats = agg.questionStats || {};
    for (const ans of answers) {
      const qid = String(ans.questionId);
      if (!agg.questionStats[qid]) agg.questionStats[qid] = { correct: 0, total: 0 };
      agg.questionStats[qid].total++;
      if (ans.correct) agg.questionStats[qid].correct++;
    }

    // Sequential question times
    const sorted = [...answers]
      .filter((a: any) => a.timestamp)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    agg.sequentialQuestionTimes = agg.sequentialQuestionTimes || [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].timestamp).getTime();
      const curr = new Date(sorted[i].timestamp).getTime();
      const diffSec = (curr - prev) / 1000;
      if (diffSec > 0 && diffSec <= 10 * 60) {
        agg.sequentialQuestionTimes.push({
          questionId: String(sorted[i - 1].questionId),
          diffSec,
        });
      }
    }

    // Min/max scores
    agg.maxScore = agg.maxScore !== undefined ? Math.max(agg.maxScore, score) : score;
    agg.minScore = agg.minScore !== undefined ? Math.min(agg.minScore, score) : score;

    // Valid stats count
    agg.validStatsCount = (agg.validStatsCount || 0) + 1;

    // --- Derived metrics ---
    // Average time between questions
    agg.avgTimeBetweenQuestions = agg.sequentialQuestionTimes.length
      ? agg.sequentialQuestionTimes.reduce(
          (a: number, b: { questionId: string; diffSec: number }) => a + b.diffSec,
          0
        ) / agg.sequentialQuestionTimes.length
      : 0;

    // Average time between by question
    const perQuestion: Record<string, { total: number; count: number }> = {};
    for (const entry of agg.sequentialQuestionTimes) {
      if (!perQuestion[entry.questionId]) perQuestion[entry.questionId] = { total: 0, count: 0 };
      perQuestion[entry.questionId].total += entry.diffSec;
      perQuestion[entry.questionId].count++;
    }
    const avgTimeBetweenByQuestion = Object.entries(perQuestion).map(
      ([qid, { total, count }]) => ({
        questionId: qid,
        avgDiffSec: total / count,
      })
    );

    // Question accuracy
    const questionAccuracy = Object.entries(agg.questionStats as Record<string, { total: number; correct: number }>).map(
      ([qid, stat]) => ({
        questionId: qid,
        totalAttempts: stat.total,
        correctCount: stat.correct,
        correctRate: stat.total > 0 ? stat.correct / stat.total : 0,
      })
    );

    // Hardest/easiest questions
    const hardestQuestions = [...questionAccuracy]
      .sort((a, b) => a.correctRate - b.correctRate)
      .slice(0, 5);
    const easiestQuestions = [...questionAccuracy]
      .sort((a, b) => b.correctRate - a.correctRate)
      .slice(0, 5);

    // Average score & time
    const averageScore = agg.validStatsCount > 0 ? agg.totalScore / agg.validStatsCount : 0;
    const averageTime = agg.validStatsCount > 0 ? agg.totalTime / agg.validStatsCount : 0;

    // --- Merge into Firestore ---
    await aggRef.set(
      {
        ...agg,
        averageScore,
        averageTime,
        questionAccuracy,
        hardestQuestions,
        easiestQuestions,
        avgTimeBetweenByQuestion,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    console.log(`✅ Aggregates incrementally updated for quiz ${quizId}`);
  }
);


app.post('/api/updateUserEmail', async (req: Request, res: Response) => {
  try {
    const { externalQuizId, email } = req.body;

    if (!externalQuizId || !email) {
      res.status(400).json({ message: 'externalQuizId and email are required.' });
      return;
    }

    // Find the quizResult associated with the externalQuizId
    const snapshot = await db.collection('users')
      .where('externalQuizId', '==', externalQuizId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ message: `No user found for externalQuizId ${externalQuizId}.` });
      return;
    }

    const userDoc = snapshot.docs[0];
      await userDoc.ref.update({
        email,
        updatedAt: new Date()
      });

    res.status(200).json({ message: `User ${externalQuizId} updated with email ${email}.` });

  } catch (err) {
    console.error('Error updating user email:', err);
    res.status(500).json({ message: 'Internal server error', error: err });
  }
});

export async function createTestQuiz() {
  const quizId = "test_quiz_" + Date.now();

  const quizData = {
    quizId,
    quizType: 1,
    title: "Test Quiz",
    deploymentDate: Timestamp.fromDate(new Date()),
    questionCount: 3,
    questions: [
      { questionId: 1, question: "What is 2 + 2?", answer: "4" },
      { questionId: 2, question: "What colour is the sky?", answer: "Blue" },
      { questionId: 3, question: "What sound does a dog make?", answer: "Woof" }
    ]
  };

  await db.collection("quizzes").doc(quizId).set(quizData);

  return quizData;
}

app.post('/api/createTestQuiz', async (req, res) => {
  try {
    const quiz = await createTestQuiz();
    res.status(200).json({ message: "Test quiz created", quiz });
  } catch (err) {
    console.error("Error creating test quiz:", err);
    res.status(500).json({ error: "Internal Server Error" });
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
