import { TaggedUser } from './quizSubmission.model';

export interface QuizAnswer {
    questionId: number; // matches QuizQuestion.questionId
    correct?: boolean; // undefined until user marks correct/incorrect
    clickedAt?: Date; // when user clicked correct/incorrect
}

export interface GeoLocation {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}

export interface QuizResult {
    resultId?: string; // Firestore doc ID
    quizId: string; // reference to Quiz.id
    userId: string; // reference to AppUser.uid
    status: 'in_progress' | 'completed';
    startedAt: Date;
    completedAt?: Date;
    answers: QuizAnswer[];
    score?: number; // count of correct answers, set when completed
    total: number; // total number of questions in the quiz
    ip?: string; // IP address of the user
    geo?: GeoLocation; // Geolocation data from IP lookup
    retro?: boolean; // true if manually recorded (backwards compatibility)
    taggedUsers?: TaggedUser[]; // users who took the quiz together
    userHidden?: boolean; // true when user has opted out of stats tracking; result still stored for admin use
    lastActivityAt?: Date; // updated on answer clicks, visibility changes, and periodic heartbeats while tab is visible
    closedAt?: Date | null; // set when the user closes the tab mid-quiz; cleared if they resume
    wasAbandoned?: boolean; // true once a sweep or unrecovered close has marked this session abandoned
}
