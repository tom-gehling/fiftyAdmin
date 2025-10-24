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
      .where('quizType', '==', 1)      // only active quizzes
      .orderBy('deploymentDate', 'desc')
      .limit(1)
      .get();


    if (snapshot.empty) {
      res.status(404).json({ message: 'No quiz found' });
      return;
    }

    const quiz = snapshot.docs[0].data();
// [ ]: send the whole quiz object with formatted questions
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

    if (!quizId || score === undefined) {
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








// Export the Express app as a Firebase function
export const api = onRequest(app);
