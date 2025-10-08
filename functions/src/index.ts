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
    let attempts = 0;
    let completedCount = 0;
    const questionStats: Record<string, { correct: number; total: number }> = {};

    snapshot.forEach(doc => {
      const result = doc.data() as any;
      attempts++;

      // Count completed sessions
      if (result.completedAt) {
        completedCount++;
      }

      // Add score
      totalScore += result.score ?? 0;

      // Calculate time taken (only if both timestamps exist)
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
    });

    // Calculate averages
    const averageScore = attempts > 0 ? totalScore / attempts : 0;
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





// Export the Express app as a Firebase function
export const api = onRequest(app);
