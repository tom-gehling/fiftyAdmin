import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { FieldValue } from "firebase-admin/firestore";
import * as maxmind from 'maxmind';
import * as path from 'path';
import Stripe from 'stripe';
import { PRICE_TIER_MAP, STRIPE_PRICES } from './stripe-config.js';

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
      })),
      deploymentDate: quiz.deploymentDate?.toDate() ?? null
    };

    res.status(200).json(formattedQuiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/getLatestCollabQuiz', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizCollab = req.query.collab;

    if (!quizCollab) {
      res.status(400).json({ error: 'Need to define a collaborator' });
      return;
    }

    const now = Timestamp.fromDate(new Date());
    const snapshot = await db.collection('quizzes')
      .where('quizType', '==', 3)
      .where('collab', '==', quizCollab)
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
      })),
      deploymentDate: quiz.deploymentDate?.toDate() ?? null
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

    const now = Timestamp.fromDate(new Date());
    const snapshot = await db.collection('quizzes')
      .where('quizType', '==', 1)
      .where('deploymentDate', '<=', now)
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
// /api/getQuizByQuizId
// ===============================

app.get('/api/getQuizByQuizId', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizIdRaw = req.query.quizId;
    const quizId = Number(quizIdRaw);

    if (!quizIdRaw || isNaN(quizId)) {
      res.status(400).json({ error: 'quizId must be a valid number' });
      return;
    }

    const snapshot = await db.collection('quizzes')
      .where('quizId', '==', quizId)   // <-- now numeric
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
      })),
      deploymentDate: quiz.deploymentDate?.toDate() ?? null
    };

    res.status(200).json(formattedQuiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/getQuizByQuizSlug', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizSlug = req.query.quizSlug;

    const snapshot = await db.collection('quizzes')
      .where('quizSlug', '==', quizSlug)   // <-- now numeric
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

      // Skip retro quiz results from stats
      if (result.retro && result.retro === true) return;

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
// /api/quizLocationStats/:quizId
// ===============================
app.get('/api/quizLocationStats/:quizId', async (req: Request, res: Response): Promise<void> => {
  try {
    const quizId = req.params.quizId;

    // Fetch completed quiz results
    const snapshot = await db.collection('quizResults')
      .where('quizId', '==', quizId)
      .where('status', '==', 'completed')
      .get();

    if (snapshot.empty) {
      res.status(200).json({
        quizId,
        totalResults: 0,
        countries: [],
        cities: [],
        mapData: []
      });
      return;
    }

    // Initialize MaxMind reader
    let geoLookup: maxmind.Reader<maxmind.CityResponse> | null = null;
    try {
      const geoLitePath = path.join(__dirname, '..', 'GeoLite2-City.mmdb');
      geoLookup = await maxmind.open<maxmind.CityResponse>(geoLitePath);
    } catch (error) {
      console.error('MaxMind database not found, returning without geolocation:', error);
      res.status(500).json({ error: 'GeoLite2 database not configured' });
      return;
    }

    interface LocationStats {
      count: number;
      totalScore: number;
      totalTime: number;
      latitude?: number;
      longitude?: number;
    }

    const countryStats: Record<string, LocationStats> = {};
    const cityStats: Record<string, LocationStats> = {};
    let totalResults = 0;

    snapshot.forEach(doc => {
      const result = doc.data() as any;

      // Skip retro quiz results from location stats
      if (result.retro && result.retro === true) return;

      const ip = result.ip;

      if (!ip) return;

      totalResults++;
      const geo = geoLookup!.get(ip);
      const country = geo?.country?.names?.en || 'Unknown';
      const city = geo?.city?.names?.en || 'Unknown';
      const cityKey = `${city}, ${country}`;

      // Calculate duration
      const started = result.startedAt?.toDate?.() ?? new Date(result.startedAt);
      const completed = result.completedAt?.toDate?.() ?? new Date(result.completedAt);
      const duration = (completed.getTime() - started.getTime()) / 1000;
      const score = result.score ?? 0;

      // Aggregate country stats
      if (!countryStats[country]) {
        countryStats[country] = {
          count: 0,
          totalScore: 0,
          totalTime: 0,
          latitude: geo?.location?.latitude,
          longitude: geo?.location?.longitude
        };
      }
      countryStats[country].count++;
      countryStats[country].totalScore += score;
      countryStats[country].totalTime += duration;

      // Aggregate city stats
      if (!cityStats[cityKey]) {
        cityStats[cityKey] = {
          count: 0,
          totalScore: 0,
          totalTime: 0,
          latitude: geo?.location?.latitude,
          longitude: geo?.location?.longitude
        };
      }
      cityStats[cityKey].count++;
      cityStats[cityKey].totalScore += score;
      cityStats[cityKey].totalTime += duration;
    });

    // Format response
    const countries = Object.entries(countryStats)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        averageScore: stats.count > 0 ? stats.totalScore / stats.count : 0,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        latitude: stats.latitude,
        longitude: stats.longitude
      }))
      .sort((a, b) => b.count - a.count);

    const cities = Object.entries(cityStats)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        averageScore: stats.count > 0 ? stats.totalScore / stats.count : 0,
        averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0,
        latitude: stats.latitude,
        longitude: stats.longitude
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 cities

    // Map data for visualization
    const mapData = countries
      .filter(c => c.latitude && c.longitude)
      .map(c => ({
        name: c.name,
        latitude: c.latitude,
        longitude: c.longitude,
        count: c.count
      }));

    res.status(200).json({
      quizId,
      totalResults,
      countries,
      cities,
      mapData
    });
  } catch (error) {
    console.error('Error generating location stats:', error);
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
          updatedAt: new Date()
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
      userAgent: req.get('user-agent') || 'unknown',
      submittedFrom: 'Weekly'
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

// ---- Firestore trigger ----
export const quizStarted = onDocumentCreated(
  "quizResults/{sessionId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    if (data.retro && data.retro === true) return; // Skip retro quiz results from stats

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
    if (after.retro && after.retro === true) return; // Skip retro quiz results from stats

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


app.post('/api/logFiftyPlusQuizStart', async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId, emailAddress } = req.body;

    if (!quizId) {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }

    // console.log('email:' ,emailAddress)

    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
    let dbUserId: string | null = null;

    if (emailAddress) {
      const usersCol = db.collection('users');
      const existingSnap = await usersCol
        .where('email', '==', emailAddress)
        .limit(1)
        .get();

        console.log('exists: ',existingSnap)

      if (!existingSnap.empty) {
        // User exists → increment login count
        const userDoc = existingSnap.docs[0];
        dbUserId = userDoc.id;
        await userDoc.ref.update({
          loginCount: (userDoc.data().loginCount || 0) + 1,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // User doesn't exist → create new user
        const newUserRef = await usersCol.add({
          createdAt: new Date(),
          isAnon: false,
          isMember: true,
          isAdmin: false,
          loginCount: 1,
          followers: [],
          following: [],
          email: emailAddress,
          displayName: null,
          photoUrl: null,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        });

        // Set uid field to doc ID
        await newUserRef.update({ uid: newUserRef.id });
        dbUserId = newUserRef.id;
      }
    }

    // Create quiz session in quizResults
    const quizResultRef = await db.collection('quizResults').add({
      quizId,
      userId: dbUserId,
      status: 'in_progress',
      startedAt: new Date(),
      completedAt: null,
      score: null,
      total: null,
      answers: [],
      ip,
      geo: null,
      userAgent: req.get('user-agent') || 'unknown',
      submittedFrom: 'Fifty+'
    });

    res.status(200).json({ sessionId: quizResultRef.id });
  } catch (error) {
    console.error('Error starting FiftyPlus quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// ===============================
// /api/logQuizFinish
// ===============================
app.post('/api/logFiftyPlusQuizFinish', async (req: Request, res: Response): Promise<void> => {
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


// ===============================
// /api/getVenues
// ===============================

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_ORDINALS = ['', 'First', 'Second', 'Third', 'Fourth'];

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m > 0 ? `${hour}:${m.toString().padStart(2, '0')} ${period}` : `${hour}:00 ${period}`;
}

function formatScheduleLabel(s: any): string {
  const time = s.startTime ? ` at ${formatTime12h(s.startTime)}` : '';
  switch (s.type) {
    case 'weekly':    return `Every ${DAYS[s.dayOfWeek]}${time}`;
    case 'biweekly':  return `Every other ${DAYS[s.dayOfWeek]}${time}`;
    case 'monthly': {
      const ordinal = s.weekOfMonth === -1 ? 'Last' : (WEEK_ORDINALS[s.weekOfMonth] || '');
      return `${ordinal} ${DAYS[s.dayOfWeek]} of the month${time}`;
    }
    case 'custom':    return `Selected dates${time}`;
    default:          return '';
  }
}

function nextWeekdayOccurrence(from: Date, dayOfWeek: number, hours: number, minutes: number): Date {
  const d = new Date(from);
  let daysUntil = (dayOfWeek - d.getDay() + 7) % 7;
  if (daysUntil === 0) {
    d.setHours(hours, minutes, 0, 0);
    daysUntil = d <= from ? 7 : 0;
  }
  if (daysUntil > 0) {
    d.setDate(d.getDate() + daysUntil);
    d.setHours(hours, minutes, 0, 0);
  }
  return d;
}

function nextLastWeekdayOfMonth(from: Date, dayOfWeek: number, hours: number, minutes: number): Date | null {
  for (let offset = 0; offset <= 2; offset++) {
    const month = from.getMonth() + offset;
    const year = from.getFullYear() + Math.floor(month / 12);
    const actualMonth = month % 12;
    const lastDay = new Date(year, actualMonth + 1, 0);
    const diff = (lastDay.getDay() - dayOfWeek + 7) % 7;
    const candidate = new Date(year, actualMonth, lastDay.getDate() - diff, hours, minutes, 0, 0);
    if (candidate > from) return candidate;
  }
  return null;
}

function nextNthWeekdayOfMonth(from: Date, weekOfMonth: number, dayOfWeek: number, hours: number, minutes: number): Date | null {
  for (let offset = 0; offset <= 2; offset++) {
    const cur = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    const targetMonth = cur.getMonth();
    let count = 0;
    while (cur.getMonth() === targetMonth) {
      if (cur.getDay() === dayOfWeek) {
        count++;
        if (count === weekOfMonth) {
          cur.setHours(hours, minutes, 0, 0);
          if (cur > from) return cur;
          break;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return null;
}

function isExcludedDate(date: Date, exclusionDates?: any[]): boolean {
  if (!exclusionDates?.length) return false;
  const ds = date.toDateString();
  return exclusionDates.some((d: any) => {
    const excl = d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
    return excl.toDateString() === ds;
  });
}

function getNextQuizOccurrence(schedules: any[]): Date | null {
  const now = new Date();
  const candidates: Date[] = [];

  for (const s of schedules) {
    if (!s.isActive) continue;
    const [hours, minutes] = (s.startTime || '19:00').split(':').map(Number);

    if ((s.type === 'weekly' || s.type === 'biweekly') && s.dayOfWeek !== undefined) {
      const next = nextWeekdayOccurrence(now, s.dayOfWeek, hours, minutes);
      if (!isExcludedDate(next, s.exclusionDates)) candidates.push(next);
    } else if (s.type === 'monthly' && s.weekOfMonth !== undefined && s.dayOfWeek !== undefined) {
      const next = s.weekOfMonth === -1
        ? nextLastWeekdayOfMonth(now, s.dayOfWeek, hours, minutes)
        : nextNthWeekdayOfMonth(now, s.weekOfMonth, s.dayOfWeek, hours, minutes);
      if (next && !isExcludedDate(next, s.exclusionDates)) candidates.push(next);
    } else if (s.type === 'custom' && Array.isArray(s.customDates)) {
      const future = (s.customDates as any[])
        .map((d: any) => d?.seconds ? new Date(d.seconds * 1000) : new Date(d))
        .filter((d: Date) => d > now)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      if (future.length > 0) candidates.push(future[0]);
    }
  }

  return candidates.length > 0
    ? candidates.sort((a, b) => a.getTime() - b.getTime())[0]
    : null;
}

function buildVenueDescription(schedules: any[], nextQuiz: Date | null, address: string): string {
  const activeSchedules = (schedules || []).filter((s: any) => s.isActive);
  const scheduleLines = activeSchedules.map(formatScheduleLabel).filter(Boolean).join('<br>');
  const scheduleSection = scheduleLines || 'See venue for details';

  let nextQuizText: string;
  if (!nextQuiz) {
    nextQuizText = 'No upcoming quiz scheduled';
  } else {
    const dateStr = nextQuiz.toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const timeStr = nextQuiz.getHours()
      ? ` at ${formatTime12h(`${nextQuiz.getHours()}:${nextQuiz.getMinutes().toString().padStart(2, '0')}`)}`
      : '';
    nextQuizText = dateStr + timeStr;
  }

  const addressSection = address ? `${address}<br><br>` : '';
  return `${addressSection}${scheduleSection}<br><br><strong>Next Quiz</strong><br>${nextQuizText}`;
}

app.get('/api/getVenues', async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('venues').where('isActive', '==', true).get();

    const venues = snapshot.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
      .filter(v => !v.deletedAt);

    const result = venues.map(venue => {
      const loc = venue.location || {};
      const address = loc.address;
      const nextQuiz = getNextQuizOccurrence(venue.quizSchedules || []);

      return {
        id: venue.id,
        title: venue.venueName || '',
        address,
        lat: String(loc.latitude ?? 0),
        lng: String(loc.longitude ?? 0),
        description: buildVenueDescription(venue.quizSchedules || [], nextQuiz, address),
        link: venue.websiteUrl || '',
        pic: venue.imageUrl || '',
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching venues:', error);
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

// ===============================
// Stripe initialisation
// Secrets (encrypted, never in source):
//   firebase functions:secrets:set STRIPE_SECRET_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
//
// Non-sensitive config (functions/.env, git-ignored):
//   STRIPE_GUEST_PASS_PRICE_ID=price_1XYZ...
// ===============================
const getStripe = (): Stripe => {
  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
};


const GUEST_PASS_PRICE_ID = process.env['STRIPE_GUEST_PASS_PRICE_ID'] ?? 'price_guest_pass';

// -----------------------------------------------
// Callable: createCheckoutSession
// Creates a Stripe Checkout session for a subscription
// -----------------------------------------------
export const createCheckoutSession = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { priceId, successUrl, cancelUrl } = req.data as {
      priceId: string; successUrl: string; cancelUrl: string;
    };
    if (!priceId || !successUrl || !cancelUrl) {
      throw new HttpsError('invalid-argument', 'priceId, successUrl and cancelUrl are required');
    }

    const stripe = getStripe();
    const uid    = req.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() ?? {};

    // Retrieve or create a Stripe customer
    let customerId: string = userData['stripeCustomerId'] ?? '';
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData['email'] ?? undefined,
        name:  userData['displayName'] ?? undefined,
        metadata: { uid },
      });
      customerId = customer.id;
      await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      metadata:             { uid },
    });

    return { url: session.url };
  }
);

// -----------------------------------------------
// Callable: createGuestPassSession
// Creates a Stripe Checkout session for a one-time quiz pass (permanent access)
// -----------------------------------------------
export const createGuestPassSession = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { quizId, successUrl, cancelUrl } = req.data as {
      quizId: string; successUrl: string; cancelUrl: string;
    };
    if (!quizId) throw new HttpsError('invalid-argument', 'quizId is required');

    const stripe    = getStripe();
    const uid       = req.auth.uid;
    const userDoc   = await db.collection('users').doc(uid).get();
    const userData  = userDoc.data() ?? {};

    let customerId: string = userData['stripeCustomerId'] ?? '';
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData['email'] ?? undefined,
        name:  userData['displayName'] ?? undefined,
        metadata: { uid },
      });
      customerId = customer.id;
      await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: GUEST_PASS_PRICE_ID, quantity: 1 }],
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      metadata:             { uid, type: 'guest_pass', quizId },
    });

    return { url: session.url };
  }
);

// -----------------------------------------------
// Callable: createPortalSession
// Opens the Stripe Customer Portal for self-service
// -----------------------------------------------
export const createPortalSession = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { returnUrl } = req.data as { returnUrl: string };
    const stripe   = getStripe();
    const uid      = req.auth.uid;
    const userDoc  = await db.collection('users').doc(uid).get();
    const customerId: string = userDoc.data()?.['stripeCustomerId'] ?? '';

    if (!customerId) throw new HttpsError('not-found', 'No Stripe customer found for this user');

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }
);

// -----------------------------------------------
// Callable: getSubscriptionPlanNames
// Returns Stripe product name + description for each tier
// -----------------------------------------------
export const getSubscriptionPlanNames = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (): Promise<Record<string, { name: string; description: string }>> => {
    const stripe = getStripe();
    const entries = await Promise.all(
      (Object.entries(STRIPE_PRICES) as [string, Record<string, { id: string }>][])
        .map(async ([tier, prices]) => {
          const price = await stripe.prices.retrieve(
            Object.values(prices)[0].id,
            { expand: ['product'] }
          );
          const product = price.product as Stripe.Product;
          return [tier, { name: product.name, description: product.description ?? '' }] as const;
        })
    );
    return Object.fromEntries(entries);
  }
);

// -----------------------------------------------
// HTTP: stripeWebhook
// Handles Stripe events and writes to Firestore
// -----------------------------------------------
export const stripeWebhook = onRequest(
  { secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
  async (req, res) => {
    const sig    = req.headers['stripe-signature'] as string;
    const secret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!secret) { res.status(500).send('Webhook secret not configured'); return; }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe);
          break;
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionChange(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await handleInvoicePaid(event.data.object as Stripe.Invoice, stripe);
          break;
        case 'invoice.payment_failed':
          await handleInvoiceFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          // Unhandled event type — ignore
      }
    } catch (err) {
      console.error('Error handling Stripe event:', err);
      res.status(500).send('Internal error handling webhook');
      return;
    }

    res.json({ received: true });
  }
);

async function findUidByCustomerId(customerId: string): Promise<string | null> {
  const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  const uid  = session.metadata?.['uid'];
  if (!uid) return;

  if (session.mode === 'payment' && session.metadata?.['type'] === 'guest_pass') {
    const quizId = session.metadata?.['quizId'];
    if (!quizId) return;

    // Write permanent per-quiz access to users/{uid}/quizAccess/{quizId}
    await db.collection('users').doc(uid)
      .collection('quizAccess').doc(quizId).set({
        quizId,
        paidAt:          Timestamp.now(),
        paymentIntentId: session.payment_intent ?? '',
        amount:          session.amount_total ?? 0,
      });

    await db.collection('payments').add({
      uid,
      displayName: session.customer_details?.name ?? '',
      email:       session.customer_details?.email ?? '',
      amount:      session.amount_total ?? 0,
      currency:    session.currency ?? 'aud',
      status:      'succeeded',
      type:        'guest_pass',
      description: `Quiz Pass — ${quizId}`,
      quizId,
      stripePaymentIntentId: session.payment_intent ?? '',
      createdAt:   Timestamp.now(),
    });
  }
  if (session.mode === 'subscription') {
    // Record the initial subscription start — doc ID prevents duplicates on webhook retry
    const sessionId = session.id;
    await db.collection('userEvents').doc(`subscription_started_${sessionId}`).set({
      type:      'subscription_started',
      uid,
      timestamp: Timestamp.now(),
    });
  }
}

function stripeIntervalToBillingInterval(recurring: Stripe.Price.Recurring | null): 'quarter' | 'year' | null {
  if (!recurring) return null;
  if (recurring.interval === 'year') return 'year';
  if (recurring.interval === 'month' && recurring.interval_count === 3) return 'quarter';
  return null;
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const uid = await findUidByCustomerId(customerId);
  if (!uid) return;

  const price    = sub.items.data[0]?.price;
  const priceId  = price?.id ?? '';
  const status   = sub.status;
  const isActive = status === 'active' || status === 'trialing';

  const writes: Promise<unknown>[] = [
    db.collection('users').doc(uid).set({
      subscriptionId:               sub.id,
      subscriptionStatus:           status,
      subscriptionTier:             PRICE_TIER_MAP[priceId] ?? null,
      subscriptionCurrentPeriodEnd: Timestamp.fromMillis(sub.current_period_end * 1000),
      cancelAtPeriodEnd:            sub.cancel_at_period_end,
      stripePriceId:                priceId,
      billingInterval:              stripeIntervalToBillingInterval(price?.recurring ?? null),
      billingAmountCents:           price?.unit_amount ?? 0,
      isMember:                     isActive,
      ...(status === 'canceled' ? { canceledAt: Timestamp.now() } : {}),
    }, { merge: true }),
  ];

  if (status === 'canceled') {
    // Record cancellation event — doc ID prevents duplicates on webhook retry
    writes.push(
      db.collection('userEvents').doc(`subscription_cancelled_${sub.id}`).set({
        type:      'subscription_cancelled',
        uid,
        tier:      PRICE_TIER_MAP[priceId] ?? null,
        timestamp: Timestamp.now(),
      })
    );
  }

  await Promise.all(writes);
}

async function handleInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? '';
  const uid = await findUidByCustomerId(customerId);
  if (!uid) return;

  const userSnap   = await db.collection('users').doc(uid).get();
  const userData   = userSnap.data() ?? {};
  const priceId    = invoice.lines?.data?.[0]?.price?.id ?? '';
  const tier       = PRICE_TIER_MAP[priceId] ?? null;

  await db.collection('payments').add({
    uid,
    displayName:           userData['displayName'] ?? '',
    email:                 userData['email'] ?? '',
    amount:                invoice.amount_paid ?? 0,
    currency:              invoice.currency ?? 'aud',
    status:                'succeeded',
    type:                  'subscription',
    tier,
    description:           invoice.description ?? `Subscription — ${tier ?? 'unknown'}`,
    stripeInvoiceId:       invoice.id,
    stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : '',
    createdAt:             Timestamp.now(),
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? '';
  const uid = await findUidByCustomerId(customerId);
  if (!uid) return;

  const userSnap = await db.collection('users').doc(uid).get();
  const userData = userSnap.data() ?? {};
  const priceId  = invoice.lines?.data?.[0]?.price?.id ?? '';
  const tier     = PRICE_TIER_MAP[priceId] ?? null;

  await db.collection('users').doc(uid).set({
    subscriptionStatus: 'past_due',
    isMember: false,
  }, { merge: true });

  await db.collection('payments').add({
    uid,
    displayName:     userData['displayName'] ?? '',
    email:           userData['email'] ?? '',
    amount:          invoice.amount_due ?? 0,
    currency:        invoice.currency ?? 'aud',
    status:          'failed',
    type:            'subscription',
    tier,
    description:     `Failed payment — ${tier ?? 'unknown'}`,
    stripeInvoiceId: invoice.id,
    createdAt:       Timestamp.now(),
  });
}

// -----------------------------------------------
// Admin Callable: adminCancelSubscription
// -----------------------------------------------
export const adminCancelSubscription = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (req) => {
    await assertAdmin(req.auth?.uid);
    const { subscriptionId } = req.data as { uid: string; subscriptionId: string };
    if (!subscriptionId) throw new HttpsError('invalid-argument', 'subscriptionId required');

    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return { success: true };
  }
);

// -----------------------------------------------
// Admin Callable: adminRefundPayment
// -----------------------------------------------
export const adminRefundPayment = onCall(
  { secrets: ['STRIPE_SECRET_KEY'] },
  async (req) => {
    await assertAdmin(req.auth?.uid);
    const { paymentId, paymentIntentId } = req.data as {
      paymentId: string; paymentIntentId: string;
    };
    if (!paymentIntentId) throw new HttpsError('invalid-argument', 'paymentIntentId required');

    const stripe = getStripe();
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    await db.collection('payments').doc(paymentId).set({
      status:       'refunded',
      refundedAt:   Timestamp.now(),
      refundAmount: refund.amount,
    }, { merge: true });

    return { success: true, refundId: refund.id };
  }
);

// -----------------------------------------------
// Admin Callable: adminGrantGuestAccess
// Manually grants permanent quiz access to any user
// -----------------------------------------------
export const adminGrantGuestAccess = onCall(async (req) => {
  await assertAdmin(req.auth?.uid);
  const { uid, quizId } = req.data as { uid: string; quizId: string };
  if (!uid)    throw new HttpsError('invalid-argument', 'uid required');
  if (!quizId) throw new HttpsError('invalid-argument', 'quizId required');

  await db.collection('users').doc(uid)
    .collection('quizAccess').doc(quizId).set({
      quizId,
      paidAt:          Timestamp.now(),
      paymentIntentId: 'admin_granted',
      amount:          0,
    });

  return { success: true };
});

async function assertAdmin(uid?: string) {
  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in');
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.data()?.['isAdmin']) throw new HttpsError('permission-denied', 'Admin only');
}
