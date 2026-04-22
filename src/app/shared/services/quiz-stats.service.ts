import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Firestore, collection, getCountFromServer, query, where } from '@angular/fire/firestore';

export interface QuestionAccuracy {
    questionId: string;
    correctCount: number;
    totalAttempts: number;
    correctRate: number;
}

export interface QuizStatsResponse {
    quizId: string;
    attempts: number;
    completedCount: number;
    averageScore: number;
    averageTime: number;
    questionAccuracy: QuestionAccuracy[];
    hardestQuestions: QuestionAccuracy[];
    easiestQuestions: QuestionAccuracy[];
}

export interface LocationData {
    name: string;
    count: number;
    averageScore: number;
    averageTime: number;
    latitude?: number;
    longitude?: number;
}

export interface MapDataPoint {
    name: string;
    latitude: number;
    longitude: number;
    count: number;
}

export interface QuizLocationStats {
    quizId: string;
    totalResults: number;
    countries: LocationData[];
    cities: LocationData[];
    mapData: MapDataPoint[];
}

export interface QuizSummary {
    quizId: string;
    completedCount: number;
    abandonedCount: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    latestCompletionAt: string | null;
}

interface HourlyCountsResponse {
    quizId: string;
    buckets: { hourKey: string; completions: number }[];
}

interface ThinkingTimesResponse {
    quizId: string;
    avgTimeBetweenQuestions: number;
    perQuestion: { questionId: string; avgDiffSec: number; sampleCount: number }[];
}

@Injectable({ providedIn: 'root' })
export class QuizStatsService {
    private baseUrl = 'https://weeklyfifty-7617b.web.app/api';
    private firestore: Firestore = inject(Firestore);

    constructor(private http: HttpClient) {}

    async getQuizStats(quizId: string): Promise<QuizStatsResponse> {
        return firstValueFrom(this.http.get<QuizStatsResponse>(`${this.baseUrl}/quizStats/${quizId}`));
    }

    async getQuizLocationStats(quizId: string): Promise<QuizLocationStats | null> {
        try {
            return await firstValueFrom(this.http.get<QuizLocationStats>(`${this.baseUrl}/quizLocationStats/${quizId}`));
        } catch (error) {
            console.error('Error fetching location stats:', error);
            return null;
        }
    }

    async getAllQuizSummaries(): Promise<QuizSummary[]> {
        const res = await firstValueFrom(this.http.get<{ summaries: QuizSummary[] }>(`${this.baseUrl}/allQuizSummaries`));
        return res.summaries ?? [];
    }

    /** Weekly quiz IDs only (100 < id < 1000), matching the legacy filter. */
    async getAllQuizAggregateIds(): Promise<string[]> {
        const summaries = await this.getAllQuizSummaries();
        return summaries
            .map((s) => s.quizId)
            .filter((id) => {
                const n = parseInt(id, 10);
                return !isNaN(n) && n > 100 && n < 1000;
            });
    }

    /**
     * Backwards-compat shim that assembles the shape the Firestore quizAggregates
     * document used to have, by calling the BQ-backed endpoints in parallel plus a
     * Firestore count query for in-progress sessions. Existing consumers
     * (statswidget, quizstatssummary, weeklyquizstats, quiz-display) read from this
     * without modification.
     */
    async getQuizAggregatesFirestore(quizId: string): Promise<any> {
        try {
            const [stats, hourly, thinking, location, inProgressCount] = await Promise.all([
                this.getQuizStats(quizId).catch(() => null),
                firstValueFrom(this.http.get<HourlyCountsResponse>(`${this.baseUrl}/quizHourlyCounts/${quizId}`)).catch(() => null),
                firstValueFrom(this.http.get<ThinkingTimesResponse>(`${this.baseUrl}/quizThinkingTimes/${quizId}`)).catch(() => null),
                this.getQuizLocationStats(quizId).catch(() => null),
                this.fetchInProgressCount(quizId)
            ]);

            if (!stats) return null;

            const hourlyCounts: Record<string, number> = {};
            for (const b of hourly?.buckets ?? []) hourlyCounts[b.hourKey] = b.completions;

            const locationCounts: Record<string, number> = {};
            for (const c of location?.cities ?? []) locationCounts[c.name] = c.count;

            return {
                ...stats,
                totalScore: stats.averageScore * stats.completedCount,
                inProgressCount,
                hourlyCounts,
                locationCounts,
                avgTimeBetweenByQuestion: thinking?.perQuestion ?? [],
                avgTimeBetweenQuestions: thinking?.avgTimeBetweenQuestions ?? 0
            };
        } catch (error) {
            console.error('Error loading quiz aggregate data:', error);
            return null;
        }
    }

    private async fetchInProgressCount(quizId: string): Promise<number> {
        try {
            const q = query(collection(this.firestore, 'quizResults'), where('quizId', '==', quizId), where('status', '==', 'in_progress'));
            const snap = await getCountFromServer(q);
            return snap.data().count;
        } catch (error) {
            console.warn('In-progress count query failed:', error);
            return 0;
        }
    }
}
