import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { FieldValue } from 'firebase-admin/firestore';
import * as maxmind from 'maxmind';
import * as path from 'path';
import { BigQuery } from '@google-cloud/bigquery';
// Stripe (deprecated — replaced by RevenueCat Web Billing)
// import Stripe from 'stripe';
// import { PRICE_TIER_MAP } from './stripe-config.js';

const luxon = require('luxon');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ===============================
// MaxMind geo lookup (shared, lazy singleton)
// ===============================
interface GeoLocation {
    country: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
}

let geoReaderPromise: Promise<maxmind.Reader<maxmind.CityResponse> | null> | null = null;

function getGeoReader(): Promise<maxmind.Reader<maxmind.CityResponse> | null> {
    if (!geoReaderPromise) {
        const dbPath = path.join(__dirname, '..', 'GeoLite2-City.mmdb');
        geoReaderPromise = maxmind.open<maxmind.CityResponse>(dbPath).catch((err) => {
            console.error('MaxMind database failed to load:', err);
            geoReaderPromise = null; // allow retry on next call
            return null;
        });
    }
    return geoReaderPromise;
}

// ===============================
// BigQuery client (shared, lazy singleton)
// ===============================
const BQ_LOCATION = 'US';
const BQ_DATASET = 'weeklyfifty_analytics';
let bqClient: BigQuery | null = null;

function getBigQuery(): BigQuery {
    if (!bqClient) bqClient = new BigQuery({ location: BQ_LOCATION });
    return bqClient;
}

// BQ returns TIMESTAMP cells as { value: 'iso-string' } in the JS client.
// This helper normalises both that shape and any plain string back to ISO.
function tsToIso(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
        return String((v as { value: string }).value);
    }
    return null;
}

// Verifies a Firebase ID token from the Authorization header. Returns true if
// the token's uid matches expectedUid OR the user has isAdmin=true. Otherwise
// writes a 401/403 response and returns false.
async function requireUidOrAdmin(req: Request, res: Response, expectedUid: string): Promise<boolean> {
    const authHeader = (req.headers.authorization ?? '').toString();
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
        res.status(401).json({ error: 'Missing bearer token' });
        return false;
    }
    try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        if (decoded.uid === expectedUid) return true;
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        if (userDoc.exists && userDoc.data()?.['isAdmin'] === true) return true;
        res.status(403).json({ error: 'Forbidden' });
        return false;
    } catch (err) {
        console.error('verifyIdToken failed:', err);
        res.status(401).json({ error: 'Invalid token' });
        return false;
    }
}

async function lookupGeoFromIp(ip: string | null | undefined): Promise<GeoLocation | null> {
    if (!ip || ip === 'unknown') return null;
    const reader = await getGeoReader();
    if (!reader) return null;
    try {
        const geo = reader.get(ip);
        if (!geo) return null;
        return {
            country: geo.country?.names?.en ?? null,
            city: geo.city?.names?.en ?? null,
            latitude: geo.location?.latitude ?? null,
            longitude: geo.location?.longitude ?? null
        };
    } catch (err) {
        console.warn(`Geo lookup failed for IP ${ip}:`, err);
        return null;
    }
}

// ===============================
// /api/getLatestQuiz
// ===============================
app.get('/api/getLatestQuiz', async (req: Request, res: Response): Promise<void> => {
    try {
        const now = Timestamp.fromDate(new Date());
        const snapshot = await db.collection('quizzes').where('quizType', '==', 1).where('deploymentDate', '<=', now).orderBy('deploymentDate', 'desc').limit(1).get();

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
        const snapshot = await db.collection('quizzes').where('quizType', '==', 3).where('collab', '==', quizCollab).where('deploymentDate', '<=', now).orderBy('deploymentDate', 'desc').limit(1).get();

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
        const snapshot = await db.collection('quizzes').where('quizType', '==', 1).where('deploymentDate', '<=', now).orderBy('deploymentDate', 'desc').get();

        const quizzes = snapshot.docs.map((doc) => {
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

        const snapshot = await db
            .collection('quizzes')
            .where('quizId', '==', quizId) // <-- now numeric
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

        const snapshot = await db
            .collection('quizzes')
            .where('quizSlug', '==', quizSlug) // <-- now numeric
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
// Backed by BigQuery procedures sp_quiz_summary + sp_quiz_question_accuracy.
// Response shape is kept identical to the previous Firestore-scanning version
// so the admin UI does not need to change.
// ===============================
app.get('/api/quizStats/:quizId', async (req: Request, res: Response): Promise<void> => {
    try {
        const quizId = req.params.quizId;
        const bq = getBigQuery();

        const [[summaryRows], [questionRows]] = await Promise.all([
            bq.query({
                query: `CALL \`${BQ_DATASET}.sp_quiz_summary\`(@quiz_id)`,
                params: { quiz_id: quizId },
                location: BQ_LOCATION
            }),
            bq.query({
                query: `CALL \`${BQ_DATASET}.sp_quiz_question_accuracy\`(@quiz_id)`,
                params: { quiz_id: quizId },
                location: BQ_LOCATION
            })
        ]);

        const summary = (summaryRows[0] ?? {}) as Record<string, unknown>;
        const attempts = Number(summary.attempts ?? 0);

        if (attempts === 0) {
            res.status(404).json({ message: 'No results found for this quiz' });
            return;
        }

        const questionAccuracy = questionRows.map((r: Record<string, unknown>) => ({
            questionId: String(r.question_id),
            correctCount: Number(r.correct_count ?? 0),
            totalAttempts: Number(r.total_attempts ?? 0),
            correctRate: Number(r.correct_rate ?? 0)
        }));

        const hardestQuestions = [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
        const easiestQuestions = [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

        res.status(200).json({
            quizId,
            attempts,
            completedCount: Number(summary.completed_count ?? 0),
            averageScore: Number(summary.avg_score ?? 0),
            averageTime: Number(summary.avg_time_seconds ?? 0),
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
// Backed by BigQuery procedure sp_quiz_location_stats. Geo enrichment now happens
// at write time inside logQuizStart / logFiftyPlusQuizStart (see lookupGeoFromIp),
// so there's no per-request MaxMind lookup here any more.
// ===============================
app.get('/api/quizLocationStats/:quizId', async (req: Request, res: Response): Promise<void> => {
    try {
        const quizId = req.params.quizId;
        const bq = getBigQuery();

        const [rows] = await bq.query({
            query: `CALL \`${BQ_DATASET}.sp_quiz_location_stats\`(@quiz_id)`,
            params: { quiz_id: quizId },
            location: BQ_LOCATION
        });

        type Row = Record<string, unknown>;
        const shapeRow = (r: Row) => ({
            name: String(r.name ?? ''),
            count: Number(r.count ?? 0),
            averageScore: Number(r.average_score ?? 0),
            averageTime: Number(r.average_time ?? 0),
            latitude: r.latitude != null ? Number(r.latitude) : undefined,
            longitude: r.longitude != null ? Number(r.longitude) : undefined
        });

        const countries = rows.filter((r: Row) => r.level === 'country').map(shapeRow);
        const cities = rows
            .filter((r: Row) => r.level === 'city')
            .map(shapeRow)
            .slice(0, 20);

        const totalResults = countries.reduce((sum, c) => sum + c.count, 0);
        const mapData = countries
            .filter((c) => c.latitude !== undefined && c.longitude !== undefined)
            .map((c) => ({ name: c.name, latitude: c.latitude, longitude: c.longitude, count: c.count }));

        res.status(200).json({ quizId, totalResults, countries, cities, mapData });
    } catch (error) {
        console.error('Error generating location stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===============================
// /api/quizHourlyCounts/:quizId
// Hourly completion buckets (Australia/Adelaide), replaces the hourlyCounts map
// that used to live on quizAggregates/{quizId}.
// ===============================
app.get('/api/quizHourlyCounts/:quizId', async (req: Request, res: Response): Promise<void> => {
    try {
        const quizId = req.params.quizId;
        const [rows] = await getBigQuery().query({
            query: `CALL \`${BQ_DATASET}.sp_quiz_hourly_counts\`(@quiz_id)`,
            params: { quiz_id: quizId },
            location: BQ_LOCATION
        });

        const buckets = rows.map((r: Record<string, unknown>) => ({
            hourKey: String(r.hour_key),
            completions: Number(r.completions ?? 0)
        }));
        res.status(200).json({ quizId, buckets });
    } catch (error) {
        console.error('Error generating hourly counts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===============================
// /api/quizThinkingTimes/:quizId
// Average seconds between consecutive question clicks, per question. Replaces
// avgTimeBetweenByQuestion on quizAggregates.
// ===============================
app.get('/api/quizThinkingTimes/:quizId', async (req: Request, res: Response): Promise<void> => {
    try {
        const quizId = req.params.quizId;
        const [rows] = await getBigQuery().query({
            query: `CALL \`${BQ_DATASET}.sp_quiz_thinking_times\`(@quiz_id)`,
            params: { quiz_id: quizId },
            location: BQ_LOCATION
        });

        const perQuestion = rows.map((r: Record<string, unknown>) => ({
            questionId: String(r.question_id),
            avgDiffSec: Number(r.avg_diff_sec ?? 0),
            sampleCount: Number(r.sample_count ?? 0)
        }));

        const overallAvg = perQuestion.length > 0 ? perQuestion.reduce((s, q) => s + q.avgDiffSec, 0) / perQuestion.length : 0;

        res.status(200).json({ quizId, avgTimeBetweenQuestions: overallAvg, perQuestion });
    } catch (error) {
        console.error('Error generating thinking times:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===============================
// /api/allQuizSummaries
// One row per quiz_id with attempt and score aggregates. Powers the
// "last N quizzes" chart; frontend joins rows to Firestore quiz metadata.
// ===============================
app.get('/api/allQuizSummaries', async (_req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await getBigQuery().query({
            query: `CALL \`${BQ_DATASET}.sp_all_quiz_summaries\`()`,
            location: BQ_LOCATION
        });

        const summaries = rows.map((r: Record<string, unknown>) => ({
            quizId: String(r.quiz_id),
            completedCount: Number(r.completed_count ?? 0),
            abandonedCount: Number(r.abandoned_count ?? 0),
            averageScore: Number(r.avg_score ?? 0),
            maxScore: Number(r.max_score ?? 0),
            minScore: Number(r.min_score ?? 0),
            latestCompletionAt: r.latest_completion_at ? new Date((r.latest_completion_at as { value: string }).value ?? String(r.latest_completion_at)).toISOString() : null
        }));

        res.status(200).json({ summaries });
    } catch (error) {
        console.error('Error generating all quiz summaries:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===============================
// /api/userStats/:userId
// Powers /fiftyPlus/stats. Fans out 9 BQ procs in parallel and assembles the
// UserStatsResponse expected by src/app/shared/models/userStats.model.ts.
// Auth: caller must be the same user OR an admin.
// ===============================
app.get('/api/userStats/:userId', async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.userId;
    if (!(await requireUidOrAdmin(req, res, userId))) return;
    try {
        const bq = getBigQuery();
        const call = (proc: string, params: Record<string, unknown> = {}) =>
            bq
                .query({
                    query: `CALL \`${BQ_DATASET}.${proc}\`(${Object.keys(params)
                        .map((k) => `@${k}`)
                        .join(', ')})`,
                    params: { user_id: userId, ...params },
                    location: BQ_LOCATION
                })
                .then(([rows]) => rows as Record<string, unknown>[]);

        const [summaryRows, historyRows, byTypeRows, categoryRows, timeRows, highlightRows, localRankRows, deepDiveRows, dailyGameRows] = await Promise.all([
            call('sp_user_stats', { user_id: userId }),
            call('sp_user_quiz_history', { user_id: userId }),
            call('sp_user_quiz_type_breakdown', { user_id: userId }),
            call('sp_user_category_stats', { user_id: userId }),
            call('sp_user_time_patterns', { user_id: userId }),
            call('sp_user_question_highlights', { user_id: userId }),
            call('sp_user_local_rank', { user_id: userId }),
            call('sp_user_recent_deep_dives', { user_id: userId, n: 5 }),
            call('sp_user_daily_games', { user_id: userId }).catch(() => null) // proc not yet deployed
        ]);

        const s = (summaryRows[0] ?? {}) as Record<string, unknown>;
        const summary = {
            totalCompleted: Number(s.total_completed ?? 0),
            totalQuestionsAnswered: Number(s.total_questions_answered ?? 0),
            correctTotal: Number(s.correct_total ?? 0),
            correctRate: Number(s.correct_rate ?? 0),
            lifetimeScore: Number(s.lifetime_score ?? 0),
            personalBestScore: Number(s.personal_best_score ?? 0),
            personalBestQuizId: s.personal_best_quiz_id != null ? Number(s.personal_best_quiz_id) : null,
            firstQuizCompletedAt: tsToIso(s.first_quiz_completed_at),
            mostRecentQuizId: s.most_recent_quiz_id != null ? Number(s.most_recent_quiz_id) : null,
            mostRecentScore: s.most_recent_score != null ? Number(s.most_recent_score) : null,
            mostRecentCompletedAt: tsToIso(s.most_recent_completed_at),
            weeklyStreak: Number(s.weekly_streak ?? 0),
            longestWeeklyStreak: Number(s.longest_weekly_streak ?? 0),
            totalWeeksPlayed: Number(s.total_weeks_played ?? 0),
            improvement4wVsFirst4w: Number(s.improvement_4w_vs_first_4w ?? 0)
        };

        const history = historyRows.map((r) => ({
            quizId: Number(r.quiz_id),
            score: Number(r.score ?? 0),
            total: Number(r.total ?? 0),
            completedAt: tsToIso(r.completed_at) ?? '',
            quizAvgScore: Number(r.quiz_avg_score ?? 0),
            wasPersonalBestAtTime: Boolean(r.was_personal_best_at_time),
            scoreVsAvg: Number(r.score_vs_avg ?? 0)
        }));

        const byQuizType = byTypeRows.map((r) => ({
            type: String(r.type) as 'weekly' | 'fiftyPlus' | 'collab' | 'questionType',
            label: String(r.label ?? ''),
            completed: Number(r.completed ?? 0),
            averageScore: Number(r.average_score ?? 0),
            bestScore: Number(r.best_score ?? 0),
            correctRate: Number(r.correct_rate ?? 0),
            lastPlayedAt: tsToIso(r.last_played_at)
        }));

        const categories = categoryRows.map((r) => ({
            category: String(r.category ?? ''),
            attempts: Number(r.attempts ?? 0),
            correct: Number(r.correct ?? 0),
            correctRate: Number(r.correct_rate ?? 0),
            correctRateVsGlobal: Number(r.correct_rate_vs_global ?? 0)
        }));

        const t = (timeRows[0] ?? {}) as Record<string, unknown>;
        const timePatterns = {
            mostCommonHour: Number(t.most_common_hour ?? 0),
            mostCommonDow: Number(t.most_common_dow ?? 0),
            hourBuckets: Array.isArray(t.hour_buckets) ? (t.hour_buckets as unknown[]).map((n) => Number(n)) : new Array(24).fill(0),
            dowBuckets: Array.isArray(t.dow_buckets) ? (t.dow_buckets as unknown[]).map((n) => Number(n)) : new Array(7).fill(0),
            fastestSeconds: t.fastest_seconds != null ? Number(t.fastest_seconds) : null,
            slowestSeconds: t.slowest_seconds != null ? Number(t.slowest_seconds) : null,
            averageSeconds: t.average_seconds != null ? Number(t.average_seconds) : null
        };

        const shapeHighlight = (r: Record<string, unknown>) => ({
            quizId: Number(r.quiz_id),
            questionId: String(r.question_id),
            globalCorrectRate: Number(r.global_correct_rate ?? 0)
        });
        const highlights = {
            hardGotRight: highlightRows.filter((r) => r.kind === 'hardGotRight').map(shapeHighlight),
            easyGotWrong: highlightRows.filter((r) => r.kind === 'easyGotWrong').map(shapeHighlight)
        };

        const lr = (localRankRows[0] ?? {}) as Record<string, unknown>;
        const localRank = {
            city: lr.city != null ? String(lr.city) : null,
            cityRank: lr.city_rank != null ? Number(lr.city_rank) : null,
            cityTotalPlayers: lr.city_total_players != null ? Number(lr.city_total_players) : null,
            cityAvgScore: lr.city_avg_score != null ? Number(lr.city_avg_score) : null,
            country: lr.country != null ? String(lr.country) : null,
            countryRank: lr.country_rank != null ? Number(lr.country_rank) : null,
            countryTotalPlayers: lr.country_total_players != null ? Number(lr.country_total_players) : null
        };

        const shapeQuestion = (q: Record<string, unknown>) => ({
            questionNumber: Number(q.question_number ?? 0),
            questionId: String(q.question_id ?? ''),
            globalCorrectRate: Number(q.global_correct_rate ?? 0),
            userCorrect: Boolean(q.user_correct),
            userAnswered: Boolean(q.user_answered)
        });
        const deepDives = deepDiveRows.map((r) => ({
            quizId: Number(r.quiz_id),
            quizLabel: String(r.quiz_label ?? ''),
            quizType: String(r.quiz_type) as 'weekly' | 'fiftyPlus' | 'collab' | 'questionType',
            completedAt: tsToIso(r.completed_at) ?? '',
            userScore: Number(r.user_score ?? 0),
            total: Number(r.total ?? 0),
            avgScore: Number(r.avg_score ?? 0),
            questions: Array.isArray(r.questions) ? (r.questions as Record<string, unknown>[]).map(shapeQuestion) : []
        }));

        let dailyGames: unknown = null;
        if (dailyGameRows && dailyGameRows.length > 0) {
            const dg = dailyGameRows[0] as Record<string, unknown>;
            dailyGames = {
                totalDaysPlayed: Number(dg.total_days_played ?? 0),
                totalSolves: Number(dg.total_solves ?? 0),
                activeStreak: Number(dg.active_streak ?? 0),
                games: Array.isArray(dg.games) ? dg.games : []
            };
        }

        res.status(200).json({ summary, history, categories, timePatterns, highlights, localRank, byQuizType, deepDives, dailyGames });
    } catch (error) {
        console.error('Error generating user stats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===============================
// /api/userQuizDeepDive/:userId/:quizId
// Lazy fetch for one deep-dive when the user changes the dropdown selection.
// ===============================
app.get('/api/userQuizDeepDive/:userId/:quizId', async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.userId;
    const quizIdNum = Number(req.params.quizId);
    if (!Number.isFinite(quizIdNum)) {
        res.status(400).json({ error: 'Invalid quizId' });
        return;
    }
    if (!(await requireUidOrAdmin(req, res, userId))) return;
    try {
        const bq = getBigQuery();
        const [rows] = await bq.query({
            query: `CALL \`${BQ_DATASET}.sp_user_quiz_deep_dive\`(@user_id, @quiz_id)`,
            params: { user_id: userId, quiz_id: quizIdNum },
            location: BQ_LOCATION
        });

        const r = (rows[0] ?? null) as Record<string, unknown> | null;
        if (!r) {
            res.status(404).json({ error: 'No deep-dive data for this user/quiz' });
            return;
        }

        const shapeQuestion = (q: Record<string, unknown>) => ({
            questionNumber: Number(q.question_number ?? 0),
            questionId: String(q.question_id ?? ''),
            globalCorrectRate: Number(q.global_correct_rate ?? 0),
            userCorrect: Boolean(q.user_correct),
            userAnswered: Boolean(q.user_answered)
        });

        res.status(200).json({
            quizId: Number(r.quiz_id),
            quizLabel: String(r.quiz_label ?? ''),
            quizType: String(r.quiz_type) as 'weekly' | 'fiftyPlus' | 'collab' | 'questionType',
            completedAt: tsToIso(r.completed_at) ?? '',
            userScore: Number(r.user_score ?? 0),
            total: Number(r.total ?? 0),
            avgScore: Number(r.avg_score ?? 0),
            questions: Array.isArray(r.questions) ? (r.questions as Record<string, unknown>[]).map(shapeQuestion) : []
        });
    } catch (error) {
        console.error('Error generating quiz deep dive:', error);
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
            const existingSnap = await usersCol.where('externalQuizId', '==', userId).limit(1).get();

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

        const geo = await lookupGeoFromIp(ip);

        // Create the quizResult session
        const quizResultRef = await db.collection('quizResults').add({
            quizId,
            userId: dbUserId, // null if no userId provided
            status: 'in_progress',
            startedAt: new Date(),
            completedAt: null,
            score: null,
            total: null,
            answers: [],
            ip,
            geo,
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

// ===============================
// /api/logQuizClose
// sendBeacon target fired on pagehide / beforeunload
// ===============================
app.post('/api/logQuizClose', async (req: Request, res: Response): Promise<void> => {
    try {
        const { resultId } = req.body;
        if (!resultId) {
            res.status(400).json({ message: 'resultId is required' });
            return;
        }

        const resultRef = db.collection('quizResults').doc(resultId);
        const snap = await resultRef.get();
        if (!snap.exists) {
            res.status(404).json({ message: 'Result not found' });
            return;
        }

        const data = snap.data();
        if (data?.status !== 'in_progress') {
            res.status(200).json({ message: 'Result not in progress; ignored' });
            return;
        }

        await resultRef.update({ closedAt: new Date() });
        res.status(200).json({ message: 'Close recorded' });
    } catch (error) {
        console.error('Error logging quiz close:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ---- Firestore trigger ----
export const quizStarted = onDocumentCreated('quizResults/{sessionId}', async (event) => {
    const data = event.data?.data();
    if (!data) return;
    if (data.retro && data.retro === true) return; // Skip retro quiz results from stats

    const quizId = data.quizId;
    if (!quizId) return;

    // Increment inProgressCount
    const aggRef = db.collection('quizAggregates').doc(String(quizId));
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
        updatedAt: new Date()
    });

    console.log(`⬆️ In-progress incremented for quiz ${quizId}`);
});

// ---- Firestore trigger ----
export const quizFinished = onDocumentUpdated('quizResults/{sessionId}', async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return;
    if (before?.completedAt) return; // Only process newly completed quizzes
    if (after.retro && after.retro === true) return; // Skip retro quiz results from stats

    const quizId = after.quizId;
    if (!quizId) return;

    const aggRef = db.collection('quizAggregates').doc(String(quizId));

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
              validStatsCount: 0
          };

    const data = after;
    const startedAt = data.startedAt?.toDate?.() ?? new Date(data.startedAt);
    const completedAt = data.completedAt?.toDate?.() ?? new Date(data.completedAt);
    const answers = data.answers || [];
    const score = data.score ?? 0;

    // --- Update raw aggregates ---
    agg.completedCount = (agg.completedCount || 0) + 1;
    // If the sweep already flipped wasAbandoned, it also decremented inProgressCount and
    // incremented abandonedCount — don't double-count here. Reconcile by moving this
    // session from the abandoned bucket back into the completed column.
    if (before?.wasAbandoned === true || after.wasAbandoned === true) {
        agg.abandonedCount = Math.max((agg.abandonedCount || 0) - 1, 0);
    } else {
        agg.inProgressCount = (agg.inProgressCount || 0) - 1;
    }
    agg.totalScore = (agg.totalScore || 0) + score;

    let duration = (completedAt.getTime() - startedAt.getTime()) / 1000;
    if (duration > 3 * 60 * 60) duration = 3 * 60 * 60;
    agg.totalTime = (agg.totalTime || 0) + duration;

    // Hourly counts
    const startedAdelaide = luxon.DateTime.fromJSDate(startedAt).setZone('Australia/Adelaide');
    const hourKey = startedAdelaide.toFormat('yyyy-MM-dd HH');
    agg.hourlyCounts = agg.hourlyCounts || {};
    agg.hourlyCounts[hourKey] = (agg.hourlyCounts[hourKey] || 0) + 1;

    // Location counts placeholder
    const locKey = 'Unknown - Unknown';
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
    const sorted = [...answers].filter((a: any) => a.timestamp).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    agg.sequentialQuestionTimes = agg.sequentialQuestionTimes || [];
    for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].timestamp).getTime();
        const curr = new Date(sorted[i].timestamp).getTime();
        const diffSec = (curr - prev) / 1000;
        if (diffSec > 0 && diffSec <= 10 * 60) {
            agg.sequentialQuestionTimes.push({
                questionId: String(sorted[i - 1].questionId),
                diffSec
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
    agg.avgTimeBetweenQuestions = agg.sequentialQuestionTimes.length ? agg.sequentialQuestionTimes.reduce((a: number, b: { questionId: string; diffSec: number }) => a + b.diffSec, 0) / agg.sequentialQuestionTimes.length : 0;

    // Average time between by question
    const perQuestion: Record<string, { total: number; count: number }> = {};
    for (const entry of agg.sequentialQuestionTimes) {
        if (!perQuestion[entry.questionId]) perQuestion[entry.questionId] = { total: 0, count: 0 };
        perQuestion[entry.questionId].total += entry.diffSec;
        perQuestion[entry.questionId].count++;
    }
    const avgTimeBetweenByQuestion = Object.entries(perQuestion).map(([qid, { total, count }]) => ({
        questionId: qid,
        avgDiffSec: total / count
    }));

    // Question accuracy
    const questionAccuracy = Object.entries(agg.questionStats as Record<string, { total: number; correct: number }>).map(([qid, stat]) => ({
        questionId: qid,
        totalAttempts: stat.total,
        correctCount: stat.correct,
        correctRate: stat.total > 0 ? stat.correct / stat.total : 0
    }));

    // Hardest/easiest questions
    const hardestQuestions = [...questionAccuracy].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);
    const easiestQuestions = [...questionAccuracy].sort((a, b) => b.correctRate - a.correctRate).slice(0, 5);

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
            updatedAt: new Date()
        },
        { merge: true }
    );

    console.log(`✅ Aggregates incrementally updated for quiz ${quizId}`);
});

app.post('/api/logFiftyPlusQuizStart', async (req: Request, res: Response): Promise<void> => {
    try {
        const { quizId, emailAddress } = req.body;

        if (!quizId) {
            res.status(400).json({ message: 'quizId is required' });
            return;
        }

        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
        let dbUserId: string | null = null;

        if (emailAddress) {
            const usersCol = db.collection('users');
            const existingSnap = await usersCol.where('email', '==', emailAddress).limit(1).get();

            if (!existingSnap.empty) {
                // User exists → increment login count
                const userDoc = existingSnap.docs[0];
                dbUserId = userDoc.id;
                await userDoc.ref.update({
                    loginCount: (userDoc.data().loginCount || 0) + 1,
                    lastLoginAt: new Date(),
                    updatedAt: new Date()
                });
            } else {
                // User doesn't exist → create new user
                const newUserRef = usersCol.doc();
                await newUserRef.set({
                    uid: newUserRef.id,
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
                    updatedAt: new Date()
                });
                dbUserId = newUserRef.id;
            }
        }

        const geo = await lookupGeoFromIp(ip);

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
            geo,
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
        const snapshot = await db.collection('users').where('externalQuizId', '==', externalQuizId).limit(1).get();

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
        case 'weekly':
            return `Every ${DAYS[s.dayOfWeek]}${time}`;
        case 'biweekly':
            return `Every other ${DAYS[s.dayOfWeek]}${time}`;
        case 'monthly': {
            const ordinal = s.weekOfMonth === -1 ? 'Last' : WEEK_ORDINALS[s.weekOfMonth] || '';
            return `${ordinal} ${DAYS[s.dayOfWeek]} of the month${time}`;
        }
        case 'custom':
            return `Selected dates${time}`;
        default:
            return '';
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
            const next = s.weekOfMonth === -1 ? nextLastWeekdayOfMonth(now, s.dayOfWeek, hours, minutes) : nextNthWeekdayOfMonth(now, s.weekOfMonth, s.dayOfWeek, hours, minutes);
            if (next && !isExcludedDate(next, s.exclusionDates)) candidates.push(next);
        } else if (s.type === 'custom' && Array.isArray(s.customDates)) {
            const future = (s.customDates as any[])
                .map((d: any) => (d?.seconds ? new Date(d.seconds * 1000) : new Date(d)))
                .filter((d: Date) => d > now)
                .sort((a: Date, b: Date) => a.getTime() - b.getTime());
            if (future.length > 0) candidates.push(future[0]);
        }
    }

    return candidates.length > 0 ? candidates.sort((a, b) => a.getTime() - b.getTime())[0] : null;
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
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const timeStr = nextQuiz.getHours() ? ` at ${formatTime12h(`${nextQuiz.getHours()}:${nextQuiz.getMinutes().toString().padStart(2, '0')}`)}` : '';
        nextQuizText = dateStr + timeStr;
    }

    const addressSection = address ? `${address}<br><br>` : '';
    return `${addressSection}${scheduleSection}<br><br><strong>Next Quiz</strong><br>${nextQuizText}`;
}

app.get('/api/getVenues', async (req: Request, res: Response): Promise<void> => {
    try {
        const snapshot = await db.collection('venues').where('isActive', '==', true).get();

        const venues = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })).filter((v) => !v.deletedAt);

        const result = venues.map((venue) => {
            const loc = venue.location || {};
            const address = loc.address;
            const nextQuiz = getNextQuizOccurrence(venue.quizSchedules || []);

            const primarySchedule = (venue.quizSchedules || []).find((s: any) => s.isActive && s.dayOfWeek != null);

            return {
                id: venue.id,
                title: venue.venueName || '',
                address,
                lat: String(loc.latitude ?? 0),
                lng: String(loc.longitude ?? 0),
                description: buildVenueDescription(venue.quizSchedules || [], nextQuiz, address),
                link: venue.websiteUrl || '',
                pic: venue.imageUrl || '',
                dayOfWeek: primarySchedule?.dayOfWeek ?? null
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching venues:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ===============================
// POST /api/submitContactForm
// Server-side spam protection: IP rate limit (max 3 per hour)
// ===============================
app.post('/api/submitContactForm', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, mobile, message } = req.body as { name?: string; email?: string; mobile?: string; message?: string };

        if (!name?.trim() || !message?.trim()) {
            res.status(400).json({ error: 'Name, email and message are required.' });
            return;
        }

        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';

        const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
        const recentSnap = await db.collection('contactFormSubmissions').where('ip', '==', ip).where('submittedAt', '>=', oneHourAgo).get();

        if (recentSnap.size >= 5) {
            res.status(429).json({ error: 'Too many submissions. Please try again later.' });
            return;
        }

        await db.collection('contactFormSubmissions').add({
            name: name.trim(),
            email: email?.trim() || '',
            mobile: mobile?.trim() || '',
            message: message.trim(),
            ip,
            submittedAt: Timestamp.now(),
            read: false
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error submitting contact form:', error);
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
// Scheduled sweep: mark stale in-progress quizzes as abandoned.
// Runs every 5 minutes. A session is "stale" if lastActivityAt is older than
// STALE_THRESHOLD_MINUTES and status is still 'in_progress'. This is the one
// place that decrements inProgressCount and increments abandonedCount for
// sessions that were never explicitly completed.
// ===============================
export const sweepAbandonedQuizzes = onSchedule(
    { schedule: 'every 5 minutes', timeoutSeconds: 300 },
    async () => {
        const STALE_THRESHOLD_MINUTES = 15;
        const threshold = Timestamp.fromDate(new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000));

        // Firestore can't express "wasAbandoned != true" directly, so filter by
        // status + lastActivityAt and skip already-flipped docs in the loop.
        const staleSnap = await db.collection('quizResults').where('status', '==', 'in_progress').where('lastActivityAt', '<', threshold).limit(500).get();

        if (staleSnap.empty) {
            console.log('Sweep: no stale quizResults found');
            return;
        }

        // Group by quizId so we make one aggregate update per quiz, not per session.
        const perQuiz = new Map<string, string[]>();
        for (const docSnap of staleSnap.docs) {
            const data = docSnap.data();
            if (data.wasAbandoned === true) continue;
            if (data.retro === true) continue;
            const quizId = data.quizId;
            if (!quizId) continue;
            const list = perQuiz.get(String(quizId)) || [];
            list.push(docSnap.id);
            perQuiz.set(String(quizId), list);
        }

        if (perQuiz.size === 0) {
            console.log('Sweep: nothing to flip (all stale docs already abandoned)');
            return;
        }

        // Flip each session in a batch, then adjust its quiz's aggregate counts.
        for (const [quizId, resultIds] of perQuiz.entries()) {
            const batch = db.batch();
            for (const id of resultIds) {
                batch.update(db.collection('quizResults').doc(id), { wasAbandoned: true });
            }
            await batch.commit();

            const aggRef = db.collection('quizAggregates').doc(quizId);
            await aggRef.set(
                {
                    abandonedCount: FieldValue.increment(resultIds.length),
                    inProgressCount: FieldValue.increment(-resultIds.length),
                    updatedAt: new Date()
                },
                { merge: true }
            );

            console.log(`Sweep: flagged ${resultIds.length} quiz ${quizId} session(s) as abandoned`);
        }
    }
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
/* ================================================================
 * DEPRECATED — Stripe billing implementation.
 * Replaced by RevenueCat Web Billing on the client. Kept here as reference
 * until the migration is validated in production.
 * ================================================================
const getStripe = (): InstanceType<typeof Stripe> => {
    const key = process.env['STRIPE_SECRET_KEY'];
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
};

// -----------------------------------------------
// Callable: createSubscriptionIntent
// Creates a Stripe Subscription and returns a client_secret for
// the embedded Stripe Payment Element to confirm payment on the frontend.
// -----------------------------------------------
export const createSubscriptionIntent = onCall({ secrets: ['STRIPE_SECRET_KEY'] }, async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');
    const { priceId } = req.data as { priceId: string };
    if (!priceId) throw new HttpsError('invalid-argument', 'priceId is required');

    const stripe = getStripe();
    const uid = req.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() ?? {};

    // Retrieve or create Stripe Customer
    let customerId: string = userData['stripeCustomerId'] ?? '';
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: userData['email'] ?? undefined,
            name: userData['displayName'] ?? undefined,
            metadata: { uid }
        });
        customerId = customer.id;
        await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Create subscription with incomplete payment — returns a client_secret for frontend confirmation
    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { uid }
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    return {
        clientSecret: paymentIntent?.client_secret ?? null,
        subscriptionId: subscription.id
    };
});

// const GUEST_PASS_PRICE_ID = process.env['STRIPE_GUEST_PASS_PRICE_ID'] ?? 'price_guest_pass';

// // -----------------------------------------------
// // Callable: createCheckoutSession
// // Creates a Stripe Checkout session for a subscription
// // -----------------------------------------------
// export const createCheckoutSession = onCall(
//   { secrets: ['STRIPE_SECRET_KEY'] },
//   async (req) => {
//     if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

//     const { priceId, successUrl, cancelUrl } = req.data as {
//       priceId: string; successUrl: string; cancelUrl: string;
//     };
//     if (!priceId || !successUrl || !cancelUrl) {
//       throw new HttpsError('invalid-argument', 'priceId, successUrl and cancelUrl are required');
//     }

//     const stripe = getStripe();
//     const uid    = req.auth.uid;
//     const userDoc = await db.collection('users').doc(uid).get();
//     const userData = userDoc.data() ?? {};

//     // Retrieve or create a Stripe customer
//     let customerId: string = userData['stripeCustomerId'] ?? '';
//     if (!customerId) {
//       const customer = await stripe.customers.create({
//         email: userData['email'] ?? undefined,
//         name:  userData['displayName'] ?? undefined,
//         metadata: { uid },
//       });
//       customerId = customer.id;
//       await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
//     }

//     const session = await stripe.checkout.sessions.create({
//       customer:             customerId,
//       mode:                 'subscription',
//       payment_method_types: ['card'],
//       line_items: [{ price: priceId, quantity: 1 }],
//       success_url:          successUrl,
//       cancel_url:           cancelUrl,
//       metadata:             { uid },
//     });

//     return { url: session.url };
//   }
// );

// // -----------------------------------------------
// // Callable: createGuestPassSession
// // Creates a Stripe Checkout session for a one-time quiz pass (permanent access)
// // -----------------------------------------------
// export const createGuestPassSession = onCall(
//   { secrets: ['STRIPE_SECRET_KEY'] },
//   async (req) => {
//     if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

//     const { quizId, successUrl, cancelUrl } = req.data as {
//       quizId: string; successUrl: string; cancelUrl: string;
//     };
//     if (!quizId) throw new HttpsError('invalid-argument', 'quizId is required');

//     const stripe    = getStripe();
//     const uid       = req.auth.uid;
//     const userDoc   = await db.collection('users').doc(uid).get();
//     const userData  = userDoc.data() ?? {};

//     let customerId: string = userData['stripeCustomerId'] ?? '';
//     if (!customerId) {
//       const customer = await stripe.customers.create({
//         email: userData['email'] ?? undefined,
//         name:  userData['displayName'] ?? undefined,
//         metadata: { uid },
//       });
//       customerId = customer.id;
//       await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
//     }

//     const session = await stripe.checkout.sessions.create({
//       customer:             customerId,
//       mode:                 'payment',
//       payment_method_types: ['card'],
//       line_items: [{ price: GUEST_PASS_PRICE_ID, quantity: 1 }],
//       success_url:          successUrl,
//       cancel_url:           cancelUrl,
//       metadata:             { uid, type: 'guest_pass', quizId },
//     });

//     return { url: session.url };
//   }
// );

// -----------------------------------------------
// Callable: createPortalSession
// Opens the Stripe Customer Portal for self-service
// -----------------------------------------------
export const createPortalSession = onCall({ secrets: ['STRIPE_SECRET_KEY'] }, async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const { returnUrl } = req.data as { returnUrl: string };
    const stripe = getStripe();
    const uid = req.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId: string = userDoc.data()?.['stripeCustomerId'] ?? '';

    if (!customerId) throw new HttpsError('not-found', 'No Stripe customer found for this user');

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
    });

    return { url: session.url };
});

// // -----------------------------------------------
// // Callable: getSubscriptionPlanNames
// // Returns Stripe product name + description for each tier
// // -----------------------------------------------
// export const getSubscriptionPlanNames = onCall(
//   { secrets: ['STRIPE_SECRET_KEY'] },
//   async (): Promise<Record<string, { name: string; description: string }>> => {
//     const stripe = getStripe();
//     const entries = await Promise.all(
//       (Object.entries(STRIPE_PRICES) as [string, Record<string, { id: string }>][])
//         .map(async ([tier, prices]) => {
//           const price = await stripe.prices.retrieve(
//             Object.values(prices)[0].id,
//             { expand: ['product'] }
//           );
//           const product = price.product as Stripe.Product;
//           return [tier, { name: product.name, description: product.description ?? '' }] as const;
//         })
//     );
//     return Object.fromEntries(entries);
//   }
// );

// -----------------------------------------------
// HTTP: stripeWebhook
// Handles Stripe events and writes to Firestore
// -----------------------------------------------
export const stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] }, async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const secret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!secret) {
        res.status(500).send('Webhook secret not configured');
        return;
    }

    const stripe = getStripe();
    let event: any;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    try {
        switch (event.type) {
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await handleSubscriptionChange(event.data.object);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaid(event.data.object, stripe);
                break;
            case 'invoice.payment_failed':
                await handleInvoiceFailed(event.data.object);
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
});

async function findUidByCustomerId(customerId: string): Promise<string | null> {
    const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
    if (snap.empty) return null;
    return snap.docs[0].id;
}

// async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
//   const uid  = session.metadata?.['uid'];
//   if (!uid) return;

//   if (session.mode === 'payment' && session.metadata?.['type'] === 'guest_pass') {
//     const quizId = session.metadata?.['quizId'];
//     if (!quizId) return;

//     // Write permanent per-quiz access to users/{uid}/quizAccess/{quizId}
//     await db.collection('users').doc(uid)
//       .collection('quizAccess').doc(quizId).set({
//         quizId,
//         paidAt:          Timestamp.now(),
//         paymentIntentId: session.payment_intent ?? '',
//         amount:          session.amount_total ?? 0,
//       });

//     await db.collection('payments').add({
//       uid,
//       displayName: session.customer_details?.name ?? '',
//       email:       session.customer_details?.email ?? '',
//       amount:      session.amount_total ?? 0,
//       currency:    session.currency ?? 'aud',
//       status:      'succeeded',
//       type:        'guest_pass',
//       description: `Quiz Pass — ${quizId}`,
//       quizId,
//       stripePaymentIntentId: session.payment_intent ?? '',
//       createdAt:   Timestamp.now(),
//     });
//   }
//   if (session.mode === 'subscription') {
//     // Record the initial subscription start — doc ID prevents duplicates on webhook retry
//     const sessionId = session.id;
//     await db.collection('userEvents').doc(`subscription_started_${sessionId}`).set({
//       type:      'subscription_started',
//       uid,
//       timestamp: Timestamp.now(),
//     });
//   }
// }

function stripeIntervalToBillingInterval(recurring: any | null): 'quarter' | 'year' | null {
    if (!recurring) return null;
    if (recurring.interval === 'year') return 'year';
    if (recurring.interval === 'month' && recurring.interval_count === 3) return 'quarter';
    return null;
}

async function handleSubscriptionChange(sub: any) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const uid = await findUidByCustomerId(customerId);
    if (!uid) return;

    const price = sub.items.data[0]?.price;
    const priceId = price?.id ?? '';
    const status = sub.status;
    const isActive = status === 'active' || status === 'trialing';

    const writes: Promise<unknown>[] = [
        db
            .collection('users')
            .doc(uid)
            .set(
                {
                    subscriptionId: sub.id,
                    subscriptionStatus: status,
                    subscriptionTier: PRICE_TIER_MAP[priceId] ?? null,
                    subscriptionCurrentPeriodEnd: Timestamp.fromMillis(sub.current_period_end * 1000),
                    cancelAtPeriodEnd: sub.cancel_at_period_end,
                    stripePriceId: priceId,
                    billingInterval: stripeIntervalToBillingInterval(price?.recurring ?? null),
                    billingAmountCents: price?.unit_amount ?? 0,
                    isMember: isActive,
                    ...(status === 'canceled' ? { canceledAt: Timestamp.now() } : {})
                },
                { merge: true }
            )
    ];

    if (status === 'canceled') {
        writes.push(
            db
                .collection('userEvents')
                .doc(`subscription_cancelled_${sub.id}`)
                .set({
                    type: 'subscription_cancelled',
                    uid,
                    tier: PRICE_TIER_MAP[priceId] ?? null,
                    timestamp: Timestamp.now()
                })
        );
    }

    await Promise.all(writes);
}

async function handleInvoicePaid(invoice: any, stripe: InstanceType<typeof Stripe>) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? '');
    const uid = await findUidByCustomerId(customerId);
    if (!uid) return;

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data() ?? {};
    const priceId = (invoice.lines?.data?.[0] as any)?.price?.id ?? '';
    const tier = PRICE_TIER_MAP[priceId] ?? null;

    await db.collection('payments').add({
        uid,
        displayName: userData['displayName'] ?? '',
        email: userData['email'] ?? '',
        amount: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? 'aud',
        status: 'succeeded',
        type: 'subscription',
        tier,
        description: invoice.description ?? `Subscription — ${tier ?? 'unknown'}`,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : '',
        createdAt: Timestamp.now()
    });

    // suppress unused variable warning — stripe param kept for API consistency
    void stripe;
}

async function handleInvoiceFailed(invoice: any) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? '');
    const uid = await findUidByCustomerId(customerId);
    if (!uid) return;

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data() ?? {};
    const priceId = (invoice.lines?.data?.[0] as any)?.price?.id ?? '';
    const tier = PRICE_TIER_MAP[priceId] ?? null;

    await db.collection('users').doc(uid).set(
        {
            subscriptionStatus: 'past_due',
            isMember: false
        },
        { merge: true }
    );

    await db.collection('payments').add({
        uid,
        displayName: userData['displayName'] ?? '',
        email: userData['email'] ?? '',
        amount: invoice.amount_due ?? 0,
        currency: invoice.currency ?? 'aud',
        status: 'failed',
        type: 'subscription',
        tier,
        description: `Failed payment — ${tier ?? 'unknown'}`,
        stripeInvoiceId: invoice.id,
        createdAt: Timestamp.now()
    });
}

// -----------------------------------------------
// Admin Callable: adminCancelSubscription (original Stripe impl)
// -----------------------------------------------
export const adminCancelSubscriptionLegacy = onCall({ secrets: ['STRIPE_SECRET_KEY'] }, async (req) => {
    await assertAdmin(req.auth?.uid);
    const { subscriptionId } = req.data as { uid: string; subscriptionId: string };
    if (!subscriptionId) throw new HttpsError('invalid-argument', 'subscriptionId required');

    const stripe = getStripe();
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return { success: true };
});

// -----------------------------------------------
// Admin Callable: adminRefundPayment (original Stripe impl)
// -----------------------------------------------
export const adminRefundPaymentLegacy = onCall({ secrets: ['STRIPE_SECRET_KEY'] }, async (req) => {
    await assertAdmin(req.auth?.uid);
    const { paymentId, paymentIntentId } = req.data as {
        paymentId: string;
        paymentIntentId: string;
    };
    if (!paymentIntentId) throw new HttpsError('invalid-argument', 'paymentIntentId required');

    const stripe = getStripe();
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    await db.collection('payments').doc(paymentId).set(
        {
            status: 'refunded',
            refundedAt: Timestamp.now(),
            refundAmount: refund.amount
        },
        { merge: true }
    );

    return { success: true, refundId: refund.id };
});
 * END DEPRECATED STRIPE BLOCK
 * ================================================================ */

// -----------------------------------------------
// Admin Callable: adminCancelSubscription
// TODO: re-wire to RevenueCat REST API (revoke subscription / promotional entitlement)
// -----------------------------------------------
export const adminCancelSubscription = onCall(async (req) => {
    await assertAdmin(req.auth?.uid);
    throw new HttpsError('unimplemented', 'Admin subscription cancellation not yet wired to RevenueCat. Cancel manually in the RevenueCat dashboard for now.');
});

// -----------------------------------------------
// Admin Callable: adminRefundPayment
// TODO: re-wire to RevenueCat REST API (refund / grant promotional entitlement)
// -----------------------------------------------
export const adminRefundPayment = onCall(async (req) => {
    await assertAdmin(req.auth?.uid);
    throw new HttpsError('unimplemented', 'Admin refunds not yet wired to RevenueCat. Refund manually in the RevenueCat dashboard for now.');
});

// -----------------------------------------------
// Admin Callable: adminGrantGuestAccess
// Manually grants permanent quiz access to any user
// -----------------------------------------------
export const adminGrantGuestAccess = onCall(async (req) => {
    await assertAdmin(req.auth?.uid);
    const { uid, quizId } = req.data as { uid: string; quizId: string };
    if (!uid) throw new HttpsError('invalid-argument', 'uid required');
    if (!quizId) throw new HttpsError('invalid-argument', 'quizId required');

    await db.collection('users').doc(uid).collection('quizAccess').doc(quizId).set({
        quizId,
        paidAt: Timestamp.now(),
        paymentIntentId: 'admin_granted',
        amount: 0
    });

    return { success: true };
});

async function assertAdmin(uid?: string) {
    if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in');
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.data()?.['isAdmin']) throw new HttpsError('permission-denied', 'Admin only');
}
