export interface UserStatsSummary {
    totalCompleted: number;
    totalQuestionsAnswered: number;
    correctTotal: number;
    correctRate: number;
    lifetimeScore: number;
    personalBestScore: number;
    personalBestQuizId: number | null;
    firstQuizCompletedAt: string | null;
    mostRecentQuizId: number | null;
    mostRecentScore: number | null;
    mostRecentCompletedAt: string | null;
    weeklyStreak: number;
    longestWeeklyStreak: number;
    totalWeeksPlayed: number;
    improvement4wVsFirst4w: number;
}

export interface UserHistoryPoint {
    quizId: number;
    score: number;
    total: number;
    completedAt: string;
    quizAvgScore: number;
    wasPersonalBestAtTime: boolean;
    scoreVsAvg: number;
}

export interface UserCategoryStat {
    category: string;
    attempts: number;
    correct: number;
    correctRate: number;
    correctRateVsGlobal: number;
}

export interface UserTimePatterns {
    mostCommonHour: number;
    mostCommonDow: number;
    hourBuckets: number[];
    dowBuckets: number[];
    fastestSeconds: number | null;
    slowestSeconds: number | null;
    averageSeconds: number | null;
}

export interface UserHighlightQuestion {
    quizId: number;
    questionId: string;
    globalCorrectRate: number;
}

export interface UserHighlights {
    hardGotRight: UserHighlightQuestion[];
    easyGotWrong: UserHighlightQuestion[];
}

export interface UserLocalRank {
    city: string | null;
    cityRank: number | null;
    cityTotalPlayers: number | null;
    cityAvgScore: number | null;
    country: string | null;
    countryRank: number | null;
    countryTotalPlayers: number | null;
}

export type QuizTypeKey = 'weekly' | 'fiftyPlus' | 'collab' | 'questionType';

export interface QuizTypeBreakdown {
    type: QuizTypeKey;
    label: string;
    completed: number;
    averageScore: number;
    bestScore: number;
    correctRate: number;
    lastPlayedAt: string | null;
}

export type DailyGameKey = 'makeTen' | 'chainGame' | 'movieEmoji' | 'rushHour' | 'countryJumble' | 'tileRun';

export interface DailyGameStat {
    game: DailyGameKey;
    label: string;
    icon: string;
    daysPlayed: number;
    daysSolved: number;
    currentStreak: number;
    longestStreak: number;
    bestTimeSeconds: number | null;
    successRate: number;
}

export interface DailyGamesSummary {
    totalDaysPlayed: number;
    totalSolves: number;
    activeStreak: number;
    games: DailyGameStat[];
}

export interface QuizDeepDiveQuestion {
    questionNumber: number;
    questionId: string;
    globalCorrectRate: number;
    userCorrect: boolean;
    userAnswered: boolean;
}

export interface QuizDeepDive {
    quizId: number;
    quizLabel: string;
    quizType: QuizTypeKey;
    completedAt: string;
    userScore: number;
    total: number;
    avgScore: number;
    questions: QuizDeepDiveQuestion[];
}

export interface UserStatsResponse {
    summary: UserStatsSummary;
    history: UserHistoryPoint[];
    categories: UserCategoryStat[];
    timePatterns: UserTimePatterns;
    highlights: UserHighlights;
    localRank: UserLocalRank;
    byQuizType: QuizTypeBreakdown[];
    deepDives: QuizDeepDive[];
    dailyGames: DailyGamesSummary | null;
}
