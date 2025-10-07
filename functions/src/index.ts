import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

// Initialize Express app
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Route: /api/getLatestQuiz
app.get('/api/getLatestQuiz', async (req, res) => {
  try {
    const snapshot = await db.collection('quizzes')
      .orderBy('deploymentDate', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ message: 'No quiz found' });
      return;
    }

    const quiz = snapshot.docs[0].data();

    const formattedQuiz = {
      quiz_id: quiz.quizId,
      questions: (quiz.questions || []).map((q: any) => ({
        qum: q.questionId,
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

    let totalScore = 0;
    let totalTime = 0;
    let count = 0;
    const questionStats: Record<number, { correct: number; total: number }> = {};

    snapshot.forEach(doc => {
      const result = doc.data() as any;
      count++;
      totalScore += result.score ?? 0;

      const started = result.startedAt?.toDate?.() ?? new Date(result.startedAt);
      const completed = result.completedAt?.toDate?.() ?? new Date(result.completedAt);
      const durationSeconds = completed && started ? (completed.getTime() - started.getTime()) / 1000 : 0;
      totalTime += durationSeconds;

      (result.answers || []).forEach((a: any) => {
        const qid = a.questionId;
        if (!questionStats[qid]) questionStats[qid] = { correct: 0, total: 0 };
        questionStats[qid].total++;
        if (a.correct) questionStats[qid].correct++;
      });
    });

    const averageScore = totalScore / count;
    const averageTime = totalTime / count;

    const difficulty = Object.entries(questionStats).map(([id, stat]) => ({
      questionId: Number(id),
      correctRate: stat.correct / stat.total
    }));

    const hardest = difficulty.sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
    const easiest = [...difficulty].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

    res.status(200).json({
      quizId,
      attempts: count,
      averageScore,
      averageTime,
      hardestQuestions: hardest,
      easiestQuestions: easiest
    });

    return; // ✅ ensures all code paths return

  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});




// Export the Express app as a Firebase function
export const api = onRequest(app);
