export interface QuizAnswer {
    questionId: number;         // matches QuizQuestion.questionId
    correct?: boolean;          // undefined until user marks correct/incorrect
    clickedAt?: Date;           // when user clicked correct/incorrect
}

export interface GeoLocation {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}

export interface QuizResult {
    resultId?: string;          // Firestore doc ID
    quizId: string;              // reference to Quiz.id
    userId: string;              // reference to AppUser.uid
    status: 'in_progress' | 'completed';
    startedAt: Date;
    completedAt?: Date;
    answers: QuizAnswer[];
    score?: number;              // count of correct answers, set when completed
    totalQuestions: number;      // taken from quiz.questions.length
    ip?: string;                 // IP address of the user
    geo?: GeoLocation;           // Geolocation data from IP lookup
}