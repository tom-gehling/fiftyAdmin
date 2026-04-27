import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DailyGamesSummary, QuizDeepDive, QuizTypeBreakdown, QuizTypeKey, UserStatsResponse } from '@/shared/models/userStats.model';

export type StatsFixture = 'realistic' | 'lowScorer' | 'newcomer';

@Injectable({ providedIn: 'root' })
export class UserStatsService {
    /**
     * Returns mocked stats while the BigQuery + Cloud Function backend is on the BQconvert branch.
     * Once /api/userStats/:userId ships, swap this for an HTTP call.
     */
    getMyStats(fixture: StatsFixture = 'realistic'): Observable<UserStatsResponse> {
        return of(buildFixture(fixture)).pipe(delay(450));
    }
}

function buildFixture(kind: StatsFixture): UserStatsResponse {
    if (kind === 'newcomer') return newcomerFixture();
    if (kind === 'lowScorer') return lowScorerFixture();
    return realisticFixture();
}

function realisticFixture(): UserStatsResponse {
    const history = generateHistory(52, { startAvg: 28, endAvg: 36, jitter: 5, siteAvg: 33 });
    const summary = summarise(history, { weeklyStreak: 8, longestWeeklyStreak: 14, totalWeeksPlayed: 52 });
    return {
        summary,
        history,
        categories: [
            { category: 'MOVIES', attempts: 312, correct: 251, correctRate: 80.4, correctRateVsGlobal: 6.2 },
            { category: 'MUSIC', attempts: 287, correct: 198, correctRate: 69.0, correctRateVsGlobal: 3.5 },
            { category: 'GEOGRAPHY', attempts: 256, correct: 162, correctRate: 63.3, correctRateVsGlobal: 1.1 },
            { category: 'SPORT', attempts: 244, correct: 142, correctRate: 58.2, correctRateVsGlobal: -2.1 },
            { category: 'HISTORY', attempts: 198, correct: 109, correctRate: 55.1, correctRateVsGlobal: -3.4 },
            { category: 'SCIENCE', attempts: 176, correct: 88, correctRate: 50.0, correctRateVsGlobal: -4.2 },
            { category: 'POLITICS', attempts: 132, correct: 58, correctRate: 43.9, correctRateVsGlobal: -1.1 },
            { category: 'LITERATURE', attempts: 88, correct: 32, correctRate: 36.4, correctRateVsGlobal: -5.6 }
        ],
        timePatterns: {
            mostCommonHour: 20,
            mostCommonDow: 0,
            hourBuckets: hourBucketShape({ peakHour: 20, total: 52 }),
            dowBuckets: [22, 4, 3, 5, 4, 6, 8],
            fastestSeconds: 412,
            slowestSeconds: 2140,
            averageSeconds: 1086
        },
        highlights: {
            hardGotRight: [
                { quizId: 198, questionId: 'q14', globalCorrectRate: 8.2 },
                { quizId: 184, questionId: 'q31', globalCorrectRate: 11.0 },
                { quizId: 176, questionId: 'q47', globalCorrectRate: 13.6 },
                { quizId: 162, questionId: 'q9', globalCorrectRate: 15.4 },
                { quizId: 155, questionId: 'q23', globalCorrectRate: 16.8 }
            ],
            easyGotWrong: [
                { quizId: 192, questionId: 'q3', globalCorrectRate: 92.1 },
                { quizId: 178, questionId: 'q12', globalCorrectRate: 89.4 },
                { quizId: 169, questionId: 'q41', globalCorrectRate: 87.2 }
            ]
        },
        localRank: {
            city: 'Melbourne',
            cityRank: 142,
            cityTotalPlayers: 1840,
            cityAvgScore: 32.1,
            country: 'Australia',
            countryRank: 2310,
            countryTotalPlayers: 18420
        },
        byQuizType: [
            { type: 'weekly', label: 'Weekly', completed: 52, averageScore: 33.2, bestScore: 47, correctRate: 66.4, lastPlayedAt: new Date().toISOString() },
            { type: 'fiftyPlus', label: 'Fifty+', completed: 28, averageScore: 35.7, bestScore: 49, correctRate: 71.4, lastPlayedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
            { type: 'collab', label: 'Collabs', completed: 14, averageScore: 31.0, bestScore: 44, correctRate: 62.0, lastPlayedAt: new Date(Date.now() - 18 * 86400000).toISOString() },
            { type: 'questionType', label: 'Question Quizzes', completed: 22, averageScore: 7.4, bestScore: 10, correctRate: 74.0, lastPlayedAt: new Date(Date.now() - 9 * 86400000).toISOString() }
        ],
        deepDives: generateDeepDives('realistic'),
        dailyGames: realisticDailyGames()
    };
}

function lowScorerFixture(): UserStatsResponse {
    const history = generateHistory(28, { startAvg: 18, endAvg: 24, jitter: 4, siteAvg: 33 });
    const summary = summarise(history, { weeklyStreak: 12, longestWeeklyStreak: 18, totalWeeksPlayed: 28 });
    return {
        summary,
        history,
        categories: [
            { category: 'MOVIES', attempts: 168, correct: 96, correctRate: 57.1, correctRateVsGlobal: -1.6 },
            { category: 'GEOGRAPHY', attempts: 140, correct: 72, correctRate: 51.4, correctRateVsGlobal: -10.4 },
            { category: 'MUSIC', attempts: 154, correct: 71, correctRate: 46.1, correctRateVsGlobal: -19.1 },
            { category: 'SPORT', attempts: 132, correct: 58, correctRate: 43.9, correctRateVsGlobal: -16.4 },
            { category: 'HISTORY', attempts: 106, correct: 41, correctRate: 38.7, correctRateVsGlobal: -19.8 },
            { category: 'SCIENCE', attempts: 94, correct: 32, correctRate: 34.0, correctRateVsGlobal: -20.2 }
        ],
        timePatterns: {
            mostCommonHour: 22,
            mostCommonDow: 6,
            hourBuckets: hourBucketShape({ peakHour: 22, total: 28 }),
            dowBuckets: [3, 2, 2, 3, 4, 5, 9],
            fastestSeconds: 624,
            slowestSeconds: 2860,
            averageSeconds: 1480
        },
        highlights: {
            hardGotRight: [
                { quizId: 190, questionId: 'q22', globalCorrectRate: 9.8 },
                { quizId: 181, questionId: 'q5', globalCorrectRate: 14.1 },
                { quizId: 172, questionId: 'q38', globalCorrectRate: 17.6 }
            ],
            easyGotWrong: []
        },
        localRank: {
            city: 'Brisbane',
            cityRank: 920,
            cityTotalPlayers: 1100,
            cityAvgScore: 31.4,
            country: 'Australia',
            countryRank: 14820,
            countryTotalPlayers: 18420
        },
        byQuizType: [
            { type: 'weekly', label: 'Weekly', completed: 28, averageScore: 22.0, bestScore: 31, correctRate: 44.0, lastPlayedAt: new Date().toISOString() },
            { type: 'fiftyPlus', label: 'Fifty+', completed: 6, averageScore: 24.0, bestScore: 33, correctRate: 48.0, lastPlayedAt: new Date(Date.now() - 12 * 86400000).toISOString() },
            { type: 'collab', label: 'Collabs', completed: 2, averageScore: 19.0, bestScore: 22, correctRate: 38.0, lastPlayedAt: new Date(Date.now() - 60 * 86400000).toISOString() },
            { type: 'questionType', label: 'Question Quizzes', completed: 4, averageScore: 5.5, bestScore: 8, correctRate: 55.0, lastPlayedAt: new Date(Date.now() - 30 * 86400000).toISOString() }
        ],
        deepDives: generateDeepDives('lowScorer'),
        dailyGames: lowScorerDailyGames()
    };
}

function newcomerFixture(): UserStatsResponse {
    const history = generateHistory(3, { startAvg: 26, endAvg: 31, jitter: 3, siteAvg: 33 });
    const summary = summarise(history, { weeklyStreak: 3, longestWeeklyStreak: 3, totalWeeksPlayed: 3 });
    return {
        summary,
        history,
        categories: [
            { category: 'MOVIES', attempts: 18, correct: 13, correctRate: 72.2, correctRateVsGlobal: 0.0 },
            { category: 'MUSIC', attempts: 16, correct: 10, correctRate: 62.5, correctRateVsGlobal: 0.0 },
            { category: 'SPORT', attempts: 14, correct: 8, correctRate: 57.1, correctRateVsGlobal: 0.0 }
        ],
        timePatterns: {
            mostCommonHour: 19,
            mostCommonDow: 0,
            hourBuckets: hourBucketShape({ peakHour: 19, total: 3 }),
            dowBuckets: [2, 0, 0, 0, 0, 0, 1],
            fastestSeconds: 720,
            slowestSeconds: 1340,
            averageSeconds: 1020
        },
        highlights: { hardGotRight: [], easyGotWrong: [] },
        localRank: { city: null, cityRank: null, cityTotalPlayers: null, cityAvgScore: null, country: null, countryRank: null, countryTotalPlayers: null },
        byQuizType: [
            { type: 'weekly', label: 'Weekly', completed: 3, averageScore: 28.7, bestScore: 31, correctRate: 57.4, lastPlayedAt: new Date().toISOString() },
            { type: 'fiftyPlus', label: 'Fifty+', completed: 0, averageScore: 0, bestScore: 0, correctRate: 0, lastPlayedAt: null },
            { type: 'collab', label: 'Collabs', completed: 0, averageScore: 0, bestScore: 0, correctRate: 0, lastPlayedAt: null },
            { type: 'questionType', label: 'Question Quizzes', completed: 0, averageScore: 0, bestScore: 0, correctRate: 0, lastPlayedAt: null }
        ],
        deepDives: generateDeepDives('newcomer'),
        dailyGames: null
    };
}

function generateHistory(count: number, opts: { startAvg: number; endAvg: number; jitter: number; siteAvg: number }): UserStatsResponse['history'] {
    const out: UserStatsResponse['history'] = [];
    let runningBest = -1;
    const startQuizId = 200 - count + 1;
    const today = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < count; i++) {
        const t = i / Math.max(count - 1, 1);
        const expected = opts.startAvg + (opts.endAvg - opts.startAvg) * t;
        const score = clamp(Math.round(expected + (deterministicRand(i + 7) - 0.5) * opts.jitter * 2), 0, 50);
        const wasPB = score > runningBest;
        if (wasPB) runningBest = score;
        out.push({
            quizId: startQuizId + i,
            score,
            total: 50,
            completedAt: new Date(today - (count - 1 - i) * weekMs).toISOString(),
            quizAvgScore: opts.siteAvg + (deterministicRand(i * 3 + 1) - 0.5) * 4,
            wasPersonalBestAtTime: wasPB,
            scoreVsAvg: score - opts.siteAvg
        });
    }
    return out;
}

function summarise(history: UserStatsResponse['history'], extras: { weeklyStreak: number; longestWeeklyStreak: number; totalWeeksPlayed: number }): UserStatsResponse['summary'] {
    if (!history.length) {
        return {
            totalCompleted: 0,
            totalQuestionsAnswered: 0,
            correctTotal: 0,
            correctRate: 0,
            lifetimeScore: 0,
            personalBestScore: 0,
            personalBestQuizId: null,
            firstQuizCompletedAt: null,
            mostRecentQuizId: null,
            mostRecentScore: null,
            mostRecentCompletedAt: null,
            ...extras,
            improvement4wVsFirst4w: 0
        };
    }

    const lifetimeScore = history.reduce((s, h) => s + h.score, 0);
    const totalQuestions = history.reduce((s, h) => s + h.total, 0);
    const best = history.reduce((acc, h) => (h.score > acc.score ? h : acc), history[0]);
    const recent = history[history.length - 1];
    const first = history[0];

    const firstFour = history.slice(0, Math.min(4, history.length));
    const lastFour = history.slice(-Math.min(4, history.length));
    const avg = (xs: typeof history) => xs.reduce((s, h) => s + h.score, 0) / xs.length;
    const improvement = +(avg(lastFour) - avg(firstFour)).toFixed(1);

    return {
        totalCompleted: history.length,
        totalQuestionsAnswered: totalQuestions,
        correctTotal: lifetimeScore,
        correctRate: +((lifetimeScore / totalQuestions) * 100).toFixed(1),
        lifetimeScore,
        personalBestScore: best.score,
        personalBestQuizId: best.quizId,
        firstQuizCompletedAt: first.completedAt,
        mostRecentQuizId: recent.quizId,
        mostRecentScore: recent.score,
        mostRecentCompletedAt: recent.completedAt,
        improvement4wVsFirst4w: improvement,
        ...extras
    };
}

function hourBucketShape(opts: { peakHour: number; total: number }): number[] {
    const out = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
        const dist = Math.min(Math.abs(h - opts.peakHour), 24 - Math.abs(h - opts.peakHour));
        const weight = Math.max(0, 6 - dist);
        out[h] = weight;
    }
    const sum = out.reduce((a, b) => a + b, 0);
    return out.map((v) => Math.round((v / sum) * opts.total));
}

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

function deterministicRand(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
}

function generateDeepDives(kind: StatsFixture): QuizDeepDive[] {
    if (kind === 'newcomer') {
        return [makeDeepDive(198, 'weekly', 31, 33.0, 0.78), makeDeepDive(197, 'weekly', 28, 32.4, 0.78), makeDeepDive(196, 'weekly', 27, 31.8, 0.78)];
    }
    if (kind === 'lowScorer') {
        return [
            makeDeepDive(198, 'weekly', 24, 33.0, 0.55),
            makeDeepDive(196, 'weekly', 22, 31.2, 0.50),
            makeDeepDive(194, 'weekly', 19, 30.8, 0.44),
            makeDeepDive(192, 'fiftyPlus', 33, 35.1, 0.66),
            makeDeepDive(190, 'collab', 22, 29.4, 0.46)
        ];
    }
    return [
        makeDeepDive(198, 'weekly', 38, 33.0, 0.78),
        makeDeepDive(196, 'weekly', 36, 32.4, 0.74),
        makeDeepDive(194, 'weekly', 47, 31.8, 0.95),
        makeDeepDive(192, 'fiftyPlus', 41, 35.7, 0.84),
        makeDeepDive(190, 'collab', 33, 31.0, 0.70),
        makeDeepDive(188, 'weekly', 29, 33.8, 0.62),
        makeDeepDive(186, 'questionType', 8, 7.2, 0.80)
    ];
}

function makeDeepDive(quizId: number, type: QuizTypeKey, userScore: number, avgScore: number, userPickProbability: number): QuizDeepDive {
    const total = type === 'questionType' ? 10 : 50;
    const completedAt = new Date(Date.now() - (200 - quizId) * 7 * 24 * 60 * 60 * 1000).toISOString();
    const targetCorrect = Math.min(userScore, total);

    const questions = Array.from({ length: total }, (_, i) => {
        const seed = quizId * 1000 + i;
        const globalCorrectRate = +(8 + deterministicRand(seed) * 86).toFixed(1);
        return { questionNumber: i + 1, questionId: `q${i + 1}`, globalCorrectRate, userCorrect: false, userAnswered: true };
    });

    const ranked = questions
        .map((q, idx) => ({ idx, weight: q.globalCorrectRate * userPickProbability + deterministicRand(quizId * 7 + idx) * 30 }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, targetCorrect);
    for (const r of ranked) questions[r.idx].userCorrect = true;

    return {
        quizId,
        quizLabel: `Quiz #${quizId}`,
        quizType: type,
        completedAt,
        userScore: targetCorrect,
        total,
        avgScore,
        questions
    };
}

function realisticDailyGames(): DailyGamesSummary {
    return {
        totalDaysPlayed: 184,
        totalSolves: 162,
        activeStreak: 22,
        games: [
            { game: 'makeTen', label: 'Make Ten', icon: 'pi-calculator', daysPlayed: 62, daysSolved: 58, currentStreak: 22, longestStreak: 41, bestTimeSeconds: 38, successRate: 93.5 },
            { game: 'movieEmoji', label: 'Movie Emoji', icon: 'pi-video', daysPlayed: 48, daysSolved: 41, currentStreak: 12, longestStreak: 22, bestTimeSeconds: 24, successRate: 85.4 },
            { game: 'rushHour', label: 'Rush Hour', icon: 'pi-car', daysPlayed: 28, daysSolved: 24, currentStreak: 5, longestStreak: 14, bestTimeSeconds: 92, successRate: 85.7 },
            { game: 'chainGame', label: 'Chain', icon: 'pi-link', daysPlayed: 22, daysSolved: 18, currentStreak: 0, longestStreak: 9, bestTimeSeconds: 71, successRate: 81.8 },
            { game: 'countryJumble', label: 'Country Jumble', icon: 'pi-globe', daysPlayed: 16, daysSolved: 14, currentStreak: 4, longestStreak: 8, bestTimeSeconds: 46, successRate: 87.5 },
            { game: 'tileRun', label: 'Tile Run', icon: 'pi-th-large', daysPlayed: 8, daysSolved: 7, currentStreak: 0, longestStreak: 4, bestTimeSeconds: 118, successRate: 87.5 }
        ]
    };
}

function lowScorerDailyGames(): DailyGamesSummary {
    return {
        totalDaysPlayed: 64,
        totalSolves: 41,
        activeStreak: 6,
        games: [
            { game: 'makeTen', label: 'Make Ten', icon: 'pi-calculator', daysPlayed: 28, daysSolved: 22, currentStreak: 6, longestStreak: 11, bestTimeSeconds: 64, successRate: 78.6 },
            { game: 'movieEmoji', label: 'Movie Emoji', icon: 'pi-video', daysPlayed: 14, daysSolved: 8, currentStreak: 1, longestStreak: 4, bestTimeSeconds: 52, successRate: 57.1 },
            { game: 'chainGame', label: 'Chain', icon: 'pi-link', daysPlayed: 12, daysSolved: 6, currentStreak: 0, longestStreak: 3, bestTimeSeconds: 124, successRate: 50.0 },
            { game: 'rushHour', label: 'Rush Hour', icon: 'pi-car', daysPlayed: 8, daysSolved: 4, currentStreak: 0, longestStreak: 2, bestTimeSeconds: 188, successRate: 50.0 },
            { game: 'countryJumble', label: 'Country Jumble', icon: 'pi-globe', daysPlayed: 2, daysSolved: 1, currentStreak: 0, longestStreak: 1, bestTimeSeconds: 94, successRate: 50.0 },
            { game: 'tileRun', label: 'Tile Run', icon: 'pi-th-large', daysPlayed: 0, daysSolved: 0, currentStreak: 0, longestStreak: 0, bestTimeSeconds: null, successRate: 0 }
        ]
    };
}
